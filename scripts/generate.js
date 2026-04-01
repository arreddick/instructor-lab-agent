#!/usr/bin/env node
/**
 * Ashley's IT Lab - Automated Generator
 * ======================================
 * Run: node scripts/generate.js
 *
 * Processes every pending task in workflows/queue.json automatically.
 * No intervention needed. Saves progress after every task.
 * If one task fails it logs it and moves to the next.
 *
 * Commands:
 *   node scripts/generate.js                        Process all pending tasks
 *   node scripts/generate.js --status               Show queue status only
 *   node scripts/generate.js --course secplus        Only tasks for one course
 *   node scripts/generate.js --retry                Retry failed tasks
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const cp    = require('child_process');
const sessionLog = require('./session-log');

// ── Paths ───────────────────────────────────────────────────────────────────
const ROOT        = path.resolve(__dirname, '..');
const QUEUE_FILE  = path.join(ROOT, 'workflows', 'queue.json');
const LOG_FILE    = path.join(ROOT, 'workflows', 'run.log');
const COURSES_DIR = path.join(ROOT, 'courses');
const PROMPTS_DIR = path.join(ROOT, 'prompts');
const DESIGN_FILE = path.join(ROOT, 'design-system', 'canonical.css');

// ── Config ──────────────────────────────────────────────────────────────────
const MODEL      = 'claude-opus-4-6';
const MAX_TOKENS = 24000; // HTML deliverables need 16k-32k tokens; 8k causes truncation
const DELAY_MS   = 3000; // pause between API calls to avoid rate limits

// ── Args ────────────────────────────────────────────────────────────────────
const args          = process.argv.slice(2);
const STATUS_ONLY   = args.includes('--status');
const RETRY_ONLY    = args.includes('--retry');
const COURSE_FILTER = (() => { const i = args.indexOf('--course'); return i >= 0 ? args[i+1] : null; })();

// ── Course code to classes folder name map ───────────────────────────────────
const CLASS_FOLDER = {
  'secplus':  'SecurityPlus',
  'az900':    'AZ-900',
  'az104':    'AZ-104',
  'vmware':   'VMware',
  'inf2014':  'SecurityPlus',
  'inf2016':  'AZ-900',
  'linux':    'Linux',
  'server':   'Server',
  'os':       'OperatingSystems'
};

// ── Deliverable type to output subfolder map ─────────────────────────────────
const OUTPUT_SUBFOLDERS = {
  'study-guide': 'StudyGuides',
  'mind-map':    'MindMaps',
  'hot':         'HandsOnTests',
  'lab':         'LabPackets',
  'rubric-hot':       path.join('InstructorOnly', 'GradingRubricsForHOTs'),
  'rubric-lab':       path.join('InstructorOnly', 'GradingRubricsForLabs'),
  'answer-sheet-hot': path.join('InstructorOnly', 'AnswerSheetsForHOTs'),
  'answer-sheet-lab': path.join('InstructorOnly', 'AnswerSheetsForLabs'),
  'ts-hot':           path.join('InstructorOnly', 'TSGuidesForHOTs'),
  'ts-lab':           path.join('InstructorOnly', 'TSGuidesForLabs'),
  'outline':          path.join('InstructorOnly', 'Module Outlines'),
  'syllabus':         ''
};

// ── Logging ─────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// ── Queue ────────────────────────────────────────────────────────────────────
function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    log('ERROR: workflows/queue.json not found.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue(q) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
}

// ── Status display ───────────────────────────────────────────────────────────
function printStatus(queue) {
  const tasks   = queue.tasks;
  const done    = tasks.filter(t => t.status === 'done').length;
  const failed  = tasks.filter(t => t.status === 'failed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  console.log('\n' + '='.repeat(58));
  console.log('  ASHLEY\'S IT LAB - GENERATOR STATUS');
  console.log('='.repeat(58));
  console.log(`  Total: ${tasks.length}  |  Done: ${done} ✅  |  Pending: ${pending} 🔲  |  Failed: ${failed} ❌`);
  console.log('='.repeat(58));

  const pending_tasks = tasks.filter(t => t.status === 'pending');
  if (pending_tasks.length) {
    console.log('\n  PENDING:');
    pending_tasks.forEach(t => console.log(`    🔲 [${t.course}] ${t.type}: ${t.topic}`));
  }
  const failed_tasks = tasks.filter(t => t.status === 'failed');
  if (failed_tasks.length) {
    console.log('\n  FAILED:');
    failed_tasks.forEach(t => console.log(`    ❌ [${t.course}] ${t.type}: ${t.topic}  (${t.error || ''})`));
  }
  console.log('');
}

// ── Load reference material for a task ──────────────────────────────────────
function loadRefs(task) {
  const parts = [];
  const classFolder = CLASS_FOLDER[task.course] || task.course;
  const classPath   = path.join(ROOT, 'classes', classFolder);

  // 1. Course JSON
  const courseFile = path.join(COURSES_DIR, `${task.course}.json`);
  if (fs.existsSync(courseFile)) {
    parts.push('## COURSE CONFIG\n' + fs.readFileSync(courseFile, 'utf8'));
  }

  // 2. Prompt instructions for this deliverable type
  const promptFile = path.join(PROMPTS_DIR, `${task.type}.md`);
  if (fs.existsSync(promptFile)) {
    parts.push('## DELIVERABLE INSTRUCTIONS\n' + fs.readFileSync(promptFile, 'utf8'));
  }

  // 3. Canonical design system CSS
  if (fs.existsSync(DESIGN_FILE)) {
    parts.push('## DESIGN SYSTEM CSS (use this exactly)\n' + fs.readFileSync(DESIGN_FILE, 'utf8'));
  }

  // 4. Textbook and test bank content from classes/ folder
  const moduleMatch = task.topic.match(/module[_\s]?(\d+)/i);
  if (moduleMatch) {
    const modNum    = moduleMatch[1];
    const modNumPad = modNum.padStart(2, '0');

    // Textbook: classes/[CLASS]/TextBookFiles/Module_N.docx.txt
    const tbPaths = [
      path.join(classPath, 'TextBookFiles', `Module_${modNum}.docx.txt`),
      path.join(classPath, 'TextBookFiles', `Module_0${modNum}.docx.txt`),
      path.join(classPath, 'TextBookFiles', `Module ${modNum}.docx.txt`),
    ];
    for (const p of tbPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        parts.push(`## TEXTBOOK - MODULE ${modNum}\n${content.slice(0, 10000)}`);
        log(`  Found textbook: ${path.relative(ROOT, p)}`);
        break;
      }
    }

    // Test bank: classes/[CLASS]/TestBankFiles/Mod_NN_*.docx.txt
    if (task.type === 'hot' || task.type === 'study-guide') {
      const testBankDir = path.join(classPath, 'TestBankFiles');
      if (fs.existsSync(testBankDir)) {
        const files = fs.readdirSync(testBankDir).filter(f =>
          f.endsWith('.docx.txt') &&
          (f.includes(`Mod_${modNumPad}`) || f.includes(`Module_${modNum}`))
        );
        if (files.length) {
          const content = fs.readFileSync(path.join(testBankDir, files[0]), 'utf8');
          parts.push(`## TEST BANK - MODULE ${modNum}\n${content.slice(0, 6000)}`);
          log(`  Found test bank: ${files[0]}`);
        }
      }
    }
  }

  if (parts.length < 3) {
    log(`  WARNING: Limited reference material found for ${task.course}/${task.topic}`);
  }

  return parts.join('\n\n---\n\n');
}

// ── Build output path ────────────────────────────────────────────────────────
function buildOutputPath(task) {
  const classFolder = CLASS_FOLDER[task.course] || task.course;
  const subFolder   = OUTPUT_SUBFOLDERS[task.type] || 'output';
  const folder = path.join(ROOT, 'classes', classFolder, 'output', subFolder, 'UnderDevelopment');
  fs.mkdirSync(folder, { recursive: true });
  const safeTopic = task.topic.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const ext       = (task.type === 'syllabus') ? 'docx' : 'html';
  const filename  = `${classFolder}_${task.type.replace('-','_')}_${safeTopic}.${ext}`;
  return path.join(folder, filename);
}

// ── Claude API call ──────────────────────────────────────────────────────────
function callClaude(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return reject(new Error('ANTHROPIC_API_KEY environment variable not set. See SETUP.md.'));
    }

    const body = JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = (parsed.content || []).map(c => c.text || '').join('');
          resolve(text);
        } catch(e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Run browser tests on a generated file ────────────────────────────────
function runBrowserTest(filePath) {
  try {
    const result = cp.execSync(
      `node "${path.join(ROOT, 'scripts', 'browser-test.js')}" "${filePath}"`,
      { encoding: 'utf8', cwd: ROOT, timeout: 60000 }
    );
    log(result.trim().split('\n').map(l => '  ' + l).join('\n'));
    return true;
  } catch(e) {
    const output = (e.stdout || '') + (e.stderr || '');
    log(output.trim().split('\n').map(l => '  ' + l).join('\n'));
    log('  ⚠️  Browser tests found issues. Run qa.js for full AI review.');
    return false;
  }
}

// ── Run structural tests on a generated file ─────────────────────────────
function runStructuralTest(filePath) {
  try {
    const { execSync } = require('child_process');
    const result = execSync(
      `node "${path.join(ROOT, 'scripts', 'test.js')}" "${filePath}"`,
      { encoding: 'utf8', cwd: ROOT }
    );
    log(result.trim().split('\n').map(l => '  ' + l).join('\n'));
    return true;
  } catch(e) {
    // test.js exits with code 1 on failures but still prints the report
    const output = (e.stdout || '') + (e.stderr || '');
    log(output.trim().split('\n').map(l => '  ' + l).join('\n'));
    log('  ⚠️  Structural tests found issues. Review before marking final.');
    return false;
  }
}

// ── Build system prompt ──────────────────────────────────────────────────
function buildSystemPrompt(refs) {
  return `You are an AI curriculum generator for educators.

CRITICAL OUTPUT RULES - NEVER VIOLATE:
1. Output ONLY the complete HTML file. No explanation, no markdown code fences, nothing else.
2. Start immediately with <!DOCTYPE html> and end with </html>.
3. The file must be 100% complete and fully functional. Never truncate.
4. Never use em dashes anywhere. Use colons, semicolons, commas, or periods instead.
5. Screenshot boxes must be DIRECT children of .phase - never nested inside .step.
6. Always use the canonical ssLoadFile/ss-paste-receptor pattern for screenshot boxes.
7. Always use the canonical 3-line printAnswersOnly() function exactly as shown in the design system.
8. Follow the design system colors, layout, and component patterns exactly.

DESIGN SYSTEM SUMMARY:
- Primary color: #c8102e (default, configurable), #c41230 (mind map root node only)
- Background: radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a14 60%, #000 100%)
- Font: 'Segoe UI', system-ui, sans-serif
- Cards: rgba(255,255,255,0.05) with backdrop-filter:blur(10px)
- Header always includes .course-badge > h1 > .subtitle structure

REFERENCE MATERIAL FOR THIS TASK:
${refs}`;
}

// ── Process one task ─────────────────────────────────────────────────────────
async function processTask(task) {
  const refs       = loadRefs(task);
  const systemPmt  = buildSystemPrompt(refs);
  const outputPath = buildOutputPath(task);

  const userPrompt =
`Generate a complete, production-ready ${task.type} HTML file for ${task.course.toUpperCase()}.
Topic: "${task.topic}"
Special instructions: ${task.notes || 'Follow all system prompt rules exactly.'}

Begin immediately with <!DOCTYPE html>. Output the full file with no truncation.`;

  const html = await callClaude(systemPmt, userPrompt);

  if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
    throw new Error('Response is not valid HTML - may have been truncated or errored');
  }

  fs.writeFileSync(outputPath, html);
  log(`Saved: ${path.relative(ROOT, outputPath)} (${(html.length/1024).toFixed(1)} KB)`);
  return outputPath;
}

// ── Delay ────────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('=== Ashley\'s IT Lab Generator Started ===');

  const queue = loadQueue();

  if (STATUS_ONLY) { printStatus(queue); return; }

  // Select tasks to run
  const tasks = queue.tasks.filter(t => {
    if (RETRY_ONLY)    return t.status === 'failed';
    if (COURSE_FILTER) return t.status === 'pending' && t.course === COURSE_FILTER;
    return t.status === 'pending';
  });

  if (!tasks.length) {
    log('No pending tasks found.');
    printStatus(queue);
    return;
  }

  log(`Found ${tasks.length} task(s) to process.`);

  for (let i = 0; i < tasks.length; i++) {
    const task  = tasks[i];
    const qTask = queue.tasks.find(t => t.id === task.id);

    log(`[${i+1}/${tasks.length}] ${task.course} / ${task.type} / ${task.topic}`);
    sessionLog.start('generate', { course: task.course, type: task.type, topic: task.topic });

    try {
      const file = await processTask(task);
      qTask.status      = 'done';
      qTask.file        = file;
      qTask.completedAt = new Date().toISOString();
      log(`✅ Done: ${task.id}`);

      const fileSize = (fs.statSync(file).size / 1024).toFixed(1) + 'KB';
      sessionLog.success('generate', { file: path.relative(ROOT, file), size: fileSize });

      // Auto-run structural tests immediately after generation
      log(`   Running structural tests...`);
      sessionLog.start('test', { file: path.relative(ROOT, file) });
      const testsPassed = runStructuralTest(file);
      qTask.testsPassed = testsPassed;
      if (testsPassed) {
        sessionLog.success('test', { file: path.relative(ROOT, file) });
      } else {
        sessionLog.fail('test', { file: path.relative(ROOT, file), error: 'Structural tests found issues' });
      }

      // Auto-run browser tests
      log(`   Running browser tests...`);
      sessionLog.start('browser-test', { file: path.relative(ROOT, file) });
      const browserPassed = runBrowserTest(file);
      qTask.browserTestsPassed = browserPassed;
      if (browserPassed) {
        sessionLog.success('browser-test', { file: path.relative(ROOT, file) });
      } else {
        sessionLog.fail('browser-test', { file: path.relative(ROOT, file), error: 'Browser tests found issues' });
      }

      if (!testsPassed || !browserPassed) {
        log(`   Run "node scripts/qa.js ${file}" for a full AI quality review.`);
      }
    } catch (err) {
      qTask.status   = 'failed';
      qTask.error    = err.message;
      qTask.failedAt = new Date().toISOString();
      log(`❌ Failed: ${task.id} - ${err.message}`);
      sessionLog.fail('generate', { error: err.message });
    }

    // Save after every single task so progress is never lost
    saveQueue(queue);

    if (i < tasks.length - 1) {
      log(`Waiting ${DELAY_MS/1000}s...`);
      await delay(DELAY_MS);
    }
  }

  log('=== Generator finished ===');
  printStatus(queue);
}

main().catch(err => { log('FATAL: ' + err.message); process.exit(1); });
