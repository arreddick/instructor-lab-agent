#!/usr/bin/env node
/**
 * Ashley's IT Lab Agent - Resume Detector
 * ========================================
 * Scans for partial files and the session log to determine where
 * work was interrupted. Returns a structured summary so the agent
 * can pick up exactly where it left off.
 *
 * Usage:
 *   node scripts/resume.js                  Show what needs resuming
 *   node scripts/resume.js --json           Output as JSON (for agent consumption)
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const CLASSES_DIR = path.join(ROOT, 'classes');
const LOG_FILE    = path.join(ROOT, 'workflows', 'session-log.json');
const QUEUE_FILE  = path.join(ROOT, 'workflows', 'queue.json');

const asJson = process.argv.includes('--json');

// ── Find all _PARTIAL files ────────────────────────────────────────────────
function findPartials(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPartials(full));
    } else if (entry.name.includes('_PARTIAL')) {
      const stat = fs.statSync(full);
      results.push({
        file: path.relative(ROOT, full),
        size: (stat.size / 1024).toFixed(1) + 'KB',
        modified: stat.mtime.toISOString()
      });
    }
  }
  return results;
}

// ── Check for failed or in-progress queue tasks ─────────────────────────────
function checkQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return { pending: [], failed: [] };
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const pending = queue.tasks.filter(t => t.status === 'pending');
  const failed  = queue.tasks.filter(t => t.status === 'failed');
  return { pending, failed };
}

// ── Get last session activity ───────────────────────────────────────────────
function getLastActivity() {
  if (!fs.existsSync(LOG_FILE)) return null;
  try {
    const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    if (log.sessions.length === 0) return null;
    const last = log.sessions[log.sessions.length - 1];
    if (last.entries.length === 0) return null;
    const lastEntry = last.entries[last.entries.length - 1];
    return {
      date: last.date,
      lastAction: lastEntry.action,
      lastStatus: lastEntry.status,
      lastFile: lastEntry.file || lastEntry.topic || null,
      lastError: lastEntry.error || null,
      totalEntries: last.entries.length
    };
  } catch { return null; }
}

// ── Detect last completed section in a partial HTML file ─────────────────────
function detectLastSection(filePath) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return null;
  const html = fs.readFileSync(fullPath, 'utf8');

  // Find all phase/section markers
  const phaseMatches = [...html.matchAll(/id=["']phase(\d+)["']/gi)];
  const lastPhase = phaseMatches.length > 0
    ? Math.max(...phaseMatches.map(m => parseInt(m[1])))
    : 0;

  // Check if file ends cleanly
  const trimmed = html.trim();
  const endsClean = trimmed.endsWith('</html>') || trimmed.endsWith('</div>') || trimmed.endsWith('</script>');

  // Check for unclosed tags
  const openDivs  = (html.match(/<div/g) || []).length;
  const closeDivs = (html.match(/<\/div>/g) || []).length;

  return {
    lastPhaseFound: lastPhase,
    endsCleanly: endsClean,
    unclosedDivs: openDivs - closeDivs,
    fileSizeKB: (html.length / 1024).toFixed(1)
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  const partials     = findPartials(CLASSES_DIR);
  const { pending, failed } = checkQueue();
  const lastActivity = getLastActivity();

  const report = {
    partialFiles: partials.map(p => ({
      ...p,
      analysis: detectLastSection(p.file)
    })),
    queuePending: pending.map(t => ({ id: t.id, course: t.course, type: t.type, topic: t.topic })),
    queueFailed: failed.map(t => ({ id: t.id, course: t.course, type: t.type, topic: t.topic, error: t.error })),
    lastActivity
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Human-readable output
  console.log('\n' + '='.repeat(58));
  console.log('  RESUME CHECK');
  console.log('='.repeat(58));

  if (lastActivity) {
    console.log(`\n  Last session: ${lastActivity.date}`);
    console.log(`  Last action:  ${lastActivity.lastAction} (${lastActivity.lastStatus})`);
    if (lastActivity.lastFile) console.log(`  Last file:    ${lastActivity.lastFile}`);
    if (lastActivity.lastError) console.log(`  Last error:   ${lastActivity.lastError}`);
  }

  if (partials.length > 0) {
    console.log('\n  PARTIAL FILES FOUND (need completion):');
    partials.forEach(p => {
      const analysis = detectLastSection(p.file);
      console.log(`    ${p.file}`);
      console.log(`      Size: ${p.size}, Last phase: ${analysis.lastPhaseFound}, Ends cleanly: ${analysis.endsCleanly}`);
      if (analysis.unclosedDivs > 0) {
        console.log(`      WARNING: ${analysis.unclosedDivs} unclosed div tags`);
      }
    });
  }

  if (failed.length > 0) {
    console.log('\n  FAILED TASKS (need retry):');
    failed.forEach(t => {
      console.log(`    [${t.course}] ${t.type}: ${t.topic}`);
      if (t.error) console.log(`      Error: ${t.error}`);
    });
  }

  if (pending.length > 0) {
    console.log('\n  PENDING TASKS:');
    pending.forEach(t => {
      console.log(`    [${t.course}] ${t.type}: ${t.topic}`);
    });
  }

  if (partials.length === 0 && failed.length === 0 && pending.length === 0) {
    console.log('\n  Nothing to resume. All clear.');
  }

  console.log('');
}

main();
