import type { Lesson } from "../models/Lesson";
import type { SchoolDataSource } from "../models/SchoolDataSource";
import { todayIsoDate } from "../../utils/date";

export type DiagnosticStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "AVAILABLE_BUT_NOT_PARSED"
  | "AVAILABLE_BUT_NOT_STORED"
  | "AVAILABLE_BUT_NOT_DISPLAYED"
  | "ERROR"
  | "UNKNOWN";

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

interface CategoryDef {
  key: string;
  label: string;
  /** Lesson fields this category depends on; empty = not modeled at all. */
  parsedFields: Array<keyof Lesson>;
  stored: boolean;
  displayed: boolean;
  presence: (lessons: Lesson[], ctx: { range: { from: string; to: string } }) => boolean;
  detail?: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: "schulinformationen", label: "Schulinformationen", parsedFields: [], stored: false, displayed: false, presence: () => false, detail: "Der Vertretungsplan-Feed liefert einen Schulnamen (<schulname>), aber Fenyra hat dafür noch kein Modellfeld/keine Anzeige." },
  { key: "klassen", label: "Klassen", parsedFields: ["className"], stored: true, displayed: true, presence: (ls) => ls.some((l) => Boolean(l.className)) },
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

function evaluateCategory(
  def: CategoryDef,
  lessons: Lesson[] | null,
  fetchError: string | null,
  ctx: { range: { from: string; to: string } }
): DiagnosticEntry {
  if (!isParsed(def.parsedFields)) {
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
  let authentication: DiagnosticEntry;
  try {
    const result = await adapter.testConnection();
    authentication = {
      key: "authentication",
      label: "Authentifizierung",
      status: result.ok ? "AVAILABLE" : "UNAVAILABLE",
      detail: result.message,
    };
  } catch (error) {
    authentication = {
      key: "authentication",
      label: "Authentifizierung",
      status: "ERROR",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  let lessons: Lesson[] | null = null;
  let fetchError: string | null = null;
  try {
    const result = await adapter.fetchLessons(range);
    lessons = result.lessons;
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error);
  }

  const categories = CATEGORIES.map((def) => evaluateCategory(def, lessons, fetchError, { range }));

  return {
    sourceId: adapter.config.id,
    generatedAt: new Date().toISOString(),
    range,
    authentication,
    categories,
  };
}
