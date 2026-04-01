#!/usr/bin/env node
/**
 * Ashley's IT Lab Agent - Session Logger
 * =======================================
 * Logs agent actions to workflows/session-log.json so Ashley can review
 * what was generated, what failed, and what took too long.
 *
 * Usage from other scripts:
 *   const logger = require('./session-log');
 *   logger.start('generate', { course: 'secplus', type: 'mind-map', topic: 'Module_8' });
 *   // ... do work ...
 *   logger.success('generate', { file: 'SecurityPlus_MindMap_Module8.html', size: '245KB' });
 *   logger.fail('generate', { error: 'API timeout after 60s' });
 *
 * Usage from CLI:
 *   node scripts/session-log.js --view                Show recent entries
 *   node scripts/session-log.js --view 20             Show last 20 entries
 *   node scripts/session-log.js --summary             Show session summary (counts, failures, slow tasks)
 *   node scripts/session-log.js --clear               Archive current log and start fresh
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'workflows', 'session-log.json');
const ARCHIVE  = path.join(ROOT, 'workflows', 'session-log-archive');

// Threshold in seconds: anything above this is flagged as slow
const SLOW_THRESHOLD = 120;

// ── Ensure log file exists ─────────────────────────────────────────────────
function ensureLog() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify({ sessions: [] }, null, 2));
  }
}

function readLog() {
  ensureLog();
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return { sessions: [] };
  }
}

function writeLog(data) {
  ensureLog();
  fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
}

// ── Get or create today's session ──────────────────────────────────────────
function getSession() {
  const log = readLog();
  const today = new Date().toISOString().slice(0, 10);
  let session = log.sessions.find(s => s.date === today);
  if (!session) {
    session = {
      date: today,
      started: new Date().toISOString(),
      entries: [],
      summary: { generated: 0, failed: 0, slow: 0, markFinal: 0 }
    };
    log.sessions.push(session);
  }
  return { log, session };
}

// ── Tracking in-progress actions (keyed by action name) ────────────────────
const pending = {};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Log the start of an action. Call before the work begins.
 * @param {string} action - e.g. 'generate', 'test', 'qa', 'mark-final', 'patch', 'combine'
 * @param {object} meta - context: { course, type, topic, file, ... }
 */
function start(action, meta = {}) {
  pending[action] = { startTime: Date.now(), meta };
}

/**
 * Log a successful completion.
 * @param {string} action
 * @param {object} result - { file, size, ... }
 */
function success(action, result = {}) {
  const startInfo = pending[action];
  const elapsed = startInfo ? ((Date.now() - startInfo.startTime) / 1000).toFixed(1) : null;
  const meta = startInfo ? startInfo.meta : {};
  delete pending[action];

  const { log, session } = getSession();
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    status: 'success',
    elapsed: elapsed ? `${elapsed}s` : null,
    ...meta,
    ...result
  };

  if (elapsed && parseFloat(elapsed) > SLOW_THRESHOLD) {
    entry.flag = 'slow';
    session.summary.slow++;
  }

  session.entries.push(entry);
  session.summary.generated++;
  if (action === 'mark-final') session.summary.markFinal++;
  writeLog(log);
  return entry;
}

/**
 * Log a failure.
 * @param {string} action
 * @param {object} detail - { error, ... }
 */
function fail(action, detail = {}) {
  const startInfo = pending[action];
  const elapsed = startInfo ? ((Date.now() - startInfo.startTime) / 1000).toFixed(1) : null;
  const meta = startInfo ? startInfo.meta : {};
  delete pending[action];

  const { log, session } = getSession();
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    status: 'failed',
    elapsed: elapsed ? `${elapsed}s` : null,
    ...meta,
    ...detail
  };

  session.entries.push(entry);
  session.summary.failed++;
  writeLog(log);
  return entry;
}

/**
 * Log a simple event (no start/stop timing needed).
 * @param {string} action
 * @param {string} status - 'success' | 'failed' | 'skipped' | 'info'
 * @param {object} meta
 */
function event(action, status, meta = {}) {
  const { log, session } = getSession();
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    status,
    ...meta
  };
  session.entries.push(entry);
  if (status === 'failed') session.summary.failed++;
  if (status === 'success') session.summary.generated++;
  writeLog(log);
  return entry;
}

// ── CLI commands ───────────────────────────────────────────────────────────

function viewRecent(count = 10) {
  const log = readLog();
  if (log.sessions.length === 0) {
    console.log('No session entries yet.');
    return;
  }
  const recent = log.sessions.slice(-3);
  let entries = [];
  recent.forEach(s => {
    s.entries.forEach(e => entries.push(e));
  });
  entries = entries.slice(-count);

  console.log(`\nLast ${entries.length} actions:\n`);
  entries.forEach(e => {
    const flag = e.flag ? ` [${e.flag.toUpperCase()}]` : '';
    const time = e.elapsed ? ` (${e.elapsed})` : '';
    const file = e.file ? ` -> ${e.file}` : '';
    const err = e.error ? ` ERROR: ${e.error}` : '';
    const icon = e.status === 'success' ? 'OK' : e.status === 'failed' ? 'FAIL' : e.status.toUpperCase();
    console.log(`  [${icon}] ${e.timestamp.slice(11, 19)} ${e.action}${file}${time}${flag}${err}`);
  });
}

function showSummary() {
  const log = readLog();
  if (log.sessions.length === 0) {
    console.log('No sessions recorded yet.');
    return;
  }

  console.log('\n=== Session Log Summary ===\n');

  log.sessions.slice(-7).forEach(s => {
    const fails = s.entries.filter(e => e.status === 'failed');
    const slow = s.entries.filter(e => e.flag === 'slow');
    console.log(`  ${s.date}: ${s.summary.generated} generated, ${s.summary.failed} failed, ${s.summary.slow} slow, ${s.summary.markFinal} finalized`);
    if (fails.length > 0) {
      fails.forEach(f => console.log(`    FAIL: ${f.action} - ${f.error || 'unknown'}`));
    }
    if (slow.length > 0) {
      slow.forEach(sl => console.log(`    SLOW: ${sl.action} ${sl.file || ''} (${sl.elapsed})`));
    }
  });
  console.log('');
}

function dailyReport() {
  const log = readLog();
  if (log.sessions.length === 0) {
    console.log('No sessions recorded yet.');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const session = log.sessions.find(s => s.date === today);

  console.log('\n' + '='.repeat(58));
  console.log('  DAILY REPORT - ' + today);
  console.log('='.repeat(58));

  if (!session || session.entries.length === 0) {
    console.log('\n  No activity recorded today.\n');
    // Show last session with activity
    const last = log.sessions.filter(s => s.entries.length > 0).pop();
    if (last) {
      console.log(`  Last active session: ${last.date}`);
      console.log(`  ${last.summary.generated} generated, ${last.summary.failed} failed, ${last.summary.markFinal} finalized\n`);
    }
    showNextInQueue();
    return;
  }

  // Files generated
  const generated = session.entries.filter(e => e.action === 'generate' && e.status === 'success');
  if (generated.length) {
    console.log('\n  FILES GENERATED:');
    generated.forEach(e => {
      console.log(`    + ${e.file || e.topic || 'unknown'} (${e.size || '?'}, ${e.elapsed || '?'})`);
    });
  }

  // Files finalized
  const finalized = session.entries.filter(e => e.action === 'mark-final' && e.status === 'success');
  if (finalized.length) {
    console.log('\n  MARKED FINAL:');
    finalized.forEach(e => {
      console.log(`    * ${e.file || 'unknown'}`);
    });
  }

  // Failures
  const failures = session.entries.filter(e => e.status === 'failed');
  if (failures.length) {
    console.log('\n  FAILURES:');
    failures.forEach(e => {
      console.log(`    X ${e.action}: ${e.error || e.file || 'unknown'}`);
    });
  }

  // Slow tasks
  const slow = session.entries.filter(e => e.flag === 'slow');
  if (slow.length) {
    console.log('\n  SLOW TASKS (>' + SLOW_THRESHOLD + 's):');
    slow.forEach(e => {
      console.log(`    ! ${e.action} ${e.file || ''} (${e.elapsed})`);
    });
  }

  // Totals
  console.log('\n  TOTALS:');
  console.log(`    Generated: ${session.summary.generated}`);
  console.log(`    Failed:    ${session.summary.failed}`);
  console.log(`    Slow:      ${session.summary.slow}`);
  console.log(`    Finalized: ${session.summary.markFinal}`);

  // Next in queue
  showNextInQueue();
  console.log('');
}

function showNextInQueue() {
  const queuePath = path.join(ROOT, 'workflows', 'queue.json');
  if (!fs.existsSync(queuePath)) return;
  try {
    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    const next = queue.tasks.find(t => t.status === 'pending');
    if (next) {
      console.log('\n  NEXT IN QUEUE:');
      console.log(`    [${next.course}] ${next.type}: ${next.topic}`);
    } else {
      console.log('\n  QUEUE: All tasks complete.');
    }
  } catch { /* ignore */ }
}

function clearLog() {
  const log = readLog();
  if (log.sessions.length === 0) {
    console.log('Nothing to archive.');
    return;
  }
  if (!fs.existsSync(ARCHIVE)) fs.mkdirSync(ARCHIVE, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = path.join(ARCHIVE, `session-log-${stamp}.json`);
  fs.copyFileSync(LOG_FILE, archivePath);
  fs.writeFileSync(LOG_FILE, JSON.stringify({ sessions: [] }, null, 2));
  console.log(`Archived to ${archivePath}`);
  console.log('Session log cleared.');
}

// ── CLI entry ──────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--daily') || args.includes('--report')) {
    dailyReport();
  } else if (args.includes('--summary')) {
    showSummary();
  } else if (args.includes('--clear')) {
    clearLog();
  } else if (args.includes('--view')) {
    const idx = args.indexOf('--view');
    const count = parseInt(args[idx + 1]) || 10;
    viewRecent(count);
  } else if (args.includes('--log')) {
    // Quick log from hook: --log <filepath> [action]
    const idx = args.indexOf('--log');
    const filePath = args[idx + 1] || 'unknown';
    const action = args[idx + 2] || 'write';
    const { log, session } = getSession();
    session.entries.push({
      timestamp: new Date().toISOString(),
      action,
      status: 'success',
      file: filePath
    });
    session.summary.generated++;
    writeLog(log);
  } else {
    console.log('Usage:');
    console.log('  node scripts/session-log.js --view [N]    Show last N entries (default 10)');
    console.log('  node scripts/session-log.js --daily       Today\'s full daily report');
    console.log('  node scripts/session-log.js --summary     Show daily summaries (last 7 days)');
    console.log('  node scripts/session-log.js --clear       Archive and reset');
    console.log('  node scripts/session-log.js --log <file>  Log a file write action');
  }
}

// ── Module exports ─────────────────────────────────────────────────────────
module.exports = { start, success, fail, event };
