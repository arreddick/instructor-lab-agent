#!/usr/bin/env node
/**
 * Add tasks to workflows/queue.json from the terminal.
 *
 * Usage:
 *   node scripts/add-task.js [course] [type] [topic]
 *   node scripts/add-task.js [course] [type] [topic] "optional notes"
 *   node scripts/add-task.js --batch [course] module[N]
 *
 * Examples:
 *   node scripts/add-task.js secplus mind-map Module_9_Cloud_Security
 *   node scripts/add-task.js az900 study-guide Module_3
 *   node scripts/add-task.js az104 lab Lab_07_Virtual_Machines "Include cost warning and cleanup steps"
 *   node scripts/add-task.js --batch secplus module8
 *   node scripts/add-task.js --batch az900 module2
 */

const fs   = require('fs');
const path = require('path');

const QUEUE_FILE   = path.join(__dirname, '../workflows/queue.json');
const COURSES_DIR  = path.join(__dirname, '../courses');

// Fallback deliverable types if course JSON not found
const BATCH_TYPES_FALLBACK = {
  secplus: ['mind-map', 'study-guide', 'lab', 'hot'],
  az900:   ['study-guide', 'lab', 'hot', 'rubric'],
  az104:   ['lab', 'rubric'],
  vmware:  ['lab'],
};

function getDeliverableTypes(course) {
  const courseFile = path.join(COURSES_DIR, `${course}.json`);
  if (fs.existsSync(courseFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(courseFile, 'utf8'));
      if (data.deliverables_required && data.deliverables_required.length) {
        return data.deliverables_required;
      }
    } catch(e) { /* fall through to fallback */ }
  }
  return BATCH_TYPES_FALLBACK[course] || ['study-guide', 'lab', 'hot'];
}

function loadQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue(q) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
}

function makeId(course, type, topic) {
  return `${course}-${type}-${topic}`.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}

function addTask(queue, course, type, topic, notes = '') {
  const id = makeId(course, type, topic);
  if (queue.tasks.find(t => t.id === id)) {
    console.log(`  Already in queue: ${id}`);
    return false;
  }
  queue.tasks.push({ id, course, type, topic, status: 'pending', notes });
  console.log(`  Added: [${course}] ${type} - ${topic}`);
  return true;
}

const args = process.argv.slice(2);

if (!args.length) {
  console.log(`
Usage:
  node scripts/add-task.js [course] [type] [topic] ["optional notes"]
  node scripts/add-task.js --batch [course] module[N]

Course codes:   secplus  az900  az104  vmware  inf2014  inf2016
Deliverable types:  study-guide  mind-map  hot  lab  rubric  syllabus

Examples:
  node scripts/add-task.js secplus mind-map Module_8_Network_Security
  node scripts/add-task.js az104 lab Lab_07_Virtual_Machines "Add cost warning"
  node scripts/add-task.js --batch secplus module8
  node scripts/add-task.js --batch az900 module3
`);
  process.exit(0);
}

const queue = loadQueue();

if (args[0] === '--batch') {
  const course     = args[1];
  const moduleArg  = args[2]; // e.g. module8
  const modMatch   = moduleArg.match(/(\d+)/);
  if (!modMatch) { console.log('Specify module number, e.g. module8'); process.exit(1); }
  const modNum     = modMatch[1];
  const topic      = `Module_${modNum}`;

  console.log(`\nBatch adding tasks for [${course}] ${topic}:`);
  const types = getDeliverableTypes(course);
  types.forEach(type => addTask(queue, course, type, topic));
  saveQueue(queue);
  console.log(`\nDone. Run: node scripts/generate.js`);

} else if (args.length >= 3) {
  const [course, type, topic, ...noteParts] = args;
  const notes = noteParts.join(' ');
  addTask(queue, course, type, topic, notes);
  saveQueue(queue);
  console.log(`\nDone. Run: node scripts/generate.js`);

} else {
  console.log('Not enough arguments. Run with no arguments to see usage.');
}
