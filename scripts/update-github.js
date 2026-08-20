#!/usr/bin/env node
/**
 * Pushes your current local changes to GitHub - nothing else. No version bump, no EAS build, no
 * GitHub Release/APK. For a full release (new APK + GitHub Release), use `npm run release`
 * instead.
 *
 * Usage:
 *   npm run update-github                    (prompts for a commit message if there are changes)
 *   npm run update-github -- "Fix login bug" (skips the prompt, uses this message)
 */
const { execSync, execFileSync } = require("child_process");
const readline = require("readline");

const ROOT = require("path").join(__dirname, "..");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd: ROOT });
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const status = runCapture("git status --porcelain");
  const messageArg = process.argv.slice(2).join(" ").trim();

  if (status.trim()) {
    console.log("Änderungen gefunden:\n");
    console.log(runCapture("git status --short"));
    const message = messageArg || (await ask("\nCommit-Nachricht: "));
    if (!message) {
      console.error("Keine Commit-Nachricht angegeben - abgebrochen, nichts wurde committet oder gepusht.");
      process.exit(1);
    }
    run("git add -A");
    console.log(`\n$ git commit -m "${message}"`);
    execFileSync("git", ["commit", "-m", message], { stdio: "inherit", cwd: ROOT });
  } else {
    console.log("Keine lokalen Änderungen - nichts zu committen, push läuft trotzdem (falls schon Commits lokal warten).");
  }

  run("git push");
  run("git push --tags");

  console.log("\nFertig. GitHub ist aktuell.");
}

main().catch((err) => {
  console.error("\nFehler:", err.message || err);
  process.exit(1);
});
