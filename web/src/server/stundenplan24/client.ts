import type { Lesson } from "../models/Lesson";
import { parseVpMobilXml, parseVplanXml } from "./parser";
import { validateMobil, validateVplan } from "./validator";
import { lessonsFromMobil, applyVplanNotes } from "./mapper";
import { addDays, todayIsoDate } from "../utils/date";
import { ClassifiedError } from "../errors/ClassifiedError";

/** Portiert 1:1 aus mobile/src/data/adapters/stundenplan24/adapter.ts (Node-Variante, siehe web/README.md). */

export interface SchoolCredentials {
  baseUrl: string;
  schoolId: string;
  username: string;
  password: string;
}

export interface FetchLessonsParams {
  from: string;
  to: string;
  className?: string;
}

export interface FetchLessonsResult {
  lessons: Lesson[];
  schoolName?: string;
  sourceGeneratedAt?: string;
  datesFetched: string[];
  rawPayloads: Array<{ kind: string; payload: string }>;
}

export interface ConnectionTestResult {
  ok: boolean;
  message?: string;
  reachable?: boolean;
}

type DayFailureKind = "network" | "auth" | "other";

function classifyDayFailure(error: unknown): DayFailureKind {
  if (error instanceof Error) {
    if (/^HTTP 401\b|^HTTP 403\b/.test(error.message)) return "auth";
    if (/^HTTP \d/.test(error.message)) return "other";
  }
  return "network";
}

function authHeader(creds: SchoolCredentials): Record<string, string> {
  if (!creds.username || !creds.password) return {};
  return { Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`, "utf-8").toString("base64")}` };
}

function compactDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function mobilUrl(creds: SchoolCredentials, date: string): string {
  return `${creds.baseUrl.replace(/\/$/, "")}/${creds.schoolId}/mobil/mobdaten/PlanKl${compactDate(date)}.xml`;
}

function vplanUrl(creds: SchoolCredentials, date: string): string {
  return `${creds.baseUrl.replace(/\/$/, "")}/${creds.schoolId}/vplan/vdaten/VplanKl${compactDate(date)}.xml`;
}

async function fetchXml(url: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} für ${url}`);
  }
  return response.text();
}

async function fetchDayLessons(
  creds: SchoolCredentials,
  date: string,
  className: string | undefined,
  headers: Record<string, string>,
  onFailure?: (kind: DayFailureKind) => void
): Promise<{
  lessons: Lesson[];
  rawPayloads: Array<{ kind: string; payload: string }>;
  sourceGeneratedAt?: string;
  schoolName?: string;
} | null> {
  const rawPayloads: Array<{ kind: string; payload: string }> = [];

  let lessons;
  let sourceGeneratedAt: string | undefined;
  try {
    const mobilXml = await fetchXml(mobilUrl(creds, date), headers);
    rawPayloads.push({ kind: "mobil", payload: mobilXml });
    const mobilDoc = validateMobil(parseVpMobilXml(mobilXml));
    lessons = lessonsFromMobil(mobilDoc, creds.schoolId, date);
    sourceGeneratedAt = mobilDoc.VpMobil.Kopf.zeitstempel || undefined;
  } catch (error) {
    onFailure?.(classifyDayFailure(error));
    return null;
  }

  let schoolName: string | undefined;
  try {
    const vplanXml = await fetchXml(vplanUrl(creds, date), headers);
    rawPayloads.push({ kind: "vplan", payload: vplanXml });
    const vplanDoc = validateVplan(parseVplanXml(vplanXml));
    lessons = applyVplanNotes(lessons, vplanDoc, creds.schoolId, date);
    schoolName = vplanDoc.vp.kopf.schulname || undefined;
  } catch {
    // Vertretungsplan ist ein separater Feed und muss nicht fuer jeden Tag existieren.
  }

  if (className) lessons = lessons.filter((l) => l.className === className);

  return { lessons, rawPayloads, sourceGeneratedAt, schoolName };
}

export async function fetchLessons(creds: SchoolCredentials, params: FetchLessonsParams): Promise<FetchLessonsResult> {
  const headers = authHeader(creds);
  const lessons: Lesson[] = [];
  const rawPayloads: Array<{ kind: string; payload: string }> = [];
  const datesFetched: string[] = [];
  let anyDaySucceeded = false;
  let lastFailureKind: DayFailureKind = "other";
  let schoolName: string | undefined;
  let sourceGeneratedAt: string | undefined;
  let sourceMetaIsFromToday = false;
  const today = todayIsoDate();

  let cursor = params.from;
  while (cursor <= params.to) {
    const day = await fetchDayLessons(creds, cursor, params.className, headers, (kind) => {
      lastFailureKind = kind;
    });
    if (day) {
      anyDaySucceeded = true;
      datesFetched.push(cursor);
      lessons.push(...day.lessons);
      rawPayloads.push(...day.rawPayloads);

      const isToday = cursor === today;
      if (day.schoolName && (!sourceMetaIsFromToday || isToday)) schoolName = day.schoolName;
      if (day.sourceGeneratedAt && (!sourceMetaIsFromToday || isToday)) sourceGeneratedAt = day.sourceGeneratedAt;
      if (isToday) sourceMetaIsFromToday = true;
    }
    cursor = addDays(cursor, 1);
  }

  if (!anyDaySucceeded) {
    const failureKind = lastFailureKind as DayFailureKind;
    // Stundenplan24 sendet fuer "kein Plan an diesem Tag" (Wochenende/Ferien) denselben HTTP 404 wie
    // fuer eine falsche Schulnummer - pro Tag nicht unterscheidbar (siehe classifyDayFailure). Bei
    // einer einzelnen Tagesabfrage (z.B. die Plan-Seite an einem Sonntag) ist "kein Plan" der weitaus
    // wahrscheinlichere, voellig normale Fall - als Fehler anzuzeigen waere irrefuehrend, zumal
    // Schulnummer/Zugangsdaten bereits beim Verbindungstest geprueft wurden. Nur bei einem breiteren
    // Zeitraum (mehrere Tage) bleibt ein kompletter "other"-Fehlschlag ein echtes Warnsignal - dort
    // waere "die ganze Woche kein Plan" untypisch genug, um trotzdem einen Fehler zu melden.
    const isSingleDay = params.from === params.to;
    const isRealError = failureKind === "auth" || failureKind === "network" || !isSingleDay;

    if (isRealError) {
      throw new ClassifiedError(
        failureKind === "network" ? "NETWORK_ERROR" : failureKind === "auth" ? "AUTH_ERROR" : "SOURCE_ERROR",
        "Für den gesamten abgefragten Zeitraum konnte kein Stundenplan abgerufen werden. Bitte Schulnummer, Zugangsdaten und Internetverbindung prüfen."
      );
    }
  }

  return { lessons, schoolName, sourceGeneratedAt, datesFetched, rawPayloads };
}

/** Wie viele Tage ab heute nach einem Tag mit Unterricht gesucht wird - deckt auch ein Wochenende
 * oder eine kurze Ferienwoche ab, an denen "heute" allein legitim keine Daten liefert. */
const AVAILABLE_CLASSES_SEARCH_DAYS = 14;

export async function fetchAvailableClasses(creds: SchoolCredentials): Promise<string[]> {
  const headers = authHeader(creds);
  let cursor = todayIsoDate();

  for (let i = 0; i < AVAILABLE_CLASSES_SEARCH_DAYS; i++) {
    const day = await fetchDayLessons(creds, cursor, undefined, headers);
    if (day && day.lessons.length > 0) {
      return [...new Set(day.lessons.map((l) => l.className).filter((c): c is string => Boolean(c)))];
    }
    cursor = addDays(cursor, 1);
  }

  return [];
}

export async function testConnection(creds: SchoolCredentials): Promise<ConnectionTestResult> {
  const headers = authHeader(creds);
  try {
    const response = await fetch(`${creds.baseUrl.replace(/\/$/, "")}/${creds.schoolId}/mobil/`, { method: "GET", headers });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reachable: true, message: "Anmeldung fehlgeschlagen. Bitte Benutzername und Passwort prüfen." };
    }
    if (!response.ok) {
      return { ok: false, reachable: true, message: `Server antwortet mit Status ${response.status}. Bitte Server-URL und Schulnummer prüfen.` };
    }
    return { ok: true, reachable: true, message: "Verbindung erfolgreich." };
  } catch {
    return { ok: false, reachable: false, message: "Verbindung fehlgeschlagen. Bitte Server-URL und Internetverbindung prüfen." };
  }
}
