#!/usr/bin/env tsx
/**
 * refine.ts — host-side orchestrator for the refine workflow.
 *
 * Fetches an open PR's review feedback, assembles context, and runs the
 * dispatch-agent container in MODE=refine on the PR's existing branch.
 *
 * Usage:
 *   npx tsx .github/dispatch-agent/refine.ts --pr <pr-number> ["optional instruction"]
 *   npx tsx .github/dispatch-agent/refine.ts --pr 42
 *   npx tsx .github/dispatch-agent/refine.ts --pr 42 "implement all suggestions"
 *   npx tsx .github/dispatch-agent/refine.ts --pr 42 --dry-run
 */

import { $, fs, os } from 'zx'
import path from 'path'

$.verbose = false
if (process.platform === 'win32') {
  $.shell = 'C:\\Windows\\System32\\cmd.exe'
  $.prefix = ''
}

if (!process.env.GITHUB_TOKEN) {
  process.env.GITHUB_TOKEN = (await $`gh auth token`).stdout.trim()
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: npx tsx .github/dispatch-agent/refine.ts --pr <number> [instruction] [--dry-run]

Options:
  --pr, -p <n>      PR number to refine (required)
  --dry-run, -n     Print what would happen without starting a Docker container
  --help, -h        Show this help message

Arguments:
  instruction       Optional free-text instruction (default: "Address all open review feedback in this PR.")

Examples:
  npx tsx .github/dispatch-agent/refine.ts --pr 42
  npx tsx .github/dispatch-agent/refine.ts --pr 42 "Fix only the naming issues"
  npx tsx .github/dispatch-agent/refine.ts --pr 42 --dry-run
`.trim())
  process.exit(0)
}

const dryRun = args.includes('--dry-run') || args.includes('-n')

const prFlagIdx = args.findIndex(a => a === '--pr' || a === '-p')
if (prFlagIdx === -1 || !args[prFlagIdx + 1]) {
  console.error('Error: --pr <pr-number> is required.\nRun with --help for usage.')
  process.exit(1)
}

const prNumber = parseInt(args[prFlagIdx + 1] ?? '')
if (isNaN(prNumber) || prNumber < 1) {
  console.error('Error: --pr must be a positive integer.')
  process.exit(1)
}

// Collect remaining args (excluding --pr flag, its value, and --dry-run) as the instruction
const remaining = args.filter((_, i) => {
  if (i === prFlagIdx || i === prFlagIdx + 1) return false
  if (args[i] === '--dry-run' || args[i] === '-n') return false
  return true
})
const instruction = remaining.join(' ').trim() || 'Address all open review feedback in this PR.'

// ---------------------------------------------------------------------------
// Fetch PR data
// ---------------------------------------------------------------------------
const repo = (await $`gh repo view --json nameWithOwner -q .nameWithOwner`).stdout.trim()
console.log(`Refining PR #${prNumber} in repo ${repo}`)

interface ClosingIssueRef { number: number }
interface PrData {
  number: number
  title: string
  headRefName: string
  body: string
  state: string
  closingIssuesReferences: ClosingIssueRef[]
}

const prDataRaw = (await $`gh pr view ${prNumber} --repo ${repo} --json number,title,headRefName,body,state,closingIssuesReferences`).stdout
const prData: PrData = JSON.parse(prDataRaw)

const branch = prData.headRefName
const prTitle = prData.title

// Derive issue number from closing references, falling back to branch name pattern
let issueNumber = prData.closingIssuesReferences?.[0]?.number ?? 0
if (!issueNumber) {
  const match = branch.match(/^issue-(\d+)-/)
  if (match) issueNumber = parseInt(match[1])
}
if (!issueNumber) {
  console.error(`Error: Could not determine linked issue number from PR #${prNumber}.`)
  console.error(`Branch: ${branch}`)
  console.error('Ensure the PR body contains "Closes #N" or the branch follows the issue-N-* naming convention.')
  process.exit(1)
}

console.log(`Branch: ${branch}`)
console.log(`Linked issue: #${issueNumber}`)

// ---------------------------------------------------------------------------
// Fetch review feedback
// ---------------------------------------------------------------------------
interface GhReview { author: { login: string }; state: string; body: string; submittedAt: string }
interface GhApiComment {
  user: { login: string }
  path: string
  line: number | null
  original_line: number | null
  body: string
  created_at: string
}

// PR-level review summaries (from gh pr view --json reviews)
const reviewsRaw = (await $`gh pr view ${prNumber} --repo ${repo} --json reviews`).stdout
const reviews: GhReview[] = (JSON.parse(reviewsRaw) as { reviews: GhReview[] }).reviews ?? []

// Inline review comments (from the REST API)
let inlineComments: GhApiComment[] = []
try {
  const inlineRaw = (await $`gh api repos/${repo}/pulls/${prNumber}/comments --paginate`).stdout
  inlineComments = JSON.parse(inlineRaw) as GhApiComment[]
} catch {
  console.warn('Warning: could not fetch inline review comments (continuing without them).')
}

// ---------------------------------------------------------------------------
// Assemble PROMPT_B64
// ---------------------------------------------------------------------------
const feedbackLines: string[] = []

feedbackLines.push(`## PR #${prNumber}: ${prTitle}`)
feedbackLines.push('')

const reviewWithFeedback = reviews.filter(r => r.body?.trim() || r.state === 'CHANGES_REQUESTED')
if (reviewWithFeedback.length > 0) {
  feedbackLines.push('## PR Review Comments')
  feedbackLines.push('')
  for (const r of reviewWithFeedback) {
    const when = r.submittedAt ? ` (${r.submittedAt.slice(0, 10)})` : ''
    feedbackLines.push(`**${r.author?.login ?? 'Unknown'} — ${r.state}${when}:**`)
    feedbackLines.push(r.body?.trim() || '_No review body._')
    feedbackLines.push('')
  }
}

if (inlineComments.length > 0) {
  feedbackLines.push('## Inline Review Comments')
  feedbackLines.push('')
  for (const c of inlineComments) {
    const lineRef = c.line ?? c.original_line
    const when = c.created_at ? ` (${c.created_at.slice(0, 10)})` : ''
    feedbackLines.push(`**${c.user?.login ?? 'Unknown'}${when}** on \`${c.path}\`${lineRef ? ` line ${lineRef}` : ''}:`)
    feedbackLines.push(c.body)
    feedbackLines.push('')
  }
}

feedbackLines.push('## Instruction')
feedbackLines.push('')
feedbackLines.push(instruction)

const prompt = feedbackLines.join('\n')

if (dryRun) {
  console.log('\n[DRY RUN] Would start Docker container with:')
  console.log(`  BRANCH=${branch}`)
  console.log(`  ISSUE_NUMBER=${issueNumber}`)
  console.log(`  PR_NUMBER=${prNumber}`)
  console.log(`  MODE=refine`)
  console.log(`  PR_TITLE=${prTitle}`)
  console.log(`\n--- PROMPT ---\n${prompt}\n--- END PROMPT ---`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Launch Docker container
// ---------------------------------------------------------------------------
const homeDir = os.homedir().replace(/\\/g, '/')
const vol = `${homeDir}/.copilot:/root/.copilot`

const logDir = path.join(os.tmpdir(), `refine-agent-${prNumber}-logs`).replace(/\\/g, '/')
await fs.mkdir(logDir, { recursive: true })
const logVol = `${logDir}:/logs`

const envFile = path.join(os.tmpdir(), `refine-agent-${prNumber}.env`).replace(/\\/g, '/')
const promptB64 = Buffer.from(prompt, 'utf-8').toString('base64')
const envContent = [
  `GITHUB_TOKEN=${process.env.GITHUB_TOKEN ?? ''}`,
  `REPO=${repo}`,
  `BRANCH=${branch}`,
  `ISSUE_NUMBER=${issueNumber}`,
  `PR_NUMBER=${prNumber}`,
  `PR_TITLE=${prTitle}`,
  `MODE=refine`,
  `PROMPT_B64=${promptB64}`,
].join('\n')
await fs.writeFile(envFile, envContent, 'utf-8')

try {
  const proc = $`docker run --rm -v ${vol} -v ${logVol} --env-file ${envFile} dispatch-agent`
  proc.stdout.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      const text = line.trimEnd()
      if (!text) continue
      try {
        const evt = JSON.parse(text) as { stage?: string; status?: string; ts?: number; msg?: string }
        if (evt.stage && evt.status) {
          const icon = evt.status === 'done' ? '✓' : evt.status === 'hitl' ? '⚠' : evt.status === 'start' ? '▶' : '·'
          console.log(`  ${icon} [${evt.stage}] ${evt.status}${evt.msg ? ': ' + evt.msg : ''}`)
        } else {
          console.log(`  │ ${text}`)
        }
      } catch {
        console.log(`  │ ${text}`)
      }
    }
  })
  proc.stderr.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      const text = line.trimEnd()
      if (text) console.log(`  │ ${text}`)
    }
  })
  await proc

  console.log(`✓ PR #${prNumber} refined — comment posted and hitl label removed.`)
  await fs.rm(logDir, { recursive: true, force: true })
} catch {
  console.error(`✗ PR #${prNumber} refine failed — branch: ${branch}. Logs: ${logDir}`)
} finally {
  await fs.rm(envFile, { force: true })
}
