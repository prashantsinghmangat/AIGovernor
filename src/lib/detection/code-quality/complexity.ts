/**
 * Cyclomatic complexity calculator.
 *
 * Counts decision points (if, else if, for, while, switch case, &&, ||, catch, ternary)
 * to produce an approximate cyclomatic complexity per file.
 */

const DECISION_PATTERNS = [
  /\bif\s*\(/g,
  /\belse\s+if\s*\(/g,
  /\bfor\s*\(/g,
  /\bwhile\s*\(/g,
  /\bcase\s+/g,
  /\bcatch\s*\(/g,
  /&&/g,
  /\|\|/g,
  /\?[^?:]/g, // ternary (not nullish coalescing ??)
];

/**
 * Calculate cyclomatic complexity for a code string.
 * Returns 1 (base) plus number of decision points.
 */
export function calculateCyclomaticComplexity(code: string): number {
  let complexity = 1; // Base complexity

  for (const pattern of DECISION_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    const matches = code.match(new RegExp(pattern.source, pattern.flags));
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Estimate the maximum function length in lines.
 */
export function estimateMaxFunctionLength(code: string): number {
  const lines = code.split('\n');
  let maxLength = 0;
  let currentLength = 0;
  let braceDepth = 0;
  let inFunction = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect function start (covers most languages)
    if (
      /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|def\s+\w+|func\s+\w+|(?:public|private|protected|static)\s+\w+\s+\w+\s*\()/.test(
        trimmed,
      )
    ) {
      if (!inFunction) {
        inFunction = true;
        currentLength = 0;
        braceDepth = 0;
      }
    }

    if (inFunction) {
      currentLength++;

      // Count braces
      for (const ch of trimmed) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      // Function ended
      if (braceDepth <= 0 && currentLength > 1) {
        maxLength = Math.max(maxLength, currentLength);
        inFunction = false;
        currentLength = 0;
      }
    }
  }

  // Handle functions that don't close (edge case)
  if (inFunction && currentLength > maxLength) {
    maxLength = currentLength;
  }

  return maxLength;
}

/**
 * Estimate the maximum nesting depth in the code.
 */
export function estimateMaxNestingDepth(code: string): number {
  const lines = code.split('\n');
  let maxDepth = 0;
  let currentDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Count opening braces
    for (const ch of trimmed) {
      if (ch === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      if (ch === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
  }

  return maxDepth;
}
