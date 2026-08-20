import fs from "fs";
import path from "path";
import { parseVpMobilXml, parseVplanXml } from "../../../src/data/adapters/stundenplan24/parser";
import { validateMobil, validateVplan } from "../../../src/data/adapters/stundenplan24/validator";
import { lessonsFromMobil, applyVplanNotes } from "../../../src/data/adapters/stundenplan24/mapper";

function loadMobil() {
  const xml = fs.readFileSync(path.join(__dirname, "../../fixtures/stundenplan24/mobil-sample.xml"), "utf-8");
  return validateMobil(parseVpMobilXml(xml));
}

function loadVplan() {
  const xml = fs.readFileSync(path.join(__dirname, "../../fixtures/stundenplan24/vplan-sample.xml"), "utf-8");
  return validateVplan(parseVplanXml(xml));
}

describe("lessonsFromMobil", () => {
  const lessons = lessonsFromMobil(loadMobil(), "stundenplan24", "2026-08-19");

  it("maps an unflagged Std to status normal", () => {
    const lesson = lessons.find((l) => l.period === 1)!;
    expect(lesson.status).toBe("normal");
    expect(lesson).toMatchObject({ subject: "Mathematik", teacher: "Mueller", room: "204", startTime: "07:45", endTime: "08:30" });
  });

  it("maps an 'fällt aus' info text to status cancelled", () => {
    const lesson = lessons.find((l) => l.period === 2)!;
    expect(lesson.status).toBe("cancelled");
  });

  it("maps a LeAe-flagged Std to teacher-change, using the Unterricht lookup for the original teacher", () => {
    const lesson = lessons.find((l) => l.period === 3)!;
    expect(lesson.status).toBe("teacher-change");
    expect(lesson.teacher).toBe("Weber");
    expect(lesson.originalTeacher).toBe("Schmidt");
  });

  it("maps a RaAe-flagged Std to room-change, without inventing an original room the feed doesn't provide", () => {
    const lesson = lessons.find((l) => l.period === 4)!;
    expect(lesson.status).toBe("room-change");
    expect(lesson.room).toBe("108");
    expect(lesson.originalRoom).toBeUndefined();
  });

  it("maps a FaAe-flagged Std to subject-change, using the Unterricht lookup for the original subject", () => {
    const lesson = lessons.find((l) => l.period === 5)!;
    expect(lesson.status).toBe("subject-change");
    expect(lesson.subject).toBe("Kunst");
    expect(lesson.originalSubject).toBe("Musik");
  });

  it("maps a Std with both FaAe and LeAe flagged to status substitution", () => {
    const lesson = lessons.find((l) => l.period === 6)!;
    expect(lesson.status).toBe("substitution");
    expect(lesson.originalSubject).toBe("Erdkunde");
    expect(lesson.originalTeacher).toBe("Fischer");
  });

  // Verified live against a real school: two simultaneous elective-group Std entries for the
  // same class+period can both lack <Ku2> and any <UeGr> in <Unterricht> (e.g. a Russian-vs-
  // Biology split, not a course-labelled sports group) - without a fallback disambiguator both
  // rows produced the identical id and one silently overwrote the other in storage.
  it("gives two simultaneous same-period Stds distinct ids via Nr when neither has a course/group", () => {
    const xml =
      "<VpMobil><Kopf><datei>test.xml</datei></Kopf><Klassen><Kl><Kurz>10b</Kurz><Pl><Std>" +
      "<St>3</St><Fa>RU</Fa><Le>Rei</Le><Ra>010b</Ra><Nr>454</Nr><If></If>" +
      "</Std><Std>" +
      "<St>3</St><Fa>BIO</Fa><Le>Bü</Le><Ra>109a</Ra><Nr>456</Nr><If></If>" +
      "</Std></Pl></Kl></Klassen></VpMobil>";
    const doc = validateMobil(parseVpMobilXml(xml));
    const parallelLessons = lessonsFromMobil(doc, "stundenplan24", "2026-08-20");

    expect(parallelLessons).toHaveLength(2);
    const ids = parallelLessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(2);
    expect(parallelLessons.find((l) => l.subject === "RU")!.id).not.toBe(parallelLessons.find((l) => l.subject === "BIO")!.id);
  });
});

describe("applyVplanNotes", () => {
  it("flips a matching normal-status lesson to unknown and fills in the missing note", () => {
    const baseline = lessonsFromMobil(loadMobil(), "stundenplan24", "2026-08-19");
    const merged = applyVplanNotes(baseline, loadVplan(), "stundenplan24", "2026-08-19");

    const lesson = merged.find((l) => l.period === 1)!;
    expect(lesson.status).toBe("unknown");
    expect(lesson.note).toBe("Klassenleiterstunde entfällt teilweise");
  });

  it("adds a new lesson for an aktion with no matching baseline slot, instead of dropping it", () => {
    const baseline = lessonsFromMobil(loadMobil(), "stundenplan24", "2026-08-19");
    const merged = applyVplanNotes(baseline, loadVplan(), "stundenplan24", "2026-08-19");

    const lesson = merged.find((l) => l.period === 7);
    expect(lesson).toBeDefined();
    expect(lesson!.status).toBe("unknown");
    expect(lesson!.subject).toBe("Informatik");
    expect(lesson!.room).toBe("EDV 1");
  });

  it("does not change already-non-normal lessons or duplicate matched slots", () => {
    const baseline = lessonsFromMobil(loadMobil(), "stundenplan24", "2026-08-19");
    const merged = applyVplanNotes(baseline, loadVplan(), "stundenplan24", "2026-08-19");
    expect(merged.filter((l) => l.period === 2)).toHaveLength(1);
    expect(merged.find((l) => l.period === 2)!.status).toBe("cancelled");
  });
});
