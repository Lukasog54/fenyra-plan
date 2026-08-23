import type { Lesson, LessonStatus } from "../models/Lesson";
import type { RawAktion, RawMobilDocument, RawStd, RawVplanDocument } from "./models";

/** Portiert 1:1 aus mobile/src/data/adapters/stundenplan24/mapper.ts. */

type AttributedText = string | Record<string, unknown> | undefined;

function normalizeText(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "&nbsp;") return undefined;
  return trimmed;
}

function textOf(node: AttributedText): string | undefined {
  if (node === undefined) return undefined;
  if (typeof node === "string") return normalizeText(node);
  const text = node["#text"];
  return typeof text === "string" ? normalizeText(text) : undefined;
}

function hasChangeFlag(node: AttributedText, attrName: string): boolean {
  return typeof node === "object" && node !== null && Boolean(node[attrName]);
}

function periodOf(std: RawStd): number {
  return typeof std.St === "number" ? std.St : parseInt(std.St, 10);
}

function looksCancelled(note: string | undefined, subject: string | undefined): boolean {
  if (subject === undefined || subject === "---" || subject === "") return true;
  return Boolean(note && /entf(ä|ae)llt|f(ä|ae)llt aus|freistunde/i.test(note));
}

function inferStatus(subjectChanged: boolean, teacherChanged: boolean, roomChanged: boolean): LessonStatus {
  const changedCount = [subjectChanged, teacherChanged, roomChanged].filter(Boolean).length;
  if (changedCount === 0) return "normal";
  if (changedCount > 1) return "substitution";
  if (roomChanged) return "room-change";
  if (teacherChanged) return "teacher-change";
  return "subject-change";
}

function lessonId(sourceId: string, date: string, className: string, period: number, course: string | undefined, nr?: string): string {
  const disambiguator = course ?? nr;
  return disambiguator ? `${sourceId}_${date}_${className}_${period}_${disambiguator}` : `${sourceId}_${date}_${className}_${period}`;
}

export function lessonsFromMobil(doc: RawMobilDocument, sourceId: string, date: string): Lesson[] {
  const lessons: Lesson[] = [];

  for (const kl of doc.VpMobil.Klassen.Kl) {
    const className = kl.Kurz;

    const canonicalByNr = new Map<string, { subject?: string; teacher?: string; group?: string }>();
    for (const ue of kl.Unterricht?.Ue ?? []) {
      const nr = ue.UeNr["#text"];
      if (nr === undefined) continue;
      canonicalByNr.set(String(nr), {
        subject: ue.UeNr["@_UeFa"],
        teacher: ue.UeNr["@_UeLe"],
        group: ue.UeNr["@_UeGr"],
      });
    }

    const timeGridByPeriod = new Map<number, string>();
    for (const klSt of kl.KlStunden?.KlSt ?? []) {
      const period = klSt["#text"];
      const start = klSt["@_ZeitVon"];
      if (period === undefined || !start) continue;
      timeGridByPeriod.set(typeof period === "number" ? period : parseInt(period, 10), start);
    }

    for (const std of kl.Pl.Std) {
      const period = periodOf(std);
      const nr = std.Nr !== undefined ? String(std.Nr) : undefined;
      const canonical = nr ? canonicalByNr.get(nr) : undefined;

      const subject = textOf(std.Fa);
      const teacher = textOf(std.Le);
      const room = textOf(std.Ra);
      const course = textOf(std.Ku2) ?? canonical?.group;
      const note = textOf(std.If);

      const subjectChanged = hasChangeFlag(std.Fa, "@_FaAe");
      const teacherChanged = hasChangeFlag(std.Le, "@_LeAe");
      const roomChanged = hasChangeFlag(std.Ra, "@_RaAe");

      const status: LessonStatus = looksCancelled(note, subject)
        ? "cancelled"
        : inferStatus(subjectChanged, teacherChanged, roomChanged);

      lessons.push({
        id: lessonId(sourceId, date, className, period, course, nr),
        date,
        startTime: std.Beginn ?? timeGridByPeriod.get(period) ?? "",
        endTime: std.Ende ?? "",
        period,
        subject,
        teacher,
        room,
        className,
        course,
        originalSubject: status !== "cancelled" && subjectChanged ? canonical?.subject : undefined,
        originalTeacher: status !== "cancelled" && teacherChanged ? canonical?.teacher : undefined,
        status,
        note,
        lastUpdated: new Date().toISOString(),
        sourceId,
        rawData: std,
      });
    }
  }

  return lessons;
}

export function applyVplanNotes(lessons: Lesson[], doc: RawVplanDocument, sourceId: string, date: string): Lesson[] {
  const aktionen = doc.vp.haupt?.aktion ?? [];
  if (aktionen.length === 0) return lessons;

  const byClassPeriod = new Map<string, RawAktion>();
  for (const aktion of aktionen) {
    const period = typeof aktion.stunde === "number" ? aktion.stunde : parseInt(aktion.stunde, 10);
    byClassPeriod.set(`${aktion.klasse}_${period}`, aktion);
  }

  const matched = new Set<string>();

  const updated = lessons.map((lesson) => {
    if (!lesson.className || lesson.period === undefined) return lesson;
    const key = `${lesson.className}_${lesson.period}`;
    const aktion = byClassPeriod.get(key);
    if (!aktion) return lesson;
    matched.add(key);

    const note = lesson.note ?? (aktion.info || undefined);
    const status: LessonStatus = lesson.status === "normal" ? "unknown" : lesson.status;

    return { ...lesson, note, status };
  });

  for (const aktion of aktionen) {
    const period = typeof aktion.stunde === "number" ? aktion.stunde : parseInt(aktion.stunde, 10);
    const key = `${aktion.klasse}_${period}`;
    if (matched.has(key)) continue;

    updated.push({
      id: lessonId(sourceId, date, aktion.klasse, period, undefined),
      date,
      startTime: "",
      endTime: "",
      period,
      subject: textOf(aktion.fach),
      teacher: textOf(aktion.lehrer),
      room: textOf(aktion.raum),
      className: aktion.klasse,
      status: "unknown",
      note: aktion.info || undefined,
      lastUpdated: new Date().toISOString(),
      sourceId,
      rawData: aktion,
    });
  }

  return updated;
}
