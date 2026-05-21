#!/usr/bin/env zx
import { $, echo, chalk, fs } from "zx";

echo(chalk.blue("Setting up development environment..."));

// Check required tools
for (const tool of ["docker", "node"]) {
  try {
    await $`which ${tool}`;
  } catch {
    echo(chalk.red(`✗ Missing required tool: ${tool}`));
    process.exit(1);
  }
  echo(chalk.green(`✓ ${tool}`));
}

// Copy .env files if they don't exist
const envPairs = [
  [".env.example", ".env"],
  ["services/api/.env.example", "services/api/.env"],
  ["services/frontend/.env.example", "services/frontend/.env"],
];

for (const [src, dest] of envPairs) {
  if (!fs.existsSync(dest)) {
    await $`cp ${src} ${dest}`;
    echo(chalk.green(`✓ Created ${dest}`));
  } else {
    echo(chalk.yellow(`- Skipped ${dest} (already exists)`));
  }
}

echo(chalk.green("\nSetup complete!"));
echo("Run: docker compose up");
