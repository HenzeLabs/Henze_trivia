#!/usr/bin/env node
/**
 * Production Readiness Test
 * Run this before deploying to verify everything works
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Production Readiness...\n');

let errors = 0;
let warnings = 0;

// Test 1: Check package.json scripts
console.log('✓ Checking package.json scripts...');
const pkg = require('./package.json');
if (!pkg.scripts.build) {
  console.error('  ❌ Missing "build" script');
  errors++;
} else {
  console.log('  ✓ Build script exists');
}
if (!pkg.scripts.start) {
  console.error('  ❌ Missing "start" script');
  errors++;
} else {
  console.log('  ✓ Start script exists');
}

// Test 2: Check critical dependencies
console.log('\n✓ Checking dependencies...');
const requiredDeps = ['next', 'react', 'socket.io', 'better-sqlite3'];
requiredDeps.forEach(dep => {
  if (!pkg.dependencies[dep]) {
    console.error(`  ❌ Missing dependency: ${dep}`);
    errors++;
  } else {
    console.log(`  ✓ ${dep} installed`);
  }
});

// Test 3: Check server.js exists
console.log('\n✓ Checking server files...');
if (!fs.existsSync(path.join(__dirname, 'server.js'))) {
  console.error('  ❌ server.js not found');
  errors++;
} else {
  console.log('  ✓ server.js exists');
}

// Test 4: Check database setup
console.log('\n✓ Checking database setup...');
if (!fs.existsSync(path.join(__dirname, 'database.js'))) {
  console.error('  ❌ database.js not found');
  errors++;
} else {
  console.log('  ✓ database.js exists');
}

if (!fs.existsSync(path.join(__dirname, 'seed-database-inline.js'))) {
  console.error('  ❌ seed-database-inline.js not found');
  errors++;
} else {
  console.log('  ✓ seed-database-inline.js exists');
}

// Test 5: Check Next.js app structure
console.log('\n✓ Checking Next.js structure...');
const appDir = path.join(__dirname, 'app');
if (!fs.existsSync(appDir)) {
  console.error('  ❌ app/ directory not found');
  errors++;
} else {
  console.log('  ✓ app/ directory exists');
  
  if (!fs.existsSync(path.join(appDir, 'page.tsx'))) {
    console.error('  ❌ app/page.tsx not found');
    errors++;
  } else {
    console.log('  ✓ app/page.tsx exists');
  }
  
  if (!fs.existsSync(path.join(appDir, 'tv', 'page.tsx'))) {
    console.error('  ❌ app/tv/page.tsx not found');
    errors++;
  } else {
    console.log('  ✓ app/tv/page.tsx exists');
  }
}

// Test 6: Check for .env (should NOT be in git)
console.log('\n✓ Checking environment...');
if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
  console.log('  ⚠️  .env file exists (make sure it\'s in .gitignore)');
  warnings++;
}

// Test 7: Check render.yaml
console.log('\n✓ Checking deployment config...');
if (!fs.existsSync(path.join(__dirname, '..', 'render.yaml'))) {
  console.log('  ⚠️  render.yaml not found (optional but recommended)');
  warnings++;
} else {
  console.log('  ✓ render.yaml exists');
}

// Test 8: Check server.js for production config
console.log('\n✓ Checking server configuration...');
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
if (!serverContent.includes('0.0.0.0')) {
  console.error('  ❌ Server not configured to bind to 0.0.0.0');
  errors++;
} else {
  console.log('  ✓ Server binds to 0.0.0.0 in production');
}

if (!serverContent.includes('/healthz')) {
  console.error('  ❌ Health check endpoint missing');
  errors++;
} else {
  console.log('  ✓ Health check endpoint exists');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('✅ All checks passed! Ready for deployment.');
  process.exit(0);
} else if (errors === 0) {
  console.log(`⚠️  ${warnings} warning(s) found, but ready for deployment.`);
  process.exit(0);
} else {
  console.log(`❌ ${errors} error(s) and ${warnings} warning(s) found.`);
  console.log('Fix errors before deploying.');
  process.exit(1);
}
