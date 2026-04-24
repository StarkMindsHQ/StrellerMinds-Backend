#!/usr/bin/env node
/**
 * Code Complexity Metrics (issue #841)
 *
 * Reports cyclomatic complexity and maintainability indicators for src/ files.
 * Flags functions exceeding configurable thresholds.
 *
 * Usage: node scripts/check-complexity.js [--dir src] [--max-complexity 10] [--max-lines 50]
 */

const fs = require('fs');
const path = require('path');

// --- CLI args ---
const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const ROOT = path.resolve(get('--dir', 'src'));
const MAX_COMPLEXITY = parseInt(get('--max-complexity', '10'), 10);
const MAX_LINES = parseInt(get('--max-lines', '50'), 10);

/** Collect .ts source files */
function collectFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectFiles(full));
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts'))
      out.push(full);
  }
  return out;
}

/**
 * Approximate cyclomatic complexity of a function body:
 * 1 (base) + count of branching keywords.
 */
function cyclomaticComplexity(body) {
  const branches = /\b(if|else if|for|while|do|case|catch|\?\?|\?\.|\|\||&&)\b/g;
  return 1 + (body.match(branches) || []).length;
}

/**
 * Extract top-level and class method functions from a TS file.
 * Returns array of { name, startLine, lines, complexity }.
 */
function analyzeFunctions(content) {
  const lines = content.split('\n');
  const results = [];

  // Match: async? function name(...) or name(...): type {
  // Also matches arrow functions assigned to const/let
  const fnRe =
    /(?:(?:async\s+)?function\s+(\w+)|(?:(?:async|public|private|protected|static|override)\s+)*(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>\[\]|&,\s]+)?\s*\{|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[\w<>\[\]|&,\s]+)?\s*=>)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = fnRe.exec(line);
    if (m) {
      const name = m[1] || m[2] || m[3] || '<anonymous>';
      // Skip constructors and simple getters that aren't interesting
      if (['constructor', 'get', 'set', 'if', 'for', 'while', 'switch', 'catch'].includes(name)) {
        i++;
        continue;
      }
      // Find matching closing brace
      let depth = 0;
      let start = i;
      let end = i;
      for (let j = i; j < lines.length; j++) {
        depth += (lines[j].match(/\{/g) || []).length;
        depth -= (lines[j].match(/\}/g) || []).length;
        if (depth <= 0 && j > i) {
          end = j;
          break;
        }
      }
      const body = lines.slice(start, end + 1).join('\n');
      const fnLines = end - start + 1;
      const cc = cyclomaticComplexity(body);
      results.push({ name, startLine: start + 1, lines: fnLines, complexity: cc });
      i = end + 1;
      continue;
    }
    i++;
  }
  return results;
}

// --- Main ---
const files = collectFiles(ROOT);
let violations = 0;
const report = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const fns = analyzeFunctions(content);
  const rel = path.relative(process.cwd(), file);

  for (const fn of fns) {
    const ccViolation = fn.complexity > MAX_COMPLEXITY;
    const lineViolation = fn.lines > MAX_LINES;
    if (ccViolation || lineViolation) {
      violations++;
      report.push({ file: rel, ...fn, ccViolation, lineViolation });
    }
  }
}

// Summary
console.log('\n📊  Code Complexity Report');
console.log(`   Scanned : ${files.length} files`);
console.log(`   Thresholds: complexity > ${MAX_COMPLEXITY}, function lines > ${MAX_LINES}\n`);

if (report.length === 0) {
  console.log('✅  All functions within complexity thresholds.\n');
} else {
  console.log(`⚠️   ${violations} violation(s) found:\n`);
  for (const v of report) {
    const flags = [
      v.ccViolation ? `complexity=${v.complexity}` : null,
      v.lineViolation ? `lines=${v.lines}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`  ${v.file}:${v.startLine}  ${v.name}()  [${flags}]`);
  }
  console.log('');
}

process.exit(violations > 0 ? 1 : 0);
