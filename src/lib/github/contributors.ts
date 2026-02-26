import type { Octokit } from '@octokit/rest';

export interface ContributorProfile {
  github_username: string;
  display_name: string;
  avatar_url: string | null;
  total_commits: number;
  ai_loc_attributed: number;
  total_loc_attributed: number;
}

interface ScanResultForAttribution {
  file_path: string;
  ai_probability: number;
  ai_loc: number;
  total_loc: number;
}

/**
 * Analyze repository contributors from Git commit history and
 * cross-reference with AI detection results to attribute AI code.
 *
 * Approach:
 * 1. Fetch recent commits (last 30 days) to identify contributors
 * 2. For top AI-detected files, fetch the last committer (git blame proxy)
 * 3. Attribute remaining AI LOC proportionally by commit share
 */
export async function analyzeContributors(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string,
  scanResults: ScanResultForAttribution[],
): Promise<ContributorProfile[]> {
  // 1. Fetch recent commits (last 30 days, up to 100)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let commits: Awaited<ReturnType<typeof octokit.repos.listCommits>>['data'] = [];

  try {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: defaultBranch,
      since,
      per_page: 100,
    });
    commits = data;
  } catch {
    return [];
  }

  if (commits.length === 0) return [];

  // 2. Group commits by contributor
  // Use GitHub login when available, fall back to commit author email
  const contributors = new Map<
    string,
    { display_name: string; avatar_url: string | null; commit_count: number }
  >();

  for (const commit of commits) {
    const login =
      commit.author?.login ||
      commit.commit.author?.email ||
      commit.commit.author?.name;
    if (!login) continue;

    const existing = contributors.get(login);
    if (existing) {
      existing.commit_count++;
    } else {
      contributors.set(login, {
        display_name: commit.commit.author?.name || login,
        avatar_url: commit.author?.avatar_url || null,
        commit_count: 1,
      });
    }
  }

  if (contributors.size === 0) return [];

  // 3. For top AI-detected files, fetch last committer to attribute AI code
  const aiFiles = scanResults
    .filter((r) => r.ai_probability > 0.5 && r.ai_loc > 0)
    .sort((a, b) => b.ai_loc - a.ai_loc)
    .slice(0, 20); // Cap at 20 API calls

  const fileToAuthor = new Map<string, string>();

  for (const file of aiFiles) {
    try {
      const { data: fileCommits } = await octokit.repos.listCommits({
        owner,
        repo,
        path: file.file_path,
        sha: defaultBranch,
        per_page: 1,
      });
      const fc = fileCommits[0];
      const author =
        fc?.author?.login ||
        fc?.commit.author?.email ||
        fc?.commit.author?.name;
      if (author) {
        fileToAuthor.set(file.file_path, author);
        // Ensure this author is in our contributors map
        if (!contributors.has(author)) {
          contributors.set(author, {
            display_name: fc.commit.author?.name || author,
            avatar_url: fc.author?.avatar_url || null,
            commit_count: 0,
          });
        }
      }
    } catch {
      // Skip on error
    }
  }

  // 4. Calculate per-contributor metrics
  const totalCommits = Array.from(contributors.values()).reduce(
    (sum, c) => sum + c.commit_count,
    0,
  );

  // AI LOC from files we couldn't directly attribute
  const unattributedAiLoc = scanResults
    .filter((r) => r.ai_probability > 0.5 && !fileToAuthor.has(r.file_path))
    .reduce((sum, r) => sum + r.ai_loc, 0);

  const unattributedTotalLoc = scanResults
    .filter((r) => !fileToAuthor.has(r.file_path))
    .reduce((sum, r) => sum + r.total_loc, 0);

  const results: ContributorProfile[] = [];

  for (const [username, data] of contributors) {
    // Direct attribution from files they last committed
    let directAiLoc = 0;
    let directTotalLoc = 0;
    for (const [path, author] of fileToAuthor) {
      if (author === username) {
        const sr = scanResults.find((r) => r.file_path === path);
        if (sr) {
          directAiLoc += sr.ai_loc;
          directTotalLoc += sr.total_loc;
        }
      }
    }

    // Proportional attribution for remaining files based on commit share
    const commitShare = totalCommits > 0 ? data.commit_count / totalCommits : 0;

    results.push({
      github_username: username,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      total_commits: data.commit_count,
      ai_loc_attributed: directAiLoc + Math.round(unattributedAiLoc * commitShare),
      total_loc_attributed: directTotalLoc + Math.round(unattributedTotalLoc * commitShare),
    });
  }

  return results.sort((a, b) => b.total_commits - a.total_commits);
}

/**
 * Derive team metric fields from raw contributor data.
 */
export function deriveTeamMetrics(contributor: ContributorProfile) {
  const aiRatio =
    contributor.total_loc_attributed > 0
      ? contributor.ai_loc_attributed / contributor.total_loc_attributed
      : 0;

  // AI usage level based on ratio of AI code attributed
  const ai_usage_level: string =
    aiRatio > 0.5 ? 'high' : aiRatio > 0.2 ? 'medium' : 'low';

  // Governance score: higher = better governed
  // Starts at 85, penalised by high AI ratio (harder to govern)
  const governance_score = Math.max(
    0,
    Math.min(100, Math.round(85 - aiRatio * 40 + (contributor.total_commits > 10 ? 5 : 0))),
  );

  // Risk index derived from score
  const risk_index: string =
    governance_score >= 75 ? 'low' : governance_score >= 50 ? 'medium' : 'high';

  // Review quality heuristic: active contributors with low AI usage get 'strong'
  const review_quality: string =
    contributor.total_commits >= 10 && aiRatio < 0.3
      ? 'strong'
      : contributor.total_commits >= 5
        ? 'moderate'
        : 'weak';

  // Coaching suggestions
  const coaching: Array<{ type: string; priority: string; message: string }> = [];
  if (ai_usage_level === 'high') {
    coaching.push({
      type: 'ai_usage',
      priority: 'high',
      message:
        'High AI code usage detected. Ensure thorough code reviews for all AI-generated contributions.',
    });
  }
  if (risk_index === 'high') {
    coaching.push({
      type: 'risk',
      priority: 'high',
      message:
        'High risk index. Increase test coverage for AI-generated code and follow review guidelines.',
    });
  }
  if (governance_score < 60) {
    coaching.push({
      type: 'governance',
      priority: 'high',
      message:
        'Low governance score. Align with team coding standards and request peer reviews before merging.',
    });
  }
  if (ai_usage_level === 'medium') {
    coaching.push({
      type: 'ai_usage',
      priority: 'medium',
      message: 'Moderate AI usage. Continue monitoring AI code quality and review coverage.',
    });
  }
  if (review_quality === 'weak' && contributor.total_commits < 5) {
    coaching.push({
      type: 'review_quality',
      priority: 'low',
      message: 'Limited commit activity. Increase contributions and participate in code reviews.',
    });
  }

  return {
    ai_usage_level,
    governance_score,
    risk_index,
    review_quality,
    coaching_suggestions: coaching,
  };
}
