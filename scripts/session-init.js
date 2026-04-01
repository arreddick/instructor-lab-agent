#!/usr/bin/env node
/**
 * Ashley's IT Lab Agent - Session Init
 * =====================================
 * Pre-loads templates, design system CSS, and course configs into a
 * single snapshot file. The agent reads this once at session start
 * instead of re-reading 5+ files for every build.
 *
 * Usage:
 *   node scripts/session-init.js                   Build snapshot for all courses
 *   node scripts/session-init.js --course secplus   Build snapshot for one course
 *   node scripts/session-init.js --check            Show what is cached and if it is stale
 *
 * The snapshot is saved to workflows/session-context.json.
 * It is NOT committed to git (add to .gitignore).
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const SNAPSHOT     = path.join(ROOT, 'workflows', 'session-context.json');
const COURSES_DIR  = path.join(ROOT, 'courses');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const DESIGN_DIR   = path.join(ROOT, 'design-system');
const CONTEXT_DIR  = path.join(ROOT, 'context');

const args = process.argv.slice(2);
const CHECK_ONLY   = args.includes('--check');
const COURSE_FILTER = (() => { const i = args.indexOf('--course'); return i >= 0 ? args[i+1] : null; })();

function readIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return null;
}

function fileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  return `${stat.size}_${stat.mtimeMs}`;
}

function buildSnapshot() {
  const snapshot = {
    createdAt: new Date().toISOString(),
    designSystem: {},
    templates: {},
    courses: {},
    context: {},
    hashes: {}
  };

  // 1. Design system CSS
  const cssPath = path.join(DESIGN_DIR, 'canonical.css');
  snapshot.designSystem.css = readIfExists(cssPath);
  snapshot.hashes['canonical.css'] = fileHash(cssPath);

  // 2. Mind map schema
  const schemaPath = path.join(DESIGN_DIR, 'mindmap-data-schema.jsonc');
  snapshot.designSystem.mindmapSchema = readIfExists(schemaPath);
  snapshot.hashes['mindmap-data-schema.jsonc'] = fileHash(schemaPath);

  // 3. Templates
  if (fs.existsSync(TEMPLATES_DIR)) {
    const templateFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html'));
    for (const tf of templateFiles) {
      const tp = path.join(TEMPLATES_DIR, tf);
      snapshot.templates[tf] = readIfExists(tp);
      snapshot.hashes[tf] = fileHash(tp);
    }
  }

  // 4. Course JSONs
  if (fs.existsSync(COURSES_DIR)) {
    const courseFiles = fs.readdirSync(COURSES_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    for (const cf of courseFiles) {
      const code = cf.replace('.json', '');
      if (COURSE_FILTER && code !== COURSE_FILTER) continue;
      const cp = path.join(COURSES_DIR, cf);
      try {
        snapshot.courses[code] = JSON.parse(readIfExists(cp));
        snapshot.hashes[cf] = fileHash(cp);
      } catch { /* skip invalid */ }
    }
  }

  // 5. Context files (syllabus rules, verified resources)
  if (fs.existsSync(CONTEXT_DIR)) {
    const contextFiles = fs.readdirSync(CONTEXT_DIR).filter(f => f.endsWith('.md'));
    for (const cf of contextFiles) {
      const cp = path.join(CONTEXT_DIR, cf);
      snapshot.context[cf] = readIfExists(cp);
      snapshot.hashes[cf] = fileHash(cp);
    }
  }

  return snapshot;
}

function checkStaleness() {
  if (!fs.existsSync(SNAPSHOT)) {
    console.log('\n  No session context cached. Run: node scripts/session-init.js\n');
    return;
  }

  const cached = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const age = ((Date.now() - new Date(cached.createdAt).getTime()) / 1000 / 60).toFixed(0);

  console.log('\n' + '='.repeat(50));
  console.log('  SESSION CONTEXT STATUS');
  console.log('='.repeat(50));
  console.log(`  Created: ${cached.createdAt} (${age} min ago)`);

  let staleCount = 0;
  for (const [key, hash] of Object.entries(cached.hashes)) {
    // Find original file path
    let original = null;
    if (key === 'canonical.css') original = path.join(DESIGN_DIR, key);
    else if (key === 'mindmap-data-schema.jsonc') original = path.join(DESIGN_DIR, key);
    else if (key.endsWith('.html')) original = path.join(TEMPLATES_DIR, key);
    else if (key.endsWith('.json')) original = path.join(COURSES_DIR, key);
    else if (key.endsWith('.md')) original = path.join(CONTEXT_DIR, key);

    if (original) {
      const currentHash = fileHash(original);
      if (currentHash !== hash) {
        console.log(`  STALE: ${key}`);
        staleCount++;
      }
    }
  }

  if (staleCount === 0) {
    console.log(`  All ${Object.keys(cached.hashes).length} files up to date.`);
  } else {
    console.log(`\n  ${staleCount} file(s) changed. Run: node scripts/session-init.js`);
  }

  console.log(`  Courses cached: ${Object.keys(cached.courses).join(', ')}`);
  console.log(`  Templates cached: ${Object.keys(cached.templates).join(', ')}`);
  console.log('');
}

// ── Main ────────────────────────────────────────────────────────────────────
if (CHECK_ONLY) {
  checkStaleness();
} else {
  const snapshot = buildSnapshot();
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2));

  const courses = Object.keys(snapshot.courses);
  const templates = Object.keys(snapshot.templates);
  const contextFiles = Object.keys(snapshot.context);

  console.log('\n  Session context built.');
  console.log(`  Courses:   ${courses.join(', ') || 'none'}`);
  console.log(`  Templates: ${templates.join(', ') || 'none'}`);
  console.log(`  Context:   ${contextFiles.join(', ') || 'none'}`);
  console.log(`  Design:    canonical.css, mindmap-data-schema.jsonc`);
  console.log(`  Saved to:  workflows/session-context.json\n`);
}
