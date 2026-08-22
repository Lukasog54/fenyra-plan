#!/usr/bin/env node
/**
 * iOS release pipeline - run with `npm run release:ios`:
 *   0. Runs `npm test` and `tsc --noEmit` - aborts before spending any EAS build minutes (or a
 *      submission) if either fails.
 *   1. Bumps the shared app version (same patch bump as the Android release) and
 *      `ios.buildNumber`, commits both.
 *   2. Builds the iOS app on EAS (profile "ios", store distribution, waits for completion).
 *   3. Submits the finished build directly to App Store Connect/TestFlight via `eas submit` -
 *      no APK-style download/GitHub-Release step here. Unlike Android (scripts/release.js,
 *      GitHub Releases as the distribution channel), Apple's own App Store Connect *is* the
 *      distribution channel for iOS, so there's nothing to download or attach anywhere.
 *   4. Tags the commit (`ios-v<version>-<buildNumber>`, a separate tag namespace from Android's
 *      `vX.Y.Z` tags) and pushes. Separate because an iOS release has no GitHub Release object
 *      to tie a `vX.Y.Z` tag to the way the Android ones do.
 *
 * NOT runnable yet - needs a one-time, account-side setup first (see RELEASE.md, "iOS" section):
 *   - An Apple Developer Program membership (99 $/year)
 *   - `eas credentials --platform ios` run once interactively (provisions the certificate +
 *     provisioning profile via EAS)
 *   - An app record in App Store Connect using the same bundle identifier as app.json
 *     (`de.fenyra.plan`)
 *   - `eas submit --platform ios` run once interactively (prompts for Apple ID/team on first
 *     use, then works non-interactively from this script)
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

function bumpPatch(version) {
  const parts = version.split(".").map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

function bumpBuildNumber(buildNumber) {
  return String((parseInt(buildNumber, 10) || 0) + 1);
}

async function main() {
  // 0. Gate: don't spend EAS build minutes (or a submission) on code that's already known to be broken.
  console.log("Checks vor dem iOS-Release ...");
  run(`npm test -- --silent`);
  run(`npx tsc --noEmit`);

  const appJsonPath = path.join(ROOT, "app.json");
  const packageJsonPath = path.join(ROOT, "package.json");
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  const oldVersion = appJson.expo.version;
  const newVersion = bumpPatch(oldVersion);
  const oldBuildNumber = appJson.expo.ios?.buildNumber ?? "1";
  const newBuildNumber = bumpBuildNumber(oldBuildNumber);
  const tag = `ios-v${newVersion}-${newBuildNumber}`;
  console.log(`Fenyra Plan iOS release: ${oldVersion} (build ${oldBuildNumber}) -> ${newVersion} (build ${newBuildNumber})`);

  // 1. Bump + commit
  appJson.expo.version = newVersion;
  appJson.expo.ios.buildNumber = newBuildNumber;
  packageJson.version = newVersion;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  run(`git add app.json package.json`);
  run(`git commit -m "chore: ios release ${tag}"`);

  // 2. Build on EAS (waits for completion)
  run(`npx eas-cli build --platform ios --profile ios --non-interactive --wait`);

  // 3. Submit the just-built artifact straight to App Store Connect/TestFlight
  run(`npx eas-cli submit --platform ios --latest --non-interactive`);

  // 4. Tag + push
  run(`git tag ${tag}`);
  run(`git push`);
  run(`git push origin ${tag}`);

  console.log(`\nDone. ${tag} was built and submitted to App Store Connect.`);
}

main().catch((err) => {
  console.error("\niOS release failed:", err.message || err);
  process.exit(1);
});
