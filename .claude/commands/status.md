# Status Command

Show the module status table for a class. Argument: $ARGUMENTS (class name, or "all").

## How to Run

1. If no argument given, ask which class. List the available classes from `courses/` folder, or "all".
2. Read the course JSON from `courses/[code].json`
3. Build the status table using these indicators:
   - `true` in JSON = finalized
   - `"ud"` in JSON = UD (under development)
   - `false` in JSON = not built

## Table Format

Show a table with columns matching the deliverable types defined in the course JSON (e.g. Module, Mind Map, Study Guide, Labs, HOT, etc.).

## After the Table

- Identify the next module/deliverable that needs work
- Suggest what to run next

## After Completion - Show Related Skills
> `/build` build next item &nbsp;|&nbsp; `/batch [class] [module]` batch generate &nbsp;|&nbsp; `/final [filename]` finalize a UD file &nbsp;|&nbsp; `/resume` pick up incomplete work
