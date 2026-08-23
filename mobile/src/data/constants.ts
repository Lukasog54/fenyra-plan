export const STUNDENPLAN24_SOURCE_ID = "stundenplan24";

/** Fixed - not user-editable. Most schools are hosted here; a school running its own server is out of scope. */
export const STUNDENPLAN24_BASE_URL = "https://www.stundenplan24.de";

/**
 * Die Fenyra-Website (`web/` im Repo-Root) - sie enthält das komplette Backend als eigene,
 * zustandslose API-Routes (`web/src/app/api/`, siehe `web/README.md`): ruft bei jedem Request live
 * bei Stundenplan24 ab und liefert der App dieselben Daten, die auch die Website selbst anzeigt.
 * Jeder Request trägt das echte Stundenplan24-Passwort als Basic-Auth-Header (siehe
 * `src/data/adapters/backend/`) - deshalb MUSS das hier eine echte https://-Adresse sein, sobald es
 * kein reiner Dev-Server mehr ist, sonst geht das Passwort im Klartext übers Netz.
 *
 * Lokaler Dev-Server als Default. `scripts/release.js`/`scripts/release-ios.js` weigern sich, einen
 * Release zu bauen, solange dieser Wert noch auf localhost/http zeigt (Sicherheits-Gate) - vor
 * einem echten Release also auf die tatsächliche Domain der gehosteten Website umstellen.
 */
export const FENYRA_BACKEND_URL = "http://localhost:3000";

/** "owner/repo" for the GitHub Releases-based update check (see src/data/updates/UpdateCheck.ts). */
export const GITHUB_REPO = "Lukasog54/fenyra-plan";

/** Stundenplan24's own public example school - reachable without any credentials, verified live
 * (see docs/stundenplan24-investigation.md). Used to let a password be skipped in the login UI. */
export const PUBLIC_DEMO_SCHOOL_ID = "10000000";
