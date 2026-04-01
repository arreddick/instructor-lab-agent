# QA Command

Run AI quality review. Argument: $ARGUMENTS (filename, "all", or "pending").

## Steps

1. If argument is "all" or "pending": run `node scripts/qa.js --pending`
2. If argument is a class name: run `node scripts/qa.js --all [class]`
3. If argument is a filename: find the file path, run `node scripts/qa.js [filepath]`
4. Display the output directly.

## After Completion - Show Related Skills
> `/patch [filename]` fix issues &nbsp;|&nbsp; `/test [filename]` re-test &nbsp;|&nbsp; `/final [filename]` finalize it
