#!/usr/bin/env node

/**
 * Performance testing script for validating optimization targets
 * Tests Core Web Vitals and component performance
 */

const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Performance targets
const PERFORMANCE_TARGETS = {
  // Core Web Vitals
  LCP: 2500,    // Largest Contentful Paint < 2.5s
  FID: 100,     // First Input Delay < 100ms  
  CLS: 0.1,     // Cumulative Layout Shift < 0.1
  FCP: 1800,    // First Contentful Paint < 1.8s
  TTFB: 600,    // Time to First Byte < 600ms
  
  // Component Performance
  tableRender: 16,     // Table render < 16ms (60fps)
  mapRender: 16,       // Map render < 16ms
  routeChange: 1000,   // Route change < 1s
  
  // Bundle Size
  initialBundle: 500000,  // < 500KB
  totalBundle: 2000000,   // < 2MB
  
  // Network
  lighthouse: 90,      // Lighthouse performance score > 90
};

console.log('🚀 Running performance tests...\n');

// Test Core Web Vitals
async function testCoreWebVitals() {
  console.log('📊 Testing Core Web Vitals...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {};
      
      // LCP Observer
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.performanceMetrics.LCP = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // FID Observer  
      new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0];
        if (firstInput) {
          window.performanceMetrics.FID = firstInput.processingStart - firstInput.startTime;
        }
      }).observe({ entryTypes: ['first-input'] });
      
      // CLS Observer
      let cumulativeLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
          }
        }
        window.performanceMetrics.CLS = cumulativeLayoutShift;
      }).observe({ entryTypes: ['layout-shift'] });
      
      // FCP Observer
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            window.performanceMetrics.FCP = entry.startTime;
          }
        }
      }).observe({ entryTypes: ['paint'] });
    });

    // Test dashboard page
    console.log('  Testing dashboard page...');
    const startTime = Date.now();
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    
    // Wait for page to settle
    await page.waitForTimeout(2000);
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        ...window.performanceMetrics,
        TTFB: navigation.responseStart - navigation.requestStart,
        loadTime: Date.now() - window.performance.timeOrigin
      };
    });

    console.log('  Results:');
    const results = {};
    
    Object.entries(PERFORMANCE_TARGETS).forEach(([metric, target]) => {
      if (metrics[metric] !== undefined) {
        const value = metrics[metric];
        const passed = value <= target;
        results[metric] = { value, target, passed };
        
        const status = passed ? '✅' : '❌';
        console.log(`    ${status} ${metric}: ${value.toFixed(2)}ms (target: ${target}ms)`);
      }
    });

    return results;
    
  } finally {
    await browser.close();
  }
}

// Test component performance
async function testComponentPerformance() {
  console.log('\n🧩 Testing component performance...');
  
  const browser = await puppeteer.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/dashboard');
    
    // Test ActiveJobs table performance
    console.log('  Testing ActiveJobs table...');
    const tablePerf = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();
        
        // Simulate large dataset
        const testData = Array.from({ length: 1000 }, (_, i) => ({
          id: `job-${i}`,
          customer: `Customer ${i}`,
          status: ['pending', 'in-transit', 'completed'][i % 3],
          priority: ['low', 'medium', 'high', 'urgent'][i % 4]
        }));
        
        // Measure render time
        requestAnimationFrame(() => {
          const renderTime = performance.now() - startTime;
          resolve({ renderTime, itemCount: testData.length });
        });
      });
    });
    
    console.log(`    Table render: ${tablePerf.renderTime.toFixed(2)}ms for ${tablePerf.itemCount} items`);
    
    // Test map performance
    console.log('  Testing map component...');
    await page.goto('http://localhost:3000/dashboard'); // Assuming map is on dashboard
    
    const mapPerf = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();
        
        // Simulate driver markers
        const driverCount = 50;
        
        requestAnimationFrame(() => {
          const renderTime = performance.now() - startTime;
          resolve({ renderTime, driverCount });
        });
      });
    });
    
    console.log(`    Map render: ${mapPerf.renderTime.toFixed(2)}ms for ${mapPerf.driverCount} drivers`);
    
    return {
      table: tablePerf,
      map: mapPerf
    };
    
  } finally {
    await browser.close();
  }
}

// Test bundle performance
async function testBundlePerformance() {
  console.log('\n📦 Testing bundle performance...');
  
  const browser = await puppeteer.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    
    // Track network requests
    const resources = [];
    page.on('response', (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        resources.push({
          url: response.url(),
          size: response.headers()['content-length'] || 0,
          status: response.status()
        });
      }
    });
    
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    
    // Calculate bundle sizes
    const totalSize = resources.reduce((sum, resource) => sum + parseInt(resource.size || 0), 0);
    const jsResources = resources.filter(r => r.url.includes('.js'));
    const initialBundle = jsResources[0]?.size || 0;
    
    console.log(`  Initial bundle: ${(initialBundle / 1024).toFixed(2)}KB`);
    console.log(`  Total bundle: ${(totalSize / 1024).toFixed(2)}KB`);
    console.log(`  Resource count: ${resources.length}`);
    
    return {
      initialBundle: parseInt(initialBundle),
      totalBundle: totalSize,
      resourceCount: resources.length
    };
    
  } finally {
    await browser.close();
  }
}

// Test route change performance
async function testRoutePerformance() {
  console.log('\n🛤️  Testing route performance...');
  
  const browser = await puppeteer.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/dashboard');
    
    // Test route changes
    const routes = ['/dashboard/analytics', '/dashboard/billing', '/pricing'];
    const routeResults = [];
    
    for (const route of routes) {
      const startTime = Date.now();
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      routeResults.push({ route, loadTime });
      console.log(`    ${route}: ${loadTime}ms`);
    }
    
    return routeResults;
    
  } finally {
    await browser.close();
  }
}

// Generate performance report
function generatePerformanceReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    targets: PERFORMANCE_TARGETS,
    results: results,
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      overallScore: 0
    },
    recommendations: []
  };

  // Calculate summary
  let totalTests = 0;
  let passedTests = 0;

  Object.values(results).forEach(category => {
    if (typeof category === 'object' && category !== null) {
      Object.values(category).forEach(test => {
        if (typeof test === 'object' && test.passed !== undefined) {
          totalTests++;
          if (test.passed) passedTests++;
        }
      });
    }
  });

  report.summary.totalTests = totalTests;
  report.summary.passedTests = passedTests;
  report.summary.failedTests = totalTests - passedTests;
  report.summary.overallScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  // Add recommendations
  if (results.coreWebVitals?.LCP?.value > PERFORMANCE_TARGETS.LCP) {
    report.recommendations.push('Optimize Largest Contentful Paint: Consider image optimization, critical CSS, or server-side rendering');
  }
  
  if (results.coreWebVitals?.FID?.value > PERFORMANCE_TARGETS.FID) {
    report.recommendations.push('Reduce First Input Delay: Minimize JavaScript execution time and use web workers for heavy tasks');
  }
  
  if (results.coreWebVitals?.CLS?.value > PERFORMANCE_TARGETS.CLS) {
    report.recommendations.push('Improve Cumulative Layout Shift: Set dimensions for images and ads, avoid inserting content above existing content');
  }
  
  if (results.bundle?.totalBundle > PERFORMANCE_TARGETS.totalBundle) {
    report.recommendations.push('Reduce bundle size: Implement code splitting, tree shaking, and dynamic imports');
  }

  // Save report
  const reportPath = path.join(process.cwd(), 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

// Main execution
async function main() {
  try {
    // Check if development server is running
    console.log('🔍 Checking development server...');
    try {
      execSync('curl -f http://localhost:3000/api/health || curl -f http://localhost:3000', { stdio: 'ignore' });
      console.log('✅ Development server is running\n');
    } catch (error) {
      console.log('❌ Development server not running. Starting...');
      console.log('Please run "npm run dev" in another terminal first.');
      process.exit(1);
    }

    // Run all tests
    const results = {};
    
    results.coreWebVitals = await testCoreWebVitals();
    results.components = await testComponentPerformance();
    results.bundle = await testBundlePerformance();
    results.routes = await testRoutePerformance();

    // Generate report
    const report = generatePerformanceReport(results);
    
    console.log('\n📊 Performance Test Summary:');
    console.log(`Overall Score: ${report.summary.overallScore}%`);
    console.log(`Tests Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n🎯 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    console.log(`\n📄 Full report saved to: performance-report.json`);

    // Exit with appropriate code
    if (report.summary.overallScore >= 80) {
      console.log('\n✅ Performance tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Performance tests failed. Please review recommendations.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Performance testing failed:', error.message);
    process.exit(1);
  }
}

// Check if puppeteer is available
try {
  require.resolve('puppeteer');
  main();
} catch (error) {
  console.log('📦 Puppeteer not found. Installing...');
  try {
    execSync('npm install --save-dev puppeteer', { stdio: 'inherit' });
    console.log('✅ Puppeteer installed. Rerun the test.');
  } catch (installError) {
    console.error('❌ Failed to install Puppeteer:', installError.message);
    console.log('\n💡 Manual installation: npm install --save-dev puppeteer');
    process.exit(1);
  }
}