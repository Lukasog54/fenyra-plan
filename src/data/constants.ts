export const STUNDENPLAN24_SOURCE_ID = "stundenplan24";

/** Fixed - not user-editable. Most schools are hosted here; a school running its own server is out of scope. */
export const STUNDENPLAN24_BASE_URL = "https://www.stundenplan24.de";

/** "owner/repo" for the GitHub Releases-based update check (see src/data/updates/UpdateCheck.ts). */
export const GITHUB_REPO = "Lukasog54/fenyra-plan";

/** Stundenplan24's own public example school - reachable without any credentials, verified live
 * (see docs/stundenplan24-investigation.md). Used to let a password be skipped in the login UI. */
export const PUBLIC_DEMO_SCHOOL_ID = "10000000";
