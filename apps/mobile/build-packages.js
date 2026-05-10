#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Setting up monorepo packages...');

const nodeModulesPath = path.resolve(__dirname, 'node_modules');
const vybeDir = path.join(nodeModulesPath, '@vybeon');

// Create @vybeon directory in node_modules if it doesn't exist
if (!fs.existsSync(vybeDir)) {
  fs.mkdirSync(vybeDir, { recursive: true });
  console.log(`✅ Created ${vybeDir}`);
}

const packages = {
  types: path.resolve(__dirname, '../../packages/types'),
  ui: path.resolve(__dirname, '../../packages/ui')
};

// For each package, ensure it's built and symlinked/copied into node_modules
Object.entries(packages).forEach(([name, pkgPath]) => {
  const nodeModulesPkg = path.join(vybeDir, name);
  const distPath = path.join(pkgPath, 'dist');
  const pkgJsonPath = path.join(pkgPath, 'package.json');
  
  console.log(`\n📦 Setting up @vybeon/${name}...`);
  
  // Build the package if needed
  if (!fs.existsSync(distPath)) {
    console.log(`Building ${name}...`);
    try {
      execSync('npm install', { cwd: pkgPath, stdio: 'inherit' });
      execSync('npm run build', { cwd: pkgPath, stdio: 'inherit' });
    } catch (error) {
      console.error(`Failed to build ${name}:`, error.message);
      process.exit(1);
    }
  }
  
  // Remove old node_modules entry if it exists
  if (fs.existsSync(nodeModulesPkg)) {
    fs.rmSync(nodeModulesPkg, { recursive: true, force: true });
  }
  
  // Create directory structure in node_modules
  fs.mkdirSync(nodeModulesPkg, { recursive: true });
  
  // Copy dist files
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    files.forEach(file => {
      const src = path.join(distPath, file);
      const dest = path.join(nodeModulesPkg, file);
      if (fs.statSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    });
    console.log(`✅ Copied dist files to node_modules/@vybeon/${name}`);
  }
  
  // Copy or create package.json in node_modules
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    // Set main to point to dist
    pkgJson.main = pkgJson.main || 'index.js';
    fs.writeFileSync(
      path.join(nodeModulesPkg, 'package.json'),
      JSON.stringify(pkgJson, null, 2)
    );
    console.log(`✅ Created package.json in node_modules/@vybeon/${name}`);
  }
});

console.log('\n✅ All packages configured successfully');

