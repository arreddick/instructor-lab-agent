# Patch Command

Edit an existing file with targeted changes. Argument: $ARGUMENTS (filename and instructions).

## Steps

1. Parse filename and instructions from arguments.
2. Find the file in UnderDevelopment/ or Final/ folders.
3. Create a backup with `_BACKUP_[YYYYMMDD]` suffix before editing.
4. Confirm backup was created.
5. Make the requested changes.
6. Run `node scripts/test.js [filepath]` after editing.
7. Report results and show the file path.

## After Completion - Show Related Skills
> `/test [filename]` re-test &nbsp;|&nbsp; `/qa [filename]` review it &nbsp;|&nbsp; `/final [filename]` finalize it
