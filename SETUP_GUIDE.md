# Instructor Lab Agent -- Setup Guide

This guide walks you through everything you need to install and configure to start generating course materials with the Instructor Lab Agent. No prior experience with VS Code or command-line tools is assumed.

---

## Table of Contents

1. [Install VS Code](#1-install-vs-code)
2. [Install Node.js](#2-install-nodejs)
3. [Install Python](#3-install-python)
4. [Install the Claude Code Extension](#4-install-the-claude-code-extension)
5. [Sign Up for Claude](#5-sign-up-for-claude)
6. [Get the Project Files](#6-get-the-project-files)
7. [Run the Setup Wizard](#7-run-the-setup-wizard)
8. [Understand the Folder Structure](#8-understand-the-folder-structure)
9. [Add Your Course Content](#9-add-your-course-content)
10. [Build Your First Deliverable](#10-build-your-first-deliverable)
11. [Review and Finalize Files](#11-review-and-finalize-files)
12. [Troubleshooting Common Issues](#12-troubleshooting-common-issues)

---

## 1. Install VS Code

VS Code (Visual Studio Code) is a free code editor made by Microsoft. The Instructor Lab Agent runs inside it.

1. Go to [https://code.visualstudio.com/Download](https://code.visualstudio.com/Download)
2. Download the installer for your operating system (Windows, macOS, or Linux)
3. Run the installer and follow the prompts
4. On Windows, check the box that says "Add to PATH" during installation -- this allows you to open VS Code from the command line

After installation, open VS Code to confirm it launches correctly. You should see a Welcome tab.

---

## 2. Install Node.js

Node.js is a program that runs JavaScript outside of a web browser. The agent's build scripts, test tools, and generators all require it.

1. Go to [https://nodejs.org/en/download](https://nodejs.org/en/download)
2. Download the **LTS** version (Long Term Support). This is the stable, recommended version. As of this writing, version 18 or higher is required.
3. Run the installer and follow the prompts. Accept the default settings.
4. To verify it installed correctly, open VS Code, then open the terminal (menu: Terminal > New Terminal) and type:
   ```
   node --version
   ```
   You should see a version number like `v20.11.0` or similar. Any version 18 or higher is fine.

---

## 3. Install Python

Python is used for two features: generating attendance consultation forms from Jenzabar exports, and converting exam files to Jenzabar LMS import format. If you do not plan to use either of these features, you can skip this step for now and install it later.

1. Go to [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Download the latest version (3.6 or higher is required)
3. **Important (Windows users):** During installation, check the box that says **"Add Python to PATH"** on the very first screen of the installer. This allows VS Code to find Python when running scripts. If you miss this step, you will need to uninstall and reinstall Python with the box checked.
4. Complete the installation with default settings.
5. To verify, open the VS Code terminal and type:
   ```
   python --version
   ```
   You should see a version number like `Python 3.12.2`. Any version 3.6 or higher is fine.

   On some systems, the command may be `python3` instead of `python`. Either is fine.

---

## 4. Install the Claude Code Extension

The Claude Code extension connects VS Code to the Claude AI service. This is the interface you use to talk to the agent.

1. Open VS Code
2. Click the **Extensions** icon in the left sidebar (it looks like four small squares, with one square detached)
3. In the search bar at the top, type **Claude Code**
4. Find the extension published by Anthropic and click **Install**
5. After installation, you will see a Claude Code icon in the left sidebar or a panel you can open

If you do not see the extension in the marketplace, make sure your VS Code is up to date (menu: Help > Check for Updates).

---

## 5. Sign Up for Claude

The agent uses Claude AI to generate course materials. This requires an active Claude subscription.

1. Go to [https://claude.ai](https://claude.ai) and create an account if you do not already have one
2. Subscribe to either the **Pro** or **Max** plan. The free tier does not provide the API access needed by the Claude Code extension. Pricing details are available on the Claude website.
3. Once subscribed, open the Claude Code panel in VS Code. It will prompt you to sign in with your Claude account. Follow the authentication steps.

After signing in, you should see a text input area in the Claude Code panel where you can type commands.

---

## 6. Get the Project Files

You need to download the Instructor Lab Agent project files to your computer. There are two ways to do this.

### Option A: Clone with Git (recommended)

If you have Git installed (it comes with most development setups, and the VS Code installer may have offered to install it):

1. Open VS Code
2. Open the terminal (menu: Terminal > New Terminal)
3. Navigate to the folder where you want to store the project. For example:
   ```
   cd Documents
   ```
4. Run:
   ```
   git clone https://github.com/arreddick/instructor-lab-agent.git
   ```
5. Open the project folder:
   ```
   code instructor-lab-agent
   ```

VS Code will open a new window with the project loaded.

### Option B: Download as ZIP

If you do not have Git installed or prefer not to use the command line:

1. Go to [https://github.com/arreddick/instructor-lab-agent](https://github.com/arreddick/instructor-lab-agent)
2. Click the green **Code** button near the top right
3. Click **Download ZIP**
4. Extract the ZIP file to a location you can easily find (such as your Documents folder)
5. In VS Code, go to File > Open Folder and select the extracted `instructor-lab-agent` folder

---

## 7. Run the Setup Wizard

The setup wizard checks your environment, creates the required folder structure, and walks you through initial configuration.

1. In VS Code, open the terminal (menu: Terminal > New Terminal)
2. Run:
   ```
   node scripts/setup-wizard.js
   ```
3. Follow the prompts. The wizard will:
   - Verify that Node.js and Python are installed
   - Create the folder structure for your courses
   - Ask which classes you want to set up
   - Generate initial configuration files

If the wizard reports any errors, address them before continuing. The most common issue is a missing Node.js or Python installation (see steps 2 and 3 above).

---

## 8. Understand the Folder Structure

After setup, your project folder will look like this:

```
instructor-lab-agent/
  classes/                  One subfolder per class you teach
    AZ-900/
      TextBookFiles/        Put your textbook chapter files here
      TestBankFiles/        Put your test bank files here
      output/               Generated files go here automatically
        MindMaps/
          UnderDevelopment/  Files being worked on
          Final/            Approved, finished files
        StudyGuides/
          UnderDevelopment/
          Final/
        LabPackets/
          UnderDevelopment/
          Final/
        HandsOnTests/
          UnderDevelopment/
          Final/
        InstructorOnly/     Answer sheets, rubrics, TS guides
    SecurityPlus/
      (same structure)
  courses/                  Configuration files for each class
  scripts/                  Build tools (you generally do not edit these)
  templates/                HTML templates (you generally do not edit these)
  workflows/                Task queue and session logs
```

Key points:

- **TextBookFiles** and **TestBankFiles** are where you put your source material. The agent reads from these folders when building deliverables.
- **UnderDevelopment** is where new files are saved. Nothing goes directly to Final.
- **Final** is where files move after you review and approve them.

---

## 9. Add Your Course Content

Before the agent can generate materials, it needs your source content.

### Textbook Files

Place your textbook chapter files into the `TextBookFiles` folder for the relevant class. For example:

```
classes/SecurityPlus/TextBookFiles/Chapter_8.docx
classes/AZ-900/TextBookFiles/Module_1.pdf
```

Supported formats: PDF, DOCX, TXT, MD

### Test Bank Files

Place your test bank files into the `TestBankFiles` folder for the relevant class. For example:

```
classes/SecurityPlus/TestBankFiles/Mod_08_TestBank.docx
```

### Converting Files for the Agent

After adding new files, run the converter so the agent can read them:

1. Open the VS Code terminal
2. Run:
   ```
   node scripts/convert-refs.js
   ```

This converts your DOCX and PDF files into a text format the generator can process. You only need to do this when you add new source files. The agent will remind you if it detects unconverted files.

---

## 10. Build Your First Deliverable

Now you are ready to generate your first piece of course material.

1. Open the Claude Code panel in VS Code (click the Claude icon in the left sidebar)
2. Type `/build` and press Enter
3. The agent will ask: **"Have you added any new textbook or test bank files since last time?"**
   - If you just added files and already ran `convert-refs.js`, type **no**
   - If you have new files you have not converted yet, type **yes** and follow the instructions
4. Choose what to build from the numbered list (for example, type `2` for Mind Map)
5. Choose which class (for example, type `1` for AZ-900)
6. Answer the follow-up questions about the module, topic, and any preferences
7. The agent will confirm your choices and then generate the file

When generation is complete, the agent will tell you the file name and where it was saved. Open the file in a web browser to review it.

---

## 11. Review and Finalize Files

Every generated file starts in the `UnderDevelopment` folder. This gives you a chance to review it before it is considered finished.

### Review the file

Open the generated HTML file in your web browser (double-click it in File Explorer, or right-click > Open With > your browser). Check that:

- The content is accurate
- All sections are present
- Interactive features work (mind map nodes expand, screenshot boxes accept images, timers count down)

### Run automated checks

In the Claude Code panel, you can run:

- `/test [filename]` -- checks the file structure (valid HTML, required elements present, no placeholders left behind)
- `/qa [filename]` -- runs an AI review of content accuracy, completeness, and exam alignment

### Request changes

If something needs adjustment, type `/patch [filename] [what to fix]` in the Claude Code panel. For example:

```
/patch SecurityPlus_MindMap_Module8.html Add more detail to the encryption branch
```

### Mark as final

When you are satisfied with a file, type:

```
/final [filename]
```

This moves the file from `UnderDevelopment` to `Final` and updates the course status tracker.

---

## 12. Troubleshooting Common Issues

### "node is not recognized" or "node: command not found"

Node.js is not installed or not in your system PATH. Reinstall Node.js from [https://nodejs.org](https://nodejs.org) and make sure you accept the default installation options.

### "python is not recognized" or "python: command not found"

Python is not installed or not in your system PATH. Reinstall Python from [https://python.org](https://python.org) and check the **"Add Python to PATH"** box during installation.

### Claude Code extension does not appear

Make sure VS Code is up to date. Go to Help > Check for Updates. Then search for "Claude Code" in the Extensions panel again. If it still does not appear, check your internet connection.

### "You need a Pro or Max subscription"

The Claude Code extension requires a paid Claude subscription. Go to [https://claude.ai](https://claude.ai) and subscribe to the Pro or Max plan.

### Generated file looks broken in the browser

Run `/test [filename]` to check for structural issues. Common causes:

- The file was truncated during generation (the test will flag this)
- A browser cache issue: try a hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)

### "TextBookFiles not found" or "No source material"

Make sure your textbook files are in the correct folder (`classes/[CLASS]/TextBookFiles/`) and that you have run `node scripts/convert-refs.js` after adding them.

### The agent stops mid-file

Large deliverables can approach the context limit. The agent is designed to save partial progress with `_PARTIAL` in the filename. Type `/resume` in a new Claude Code session to pick up where it stopped.

### Setup wizard fails

Read the error message carefully. The most common causes are:

- Node.js version is below 18 (run `node --version` to check)
- The terminal does not have permission to create folders (try running VS Code as administrator on Windows)

### Other issues

Type `/help` in the Claude Code panel for a full command reference. If you encounter a bug, open an issue on the [GitHub repository](https://github.com/arreddick/instructor-lab-agent/issues).

---

## What to Do Next

Once you have completed setup and built your first deliverable:

- Use `/status [class]` to see what has been built and what is still pending
- Use `/batch [class] [module]` to generate all deliverables for a module at once
- Use `/daily-report` at the start of each work session to see a summary
- Use `/resume` in a new session to continue unfinished work

For the full command reference, type `/help` in the Claude Code panel.

---

Created by **Ashley Reddick** | Ranken Technical College, Information Technology Department
YouTube: [Ashley's IT Lab](https://www.youtube.com/@ashleysitlab)
