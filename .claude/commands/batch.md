# Batch Command

Generate all deliverables for a module. Argument: $ARGUMENTS (e.g. "SecurityPlus 8").

## Steps

1. Parse class and module number from arguments.
2. Read `courses/[code].json` for module info and status.
3. Identify which deliverables are still `false`.
4. If all done, report that and stop.
5. Show the plan: list what will be generated.
6. Check that source files exist in TextBookFiles/. Warn if missing.
7. Run: `node scripts/add-task.js --batch [course] module[N]`
8. Run: `node scripts/generate.js --course [course]`
9. Show summary of files created.
10. Show updated status table.

## After Completion - Show Related Skills
> `/test all` validate all &nbsp;|&nbsp; `/qa all` review all &nbsp;|&nbsp; `/final [filename]` finalize files &nbsp;|&nbsp; `/status [class]` check progress
