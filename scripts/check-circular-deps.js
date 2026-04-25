#!/usr/bin/env node
/**
 * Circular Dependency Detector (issue #839)
 *
 * Scans src/ for TypeScript import cycles using DFS.
 * Usage: node scripts/check-circular-deps.js [--dir src]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dirArg = args.indexOf('--dir');
const ROOT = path.resolve(dirArg !== -1 ? args[dirArg + 1] : 'src');

/** Collect all .ts files recursively */
function collectFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectFiles(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts'))
      results.push(full);
  }
  return results;
}

/** Extract local imports from a file */
function getImports(file) {
  const content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const imports = [];
  const re = /from\s+['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const candidates = [
      path.resolve(dir, m[1] + '.ts'),
      path.resolve(dir, m[1], 'index.ts'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        imports.push(c);
        break;
      }
    }
  }
  return imports;
}

/** Build adjacency map */
function buildGraph(files) {
  const graph = new Map();
  for (const f of files) graph.set(f, getImports(f));
  return graph;
}

/** DFS cycle detection; returns first cycle found or null */
function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const stack = new Set();

  function dfs(node, pathArr) {
    if (stack.has(node)) {
      const idx = pathArr.indexOf(node);
      cycles.push(pathArr.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    pathArr.push(node);
    for (const neighbor of graph.get(node) || []) {
      dfs(neighbor, pathArr);
    }
    pathArr.pop();
    stack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) dfs(node, []);
  }
  return cycles;
}

function shorten(file) {
  return path.relative(process.cwd(), file);
}

const files = collectFiles(ROOT);
const graph = buildGraph(files);
const cycles = findCycles(graph);

if (cycles.length === 0) {
  console.log('✅  No circular dependencies found.');
  process.exit(0);
} else {
  console.error(`❌  Found ${cycles.length} circular dependency cycle(s):\n`);
  cycles.forEach((cycle, i) => {
    console.error(`  Cycle ${i + 1}:`);
    cycle.forEach((f, j) => {
      const arrow = j < cycle.length - 1 ? ' →' : ' (back to start)';
      console.error(`    ${shorten(f)}${arrow}`);
    });
    console.error('');
  });
  process.exit(1);
}
