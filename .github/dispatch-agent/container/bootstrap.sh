#!/bin/bash
# bootstrap.sh — the only file baked into the Docker image.
#
# Responsibilities (intentionally minimal — rarely needs to change):
#   1. Validate required env vars
#   2. Set up git credentials
#   3. Clone the repo to /workspace
#   4. exec tsx on the entrypoint from the clone (replaces this shell as PID 1)

set -euo pipefail

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${REPO:?REPO is required}"

# ---------------------------------------------------------------------------
# Git credentials
# ---------------------------------------------------------------------------
git config --global credential.helper store
echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
git config --global user.name "Copilot Agent"
git config --global user.email "copilot-agent@users.noreply.github.com"

# ---------------------------------------------------------------------------
# Clone repo from main
# ---------------------------------------------------------------------------
echo '{"stage":"clone","status":"start","ts":'$(date +%s)'}'
git clone "https://github.com/${REPO}" /workspace
echo '{"stage":"clone","status":"done","ts":'$(date +%s)'}'

# Switch to the target branch if it already exists on the remote (refine mode).
# In dispatch mode the branch doesn't exist yet — the || true makes that a no-op.
git -C /workspace checkout "${BRANCH}" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Install project deps so zx (devDependency) is available for entrypoint.ts
# ---------------------------------------------------------------------------
pnpm install --dir /workspace

# ---------------------------------------------------------------------------
# Hand off — exec replaces this shell with tsx (entrypoint becomes PID 1)
# ---------------------------------------------------------------------------
exec tsx /workspace/.github/dispatch-agent/container/entrypoint.ts
