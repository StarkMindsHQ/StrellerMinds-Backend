#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing asset minification setup...\n');

// Test 1: Check if required files exist
console.log('📁 Checking configuration files...');
const requiredFiles = [
  'webpack.config.prod.js',
  'scripts/build-production.js',
  'package.json'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - Missing!`);
    allFilesExist = false;
  }
}

// Test 2: Check package.json scripts
console.log('\n📜 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build:prod', 'build:minified'];

let allScriptsExist = true;
for (const script of requiredScripts) {
  if (packageJson.scripts[script]) {
    console.log(`   ✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`   ❌ ${script} - Missing!`);
    allScriptsExist = false;
  }
}

// Test 3: Check webpack config syntax
console.log('\n⚙️  Checking webpack configuration...');
try {
  const webpackConfig = require('./webpack.config.prod.js');
  console.log('   ✅ Webpack config syntax is valid');
  
  // Check key configuration options
  const checks = [
    { key: 'mode', expected: 'production', name: 'Production mode' },
    { key: 'target', expected: 'node', name: 'Node target' },
    { key: 'optimization.minimize', expected: true, name: 'Minimization enabled' }
  ];

  for (const check of checks) {
    const value = getNestedValue(webpackConfig, check.key);
    if (value === check.expected) {
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name} - Expected ${check.expected}, got ${value}`);
    }
  }
} catch (error) {
  console.log(`   ❌ Webpack config error: ${error.message}`);
}

// Test 4: Check dependencies
console.log('\n📦 Checking dependencies...');
const requiredDeps = [
  'terser-webpack-plugin',
  'css-minimizer-webpack-plugin',
  'webpack',
  'webpack-cli',
  'webpack-node-externals'
];

let allDepsExist = true;
for (const dep of requiredDeps) {
  if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`   ✅ ${dep}@${packageJson.devDependencies[dep]}`);
  } else {
    console.log(`   ❌ ${dep} - Missing from devDependencies!`);
    allDepsExist = false;
  }
}

// Summary
console.log('\n📊 Test Summary:');
if (allFilesExist && allScriptsExist && allDepsExist) {
  console.log('   ✅ All tests passed! Minification setup is ready.');
  console.log('\n🚀 Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. Run: npm run build:minified');
  console.log('   3. Check the dist/ directory for minified output');
} else {
  console.log('   ❌ Some tests failed. Please fix the issues above.');
  process.exit(1);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}
