# {Feature Name}

> **Status:** Draft
> **Author:** {author}
> **Created:** {date}

---

## Problem Statement

The problem the user is facing, written from the user's perspective. Focus on the pain and its consequences — not the solution.

---

## Solution

The proposed solution from the user's perspective. Describe outcomes and observable behaviours, not implementation steps.

---

## User Stories

A numbered list of user stories covering all aspects of the feature. Be exhaustive — include happy paths, edge cases, error states, and admin/operator scenarios.

Format: `As a <actor>, I want <capability>, so that <benefit>.`

1. As a [role], I want [capability], so that [benefit].
2. ...

---

## Implementation Decisions

Key decisions made during the planning phase. Include all of the following that apply:

- **Modules built or modified** — name each module and briefly describe its interface
- **Architecture** — patterns, layers, or structural decisions
- **Schema changes** — data model additions or modifications (no DDL, describe intent)
- **API contracts** — new or changed endpoints, request/response shapes
- **Interactions** — notable component-to-component or service-to-service flows
- **Libraries / tools** — specific third-party choices and why

Do NOT include specific file paths or code snippets — they become outdated quickly.

---

## Testing Decisions

- **What makes a good test** — test external behaviour, not implementation details; tests should survive internal refactors
- **Modules to test** — which modules have unit or integration tests written for them
- **Prior art** — existing tests in the codebase that serve as a reference for style and approach

---

## Out of Scope

Explicit list of things that are intentionally excluded from this PRD. Be specific — this prevents scope creep and clarifies what a follow-up PRD would cover.

---

## Further Notes

Open questions, deferred decisions, dependencies on other work, or context that doesn't fit above.
