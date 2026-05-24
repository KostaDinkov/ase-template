---
name: prd-to-issues
description: Break a PRD into independently-workable GitHub Issues. Use when the user wants to turn a PRD into a list of concrete tasks tracked on GitHub.
---

# PRD to Issues

Break a PRD into independently-grabbable issues using vertical slices (tracer bullets), created directly as GitHub Issues.

## Process

### 1. Locate the PRD

Ask the user for the PRD file path (e.g. `issues/prd.md`).

If the PRD is not already in your context window, read it from the file.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Create GitHub Issues via MCP

Create a GitHub Issue for each approved slice using the `mcp_github_github_issue_write` tool.

Create issues in dependency order so blockers already have real GitHub issue numbers by the time dependents are created.

#### 5a. Ensure labels exist

Before creating issues, verify the three workflow labels exist. Use `mcp_github_github_get_label` for each:

- `afk` — agent can work on this autonomously
- `hitl` — requires human in the loop, agent must skip
- `blocked` — has unresolved upstream dependencies

If any label is missing, note it for the user to create manually before proceeding.

#### 5b. Create each issue

Call `mcp_github_github_issue_write` for each slice. Set:

- **title**: the slice's short title
- **body**: use the template below
- **labels**: assign according to slice type:
  - AFK slice with no blockers → `["afk"]`
  - AFK slice with blockers → `["afk", "blocked"]`
  - HITL slice → `["hitl"]`

<issue-template>
## Parent PRD

Link or filename of the PRD (e.g. `issues/prd.md`)

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- #N (GitHub issue number of blocker, if any)

Or "None - can start immediately" if no blockers.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

</issue-template>

#### 5c. Report

After all issues are created, output a summary table:

| GitHub Issue | Title | Labels |
|---|---|---|
| #1 | Short title | afk |
| #2 | Short title | afk, blocked |
