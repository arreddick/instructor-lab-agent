#!/usr/bin/env node
/**
 * Ashley's IT Lab Agent - Structural Test Runner
 * ================================================
 * Validates generated HTML files against design system rules.
 * Fast - no API calls. Runs automatically after every generate.js build.
 *
 * Usage:
 *   node scripts/test.js [filepath]                    Test one file
 *   node scripts/test.js --all                         Test all UD files
 *   node scripts/test.js --all secplus                 Test all UD files for one course
 *   node scripts/test.js --type hot [filepath]         Force a specific deliverable type
 *
 * Exit codes:
 *   0 = all tests passed
 *   1 = one or more tests failed
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const CLASSES_DIR = path.join(ROOT, 'classes');
const RESULTS_DIR = path.join(ROOT, 'workflows', 'test-results');

fs.mkdirSync(RESULTS_DIR, { recursive: true });

// ── Detect deliverable type from filename ─────────────────────────────────
function detectType(filename) {
  const f = filename.toLowerCase();
  if (f.includes('mind_map') || f.includes('mindmap'))  return 'mind-map';
  if (f.includes('study_guide') || f.includes('studyguide')) return 'study-guide';
  if (f.includes('_hot_') || f.includes('hands_on'))    return 'hot';
  if (f.includes('_lab_') || f.includes('labpacket'))   return 'lab';
  if (f.includes('rubric'))                              return 'rubric';
  return 'unknown';
}

// ── Test definitions ───────────────────────────────────────────────────────
// Each test: { name, required, fn(html) => true|false|string }
// Returns true = pass, false = fail, string = fail with message

const TESTS_ALL = [
  {
    name: 'Valid HTML structure',
    fn: html => html.includes('<!DOCTYPE') && html.includes('<html') && html.includes('</html>'),
  },
  {
    name: 'Has <head> and <body>',
    fn: html => html.includes('<head') && html.includes('<body'),
  },
  {
    name: 'No em dashes',
    fn: html => {
      const found = (html.match(/\u2014/g) || []).length; // Unicode em dash character
      return found === 0 || `Found ${found} em dash(es). Replace with colon, semicolon, comma, or period.`;
    }
  },
  {
    name: 'Has primary color (#c8102e or #c41230)',
    fn: html => html.includes('#c8102e') || html.includes('#c41230') || html.includes('c8102e') || html.includes('c41230'),
  },
  {
    name: 'Has .course-badge element',
    fn: html => html.includes('course-badge'),
  },
  {
    name: 'Has header h1',
    fn: html => html.includes('<h1'),
  },
  {
    name: 'Has .subtitle in header',
    fn: html => html.includes('subtitle'),
  },
  {
    name: 'Has phase navigation (.phase-nav)',
    fn: html => html.includes('phase-nav'),
  },
  {
    name: 'Has at least one active phase (.phase.active or .phase active)',
    fn: html => html.includes('phase active') || html.includes('"phase active"') || html.includes("class=\"phase active\""),
  },
  {
    name: 'Has printAnswersOnly() function',
    fn: html => html.includes('printAnswersOnly'),
  },
  {
    name: 'Has print button',
    fn: html => html.includes('print-btn') || html.includes('printAnswersOnly()'),
  },
  {
    name: 'No placeholder text ({{, }}, TODO, PLACEHOLDER)',
    fn: html => {
      const placeholders = ['{{', '}}', '[TODO]', '[PLACEHOLDER]', 'INSERT HERE'];
      const found = placeholders.filter(p => html.includes(p));
      return found.length === 0 || `Unresolved placeholders: ${found.join(', ')}`;
    }
  },
  {
    name: 'File is not truncated (ends with </html>)',
    fn: html => html.trimEnd().endsWith('</html>'),
  },
  {
    name: 'Has at least 10KB of content (not a stub)',
    fn: html => html.length >= 10240 || `File is only ${(html.length/1024).toFixed(1)}KB -- may be incomplete`,
  },
];

const TESTS_HOT = [
  {
    name: 'HOT: Has countdown timer (.timer)',
    fn: html => html.includes('class="timer"') || html.includes("class='timer'"),
  },
  {
    name: 'HOT: Has startTimer() function',
    fn: html => html.includes('startTimer'),
  },
  {
    name: 'HOT: Has ssLoadFile function',
    fn: html => html.includes('ssLoadFile'),
  },
  {
    name: 'HOT: Has ss-paste-receptor pattern',
    fn: html => html.includes('ss-paste-receptor'),
  },
  {
    name: 'HOT: Has screenshot boxes',
    fn: html => {
      const count = (html.match(/class="screenshot-box"/g) || []).length;
      return count >= 3 || `Only ${count} screenshot box(es) found -- HOTs need at least 3`;
    }
  },
  {
    name: 'HOT: Screenshot boxes are NOT nested inside .step (direct .phase children)',
    fn: html => {
      // Look for the bad pattern: <div class="step">...<div class="screenshot-box">
      // Simple heuristic: screenshot-box should not appear between step and /step
      const stepBlocks = html.match(/<div[^>]*class="[^"]*step[^"]*"[^>]*>[\s\S]*?<\/div>/g) || [];
      const bad = stepBlocks.filter(b => b.includes('screenshot-box'));
      return bad.length === 0 || `${bad.length} screenshot box(es) found nested inside .step -- must be direct .phase children`;
    }
  },
  {
    name: 'HOT: Has draggable Help Me panel (.help-panel)',
    fn: html => html.includes('help-panel'),
  },
  {
    name: 'HOT: Has reflection rubric or score calculator',
    fn: html => html.includes('score') && (html.includes('rubric') || html.includes('Reflection') || html.includes('criteria')),
  },
  {
    name: 'HOT: Has grading scale (A: 90)',
    fn: html => html.includes('90') && (html.includes('grade') || html.includes('Grade') || html.includes('grading')),
  },
  {
    name: 'HOT: Has ss-missing-placeholder for print grading',
    fn: html => html.includes('ss-missing') || html.includes('MISSING SCREENSHOT'),
  },
];

const TESTS_STUDY_GUIDE = [
  {
    name: 'Study Guide: Has at least 4 phases',
    fn: html => {
      const count = (html.match(/showPhase\(/g) || []).length;
      return count >= 4 || `Only ${count} phase call(s) found -- study guides need at least 4 phases`;
    }
  },
  {
    name: 'Study Guide: Has PBQ (Performance Based Question)',
    fn: html => html.toLowerCase().includes('pbq') || html.includes('Performance-Based') || html.includes('performance-based'),
  },
  {
    name: 'Study Guide: Has Deep Dive section',
    fn: html => html.includes('Deep Dive') || html.includes('deep-dive') || html.includes('deepdive'),
  },
  {
    name: 'Study Guide: Has key terms section',
    fn: html => html.toLowerCase().includes('key term') || html.toLowerCase().includes('glossary'),
  },
  {
    name: 'Study Guide: Has exam tip callout (green)',
    fn: html => html.toLowerCase().includes('exam tip') || html.toLowerCase().includes('exam-tip'),
  },
  {
    name: 'Study Guide: Has exam trap or caution callout (yellow)',
    fn: html => html.toLowerCase().includes('exam trap') || html.toLowerCase().includes('trap') || html.toLowerCase().includes('caution'),
  },
  {
    name: 'Study Guide: Not condensed (at least 50KB)',
    fn: html => html.length >= 51200 || `Study guide is ${(html.length/1024).toFixed(1)}KB -- may be condensed. Full guides are typically 80-200KB`,
  },
];

const TESTS_LAB = [
  {
    name: 'Lab: Has screenshot boxes',
    fn: html => html.includes('screenshot-box'),
  },
  {
    name: 'Lab: Has ssLoadFile function',
    fn: html => html.includes('ssLoadFile'),
  },
  {
    name: 'Lab: Has at least 3 phases',
    fn: html => {
      const count = (html.match(/showPhase\(/g) || []).length;
      return count >= 3 || `Only ${count} phase call(s) -- labs need at least 3 phases`;
    }
  },
  {
    name: 'Lab: Has step elements',
    fn: html => html.includes('class="step"') || html.includes("class='step'"),
  },
  {
    name: 'Lab: All lab-content divs inside .container (padding/width check)',
    fn: html => {
      const containerOpen = html.indexOf('class="container"');
      const containerClose = html.lastIndexOf('<!-- end container -->');
      if (containerOpen === -1 || containerClose === -1) return 'Missing .container div or end-container comment';
      const labMatches = [...html.matchAll(/class="lab-content[^"]*"/g)];
      const outside = labMatches.filter(m => m.index < containerOpen || m.index > containerClose);
      return outside.length === 0 || `${outside.length} lab-content div(s) are outside the .container -- causes padding/width to break on those labs`;
    }
  },
];

const TESTS_MIND_MAP = [
  {
    name: 'Mind Map: Has SVG element',
    fn: html => html.includes('<svg') || html.includes('svg'),
  },
  {
    name: 'Mind Map: Has cubic-bezier animation',
    fn: html => html.includes('cubic-bezier'),
  },
  {
    name: 'Mind Map: Has expandable nodes (click handler)',
    fn: html => html.includes('onclick') || html.includes('addEventListener'),
  },
  {
    name: 'Mind Map: Has detail panel',
    fn: html => html.includes('detail') || html.includes('panel'),
  },
  {
    name: 'Mind Map: Root node uses primary color #c41230',
    fn: html => html.includes('#c41230'),
  },
];

// ── Run tests for a file ───────────────────────────────────────────────────
function runTests(filePath, forcedType) {
  const filename = path.basename(filePath);
  const type     = forcedType || detectType(filename);
  const html     = fs.readFileSync(filePath, 'utf8');

  const results = [];

  // Universal tests
  for (const test of TESTS_ALL) {
    const result = test.fn(html);
    results.push({
      name: test.name,
      passed: result === true,
      message: typeof result === 'string' ? result : null
    });
  }

  // Type-specific tests
  const typeTests = {
    'hot':         TESTS_HOT,
    'study-guide': TESTS_STUDY_GUIDE,
    'lab':         TESTS_LAB,
    'mind-map':    TESTS_MIND_MAP,
  }[type] || [];

  for (const test of typeTests) {
    const result = test.fn(html);
    results.push({
      name: test.name,
      passed: result === true,
      message: typeof result === 'string' ? result : null
    });
  }

  return { filename, type, filePath, results };
}

// ── Format and print results ───────────────────────────────────────────────
function printReport(report, verbose = true) {
  const passed = report.results.filter(r => r.passed).length;
  const failed = report.results.filter(r => !r.passed).length;
  const total  = report.results.length;
  const pct    = Math.round((passed / total) * 100);

  const statusIcon = failed === 0 ? '✅' : (failed <= 2 ? '⚠️' : '❌');

  console.log(`\n${statusIcon}  ${report.filename}`);
  console.log(`   Type: ${report.type} | ${passed}/${total} tests passed (${pct}%)`);

  if (failed > 0) {
    console.log('\n   FAILED:');
    report.results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   ❌ ${r.name}`);
        if (r.message) console.log(`      → ${r.message}`);
      });
  }

  if (verbose && failed === 0) {
    console.log('   All checks passed.');
  }

  return { passed, failed, total };
}

// ── Save JSON result ───────────────────────────────────────────────────────
function saveResult(report) {
  const ts   = new Date().toISOString().replace(/[:.]/g, '-');
  const name = path.basename(report.filename, '.html') + `_test_${ts}.json`;
  const out  = path.join(RESULTS_DIR, name);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
}

// ── Find all UnderDevelopment files ───────────────────────────────────────
function findUDFiles(courseFilter) {
  const files = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(entry => {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.html') && dir.includes('UnderDevelopment')) {
        if (!courseFilter || full.toLowerCase().includes(courseFilter.toLowerCase())) {
          files.push(full);
        }
      }
    });
  }

  walk(CLASSES_DIR);
  return files;
}

// ── CLI ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (!args.length) {
  console.log(`
Usage:
  node scripts/test.js [filepath]               Test a specific file
  node scripts/test.js --all                    Test all UnderDevelopment files
  node scripts/test.js --all secplus            Test all SecurityPlus UD files
  node scripts/test.js --type hot [filepath]    Force deliverable type detection
`);
  process.exit(0);
}

let totalPassed = 0;
let totalFailed = 0;
let fileCount   = 0;

if (args[0] === '--all') {
  const courseFilter = args[1] || null;
  const files = findUDFiles(courseFilter);

  if (!files.length) {
    console.log('No UnderDevelopment HTML files found.');
    process.exit(0);
  }

  console.log(`\nTesting ${files.length} file(s)${courseFilter ? ` for ${courseFilter}` : ''}...\n`);
  console.log('='.repeat(60));

  for (const f of files) {
    const report = runTests(f);
    saveResult(report);
    const { passed, failed, total } = printReport(report);
    totalPassed += passed;
    totalFailed += failed;
    fileCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\nSUMMARY: ${fileCount} file(s) tested`);
  console.log(`  Passed: ${totalPassed} checks`);
  console.log(`  Failed: ${totalFailed} checks`);
  if (totalFailed === 0) {
    console.log('\n✅ All files passed structural validation.');
  } else {
    console.log('\n⚠️  Fix the issues above before marking files as final.');
  }

  process.exit(totalFailed > 0 ? 1 : 0);

} else {
  const forceTypeIdx = args.indexOf('--type');
  const forcedType   = forceTypeIdx >= 0 ? args[forceTypeIdx + 1] : null;
  const filePath     = args.find((a, i) => a !== '--type' && (forceTypeIdx < 0 || i !== forceTypeIdx + 1));

  if (!filePath || !fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    process.exit(1);
  }

  const report = runTests(filePath, forcedType);
  saveResult(report);
  const { failed } = printReport(report, true);
  process.exit(failed > 0 ? 1 : 0);
}
