# Help Command

Show help for a specific skill or list all skills. Argument: $ARGUMENTS

## If a skill name is given (e.g. "test", "build", "jenzabar")

Look up the skill name and display its help info from this list:

### build
Interactive workflow to build any deliverable for any class. Walks you through choosing a deliverable type, class, and topic, then generates the file.
- **Usage:** `/build`
- **Arguments:** None (interactive prompts)
- **Example:** `/build` then follow the numbered menus

### batch
Generate ALL required deliverables for a single module automatically. Reads the course JSON, queues tasks, and runs the generator.
- **Usage:** `/batch [class] [module]`
- **Arguments:** Class name and module number
- **Example:** `/batch [ClassName] 8`

### test
Run structural validation on generated files. Checks HTML structure, required elements, print function, screenshot boxes, and more.
- **Usage:** `/test [filename or all]`
- **Arguments:** A filename, a class name, or "all"
- **Examples:** `/test [ClassName]_study_guide_Module_8.html` or `/test all`

### qa
Run AI quality review on generated files. Reviews content accuracy, completeness, exam alignment, and classroom practicality.
- **Usage:** `/qa [filename or all]`
- **Arguments:** A filename, a class name, or "all"
- **Examples:** `/qa [ClassName]_lab_Module_8.html` or `/qa all`

### status
Show the module completion table for a class. Displays which deliverables are done, under development, or not started.
- **Usage:** `/status [class or all]`
- **Arguments:** A class name or "all"
- **Examples:** `/status [ClassName]` or `/status all`

### final
Move a file from UnderDevelopment/ to Final/ and update the course JSON status.
- **Usage:** `/final [filename]`
- **Arguments:** A filename, or "last" for the most recently generated file
- **Examples:** `/final [ClassName]_MindMap_Module8.html` or `/final last`

### patch
Edit an existing file with targeted changes. Creates a backup first.
- **Usage:** `/patch [filename] [instructions]`
- **Arguments:** Filename and a description of what to fix
- **Example:** `/patch [ClassName]_lab_Module_8.html "Fix Phase 3 screenshot numbering"`

### log
Show recent session actions from the session log.
- **Usage:** `/log [N]`
- **Arguments:** Optional number of entries (default 10)
- **Examples:** `/log` or `/log 25`

### daily-report
Show today's full daily report: files built, failures, slow tasks, and next in queue.
- **Usage:** `/daily-report`
- **Arguments:** None

### resume
Detect partial files, failed tasks, and pending work from the last session. Offers to continue where you left off.
- **Usage:** `/resume`
- **Arguments:** None

### init
Pre-load templates, CSS, and course configs into session cache so builds run faster.
- **Usage:** `/init`
- **Arguments:** None

### attendance
Generate attendance consultation PDF forms from an attendance Excel export. Reads student names, absences, and tardies from the spreadsheet and fills in the form template automatically.
- **Usage:** `/attendance [xlsx file]`
- **Arguments:** Optional path to a .xlsx file. If omitted, searches the agent folder for one.
- **Examples:** `/attendance Attendance_Spring2026.xlsx` or `/attendance`
- **Flags:** Say "all students" or "include zero absences" to generate forms for every student, not just those with absences.

### jenzabar
Convert markdown exam/quiz files to Jenzabar LMS cartridge zip files for import.
- **Usage:** `/jenzabar [file or folder or class]`
- **Arguments:** A .md file path, a folder of .md files, or a class name
- **Examples:** `/jenzabar Exam_MC.md` or `/jenzabar [ClassName]`

### usage
Open the Claude AI usage page in your browser to check session and weekly limits.
- **Usage:** `/usage`
- **Arguments:** None

### show_agent_skills
Display the full list of all available skills with descriptions.
- **Usage:** `/show_agent_skills`
- **Arguments:** None

### help
Show this help reference. Add a skill name to get details on that specific skill.
- **Usage:** `/help [skill]`
- **Arguments:** Optional skill name
- **Examples:** `/help test` or `/help jenzabar` or `/help` (shows all)

---

## If no argument is given, show the full reference:

---

## Instructor Lab Agent - Skill Reference

For help on any specific skill: `/help [skill name]`

### Build
| Skill | Description |
|-------|------------|
| `/build` | Interactive workflow to build any deliverable for any class |
| `/batch [class] [module]` | Generate all deliverables for a module at once |

### Files
| Skill | Description |
|-------|------------|
| `/final [filename]` | Move a file from UnderDevelopment to Final and update status |
| `/patch [filename] [instructions]` | Edit an existing file with backup |

### Quality
| Skill | Description |
|-------|------------|
| `/test [filename or all]` | Run structural validation on files |
| `/qa [filename or all]` | Run AI quality review on files |

### Conversion and Forms
| Skill | Description |
|-------|------------|
| `/jenzabar [file or folder]` | Convert markdown exams to Jenzabar LMS cartridge zips |
| `/attendance [xlsx]` | Generate attendance consultation PDF forms from attendance export |

### Tracking
| Skill | Description |
|-------|------------|
| `/status [class or all]` | Show module completion table for a class |
| `/log [N]` | Show last N session actions (default 10) |
| `/daily-report` | Full daily summary: built, failed, next in queue |
| `/resume` | Detect partial files and pick up where work stopped |
| `/init` | Pre-load templates and configs into session cache |

### Reference
| Skill | Description |
|-------|------------|
| `/help` | Show this reference (add a skill name for details) |
| `/show_agent_skills` | Show all skills with descriptions |

### Quick Tips
- All new files save to UnderDevelopment/ first
- Say `/final [filename]` when you are happy with a file
- Use `/resume` in a new chat to pick up from last session
- Status uses: finalized, UD (UnderDevelopment), not built
- For help on any skill: `/help [skill name]`

---
