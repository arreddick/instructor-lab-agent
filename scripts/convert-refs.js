#!/usr/bin/env node
/**
 * Converts .docx files in classes/[CLASS]/TextBookFiles and
 * classes/[CLASS]/TestBankFiles to plain .txt files that
 * generate.js can read as reference material.
 *
 * Run once after adding new files, or any time you update content.
 * Usage: node scripts/convert-refs.js
 */

const fs   = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

async function ensureMammoth() {
  try { return require('mammoth'); }
  catch(e) {
    console.log('Installing mammoth (one-time)...');
    require('child_process').execSync('npm install mammoth', { stdio: 'inherit', cwd: ROOT });
    return require('mammoth');
  }
}

async function convertFolder(mammoth, srcDir, label) {
  if (!fs.existsSync(srcDir)) return;

  let converted = 0;
  let skipped   = 0;

  function walk(dir) {
    fs.readdirSync(dir).forEach(name => {
      const fullPath = path.join(dir, name);
      if (fs.statSync(fullPath).isDirectory()) { walk(fullPath); return; }
      if (!name.endsWith('.docx')) return;

      const outPath = fullPath + '.txt';

      if (fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs > fs.statSync(fullPath).mtimeMs) {
        skipped++;
        return;
      }

      mammoth.extractRawText({ path: fullPath })
        .then(result => {
          fs.writeFileSync(outPath, result.value);
          console.log(`  ✅ ${path.relative(ROOT, outPath)}`);
          converted++;
        })
        .catch(err => console.log(`  ❌ ${name}: ${err.message}`));
    });
  }

  walk(srcDir);
  setTimeout(() => {
    console.log(`  ${label}: ${converted} converted, ${skipped} already up to date.\n`);
  }, 2000);
}

async function main() {
  const mammoth = await ensureMammoth();
  const classesDir = path.join(ROOT, 'classes');

  if (!fs.existsSync(classesDir)) {
    console.log('No classes/ folder found.');
    return;
  }

  // Walk every class folder
  fs.readdirSync(classesDir).forEach(async className => {
    const classPath = path.join(classesDir, className);
    if (!fs.statSync(classPath).isDirectory()) return;

    const tbPath    = path.join(classPath, 'TextBookFiles');
    const bankPath  = path.join(classPath, 'TestBankFiles');

    if (fs.existsSync(tbPath)) {
      console.log(`\n=== ${className} - TextBookFiles ===`);
      await convertFolder(mammoth, tbPath, 'TextBookFiles');
    }
    if (fs.existsSync(bankPath)) {
      console.log(`=== ${className} - TestBankFiles ===`);
      await convertFolder(mammoth, bankPath, 'TestBankFiles');
    }
  });

  console.log('\nDone. The generator will now use your textbook and test bank content automatically.');
}

main().catch(console.error);
