export type DiffLineType = 'added' | 'removed' | 'unchanged';

export interface DiffLine {
  type: DiffLineType;
  line: string;
}

/**
 * Simple LCS-based line-by-line diff.
 * Returns a unified diff as a single array of DiffLine objects.
 */
export function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const m = leftLines.length;
  const n = rightLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (leftLines[i - 1] === rightLines[j - 1]) {
      result.unshift({ type: 'unchanged', line: leftLines[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      result.unshift({ type: 'removed', line: leftLines[i - 1] });
      i--;
    } else {
      result.unshift({ type: 'added', line: rightLines[j - 1] });
      j--;
    }
  }

  while (i > 0) {
    result.unshift({ type: 'removed', line: leftLines[i - 1] });
    i--;
  }
  while (j > 0) {
    result.unshift({ type: 'added', line: rightLines[j - 1] });
    j--;
  }

  return result;
}
