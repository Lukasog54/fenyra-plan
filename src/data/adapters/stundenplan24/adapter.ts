import type {
  ConnectionTestResult,
  SchoolDataSource,
  DataSourceConfig,
  FetchLessonsParams,
  FetchLessonsResult,
} from "../../models/SchoolDataSource";
import type { Lesson } from "../../models/Lesson";
import { getPassword } from "../../security/secureCredentials";
import { parseVpMobilXml, parseVplanXml } from "./parser";
import { validateMobil, validateVplan } from "./validator";
import { lessonsFromMobil, applyVplanNotes } from "./mapper";
import { addDays, todayIsoDate } from "../../../utils/date";

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Basic Auth credentials are ASCII (school-issued usernames/passwords), so a minimal encoder is enough. */
function base64Encode(input: string): string {
  if (typeof btoa === "function") return btoa(input);

  let result = "";
  let i = 0;
  for (; i + 2 < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = input.charCodeAt(i + 1);
    const c = input.charCodeAt(i + 2);
    result += BASE64_CHARS[a >> 2] + BASE64_CHARS[((a & 3) << 4) | (b >> 4)] + BASE64_CHARS[((b & 15) << 2) | (c >> 6)] + BASE64_CHARS[c & 63];
  }
  const remaining = input.length - i;
  if (remaining === 1) {
    const a = input.charCodeAt(i);
    result += BASE64_CHARS[a >> 2] + BASE64_CHARS[(a & 3) << 4] + "==";
  } else if (remaining === 2) {
    const a = input.charCodeAt(i);
    const b = input.charCodeAt(i + 1);
    result += BASE64_CHARS[a >> 2] + BASE64_CHARS[((a & 3) << 4) | (b >> 4)] + BASE64_CHARS[(b & 15) << 2] + "=";
  }
  return result;
}

function compactDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

/**
 * Stundenplan24/Indiware "mobil" + Vertretungsplan adapter. URL shape and
 * XML structure verified against Stundenplan24's own public example school
 * (Schulnummer 10000000, no login required) - see
 * docs/stundenplan24-investigation.md for exactly what was confirmed vs.
 * still a best-effort heuristic (mainly: how a cancelled lesson is marked).
 *
 * `config.stundenplan24.baseUrl` is the school-agnostic portal root (e.g.
 * "https://www.stundenplan24.de"), NOT a per-app path - this adapter
 * derives the actual "mobil"/"vplan" sub-paths from baseUrl + schoolId
 * itself, so users only enter the two things they actually know.
 */
export class Stundenplan24Adapter implements SchoolDataSource {
  constructor(public readonly config: DataSourceConfig) {}

  private isConfigured(): boolean {
    return Boolean(this.config.stundenplan24?.baseUrl && this.config.stundenplan24?.schoolId);
  }

  private async authHeader(): Promise<Record<string, string>> {
    const { username, credentialRef } = this.config.stundenplan24 ?? {};
    if (!username || !credentialRef) return {};
    const password = await getPassword(this.config.id);
    if (!password) return {};
    return { Authorization: `Basic ${base64Encode(`${username}:${password}`)}` };
  }

  private mobilUrl(date: string): string {
    const { baseUrl, schoolId } = this.config.stundenplan24!;
    return `${baseUrl.replace(/\/$/, "")}/${schoolId}/mobil/mobdaten/PlanKl${compactDate(date)}.xml`;
  }

  private vplanUrl(date: string): string {
    const { baseUrl, schoolId } = this.config.stundenplan24!;
    return `${baseUrl.replace(/\/$/, "")}/${schoolId}/vplan/vdaten/VplanKl${compactDate(date)}.xml`;
  }

  private async fetchXml(url: string, headers: Record<string, string>): Promise<string> {
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} für ${url}`);
    }
    return response.text();
  }

  private async fetchDayLessons(
    date: string,
    className: string | undefined,
    headers: Record<string, string>
  ): Promise<{
    lessons: Lesson[];
    rawPayloads: Array<{ kind: string; payload: string }>;
    /** From the mobil feed's own <Kopf><zeitstempel> - the source's "as of" time for this day's file. */
    sourceGeneratedAt?: string;
    /** From the vplan feed's <kopf><schulname> - only present if the vplan fetch for this day succeeded. */
    schoolName?: string;
  } | null> {
    const rawPayloads: Array<{ kind: string; payload: string }> = [];

    let lessons;
    let sourceGeneratedAt: string | undefined;
    try {
      const mobilXml = await this.fetchXml(this.mobilUrl(date), headers);
      rawPayloads.push({ kind: "mobil", payload: mobilXml });
      const mobilDoc = validateMobil(parseVpMobilXml(mobilXml));
      lessons = lessonsFromMobil(mobilDoc, this.config.id, date);
      sourceGeneratedAt = mobilDoc.VpMobil.Kopf.zeitstempel || undefined;
    } catch {
      // No plan published for this date (weekend/holiday/out of range), or the response didn't match
      // the expected shape (e.g. a maintenance page) - skip this one day rather than aborting the
      // whole multi-day sync over a single bad response.
      return null;
    }

    let schoolName: string | undefined;
    try {
      const vplanXml = await this.fetchXml(this.vplanUrl(date), headers);
      rawPayloads.push({ kind: "vplan", payload: vplanXml });
      const vplanDoc = validateVplan(parseVplanXml(vplanXml));
      lessons = applyVplanNotes(lessons, vplanDoc, this.config.id, date);
      schoolName = vplanDoc.vp.kopf.schulname || undefined;
    } catch {
      // Vertretungsplan feed is a separate app from "mobil" and may not be published for every day.
    }

    if (className) lessons = lessons.filter((l) => l.className === className);

    return { lessons, rawPayloads, sourceGeneratedAt, schoolName };
  }

  async fetchLessons(params: FetchLessonsParams): Promise<FetchLessonsResult> {
    if (!this.isConfigured()) {
      throw new Error(
        "Stundenplan24-Datenquelle ist nicht konfiguriert. Bitte Schulnummer und Server-URL in den Einstellungen hinterlegen."
      );
    }

    const headers = await this.authHeader();
    const lessons: Lesson[] = [];
    const rawPayloads: Array<{ kind: string; payload: string }> = [];
    let anyDaySucceeded = false;
    let schoolName: string | undefined;
    let sourceGeneratedAt: string | undefined;
    let sourceMetaIsFromToday = false;
    const today = todayIsoDate();

    let cursor = params.from;
    while (cursor <= params.to) {
      const day = await this.fetchDayLessons(cursor, params.className, headers);
      if (day) {
        anyDaySucceeded = true;
        lessons.push(...day.lessons);
        rawPayloads.push(...day.rawPayloads);

        // Prefer today's file for "how fresh is the plan right now" - fall back to whichever
        // day's file we got first, so the fields aren't left blank on ranges that skip today.
        const isToday = cursor === today;
        if (day.schoolName && (!sourceMetaIsFromToday || isToday)) schoolName = day.schoolName;
        if (day.sourceGeneratedAt && (!sourceMetaIsFromToday || isToday)) sourceGeneratedAt = day.sourceGeneratedAt;
        if (isToday) sourceMetaIsFromToday = true;
      }
      cursor = addDays(cursor, 1);
    }

    // Verified against the real source: an unpublished day (weekend/holiday) and a wrong
    // Schulnummer/401 both come back as the exact same HTTP 404, so a single day can't tell
    // them apart - fetchDayLessons() correctly skips either one quietly. But every day in the
    // whole requested range failing is not a normal holiday (the default sync window is ~4
    // weeks), so surface it as a real error instead of a silent empty "success" - otherwise
    // SyncService would happily wipe already-cached lessons over what's actually a wrong
    // Schulnummer, revoked credentials, or an outage.
    if (!anyDaySucceeded) {
      throw new Error(
        "Für den gesamten abgefragten Zeitraum konnte kein Stundenplan abgerufen werden. Bitte Schulnummer, Zugangsdaten und Internetverbindung prüfen."
      );
    }

    return {
      lessons,
      syncMeta: {
        sourceId: this.config.id,
        lastSyncedAt: new Date().toISOString(),
        lastSyncStatus: "success",
        syncIntervalMinutes: 30,
        schoolName,
        sourceGeneratedAt,
      },
      rawPayloads,
    };
  }

  async fetchAvailableClasses(): Promise<string[]> {
    if (!this.isConfigured()) return [];
    const headers = await this.authHeader();
    const today = new Date().toISOString().slice(0, 10);
    const day = await this.fetchDayLessons(today, undefined, headers);
    if (!day) return [];
    return [...new Set(day.lessons.map((l) => l.className).filter((c): c is string => Boolean(c)))];
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.isConfigured()) {
      return { ok: false, message: "Keine Server-URL/Schulnummer hinterlegt." };
    }

    const { baseUrl, schoolId } = this.config.stundenplan24!;
    const headers = await this.authHeader();

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${schoolId}/mobil/`, { method: "GET", headers });

      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: "Anmeldung fehlgeschlagen. Bitte Benutzername und Passwort prüfen." };
      }
      if (!response.ok) {
        return { ok: false, message: `Server antwortet mit Status ${response.status}. Bitte Server-URL und Schulnummer prüfen.` };
      }
      return { ok: true, message: "Verbindung erfolgreich. Stundenplan- und Vertretungsdaten können jetzt synchronisiert werden." };
    } catch {
      return { ok: false, message: "Verbindung fehlgeschlagen. Bitte Server-URL und Internetverbindung prüfen." };
    }
  }
}
