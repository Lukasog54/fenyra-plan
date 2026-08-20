export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
  /** Direct APK download link, if the release has one attached - null if not (nothing to click). */
  downloadUrl: string | null;
  /** The release page itself, as a fallback if no .apk asset is attached. */
  htmlUrl: string;
}

interface GitHubRelease {
  tag_name: string;
  body: string | null;
  html_url: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

function stripLeadingV(tag: string): string {
  return tag.replace(/^v/i, "");
}

/** Simple dot-separated numeric comparison - positive if a > b, negative if a < b, 0 if equal. */
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Checks GitHub Releases for a newer version than `currentVersion`. Returns null (not an error)
 * when the repo has no releases yet, doesn't exist, or the request otherwise fails - a missing
 * update source is not the same as a confirmed "you're up to date", so callers must not treat
 * null as "no update available".
 */
export async function checkForUpdate(repo: string, currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;

    const release = (await response.json()) as GitHubRelease;
    const latestVersion = stripLeadingV(release.tag_name);
    const apkAsset = release.assets.find((asset) => asset.name.endsWith(".apk"));

    return {
      available: compareVersions(latestVersion, currentVersion) > 0,
      currentVersion,
      latestVersion,
      changelog: release.body ?? "",
      downloadUrl: apkAsset?.browser_download_url ?? null,
      htmlUrl: release.html_url,
    };
  } catch {
    return null;
  }
}
