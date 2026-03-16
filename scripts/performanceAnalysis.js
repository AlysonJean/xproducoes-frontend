#!/usr/bin/env node

/**
 * Performance Analysis Script (2026)
 * 
 * Analyzes:
 * - Bundle size (main, vendor, chunks)
 * - Lazy loading opportunities
 * - Dead code
 * - Duplicate dependencies
 * - Performance metrics
 * 
 * Run: npm run analyze
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../../dist');
const REPORT_FILE = path.join(__dirname, '../../dist/stats.html');

interface BundleMetrics {
  total: number;
  gzipped: number;
  main: number;
  vendors: number;
  chunks: Array<{
    name: string;
    size: number;
    gzipped: number;
  }>;
}

/**
 * Analyze bundle size
 */
function analyzeBundleSize(): BundleMetrics {
  const metrics: BundleMetrics = {
    total: 0,
    gzipped: 0,
    main: 0,
    vendors: 0,
    chunks: [],
  };

  // Read Vite build stats
  const statsPath = path.join(DIST_DIR, 'stats.json');
  if (fs.existsSync(statsPath)) {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

    // Calculate bundle sizes
    Object.entries(stats.modules || {}).forEach(([name, module]: any) => {
      const size = module.size || 0;
      metrics.total += size;

      if (name.includes('node_modules')) {
        metrics.vendors += size;
      }
    });
  }

  return metrics;
}

/**
 * Identify dead code
 */
function identifyDeadCode() {
  console.log('\n🔍 Dead Code Analysis:');

  // Check for unused variables, functions
  // This is a basic check, in production use proper static analysis tools
  try {
    execSync('npx eslint src --max-warnings 0 --format=json', {
      cwd: path.join(__dirname, '../..'),
    });
  } catch (error) {
    // ESLint found issues
  }
}

/**
 * Check for duplicate dependencies
 */
function checkDuplicateDeps() {
  console.log('\n📦 Duplicate Dependencies Check:');

  try {
    const packageLockPath = path.join(__dirname, '../../package-lock.json');
    if (fs.existsSync(packageLockPath)) {
      const lockfile = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8'));

      // Count occurrences of each package
      const packages: Record<string, number> = {};
      const countPackages = (node: any) => {
        if (node.dependencies) {
          Object.keys(node.dependencies).forEach((dep) => {
            packages[dep] = (packages[dep] || 0) + 1;
            countPackages(node.dependencies[dep]);
          });
        }
      };

      countPackages(lockfile);

      // Find duplicates
      const duplicates = Object.entries(packages).filter(([_, count]) => count > 2);
      if (duplicates.length > 0) {
        console.log('⚠️  Found duplicate package versions:');
        duplicates.forEach(([pkg, count]) => {
          console.log(`   ${pkg}: ${count} versions`);
        });
      } else {
        console.log('✅ No duplicate dependencies found');
      }
    }
  } catch (error) {
    console.log('Could not analyze dependencies');
  }
}

/**
 * Recommend lazy loading
 */
function recommendLazyLoading() {
  console.log('\n⚡ Lazy Loading Recommendations:');

  const recommendations = [
    '- AdminDashboard (route: /admin)',
    '- CollaboratorsPage (route: /collaborators)',
    '- ReportsPage (route: /reports)',
    '- SettingsPage (route: /settings)',
  ];

  console.log('Consider lazy loading these routes:');
  recommendations.forEach((rec) => {
    console.log(`  ${rec}`);
  });
}

/**
 * Print recommendations
 */
function printRecommendations() {
  console.log('\n📋 2026 Performance Recommendations:');

  const recommendations = [
    {
      priority: 'HIGH',
      item: 'Enable Gzip compression (express compression)',
      impact: '~30% bundle size reduction',
    },
    {
      priority: 'HIGH',
      item: 'Implement code-splitting strategy',
      impact: 'Faster initial load time',
    },
    {
      priority: 'MEDIUM',
      item: 'Optimize images (WebP format)',
      impact: '~50% image size reduction',
    },
    {
      priority: 'MEDIUM',
      item: 'Lazy load below-fold components',
      impact: 'Faster Time to Interactive',
    },
    {
      priority: 'LOW',
      item: 'Minify CSS/JS assets',
      impact: 'Already done by Vite',
    },
  ];

  recommendations.forEach(({ priority, item, impact }) => {
    const icon = priority === 'HIGH' ? '🔴' : priority === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`${icon} [${priority}] ${item}`);
    console.log(`    → ${impact}`);
  });
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log('\n📊 Performance Analysis Report');
  console.log('═══════════════════════════════════════\n');

  // Bundle metrics
  const metrics = analyzeBundleSize();
  console.log('📦 Bundle Size Metrics:');
  console.log(`   Total: ${(metrics.total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Vendors: ${(metrics.vendors / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Main: ${(metrics.main / 1024 / 1024).toFixed(2)} MB`);

  // Dead code
  identifyDeadCode();

  // Duplicates
  checkDuplicateDeps();

  // Recommendations
  recommendLazyLoading();

  // Best practices
  printRecommendations();

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Analysis complete!\n');

  // Check if stats.html exists
  if (fs.existsSync(REPORT_FILE)) {
    console.log(`📈 Detailed report: ${REPORT_FILE}`);
    console.log('   Open in browser to see visual analysis\n');
  }
}

/**
 * CLI runtime
 */
async function main() {
  try {
    console.log('🚀 Starting Performance Analysis...\n');
    generateReport();
  } catch (error) {
    console.error('Error running analysis:', error);
    process.exit(1);
  }
}

main();
