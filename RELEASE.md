# Release

`npm run release` does everything: run tests + typecheck → bump version → build the Android APK on
EAS → download it → commit, tag, push to GitHub → publish a GitHub Release with the APK attached
(so the app's own "Nach Updates suchen" screen finds it).

Two safety gates run before anything expensive happens:
- **Tests + `tsc --noEmit` must pass.** If either fails, the release stops immediately - no EAS
  build minutes wasted on code that's already known to be broken.
- **A short, plain-language "what got better" summary is required.** No code/file details, just
  what changed for whoever's using the app - this becomes the GitHub release body, which the
  app's own "Über die App" screen shows as "ÄNDERUNGEN" for every update. Without it, the release
  is refused.

## One-time setup (do this once, not every release)

1. **GitHub repo**: create one (or use an existing one) and add it as the remote:
   ```
   git remote add origin https://github.com/<owner>/<repo>.git
   git push -u origin master
   ```
2. **Set `GITHUB_REPO`** in `src/data/constants.ts` to `"<owner>/<repo>"` (must match the repo
   from step 1 exactly, or the in-app update check will never find your releases).
3. **Create a GitHub token** so the script can publish releases (no `gh` CLI needed): go to
   https://github.com/settings/personal-access-tokens/new, restrict it to this repo, grant
   **Contents: Read and write**, then put it in a `.env` file in the project root (gitignored,
   never committed):
   ```
   GITHUB_TOKEN=github_pat_xxxxxxxx
   ```
4. **Log in to EAS** (if not already): `npx eas-cli login`.

## Every release after that

```
npm run release
```

You'll be prompted for the "what improved" summary (or pass it directly:
`npm run release -- "Schnelleres Update, weniger Abstürze"`). After that it runs tests+typecheck,
bumps the patch version, builds, downloads the APK, and publishes the GitHub Release. Watch the
terminal output — an EAS build takes several minutes, and the script waits for it before
continuing.

### If something fails partway through

The steps are sequential and safe to re-run individually if you need to:
- `npm run build:android` — just build+wait, without touching git or GitHub.
- `npm run push` — push whatever's currently committed/tagged.
- Publish a release manually once you have an APK (e.g. from `dist/`), no CLI needed: go to
  `https://github.com/<owner>/<repo>/releases/new`, pick the tag, and drag the APK in.

## iOS

Unlike Android, iOS has no free sideloading equivalent — every distribution method (App Store,
TestFlight, ad-hoc) requires a paid Apple Developer Program membership. Distribution here is via
App Store Connect/TestFlight, not GitHub Releases.

**Already done (code side, works today):**
- `app.json` has `ios.bundleIdentifier` (`de.fenyra.plan`) and `ios.buildNumber` set.
- `eas.json` has a dedicated `"ios"` build profile (`distribution: "store"`) and an empty
  `submit.ios` scaffold.
- `scripts/release-ios.js` (`npm run release:ios`) is fully written: same test+typecheck gate as
  the Android release, bumps version + `ios.buildNumber`, builds on EAS, submits straight to App
  Store Connect via `eas submit`, tags as `ios-v<version>-<buildNumber>` (separate from Android's
  `vX.Y.Z` tags — an iOS release has no GitHub Release object to tie a tag to).

**Still needed (account side, one-time, not something a script can do for you):**
1. **Apple Developer Program membership** (99 $/year) — https://developer.apple.com/programs/.
2. **`eas credentials --platform ios`** run once interactively — EAS creates/manages the signing
   certificate and provisioning profile for you.
3. **An app record in App Store Connect** using the same bundle identifier as `app.json`
   (`de.fenyra.plan`).
4. **`eas submit --platform ios`** run once interactively — it prompts for your Apple ID/team on
   first use, then `npm run release:ios` can run it non-interactively from then on.

Once those four are done, `npm run release:ios` works exactly like `npm run release` does for
Android today.
