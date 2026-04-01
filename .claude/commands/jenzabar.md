# Jenzabar LMS Converter

Convert markdown exam/quiz files to Jenzabar LMS cartridge zip files. Argument: $ARGUMENTS

## Steps

1. Parse the argument:
   - If it is a single `.md` file path: convert that one file.
   - If it is a folder path: batch convert all `.md` files in that folder.
   - If it is a class name: look in `classes/[CLASS]/HomeworkQuestions/` for `.md` files and batch convert them.
   - If no argument given: ask the instructor which file or folder to convert.

2. Determine the output folder:
   - Default: same folder as the input, in a `jenzabar_output/` subfolder.
   - Create the output folder if it does not exist.

3. Run the conversion:
   - Single file: `python scripts/jenzabar-skill/md_to_jenzabar.py <input.md> <output_folder>/`
   - Batch: `python scripts/jenzabar-skill/batch_convert.py <input_folder>/ <output_folder>/`

4. Display the results:
   - Number of questions parsed (MC, T/F, multi-answer counts)
   - Output zip file path(s)
   - Any errors or files that failed to parse

## Input Format Reminder

Markdown with `**1.**` bold numbered questions, `A. B. C. D.` lettered choices, `**Answer: X**`, and optional `**Rationale:**` lines.

## After Completion - Show Related Skills
> `/build` create deliverables &nbsp;|&nbsp; `/status [class]` check progress &nbsp;|&nbsp; `/batch [class] [module]` generate module
