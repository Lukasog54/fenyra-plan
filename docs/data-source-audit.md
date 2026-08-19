# Fenyra Plan — Datenquellen-Audit & Reparaturbericht

Stand: 2026-08-19. Erzeugt durch `src/data/diagnostics/DataSourceDiagnostics.ts` (`runDataSourceAudit`), getestet in
`__tests__/data/diagnostics/DataSourceDiagnostics.test.ts` (25/25 Tests grün, `tsc` sauber, Bundle-Export erfolgreich).

## Wichtigste Erkenntnis zuerst

**Es liegen weiterhin keine echten Stundenplan24-Zugangsdaten (Schulnummer/Benutzer/Passwort) vor.** Eine echte
Live-Discovery gegen einen autorisierten Schulaccount (Abschnitt 4 der Anfrage) konnte deshalb nicht durchgeführt
werden — das wäre ohne echten Zugang entweder Erfindung oder ein Umgehen der Autorisierung, beides ausdrücklich
untersagt. Stattdessen wurde:

1. das Diagnose-Modul `DataSourceDiagnostics` gebaut, das den Audit **automatisch und korrekt** durchführt, sobald
   echte Zugangsdaten vorhanden sind (in der App unter Einstellungen → Datenquelle → Verbindung testen bzw.
   Einstellungen → Daten-Diagnose sichtbar),
2. ein vollständiger **Code-Audit** der bestehenden Pipeline (Source-Annahme → Parser → Mapper → Datenbank →
   State → UI) durchgeführt und jede gefundene Lücke, die ohne Live-Daten erkennbar und behebbar war, repariert.

## Audit-Ergebnis: Demo-Datenquelle (vollständig lauffähig, zum Vergleich)

```text
FENYRA DATA SOURCE AUDIT — demo
================================
Authentication              AVAILABLE

Schulinformationen          UNKNOWN            (kein Modellfeld vorhanden)
Klassen                     AVAILABLE
Kurse                       AVAILABLE
Gruppen                     UNKNOWN            (kein Modellfeld vorhanden)
Schülerprofil               UNKNOWN            (kein Modellfeld vorhanden - rein lokale Einstellung)
Lehrer                      AVAILABLE
Räume                       AVAILABLE
Unterrichtszeiten           AVAILABLE
Tagesstundenplan            AVAILABLE
Wochenstundenplan           AVAILABLE
Vertretungsplan             AVAILABLE
Unterrichtsausfälle         AVAILABLE
Raumänderungen              AVAILABLE
Lehreränderungen            AVAILABLE
Fachänderungen              AVAILABLE
Verlegungen                 AVAILABLE
Hinweise                    AVAILABLE
Bemerkungen                 AVAILABLE          (gemeinsam mit Hinweise als ein Freitextfeld geführt)
Vergangene Tage             AVAILABLE
Zukünftige Tage             AVAILABLE
```

## Audit-Ergebnis: Stundenplan24 (kein echter Zugang konfiguriert)

```text
FENYRA DATA SOURCE AUDIT — stundenplan24
=========================================
Authentication               UNAVAILABLE   "Keine Server-URL/Schulnummer hinterlegt."

Alle Datenkategorien:        UNKNOWN       "Live-Datenabruf nicht möglich: Stundenplan24-Datenquelle
                                             ist nicht konfiguriert."
```

**Sobald echte Zugangsdaten eingetragen werden** (Einstellungen → Datenquelle), ändert sich automatisch:

- `Authentication` → `AVAILABLE`, `UNAVAILABLE` (401/403 - falsche Zugangsdaten) oder `ERROR` (Netzwerk), je nach
  echtem Ergebnis des jetzt implementierten Basic-Auth-Verbindungstests gegen die eingegebene Server-URL.
- Alle Datenkategorien bleiben trotzdem `UNKNOWN`, bis der reale XML-Ressourcenpfad unter der Server-URL bekannt
  ist und `fetchLessons` daran angebunden wird (siehe `docs/stundenplan24-investigation.md`) — das ist die einzige
  verbleibende Lücke, die ausschließlich mit einem echten Schulzugriff bzw. einem echten XML-Beispiel geschlossen
  werden kann, nicht durch weiteren Code-Audit.

## Reparaturen (Code-Audit, ohne Live-Daten durchführbar)

Gefunden durch Abgleich Modell → Parser/Mapper → Datenbank → UI, jeweils Ursache → Fix:

| # | Fund | Status vorher | Ursache | Reparatur |
|---|---|---|---|---|
| 1 | `Kurs` (course) nirgends angezeigt | AVAILABLE_BUT_NOT_DISPLAYED (Demo) | UI-Komponenten `NextLessonCard`/`TimelineLessonRow` haben das Feld nie gerendert | `course` wird jetzt in beiden Komponenten mit angezeigt |
| 2 | Nur Raumänderungen zeigten eine Alt→Neu-Zeile | AVAILABLE_BUT_NOT_DISPLAYED (Lehrer-/Fachänderung) | Diff-Anzeige in `TimelineLessonRow`/`NextLessonCard` war hart auf `status === "room-change"` beschränkt | Neuer gemeinsamer Helfer `src/utils/lessonDiff.ts` (`describeLessonChanges`) zeigt jetzt Raum-, Lehrer- **und** Fachänderung als Alt→Neu-Zeile, in beiden Komponenten |
| 3 | `startTime`/`endTime` bei allen Stundenplan24-Lektionen leer (`""`) | technischer Fehler (keine „UNAVAILABLE"-Situation, sondern ein Bug) | `mapper.ts` hat nie ein Zeitraster angewendet, obwohl `TimeSlot`-Modell dafür existierte | Neues, klar als Annahme gekennzeichnetes Standard-Zeitraster `src/data/timeGrid.ts`, jetzt in `lessonsFromKlassenplan`/`applyVertretungsplan` verwendet |
| 4 | „Verlegung"/„Verlegt"-Änderungscodes wurden nie erkannt | AVAILABLE_BUT_NOT_PARSED | `inferStatus()` in `mapper.ts` kannte nur `Entfall`; alles andere ohne Feldänderung fiel auf `unknown` | Neue Erkennung für `Art`-Text, der „verleg" enthält → `status: "moved"`; `movedFrom`/`movedTo` bleiben mangels Rohfeld unbefüllt (im Bericht als Einschränkung dokumentiert, nicht verschwiegen) |
| 5 | Kein automatisiertes Diagnosemodul für Datenverfügbarkeit | fehlendes Feature (Abschnitt 5-7 der Anfrage) | — | `src/data/diagnostics/DataSourceDiagnostics.ts` neu gebaut, in den bestehenden „Daten-Diagnose"-Screen integriert (nicht dupliziert), mit Tests |

**Nicht verändert** (funktionierte bereits korrekt): Navigation, Theme, Sync/ChangeDetector, SQLite-Schema und
-Repositories (alle Modellfelder wurden dort bereits korrekt persistiert), Einstellungen-Screens, Login/Secure-
Storage aus der vorherigen Phase, bestehende Overlays/Modals-Struktur.

## Weiterhin als „nicht feststellbar" markiert (bewusst nicht künstlich ersetzt)

- **Schulinformationen, Gruppen, Schülerprofil** — kein Modellfeld, weil unklar ist, ob/wie Stundenplan24 das
  liefert. Werden nicht erfunden.
- **Kurse (Kurssystem/Oberstufe)** — für die echte Stundenplan24-Quelle noch kein Rohfeld in `models.ts`
  angenommen (nur die Demo-Quelle zeigt das Feld beispielhaft). Bleibt `UNKNOWN`, bis ein echtes XML-Beispiel mit
  Kursangaben vorliegt.
- **Exakte Unterrichtszeiten pro Schule** — es wird ein generisches Standard-Raster angezeigt (siehe Reparatur
  #3), nicht das tatsächliche Zeitraster der Schule. Das UI zeigt damit plausible, aber nicht verifizierte Zeiten.
- **`fetchLessons` gegen einen echten Stundenplan24-Server** — bewusst nicht implementiert, da der genaue
  Ressourcenpfad unbekannt ist und das Raten eines Endpunkts ausdrücklich untersagt wurde.

## Verifikation nach der Reparatur

- `npx tsc --noEmit` — sauber
- `npm test` — 25/25 Tests grün (neu: 3 Diagnostics-Tests, 2 neue Mapper-Tests für Zeitraster-Fallback und
  Verlegungs-Erkennung)
- `npx expo export --platform ios` — Bundle erfolgreich
- Bestehende Funktionen (Navigation, Heute/Plan/Vertretungen, Einstellungen, Sync, Offline-Daten, Login/Secure-
  Storage) unverändert lauffähig, da nur die in der Tabelle oben genannten Stellen angefasst wurden.
