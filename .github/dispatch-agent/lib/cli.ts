export interface CliArgs {
  dryRun: boolean
  iterations: number
}

export function parseArgs(argv: string[]): CliArgs {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`
Usage: npx tsx .github/dispatch-agent/dispatch.ts [options]

Options:
  --count, -c <n>   Number of issues to process in sequence (default: 1)
  --dry-run, -n     Print what would happen without starting Docker containers
  --help, -h        Show this help message

Examples:
  npx tsx .github/dispatch-agent/dispatch.ts                        Process 1 eligible issue
  npx tsx .github/dispatch-agent/dispatch.ts --count 3              Process up to 3 eligible issues
  npx tsx .github/dispatch-agent/dispatch.ts --count 5 --dry-run    Dry-run preview of 5 iterations

Eligibility rules (issues are skipped if):
  - Labelled 'hitl'  (needs human review)
  - Labelled 'blocked' with no body blockers  (manual hold)
  - Has "Blocked by #N" in body and issue #N is still open
`.trim())
    process.exit(0)
  }

  const dryRun = argv.includes('--dry-run') || argv.includes('-n')
  const countIdx = argv.findIndex(a => a === '--count' || a === '-c')
  const iterations = countIdx !== -1 ? parseInt(argv[countIdx + 1] ?? '') : 1

  if (isNaN(iterations) || iterations < 1) {
    console.error('Usage: npx tsx .github/dispatch-agent/dispatch.ts [--count <n>] [--dry-run]\nRun with --help for more information.')
    process.exit(1)
  }

  return { dryRun, iterations }
}
