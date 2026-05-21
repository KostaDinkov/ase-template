#!/usr/bin/env zx
import { $, echo, chalk } from "zx";

echo(chalk.blue("Starting deployment..."));

// 1. Validate env files before touching containers
await $`node scripts/validate-env.js`;

// 2. Pull latest changes
echo(chalk.blue("Pulling latest changes..."));
await $`git pull origin main`;

// 3. Build and restart containers in production mode
echo(chalk.blue("Building and restarting containers..."));
await $`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans`;

// 4. Clean up dangling images to reclaim disk space
await $`docker image prune -f`;

echo(chalk.green("✓ Deployment complete!"));
