const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

/**
 * Script to minify JavaScript assets in production builds
 * This script processes the compiled JavaScript files in the dist/ directory
 * and creates minified versions to reduce bundle size and improve performance.
 */

class AssetMinifier {
  constructor() {
    this.distPath = path.join(__dirname, '..', 'dist');
    this.minifiedPath = path.join(__dirname, '..', 'dist');
    this.options = {
      compress: {
        drop_console: true, // Remove console.log statements in production
        drop_debugger: true, // Remove debugger statements
        dead_code: true, // Remove dead code
        unused: true, // Remove unused variables
        hoist_funs: true, // Hoist function declarations
        hoist_vars: false, // Don't hoist variables (safer)
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific function calls
        pure_getters: true, // Assume getters have no side effects
        unsafe: false, // Keep optimizations safe
        passes: 2, // Run compression twice for better results
      },
      mangle: {
        toplevel: true, // Mangle top-level scope names
        properties: {
          regex: /^_/, // Only mangle private properties (starting with _)
        },
      },
      format: {
        comments: false, // Remove all comments
        semicolons: true, // Ensure semicolons are present
      },
      sourceMap: {
        filename: '[file].map',
        url: '[file].map',
      },
    };
  }

  /**
   * Find all JavaScript files in the dist directory
   */
  findJavaScriptFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
      console.warn(`Directory ${dir} does not exist`);
      return files;
    }

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findJavaScriptFiles(fullPath));
      } else if (item.endsWith('.js') && !item.endsWith('.min.js')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Minify a single JavaScript file
   */
  async minifyFile(filePath) {
    try {
      console.log(`Minifying: ${filePath}`);
      
      const source = fs.readFileSync(filePath, 'utf8');
      const result = await minify(source, this.options);
      
      if (result.error) {
        console.error(`Error minifying ${filePath}:`, result.error);
        return false;
      }
      
      // Create backup of original file
      const backupPath = filePath.replace('.js', '.original.js');
      fs.writeFileSync(backupPath, source);
      
      // Write minified version
      fs.writeFileSync(filePath, result.code);
      
      // Write source map if generated
      if (result.map) {
        const mapPath = filePath + '.map';
        fs.writeFileSync(mapPath, result.map);
      }
      
      // Calculate size reduction
      const originalSize = Buffer.byteLength(source, 'utf8');
      const minifiedSize = Buffer.byteLength(result.code, 'utf8');
      const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
      
      console.log(`✓ Minified ${filePath}`);
      console.log(`  Original: ${this.formatBytes(originalSize)} -> Minified: ${this.formatBytes(minifiedSize)} (${reduction}% reduction)`);
      
      return true;
    } catch (error) {
      console.error(`Failed to minify ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Run the minification process
   */
  async run() {
    console.log('🔧 Starting asset minification for production...\n');
    
    const startTime = Date.now();
    const jsFiles = this.findJavaScriptFiles(this.distPath);
    
    if (jsFiles.length === 0) {
      console.log('No JavaScript files found to minify');
      return;
    }
    
    console.log(`Found ${jsFiles.length} JavaScript files to minify\n`);
    
    let successCount = 0;
    let totalOriginalSize = 0;
    let totalMinifiedSize = 0;
    
    for (const file of jsFiles) {
      const source = fs.readFileSync(file, 'utf8');
      totalOriginalSize += Buffer.byteLength(source, 'utf8');
      
      const success = await this.minifyFile(file);
      if (success) {
        successCount++;
        const minified = fs.readFileSync(file, 'utf8');
        totalMinifiedSize += Buffer.byteLength(minified, 'utf8');
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalReduction = ((totalOriginalSize - totalMinifiedSize) / totalOriginalSize * 100).toFixed(2);
    
    console.log('\n📊 Minification Summary:');
    console.log(`✓ Successfully minified: ${successCount}/${jsFiles.length} files`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📦 Total size reduction: ${this.formatBytes(totalOriginalSize)} -> ${this.formatBytes(totalMinifiedSize)} (${totalReduction}% reduction)`);
    console.log('\n🎉 Asset minification completed successfully!');
  }
}

// Run the minifier if this script is executed directly
if (require.main === module) {
  const minifier = new AssetMinifier();
  minifier.run().catch(error => {
    console.error('Minification failed:', error);
    process.exit(1);
  });
}

module.exports = AssetMinifier;
