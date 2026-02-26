const AI_COMMIT_PATTERNS = [
  /\bcopilot\b/i,
  /\bcursor\b/i,
  /\bcodeium\b/i,
  /generated\s+(by|with|using)\s+(ai|claude|chatgpt|gpt|openai|copilot|gemini|llm)/i,
  /ai[- ]assisted/i,
  /auto[- ]generated/i,
  /\[ai\]/i,
  /\[copilot\]/i,
  /co-authored-by:.*?(copilot|github|noreply)/i,
  /🤖/,
];

const AI_PR_PATTERNS = [
  /generated\s+(by|with|using)\s+(ai|claude|chatgpt|gpt|copilot)/i,
  /ai[- ]generated/i,
  /this\s+pr\s+was\s+(created|generated)\s+(by|with|using)/i,
  /copilot\s+suggestion/i,
  /claude\s+(wrote|generated|created)/i,
];

export interface MetadataResult {
  matched: boolean;
  confidence: number;
  source: string | null;
  matchedText: string | null;
}

export function detectMetadata(
  commitMessage: string,
  prTitle?: string,
  prBody?: string,
): MetadataResult {
  for (const pattern of AI_COMMIT_PATTERNS) {
    const match = commitMessage.match(pattern);
    if (match) {
      return {
        matched: true,
        confidence: 0.9,
        source: 'commit_message',
        matchedText: match[0],
      };
    }
  }

  const prText = `${prTitle || ''} ${prBody || ''}`;
  for (const pattern of AI_PR_PATTERNS) {
    const match = prText.match(pattern);
    if (match) {
      return {
        matched: true,
        confidence: 0.85,
        source: 'pr_description',
        matchedText: match[0],
      };
    }
  }

  if (commitMessage.includes('Co-authored-by: GitHub Copilot')) {
    return {
      matched: true,
      confidence: 0.95,
      source: 'copilot_trailer',
      matchedText: 'Co-authored-by: GitHub Copilot',
    };
  }

  return { matched: false, confidence: 0, source: null, matchedText: null };
}
