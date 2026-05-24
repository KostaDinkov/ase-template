#!/usr/bin/env tsx
import { $, fs, os } from 'zx'
import path from 'path'
import { parseArgs } from './lib/cli.ts'
import { isEligible, type GhIssue } from './lib/eligibility.ts'

$.verbose = false
if (process.platform === 'win32') {
  $.shell = 'C:\\Windows\\System32\\cmd.exe'
  $.prefix = ''
}

if (!process.env.GITHUB_TOKEN) {
  process.env.GITHUB_TOKEN = (await $`gh auth token`).stdout.trim()
}

const { dryRun, iterations } = parseArgs(process.argv.slice(2))

if (dryRun) console.log('[DRY RUN] No Docker containers will be started.')

const repo = (await $`gh repo view --json nameWithOwner -q .nameWithOwner`).stdout.trim()
console.log(`Dispatching up to ${iterations} issue(s) for repo ${repo}`)

for (let i = 0; i < iterations; i++) {
  console.log(`\n─── Iteration ${i + 1}/${iterations} ───────────────────────`)

  const { stdout } = await $`gh issue list --label afk --state open --json number,title,body,labels`
  const issues: GhIssue[] = JSON.parse(stdout)

  if (issues.length === 0) {
    console.log('No open AFk issues found.')
    break
  }

  let issue: GhIssue | undefined
  for (const candidate of issues) {
    if (await isEligible(candidate, repo)) {
      issue = candidate
      break
    }
  }

  if (!issue) {
    console.log('No eligible issues (all are hitl, blocked, or waiting on dependencies).')
    break
  }

  const { number, title, body } = issue
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
  const branch = `issue-${number}-${slug}`
  // Specialists get role instructions from their baked-in /dispatch-agent/prompt-*.md files.
  // We only send the raw issue content (title + body) — no host-side prompt injection.
  const prompt = `Issue #${number}: ${title}\n\n${body}`

  console.log(`Working on #${number}: ${title}`)
  console.log(`Branch: ${branch}`)

  if (dryRun) {
    console.log(`[DRY RUN] Would run: docker run --rm dispatch-agent (issue #${number})`)
    continue
  }

  const homeDir = os.homedir().replace(/\\/g, '/')
  const vol = `${homeDir}/.copilot:/root/.copilot`

  // Per-run log directory on the host (kept on failure, cleaned on success)
  const logDir = path.join(os.tmpdir(), `dispatch-agent-${number}-logs`).replace(/\\/g, '/')
  await fs.mkdir(logDir, { recursive: true })
  const logVol = `${logDir}:/logs`

  // Write env vars to a temp file so Docker doesn't choke on newlines/special chars
  // PROMPT is base64-encoded because --env-file doesn't support multi-line values
  const envFile = path.join(os.tmpdir(), `dispatch-agent-${number}.env`).replace(/\\/g, '/')
  const promptB64 = Buffer.from(prompt, 'utf-8').toString('base64')
  const envContent = [
    `GITHUB_TOKEN=${process.env.GITHUB_TOKEN ?? ''}`,
    `REPO=${repo}`,
    `BRANCH=${branch}`,
    `ISSUE_NUMBER=${number}`,
    `PR_TITLE=#${number}: ${title}`,
    `PROMPT_B64=${promptB64}`,
  ].join('\n')
  await fs.writeFile(envFile, envContent, 'utf-8')

  try {
    // Stream container output in real time — JSON-lines events are pretty-printed,
    // plain text lines are passed through with a pipe prefix
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

    console.log(`✓ Issue #${number} complete — PR created.`)
    // Clean up logs on success
    await fs.rm(logDir, { recursive: true, force: true })
  } catch {
    console.error(`✗ Issue #${number} failed — branch may exist on remote. Logs: ${logDir}`)
  } finally {
    await fs.rm(envFile, { force: true })
  }
}

console.log('\nDispatch complete.')
