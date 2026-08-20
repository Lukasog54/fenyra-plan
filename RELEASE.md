# Release

`npm run release` does everything: bump version → build the Android APK on EAS → download it →
commit, tag, push to GitHub → publish a GitHub Release with the APK attached (so the app's own
"Nach Updates suchen" screen finds it).

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

That's it. It bumps the patch version, builds, downloads the APK, and publishes the GitHub
Release. Watch the terminal output — an EAS build takes several minutes, and the script waits for
it before continuing.

### If something fails partway through

The steps are sequential and safe to re-run individually if you need to:
- `npm run build:android` — just build+wait, without touching git or GitHub.
- `npm run push` — push whatever's currently committed/tagged.
- Publish a release manually once you have an APK (e.g. from `dist/`), no CLI needed: go to
  `https://github.com/<owner>/<repo>/releases/new`, pick the tag, and drag the APK in.
