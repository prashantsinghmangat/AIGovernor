# CodeGuard AI — AI Detection Engine

## Document 6 of 8

---

## Detection Philosophy

AI code detection uses 3 layered signals combined into a single probability score (0.0–1.0). Ship Signal 1 + 2 first (no ML needed, ~75% accuracy). Add Signal 3 later for ~90%+ accuracy.

---

## Signal 1: Metadata Detection (Weight: 0.40 when matched)

Fast, deterministic check on commit messages, PR descriptions, and git trailers.

```typescript
// lib/detection/metadata-detector.ts

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
  confidence: number;      // 0.0-1.0
  source: string | null;   // Which pattern matched
  matchedText: string | null;
}

export function detectMetadata(
  commitMessage: string,
  prTitle?: string,
  prBody?: string,
): MetadataResult {
  // Check commit message
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

  // Check PR title and body
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

  // Check for GitHub Copilot commit trailer
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
```

---

## Signal 2: Style & Pattern Analysis (Weight: 0.50 or 0.30)

Heuristic analysis of code characteristics. No ML model needed.

```typescript
// lib/detection/style-analyzer.ts

export interface StyleSignals {
  naming_verbosity: number;       // 0-1: AI uses longer, descriptive names
  comment_uniformity: number;     // 0-1: AI comments are very uniform in style
  typo_absence: number;           // 0-1: AI rarely has typos in comments
  indent_consistency: number;     // 0-1: AI has perfect indentation
  error_handling_ratio: number;   // 0-1: AI adds more try/catch blocks
  boilerplate_ratio: number;      // 0-1: AI generates more boilerplate
  docstring_formality: number;    // 0-1: AI writes formal JSDoc/docstrings
  import_organization: number;    // 0-1: AI organizes imports perfectly
}

export interface StyleResult {
  score: number;                  // Combined 0-1 score
  signals: StyleSignals;
}

export function analyzeCodeStyle(code: string, language: string): StyleResult {
  const signals: StyleSignals = {
    naming_verbosity: analyzeNamingVerbosity(code, language),
    comment_uniformity: analyzeCommentUniformity(code, language),
    typo_absence: analyzeTypoAbsence(code),
    indent_consistency: analyzeIndentConsistency(code),
    error_handling_ratio: analyzeErrorHandling(code, language),
    boilerplate_ratio: analyzeBoilerplate(code, language),
    docstring_formality: analyzeDocstrings(code, language),
    import_organization: analyzeImports(code, language),
  };

  // Weighted average of all signals
  const weights = {
    naming_verbosity: 0.20,
    comment_uniformity: 0.15,
    typo_absence: 0.10,
    indent_consistency: 0.10,
    error_handling_ratio: 0.15,
    boilerplate_ratio: 0.10,
    docstring_formality: 0.10,
    import_organization: 0.10,
  };

  const score = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + signals[key as keyof StyleSignals] * weight,
    0
  );

  return { score: Math.min(score, 1.0), signals };
}

// ---- Individual Signal Analyzers ----

function analyzeNamingVerbosity(code: string, language: string): number {
  // Extract identifiers (variable/function names)
  const identifierPattern = language === 'Python'
    ? /\b([a-z][a-z0-9_]*)\b/g
    : /\b([a-z][a-zA-Z0-9]*)\b/g;

  const identifiers = [...code.matchAll(identifierPattern)]
    .map(m => m[1])
    .filter(id => id.length > 2 && !isCommonKeyword(id, language));

  if (identifiers.length === 0) return 0.5;

  const avgLength = identifiers.reduce((s, id) => s + id.length, 0) / identifiers.length;

  // AI tends to use names like "authenticateUserRequest" vs human "authReq"
  // Average length > 15 chars strongly suggests AI
  if (avgLength > 18) return 0.95;
  if (avgLength > 14) return 0.8;
  if (avgLength > 10) return 0.5;
  return 0.2;
}

function analyzeCommentUniformity(code: string, language: string): number {
  const commentPattern = language === 'Python'
    ? /^\s*#\s*(.+)$/gm
    : /^\s*\/\/\s*(.+)$/gm;

  const comments = [...code.matchAll(commentPattern)].map(m => m[1].trim());
  if (comments.length < 2) return 0.5;

  // Check if comments follow a uniform pattern
  // AI tends to: capitalize first letter, use complete sentences, similar lengths
  const capitalized = comments.filter(c => /^[A-Z]/.test(c)).length / comments.length;
  const avgLen = comments.reduce((s, c) => s + c.length, 0) / comments.length;
  const lenVariance = comments.reduce((s, c) => s + Math.pow(c.length - avgLen, 2), 0) / comments.length;
  const normalizedVariance = Math.min(lenVariance / 500, 1);

  // Low variance + high capitalization = likely AI
  const uniformity = capitalized * (1 - normalizedVariance);
  return Math.min(uniformity, 1.0);
}

function analyzeTypoAbsence(code: string): number {
  // Common typos humans make in comments
  const humanTypos = [
    /\bteh\b/, /\breciever\b/, /\boccured\b/, /\bseperator\b/,
    /\blenght\b/, /\bwidht\b/, /\bretrun\b/, /\bfunciton\b/,
    /\btodo\b/i, /\bfixme\b/i, /\bhack\b/i, /\bugly\b/i,
    /\bwtf\b/i, /\bxxx\b/i,
  ];

  const hasHumanMarkers = humanTypos.some(p => p.test(code));
  return hasHumanMarkers ? 0.1 : 0.7;
}

function analyzeIndentConsistency(code: string): number {
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 5) return 0.5;

  const indents = lines.map(l => {
    const match = l.match(/^(\s*)/);
    return match ? match[1].length : 0;
  });

  // Check if indentation is perfectly consistent (always multiples of same number)
  const nonZeroIndents = indents.filter(i => i > 0);
  if (nonZeroIndents.length === 0) return 0.5;

  const gcd = nonZeroIndents.reduce((a, b) => {
    while (b) { [a, b] = [b, a % b]; }
    return a;
  });

  const perfectIndent = nonZeroIndents.every(i => i % gcd === 0);
  return perfectIndent ? 0.8 : 0.3;
}

function analyzeErrorHandling(code: string, language: string): number {
  const funcCount = (code.match(/function\s|const\s+\w+\s*=\s*(async\s*)?\(/g) || []).length || 1;

  let tryCatchCount;
  if (language === 'Python') {
    tryCatchCount = (code.match(/\btry\s*:/g) || []).length;
  } else {
    tryCatchCount = (code.match(/\btry\s*\{/g) || []).length;
  }

  const ratio = tryCatchCount / funcCount;
  // AI wraps almost everything in try/catch
  if (ratio > 0.8) return 0.9;
  if (ratio > 0.5) return 0.6;
  return 0.2;
}

function analyzeBoilerplate(code: string, language: string): number {
  // AI generates standard patterns: input validation, error responses, logging
  const boilerplatePatterns = [
    /if\s*\(!?\w+\)\s*(return|throw)\s/g,     // Guard clauses
    /console\.(log|error|warn)/g,               // Logging
    /res\.status\(\d+\)\.json/g,                // Express response patterns
    /throw new (Error|TypeError|RangeError)/g,  // Standard error throws
  ];

  let boilerplateMatches = 0;
  for (const pattern of boilerplatePatterns) {
    boilerplateMatches += (code.match(pattern) || []).length;
  }

  const totalStatements = (code.match(/;|\n/g) || []).length || 1;
  const ratio = boilerplateMatches / totalStatements;

  if (ratio > 0.3) return 0.8;
  if (ratio > 0.15) return 0.5;
  return 0.2;
}

function analyzeDocstrings(code: string, language: string): number {
  // AI writes formal, complete docstrings/JSDoc
  let formalDocs = 0;
  if (language === 'Python') {
    formalDocs = (code.match(/"""\s*\n\s*(Args|Returns|Raises|Parameters|Yields):/g) || []).length;
  } else {
    formalDocs = (code.match(/@(param|returns|throws|example)\s/g) || []).length;
  }

  const funcCount = (code.match(/function\s|def\s|const\s+\w+\s*=/g) || []).length || 1;
  const ratio = formalDocs / funcCount;

  if (ratio > 0.8) return 0.85;
  if (ratio > 0.4) return 0.5;
  return 0.15;
}

function analyzeImports(code: string, language: string): number {
  const importLines = code.split('\n').filter(l =>
    l.trim().startsWith('import ') || l.trim().startsWith('from ') || l.trim().startsWith('const ')
  );

  if (importLines.length < 3) return 0.5;

  // Check if imports are sorted alphabetically (AI does this consistently)
  const importNames = importLines.map(l => l.trim().toLowerCase());
  const sorted = [...importNames].sort();
  const isSorted = importNames.every((val, idx) => val === sorted[idx]);

  return isSorted ? 0.75 : 0.25;
}

function isCommonKeyword(id: string, language: string): boolean {
  const keywords = new Set([
    'if', 'else', 'for', 'while', 'return', 'const', 'let', 'var',
    'function', 'class', 'import', 'export', 'from', 'async', 'await',
    'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null',
    'undefined', 'def', 'self', 'None', 'True', 'False',
  ]);
  return keywords.has(id);
}
```

---

## Signal 3: ML Classification (Future — Weight: 0.30)

Client that calls the Python ML microservice (added in Phase 4).

```typescript
// lib/detection/ai-classifier.ts

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export interface MLResult {
  probability: number;     // 0.0-1.0
  model_version: string;
  features_used: string[];
}

export async function classifyWithML(
  code: string,
  language: string
): Promise<MLResult | null> {
  if (!ML_SERVICE_URL) return null; // ML not configured yet

  try {
    const response = await fetch(`${ML_SERVICE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    console.warn('ML service unavailable, skipping Signal 3');
    return null;
  }
}
```

---

## Combined Scorer

```typescript
// lib/detection/combined-scorer.ts

import { detectMetadata, MetadataResult } from './metadata-detector';
import { analyzeCodeStyle, StyleResult } from './style-analyzer';
import { classifyWithML, MLResult } from './ai-classifier';

export interface DetectionResult {
  combined_probability: number;
  risk_level: 'high' | 'medium' | 'low';
  metadata: MetadataResult;
  style: StyleResult;
  ml: MLResult | null;
  detection_method: string; // Which signals contributed
}

export async function detectAICode(
  code: string,
  language: string,
  commitMessage: string,
  prTitle?: string,
  prBody?: string,
): Promise<DetectionResult> {
  // Run all signals
  const metadata = detectMetadata(commitMessage, prTitle, prBody);
  const style = analyzeCodeStyle(code, language);
  const ml = await classifyWithML(code, language);

  let combined: number;
  let method: string;

  if (metadata.matched && ml) {
    // All 3 signals available
    combined = metadata.confidence * 0.40 + style.score * 0.30 + ml.probability * 0.30;
    method = 'metadata+style+ml';
  } else if (metadata.matched) {
    // Signals 1 + 2
    combined = metadata.confidence * 0.45 + style.score * 0.55;
    method = 'metadata+style';
  } else if (ml) {
    // Signals 2 + 3 (no metadata match)
    combined = style.score * 0.50 + ml.probability * 0.50;
    method = 'style+ml';
  } else {
    // Signal 2 only
    combined = style.score;
    method = 'style_only';
  }

  combined = Math.min(Math.max(combined, 0), 1);

  return {
    combined_probability: Math.round(combined * 100) / 100,
    risk_level: combined >= 0.7 ? 'high' : combined >= 0.4 ? 'medium' : 'low',
    metadata,
    style,
    ml,
    detection_method: method,
  };
}
```

---

## AI Debt Score Formula

```typescript
// lib/scoring/ai-debt-score.ts

export interface DebtScoreInput {
  ai_loc_ratio: number;              // 0-1: % of code that is AI-generated
  review_coverage: number;           // 0-1: % of AI PRs that were human-reviewed
  refactor_backlog_growth: number;   // 0-1: rate of growing refactor needs
  prompt_inconsistency: number;      // 0-1: how inconsistent prompting patterns are
}

export interface DebtScoreResult {
  score: number;                     // 0-100
  risk_zone: 'healthy' | 'caution' | 'critical';
  breakdown: DebtScoreInput & { weights: Record<string, number> };
}

const WEIGHTS = {
  ai_loc_ratio: 0.30,
  review_coverage: 0.30,    // Inverted: higher coverage = lower penalty
  refactor_backlog_growth: 0.20,
  prompt_inconsistency: 0.20,
};

export function calculateAIDebtScore(input: DebtScoreInput): DebtScoreResult {
  const penalty =
    WEIGHTS.ai_loc_ratio * input.ai_loc_ratio * 100 +
    WEIGHTS.review_coverage * (1 - input.review_coverage) * 100 +
    WEIGHTS.refactor_backlog_growth * input.refactor_backlog_growth * 100 +
    WEIGHTS.prompt_inconsistency * input.prompt_inconsistency * 100;

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    score,
    risk_zone: score >= 80 ? 'healthy' : score >= 60 ? 'caution' : 'critical',
    breakdown: { ...input, weights: WEIGHTS },
  };
}
```

---

## Team Adoption Scoring

```typescript
// lib/scoring/team-scorer.ts

export function calculateTeamMemberScore(
  aiPRs: number,
  totalPRs: number,
  reviewedByThisPerson: number,
  aiPRsWithWeakReview: number,
): {
  ai_usage_level: 'high' | 'medium' | 'low';
  review_quality: 'strong' | 'moderate' | 'weak';
  risk_index: 'high' | 'medium' | 'low';
  governance_score: number;
} {
  const aiRatio = totalPRs > 0 ? aiPRs / totalPRs : 0;
  const ai_usage_level = aiRatio > 0.6 ? 'high' : aiRatio > 0.3 ? 'medium' : 'low';

  const reviewRatio = totalPRs > 0 ? reviewedByThisPerson / totalPRs : 0;
  const review_quality = reviewRatio > 0.5 ? 'strong' : reviewRatio > 0.25 ? 'moderate' : 'weak';

  const weakRatio = aiPRs > 0 ? aiPRsWithWeakReview / aiPRs : 0;
  const risk_index = weakRatio > 0.5 ? 'high' : weakRatio > 0.25 ? 'medium' : 'low';

  // Governance score: higher is better
  const governance_score = Math.round(
    (1 - weakRatio) * 50 +      // Low weak reviews = good
    reviewRatio * 30 +            // High review participation = good
    (1 - aiRatio * 0.3) * 20     // Moderate AI usage = fine
  );

  return { ai_usage_level, review_quality, risk_index, governance_score: Math.min(100, governance_score) };
}
```
