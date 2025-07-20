#!/usr/bin/env node

/**
 * Bundle analysis script for performance monitoring
 * Run with: npm run analyze
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BUNDLE_SIZE_LIMIT = 500 * 1024; // 500KB
const CHUNK_SIZE_LIMIT = 200 * 1024;  // 200KB per chunk
const TOTAL_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB total

console.log('🔍 Analyzing bundle size and performance...\n');

// Build the application
console.log('📦 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Analyze bundle sizes
function analyzeBundleSizes() {
  const buildDir = path.join(process.cwd(), '.next/static/chunks');
  
  if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found');
    return;
  }

  const chunks = fs.readdirSync(buildDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(buildDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2)
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('📊 Bundle Analysis:');
  console.table(chunks.slice(0, 10)); // Top 10 chunks

  // Check size limits
  const violations = [];
  let totalSize = 0;

  chunks.forEach(chunk => {
    totalSize += chunk.size;
    
    if (chunk.size > CHUNK_SIZE_LIMIT) {
      violations.push(`${chunk.name}: ${chunk.sizeKB}KB > ${(CHUNK_SIZE_LIMIT / 1024).toFixed(0)}KB limit`);
    }
  });

  if (totalSize > TOTAL_SIZE_LIMIT) {
    violations.push(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB > ${(TOTAL_SIZE_LIMIT / 1024 / 1024).toFixed(0)}MB limit`);
  }

  if (violations.length > 0) {
    console.log('\n❌ Bundle size violations:');
    violations.forEach(violation => console.log(`  - ${violation}`));
    console.log('\n💡 Consider:');
    console.log('  - Code splitting large components');
    console.log('  - Tree shaking unused imports');
    console.log('  - Dynamic imports for non-critical code');
    console.log('  - Analyzing with webpack-bundle-analyzer');
  } else {
    console.log('\n✅ All bundle sizes within limits');
  }

  return {
    chunks,
    totalSize,
    violations: violations.length
  };
}

// Generate bundle report
function generateReport(analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    totalSize: analysis.totalSize,
    totalSizeMB: (analysis.totalSize / 1024 / 1024).toFixed(2),
    chunkCount: analysis.chunks.length,
    violations: analysis.violations,
    largestChunks: analysis.chunks.slice(0, 5),
    recommendations: []
  };

  // Add recommendations based on analysis
  if (analysis.totalSize > TOTAL_SIZE_LIMIT * 0.8) {
    report.recommendations.push('Consider implementing more aggressive code splitting');
  }

  const largeChunks = analysis.chunks.filter(chunk => chunk.size > CHUNK_SIZE_LIMIT * 0.8);
  if (largeChunks.length > 0) {
    report.recommendations.push('Large chunks detected - review for optimization opportunities');
  }

  if (analysis.chunks.length > 20) {
    report.recommendations.push('High number of chunks - consider chunk consolidation');
  }

  // Save report
  const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  return report;
}

// Check Core Web Vitals budget
function checkPerformanceBudget() {
  console.log('\n🚀 Performance Budget Check:');
  
  const budget = {
    'Largest Contentful Paint (LCP)': '< 2.5s',
    'First Input Delay (FID)': '< 100ms',
    'Cumulative Layout Shift (CLS)': '< 0.1',
    'First Contentful Paint (FCP)': '< 1.8s',
    'Time to First Byte (TTFB)': '< 600ms'
  };

  console.table(budget);
  console.log('💡 Use Lighthouse or WebPageTest to measure these metrics in production');
}

// Run tree-shaking analysis
function analyzeTreeShaking() {
  console.log('\n🌲 Tree Shaking Analysis:');
  
  try {
    // Check for common tree-shaking issues
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    const treeshakingIssues = [];
    
    // Check for libraries known to have tree-shaking issues
    const problematicLibs = ['lodash', 'moment', 'antd'];
    problematicLibs.forEach(lib => {
      if (dependencies.includes(lib)) {
        treeshakingIssues.push(`${lib} - consider using tree-shakable alternatives`);
      }
    });

    if (treeshakingIssues.length > 0) {
      console.log('⚠️  Potential tree-shaking issues:');
      treeshakingIssues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ No obvious tree-shaking issues detected');
    }

    // Recommendations
    console.log('\n💡 Tree-shaking best practices:');
    console.log('  - Use ES6 imports/exports');
    console.log('  - Import only what you need: import { specific } from "library"');
    console.log('  - Use lodash-es instead of lodash');
    console.log('  - Use date-fns instead of moment');
    console.log('  - Configure webpack sideEffects: false');

  } catch (error) {
    console.error('❌ Tree-shaking analysis failed:', error.message);
  }
}

// Main execution
async function main() {
  try {
    const analysis = analyzeBundleSizes();
    const report = generateReport(analysis);
    
    checkPerformanceBudget();
    analyzeTreeShaking();

    console.log('\n📈 Summary:');
    console.log(`Total bundle size: ${report.totalSizeMB}MB`);
    console.log(`Number of chunks: ${report.chunkCount}`);
    console.log(`Violations: ${report.violations}`);

    if (report.recommendations.length > 0) {
      console.log('\n🎯 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    // Exit with error code if there are violations
    if (analysis.violations > 0) {
      console.log('\n❌ Bundle analysis failed due to size violations');
      process.exit(1);
    } else {
      console.log('\n✅ Bundle analysis passed');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main();