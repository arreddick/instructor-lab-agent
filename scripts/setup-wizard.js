#!/usr/bin/env node
// ============================================================
// Instructor Lab Agent - First Run Setup Wizard
// Created by Ashley Reddick
// github.com/arreddick/instructor-lab-agent
// ============================================================
// Node.js built-ins only. No npm dependencies required.
// ============================================================

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// ── Default grading scale ──────────────────────────────────
const DEFAULT_GRADING_SCALE = [
  { grade: 'A',  min: 92.5,  max: 100 },
  { grade: 'B+', min: 89.5,  max: 92.49 },
  { grade: 'B',  min: 83.5,  max: 89.49 },
  { grade: 'C+', min: 80.5,  max: 83.49 },
  { grade: 'C',  min: 74.5,  max: 80.49 },
  { grade: 'D',  min: 69.5,  max: 74.49 },
  { grade: 'F',  min: 0,     max: 69.49 }
];

// ── Color scheme options ───────────────────────────────────
const COLOR_SCHEMES = [
  { name: 'Classic Red',    hex: '#c8102e' },
  { name: 'Navy Blue',      hex: '#003366' },
  { name: 'Forest Green',   hex: '#2d6a4f' },
  { name: 'Royal Purple',   hex: '#6a0dad' },
  { name: 'Burnt Orange',   hex: '#cc5500' }
];

// ── Folder structure for each course ───────────────────────
const COURSE_FOLDERS = [
  'TextBookFiles',
  'TestBankFiles',
  'output/HandsOnTests/UnderDevelopment',
  'output/HandsOnTests/Final',
  'output/MindMaps/UnderDevelopment',
  'output/MindMaps/Final',
  'output/StudyGuides/UnderDevelopment',
  'output/StudyGuides/Final',
  'output/LabPackets/UnderDevelopment',
  'output/LabPackets/Final',
  'output/InstructorOnly/TSGuidesForHOTs/UnderDevelopment',
  'output/InstructorOnly/TSGuidesForHOTs/Final',
  'output/InstructorOnly/TSGuidesForLabs/UnderDevelopment',
  'output/InstructorOnly/TSGuidesForLabs/Final',
  'output/InstructorOnly/AnswerSheetsForHOTs/UnderDevelopment',
  'output/InstructorOnly/AnswerSheetsForHOTs/Final',
  'output/InstructorOnly/AnswerSheetsForLabs/UnderDevelopment',
  'output/InstructorOnly/AnswerSheetsForLabs/Final',
  'output/InstructorOnly/GradingRubricsForHOTs/UnderDevelopment',
  'output/InstructorOnly/GradingRubricsForHOTs/Final',
  'output/InstructorOnly/GradingRubricsForLabs/UnderDevelopment',
  'output/InstructorOnly/GradingRubricsForLabs/Final'
];

// ── Readline helpers ───────────────────────────────────────

let rl;

function createInterface() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  // Handle Ctrl+C gracefully
  rl.on('close', () => {
    console.log('\n\nSetup cancelled. No files were written.');
    process.exit(0);
  });
}

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Collect multi-line input. User presses Enter on an empty line to finish.
 */
function askMultiLine(prompt) {
  return new Promise((resolve) => {
    console.log(prompt);
    const lines = [];
    const handler = (line) => {
      if (line.trim() === '' && lines.length > 0) {
        rl.removeListener('line', handler);
        resolve(lines.join('\n'));
      } else if (line.trim() !== '') {
        lines.push(line.trim());
      }
    };
    rl.on('line', handler);
  });
}

// ── Validation helpers ─────────────────────────────────────

function isValidHex(hex) {
  return /^#?[0-9a-fA-F]{6}$/.test(hex);
}

function normalizeHex(hex) {
  if (!hex.startsWith('#')) hex = '#' + hex;
  return hex.toLowerCase();
}

function sanitizeClassName(name) {
  // Remove characters that are unsafe for folder names, keep spaces and hyphens
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
}

function classToFolderName(name) {
  // Convert "Network Security" to "NetworkSecurity" for folder name
  return sanitizeClassName(name).replace(/\s+/g, '');
}

function classToJsonKey(name) {
  // Convert "Network Security" to "networksecurity" for JSON filename
  return sanitizeClassName(name).replace(/\s+/g, '').toLowerCase();
}

// ── Directory creation ─────────────────────────────────────

function mkdirSafe(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── Parse custom grading scale ─────────────────────────────

function parseGradingScale(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const scale = [];
  for (const line of lines) {
    // Accepts formats like: A = 92.5-100, A: 92.5 - 100, A 92.5-100
    const match = line.match(/^([A-Fa-f][+-]?)\s*[=:]\s*([\d.]+)\s*[-]\s*([\d.]+)/);
    if (match) {
      scale.push({
        grade: match[1].toUpperCase(),
        min: parseFloat(match[2]),
        max: parseFloat(match[3])
      });
    }
  }
  return scale.length > 0 ? scale : null;
}

// ── Today's date ───────────────────────────────────────────

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── CLAUDE.md template generator ───────────────────────────

function generateClaudeMd(config) {
  const courseList = config.courses.map(c => '`' + c + '`').join(' ');
  const courseNumberedList = config.courses.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const courseOtherNumber = config.courses.length + 1;

  const gradingRows = config.grading_scale.map(g =>
    `| ${g.grade} | ${g.min} - ${g.max}% |`
  ).join('\n');

  return `# Instructor Lab Agent
> ${config.institution_name} | ${config.instructor_name}
> Powered by Instructor Lab Agent - Created by Ashley Reddick (github.com/arreddick/instructor-lab-agent)

---

## ================================================================
## SESSION START - ALWAYS SHOW ON FIRST MESSAGE
## ================================================================

At the very start of every new session (the first response in a new
conversation), display the agent skills list before doing anything else:

---
## Instructor Lab Agent - Ready

**Available Skills:**

| Build | Files | Quality | Tracking |
|-------|-------|---------|----------|
| \`/build\` | \`/final [file]\` | \`/test [file]\` | \`/status [class]\` |
| \`/batch [class] [mod]\` | \`/patch [file] [fix]\` | \`/qa [file]\` | \`/log [N]\` |
| | | | \`/daily-report\` |
| | | | \`/resume\` |
| | | | \`/init\` |

Type \`/show_agent_skills\` for full descriptions. Type \`/help\` for complete reference.
---

Then wait for input. Do not start any work until a command is given.

---

## ================================================================
## LANGUAGE RULES - ENFORCED AT ALL TIMES - NO EXCEPTIONS
## ================================================================

Use plain, direct, professional language. Always describe exactly what
you are doing. Never use casual, trendy, or metaphorical filler words.

NEVER use these words or phrases under any circumstances:
- brewing, percolating, cooking, simmering, whipping up
- vibing, jamming, rocking, crushing it, nailing it, killing it
- crafting, weaving, spinning, conjuring
- magic, magical, wizardry, sorcery
- supercharging, turbocharging, leveling up
- diving in, diving into, jumping in
- awesome, amazing, fantastic (when describing your own work)
- let's go, here we go, buckle up
- no problem, absolutely, certainly, of course (as filler openers)

ALWAYS use plain descriptive words instead:
- "Reading the file" not "diving into the file"
- "Generating the HTML" not "crafting the HTML"
- "Analyzing the structure" not "digging into the structure"
- "Writing the output file" not "brewing up the deliverable"
- "Processing your request" not "working my magic"
- "Building the study guide" not "cooking up the study guide"
- "Running the script" not "firing up the script"

Keep all status messages short and literal. Say exactly what you are
doing at each step. Nothing more.

---

## WHO YOU ARE HELPING

- **Instructor:** ${config.instructor_name}
- **Institution:** ${config.institution_name}
- **Output preference:** Always produce downloadable file outputs over inline code. Direct copy-paste-ready commands. Chunked delivery to manage context window limits.
- **Always ask clarifying questions before starting a complex task**
- **Show your plan and steps before executing**
- **If you have a question, just ask**

---

## ================================================================
## CONTEXT FILES - READ THESE BEFORE THE RELEVANT TASKS
## ================================================================

The \`context/\` folder contains reference files that prevent repeating
known mistakes. Read the right file before starting the relevant task.
Do not skip this step.

| Task | Read this file first |
|---|---|
| Any syllabus (build or edit) | \`context/syllabus-rules.md\` |
| Any lab with external URLs | \`context/verified-resources.md\` |
| Any deliverable for a new course | \`courses/[code].json\` and \`HOW_TO_ADD_A_COURSE.md\` |

---

## ================================================================
## AUTO-BACKUP RULE - RUNS BEFORE EVERY BUILD
## ================================================================

Before making ANY edits to existing files or starting any build,
always create a backup of the target file first.

Backup naming convention:
- Original: CourseA_LabPacket_Module1.html
- Backup:   CourseA_LabPacket_Module1_BACKUP_[YYYYMMDD].html

Backup location: same folder as the original file.

Steps:
1. Copy the original file to a backup with the date in the name
2. Confirm the backup was created
3. Then proceed with the edits or build

If the build or edit fails for any reason, restore from the backup.
Never delete backups automatically. The instructor will clean them up manually.

---

## ================================================================
## NEW MATERIAL CHECK - RUN AT THE START OF EVERY BUILD
## ================================================================

At the very start of every \`build\` command, before showing the menu,
always ask this first:

---
Have you added any new textbook or test bank files since last time?
(yes / no)
---

If they say **yes**, tell them:

---
Run this in the terminal first, then come back and type build again:

  node scripts/convert-refs.js

This converts your new .docx files so the generator can use them
as reference material when building content.
---

If they say **no**, proceed immediately to the build menu.

---

## ================================================================
## THE BUILD COMMAND
## ================================================================

When the user types "build" (by itself, lowercase or uppercase), always
follow this exact interactive flow. Do not skip steps. Do not assume.

### STEP 1: Ask what to build

Respond with exactly this numbered list:

---
What would you like to build?

1. Hands-On Test (HOT)
2. Mind Map
3. Study Guide
4. Labs
5. Syllabus
6. Instructor Only - TS Guide For HOTs
7. Instructor Only - TS Guide For Labs
8. Instructor Only - Answer Sheet For HOTs
9. Instructor Only - Answer Sheet For Labs
10. Instructor Only - Grading Rubric For HOTs
11. Instructor Only - Grading Rubric For Labs
12. Instructor Only - Module Outline
13. Attendance Consultation Forms
14. Other

Type the number of your choice.

---

### STEP 2: Ask which class

After the user picks a number, respond with exactly this numbered list:

---
Which class is this for?

${courseNumberedList}
${courseOtherNumber}. Other (type the name of the new class)

Type the number of your choice.

---

**If they choose ${courseOtherNumber} (Other):**
- Ask them to type the name of the new class
- Spell it back to them and ask: "I will create a new class called [NAME]. Is that spelling correct? (yes/no)"
- If yes: create the full folder structure for the new class
- If no: ask them to type the name again and repeat the confirmation
- After creating: confirm the folders were created and continue to Step 3

### STEP 3: Ask clarifying questions for the specific deliverable

Based on what they chose in Step 1, ask the relevant questions:

**For HOT:**
- What module or topic is this HOT for?
- How many minutes should the timer be set to? (default 45)
- How many screenshot tasks will there be?
- Any special instructions?

**For Mind Map:**
- What module or topic is this mind map for?
- Do you have a source DOCX to extract content from? If yes, read it first.
- How many top-level branches? (default 4-6, based on major topic areas)
- Any specific exam objectives or domains to emphasize?
- After collecting answers: write the JSON data file, then run:
  \`node scripts/generate-mindmap.js <data.json> <output.html>\`

**For Study Guide:**
- What module or topic is this study guide for?
- Any specific topics to emphasize?

**For Labs:**
- What module or topic are the labs for?
- How many labs?
- Phase nav or linear format?

**For Instructor Only items:**
- What deliverable is this guide/rubric/sheet for? (which HOT, lab, or study guide)
- What module or topic?

**For Attendance Consultation Forms:**
- Ask: "Do you have your attendance Excel file ready to drop in, or do you want to point me to one already in the classes folder?"
- Run the script:
  \`\`\`
  python scripts/generate-attendance-forms.py --xlsx [path to xlsx]
  \`\`\`
- Forms are saved to: \`attendance/\`

**For Other:**
- Ask open-ended: "Describe what you want to build. Be as detailed as you like."
- Ask follow-up questions until you fully understand the request
- Show a build plan and ask for approval before starting

### STEP 4: Confirm before building

Before generating anything, show a one-line summary:
"Building: [deliverable type] for [class] - [topic/module]. Starting now."

Then generate the complete file and save it to the correct output folder.

### STEP 5: Save to correct output folder

All new files go to UnderDevelopment/ first. When the instructor confirms a file is finished, move it to Final/.

| Deliverable | Path |
|---|---|
| Hands-On Test | classes/[CLASS]/output/HandsOnTests/UnderDevelopment/ |
| Mind Map | classes/[CLASS]/output/MindMaps/UnderDevelopment/ |
| Study Guide | classes/[CLASS]/output/StudyGuides/UnderDevelopment/ |
| Labs | classes/[CLASS]/output/LabPackets/UnderDevelopment/ |
| TS Guide For HOTs | classes/[CLASS]/output/InstructorOnly/TSGuidesForHOTs/UnderDevelopment/ |
| TS Guide For Labs | classes/[CLASS]/output/InstructorOnly/TSGuidesForLabs/UnderDevelopment/ |
| Answer Sheet For HOTs | classes/[CLASS]/output/InstructorOnly/AnswerSheetsForHOTs/UnderDevelopment/ |
| Answer Sheet For Labs | classes/[CLASS]/output/InstructorOnly/AnswerSheetsForLabs/UnderDevelopment/ |
| Grading Rubric For HOTs | classes/[CLASS]/output/InstructorOnly/GradingRubricsForHOTs/UnderDevelopment/ |
| Grading Rubric For Labs | classes/[CLASS]/output/InstructorOnly/GradingRubricsForLabs/UnderDevelopment/ |
| Module Outline | classes/[CLASS]/output/InstructorOnly/ModuleOutlines/UnderDevelopment/ |
| Syllabus | classes/[CLASS]/output/UnderDevelopment/ |
| Attendance Forms | attendance/ |

When the instructor marks a file as final, move it to the matching Final/ folder.

File naming: \`[CLASS]_[TYPE]_[Topic].html\`

---

## ================================================================
## AUTOMATED TESTING AND QA
## ================================================================

Every generated file goes through two layers of validation before
the instructor reviews it.

### Layer 1: Structural Tests (automatic, runs after every generate)

Run manually any time:
\`\`\`
node scripts/test.js [filepath]           Test one file
node scripts/test.js --all               Test all UnderDevelopment files
\`\`\`

**What structural tests check:**
- Valid HTML structure (DOCTYPE, html, head, body)
- No em dashes
- Required elements: course-badge, h1, subtitle, phase-nav, print button
- No unresolved placeholders ({{, }}, [TODO])
- File ends with \`</html>\` (not truncated)
- File is at least 10KB (not a stub)

**HOT-specific checks:**
- Timer, startTimer(), ssLoadFile, ss-paste-receptor present
- At least 3 screenshot boxes
- Screenshot boxes NOT nested inside .step (direct .phase children)
- Help Me panel present
- Reflection rubric and score calculator present
- ss-missing-placeholder for print grading present

**Study Guide-specific checks:**
- At least 4 phases
- PBQs, Deep Dives, Key Terms, Exam Tip, Exam Trap all present
- File is at least 50KB (guards against condensed output)

Test results save to \`workflows/test-results/\` as JSON files.

---

### Layer 2: AI Quality Review (on demand)

\`\`\`
node scripts/qa.js [filepath]                  Review one file
node scripts/qa.js --pending                   Review all files with no QA yet
\`\`\`

QA reports save to \`workflows/test-results/\` as \`.qa.json\` files.

---

| Command | What happens |
|---|---|
| \`build\` | Starts the interactive build workflow above |
| \`batch [class] [module]\` | Generates ALL required deliverables for a module automatically |
| \`test [filename]\` | Runs structural validation on a file |
| \`test all\` | Runs structural validation on all UnderDevelopment files |
| \`qa [filename]\` | Runs AI quality review on a file |
| \`qa all\` | Runs AI quality review on all files with no QA report yet |
| \`patch [filename] [instructions]\` | Edits an existing file with targeted changes |
| \`status [class]\` | Shows completion status for a class |
| \`list classes\` | Lists all classes and their output folders |
| \`mark final [filename]\` | Moves a file from UnderDevelopment/ to Final/ |
| \`mark final all [class] [type]\` | Moves all UD files of a type to Final/ for a class |
| \`log\` | Shows recent session actions (last 10) |
| \`log [N]\` | Shows last N session actions |
| \`daily report\` | Shows today's full daily report |
| \`resume\` | Detects partial files, failed tasks, and picks up where work stopped |
| \`init\` | Pre-loads templates, CSS, and course configs into session cache |
| \`help\` | Shows the full command reference |
| \`commands\` | Same as help |

---

## ================================================================
## BATCH COMMAND - AUTOMATED PIPELINE
## ================================================================

The \`batch\` command queues and generates ALL required deliverables for
a single module automatically.

### Usage
\`\`\`
batch [class] [module number]
\`\`\`

### What happens when you type batch

STEP 1: Read \`courses/[code].json\` to get the module title, topics,
and deliverables required.

STEP 2: Check the module status. Identify which deliverables are still pending.

STEP 3: If all deliverables are already complete, report:
"All deliverables for [Class] Module [N] are already complete."

STEP 4: Show the plan and run the generation pipeline.

STEP 5: After generation completes, show a summary of files created.

---

## ================================================================
## STATUS COMMAND
## ================================================================

The \`status\` command reads the course JSON and displays a formatted
completion table for that class.

### Usage
\`\`\`
status [class]
status all
\`\`\`

---

## ================================================================
## ALWAYS SHOW COMMAND BAR - NEVER SKIP THIS
## ================================================================

After EVERY single response, no matter what, always append this exact
command bar at the very bottom. No exceptions.

---
> **Quick Commands:** \`/build\` &nbsp;|&nbsp; \`/batch [class] [module]\` &nbsp;|&nbsp; \`/test [file]\` &nbsp;|&nbsp; \`/qa [file]\` &nbsp;|&nbsp; \`/status [class]\` &nbsp;|&nbsp; \`/log\` &nbsp;|&nbsp; \`/resume\` &nbsp;|&nbsp; \`/daily-report\` &nbsp;|&nbsp; \`/help\` &nbsp;|&nbsp; \`/init\` &nbsp;|&nbsp; \`/final [file]\` &nbsp;|&nbsp; \`/patch [file] [fix]\`

---

## ================================================================
## CHUNKING PROTOCOL - NEVER VIOLATE
## ================================================================

Large HTML files WILL exceed the context limit if written in one shot.
Always follow this protocol for any deliverable longer than ~200 lines.

### RULE 1: Always build in sections, never all at once.

Break every file into these sections and write them one at a time:
1. HTML head + CSS styles
2. Header + navigation + phase 1 content
3. Phase 2 content
4. Phase 3 content (and so on)
5. Final phase + JavaScript

After each section, write: "Section [N] complete. Writing next section..."
Then immediately continue without waiting for a response.

### RULE 2: If you feel yourself approaching the limit, stop the current
section cleanly (close all open tags), save what exists as a partial file
with \`_PARTIAL\` in the name, then start a new response with:
"Continuing [filename] - picking up at [section name]..."

### RULE 3: Never write a file that ends mid-tag, mid-function, or
mid-section. Always close what you open before stopping.

### RULE 4: For very large deliverables (labs with 10+ phases, HOTs with
15+ screenshots), automatically split into multiple files with an index page.

### RULE 5: After completing any file, always report:
- File name and final save path
- Approximate size (small/medium/large)
- Whether it was split into parts
- "Mark as final when ready, or let me know what to adjust."

---

## OUTPUT RULES

1. Always save new files to the UnderDevelopment/ folder first.
2. Only move to Final/ when the instructor confirms with "mark final" or equivalent.
3. Never use em dashes anywhere. Use colons, semicolons, commas, or periods instead.
4. Files with \`final\` in the name should never be modified.
5. Files with \`UD\` in the name are under development.
6. After generating, always end with: "Saved to [full path]. Mark as final when ready, or let me know what to adjust."
7. Never truncate. If a file is getting long, follow the chunking protocol above.

---

## ================================================================
## HARD RULE: PRINT FUNCTION FOR LABS AND HOTS
## NON-NEGOTIABLE. NO EXCEPTIONS. NO VARIATIONS. EVER.
## ================================================================

Every lab packet and every HOT file MUST implement the print function
exactly as shown below. This applies to every file generated, every file
patched, and every existing file touched for any reason.

### Scoping rules:
- **Lab packets (combined files with dropdown):** Print outputs ONLY the currently selected lab, scoped via \`.lab-content.active .phase\`
- **HOTs:** Print outputs ALL phases of the entire document

---

### REQUIRED JS (exact, always):

\`\`\`javascript
function printAnswersOnly() {
    document.body.classList.add('print-answers');
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('print-answers');
        }, 500);
    }, 100);
}
\`\`\`

---

### REQUIRED PRINT CSS (exact, always):

\`\`\`css
body.print-answers .step { display: none !important; }
body.print-answers .step:has(.screenshot-box) { display: block !important; }
body.print-answers .step:has(.screenshot-box) > *:not(.screenshot-box) { display: none !important; }
body.print-answers .phase > .callout { display: none !important; }
body.print-answers .phase > .concept-box { display: none !important; }
body.print-answers .phase > .question-box { display: none !important; }
body.print-answers .phase > p { display: none !important; }
body.print-answers .phase > ul { display: none !important; }
body.print-answers .phase > ol { display: none !important; }
body.print-answers .phase > table { display: none !important; }
body.print-answers .phase h2 { display: block !important; }
body.print-answers .phase h3 { display: none !important; }
\`\`\`

For lab packets only, also add:
\`\`\`css
body.print-answers .lab-content.active .phase { display: block !important; }
\`\`\`

---

### REQUIRED: MISSING SCREENSHOT PLACEHOLDER

Every screenshot box MUST include this so the instructor can see which
screenshots a student skipped when grading printed work.

**Required CSS:**
\`\`\`css
.ss-missing-placeholder {
    display: none;
    background: #fff0f0;
    border: 2px solid ${config.primary_color};
    border-radius: 8px;
    padding: 18px;
    text-align: center;
    color: ${config.primary_color};
    font-weight: 700;
    font-size: 1em;
    margin-top: 8px;
}
.ss-missing-placeholder .ss-missing-icon {
    font-size: 2em;
    display: block;
    margin-bottom: 6px;
}
body.print-answers .ss-missing-placeholder { display: block !important; }
body.print-answers .ss-preview:has(img[src]:not([src=""])) ~ .ss-missing-placeholder { display: none !important; }
\`\`\`

**Required HTML inside every \`.ss-upload\` div, after \`.ss-preview\`:**
\`\`\`html
<div class="ss-missing-placeholder">
    <span class="ss-missing-icon">&#9888;</span>
    MISSING SCREENSHOT
</div>
\`\`\`

---

### REQUIRED PRINT BUTTON:

\`\`\`html
<button class="print-btn" onclick="printAnswersOnly()">Print Student Answers</button>
\`\`\`

---

### SCREENSHOT BOX PATTERN (CANONICAL):

\`\`\`html
<div class="step">
  <div class="step-content">
    [step instructions here]
    <div class="screenshot-box">
      <div class="ss-upload">
        <div class="ss-paste-receptor"
             ondrop="ssDrop(event,'ss1')"
             ondragover="event.preventDefault()"
             onclick="document.getElementById('ssFile1').click()">
          <span>Screenshot 1: [Description] - Drag and drop or click to upload</span>
        </div>
        <div class="ss-preview" id="ss1-preview"></div>
        <div class="ss-missing-placeholder">
            <span class="ss-missing-icon">&#9888;</span>
            MISSING SCREENSHOT
        </div>
        <input type="file" id="ssFile1" style="display:none"
               onchange="ssLoadFile(event,'ss1')" accept="image/*">
      </div>
    </div>
  </div>
</div>
\`\`\`

**Required screenshot JS:**
\`\`\`javascript
function ssLoadFile(event, id) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById(id + '-preview');
        preview.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;border-radius:6px;margin-top:8px">';
    };
    reader.readAsDataURL(file);
}
function ssDrop(event, id) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById(id + '-preview');
        preview.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;border-radius:6px;margin-top:8px">';
    };
    reader.readAsDataURL(file);
}
\`\`\`

---

## DESIGN SYSTEM

### Colors
\`\`\`
Primary Color:  ${config.primary_color}
Background: radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a14 60%, #000 100%)
Card bg:    rgba(255,255,255,0.05) with backdrop-filter: blur(10px)
Text:       #e8e8e8 primary, #aaa muted
Green:      #00d4aa  |  Yellow: #f0a500  |  Blue: #4a9eff
\`\`\`

### Typography
\`\`\`
Primary: 'Segoe UI', system-ui, sans-serif
Code:    'Courier New', monospace
H1:      text-shadow: 0 0 20px rgba(${hexToRgb(config.primary_color)}, 0.5)
\`\`\`

### Page Shell (every file)
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Title] | ${config.institution_name}</title>
  <style>/* full CSS inline */</style>
</head>
<body>
  <div class="header">
    <div class="course-badge">${config.institution_name.toUpperCase()}</div>
    <h1>[DELIVERABLE TITLE]</h1>
    <p class="subtitle">[Class Name] | [Topic or Module]</p>
  </div>
  <script>/* full JS inline */</script>
</body>
</html>
\`\`\`

### Phase Navigation
\`\`\`html
<div class="phase-nav">
  <button class="phase-btn active" onclick="showPhase(1)">Phase 1: [Name]</button>
  <button class="phase-btn" onclick="showPhase(2)">Phase 2: [Name]</button>
</div>
<div class="phase active" id="phase1"> ... </div>
<div class="phase" id="phase2"> ... </div>
\`\`\`

### Info Boxes
\`\`\`html
<div class="info-box"><strong>Info:</strong> [content]</div>
<div class="important-box"><strong>Important:</strong> [content]</div>
<div class="concept-box"><strong>Concept:</strong> [content]</div>
<div class="callout"><strong>Note:</strong> [content]</div>
\`\`\`

### HOT Timer
\`\`\`html
<div class="timer-container">
  <div class="timer" id="timer">45:00</div>
  <button onclick="startTimer()">Start</button>
  <button onclick="pauseTimer()">Pause</button>
  <button onclick="resetTimer()">Reset</button>
</div>
\`\`\`

### HOT Draggable Help Me Panel
- Commands inside are scrambled within tabs so students cannot follow them as a step-by-step guide
- Hidden by default, toggle button fixed bottom-right

### Mind Maps

Mind maps use the D3.js engine with a left-to-right tree layout. Claude generates
a JSON data file; the generator script stamps it into the template automatically.
Never hand-code SVG for mind maps.

### Thanos Banner (irreversible steps)
\`\`\`html
<div class="thanos-banner">
  IRREVERSIBLE ACTION: This step cannot be undone. Verify before proceeding.
</div>
\`\`\`

---

## GRADING SCALE (${config.institution_name} - NO DEVIATION)

| Grade | Range |
|---|---|
${gradingRows}

This scale must be used on every rubric, HOT, lab, and graded deliverable.
No rounding, no deviation. HOT and lab rubrics always include a live
score calculator in JavaScript using this exact scale.

---

## HELP / COMMANDS display

When the user types \`help\` or \`commands\`, respond with:

---
## Instructor Lab Agent - Command Reference

### Build Something
| Command | Description |
|---|---|
| \`build\` | Start here. Walks you through what to build and for which class. |
| \`batch [class] [module]\` | Generate all required deliverables for a module at once, automatically. |

### Manage Files
| Command | Description |
|---|---|
| \`mark final [filename]\` | Move a file from UnderDevelopment to Final. |
| \`mark final all [class] [type]\` | Move all under-development files of a type to Final. |
| \`patch [filename] [instructions]\` | Edit or fix an existing file. |

### Session and Tracking
| Command | Description |
|---|---|
| \`log\` | Show last 10 agent actions. |
| \`log [N]\` | Show last N actions. |
| \`daily report\` | Full daily report: files built, failures, next in queue. |
| \`resume\` | Detect partial files and failed tasks, pick up where work stopped. |
| \`init\` | Pre-load templates, CSS, and course configs into session cache. |

### Classes and Courses
| Command | Description |
|---|---|
| \`add class [name]\` | Create the full folder structure for a new class. |
| \`list classes\` | Show all classes and their folder paths. |
| \`status [class]\` | Show what is done and what is still pending for a class. |

### Deliverable Types
| Type | What it builds |
|---|---|
| \`Hands-On Test\` | Student HOT with timer, screenshot boxes, Help Me panel, rubric |
| \`Mind Map\` | Interactive expandable SVG mind map |
| \`Study Guide\` | Multi-phase HTML study guide with PBQs and Deep Dives |
| \`Labs\` | Step-by-step lab guide with screenshots and troubleshooting |
| \`Instructor Only - TS Guide For HOTs\` | Troubleshooting guide for a HOT |
| \`Instructor Only - TS Guide For Labs\` | Troubleshooting guide for a lab |
| \`Instructor Only - Answer Sheet For HOTs\` | Answer key for HOTs |
| \`Instructor Only - Answer Sheet For Labs\` | Answer key for labs |
| \`Instructor Only - Grading Rubric For HOTs\` | Scoring rubric with live calculator for HOTs |
| \`Instructor Only - Grading Rubric For Labs\` | Scoring rubric with live calculator for labs |
| \`Instructor Only - Module Outline\` | Module outline document |
| \`Syllabus\` | Full course syllabus |
| \`Attendance Forms\` | Filled PDF attendance consultation forms |
| \`Other\` | Describe anything custom and the agent figures it out |

### Available Classes
${courseList}
Plus any class you have added with \`add class\`.

### Quick Tips
- Type **build** to start any new deliverable
- Type **help** or **commands** any time to see this list
- All new files save to UnderDevelopment/ first
- Say **mark it final** or **mark final [filename]** when you are happy with a file
- Type **resume** in a new chat to pick up where the last session left off

---

## Configuration

All personalized values are stored in \`config.json\` in the repository root.
To change your settings, edit that file directly or re-run:
\`\`\`
node scripts/setup-wizard.js
\`\`\`

---
*Instructor Lab Agent - Created by Ashley Reddick (github.com/arreddick/instructor-lab-agent)*
`;
}

// ── Hex to RGB helper for CSS ──────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

// ── Course JSON template ───────────────────────────────────

function generateCourseJson(courseName, config) {
  return {
    course_name: courseName,
    course_code: classToJsonKey(courseName),
    institution: config.institution_name,
    instructor: config.instructor_name,
    primary_color: config.primary_color,
    semester_days: config.semester_days,
    modules: [],
    deliverables_required: [
      'mind-map',
      'study-guide',
      'lab',
      'hot'
    ]
  };
}

// ── Main setup flow ────────────────────────────────────────

async function main() {
  console.log('');
  console.log('============================================');
  console.log('  Instructor Lab Agent - First Run Setup');
  console.log('  Created by Ashley Reddick');
  console.log('  github.com/arreddick/instructor-lab-agent');
  console.log('============================================');
  console.log('');

  // Check if config already exists
  const configPath = path.join(REPO_ROOT, 'config.json');
  if (fs.existsSync(configPath)) {
    createInterface();
    const overwrite = await ask('config.json already exists. Overwrite? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled. Existing config.json preserved.');
      rl.close();
      process.exit(0);
    }
    rl.close();
  }

  createInterface();

  // ── Question 1: Name ──────────────────────────────────
  let instructorName = await ask('What is your name? ');
  if (!instructorName) {
    instructorName = 'Instructor';
    console.log('  Using default: "Instructor"');
  }

  // ── Question 2: Institution ───────────────────────────
  let institution = await ask('What is your institution name? ');
  if (!institution) {
    institution = 'My Institution';
    console.log('  Using default: "My Institution"');
  }

  // ── Question 3: Courses ───────────────────────────────
  let coursesRaw = await ask("What courses do you teach? (comma-separated, e.g. 'Network Security, Cloud Computing, Linux Admin'): ");
  let courses = [];
  if (coursesRaw) {
    courses = coursesRaw.split(',').map(c => sanitizeClassName(c)).filter(c => c.length > 0);
  }
  if (courses.length === 0) {
    courses = ['General'];
    console.log('  No courses entered. Using default: "General"');
  }

  // ── Question 4: Color scheme ──────────────────────────
  console.log('');
  console.log('Pick a color scheme:');
  COLOR_SCHEMES.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} (${c.hex})`);
  });
  console.log(`  6. Custom (enter your own hex code)`);
  console.log('');

  let colorChoice = await ask('Enter your choice (1-6, default 1): ');
  let primaryColor = COLOR_SCHEMES[0].hex;
  let colorName = COLOR_SCHEMES[0].name;

  const colorNum = parseInt(colorChoice, 10);
  if (colorNum >= 1 && colorNum <= 5) {
    primaryColor = COLOR_SCHEMES[colorNum - 1].hex;
    colorName = COLOR_SCHEMES[colorNum - 1].name;
  } else if (colorNum === 6 || (colorChoice && !colorNum)) {
    let customHex = colorChoice;
    if (colorNum === 6) {
      customHex = await ask('Enter your hex color code (e.g. #ff5500): ');
    }
    if (isValidHex(customHex)) {
      primaryColor = normalizeHex(customHex);
      colorName = 'Custom (' + primaryColor + ')';
    } else {
      console.log('  Invalid hex code. Using default: Classic Red (#c8102e)');
    }
  } else if (!colorChoice) {
    console.log('  Using default: Classic Red (#c8102e)');
  }

  console.log(`  Selected: ${colorName} ${primaryColor}`);

  // ── Question 5: Output format ─────────────────────────
  console.log('');
  let formatChoice = await ask('Preferred output format? (1) HTML  (2) DOCX  (3) Both  [default: 1]: ');
  let outputFormat = 'html';
  if (formatChoice === '2') outputFormat = 'docx';
  else if (formatChoice === '3') outputFormat = 'both';
  else outputFormat = 'html';
  console.log(`  Selected: ${outputFormat}`);

  // ── Question 6: Grading scale ─────────────────────────
  console.log('');
  let customScaleAnswer = await ask('Do you have a custom grading scale? (yes/no, default no): ');
  let gradingScale = DEFAULT_GRADING_SCALE;

  if (customScaleAnswer.toLowerCase() === 'yes' || customScaleAnswer.toLowerCase() === 'y') {
    const scaleText = await askMultiLine(
      'Paste your grading scale (one grade per line, format: A = 92.5-100).\n' +
      'Press Enter on an empty line when done:'
    );
    const parsed = parseGradingScale(scaleText);
    if (parsed) {
      gradingScale = parsed;
      console.log(`  Parsed ${gradingScale.length} grade levels.`);
    } else {
      console.log('  Could not parse scale. Using default grading scale.');
    }
  } else {
    console.log('  Using default grading scale.');
  }

  // ── Question 7: Semester days ─────────────────────────
  console.log('');
  let semDays = await ask('How many class days in your semester? (default: 80): ');
  let semesterDays = 80;
  const parsedDays = parseInt(semDays, 10);
  if (parsedDays > 0) {
    semesterDays = parsedDays;
  }
  console.log(`  Semester days: ${semesterDays}`);

  // ── Question 8: Logo preference ───────────────────────
  console.log('');
  let logoAnswer = await ask('Would you like to upload an institution logo later? (yes/no, default no): ');
  let logoPending = logoAnswer.toLowerCase() === 'yes' || logoAnswer.toLowerCase() === 'y';
  if (logoPending) {
    console.log('  Logo preference saved. You can add your logo to assets/ later.');
  }

  // ── Close readline before writing ─────────────────────
  rl.close();

  // ── Build config object ───────────────────────────────
  const config = {
    instructor_name: instructorName,
    institution_name: institution,
    courses: courses,
    primary_color: primaryColor,
    color_scheme: colorName,
    output_format: outputFormat,
    grading_scale: gradingScale,
    semester_days: semesterDays,
    logo_pending: logoPending,
    setup_complete: true,
    created_at: todayISO(),
    agent_version: '1.0.0'
  };

  // ── Write config.json ─────────────────────────────────
  console.log('');
  console.log('Writing config.json...');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`  Saved: ${configPath}`);

  // ── Create class folder structures ────────────────────
  console.log('');
  console.log('Creating class folder structures...');
  const classesDir = path.join(REPO_ROOT, 'classes');
  mkdirSafe(classesDir);

  for (const course of courses) {
    const folderName = classToFolderName(course);
    const courseRoot = path.join(classesDir, folderName);
    for (const sub of COURSE_FOLDERS) {
      const fullPath = path.join(courseRoot, sub);
      mkdirSafe(fullPath);
    }
    console.log(`  Created: classes/${folderName}/ (${COURSE_FOLDERS.length} subfolders)`);
  }

  // ── Create courses/ JSON files ────────────────────────
  console.log('');
  console.log('Creating course JSON files...');
  const coursesJsonDir = path.join(REPO_ROOT, 'courses');
  mkdirSafe(coursesJsonDir);

  for (const course of courses) {
    const jsonKey = classToJsonKey(course);
    const jsonPath = path.join(coursesJsonDir, jsonKey + '.json');
    if (!fs.existsSync(jsonPath)) {
      const courseData = generateCourseJson(course, config);
      fs.writeFileSync(jsonPath, JSON.stringify(courseData, null, 2), 'utf8');
      console.log(`  Created: courses/${jsonKey}.json`);
    } else {
      console.log(`  Skipped: courses/${jsonKey}.json (already exists)`);
    }
  }

  // ── Create supporting directories ─────────────────────
  const supportDirs = [
    'context',
    'templates',
    'design-system',
    'workflows/test-results',
    'attendance',
    'assets'
  ];
  console.log('');
  console.log('Creating supporting directories...');
  for (const dir of supportDirs) {
    const fullPath = path.join(REPO_ROOT, dir);
    mkdirSafe(fullPath);
  }
  console.log(`  Created ${supportDirs.length} supporting directories.`);

  // ── Generate CLAUDE.md ────────────────────────────────
  console.log('');
  console.log('Generating CLAUDE.md...');
  const claudeMdContent = generateClaudeMd(config);
  const claudeMdPath = path.join(REPO_ROOT, 'CLAUDE.md');
  fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf8');
  console.log(`  Saved: ${claudeMdPath}`);

  // ── Print summary ─────────────────────────────────────
  console.log('');
  console.log('============================================');
  console.log('  Setup Complete - Summary');
  console.log('============================================');
  console.log('');
  console.log(`  Instructor:    ${config.instructor_name}`);
  console.log(`  Institution:   ${config.institution_name}`);
  console.log(`  Courses:       ${config.courses.join(', ')}`);
  console.log(`  Color scheme:  ${config.color_scheme} (${config.primary_color})`);
  console.log(`  Output format: ${config.output_format}`);
  console.log(`  Grading scale: ${config.grading_scale.length} levels`);
  console.log(`  Semester days: ${config.semester_days}`);
  console.log(`  Logo pending:  ${config.logo_pending ? 'Yes' : 'No'}`);
  console.log('');
  console.log('  Files created:');
  console.log(`    - config.json`);
  console.log(`    - CLAUDE.md`);
  for (const course of courses) {
    console.log(`    - classes/${classToFolderName(course)}/ (full folder tree)`);
    console.log(`    - courses/${classToJsonKey(course)}.json`);
  }
  console.log('');
  console.log('  Setup complete! Open Claude Code and type /build to get started.');
  console.log('');
}

// ── Run ────────────────────────────────────────────────────

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
