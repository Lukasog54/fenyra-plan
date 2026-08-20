export const STUNDENPLAN24_SOURCE_ID = "stundenplan24";

/** Fixed - not user-editable. Most schools are hosted here; a school running its own server is out of scope. */
export const STUNDENPLAN24_BASE_URL = "https://www.stundenplan24.de";

/**
 * "owner/repo" for the GitHub Releases-based update check (see src/data/updates/UpdateCheck.ts).
 * PLACEHOLDER - this repo does not exist on GitHub yet (no remote configured as of this constant
 * being added). The update check will correctly report "no update available" against a
 * placeholder rather than erroring, but won't find anything real until this is set to an actual
 * repo that publishes GitHub Releases with a built APK attached to each one.
 */
export const GITHUB_REPO = "fenrinoj/fenyra-plan";
