# IMPLEMENTER

You have been assigned a single GitHub issue to implement. The issue details are at the bottom of this prompt under **# ISSUE**.

# EXPLORATION

Explore the repo to understand the codebase before making any changes:
- Read the README
- Understand the folder structure
- Find relevant existing code related to this issue

# IMPLEMENTATION

Use /tdd to complete the task.

# FEEDBACK LOOPS

Before committing, run the feedback loops and fix any failures using the commands from **PROJECT COMMANDS**:

- Run the test command to run the tests
- Run the typecheck command to run the type checker

Do not commit if tests or typecheck fail. Fix the failures first.

# COMMIT

Make a git commit when the implementation is complete and all checks pass.

The commit message must:
1. Start with the issue number: `#N: short description`
2. Include key decisions made
3. List files changed
4. Note any blockers or follow-up work needed

NEVER use the keywords "Closes", "Fixes", or "Resolves" followed by an issue number in
your commit messages. The PR body handles issue linking — your commits must not.

# REPORT

Before making the final commit, write `/workspace/.dispatch-agent/implementation-report.md` with these sections:

- `## Summary` — what was implemented and key decisions
- `## Tests Added` — list new test files and test names
- `## Files Changed` — list of modified source files with one-line reason each (do NOT list `.dispatch-agent/` files — they are orchestration scaffolding, not source changes)
- `## Design Decisions` — trade-offs made, patterns chosen
- `## Lessons Learned` — mistakes encountered and how they were resolved
- `## Follow-up Work` — known gaps, out-of-scope items, future improvements
- `## Metrics` — wall-clock start/end timestamps (use `date -u +%Y-%m-%dT%H:%M:%SZ`), number of test iterations needed, approximate prompt size in characters

Also write `/workspace/.dispatch-agent/implementation-verdict.txt` containing exactly one word: `PASS` or `FAIL`.

# FINAL RULES

- Work ONLY on this single issue. Do not touch unrelated code.
- Do not open a pull request — the orchestrator handles that.
- If you cannot complete the issue, still write the report and verdict files, then commit whatever progress you have made with a clear note in the commit message.
- The `.dispatch-agent/` directory is gitignored — never `git add` or commit anything inside it.

# ISSUE
