# Test Command

Run structural validation. Argument: $ARGUMENTS (filename or "all").

## Steps

1. If argument is "all": run `node scripts/test.js --all`
2. If argument is a class name: run `node scripts/test.js --all [class]`
3. If argument is a filename: find the file path, run `node scripts/test.js [filepath]`
4. Display the output directly.

## After Completion - Show Related Skills
> `/qa [filename]` AI review &nbsp;|&nbsp; `/patch [filename]` fix issues &nbsp;|&nbsp; `/final [filename]` finalize it
