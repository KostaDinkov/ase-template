---
name: write-a-prd
description: >
  Write a PRD (Product Requirements Document) from a product idea, client brief, or feature request.
  Use when the user wants to plan a feature end-to-end, turn a vague idea into a structured spec,
  says "write a PRD", "spec this out", "let's plan this feature", or wants to document requirements
  before implementation. Produces docs/spec/{feature-name}.prd.md.
---

## Workflow

Progress through these phases in order. Skip a phase only if the information is already clear from context.

- [ ] Phase 1: Understand the brief
- [ ] Phase 2: Explore the codebase
- [ ] Phase 3: Interview the user
- [ ] Phase 4: Sketch the modules
- [ ] Phase 5: Write the PRD
- [ ] Phase 6: Confirm with the user

---

## Phase 1 — Understand the brief

Ask the user for a detailed description of:

- The problem they are trying to solve (from the user's perspective)
- Any ideas they already have for the solution
- Known constraints (timeline, tech stack, non-negotiables)

If the user provided a full brief in their initial message, proceed directly to Phase 2.

---

## Phase 2 — Explore the codebase

Explore the repo to ground the design in reality before interviewing:

- Read the README and any architecture documentation
- Find existing code related to the feature area
- Verify any assertions the user made about the current state
- Note the patterns, conventions, and modules the feature should fit into

---

## Phase 3 — Interview the user

Follow the `/grill-me` pattern: interview the user one question at a time, walking down each branch of the design tree. For each question, provide your recommended answer so the user can agree or redirect quickly.

If a question can be answered by exploring the codebase (e.g. "does this pattern already exist?"), check first rather than asking.

Stop when every significant design decision is resolved and no major open questions remain.

SKIP this phase if the context already contains an ideation conversation with clear decisions

---

## Phase 4 — Sketch the modules

Before writing, sketch the modules to build or modify:

- Prefer deep modules: a small, stable interface that encapsulates significant complexity
- Identify which modules can be tested in isolation
- Flag which existing modules change vs. which are net-new

Present the sketch to the user and confirm:

- Does this match their mental model?
- Which modules should have tests?
- Any missing pieces?

---

## Phase 5 — Write the PRD

Read the template from [assets/prd-template.md](assets/prd-template.md) and fill it in.

Determine a feature name: a 2–4 word kebab-case slug (e.g. `user-auth`, `invoice-export`, `bulk-import`).

Write the completed PRD to `docs/spec/{feature-name}.prd.md`. Create the `docs/spec/` directory if it does not exist.

Do NOT create a GitHub issue and do NOT commit the file — just write it to disk.

---

## Phase 6 — Confirm with the user

Tell the user the path of the file that was written. Ask:

> "Does the PRD look right? Any sections to adjust before we move to issues?"

If they request changes, edit the file in place — do not regenerate from scratch.

---

## Gotchas

- Output path is `docs/spec/{feature-name}.prd.md` — **not** `issues/prd.md`.
- Do not create a GitHub issue. The `/prd-to-issues` skill handles that as the next step.
- Do not include specific file paths or code snippets in the PRD — they go stale quickly.
- Write from the user's perspective, not from implementation internals.
- If the user skips the interview ("just write a draft"), write a draft and explicitly mark open decisions with `<!-- TODO: confirm with user -->` so nothing is silently assumed.
