#!/usr/bin/env node
/**
 * Creates the full folder structure for a new class.
 * Usage: node scripts/new-class.js "ClassName"
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const className = process.argv[2];

if (!className) {
  console.log('Usage: node scripts/new-class.js "ClassName"');
  process.exit(1);
}

const safeName = className.replace(/[<>:"/\\|?*]/g, '').trim();
if (!safeName) { console.log('Invalid class name.'); process.exit(1); }

const DELIVERABLES = ['StudyGuides','MindMaps','LabPackets','HandsOnTests'];
const INSTRUCTOR   = ['GradingRubricsForHOTs','GradingRubricsForLabs','TSGuidesForHOTs','TSGuidesForLabs','AnswerSheetsForHOTs','AnswerSheetsForLabs','Module Outlines'];
const STATES       = ['UnderDevelopment','Final'];

const folders = [
  `classes/${safeName}/TextBookFiles`,
  `classes/${safeName}/TestBankFiles`,
];

DELIVERABLES.forEach(d => {
  STATES.forEach(s => folders.push(`classes/${safeName}/output/${d}/${s}`));
});

INSTRUCTOR.forEach(i => {
  STATES.forEach(s => folders.push(`classes/${safeName}/output/InstructorOnly/${i}/${s}`));
});

console.log(`\nCreating folder structure for: ${safeName}`);
console.log('='.repeat(50));

folders.forEach(folder => {
  const fullPath = path.join(ROOT, folder);
  if (fs.existsSync(fullPath)) {
    console.log(`  Already exists: ${folder}`);
  } else {
    fs.mkdirSync(fullPath, { recursive: true });
    fs.writeFileSync(path.join(fullPath, '.keep'), '');
    console.log(`  Created: ${folder}`);
  }
});

console.log('='.repeat(50));
console.log(`\nDone. "${safeName}" is ready.`);
console.log(`\nNext steps:`);
console.log(`  1. Drag textbook files into: classes/${safeName}/TextBookFiles/`);
console.log(`  2. Drag test bank files into: classes/${safeName}/TestBankFiles/`);
console.log(`  3. Run: node scripts/convert-refs.js`);
console.log(`  4. Type "build" in Claude and select your new class\n`);
