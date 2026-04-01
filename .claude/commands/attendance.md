# Attendance Command

Generate attendance consultation forms from a Jenzabar attendance export. Argument: $ARGUMENTS

## Steps

1. Parse the argument:
   - If a `.xlsx` file path is given: use that file directly.
   - If no argument given: search the agent folder for any `.xlsx` file. If found, confirm with Ashley. If not found, ask him to drop the Jenzabar export into the agent folder.

2. Determine flags:
   - If Ashley says "all students" or "include zero absences": add `--all` flag.
   - Default: only students with 1+ absences.

3. Run the script:
   ```
   python scripts/generate-attendance-forms.py --xlsx [path to xlsx]
   ```
   Or with all students:
   ```
   python scripts/generate-attendance-forms.py --xlsx [path to xlsx] --all
   ```

4. After running:
   - Print the counseling summary from the terminal output so Ashley can see who needs follow-up.
   - Report the output folder path: `attendance/`
   - Show how many forms were generated.

## Trigger Phrases

All of these should run this skill:
- "generate attendance forms"
- "make attendance forms"
- "run attendance"
- "attendance forms"
- Dropping an .xlsx file and mentioning attendance

## Do NOT ask for:
- Course name, instructor, semester, or any other info. All of that is read automatically from the Excel file.

## After Completion - Show Related Skills
> `/build` build something &nbsp;|&nbsp; `/status [class]` check progress &nbsp;|&nbsp; `/help attendance` skill details
