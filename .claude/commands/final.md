# Mark Final Command

Move a file from UnderDevelopment/ to Final/ and update the course JSON. Argument: $ARGUMENTS (filename or "last" for the last generated file).

## Steps

1. Find the file in UnderDevelopment/ folders. If no argument given, ask for the filename.
2. If argument is "last" or "that one" or similar, use the most recently generated file.
3. Create a backup of the file before moving.
4. Move the file from UnderDevelopment/ to the matching Final/ folder.
5. Update the course JSON: set the corresponding module status field to `true`.
6. Confirm the move with before/after paths (as ## heading).
7. Show the full updated status table for that class.

## After Completion - Show Related Skills
> `/build` build next item &nbsp;|&nbsp; `/status [class]` full status &nbsp;|&nbsp; `/batch [class] [module]` batch generate
