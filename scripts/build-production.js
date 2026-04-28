#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production build with asset minification...\n');

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Run standard NestJS build first
  console.log('📦 Building NestJS application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Check if webpack config exists
  const webpackConfig = path.join(process.cwd(), 'webpack.config.prod.js');
  if (!fs.existsSync(webpackConfig)) {
    console.log('⚠️  Webpack production config not found, skipping minification');
    console.log('✅ Standard build completed successfully');
    process.exit(0);
  }

  // Run webpack for minification
  console.log('🗜️  Minifying assets with webpack...');
  execSync('npm run build:prod', { stdio: 'inherit' });

  // Calculate build stats
  const distPath = path.join(process.cwd(), 'dist');
  const stats = getDirectoryStats(distPath);

  console.log('\n📊 Build Statistics:');
  console.log(`   Total files: ${stats.fileCount}`);
  console.log(`   Total size: ${formatBytes(stats.totalSize)}`);
  console.log(`   Largest file: ${stats.largestFile.name} (${formatBytes(stats.largestFile.size)})`);

  console.log('\n✅ Production build with minification completed successfully!');
  console.log('🎯 Ready for deployment!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

function getDirectoryStats(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  let largestFile = { name: '', size: 0 };

  function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);
    
    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const size = stat.size;
        totalSize += size;
        fileCount++;
        
        if (size > largestFile.size) {
          largestFile = { name: path.relative(dirPath, filePath), size };
        }
      } else if (stat.isDirectory()) {
        walkDir(filePath);
      }
    }
  }

  walkDir(dirPath);
  return { totalSize, fileCount, largestFile };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
