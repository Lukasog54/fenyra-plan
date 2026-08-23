/**
 * Zustandsloser Live-Proxy: die Website speichert nichts selbst, jeder API-Call ruft direkt bei
 * Stundenplan24 ab (siehe stundenplan24/client.ts). Keine Datenbank, keine gespeicherten
 * Zugangsdaten, kein Poller mehr nötig.
 */
export const config = {
  stundenplan24BaseUrl: process.env.STUNDENPLAN24_BASE_URL ?? "https://www.stundenplan24.de",
};
