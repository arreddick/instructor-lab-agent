# Instructor Lab Agent

**AI-powered course material generator for educators.**

Created by [Ashley Reddick](https://github.com/arreddick) | Ranken Technical College, Information Technology Department

---

## What It Does

Instructor Lab Agent is a VS Code-based tool that uses Claude AI to generate complete, interactive course materials from your existing textbook content and test banks. It produces ready-to-use HTML deliverables that students open in any web browser: no LMS plugins, no hosting, no special software.

You provide your source material. The agent builds everything else.

---

## What You Need

| Requirement | Details |
|---|---|
| VS Code | Free code editor from Microsoft |
| Claude Code extension | Available in the VS Code extension marketplace |
| Claude subscription | Pro or Max plan required (provides the AI that generates content) |
| Node.js 18+ | JavaScript runtime used by the build scripts |
| Python 3.6+ | Used for attendance forms and Jenzabar LMS export |

---

## Quick Start

1. Clone the repo:
   ```
   git clone https://github.com/arreddick/instructor-lab-agent.git
   ```

2. Open in VS Code:
   ```
   code instructor-lab-agent
   ```

3. Run the setup wizard in the VS Code terminal:
   ```
   node scripts/setup-wizard.js
   ```

4. Open the Claude Code panel and type `/build`

The setup wizard creates your folder structure, validates your environment, and walks you through adding your first course. After that, the `/build` command is your starting point for generating any deliverable.

---

## What It Builds

| Deliverable | Description |
|---|---|
| Study Guide | Multi-phase interactive HTML study guide with practice-based questions, deep dives, key terms, and exam tips |
| Mind Map | Expandable D3.js interactive mind map with detail panels, exam question coverage, and zoom/pan navigation |
| Lab Packet | Step-by-step hands-on lab with real commands, expected outputs, screenshot capture boxes, and troubleshooting sections |
| Hands-On Test (HOT) | Timed practical exam with screenshot submission, a "Help Me" reference panel, and a built-in grading rubric |
| Grading Rubric (HOTs) | Scoring rubric with a live JavaScript calculator using your institution's grading scale |
| Grading Rubric (Labs) | Same rubric format tailored to lab grading criteria |
| Answer Sheet (HOTs) | Instructor answer key for hands-on tests |
| Answer Sheet (Labs) | Instructor answer key for lab packets |
| Troubleshooting Guide (HOTs) | Instructor reference for common student issues during hands-on tests |
| Troubleshooting Guide (Labs) | Instructor reference for common student issues during labs |
| Module Outline | Structured outline of a module's topics and objectives |
| Syllabus | Full course syllabus document |
| Attendance Consultation Forms | Filled PDF forms generated from a Jenzabar attendance export spreadsheet |
| Jenzabar LMS Import | Converts markdown exam files into Jenzabar/Blackboard-compatible cartridge zip files |

All deliverables are self-contained HTML files. No internet connection is required to use them in the classroom.

---

## Available Commands

Type these in the Claude Code panel inside VS Code.

| Command | Description |
|---|---|
| `/build` | Interactive workflow to generate any deliverable for any class |
| `/batch [class] [module]` | Generate all required deliverables for a module at once |
| `/test [file]` | Run structural validation on a generated file |
| `/qa [file]` | Run AI quality review on a generated file |
| `/status [class]` | Show completion status for a class (what is done, what is pending) |
| `/log` | Show recent agent actions |
| `/resume` | Detect unfinished work and pick up where the last session stopped |
| `/daily-report` | Full summary of the day's work: files built, failures, next in queue |
| `/help` | Show the complete command reference |
| `/init` | Pre-load templates and course configurations into session cache |
| `/final [file]` | Move a completed file from under-development to final |
| `/patch [file] [fix]` | Apply targeted edits to an existing file |
| `/jenzabar [file]` | Convert a markdown exam file to a Jenzabar LMS cartridge |
| `/attendance [xlsx]` | Generate attendance consultation forms from a Jenzabar export |
| `/usage` | Show API usage statistics |
| `/show_agent_skills` | Display all available agent skills with descriptions |

---

## How It Works

1. **Add your content.** Place your textbook files (PDF, DOCX, TXT, or MD) and test bank files into the appropriate course folders.

2. **Run the converter.** The setup wizard handles this initially. For new files added later, run `node scripts/convert-refs.js` to prepare them for the generator.

3. **Build.** Type `/build` and follow the prompts. Choose what to build, choose the class, answer a few questions about the module and topic. The agent generates a complete, interactive HTML file.

4. **Review.** Open the generated file in a browser to check the content. Use `/test` for structural validation and `/qa` for an AI quality review.

5. **Finalize.** When you are satisfied, type `/final [filename]` to move the file from the working folder to the final output folder.

The agent reads your source materials, cross-references test bank content to ensure exam coverage, and produces deliverables that follow a consistent design system with your institution's branding.

---

## Supported Input Formats

| Format | Use For |
|---|---|
| PDF | Textbook chapters, reference materials |
| DOCX | Textbook chapters, episode transcripts, test banks |
| TXT | Plain text content, converted reference files |
| MD | Exam questions (for Jenzabar LMS export), notes |

---

## Folder Structure

```
instructor-lab-agent/
  classes/              Course folders (one per class)
    [CLASS]/
      TextBookFiles/    Your textbook content goes here
      TestBankFiles/    Your test bank files go here
      output/           Generated deliverables
        MindMaps/
        StudyGuides/
        LabPackets/
        HandsOnTests/
        InstructorOnly/
  courses/              Course configuration JSON files
  context/              Reference files (syllabus rules, verified resources)
  templates/            HTML templates used by the generator
  design-system/        Design tokens and schema files
  scripts/              All build, test, and utility scripts
  workflows/            Task queue, session logs, test results
  assets/               Static assets (logos, form templates)
  attendance/           Generated attendance consultation forms
```

Each class folder under `classes/` contains the same structure. New classes are created automatically when you use `/build` and select "Other," or by running `node scripts/new-class.js "Class Name"`.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Credits

Created by **Ashley Reddick**
Ranken Technical College, Information Technology Department
YouTube: [Ashley's IT Lab](https://www.youtube.com/@ashleysitlab) -- "From Curious to Certified"

For questions, issues, or contributions, visit the [GitHub repository](https://github.com/arreddick/instructor-lab-agent).
