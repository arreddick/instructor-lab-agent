#!/usr/bin/env node
/**
 * Ashley's IT Lab Agent - AI Quality Reviewer
 * ============================================
 * Sends a generated deliverable back to Claude for autonomous content
 * quality review. Checks accuracy, completeness, exam alignment, and
 * classroom practicality. Outputs a structured QA report.
 *
 * Usage:
 *   node scripts/qa.js [filepath]
 *   node scripts/qa.js [filepath] --course secplus --module 8
 *   node scripts/qa.js --all secplus
 *   node scripts/qa.js --pending           Review all files with no QA report yet
 *
 * The QA report is saved to workflows/test-results/ as a .qa.json file.
 * A human-readable summary is printed to the terminal.
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT        = path.resolve(__dirname, '..');
const CLASSES_DIR = path.join(ROOT, 'classes');
const COURSES_DIR = path.join(ROOT, 'courses');
const RESULTS_DIR = path.join(ROOT, 'workflows', 'test-results');

fs.mkdirSync(RESULTS_DIR, { recursive: true });

const MODEL      = 'claude-opus-4-6';
const MAX_TOKENS = 2000; // QA reports are structured JSON -- don't need much
const DELAY_MS   = 4000;

// ── Detect type and course from filename ──────────────────────────────────
function detectMeta(filename) {
  const f    = filename.toLowerCase();
  let type   = 'unknown';
  let course = 'unknown';

  if (f.includes('mind_map') || f.includes('mindmap'))       type = 'mind-map';
  else if (f.includes('study_guide'))                         type = 'study-guide';
  else if (f.includes('_hot_'))                               type = 'hot';
  else if (f.includes('_lab_') || f.includes('labpacket'))   type = 'lab';

  if (f.includes('securityplus') || f.includes('secplus'))   course = 'secplus';
  else if (f.includes('az-900') || f.includes('az900'))      course = 'az900';
  else if (f.includes('az-104') || f.includes('az104'))      course = 'az104';
  else if (f.includes('vmware'))                              course = 'vmware';

  const modMatch = filename.match(/module[_\s]?(\d+)/i);
  const module   = modMatch ? parseInt(modMatch[1]) : null;

  return { type, course, module };
}

// ── Load course context for QA prompt ────────────────────────────────────
function loadCourseContext(course, moduleNum) {
  const courseFile = path.join(COURSES_DIR, `${course}.json`);
  if (!fs.existsSync(courseFile)) return '';

  const data = JSON.parse(fs.readFileSync(courseFile, 'utf8'));
  const mod  = moduleNum && data.modules ? data.modules.find(m => m.number === moduleNum) : null;

  let context = `Course: ${data.title}\n`;
  if (mod) {
    context += `Module ${mod.number}: ${mod.title}\n`;
    if (mod.topics) context += `Topics: ${mod.topics.join(', ')}\n`;
  }
  if (data.notes) context += `Special rules: ${data.notes}\n`;
  return context;
}

// ── Build QA system prompt ─────────────────────────────────────────────────
function buildQAPrompt(type, courseContext) {

  const typeRules = {
    'study-guide': `
- Does it cover all major topics for this module? List any that are missing.
- Are there at least 4 content phases?
- Does it have 2 PBQs (Performance-Based Questions) that are realistic and exam-style?
- Does it have Deep Dive scenarios with 3 follow-up questions each?
- Is there a Key Terms section?
- Are exam tips and exam trap callouts present?
- Is the content rich and detailed, not condensed or bullet-point-only?
- Are practice scenarios using different names/orgs than the actual test bank questions?`,

    'hot': `
- Is there a countdown timer?
- Are there at least 3 screenshot tasks?
- Are screenshot boxes direct children of .phase (not nested in .step)?
- Is there a draggable Help Me panel?
- Is there a reflection rubric with a live score calculator?
- Are the lab tasks practical and achievable in the classroom environment described?
- Does the Help Me panel scramble command hints (not give step-by-step answers)?
- Are the tasks aligned to the module's exam objectives?`,

    'lab': `
- Do the lab steps reference real tools and real commands for the topic?
- Are there screenshot requirements at key milestones?
- Is there a troubleshooting section?
- Do steps include expected output so students know if they succeeded?
- Are the tasks achievable in the classroom environment (Hyper-V, Kali, Metasploitable, Azure, VMware)?
- Are there info boxes explaining WHY each task matters, not just HOW?`,

    'mind-map': `
- Does it cover the main topic areas for this module?
- Are there 6-8 top-level branches?
- Does each branch have meaningful sub-nodes?
- Are the detail panels informative (not just repeating the node label)?
- Is the SVG canvas dark with primary color root node?`,
  };

  return `You are a curriculum quality reviewer for Instructor Lab Agent.

You will receive the HTML content of a generated ${type} deliverable.
Your job is to review it for quality and flag any issues.

COURSE CONTEXT:
${courseContext}

REVIEW CRITERIA FOR THIS ${type.toUpperCase()}:
${typeRules[type] || '- Check for completeness, accuracy, and alignment to the course topic.'}

UNIVERSAL CRITERIA (all deliverable types):
- No em dashes anywhere
- No unresolved placeholder text ({{, }}, [TODO])
- Institutional branding present (primary color applied)
- Content is accurate and technically correct
- No broken or misleading instructions
- File appears complete (not truncated)

OUTPUT FORMAT - respond with ONLY valid JSON, nothing else:
{
  "overall": "pass" | "pass_with_warnings" | "fail",
  "score": 0-100,
  "summary": "one sentence overall assessment",
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "location": "Phase 2 / Screenshot box 3 / etc.",
      "issue": "description of the problem",
      "fix": "how to fix it"
    }
  ],
  "missing_topics": ["topic that should be covered but is not"],
  "strengths": ["what the file does well"],
  "ready_for_final": true | false
}

If there are no issues, return an empty issues array.
Do not include any text outside the JSON object.`;
}

// ── Claude API call ────────────────────────────────────────────────────────
function callClaude(systemPrompt, userContent) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY not set.'));

    const body = JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
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
      res.on('data', c => data += c);
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

// ── Run QA on a single file ───────────────────────────────────────────────
async function runQA(filePath, overrideCourse, overrideModule) {
  const filename = path.basename(filePath);
  const { type, course: detectedCourse, module: detectedModule } = detectMeta(filename);

  const course    = overrideCourse || detectedCourse;
  const moduleNum = overrideModule || detectedModule;

  console.log(`\n[QA] ${filename}`);
  console.log(`     Type: ${type} | Course: ${course} | Module: ${moduleNum || 'unknown'}`);

  const html          = fs.readFileSync(filePath, 'utf8');
  const courseContext = loadCourseContext(course, moduleNum);
  const systemPrompt  = buildQAPrompt(type, courseContext);

  // Send first 40KB of HTML -- enough for QA without blowing context
  const htmlSample = html.length > 40960
    ? html.slice(0, 40960) + '\n\n[...file continues, truncated for review...]'
    : html;

  const userContent = `Review this ${type} HTML file:\n\n${htmlSample}`;

  let qaResult;
  try {
    const response = await callClaude(systemPrompt, userContent);

    // Strip any accidental markdown fences
    const clean = response.replace(/```json|```/g, '').trim();
    qaResult = JSON.parse(clean);
  } catch(e) {
    qaResult = {
      overall: 'error',
      score: 0,
      summary: `QA review failed: ${e.message}`,
      issues: [],
      missing_topics: [],
      strengths: [],
      ready_for_final: false
    };
  }

  // Save result
  const ts      = new Date().toISOString().replace(/[:.]/g, '-');
  const outName = path.basename(filename, '.html') + `_qa_${ts}.json`;
  const outPath = path.join(RESULTS_DIR, outName);
  fs.writeFileSync(outPath, JSON.stringify({ filename, type, course, module: moduleNum, ...qaResult }, null, 2));

  // Print summary
  const icon = { pass: '✅', pass_with_warnings: '⚠️', fail: '❌', error: '💥' }[qaResult.overall] || '?';
  console.log(`\n     ${icon} ${qaResult.overall.toUpperCase()} | Score: ${qaResult.score}/100`);
  console.log(`     ${qaResult.summary}`);

  if (qaResult.issues && qaResult.issues.length) {
    const critical = qaResult.issues.filter(i => i.severity === 'critical');
    const warnings = qaResult.issues.filter(i => i.severity === 'warning');
    const suggests = qaResult.issues.filter(i => i.severity === 'suggestion');

    if (critical.length) {
      console.log(`\n     CRITICAL (${critical.length}):`);
      critical.forEach(i => {
        console.log(`     ❌ [${i.location}] ${i.issue}`);
        console.log(`        Fix: ${i.fix}`);
      });
    }
    if (warnings.length) {
      console.log(`\n     WARNINGS (${warnings.length}):`);
      warnings.forEach(i => console.log(`     ⚠️  [${i.location}] ${i.issue}`));
    }
    if (suggests.length) {
      console.log(`\n     SUGGESTIONS (${suggests.length}):`);
      suggests.forEach(i => console.log(`     💡 ${i.issue}`));
    }
  }

  if (qaResult.missing_topics && qaResult.missing_topics.length) {
    console.log(`\n     Missing topics: ${qaResult.missing_topics.join(', ')}`);
  }

  if (qaResult.strengths && qaResult.strengths.length) {
    console.log(`\n     Strengths: ${qaResult.strengths.join(' | ')}`);
  }

  console.log(`\n     Ready for final: ${qaResult.ready_for_final ? 'YES' : 'NO'}`);
  console.log(`     Report saved: ${path.relative(ROOT, outPath)}`);

  return qaResult;
}

// ── Find files without QA reports ─────────────────────────────────────────
function findPendingQA() {
  const reviewed = new Set(
    fs.readdirSync(RESULTS_DIR)
      .filter(f => f.endsWith('.qa.json'))
      .map(f => f.replace(/_qa_.*\.json$/, '.html'))
  );

  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(e => {
      const full = path.join(dir, e);
      if (fs.statSync(full).isDirectory()) { walk(full); return; }
      if (e.endsWith('.html') && dir.includes('UnderDevelopment') && !reviewed.has(e)) {
        files.push(full);
      }
    });
  }
  walk(CLASSES_DIR);
  return files;
}

// ── CLI ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!args.length) {
    console.log(`
Usage:
  node scripts/qa.js [filepath]
  node scripts/qa.js [filepath] --course secplus --module 8
  node scripts/qa.js --all secplus
  node scripts/qa.js --pending
`);
    process.exit(0);
  }

  if (args[0] === '--pending') {
    const files = findPendingQA();
    console.log(`\nFound ${files.length} file(s) without QA reports.\n`);
    for (let i = 0; i < files.length; i++) {
      await runQA(files[i]);
      if (i < files.length - 1) await delay(DELAY_MS);
    }
    return;
  }

  if (args[0] === '--all') {
    const courseFilter = args[1] || null;
    const files = [];
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(e => {
        const full = path.join(dir, e);
        if (fs.statSync(full).isDirectory()) { walk(full); return; }
        if (e.endsWith('.html') && dir.includes('UnderDevelopment')) {
          if (!courseFilter || full.toLowerCase().includes(courseFilter.toLowerCase())) {
            files.push(full);
          }
        }
      });
    }
    walk(CLASSES_DIR);
    for (let i = 0; i < files.length; i++) {
      await runQA(files[i]);
      if (i < files.length - 1) await delay(DELAY_MS);
    }
    return;
  }

  // Single file
  const filePath = args[0];
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    process.exit(1);
  }

  const courseIdx  = args.indexOf('--course');
  const moduleIdx  = args.indexOf('--module');
  const course     = courseIdx >= 0 ? args[courseIdx + 1] : null;
  const moduleNum  = moduleIdx >= 0 ? parseInt(args[moduleIdx + 1]) : null;

  await runQA(filePath, course, moduleNum);
}

main().catch(err => {
  console.error('[qa] Fatal:', err.message);
  process.exit(1);
});
