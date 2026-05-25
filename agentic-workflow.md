# Agentic Workflow

This document describes the end-to-end development workflow supported by the `.github/` folder. It combines human-in-the-loop (HITL) design steps with fully autonomous (AFK) agent execution.

---

## Overview

```
Ideation ──► PRD ──► Issues ──► Autonomous Implementation ──► PR Review
  (HITL)    (HITL)   (HITL)           (AFK)                    (HITL)
```

---

## Step 1 — Ideation with `grill-me` (HITL)

**Skill:** `.github/skills/grill-me/SKILL.md`

Invoke the skill by typing `/grill-me` in GitHub Copilot Chat and describing your idea. The agent interviews you one question at a time, resolving every branch of the design tree before moving on. For each question it provides its own recommended answer so you can agree or redirect quickly.

If a question can be answered by exploring the codebase (e.g. "does this pattern already exist?") the agent checks rather than asking.

**Output:** shared understanding of the problem, constraints, and solution approach.

**HITL gate:** the conversation itself — you decide when the design is sufficiently resolved to move on.

---

## Step 2 — Write a PRD with `write-a-prd` (HITL)

**Skill:** `.github/skills/write-a-prd/SKILL.md`

Invoke with `/write-a-prd`. The agent:

1. Takes the outcome of the ideation session as input.
2. Explores the repo to verify assumptions against the current codebase.
3. Sketches the modules that need to be built or changed and checks them with you.
4. Writes `issues/prd.md` — a structured PRD with Problem Statement, Solution, User Stories, Implementation Decisions, and Testing Decisions.

**Output:** `issues/prd.md`

**HITL gate:** review `issues/prd.md` before proceeding. Edit it directly if anything is wrong or missing.

---

## Step 3 — Break the PRD into Issues with `prd-to-issues` (HITL)

**Skill:** `.github/skills/prd-to-issues/SKILL.md`

Invoke with `/prd-to-issues`. The agent:

1. Reads `issues/prd.md`.
2. Slices the work into thin vertical issues — each one cuts through all layers (schema, API, UI, tests) and is independently demoable.
3. Proposes the breakdown and asks you to review granularity, dependencies, and HITL/AFK classification.
4. After your approval, creates GitHub Issues via the GitHub MCP tool, in dependency order, with the correct labels:
   - `afk` — agent can work on this autonomously
   - `hitl` — requires human attention, agent will skip
   - `blocked` — has unresolved upstream dependencies (auto-removed when blockers close)

**Output:** a set of GitHub Issues ready for the dispatch pipeline.

**HITL gate:** approve the proposed issue breakdown before creation. Edit any issues on GitHub afterwards if needed.

---

## Step 4 — Autonomous Implementation with `dispatch-agent` (AFK)

**Script:** `.github/dispatch-agent/dispatch.ts`

Run the dispatcher from your terminal:

```sh
# Process the next eligible AFK issue
npx tsx .github/dispatch-agent/dispatch.ts

# Process up to 3 issues in sequence
npx tsx .github/dispatch-agent/dispatch.ts --count 3

# Preview without starting containers
npx tsx .github/dispatch-agent/dispatch.ts --count 5 --dry-run
```

For each eligible issue the dispatcher:

1. **Picks** the next open issue labelled `afk` that is not `hitl` or `blocked` by an open dependency.
2. **Spins up** a Docker container (`dispatch-agent` image) with the issue content passed as an environment variable.
3. **Runs** a three-stage pipeline inside the container:

```
Implementer → Code Review → QA → push branch → open PR
```

Each stage is a separate Copilot agent session. Each stage has one automatic retry. If a stage still fails after retry, the issue is labelled `hitl` and a comment is posted explaining what went wrong.

### Pipeline stages

| Stage | Role | Retries | Failure action |
|---|---|---|---|
| Implementer | Writes code, runs tests, commits | 1 | Retry after code review findings |
| Code Review | Reviews for quality, security (OWASP), coverage | 1 | Retry implementer then re-review |
| QA | Runs tests, checks typecheck, verifies acceptance criteria | 1 | Retry implementer + review + QA |

### Eligibility rules

An issue is skipped if it:
- Is labelled `hitl`
- Is labelled `blocked` with no body blockers (manual hold)
- Has a `## Blocked by` section in its body listing an issue that is still open

The `blocked` label is auto-removed when all body blockers are resolved.

---

## Step 5 — PR Review (HITL)

After the pipeline succeeds, a pull request is opened automatically. The PR body contains:

- The full implementation report (what was built and why)
- Code review findings
- QA results and acceptance criteria checklist
- Pipeline metrics (sessions, duration, estimated token usage)

**HITL gate:** review the PR normally. Merge, request changes, or close as appropriate.

---

## Configuration

All project-specific settings live in **`.agentic-workflow-config.json`** at the repo root. This is the only file you need to edit when setting up the workflow in a new project.

```json
{
  "install": "pnpm install",
  "test": "npm run test",
  "typecheck": "npm run typecheck",
  "context": "Free-text description of your project's tech stack, folder structure, and conventions."
}
```

| Field | Purpose |
|---|---|
| `install` | Command the agent runs inside the container to install dependencies |
| `test` | Command to run the test suite |
| `typecheck` | Command to run the type checker |
| `context` | Injected as `# PROJECT CONTEXT` into every specialist prompt (implementer, reviewer, QA). Describe your stack, key folders, and conventions here. |

The `context` field is the main lever for steering agent behaviour. A good context entry covers:
- Framework and runtime (e.g. React Router v7, Drizzle ORM, SQLite)
- Key folder roles (e.g. `app/services/` — business logic)
- Naming and testing conventions
- Package manager

If `.agentic-workflow-config.json` is missing, the container exits immediately with an error pointing to this file.

---

## What is included out of the box

Everything in `.github/` is generic and ready to use in any Node.js project:

| Path | What it is |
|---|---|
| `.github/dispatch-agent/dispatch.ts` | Host-side orchestrator — picks issues, launches containers |
| `.github/dispatch-agent/entrypoint.ts` | Container pipeline — clone, install, implement, review, QA, PR |
| `.github/dispatch-agent/Dockerfile` | Container image — Node LTS + pnpm + GitHub CLI + Copilot CLI |
| `.github/dispatch-agent/prompt-issue.md` | Implementer specialist instructions (generic) |
| `.github/dispatch-agent/prompt-code-review.md` | Code reviewer specialist instructions (generic) |
| `.github/dispatch-agent/prompt-qa.md` | QA specialist instructions (generic) |
| `.github/skills/grill-me/` | Ideation interview skill |
| `.github/skills/write-a-prd/` | PRD generation skill |
| `.github/skills/prd-to-issues/` | PRD → GitHub Issues skill |
| `.github/skills/tdd/` | Test-driven development skill (used by the implementer) |
| `.github/skills/improve-codebase-architecture/` | Architecture review skill |

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running with the Linux engine
- [GitHub CLI](https://cli.github.com) authenticated (`gh auth login`)
- Docker image built once: `docker build -t dispatch-agent ./.github/dispatch-agent`
- GitHub labels created: `afk`, `hitl`, `blocked`

---

## Setting up in a new project

1. Copy the `.github/` folder into your repo root.
2. Create `.agentic-workflow-config.json` at the repo root and fill in the four fields.
3. Build the Docker image: `docker build -t dispatch-agent ./.github/dispatch-agent`
4. Create the three GitHub labels: `afk`, `hitl`, `blocked`.
5. Start the workflow at Step 1.
