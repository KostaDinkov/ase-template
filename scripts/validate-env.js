#!/usr/bin/env zx
import { $, echo, chalk, fs } from "zx";

// Required vars per env file — extend as services grow
const requiredVars = {
  ".env": ["COMPOSE_PROJECT_NAME"],
  "services/api/.env": [],
  "services/frontend/.env": ["NEXT_PUBLIC_API_URL"],
};

let hasErrors = false;

for (const [envFile, vars] of Object.entries(requiredVars)) {
  if (!fs.existsSync(envFile)) {
    echo(chalk.red(`✗ Missing env file: ${envFile}`));
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(envFile, "utf8");

  for (const varName of vars) {
    const defined = new RegExp(`^${varName}=.+`, "m").test(content);
    if (!defined) {
      echo(chalk.red(`✗ Missing or empty: ${varName} in ${envFile}`));
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  echo(chalk.red("\nEnv validation failed. Fix the above before running compose."));
  process.exit(1);
}

echo(chalk.green("✓ All environment variables validated."));
