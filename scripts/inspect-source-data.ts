/**
 * Fetches your real Stundenplan24 data with your own credentials (entered at runtime - never
 * written to disk, never logged) and prints exactly what's available: school info, classes,
 * lessons, and current changes/substitutions. Uses the exact same parser/validator/mapper as the
 * app itself (src/data/adapters/stundenplan24/*), not a reimplementation - what you see here is
 * what Fenyra Plan actually processes from your account.
 *
 * Usage:
 *   npm run inspect-data
 *   (prompts for Schulnummer/Benutzer/Passwort - password input is hidden)
 *
 * To skip the prompts (e.g. for scripting), set these env vars for just that one command:
 *   FENYRA_SCHULNUMMER=12345678 FENYRA_BENUTZER=schueler FENYRA_PASSWORT=... npm run inspect-data
 *
 * Optional: check more than just today -
 *   npm run inspect-data -- --days 3   (today + next 2 days)
 */
import readline from "readline";
import { parseVpMobilXml, parseVplanXml } from "../src/data/adapters/stundenplan24/parser";
import { validateMobil, validateVplan } from "../src/data/adapters/stundenplan24/validator";
import { lessonsFromMobil, applyVplanNotes } from "../src/data/adapters/stundenplan24/mapper";
import { STUNDENPLAN24_BASE_URL } from "../src/data/constants";
import type { Lesson } from "../src/data/models/Lesson";

const KEYCODE_CR = 13;
const KEYCODE_LF = 10;
const KEYCODE_CTRL_C = 3;
const KEYCODE_BACKSPACE = 8;
const KEYCODE_DELETE = 127;

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Reads a line without echoing it to the terminal. Falls back to a visible prompt (with a
 * warning) when stdin isn't an interactive TTY, since raw mode isn't available then. Compares raw
 * byte codes for control characters (see KEYCODE_* above) rather than string literals containing
 * them, since those are easy to mangle in transit through editors/tools. */
function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    console.log("(Hinweis: Eingabe nicht ausblendbar - stdin ist kein Terminal)");
    return ask(question);
  }
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    let input = "";
    const onData = (buf: Buffer) => {
      const code = buf[0];
      if (code === KEYCODE_CR || code === KEYCODE_LF) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
        return;
      }
      if (code === KEYCODE_CTRL_C) {
        process.stdout.write("\n");
        process.exit(1);
      }
      if (code === KEYCODE_DELETE || code === KEYCODE_BACKSPACE) {
        input = input.slice(0, -1);
        return;
      }
      input += buf.toString("utf8");
    };
    stdin.on("data", onData);
  });
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

async function fetchXml(url: string, authHeader: string): Promise<string | null> {
  const response = await fetch(url, { headers: { Authorization: authHeader } });
  if (!response.ok) return null;
  return response.text();
}

async function main(): Promise<void> {
  const daysArgIndex = process.argv.indexOf("--days");
  const days = daysArgIndex !== -1 ? parseInt(process.argv[daysArgIndex + 1], 10) || 1 : 1;

  const schulnummer = process.env.FENYRA_SCHULNUMMER || (await ask("Schulnummer: "));
  const benutzer = process.env.FENYRA_BENUTZER || (await ask("Benutzer (z.B. schueler): "));
  const passwort = process.env.FENYRA_PASSWORT || (await askHidden("Passwort: "));

  if (!schulnummer || !benutzer || !passwort) {
    console.error("Schulnummer, Benutzer und Passwort werden benötigt.");
    process.exit(1);
  }

  const authHeader = `Basic ${Buffer.from(`${benutzer}:${passwort}`).toString("base64")}`;
  console.log(`\nPrüfe Zugang für Schulnummer ${schulnummer} ...\n`);

  let schoolName: string | undefined;
  let sourceGeneratedAt: string | undefined;
  const allLessons: Lesson[] = [];
  let anyDaySucceeded = false;

  const today = toIso(new Date());
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const compact = compactDate(date);
    const mobilUrl = `${STUNDENPLAN24_BASE_URL}/${schulnummer}/mobil/mobdaten/PlanKl${compact}.xml`;
    const vplanUrl = `${STUNDENPLAN24_BASE_URL}/${schulnummer}/vplan/vdaten/VplanKl${compact}.xml`;

    const mobilXml = await fetchXml(mobilUrl, authHeader);
    if (!mobilXml) {
      console.log(`${date}: kein Plan verfügbar (Wochenende/Ferien, oder falsche Zugangsdaten/Schulnummer)`);
      continue;
    }

    let lessons: Lesson[];
    try {
      const mobilDoc = validateMobil(parseVpMobilXml(mobilXml));
      lessons = lessonsFromMobil(mobilDoc, "inspect", date);
      if (mobilDoc.VpMobil.Kopf.zeitstempel) sourceGeneratedAt = mobilDoc.VpMobil.Kopf.zeitstempel;
    } catch (err) {
      console.log(`${date}: Antwort erhalten, aber nicht im erwarteten Format (${(err as Error).message})`);
      continue;
    }
    anyDaySucceeded = true;

    const vplanXml = await fetchXml(vplanUrl, authHeader);
    if (vplanXml) {
      try {
        const vplanDoc = validateVplan(parseVplanXml(vplanXml));
        lessons = applyVplanNotes(lessons, vplanDoc, "inspect", date);
        if (vplanDoc.vp.kopf.schulname) schoolName = vplanDoc.vp.kopf.schulname;
      } catch {
        // Vertretungsplan not published/parseable for this day - mobil data still stands.
      }
    }

    allLessons.push(...lessons);
    console.log(`${date}: ${lessons.length} Stunden gefunden`);
  }

  if (!anyDaySucceeded) {
    console.log("\nKein einziger Tag konnte abgerufen werden - bitte Schulnummer, Benutzer und Passwort prüfen.");
    process.exit(1);
  }

  console.log("\n========== ZUSAMMENFASSUNG ==========");
  console.log(`Schulname: ${schoolName ?? "(nicht in der Antwort enthalten)"}`);
  console.log(`Stand der Quelle: ${sourceGeneratedAt ?? "(nicht in der Antwort enthalten)"}`);
  console.log(`Zeitraum geprüft: ${today} bis ${addDays(today, days - 1)} (${days} Tag${days === 1 ? "" : "e"})`);
  console.log(`Insgesamt: ${allLessons.length} Stunden`);

  const classes = [...new Set(allLessons.map((l) => l.className).filter((c): c is string => Boolean(c)))].sort();
  console.log(`Klassen (${classes.length}): ${classes.join(", ") || "-"}`);

  const statusCounts: Record<string, number> = {};
  for (const l of allLessons) statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  console.log(`Status-Verteilung: ${JSON.stringify(statusCounts)}`);

  const teachers = [...new Set(allLessons.map((l) => l.teacher).filter((t): t is string => Boolean(t)))].sort();
  console.log(`Lehrerkürzel (${teachers.length}): ${teachers.join(", ") || "-"}`);

  const rooms = [...new Set(allLessons.map((l) => l.room).filter((r): r is string => Boolean(r)))].sort();
  console.log(`Räume (${rooms.length}): ${rooms.join(", ") || "-"}`);

  const subjects = [...new Set(allLessons.map((l) => l.subject).filter((s): s is string => Boolean(s)))].sort();
  console.log(`Fächerkürzel (${subjects.length}): ${subjects.join(", ") || "-"}`);

  const changes = allLessons.filter((l) => l.status !== "normal");
  console.log(`\n========== ÄNDERUNGEN / VERTRETUNGEN (${changes.length}) ==========`);
  if (changes.length === 0) {
    console.log("Keine Änderungen im geprüften Zeitraum.");
  }
  for (const l of changes) {
    console.log(`\n${l.date} · Klasse ${l.className ?? "?"} · ${l.period ?? "?"}. Stunde · ${l.status.toUpperCase()}`);
    console.log(`  Fach: ${l.subject ?? "-"}${l.originalSubject ? ` (vorher: ${l.originalSubject})` : ""}`);
    console.log(`  Lehrer: ${l.teacher ?? "-"}${l.originalTeacher ? ` (vorher: ${l.originalTeacher})` : ""}`);
    console.log(`  Raum: ${l.room ?? "-"}`);
    if (l.note) console.log(`  Hinweis: ${l.note}`);
  }

  console.log("\nFertig. Es wurde nichts auf die Festplatte geschrieben, Passwort wurde nicht geloggt.");
}

main().catch((err) => {
  console.error("Fehler:", err instanceof Error ? err.message : err);
  process.exit(1);
});
