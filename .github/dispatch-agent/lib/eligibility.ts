import { $ } from 'zx'

export interface GhIssue {
  number: number
  title: string
  body: string
  labels: { name: string }[]
}

export function parseBlockers(body: string): number[] {
  const section = body.match(/##\s*[Bb]locked\s+[Bb]y\s*\n([\s\S]*?)(?:\n##|$)/)
  if (!section) return []
  return [...section[1].matchAll(/#(\d+)/g)].map(m => parseInt(m[1]))
}

export async function isEligible(issue: GhIssue, repo: string): Promise<boolean> {
  if (issue.labels.some(l => l.name === 'hitl')) return false

  const blockers = parseBlockers(issue.body)
  const hasBlockedLabel = issue.labels.some(l => l.name === 'blocked')

  // No body blockers but manually labelled 'blocked' — treat as a human hold, skip
  if (blockers.length === 0 && hasBlockedLabel) {
    console.log(`  Issue #${issue.number} manually held with 'blocked' label — skipping`)
    return false
  }

  for (const n of blockers) {
    const state = (await $`gh issue view ${n} --repo ${repo} --json state -q .state`).stdout.trim().toLowerCase()
    if (state !== 'closed') {
      console.log(`  Issue #${issue.number} blocked by open issue #${n}`)
      return false
    }
  }

  // All body blockers are resolved — auto-remove the stale 'blocked' label if present
  if (hasBlockedLabel) {
    await $`gh issue edit ${issue.number} --repo ${repo} --remove-label "blocked"`
    console.log(`  Cleared stale 'blocked' label from #${issue.number}`)
  }
  return true
}
