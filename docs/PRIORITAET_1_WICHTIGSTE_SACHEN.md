# Fenyra Plan – Priorität 1

Stand: 2026-08-20. Ergänzt/verifiziert im Rahmen des "PRIORITÄT 1"-Audits (Produktionsreife, Sicherheit,
Datenintegrität, IT-Diagnose). Jede Aussage unten ist mit IMPLEMENTED/TESTED/VERIFIED/NOT_TESTED/BROKEN/
NOT_AVAILABLE_FROM_SOURCE gekennzeichnet - nichts wird als funktionierend behauptet, nur weil Code dafür
existiert.

## 1. Zweck

Diese Datei ist die zentrale, laufend aktualisierte Referenz für die Punkte, die vor einer möglichen Vorstellung
bzw. Übernahme durch ein Schul-IT-Team belegbar sein müssen: dass die Datenquelle korrekt und vollständig
verarbeitet wird, dass kein Datenverlust auftritt, dass Zugangsdaten sicher behandelt werden, und dass Fehler
diagnostizierbar und ihrer echten Ursache zuordenbar sind.

## 2. Aktueller Systemstand

- Stundenplan-/Vertretungsplan-Pipeline (Quelle → Parser → Validierung → Mapper → SQLite → UI): **IMPLEMENTED,
  TESTED, VERIFIED** gegen eine echte, autorisierte Schule (siehe Abschnitt 3).
- Parallele Stunden/Gruppen (z. B. zwei gleichzeitige Wahlpflichtkurse): **IMPLEMENTED, TESTED, VERIFIED** - werden
  beide angezeigt statt einander zu überschreiben (siehe Abschnitt 5).
- Fehlerklassifizierung (welche Pipeline-Stufe ein Fehler betrifft): **IMPLEMENTED, TESTED** (neu in diesem
  Durchgang, siehe Abschnitt 3.5/6).
- Datenintegritätsprüfung (Quelle vs. gespeicherte Daten, feldweise): **IMPLEMENTED, TESTED** (`DataIntegrityCheck.ts`,
  manuell auslösbar im Diagnose-Screen). **NOT_TESTED** gegen eine zweite/dritte echte Schule (nur eine reale
  Schule stand bisher zur Verfügung).
- Zugangsdaten-Entfernung löscht jetzt auch gecachte Schuldaten: **IMPLEMENTED** (neu in diesem Durchgang), **NOT_TESTED**
  auf einem echten Gerät (nur Code-Review + `tsc`, kein UI-Test in Jest für diesen Screen vorhanden - siehe
  Abschnitt 12).
- Technische Datenschutzübersicht: **IMPLEMENTED** (neu in diesem Durchgang, ersetzt den bisherigen Platzhalter).
- IT-Health-Check als kopierbarer Text: **IMPLEMENTED, TESTED** (neu in diesem Durchgang).

## 3. Datenquelle

Stundenplan24 / Indiware, ausschließlich über die vom Nutzer selbst hinterlegten, autorisierten Zugangsdaten
(Schulnummer, Benutzertyp, Passwort). Kein Login-/Session-Endpunkt - jede Anfrage authentifiziert sich einzeln
per HTTP Basic Auth. Vollständige technische Struktur (Feeds, XML-Schema, Sonderfälle): siehe
`docs/stundenplan24-investigation.md` (**VERIFIED** gegen eine echte Schule, 170 reale Unterrichtsstunden, 12
Klassen, 9 echte Ausfälle an einem realen Schultag).

### 3.1 Authentifizierung

- Falsche Zugangsdaten (HTTP 401/403) werden nicht anhand des Status allein interpretiert, sondern in eine
  konkrete Meldung übersetzt ("Anmeldung fehlgeschlagen..."): **IMPLEMENTED, TESTED**
  (`adapter-http.test.ts`).
- Ein erfolgreicher Verbindungstest prüft echten HTTP-200 auf dem `mobil/`-Endpunkt, nicht nur "kein Fehler":
  **IMPLEMENTED, TESTED**.
- Netzwerkfehler (kein DNS/keine Verbindung) werden von einer Server-Antwort mit Fehlerstatus unterschieden
  (`reachable: true/false`): **IMPLEMENTED, TESTED**.
- Session-Ablauf/-Erneuerung: **NOT_AVAILABLE_FROM_SOURCE** - es gibt keine Session (siehe oben), also auch
  nichts, das ablaufen oder erneuert werden könnte. Verifiziert: keine `Set-Cookie`-Header in echten Antworten.
- "Erfolgreicher Login nicht nur am Statuscode ablesen": **IMPLEMENTED** - `testConnection()` unterscheidet
  401/403 (Auth-Fehler) von sonstigen Nicht-200-Status und von echtem Netzwerkausfall, nicht nur "ok/nicht ok".
  Eine noch feinere Unterscheidung (z. B. 404 = falsche Schulnummer vs. 5xx = Serverausfall) ist am HTTP-Status
  allein nicht möglich - **verifiziert live**, dass eine falsche Schulnummer denselben 404 liefert wie ein
  Tag ohne veröffentlichten Plan.

### 3.2 Stundenplan-Kernfelder

Datum, Wochentag, Stunde, Beginn, Ende, Fach, Lehrer, Raum, Klasse, Kurs, Status, Bemerkung: **IMPLEMENTED,
TESTED, VERIFIED** gegen eine reale Woche (6 veröffentlichte Tage, 1497 Stunden, 24 Klassen). Details je Feld,
inklusive der Fälle, in denen die Quelle ein Feld nicht liefert, in `docs/stundenplan24-investigation.md`.

- **Gruppe** als eigenes, von Kurs getrenntes Feld: **NOT_AVAILABLE_FROM_SOURCE** - die Quelle liefert dafür kein
  eigenes zweites Feld (verifiziert an echten Daten: `<Ku2>` und `<UeGr>` tragen denselben Wert).
- **Endzeit** einer Stunde: bei der getesteten echten Schule in 0 von 170 Fällen von der Quelle geliefert
  (`<Ende>` leer) - Fenyra zeigt in diesem Fall nur die Startzeit, **erfindet keine Endzeit**.
- **Originalraum** bei Raumänderung: **NOT_AVAILABLE_FROM_SOURCE** - kein Lookup dafür in der Quelle vorhanden.

### 3.3 Parallele Stunden/Gruppen

**IMPLEMENTED, TESTED, VERIFIED.** Zwei gleichzeitige Stunden derselben Klasse/Periode (z. B. zwei Sportgruppen)
werden über einen eigenen ID-Disambiguator (`<Nr>` als Fallback, falls kein Kurs-/Gruppenkürzel vorhanden ist)
unterschieden, statt sich in der Datenbank gegenseitig zu überschreiben. Das war ein echter, live gefundener und
behobener Datenverlust-Bug (vorher 234 von 235 eindeutigen IDs, jetzt 235/235). UI zeigt beide Einträge
gemeinsam an, inklusive klarer Kennzeichnung, welcher Teil ausfällt (`groupParallelLessons()`,
`__tests__/utils/lessonGroups.test.ts`, `adapter.test.ts`).

### 3.4 Vertretungsplan

**IMPLEMENTED, TESTED, VERIFIED.** Ausfall/Raum-/Lehrer-/Fachänderung werden über die expliziten `Ae`-Attribute
der Quelle erkannt (kein Heuristik-Raten mehr - eine frühere Heuristik erzeugte an echten Daten 89 falsche
"Fachänderungen" und wurde entfernt). Original- und geänderter Wert sind unterscheidbar
(`originalTeacher`/`originalSubject`, Diff-Anzeige über `describeLessonChanges()`).

- **Verlegungen**: Status wird erkannt und mit Freitext angezeigt; strukturiertes Ziel-Datum/-Stunde ist
  **NOT_AVAILABLE_FROM_SOURCE** (kein entsprechendes Feld in der Quelle).
- **Weitere Klassen** (nicht nur die eigene): **IMPLEMENTED** - der Vertretungsplan-Screen bietet einen
  Klassenfilter (Meine Klasse/Alle Klassen).

### 3.5 Datenquellen-Fehler-Klassifizierung

**IMPLEMENTED, TESTED** (neu in diesem Durchgang). `src/data/errors/ClassifiedError.ts` führt fünf real
unterscheidbare Fehlertypen ein: `NETWORK_ERROR`, `AUTH_ERROR`, `SOURCE_ERROR`, `DATABASE_ERROR`, `SYNC_ERROR`
(Fallback für alles Unklassifizierte). Jeder Typ hat eine echte, nachvollziehbare Herkunft im Code (siehe
Kommentar in der Datei) statt eines geratenen Musters auf Fehlertext. `SyncMeta.lastErrorType` wird bei jedem
Sync gespeichert (SQLite-Migration v3→v4) und im Diagnose-Screen bei "Synchronisierung" mit angezeigt.

**Bewusst NICHT eingeführt**: `PARSER_ERROR`/`MAPPING_ERROR`/`UI_ERROR` als eigene Codes - dafür gibt es aktuell
keine echte, top-level-sichtbare Fehlerquelle: ein einzelner Tag mit Parser-/Mapping-Fehler wird bewusst als
"kein Plan an diesem Tag" übersprungen statt den ganzen Sync abzubrechen (Design-Entscheidung, nicht Lücke -
siehe `fetchDayLessons()`). Einen Code dafür zu erfinden, ohne dass er je ausgelöst werden kann, wäre erfundene
Präzision gewesen.

## 4. Datenfluss

```
SOURCE (Stundenplan24 mobil+vplan XML)
→ PARSER (fast-xml-parser, src/data/adapters/stundenplan24/parser.ts)
→ VALIDATION (Zod, validator.ts + models.ts)
→ MAPPER (mapper.ts, inkl. Ae-Flag-Auswertung, Nr-Disambiguierung)
→ DATABASE (SQLite, lessons/raw_snapshots/sync_meta/change_events)
→ APP STATE (TanStack Query Hooks)
→ UI (Heute/Plan/Vertretungen)
```

**IMPLEMENTED, TESTED, VERIFIED** end-to-end gegen eine echte Schule.

## 5. Datenintegrität

`DataIntegrityCheck.checkDataIntegrity()` holt für einen Zeitraum unabhängig direkt von der Quelle (an der DB
vorbei) und vergleicht gegen die gespeicherten Fenyra-Daten: MISSING/EXTRA/MISMATCH, feldweise. **IMPLEMENTED,
TESTED** (`__tests__/data/diagnostics/DataIntegrityCheck.test.ts`). Manuell auslösbar im Diagnose-Screen (kein
automatischer Hintergrundlauf - ein zusätzlicher Live-Abruf soll nicht unbemerkt im Hintergrund passieren).

Sync-Integrität (Teilfehler zerstört keine bereits gespeicherten Daten): **IMPLEMENTED, TESTED**
(`replaceLessonsForDates()` ersetzt nur tatsächlich erfolgreich abgerufene Tage;
`__tests__/data/sync/SyncService.test.ts` "partial-day safety"). Überlappende Syncs (Intervall-Timer + manueller
Sync gleichzeitig): **IMPLEMENTED, TESTED** (`inFlightSyncs`-Map, "concurrency"-Tests).

**NOT_TESTED**: automatisierter Duplikat-Erkennungstest auf DB-/Repository-Ebene (die Datenbank-Repositories
selbst haben aktuell keine Jest-Tests - es gibt keine SQLite-Test-Infrastruktur im Projekt; `INSERT OR REPLACE`
mit der `id` als Primärschlüssel verhindert Duplikate strukturell, ist aber nicht durch einen eigenen Test
belegt).

## 6. Sicherheit

- Passwörter ausschließlich über `expo-secure-store` (Android Keystore/iOS Schlüsselbund), nie in SQLite,
  Zustand-Store, Logs oder Fehlerberichten: **IMPLEMENTED, TESTED, VERIFIED** (Code-Durchsuchung: kein
  `console.log` in `src/`/`app/`; `secureCredentials.test.ts`).
- **Neu behobene Lücke**: Entfernen des gespeicherten Passworts (Einstellungen → Datenquelle) löschte bisher
  NUR das Passwort, nicht die gecachten Stundenplan-/Vertretungsdaten dieser Schule - ein zweiter Nutzer des
  gleichen Geräts hätte sie trotzdem sehen können. **IMPLEMENTED** (jetzt mit Bestätigungsdialog + automatischer
  `clearOfflineData()`), **NOT_TESTED** auf einem echten Gerät (kein UI-Test-Setup für diesen Screen vorhanden,
  siehe Abschnitt 12).
- "Cache leeren" (Einstellungen → Offline-Daten) löscht Stundenplan-/Vertretungsdaten, Rohdaten, Sync-Metadaten -
  lässt Zugangsdaten unangetastet (das ist beabsichtigt, kein separater "Logout"). **IMPLEMENTED, VERIFIED**
  (Code-Review).
- Keine Secrets im Repository: `.env` (GitHub-Token für den Release-Prozess) ist über `.gitignore`
  ausgeschlossen. **VERIFIED**.
- Release-Sicherheit (Debug- vs. Release-Build, Logs, Build-Konfiguration): **VERIFIED** durch Code-Review,
  **NOT_TESTED** an einem tatsächlich gebauten Release-APK (kein automatisierter Build-Scan im CI vorhanden).

## 7. Datenschutz

Technische Übersicht (welche Daten, woher, wozu, wo gespeichert, wie lange, externe Übertragung) jetzt in der
App selbst: Einstellungen → Datenschutz (`app/(tabs)/einstellungen/datenschutz.tsx`, **IMPLEMENTED**, neu in
diesem Durchgang - ersetzt den bisherigen Platzhaltertext).

Explizit als **LEGAL_REVIEW_REQUIRED** markierte Punkte (siehe App-Screen für vollen Text):
- Rechtsgrundlage/Auftragsverhältnis für die Verarbeitung von Lehrer-Kürzeln/-Namen (personenbezogene Daten von
  Schulpersonal).
- Ob eine förmliche Datenschutzerklärung im rechtlichen Sinn nötig ist (abhängig vom tatsächlichen
  Einsatzmodell durch die Schule).
- DSGVO-Verantwortlichkeit (Schule vs. einzelner Nutzer) je nach Einsatzmodell.
- Exakte AndroidManifest-Berechtigungsliste sollte am fertigen Build verifiziert werden, nicht nur aus dem
  Quellcode abgeleitet.

Keine externen Analytics-/Tracking-/Crash-Reporting-Dienste, kein Push-Token-Server: **VERIFIED** durch
Code-Durchsuchung (keine entsprechenden Aufrufe im gesamten Quellcode).

## 8. Diagnose

`src/data/diagnostics/DataSourceDiagnostics.ts` (`runDataSourceAudit`): System-Checks
(Internetverbindung/Stundenplan24-Erreichbarkeit/Authentifizierung/Session/Datenabruf-Parser-Mapping/
Datenbank/Synchronisierung) mit Status PASS/FAIL/UNKNOWN, plus Datenquellen-Audit je Kategorie mit
AVAILABLE/UNAVAILABLE/AVAILABLE_BUT_NOT_PARSED/_STORED/_DISPLAYED/AVAILABLE_BUT_BROKEN/UNKNOWN. **IMPLEMENTED,
TESTED** (`DataSourceDiagnostics.test.ts`).

**Neu in diesem Durchgang**: "IT-Health-Check kopieren"-Button im Diagnose-Screen erzeugt einen reinen
Text-Report (Internet/Stundenplan24/Authentication/Session/Data Retrieval/Parser+Mapping/SQLite/
Synchronization/Data Integrity, je ✓/✗/?) und kopiert ihn in die Zwischenablage, direkt weitergebbar an
Schul-IT-Personal ohne Zugriff auf die App selbst. **IMPLEMENTED, TESTED**
(`__tests__/data/diagnostics/healthCheckReport.test.ts`). Zeigt bewusst "?" statt eines erfundenen "✓" für
Prüfungen, die noch nie liefen (z. B. Datenintegrität vor dem ersten manuellen Check).

Fehlerdetails (Komponente/Status/Fehler) werden im Diagnose-Screen mit dem klassifizierten Fehlertyp
(`[NETWORK_ERROR] ...`) angezeigt statt nur als Freitext - siehe Abschnitt 3.5.

## 9. Tests

88 automatisierte Tests in 13 Suiten, alle grün (`npm test`), `npx tsc --noEmit` sauber, `npx expo-doctor`
21/21. Abdeckung (siehe `docs/INFO.md` für den vollen Überblick je Datei):

| Bereich | Status |
|---|---|
| Auth (401, Netzwerkfehler, nicht konfiguriert) | TESTED |
| Fehlerklassifizierung (NETWORK/AUTH/SOURCE/DATABASE/SYNC) | TESTED (neu) |
| Parser (inkl. kaputtes XML stürzt nicht ab) | TESTED |
| Mapping (parallele Stunden, Statuserkennung) | TESTED |
| Datenbank-Repositories direkt (SQLite) | NOT_TESTED (keine SQLite-Test-Infrastruktur im Projekt) |
| Sync (Überlappung, Teilfehler, Fortschritt, Benachrichtigungs-Trigger) | TESTED |
| Offline/Reconnect | VERIFIED durch Code-Review (Resume-Sync in `_layout.tsx`), NOT_TESTED automatisiert |
| Vertretungsplan-Mapping | TESTED |
| Parallele Stunden (Anzeige-Gruppierung) | TESTED |
| Datenintegrität (Quelle-vs-Fenyra-Vergleich) | TESTED |
| Benachrichtigungen (Dedup, Kategorie-Filter) | TESTED |
| Sicherheit (SecureStore-Roundtrip) | TESTED |
| Update-Check (GitHub Releases) | TESTED |
| UI-Screens (Datenquelle-Entfernen-Dialog, Datenschutz-Screen) | NOT_TESTED (kein RN-Component-Test-Setup im Projekt) |

## 10. Bekannte Probleme

- `docs/data-source-audit.md` war bis zu diesem Durchgang veraltet (ging von "kein echter Zugang" aus) - jetzt
  mit Hinweis versehen, nicht gelöscht (historischer Wert).
- Fehlerklassifizierung kann eine falsche Schulnummer nicht von einem Serverausfall (5xx) unterscheiden -
  beides landet als `SOURCE_ERROR` (ehrliche Grenze, siehe Abschnitt 3.5, kein Bug).
- Keine automatisierten UI-/Component-Tests im Projekt (nur Logik-/Daten-Tests) - jede UI-Änderung wird aktuell
  nur durch `tsc`, manuelle Prüfung und (wo möglich) echte Gerätetests abgesichert, nicht durch Jest.

## 11. Nicht verfügbare Daten

Vollständige, verifizierte Liste (Details in `docs/stundenplan24-investigation.md`):
- Adresse, Ort, Kontaktdaten, Ansprechpartner, Logo der Schule
- Benutzerinformationen (wer eingeloggt ist)
- Gruppe als von Kurs getrenntes Feld
- Originalraum bei Raumänderung
- Strukturiertes Ziel-Datum/-Stunde bei Verlegungen
- Endzeit einer Stunde, wenn die Quelle sie nicht liefert (schulabhängig, bei der getesteten Schule durchgehend
  leer)
- Session-Konzept (es gibt keins - kein Bug, sondern die tatsächliche Arbeitsweise der Quelle)

## 12. Noch offene Aufgaben

- UI-/Component-Test-Infrastruktur (z. B. `@testing-library/react-native`, bereits als Dependency vorhanden,
  aber ungenutzt) aufsetzen, um Screens wie den neuen Bestätigungsdialog beim Zugangsdaten-Entfernen
  automatisiert zu testen statt nur manuell.
- SQLite-Repository-Tests (In-Memory- oder Mock-DB) für Duplikat-/Constraint-Verhalten.
- Verifikation der echten AndroidManifest-Berechtigungsliste an einem gebauten Release-APK.
- Zweite/dritte echte Schule zum Testen, um zu prüfen, ob die Ausfall-Konvention (`Fa="---"`, `&nbsp;`) und die
  Zeitraster-Fallbacks schulübergreifend gelten oder Einzelfall der bisher getesteten Schule sind (bereits als
  offener Punkt in `docs/stundenplan24-investigation.md` dokumentiert).

## 13. Schul-IT-Relevanz

- Der "IT-Health-Check kopieren"-Text (Abschnitt 8) ist so gebaut, dass er ohne App-Zugriff direkt an
  IT-Personal weitergegeben werden kann (z. B. per Nachricht), inklusive Zeitstempel und Schulnummer-Quelle.
- Die Fehlerklassifizierung (Abschnitt 3.5) beantwortet direkt die für IT-Support typische erste Frage "liegt es
  an der Schule/Stundenplan24 oder an der App" - ohne Rätselraten am Freitext.
- Die Datenschutzübersicht (Abschnitt 7) liefert eine technische Grundlage, auf der ein
  Datenschutzbeauftragter aufsetzen kann, statt bei null anzufangen.
- Zugangsdaten-Entfernung löscht jetzt auch alle gecachten Schuldaten - relevant für Geräte, die zwischen
  Schülern/Familienmitgliedern weitergegeben werden (z. B. Schul-Tablets).

## 14. Finaler Status

**PASS WITH SOURCE LIMITATIONS**

Begründung: Die Kernpipeline (Datenquelle → Parser → Validierung → Mapper → Datenbank → UI) ist vollständig
implementiert, getestet und gegen eine echte Schule verifiziert, ohne bekannten Datenverlust. Die
"LIMITATIONS" sind ausschließlich Dinge, die die Quelle selbst nicht liefert (Abschnitt 11) oder die
strukturell fehlende Test-Infrastruktur für UI-Screens und rohe SQLite-Repositories (Abschnitt 9/12) - keine
davon ist ein bekannter, unbehobener Bug in der bestehenden Pipeline.
