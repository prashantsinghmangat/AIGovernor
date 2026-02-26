export interface StyleSignals {
  naming_verbosity: number;
  comment_uniformity: number;
  typo_absence: number;
  indent_consistency: number;
  error_handling_ratio: number;
  boilerplate_ratio: number;
  docstring_formality: number;
  import_organization: number;
}

export interface StyleResult {
  score: number;
  signals: StyleSignals;
}

export function analyzeCodeStyle(code: string, language: string): StyleResult {
  const signals: StyleSignals = {
    naming_verbosity: analyzeNamingVerbosity(code, language),
    comment_uniformity: analyzeCommentUniformity(code, language),
    typo_absence: analyzeTypoAbsence(code),
    indent_consistency: analyzeIndentConsistency(code),
    error_handling_ratio: analyzeErrorHandling(code, language),
    boilerplate_ratio: analyzeBoilerplate(code),
    docstring_formality: analyzeDocstrings(code, language),
    import_organization: analyzeImports(code),
  };

  const weights: Record<keyof StyleSignals, number> = {
    naming_verbosity: 0.20,
    comment_uniformity: 0.15,
    typo_absence: 0.10,
    indent_consistency: 0.10,
    error_handling_ratio: 0.15,
    boilerplate_ratio: 0.10,
    docstring_formality: 0.10,
    import_organization: 0.10,
  };

  const score = (Object.keys(weights) as Array<keyof StyleSignals>).reduce(
    (sum, key) => sum + signals[key] * weights[key],
    0
  );

  return { score: Math.min(score, 1.0), signals };
}

function analyzeNamingVerbosity(code: string, language: string): number {
  const identifierPattern = language === 'Python'
    ? /\b([a-z][a-z0-9_]*)\b/g
    : /\b([a-z][a-zA-Z0-9]*)\b/g;

  const identifiers = [...code.matchAll(identifierPattern)]
    .map(m => m[1])
    .filter(id => id.length > 2 && !isCommonKeyword(id));

  if (identifiers.length === 0) return 0.5;

  const avgLength = identifiers.reduce((s, id) => s + id.length, 0) / identifiers.length;

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

  const capitalized = comments.filter(c => /^[A-Z]/.test(c)).length / comments.length;
  const avgLen = comments.reduce((s, c) => s + c.length, 0) / comments.length;
  const lenVariance = comments.reduce((s, c) => s + Math.pow(c.length - avgLen, 2), 0) / comments.length;
  const normalizedVariance = Math.min(lenVariance / 500, 1);

  const uniformity = capitalized * (1 - normalizedVariance);
  return Math.min(uniformity, 1.0);
}

function analyzeTypoAbsence(code: string): number {
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

  const tryCatchCount = language === 'Python'
    ? (code.match(/\btry\s*:/g) || []).length
    : (code.match(/\btry\s*\{/g) || []).length;

  const ratio = tryCatchCount / funcCount;
  if (ratio > 0.8) return 0.9;
  if (ratio > 0.5) return 0.6;
  return 0.2;
}

function analyzeBoilerplate(code: string): number {
  const boilerplatePatterns = [
    /if\s*\(!?\w+\)\s*(return|throw)\s/g,
    /console\.(log|error|warn)/g,
    /res\.status\(\d+\)\.json/g,
    /throw new (Error|TypeError|RangeError)/g,
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
  const formalDocs = language === 'Python'
    ? (code.match(/"""\s*\n\s*(Args|Returns|Raises|Parameters|Yields):/g) || []).length
    : (code.match(/@(param|returns|throws|example)\s/g) || []).length;

  const funcCount = (code.match(/function\s|def\s|const\s+\w+\s*=/g) || []).length || 1;
  const ratio = formalDocs / funcCount;

  if (ratio > 0.8) return 0.85;
  if (ratio > 0.4) return 0.5;
  return 0.15;
}

function analyzeImports(code: string): number {
  const importLines = code.split('\n').filter(l =>
    l.trim().startsWith('import ') || l.trim().startsWith('from ')
  );

  if (importLines.length < 3) return 0.5;

  const importNames = importLines.map(l => l.trim().toLowerCase());
  const sorted = [...importNames].sort();
  const isSorted = importNames.every((val, idx) => val === sorted[idx]);

  return isSorted ? 0.75 : 0.25;
}

function isCommonKeyword(id: string): boolean {
  const keywords = new Set([
    'if', 'else', 'for', 'while', 'return', 'const', 'let', 'var',
    'function', 'class', 'import', 'export', 'from', 'async', 'await',
    'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null',
    'undefined', 'def', 'self', 'None', 'True', 'False',
  ]);
  return keywords.has(id);
}
