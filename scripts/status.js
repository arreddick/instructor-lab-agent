#!/usr/bin/env node
/**
 * Ashley's IT Lab Agent - Course Status Checker
 * Run: node scripts/status.js [course-code]
 * Example: node scripts/status.js secplus
 */

const fs = require('fs');
const path = require('path');

const coursesDir = path.join(__dirname, '../courses');
const outputDir = path.join(__dirname, '../output');

const arg = process.argv[2];

function printStatus(courseFile) {
  const raw = fs.readFileSync(path.join(coursesDir, courseFile), 'utf8');
  const course = JSON.parse(raw);

  if (course._instructions) return; // skip _TEMPLATE.json

  console.log('\n' + '='.repeat(60));
  console.log(`  ${course.title}`);
  console.log(`  Code: ${course.code} | Days: ${course.syllabus_days || 80}`);
  console.log('='.repeat(60));

  if (course.modules) {
    console.log('\n  MODULE STATUS:');
    course.modules.forEach(mod => {
      if (mod.status) {
        const icons = Object.entries(mod.status)
          .map(([k, v]) => `${v ? '✅' : '🔲'} ${k}`)
          .join('  ');
        const allDone = Object.values(mod.status).every(v => v);
        const prefix = allDone ? '✅' : '🔲';
        console.log(`  ${prefix} Module ${mod.number}: ${mod.title}`);
        console.log(`       ${icons}`);
      } else {
        console.log(`  -- Module ${mod.number}: ${mod.title}`);
      }
    });
  }

  if (course.labs) {
    console.log('\n  LABS:');
    course.labs.forEach(lab => {
      const cost = lab.cost_warning ? ' ⚠️ COST' : '';
      console.log(`  Lab ${lab.number}: ${lab.title}${cost}`);
    });
  }

  if (course.hots) {
    console.log('\n  HOTs:');
    course.hots.forEach(hot => {
      console.log(`  HOT ${hot.number}: ${hot.title}`);
    });
  }
}

if (arg) {
  const file = `${arg}.json`;
  if (fs.existsSync(path.join(coursesDir, file))) {
    printStatus(file);
  } else {
    console.log(`Course "${arg}" not found. Available courses:`);
    fs.readdirSync(coursesDir)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .forEach(f => console.log('  ' + f.replace('.json', '')));
  }
} else {
  console.log('\nASHLEY\'S IT LAB - ALL COURSES\n');
  fs.readdirSync(coursesDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .forEach(printStatus);
}

console.log('\n');
