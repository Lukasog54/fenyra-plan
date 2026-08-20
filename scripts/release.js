#!/usr/bin/env node
/**
 * Full Fenyra Plan release pipeline - run with `npm run release`:
 *   1. Bumps the patch version in app.json + package.json and commits it.
 *   2. Builds the Android APK on EAS (waits for it to finish).
 *   3. Downloads the finished APK.
 *   4. Tags the commit and pushes branch + tag to GitHub.
 *   5. Creates a GitHub Release for that tag with the APK attached, so the
 *      app's own in-app update check (GITHUB_REPO in src/data/constants.ts)
 *      finds it.
 *
 * One-time setup this script does NOT do for you (do these once, manually):
 *   - `eas login` (needs an Expo account with access to this project)
 *   - `gh auth login` (needs a GitHub account with push access to the repo)
 *   - `git remote add origin <your-repo-url>` if not already configured
 *   - Make sure GITHUB_REPO in src/data/constants.ts matches that repo
 *     ("owner/name"), otherwise the app will never find the release you just
 *     published.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd: ROOT });
}

function bumpPatch(version) {
  const parts = version.split(".").map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl, redirectsLeft) => {
      https
        .get(currentUrl, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            if (redirectsLeft <= 0) {
              reject(new Error("Too many redirects while downloading the APK"));
              return;
            }
            request(response.headers.location, redirectsLeft - 1);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${response.statusCode} for ${currentUrl}`));
            return;
          }
          const file = fs.createWriteStream(destPath);
          response.pipe(file);
          file.on("finish", () => file.close(resolve));
          file.on("error", reject);
        })
        .on("error", reject);
    };
    request(url, 5);
  });
}

async function main() {
  const appJsonPath = path.join(ROOT, "app.json");
  const packageJsonPath = path.join(ROOT, "package.json");
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  const oldVersion = appJson.expo.version;
  const newVersion = bumpPatch(oldVersion);
  const tag = `v${newVersion}`;
  console.log(`Fenyra Plan release: ${oldVersion} -> ${newVersion} (${tag})`);

  // 1. Bump + commit
  appJson.expo.version = newVersion;
  packageJson.version = newVersion;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  run(`git add app.json package.json`);
  run(`git commit -m "chore: release ${tag}"`);

  // 2. Build on EAS (waits for completion, prints one JSON array with the finished build)
  const buildJson = runCapture(`npx eas-cli build --platform android --profile release --non-interactive --wait --json`);
  const builds = JSON.parse(buildJson);
  const build = builds[0];
  if (!build || build.status !== "FINISHED" || !build.artifacts?.buildUrl) {
    console.error("Build did not finish successfully:\n", JSON.stringify(build, null, 2));
    process.exit(1);
  }
  const apkUrl = build.artifacts.buildUrl;
  console.log(`\nBuild finished: ${apkUrl}`);

  // 3. Download the APK
  const distDir = path.join(ROOT, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  const apkPath = path.join(distDir, `fenyra-plan-${tag}.apk`);
  console.log(`Downloading APK to ${apkPath} ...`);
  await downloadFile(apkUrl, apkPath);

  // 4. Tag + push
  run(`git tag ${tag}`);
  run(`git push`);
  run(`git push origin ${tag}`);

  // 5. GitHub Release with the APK attached
  run(`gh release create ${tag} "${apkPath}" --title "Fenyra Plan ${tag}" --generate-notes`);

  console.log(`\nDone. ${tag} is live on GitHub with the APK attached.`);
}

main().catch((err) => {
  console.error("\nRelease failed:", err.message || err);
  process.exit(1);
});
