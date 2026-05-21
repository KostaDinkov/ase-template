---
applyTo: "**"
---

# General Instructions

## Commit Messages

Use Conventional Commits for every commit:

```
type(scope): short description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`
Scope: the service or area changed (e.g. `api`, `frontend`, `ci`, `proxy`, `observability`)

## Pull Requests

- One PR per logical change; keep diffs small and reviewable
- PR title must be a valid Conventional Commit subject
- Fill in all sections of the PR template, including the **Agent Implementation Report**
- Link the originating issue with `Closes #<issue-number>`

## Spec-First Workflow

1. Create or be assigned a GitHub Issue (feature spec / agent task / bug report)
2. Read the full issue before writing any code
3. Ask clarifying questions in the issue comments if requirements are ambiguous
4. Implement on a `feature/<slug>` branch
5. Open a PR, run `make test && make lint` for every changed service, confirm all pass
6. Request review — do not merge your own PR

## Security Baseline

- Never commit secrets, tokens, passwords, or private keys
- All user-supplied input must be validated at service boundaries
- Dependencies must be pinned (lock files committed); update via Dependabot PRs
- Container images must run as a non-root user

## File Hygiene

- Do not commit generated files (`node_modules/`, `__pycache__/`, `.next/`, `dist/`)
- Keep `.env.example` up to date whenever a new env var is introduced
- Delete dead code rather than commenting it out
