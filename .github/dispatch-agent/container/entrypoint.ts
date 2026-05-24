#!/usr/bin/env tsx
import { $ } from "zx";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  appendFileSync,
  rmSync,
} from "fs";
import path from "path";
import { Buffer } from "buffer";

$.verbose = false;

const PROMPTS_DIR = new URL(".", import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StageMetrics {
  sessions: number;
  duration: number;
  inputChars: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LOG_FILE = process.env.LOG_FILE ?? "/logs/run.jsonl";

function logEvent(stage: string, status: string, msg?: string): void {
  const ts = Math.floor(Date.now() / 1000);
  const obj: Record<string, unknown> = { stage, status, ts };
  if (msg) obj.msg = msg;
  const json = JSON.stringify(obj);
  console.log(json);
  try {
    mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, json + "\n");
  } catch {
    /* non-fatal */
  }
}

function readVerdict(file: string): string {
  try {
    return readFileSync(file, "utf-8").replace(/\s/g, "");
  } catch {
    return "FAIL";
  }
}

function readReport(file: string, fallback: string): string {
  try {
    return readFileSync(file, "utf-8");
  } catch {
    return fallback;
  }
}

const metrics = new Map<string, StageMetrics>();

function metricKey(stage: string): string {
  if (stage.startsWith("implementer")) return "implementer";
  if (stage.startsWith("code-review")) return "code-review";
  if (stage.startsWith("qa")) return "qa";
  return stage;
}

async function runSpecialist(
  stage: string,
  promptFile: string,
  issueContext: string,
  extraContext = "",
): Promise<void> {
  let fullPrompt =
    readFileSync(promptFile, "utf-8") +
    "\n\n" +
    PROJECT_BLOCK +
    "\n\n" +
    issueContext;
  if (extraContext) fullPrompt += "\n\n" + extraContext;

  const inputChars = fullPrompt.length;
  const stageStart = Math.floor(Date.now() / 1000);

  logEvent(stage, "start");

  // Pipe copilot output through to the container's stdout/stderr so dispatch.ts can stream it
  const proc = $`copilot --autopilot --allow-all-tools --allow-all-urls --add-dir /workspace --max-autopilot-continues 20 --no-ask-user -s -p ${fullPrompt}`;
  proc.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
  proc.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
  await proc;

  const duration = Math.floor(Date.now() / 1000) - stageStart;
  const key = metricKey(stage);
  const prev = metrics.get(key) ?? { sessions: 0, duration: 0, inputChars: 0 };
  metrics.set(key, {
    sessions: prev.sessions + 1,
    duration: prev.duration + duration,
    inputChars: prev.inputChars + inputChars,
  });

  logEvent(stage, "done");
}

// ---------------------------------------------------------------------------
// Validate required env vars
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`${name} is required`);
    process.exit(1);
  }
  return val!;
}

const GITHUB_TOKEN = requireEnv("GITHUB_TOKEN");
const REPO = requireEnv("REPO");
const BRANCH = requireEnv("BRANCH");
const ISSUE_NUMBER = requireEnv("ISSUE_NUMBER");
const PR_TITLE = requireEnv("PR_TITLE");
const PROMPT_B64 = requireEnv("PROMPT_B64");

const MODE = process.env.MODE ?? "dispatch"; // 'dispatch' | 'refine'
const PR_NUMBER = process.env.PR_NUMBER ?? ""; // required in refine mode

const ISSUE_CONTEXT = Buffer.from(PROMPT_B64, "base64").toString("utf-8");
const PIPELINE_START = Math.floor(Date.now() / 1000);

// ---------------------------------------------------------------------------
// Branch setup (/workspace already cloned by bootstrap.ts)
// ---------------------------------------------------------------------------
$.cwd = "/workspace";
if (MODE === "refine") {
  // Branch already exists on the remote — check it out
  await $`git checkout ${BRANCH}`;
} else {
  await $`git checkout -b ${BRANCH}`;
}

// Belt-and-suspenders: ensure .dispatch-agent/ is gitignored
const gitignorePath = "/workspace/.gitignore";
const gitignoreLines = existsSync(gitignorePath)
  ? readFileSync(gitignorePath, "utf-8").split("\n")
  : [];
if (!gitignoreLines.includes(".dispatch-agent/"))
  appendFileSync(gitignorePath, ".dispatch-agent/\n");

// ---------------------------------------------------------------------------
// Project config (lives in the workspace)
// ---------------------------------------------------------------------------
interface ProjectConfig {
  install: string;
  test: string;
  typecheck: string;
  context: string;
}

const CONFIG_PATH = "/workspace/agentic-workflow-config.json";
// Definite assignment: the catch block always calls process.exit(1)
let projectConfig!: ProjectConfig;
try {
  projectConfig = JSON.parse(
    readFileSync(CONFIG_PATH, "utf-8"),
  ) as ProjectConfig;
} catch {
  console.error(
    `ERROR: agentic-workflow-config.json not found at ${CONFIG_PATH}`,
  );
  console.error(
    "Create this file in your repo root — see .github/dispatch-agent/dispatch.readme.md",
  );
  process.exit(1);
}

const PROJECT_BLOCK = [
  "# PROJECT CONTEXT",
  projectConfig.context,
  "",
  "# PROJECT COMMANDS",
  `- Install: \`${projectConfig.install}\``,
  `- Test: \`${projectConfig.test}\``,
  `- Typecheck: \`${projectConfig.typecheck}\``,
].join("\n");

// ---------------------------------------------------------------------------
// Install dependencies
// ---------------------------------------------------------------------------
logEvent("install", "start");
const installProc = $`sh -c ${projectConfig.install}`;
installProc.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
installProc.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
await installProc;
logEvent("install", "done");

// Scratch directory for inter-specialist handoffs (gitignored, never committed)
mkdirSync("/workspace/.dispatch-agent", { recursive: true });

// ---------------------------------------------------------------------------
// Stage 1: Implementer
// ---------------------------------------------------------------------------
const IMPLEMENTER_PROMPT =
  MODE === "refine"
    ? `${PROMPTS_DIR}prompt-refine.md`
    : `${PROMPTS_DIR}prompt-issue.md`;

await runSpecialist("implementer", IMPLEMENTER_PROMPT, ISSUE_CONTEXT);

// ---------------------------------------------------------------------------
// Stage 2: Code Review (+ 1 retry)
// ---------------------------------------------------------------------------
await runSpecialist(
  "code-review",
  `${PROMPTS_DIR}prompt-code-review.md`,
  ISSUE_CONTEXT,
);
let crVerdict = readVerdict(
  "/workspace/.dispatch-agent/code-review-verdict.txt",
);

if (crVerdict === "FAIL") {
  logEvent(
    "implementer-retry",
    "start",
    "code review failed — retrying implementer",
  );
  const reviewContext = `## Code Review Findings (address these before proceeding)\n\n${readReport(
    "/workspace/.dispatch-agent/code-review.md",
    "_No review report written._",
  )}`;
  await runSpecialist(
    "implementer-retry",
    IMPLEMENTER_PROMPT,
    ISSUE_CONTEXT,
    reviewContext,
  );
  await runSpecialist(
    "code-review-retry",
    `${PROMPTS_DIR}prompt-code-review.md`,
    ISSUE_CONTEXT,
  );
  crVerdict = readVerdict("/workspace/.dispatch-agent/code-review-verdict.txt");

  if (crVerdict === "FAIL") {
    logEvent("code-review", "hitl", "failed after retry");
    await $`gh issue edit ${ISSUE_NUMBER} --add-label hitl --repo ${REPO}`;
    const crReport = readReport(
      "/workspace/.dispatch-agent/code-review.md",
      "_No review report written._",
    );
    await $`gh issue comment ${ISSUE_NUMBER} --repo ${REPO} --body ${`## ❌ Dispatch Agent: Code Review failed after retry\n\n**Branch:** \`${BRANCH}\`\n\n${crReport}`}`;
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Stage 3: QA (+ 1 retry)
// ---------------------------------------------------------------------------
const QA_PROMPT =
  MODE === "refine"
    ? `${PROMPTS_DIR}prompt-qa-refine.md`
    : `${PROMPTS_DIR}prompt-qa.md`;

await runSpecialist("qa", QA_PROMPT, ISSUE_CONTEXT);
let qaVerdict = readVerdict("/workspace/.dispatch-agent/qa-verdict.txt");

if (qaVerdict === "FAIL") {
  logEvent("implementer-retry-2", "start", "QA failed — retrying implementer");
  const qaContext = `## QA Findings (address these before proceeding)\n\n${readReport(
    "/workspace/.dispatch-agent/qa-report.md",
    "_No QA report written._",
  )}`;
  await runSpecialist(
    "implementer-retry-2",
    IMPLEMENTER_PROMPT,
    ISSUE_CONTEXT,
    qaContext,
  );
  await runSpecialist(
    "code-review-retry-2",
    `${PROMPTS_DIR}prompt-code-review.md`,
    ISSUE_CONTEXT,
  );
  await runSpecialist("qa-retry", QA_PROMPT, ISSUE_CONTEXT);
  qaVerdict = readVerdict("/workspace/.dispatch-agent/qa-verdict.txt");

  if (qaVerdict === "FAIL") {
    logEvent("qa", "hitl", "failed after retry");
    await $`gh issue edit ${ISSUE_NUMBER} --add-label hitl --repo ${REPO}`;
    const qaReport = readReport(
      "/workspace/.dispatch-agent/qa-report.md",
      "_No QA report written._",
    );
    const crReport = readReport(
      "/workspace/.dispatch-agent/code-review.md",
      "_No review report written._",
    );
    await $`gh issue comment ${ISSUE_NUMBER} --repo ${REPO} --body ${`## ❌ Dispatch Agent: QA failed after retry\n\n**Branch:** \`${BRANCH}\`\n\n### QA Report\n\n${qaReport}\n\n### Code Review Report\n\n${crReport}`}`;
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Assemble PR body
// ---------------------------------------------------------------------------
const PIPELINE_DURATION = Math.floor(Date.now() / 1000) - PIPELINE_START;

crVerdict = readVerdict("/workspace/.dispatch-agent/code-review-verdict.txt");
qaVerdict = readVerdict("/workspace/.dispatch-agent/qa-verdict.txt");
const crBadge = crVerdict === "PASS" ? "✅ PASS" : "❌ FAIL";
const qaBadge = qaVerdict === "PASS" ? "✅ PASS" : "❌ FAIL";

const implM = metrics.get("implementer") ?? {
  sessions: 0,
  duration: 0,
  inputChars: 0,
};
const crM = metrics.get("code-review") ?? {
  sessions: 0,
  duration: 0,
  inputChars: 0,
};
const qaM = metrics.get("qa") ?? { sessions: 0, duration: 0, inputChars: 0 };
const totalSes = implM.sessions + crM.sessions + qaM.sessions;

const filesChanged =
  (await $`git diff --stat main..HEAD`.catch(() => ({ stdout: "" }))).stdout
    .trim()
    .split("\n")
    .pop() ?? "unknown";
const commitCountRaw = (
  await $`git log main..HEAD --oneline`.catch(() => ({ stdout: "" }))
).stdout.trim();
const commitCount = commitCountRaw
  ? commitCountRaw.split("\n").filter(Boolean).length
  : 0;

const implReport = readReport(
  "/workspace/.dispatch-agent/implementation-report.md",
  "_No implementation report written._",
);
const crReport = readReport(
  "/workspace/.dispatch-agent/code-review.md",
  "_No code review report written._",
);
const qaReport = readReport(
  "/workspace/.dispatch-agent/qa-report.md",
  "_No QA report written._",
);

const prBody = `<!-- generated by dispatch-agent -->
## 🔨 Implementer

${implReport}

---
## 🔍 Code Review — ${crBadge}

${crReport}

---
## 🧪 QA — ${qaBadge}

${qaReport}

---
## 📊 Pipeline Metrics

| Stage | Sessions | Duration | Est. Input Tokens |
|---|---|---|---|
| Implementer | ${implM.sessions} | ${implM.duration}s | ~${Math.floor((implM.inputChars + 3) / 4)} |
| Code Review | ${crM.sessions} | ${crM.duration}s | ~${Math.floor((crM.inputChars + 3) / 4)} |
| QA | ${qaM.sessions} | ${qaM.duration}s | ~${Math.floor((qaM.inputChars + 3) / 4)} |
| **Total** | **${totalSes}** | **${PIPELINE_DURATION}s** | |

> Token estimates are based on input prompt character count ÷ 4. Copilot CLI does not expose actual API token counts.

- **Files changed:** ${filesChanged}
- **Commits:** ${commitCount}
- **Branch:** \`${BRANCH}\`

Closes #${ISSUE_NUMBER}`;

// ---------------------------------------------------------------------------
// Clean up handoff directory before push (gitignored, but belt-and-suspenders)
// ---------------------------------------------------------------------------
rmSync("/workspace/.dispatch-agent", { recursive: true, force: true });

// ---------------------------------------------------------------------------
// Push branch + create PR
// ---------------------------------------------------------------------------
const hasCommits = (
  await $`git log origin/main..HEAD --oneline`.catch(() => ({ stdout: "" }))
).stdout.trim();

if (hasCommits) {
  logEvent("push", "start");
  await $`git push origin ${BRANCH}`;
  logEvent("push", "done");

  if (MODE === "refine") {
    // Build a compact comment — no metrics, no "Closes #", details only when needed
    logEvent("pr-comment", "start");
    const crBadge = crVerdict === "PASS" ? "✅ PASS" : "❌ FAIL";
    const qaBadge = qaVerdict === "PASS" ? "✅ PASS" : "❌ FAIL";

    let refineComment = `## 🔁 Refine complete\n\nCode Review: ${crBadge} · QA: ${qaBadge}`;

    if (crVerdict !== "PASS") {
      refineComment += `\n\n### Code Review Issues\n\n${crReport}`;
    } else {
      refineComment += `\n\n<details><summary>Code Review notes (non-blocking)</summary>\n\n${crReport}\n\n</details>`;
    }
    if (qaVerdict !== "PASS") {
      refineComment += `\n\n### QA Issues\n\n${qaReport}`;
    }

    refineComment += `\n\n<details><summary>Implementation summary</summary>\n\n${implReport}\n\n</details>`;

    await $`gh pr comment ${PR_NUMBER} --repo ${REPO} --body ${refineComment}`;
    logEvent("pr-comment", "done");
    // Remove hitl label if present (ignore error if label wasn't set)
    await $`gh issue edit ${ISSUE_NUMBER} --remove-label hitl --repo ${REPO}`.catch(
      () => {},
    );
  } else {
    logEvent("pr", "start");
    await $`gh pr create --title ${PR_TITLE} --body ${prBody} --base main --head ${BRANCH}`;
    logEvent("pr", "done");
  }
} else {
  console.error("No commits made — skipping push and PR creation.");
  process.exit(1);
}
