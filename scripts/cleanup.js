#!/usr/bin/env node

/**
 * Cleanup Script for HireMe.ai
 * 
 * This script removes unnecessary files and directories
 * that were used during development but are not needed in production.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// Files to delete
const filesToDelete = [
  // Temporary check files (Tailwind/styling verification scripts)
  /^check_.*\.cjs$/,
];

// Directories to delete  
const dirsToDelete = [
  // Supabase-related (deprecated in favor of Firebase)
  'supabase',
];

console.log('🧹 HireMe.ai Cleanup Script\n');

// Delete files
console.log('Deleting temporary files...');
const files = fs.readdirSync(projectRoot);

let deletedCount = 0;

for (const file of files) {
  const filePath = path.join(projectRoot, file);
  const stat = fs.statSync(filePath);

  if (stat.isFile()) {
    for (const pattern of filesToDelete) {
      if (pattern.test(file)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`  ✓ Deleted: ${file}`);
          deletedCount++;
        } catch (error) {
          console.error(`  ✗ Failed to delete ${file}:`, error.message);
        }
        break;
      }
    }
  }
}

// Delete directories
console.log('\nDeleting deprecated directories...');
for (const dir of dirsToDelete) {
  const dirPath = path.join(projectRoot, dir);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`  ✓ Deleted: ${dir}/`);
      deletedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to delete ${dir}/:`, error.message);
    }
  }
}

console.log(`\n✓ Cleanup complete! Removed ${deletedCount} items.`);
console.log('\nRemaining tasks:');
console.log('1. Update .env files with new configuration');
console.log('2. Deploy Cloud Functions: firebase deploy --only functions');
console.log('3. Deploy Firestore rules: firebase deploy --only firestore:rules');
console.log('4. Run: npm install (to update lock files)');
