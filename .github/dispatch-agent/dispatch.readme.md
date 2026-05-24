# .github/dispatch-agent/dispatch.ts

Host-side orchestrator for the Ralph AI pipeline. Picks eligible GitHub issues labelled `afk`, spins up a Docker container per issue, and streams pipeline progress to the terminal.

## Prerequisites

- [Node.js](https://nodejs.org) with `npx` available
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running with the Linux engine active
- [GitHub CLI](https://cli.github.com) authenticated (`gh auth login`)
- Docker image built: `docker build -t dispatch-agent ./.github/dispatch-agent`

## Usage

```sh
npx tsx .github/dispatch-agent/dispatch.ts [options]
```

### Options

| Flag | Short | Description | Default |
|---|---|---|---|
| `--count <n>` | `-c` | Number of issues to process in sequence | `1` |
| `--dry-run` | `-n` | Print what would happen without starting containers | off |
| `--help` | `-h` | Show help | |

### Examples

```sh
# Process the next eligible issue
npx tsx .github/dispatch-agent/dispatch.ts

# Process up to 3 eligible issues in sequence
npx tsx .github/dispatch-agent/dispatch.ts --count 3

# Preview what would run without starting Docker
npx tsx .github/dispatch-agent/dispatch.ts --count 5 --dry-run
```

## How it works

1. **Fetch** — lists all open issues labelled `afk` via `gh issue list`
2. **Eligibility check** — skips issues that are:
   - Labelled `hitl` (needs human review after a failed pipeline run)
   - Labelled `blocked` with no body blockers (manual hold)
   - Have `Blocked by #N` in the body and issue `#N` is still open
   - Auto-removes stale `blocked` labels when all body blockers are resolved
3. **Dispatch** — for each eligible issue, launches `docker run dispatch-agent` with issue context passed via an env file
4. **Stream** — JSON-lines events from the container are pretty-printed; non-JSON lines are shown with a `│` prefix

## Pipeline (inside the container)

The container runs `.github/dispatch-agent/entrypoint.ts` which executes three Copilot specialist stages:

```
Implementer → Code Review → QA → push branch → open PR
```

Each stage has one retry. If a stage fails after retry, the issue is labelled `hitl` and a comment is posted explaining what failed.

## Logs

Per-run logs are written to `%TEMP%/dispatch-agent-<issue>-logs/run.jsonl` on the host. Logs are deleted on success and kept on failure for debugging.

## Issue format

Issues must:
- Be open and labelled `afk`
- Optionally declare dependencies with a `## Blocked by` section in the body:

```markdown
## Blocked by
- #3
- #4
```
