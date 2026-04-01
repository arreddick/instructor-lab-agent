# Status Command

Show the module status table for a class. Argument: $ARGUMENTS (class name, or "all").

## How to Run

1. If no argument given, ask: "Which class? (SecurityPlus, AZ-900, Server, Linux, VMware, OperatingSystems, or all)"
2. Read the course JSON from `courses/[code].json`
3. Build the status table using these indicators:
   - `true` in JSON = ✅ (finalized)
   - `"ud"` in JSON = UD (under development)
   - `false` in JSON = ❌ (not built)

## Table Format

Show a table with these columns:
Module | Mind Map | Study Guide | Labs | HOT | Answer Guide HOT | Rubric Lab | Rubric HOT | Combined Lab | Outline

## After the Table

- Identify the next module/deliverable that needs work
- Suggest what to run next

## After Completion - Show Related Skills
> `/build` build next item &nbsp;|&nbsp; `/batch [class] [module]` batch generate &nbsp;|&nbsp; `/final [filename]` finalize a UD file &nbsp;|&nbsp; `/resume` pick up incomplete work
