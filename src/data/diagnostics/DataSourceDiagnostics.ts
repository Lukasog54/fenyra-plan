import type { Lesson } from "../models/Lesson";
import type { SchoolDataSource } from "../models/SchoolDataSource";
import type { SyncMeta } from "../models/SyncMeta";
import { getSyncMeta } from "../database/repositories/syncMetaRepository";
import { getDb } from "../database/db";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { todayIsoDate } from "../../utils/date";

export type DiagnosticStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "AVAILABLE_BUT_NOT_PARSED"
  | "AVAILABLE_BUT_NOT_STORED"
  | "AVAILABLE_BUT_NOT_DISPLAYED"
  | "AVAILABLE_BUT_BROKEN"
  | "ERROR"
  | "UNKNOWN"
  | "PASS"
  | "FAIL";

export interface DiagnosticEntry {
  key: string;
  label: string;
  status: DiagnosticStatus;
  detail?: string;
}

export interface DataSourceAuditReport {
  sourceId: string;
  generatedAt: string;
  range: { from: string; to: string };
  authentication: DiagnosticEntry;
  /** Pipeline-stage health (Internetverbindung/Erreichbarkeit/Session/Datenabruf/Datenbank/Sync), PASS/FAIL/UNKNOWN. */
  systemChecks: DiagnosticEntry[];
  categories: DiagnosticEntry[];
}

/**
 * Lesson fields the Stundenplan24 mapper (src/data/adapters/stundenplan24/mapper.ts)
 * actually sets, kept in sync by hand with that file. Anything not listed here
 * has no parser support yet for that source, regardless of what the real feed
 * turns out to contain - see docs/stundenplan24-investigation.md.
 */
const STUNDENPLAN24_PARSED_FIELDS = new Set<keyof Lesson>([
  "id",
  "date",
  "startTime",
  "endTime",
  "period",
  "subject",
  "teacher",
  "room",
  "className",
  "course",
  "status",
  "originalSubject",
  "originalTeacher",
  "note",
  "lastUpdated",
  "sourceId",
  "rawData",
  // NOT in this set: originalRoom (feed has no lookup table for it, see
  // docs/stundenplan24-investigation.md), weekType/isExam/examInfo/
  // movedFrom/movedTo (mapper doesn't populate these yet).
]);

interface EvalContext {
  range: { from: string; to: string };
  syncMeta: SyncMeta | null;
}

interface CategoryDef {
  key: string;
  label: string;
  /** Lesson fields this category depends on; empty = not modeled at all (unless viaSyncMeta). */
  parsedFields: Array<keyof Lesson>;
  /** True for categories carried on SyncMeta (document-level, e.g. Schulname) rather than per-Lesson. */
  viaSyncMeta?: boolean;
  stored: boolean;
  displayed: boolean;
  presence: (lessons: Lesson[], ctx: EvalContext) => boolean;
  detail?: string;
}

/**
 * Fields confirmed NOT provided anywhere in the authorized access (mobil/vplan feeds, plus the
 * bare portal page which returns 403) - verified via curl against the real source, not assumed.
 * See docs/stundenplan24-investigation.md.
 */
const NOT_AVAILABLE_FROM_SOURCE: Array<{ key: string; label: string; detail: string }> = [
  { key: "adresse", label: "Adresse", detail: "NOT_AVAILABLE_FROM_SOURCE - kein Adressfeld in mobil- oder Vertretungsplan-Feed; die bloße Portal-Seite zur Schulnummer liefert HTTP 403." },
  { key: "ort", label: "Ort", detail: "NOT_AVAILABLE_FROM_SOURCE - wie Adresse." },
  { key: "kontaktdaten", label: "Kontaktdaten", detail: "NOT_AVAILABLE_FROM_SOURCE - keine Telefonnummer/E-Mail in einem der beiden Feeds gefunden." },
  { key: "ansprechpartner", label: "Ansprechpartner", detail: "NOT_AVAILABLE_FROM_SOURCE - kein entsprechendes Feld in einem der beiden Feeds." },
  { key: "logo", label: "Logo", detail: "NOT_AVAILABLE_FROM_SOURCE - keine Bild-/Logo-URL in einem der beiden Feeds oder auf der Portal-Seite gefunden." },
  { key: "benutzerinformationen", label: "Benutzerinformationen", detail: "NOT_AVAILABLE_FROM_SOURCE - der Feed enthält keine Information darüber, wer/als was eingeloggt ist; „Benutzer“ ist eine rein lokale Login-Eingabe, kein Quellenfeld." },
  { key: "schulnummer_feld", label: "Schulnummer (Feed-eigenes Feld)", detail: "An beiden bisher geprüften Schulen leer, obwohl im Schema vorgesehen (<Kopf><schulnummer>) - als Quelle unzuverlässig. Fenyra zeigt stattdessen die vom Nutzer beim Login eingegebene, bereits bekannte Schulnummer an (Einstellungen → Schule)." },
];

const CATEGORIES: CategoryDef[] = [
  {
    key: "schulname",
    label: "Schulname",
    parsedFields: [],
    viaSyncMeta: true,
    stored: true,
    displayed: true,
    presence: (_ls, ctx) => Boolean(ctx.syncMeta?.schoolName),
    detail: "Aus dem Vertretungsplan-Feed (<kopf><schulname>), wird auf dem Schule-Bildschirm angezeigt.",
  },
  {
    key: "aktualisierungszeit",
    label: "Aktualisierungszeit (Quelle)",
    parsedFields: [],
    viaSyncMeta: true,
    stored: true,
    displayed: true,
    presence: (_ls, ctx) => Boolean(ctx.syncMeta?.sourceGeneratedAt),
    detail: "Aus dem mobil-Feed (<Kopf><zeitstempel>) - wann die Quelle den Plan zuletzt erzeugt hat, nicht wann Fenyra zuletzt synchronisiert hat (das steht separat als „Zuletzt synchronisiert“).",
  },
  {
    key: "schulinformationen",
    label: "Schulinformationen (allgemein)",
    parsedFields: [],
    stored: false,
    displayed: false,
    presence: () => false,
    detail: "Beide Feeds liefern zusätzlich <FreieTage>/<freietage> (schulfreie Tage als YYMMDD-Liste) - bleibt über passthrough in rawData erhalten, wird aber nicht als eigenes Modellfeld ausgewertet/angezeigt.",
  },
  { key: "klassen", label: "Klassen / Klasseninformationen", parsedFields: ["className"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.className)) },
  { key: "kurse", label: "Kurse", parsedFields: ["course"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.course)) },
  { key: "gruppen", label: "Gruppen", parsedFields: [], stored: false, displayed: false, presence: () => false, detail: "Nicht als eigenes Konzept modelliert (nur Klasse/Kurs)." },
  { key: "schuelerprofil", label: "Schülerprofil", parsedFields: [], stored: false, displayed: false, presence: () => false, detail: "Nicht modelliert - Profil/Klassen-Auswahl ist rein lokale Einstellung, kein Quellenfeld." },
  { key: "lehrer", label: "Lehrer", parsedFields: ["teacher"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.teacher)) },
  { key: "raeume", label: "Räume", parsedFields: ["room"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.room)) },
  { key: "unterrichtszeiten", label: "Unterrichtszeiten", parsedFields: ["startTime", "endTime"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.startTime)) },
  { key: "tagesstundenplan", label: "Tagesstundenplan", parsedFields: ["date", "period"], stored: true, displayed: true, presence: (ls) => ls.length > 0 },
  { key: "wochenstundenplan", label: "Wochenstundenplan", parsedFields: ["date"], stored: true, displayed: true, presence: (ls) => new Set(ls.map((l) => l.date)).size > 1 },
  { key: "vertretungsplan", label: "Vertretungsplan", parsedFields: ["status"], stored: true, displayed: true, presence: (ls) => ls.some((l) => l.status !== "normal") },
  { key: "unterrichtsausfaelle", label: "Unterrichtsausfälle", parsedFields: ["status"], stored: true, displayed: true, presence: (ls) => ls.some((l) => l.status === "cancelled") },
  { key: "raumaenderungen", label: "Raumänderungen", parsedFields: ["status"], stored: true, displayed: true, presence: (ls) => ls.some((l) => l.status === "room-change"), detail: "Raumänderung wird erkannt und angezeigt; der ursprüngliche Raum (originalRoom) ist aus dem Stundenplan24-Feed nicht rekonstruierbar (kein Lookup dafür vorhanden)." },
  { key: "lehreraenderungen", label: "Lehreränderungen", parsedFields: ["status", "originalTeacher"], stored: true, displayed: true, presence: (ls) => ls.some((l) => l.status === "teacher-change") },
  { key: "fachaenderungen", label: "Fachänderungen", parsedFields: ["status", "originalSubject"], stored: true, displayed: true, presence: (ls) => ls.some((l) => l.status === "subject-change") },
  { key: "verlegungen", label: "Verlegungen", parsedFields: ["status"], stored: true, displayed: true, presence: (ls) => ls.some((l) => l.status === "moved"), detail: "Verlegter Status/Hinweistext wird angezeigt; strukturierte Ziel-/Herkunftsangabe (movedFrom/movedTo) wird für Stundenplan24 mangels Rohfeld nicht befüllt." },
  { key: "hinweise", label: "Hinweise", parsedFields: ["note"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.note)) },
  { key: "bemerkungen", label: "Bemerkungen", parsedFields: ["note"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.note)), detail: "Wird zusammen mit Hinweise als ein Freitextfeld (note) geführt, kein separates Quellenfeld bekannt." },
  { key: "vergangene_tage", label: "Vergangene Tage", parsedFields: ["date"], stored: true, displayed: true, presence: (_ls, ctx) => ctx.range.from < todayIsoDate() },
  { key: "zukuenftige_tage", label: "Zukünftige Tage", parsedFields: ["date"], stored: true, displayed: true, presence: (_ls, ctx) => ctx.range.to > todayIsoDate() },
];

function isParsed(fields: Array<keyof Lesson>): boolean {
  if (fields.length === 0) return false;
  return fields.every((f) => STUNDENPLAN24_PARSED_FIELDS.has(f));
}

function evaluateCategory(def: CategoryDef, lessons: Lesson[] | null, fetchError: string | null, ctx: EvalContext): DiagnosticEntry {
  if (!def.viaSyncMeta && !isParsed(def.parsedFields)) {
    return { key: def.key, label: def.label, status: "UNKNOWN", detail: def.detail ?? "Kein Parser-/Modellfeld für diese Kategorie vorhanden - ob die Quelle das liefert, ist ungeklärt." };
  }
  if (fetchError || !lessons) {
    return { key: def.key, label: def.label, status: "UNKNOWN", detail: `Live-Datenabruf nicht möglich: ${fetchError ?? "kein Ergebnis"}` };
  }
  if (!def.presence(lessons, ctx)) {
    return { key: def.key, label: def.label, status: "UNAVAILABLE", detail: "In den abgerufenen Daten dieser Quelle nicht enthalten." };
  }
  if (!def.stored) return { key: def.key, label: def.label, status: "AVAILABLE_BUT_NOT_STORED", detail: def.detail };
  if (!def.displayed) return { key: def.key, label: def.label, status: "AVAILABLE_BUT_NOT_DISPLAYED", detail: def.detail };
  return { key: def.key, label: def.label, status: "AVAILABLE", detail: def.detail };
}

export async function runDataSourceAudit(
  adapter: SchoolDataSource,
  range: { from: string; to: string }
): Promise<DataSourceAuditReport> {
  const internetverbindung: DiagnosticEntry = {
    key: "internetverbindung",
    label: "Internetverbindung",
    status: useNetworkStatus.getIsOnline() ? "PASS" : "FAIL",
  };

  let connectionResult: Awaited<ReturnType<SchoolDataSource["testConnection"]>> | null = null;
  let connectionError: string | null = null;
  try {
    connectionResult = await adapter.testConnection();
  } catch (error) {
    connectionError = error instanceof Error ? error.message : String(error);
  }

  const authentication: DiagnosticEntry = connectionError
    ? { key: "authentication", label: "Authentifizierung", status: "ERROR", detail: connectionError }
    : { key: "authentication", label: "Authentifizierung", status: connectionResult!.ok ? "AVAILABLE" : "UNAVAILABLE", detail: connectionResult!.message };

  const erreichbarkeit: DiagnosticEntry = {
    key: "erreichbarkeit",
    label: "Stundenplan24-Erreichbarkeit",
    status: connectionError ? "FAIL" : connectionResult!.reachable ? "PASS" : connectionResult!.reachable === false ? "FAIL" : "UNKNOWN",
    detail: connectionError ?? undefined,
  };
  const authCheck: DiagnosticEntry = {
    key: "authentifizierung_check",
    label: "Authentifizierung",
    status: connectionError ? "FAIL" : connectionResult!.ok ? "PASS" : connectionResult!.reachable ? "FAIL" : "UNKNOWN",
    detail: connectionResult?.message,
  };
  const session: DiagnosticEntry = {
    key: "session",
    label: "Session",
    status: "PASS",
    detail: "Kein Sitzungsmechanismus in der Quelle - jede Anfrage authentifiziert sich selbst (Basic Auth, kein Cookie/Token). Nichts zu prüfen, kein Ablauf möglich.",
  };

  let lessons: Lesson[] | null = null;
  let syncMeta: SyncMeta | null = null;
  let fetchError: string | null = null;
  try {
    const result = await adapter.fetchLessons(range);
    lessons = result.lessons;
    syncMeta = result.syncMeta;
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error);
  }

  const datenabruf: DiagnosticEntry = {
    key: "datenabruf",
    label: "Datenabruf / Parser / Mapping",
    status: fetchError ? "FAIL" : "PASS",
    detail: fetchError ?? undefined,
  };

  let datenbank: DiagnosticEntry;
  try {
    await getDb();
    datenbank = { key: "datenbank", label: "Datenbank", status: "PASS" };
  } catch (error) {
    datenbank = { key: "datenbank", label: "Datenbank", status: "FAIL", detail: error instanceof Error ? error.message : String(error) };
  }

  const persistedSyncMeta = await getSyncMeta(adapter.config.id).catch(() => null);
  const synchronisierung: DiagnosticEntry = persistedSyncMeta
    ? {
        key: "synchronisierung",
        label: "Synchronisierung",
        status: persistedSyncMeta.lastSyncStatus === "success" ? "PASS" : persistedSyncMeta.lastSyncStatus === "error" ? "FAIL" : "UNKNOWN",
        detail: persistedSyncMeta.lastError ?? undefined,
      }
    : { key: "synchronisierung", label: "Synchronisierung", status: "UNKNOWN", detail: "Noch nie synchronisiert." };

  const systemChecks: DiagnosticEntry[] = [internetverbindung, erreichbarkeit, authCheck, session, datenabruf, datenbank, synchronisierung];

  const categories = [
    ...CATEGORIES.map((def) => evaluateCategory(def, lessons, fetchError, { range, syncMeta })),
    ...NOT_AVAILABLE_FROM_SOURCE.map(
      ({ key, label, detail }): DiagnosticEntry => ({ key, label, status: "UNAVAILABLE", detail })
    ),
  ];

  return {
    sourceId: adapter.config.id,
    generatedAt: new Date().toISOString(),
    range,
    authentication,
    systemChecks,
    categories,
  };
}
