#!/usr/bin/env node
/**
 * Ashley's IT Lab Agent - Mark Final
 * ====================================
 * Moves a deliverable from UnderDevelopment/ to Final/ and updates
 * the module status in the course JSON automatically.
 *
 * Usage:
 *   node scripts/mark-final.js [filename]
 *   node scripts/mark-final.js SecurityPlus_study_guide_Module_8.html
 *   node scripts/mark-final.js --all secplus study-guide
 *
 * Examples:
 *   node scripts/mark-final.js SecurityPlus_mind_map_Module_8.html
 *   node scripts/mark-final.js AZ-900_hot_Module_1.html
 *   node scripts/mark-final.js --all secplus module8
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const CLASSES_DIR = path.join(ROOT, 'classes');
const COURSES_DIR = path.join(ROOT, 'courses');

// Map class folder name back to course code
const FOLDER_TO_CODE = {
  'SecurityPlus':    'secplus',
  'AZ-900':          'az900',
  'AZ-104':          'az104',
  'VMware':          'vmware',
  'Linux':           'linux',
  'Server':          'server',
  'OperatingSystems': 'os'
};

// Map deliverable type strings to course JSON status keys
const TYPE_TO_STATUS_KEY = {
  'study_guide': 'study-guide',
  'mind_map':    'mind-map',
  'hot':         'hot',
  'lab':         'lab',
  'rubric':      'rubric'
};

function log(msg) { console.log(msg); }

function findFileInUD(filename) {
  // Walk all UnderDevelopment folders to find the file
  const results = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(entry => {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        if (entry === 'UnderDevelopment') {
          fs.readdirSync(full).forEach(f => {
            if (f === filename || f.toLowerCase() === filename.toLowerCase()) {
              results.push(path.join(full, f));
            }
          });
        } else {
          walk(full);
        }
      }
    });
  }

  walk(CLASSES_DIR);
  return results;
}

function moveToFinal(udPath) {
  const udDir    = path.dirname(udPath);
  const finalDir = udDir.replace('UnderDevelopment', 'Final');
  const filename = path.basename(udPath);
  const finalPath = path.join(finalDir, filename);

  fs.mkdirSync(finalDir, { recursive: true });
  fs.renameSync(udPath, finalPath);
  log(`  Moved: ${path.relative(ROOT, udPath)}`);
  log(`  To:    ${path.relative(ROOT, finalPath)}`);
  return { finalPath, filename };
}

function updateCourseStatus(filename) {
  // Parse filename: [ClassFolder]_[type]_Module_[N].html
  // e.g. SecurityPlus_study_guide_Module_8.html
  const base = filename.replace(/\.(html|docx)$/, '');
  const parts = base.split('_');

  // Find class folder -- match by checking if filename starts with known folder name
  let classFolder = null;
  let restParts   = [...parts];

  for (const [folder] of Object.entries(FOLDER_TO_CODE)) {
    // Direct prefix match on the base filename (handles AZ-900, AZ-104, etc.)
    if (base === folder || base.startsWith(folder + '_')) {
      classFolder = folder;
      // restParts: everything after the folder prefix
      const prefixParts = (folder + '_').split('_').filter(Boolean);
      // count how many underscore-segments the folder name occupies in parts[]
      // e.g. 'AZ-900' is 1 segment, 'SecurityPlus' is 1 segment, 'OperatingSystems' is 1
      let consumed = 0;
      let rebuilt  = '';
      for (let i = 0; i < parts.length; i++) {
        rebuilt = rebuilt ? rebuilt + '_' + parts[i] : parts[i];
        if (rebuilt === folder) { consumed = i + 1; break; }
        if (folder.startsWith(rebuilt) === false) break;
      }
      restParts = consumed > 0 ? parts.slice(consumed) : parts.slice(1);
      break;
    }
  }

  if (!classFolder) {
    log('  Note: Could not determine class from filename. Course JSON not updated.');
    return;
  }

  const courseCode = FOLDER_TO_CODE[classFolder];
  const courseFile = path.join(COURSES_DIR, `${courseCode}.json`);
  if (!fs.existsSync(courseFile)) {
    log(`  Note: courses/${courseCode}.json not found. Status not updated.`);
    return;
  }

  // Find deliverable type -- join first two parts to handle study_guide, mind_map etc.
  const oneWordType = restParts[0];
  const twoWordType = restParts.slice(0, 2).join('_');
  const delivType   = TYPE_TO_STATUS_KEY[twoWordType] || TYPE_TO_STATUS_KEY[oneWordType];
  if (!delivType) {
    log(`  Note: Could not determine deliverable type from "${twoWordType}". Status not updated.`);
    return;
  }

  // Find module number -- skip past the type word(s) first
  const typeWordCount = twoWordType in TYPE_TO_STATUS_KEY ? 2 : 1;
  const afterType = restParts.slice(typeWordCount);
  const modIdx = afterType.findIndex(p => p.toLowerCase() === 'module');
  if (modIdx < 0) {
    log('  Note: Could not find module number in filename. Status not updated.');
    return;
  }
  const modNum = parseInt(afterType[modIdx + 1], 10);
  if (isNaN(modNum)) {
    log('  Note: Module number is not a valid integer. Status not updated.');
    return;
  }

  // Update the JSON
  const course = JSON.parse(fs.readFileSync(courseFile, 'utf8'));
  const mod    = course.modules && course.modules.find(m => m.number === modNum);

  if (!mod) {
    log(`  Note: Module ${modNum} not found in ${courseCode}.json. Status not updated.`);
    return;
  }

  if (!mod.status) mod.status = {};
  mod.status[delivType] = true;
  fs.writeFileSync(courseFile, JSON.stringify(course, null, 2));
  log(`  Updated: courses/${courseCode}.json > modules[${modNum}].status.${delivType} = true`);
}

function markFinal(filename) {
  log(`\nMarking final: ${filename}`);
  const found = findFileInUD(filename);

  if (!found.length) {
    log(`  ERROR: File not found in any UnderDevelopment/ folder: ${filename}`);
    log('  Make sure the filename is exact and the file is in an UnderDevelopment/ folder.');
    return;
  }

  if (found.length > 1) {
    log('  Multiple files found:');
    found.forEach((f, i) => log(`    [${i+1}] ${path.relative(ROOT, f)}`));
    log('  Specify which one by including more of the path.');
    return;
  }

  const { filename: fname } = moveToFinal(found[0]);
  updateCourseStatus(fname);
  log('  Done.\n');
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (!args.length) {
  console.log(`
Usage:
  node scripts/mark-final.js [filename]
  node scripts/mark-final.js --all [course] [module]

Examples:
  node scripts/mark-final.js SecurityPlus_study_guide_Module_8.html
  node scripts/mark-final.js AZ-900_hot_Module_1.html
  node scripts/mark-final.js --all secplus module8
`);
  process.exit(0);
}

if (args[0] === '--all') {
  // Move ALL UnderDevelopment files for a course/module to Final
  const courseArg  = args[1];
  const moduleArg  = args[2];
  const modMatch   = moduleArg && moduleArg.match(/(\d+)/);
  const modNum     = modMatch ? modMatch[1] : null;

  if (!courseArg) {
    log('Usage: node scripts/mark-final.js --all [course] [module]');
    process.exit(1);
  }

  // Find all UD files matching course/module
  const pattern = modNum ? `Module_${modNum}` : '';
  let count = 0;

  function walkForAll(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(entry => {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        if (entry === 'UnderDevelopment') {
          fs.readdirSync(full)
            .filter(f => f.includes(courseArg) || f.toLowerCase().includes(courseArg))
            .filter(f => !pattern || f.includes(pattern))
            .forEach(f => {
              markFinal(f);
              count++;
            });
        } else {
          walkForAll(full);
        }
      }
    });
  }

  walkForAll(CLASSES_DIR);
  log(`\nMarked ${count} file(s) as final.`);

} else {
  markFinal(args[0]);
}
