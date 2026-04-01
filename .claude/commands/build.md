# Build Command

Start the interactive build workflow. Follow these steps exactly. Do not skip steps.

## Step 1: New Material Check

Ask:
"Have you added any new textbook or test bank files since last time? (yes / no)"

- If **yes**: Tell them to run `node scripts/convert-refs.js` first, then type build again.
- If **no**: Continue to Step 2.

## Step 2: What to Build

Show this numbered list:

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

## Step 3: Which Class

After the user picks a number, show:

---
Which class is this for?

1. AZ-900
2. Security Plus
3. Server
4. Linux
5. VMware
6. Operating Systems
7. Other (type the name of the new class)

Type the number of your choice.
---

If they choose 7 (Other):
- Ask for the class name
- Spell it back and confirm
- If confirmed: run `node scripts/new-class.js "[NAME]"`
- If not: ask again

## Step 4: Clarifying Questions

Ask questions specific to the deliverable type chosen. Read the CLAUDE.md for the full question sets per deliverable type.

## Step 5: Confirm

Show: "Building: [deliverable type] for [class] - [topic/module]. Starting now."

## Step 6: Generate and Save

Generate the file following all rules in CLAUDE.md (chunking protocol, design system, print function rules, etc.).

Save to the correct UnderDevelopment/ folder. After saving, report:
- File name and full save path (as ## heading)
- Approximate size
- "Mark as final when ready, or let me know what to adjust."

Then show the updated status table for that class.

## After Completion - Show Related Skills
> `/test [filename]` test it &nbsp;|&nbsp; `/qa [filename]` review it &nbsp;|&nbsp; `/final [filename]` finalize it &nbsp;|&nbsp; `/patch [filename]` fix it &nbsp;|&nbsp; `/build` build another
