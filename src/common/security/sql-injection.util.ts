export type SqlScanOptions = {
  /**
   * Keys to ignore when scanning (e.g., password/token fields may legitimately include characters that look suspicious).
   */
  skipKeys?: string[];
  maxDepth?: number;
};

const DEFAULT_MAX_DEPTH = 20;

// Conservative patterns that strongly indicate SQLi attempts in typical API inputs.
// We keep this minimal to reduce false positives.
const SQLI_PATTERNS: RegExp[] = [
  /(\bunion\b\s+\bselect\b)/i,
  /(\bdrop\b\s+\btable\b)/i,
  /(\binsert\b\s+\binto\b)/i,
  /(\bupdate\b\s+\w+\s+\bset\b)/i,
  /(\bdelete\b\s+\bfrom\b)/i,
  /(\bor\b\s+1\s*=\s*1\b)/i,
  /(\b'?\s*or\s*'?\w+'?\s*=\s*'?\w+'?\b)/i,
  /(--\s|\/\*|\*\/)/, // comment tokens
  /(;+\s*(select|insert|update|delete|drop)\b)/i,
];

export type SqlScanHit = {
  path: string;
  value: string;
  pattern: string;
};

export function scanForSqlInjection(
  value: unknown,
  options: SqlScanOptions = {},
): SqlScanHit | null {
  const skipKeys = new Set((options.skipKeys ?? []).map((k) => k.toLowerCase()));
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  const visit = (
    v: unknown,
    depth: number,
    path: string,
    currentKey?: string,
  ): SqlScanHit | null => {
    if (depth > maxDepth) return null;

    if (typeof v === 'string') {
      const k = (currentKey ?? '').toLowerCase();
      if (k && skipKeys.has(k)) return null;
      for (const pattern of SQLI_PATTERNS) {
        if (pattern.test(v)) {
          return { path, value: v, pattern: pattern.toString() };
        }
      }
      return null;
    }

    if (typeof v !== 'object' || v === null) return null;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const hit = visit(v[i], depth + 1, `${path}[${i}]`, currentKey);
        if (hit) return hit;
      }
      return null;
    }

    const obj = v as Record<string, unknown>;
    for (const [k, val] of Object.entries(obj)) {
      const nextPath = path ? `${path}.${k}` : k;
      const hit = visit(val, depth + 1, nextPath, k);
      if (hit) return hit;
    }
    return null;
  };

  return visit(value, 0, '', undefined);
}
