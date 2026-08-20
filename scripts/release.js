#!/usr/bin/env node
/**
 * Full Fenyra Plan release pipeline - run with `npm run release`:
 *   1. Bumps the patch version in app.json + package.json and commits it.
 *   2. Builds the Android APK on EAS (waits for it to finish).
 *   3. Downloads the finished APK.
 *   4. Tags the commit and pushes branch + tag to GitHub.
 *   5. Creates a GitHub Release for that tag with the APK attached (via the
 *      GitHub REST API directly, no `gh` CLI needed), so the app's own
 *      in-app update check (GITHUB_REPO in src/data/constants.ts) finds it.
 *
 * One-time setup this script does NOT do for you (do these once, manually):
 *   - `eas login` (needs an Expo account with access to this project)
 *   - `git remote add origin <your-repo-url>` if not already configured
 *   - A GitHub personal access token with "Contents: read and write" on this
 *     repo, saved as GITHUB_TOKEN in a `.env` file in the project root
 *     (never committed - see .gitignore). Create one at
 *     https://github.com/settings/personal-access-tokens/new
 *     -> Repository access: only this repo -> Permissions: Contents: Read and write.
 *     .env content:  GITHUB_TOKEN=github_pat_xxxxxxxx
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

/** Minimal .env loader (just GITHUB_TOKEN=... lines) - no extra dependency needed. */
function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

/** Parses "owner/repo" out of the git remote, so it never has to be duplicated here. */
function getRepoFromGitRemote() {
  const url = runCapture("git config --get remote.origin.url").trim();
  const match = url.match(/github\.com[/:]([^/]+)\/(.+?)(\.git)?$/);
  if (!match) throw new Error(`Could not parse a GitHub owner/repo out of remote "${url}"`);
  return `${match[1]}/${match[2]}`;
}

function githubApiRequest(method, hostname, requestPath, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? (Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))) : undefined;
    const req = https.request(
      {
        hostname,
        path: requestPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "fenyra-plan-release-script",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(payload
            ? {
                "Content-Type": Buffer.isBuffer(body) ? "application/vnd.android.package-archive" : "application/json",
                "Content-Length": payload.length,
              }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(text ? JSON.parse(text) : {});
          } else {
            reject(new Error(`GitHub API ${method} ${requestPath} failed: ${res.statusCode} ${text}`));
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
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
  loadDotEnv();
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      "GITHUB_TOKEN is not set. Create a fine-grained personal access token (Contents: Read and write) at\n" +
        "https://github.com/settings/personal-access-tokens/new and put it in a .env file in the project root:\n" +
        "  GITHUB_TOKEN=github_pat_xxxxxxxx\n" +
        "(.env is gitignored, it will never be committed)."
    );
    process.exit(1);
  }
  const repo = getRepoFromGitRemote();

  const appJsonPath = path.join(ROOT, "app.json");
  const packageJsonPath = path.join(ROOT, "package.json");
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  const oldVersion = appJson.expo.version;
  const newVersion = bumpPatch(oldVersion);
  const tag = `v${newVersion}`;
  console.log(`Fenyra Plan release: ${oldVersion} -> ${newVersion} (${tag}) for ${repo}`);

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
  const apkName = `fenyra-plan-${tag}.apk`;
  const apkPath = path.join(distDir, apkName);
  console.log(`Downloading APK to ${apkPath} ...`);
  await downloadFile(apkUrl, apkPath);

  // 4. Tag + push
  run(`git tag ${tag}`);
  run(`git push`);
  run(`git push origin ${tag}`);

  // 5. GitHub Release with the APK attached, via the REST API directly
  console.log(`\nCreating GitHub release ${tag} on ${repo} ...`);
  const release = await githubApiRequest("POST", "api.github.com", `/repos/${repo}/releases`, token, {
    tag_name: tag,
    name: `Fenyra Plan ${tag}`,
    generate_release_notes: true,
  });
  const uploadHost = "uploads.github.com";
  const uploadPath = `/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(apkName)}`;
  console.log(`Uploading ${apkName} (${(fs.statSync(apkPath).size / 1024 / 1024).toFixed(1)} MB) ...`);
  await githubApiRequest("POST", uploadHost, uploadPath, token, fs.readFileSync(apkPath));

  console.log(`\nDone. ${tag} is live on GitHub with the APK attached: ${release.html_url}`);
}

main().catch((err) => {
  console.error("\nRelease failed:", err.message || err);
  process.exit(1);
});
