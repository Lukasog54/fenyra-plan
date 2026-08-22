# Fenyra Plan — System-Info für KI-Assistenten

Diese Datei ist eine technische Bestandsaufnahme des Projekts, gedacht, um einer anderen KI (oder
einem neuen Chat) schnell den vollen Kontext zu geben. Sie beschreibt den Stand zum Zeitpunkt des
letzten Updates dieser Datei — bei Zweifeln immer den tatsächlichen Code als Quelle der Wahrheit
behandeln, nicht diese Datei.

## Was ist Fenyra Plan

Eine eigenständige React-Native/Expo-App (Android, TypeScript) für deutsche Schüler, die ihren
Stundenplan + Vertretungsplan anzeigt. Alternative zu VpMobil24. **Einzige Datenquelle ist die
autorisierte Stundenplan24/Indiware-Schnittstelle** — es werden niemals Daten erfunden, geraten
oder von anderswo kopiert. Wenn die Quelle etwas nicht liefert, wird das explizit als
`NOT_AVAILABLE_FROM_SOURCE` markiert statt stillschweigend wegzulassen oder zu fantasieren.

## Wichtigste Grundregel (aus AGENTS.md)

> Expo HAS CHANGED. Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/
> before writing any code.

D.h.: **niemals aus Trainingswissen über Expo-APIs raten** — die reale, aktuell installierte
Doku-Version (aktuell SDK 57) vorher nachschlagen, da sich APIs zwischen Versionen ändern
(Beispiel: `expo-file-system` hat in v57 eine komplette API-Neugestaltung mit `File`/`Directory`/
`Paths`-Klassen bekommen, das alte promise-basierte API lebt nur noch unter dem Subpath
`expo-file-system/legacy` weiter).

## Tech-Stack

- Expo SDK 57 (`expo ~57.0.15`), React Native 0.86.2, React 19.2.3, Expo Router (file-based)
- Zustand + persist (App-Settings), TanStack Query (Server-/Sync-State)
- expo-sqlite (lokale Datenbank, einzige Persistenz — kein Server-Backend)
- Zod (Validierung), fast-xml-parser (Stundenplan24-XML)
- react-native-reanimated 4.5.1 + react-native-worklets 0.10.1 (Animationen; Babel-Plugin ist
  `react-native-worklets/plugin`, NICHT `react-native-reanimated/plugin` — das gibt's in v4 nicht mehr)
- Jest + jest-expo (Tests), TypeScript strict
- EAS Build (Android APK, `distribution: internal`), kein Play Store — Verteilung über GitHub Releases

## Architektur — der eine wichtige Seam

**`src/data/models/SchoolDataSource.ts`** definiert das Interface `SchoolDataSource`, auf das die
gesamte restliche App programmiert ist. UI und Sync-Layer sprechen NIE direkt mit XML/JSON-Formen
der Quelle, nur mit diesem Interface (`fetchLessons`, `fetchAvailableClasses`, `testConnection`).
Aktuell gibt es genau eine Implementierung: `Stundenplan24Adapter`
(`src/data/adapters/stundenplan24/adapter.ts`), registriert in `src/data/adapters/registry.ts`.
Ein zweiter Datenquellen-Typ ließe sich anschließen, ohne den Rest der App anzufassen.

### Stundenplan24-Adapter-Pipeline (`src/data/adapters/stundenplan24/`)

1. `adapter.ts` — HTTP Basic Auth, **stateless pro Request** (kein Login/Logout-Call, entspricht
   genau dem realen Verhalten der "mobil"-Feeds). `fetchLessons()` holt Tag für Tag im
   angeforderten Zeitraum, gibt zusätzlich `datesFetched: string[]` zurück (nur tatsächlich
   erfolgreiche Tage — wichtig, siehe unten). Wirft nur, wenn **kein einziger** Tag im ganzen
   Bereich erfolgreich war (unterscheidet "falsche Schulnummer" von "normale Wochenend-Lücke" —
   beide liefern live denselben HTTP 404, das Signal ist also "alles leer" vs. "manches leer").
2. `parser.ts` — parst rohes XML (fast-xml-parser) zu Zwischenformat.
3. `validator.ts` (+ `models.ts`) — Zod-Schemas. Enthält Preprocessing (`emptyTagToObject` /
   `emptyTagToEmptyObject`) für leere XML-Tags (`<Pl/>`, leere `<haupt>`/`<kopfinfo>`), die die
   reale Quelle so ausliefert und die sonst die Validierung crashen würden.
4. `mapper.ts` — mappt validierte Daten auf das interne `Lesson`-Modell. **Wichtig**:
   `lessonId(sourceId, date, className, period, course, nr?)` — bei zwei parallelen Stunden ohne
   `<Ku2>`/Kursangabe (z. B. Wahlpflicht-Splits) wird `<Nr>` als Fallback-Disambiguator genutzt,
   sonst kollidieren die IDs und eine Stunde verschwindet in der DB (`INSERT OR REPLACE`). Das war
   ein echter, live verifizierter Datenverlust-Bug, der so gefixt wurde.

### Sync (`src/data/sync/`)

- `SyncService.ts` — `sync()` hat ein modulweites `inFlightSyncs: Map<sourceId, Promise>` gegen
  überlappende Syncs (Intervall-Timer + manueller Sync + Resume-Sync könnten sich sonst
  überschneiden). Nutzt `replaceLessonsForDates()` (nicht range-basiert) — ersetzt nur die Tage,
  die im aktuellen Sync tatsächlich erfolgreich waren (`datesFetched`), damit ein einzelner
  fehlgeschlagener Tag nicht bereits gecachte Daten für andere Tage löscht. Optionaler
  `onProgress`-Callback mit Phasen `"connecting"|"fetching"|"saving"|"done"`.
- `ChangeDetector.ts` — erkennt Feldänderungen zwischen altem und neuem Stand (Fach/Lehrer/Raum/
  Status-Wechsel etc.), erzeugt `change_events`. Ein bestehender Wechsel wird nicht bei jedem
  weiteren Sync erneut als "neu" erkannt (Vergleich gegen zuletzt gespeicherten Stand).

### Datenbank (`src/data/database/`)

SQLite, Schema-Migration über `PRAGMA user_version` (aktuell v4, siehe `schema.ts`). Tabellen:
`lessons`, `raw_snapshots` (Rohdaten der Quelle, nie in der UI gezeigt), `sync_meta` (inkl.
`last_error_type` seit v4, siehe Fehlerklassifizierung unten), `change_events` (mit
`notified`-Spalte für "wurde dafür schon benachrichtigt", getrennt von `acknowledged`, das für ein
mögliches künftiges "als gelesen markieren" reserviert, aber noch nie beschrieben wird).
Repositories in `src/data/database/repositories/`. `clearOfflineData()` (`db.ts`) löscht alle vier
Tabellen komplett (unscoped — es gibt nur je eine konfigurierte Datenquelle gleichzeitig, siehe
`registry.ts`); wird sowohl vom "Cache leeren"-Button als auch beim Entfernen der Zugangsdaten
aufgerufen (siehe Sicherheit unten).

### Benachrichtigungen (`src/data/notifications/`)

`NotificationService.ts` lädt `expo-notifications` **lazy per `require()` in try/catch**, nie als
statischer Import — statischer Import crasht beim Modul-Load unter Expo Go (SDK 53+ hat Remote
Push aus Expo Go entfernt, der Import wirft synchron). Alle Exporte no-open, wenn das Modul nicht
ladbar ist. Kategorien in `types.ts`.

### Fehlerklassifizierung (`src/data/errors/ClassifiedError.ts`)

Fünf Fehlertypen mit echter, nachvollziehbarer Herkunft (kein Raten am Fehlertext):
`NETWORK_ERROR` (fetch() wirft, kein DNS/keine Verbindung), `AUTH_ERROR` (HTTP 401/403),
`SOURCE_ERROR` (alles andere von der Quelle, z. B. falsche Schulnummer oder 5xx — beides liefert
denselben Status, ehrlich nicht weiter unterscheidbar), `DATABASE_ERROR` (SQLite-Zugriffe in
`SyncService.ts`, über den `asDatabaseStep()`-Wrapper), `SYNC_ERROR` (Fallback für alles
Unklassifizierte). Bewusst KEINE `PARSER_ERROR`/`MAPPING_ERROR`/`UI_ERROR`-Codes — dafür gibt es
keinen echten Top-Level-Throw-Site (ein einzelner Tag mit Parse-Fehler wird als "kein Plan"
übersprungen, bricht den Sync nicht ab). `SyncMeta.lastErrorType` wird ab Schema v4 persistiert
und im Diagnose-Screen bei "Synchronisierung" als Präfix angezeigt (`[NETWORK_ERROR] ...`).

### Diagnose (`src/data/diagnostics/`)

- `DataSourceDiagnostics.ts` — Feld-für-Feld-Status pro Datenkategorie
  (`AVAILABLE_BUT_NOT_PARSED/_STORED/_DISPLAYED`, `AVAILABLE_BUT_BROKEN`, `PASS`/`FAIL`/`UNKNOWN`),
  plus System-Checks (Internet/Erreichbarkeit/Auth/Session/Datenabruf/DB/Sync) und eine feste Liste
  `NOT_AVAILABLE_FROM_SOURCE` (Adresse, Ort, Kontaktdaten, Ansprechpartner, Logo etc. — die Quelle
  liefert das strukturell nicht).
- `DataIntegrityCheck.ts` — holt für einen Zeitraum unabhängig nochmal direkt von der Quelle (an
  der DB vorbei) und vergleicht gegen den gespeicherten Stand: MISSING/EXTRA/MISMATCH. Manuell
  ausgelöst über einen Button in der Diagnose-Screen, kein automatischer Hintergrundlauf.
- `healthCheckReport.ts` — baut aus einem Audit-Report einen reinen ASCII-Text ("IT-Modus", ✓/✗/?
  je System-Check) zum Kopieren/Weitergeben an Schul-IT, ohne App-Zugriff. Zeigt "?" statt eines
  erfundenen "✓" für nie gelaufene Checks (z. B. Datenintegrität vor dem ersten manuellen Lauf).

### Update-System (`src/data/updates/UpdateCheck.ts`)

Kein Play Store — Verteilung über **GitHub Releases**. `checkForUpdate(repo, currentVersion)` ruft
`https://api.github.com/repos/{owner}/{repo}/releases/latest` auf (unauthentifiziert, **braucht
also einen öffentlichen Repo** — bei privatem Repo liefert der Endpunkt 404), vergleicht
`tag_name` gegen die installierte Version. `GITHUB_REPO` in `src/data/constants.ts` =
`"Lukasog54/fenyra-plan"`. Gibt `null` zurück bei jedem Fehler/fehlenden Releases — `null` heißt
"Check konnte nicht durchgeführt werden", NIE fälschlich "du bist aktuell".

`src/utils/installUpdate.ts` (neu) — lädt die APK bei Tap auf "Update" **innerhalb der App**
herunter (`expo-file-system/legacy`, `createDownloadResumable` mit Fortschritts-Callback) und
öffnet danach automatisch Androids Installations-Dialog über `expo-intent-launcher`
(`startActivityAsync("android.intent.action.VIEW", { data: content://…, type:
"application/vnd.android.package-archive", flags: 1 })`, `content://`-URI via
`FileSystem.getContentUriAsync`). Der letzte Bestätigungs-Tap in Androids eigenem Installer bleibt
zwingend erhalten — das ist eine OS-Sicherheitssperre, die keine App umgehen kann. **Falls die App
je über den Play Store verteilt wird, muss dieser gesamte Mechanismus raus** — Play-Policy verbietet
Apps, sich selbst außerhalb von Play's eigenem Update-Mechanismus zu aktualisieren, und Play Store
übernimmt Updates ohnehin automatisch.

### Vertretungsplan-Besonderheit: parallele Gruppen

`src/utils/lessonGroups.ts` — `groupParallelLessons()` gruppiert Stunden nach
`date_className_period`. Wenn zu einer Stunde mehrere Einträge existieren (z. B. zwei
Wahlpflichtkurse gleichzeitig), werden **beide** angezeigt statt nur einer, inklusive klarer
Kennzeichnung, welcher Teil ausfällt/verändert ist — betrifft sowohl Heute/Plan-Tabs als auch
Vertretungen. Umgesetzt in `NextLessonCard.tsx`, `TimelineLessonRow.tsx`, `DayTimeline.tsx`,
`SubstitutionList(Item).tsx`, jeweils auf Arrays/Gruppen statt Einzel-`Lesson` umgestellt.

## Ordnerstruktur (grob)

```
app/                          Expo Router Screens (Datei = Route)
  (tabs)/index.tsx            "Heute"-Tab
  (tabs)/plan.tsx             Tagesansicht mit Datums-Navigation
  (tabs)/vertretungen.tsx     Vertretungsplan mit Klassen-/Datums-/Typ-Filtern
  (tabs)/einstellungen/       Settings-Unterseiten (Sync, Benachrichtigungen, Diagnose, Über die App, ...)
  _layout.tsx                 Root-Layout: Splash-Koordination, DB-Init, Sync-Trigger
src/
  data/
    adapters/stundenplan24/   Parser → Validator → Mapper → Adapter (siehe oben)
    adapters/registry.ts      Datenquellen-Registry
    database/                 SQLite Schema, Migrationen, Repositories
    diagnostics/              Diagnose + Datenintegrität
    models/                   Domänen-Typen (Lesson, SyncMeta, SchoolDataSource, ...)
    notifications/            expo-notifications-Wrapper (lazy-loaded)
    security/                 secureCredentials (expo-secure-store)
    sync/                     SyncService, ChangeDetector
    updates/                  GitHub-Release-Update-Check
    constants.ts              STUNDENPLAN24_BASE_URL, GITHUB_REPO
  components/                 UI-Komponenten nach Feature-Ordner (heute/, plan/, vertretungen/, common/, onboarding/, settings/)
  hooks/useNetworkStatus.ts   Online/Offline + WLAN-Erkennung (NetInfo)
  query/                      TanStack-Query-Hooks + Keys
  stores/                     Zustand-Stores (Settings, UI)
  theme/                      Farb-Palette (Light/Dark), Tokens
  utils/                      lessonDiff, lessonGroups, installUpdate, date, id
scripts/
  release.js                  Voller Release: Version bump → EAS-Build → APK-Download → git tag/push → GitHub-Release (REST-API, siehe unten)
  update-github.js             Nur Code pushen (add+commit+push), kein Build/Release
  inspect-source-data.ts       Interaktives Script: eigene Zugangsdaten eingeben, sieht rohe/gemappte Daten der eigenen Schule (nie geloggt/gespeichert)
__tests__/                    Jest-Tests, gespiegelt zur src/-Struktur
__mocks__/                    Manuelle Jest-Mocks für native Module (NetInfo, expo-notifications, AsyncStorage, expo-secure-store)
```

## Release-Pipeline

`npm run release` macht automatisch: Patch-Version in `app.json`+`package.json` hochzählen →
committen → EAS-Build (Android APK, wartet auf Fertigstellung) → APK herunterladen → `git tag` +
push (Branch + Tag) → **GitHub Release direkt über die REST-API erstellen** (kein `gh`-CLI mehr
nötig, siehe `scripts/release.js`) mit der APK als Asset angehängt.

Braucht dafür einmalig eine `.env`-Datei im Projektroot (gitignored, nie committet):
```
GITHUB_TOKEN=github_pat_xxxxxxxx
```
(Fine-grained Token, beschränkt auf dieses Repo, Permission "Contents: Read and write" —
erstellbar unter `https://github.com/settings/personal-access-tokens/new`.)

`npm run update-github` ist der leichte Weg für reine Code-Änderungen ohne neue APK: committet +
pusht nur, kein Version-Bump, kein Build, kein Release.

Details + Ersteinrichtung: siehe `RELEASE.md`.

## Wichtige Konstanten / Konfiguration

- `src/data/constants.ts`: `STUNDENPLAN24_BASE_URL = "https://www.stundenplan24.de"` (fix, nicht
  vom Nutzer änderbar — eigene Server der Schule sind out of scope), `GITHUB_REPO =
  "Lukasog54/fenyra-plan"` (öffentliches Repo, sonst findet der Update-Check nichts — GitHubs
  Releases-API antwortet unauthentifiziert nur bei öffentlichen Repos).
- `eas.json`: Build-Profil heißt `"release"` (früher `"preview"`, wurde umbenannt), `distribution:
  internal`, `android.buildType: "apk"`.
- `app.json`: `slug` MUSS exakt mit dem bei Expo registrierten Projekt übereinstimmen
  (`extra.eas.projectId` ist an einen festen Slug gebunden) — ein abweichender `slug` bricht EAS-
  Builds hart. Aktuell `"fenyra-core"` (der Anzeigename `name: "Fenyra Plan"` ist davon unabhängig
  und darf abweichen).

## Sicherheit (bereits verifiziert, Stand des letzten Sicherheits-Audits)

- Kein `console.log` irgendwo in `src/`/`app/`.
- Passwörter ausschließlich über `expo-secure-store` (`src/data/security/secureCredentials.ts`),
  nie im Klartext gespeichert, nie geloggt.
- HTTP Basic Auth wird pro Request neu gesendet, nichts wird serverseitig "eingeloggt" gehalten.
- `.env` (GitHub-Token) ist über `.gitignore` ausgeschlossen.
- `inspect-source-data.ts` schreibt nie auf Platte und loggt nie das Passwort (verdecktes
  Passwort-Prompt über raw-mode stdin).
- **Gefixter Datenisolations-Bug**: "Entfernen" beim Passwort (`einstellungen/datenquelle.tsx`)
  löschte bisher NUR das SecureStore-Passwort, nicht die gecachten Stundenplan-/Vertretungsdaten
  in SQLite — ein zweiter Nutzer desselben Geräts hätte sie trotzdem sehen können. Jetzt zeigt
  "Entfernen" einen Bestätigungsdialog (`Alert.alert`) und ruft danach zusätzlich
  `clearOfflineData()` auf. Details/offene rechtliche Punkte: `docs/PRIORITAET_1_WICHTIGSTE_SACHEN.md`.
- Technische Datenschutzübersicht (welche Daten, woher, wozu, wie lange, extern übertragen) unter
  Einstellungen → Datenschutz (`einstellungen/datenschutz.tsx`) — keine rechtsverbindliche
  Datenschutzerklärung, offene rechtliche Fragen sind darin explizit als `LEGAL_REVIEW_REQUIRED`
  markiert.

## Bekannte Grenzen der Datenquelle (nicht behebbar, da strukturell nicht geliefert)

- Schul-Metadaten wie Adresse/Ort/Kontaktdaten/Ansprechpartner/Logo: liefert Stundenplan24
  strukturell nicht — als `NOT_AVAILABLE_FROM_SOURCE` markiert, nicht erfunden.
- Verlegungen (Stundenverschiebungen) haben kein strukturiertes Ziel-Datum/-Stunde in der Quelle,
  nur Freitext in `<info>` — wird als solcher angezeigt (`status: "unknown"` + Freitext), nicht als
  strukturierte Alt→Neu-Änderung, weil die Quelle das nicht hergibt.

## Weitere Dokumente

- `docs/PRIORITAET_1_WICHTIGSTE_SACHEN.md` — zentraler Produktionsreife-/Sicherheits-/
  Datenintegritäts-Bericht mit IMPLEMENTED/TESTED/VERIFIED/NOT_TESTED/BROKEN/
  NOT_AVAILABLE_FROM_SOURCE-Kennzeichnung je Punkt. Bei Fragen zu "ist X wirklich fertig/getestet"
  zuerst dort nachsehen.
- `docs/stundenplan24-investigation.md` — technische Detail-Untersuchung der Quelle selbst
  (XML-Struktur, Sonderfälle, live gegen eine echte Schule verifiziert).
- `docs/data-source-audit.md` — **veraltet**, mit entsprechendem Hinweis am Dateianfang versehen,
  nur historisch relevant.

## Für eine andere KI, die hier weiterarbeitet

1. Lies zuerst `AGENTS.md`/`CLAUDE.md` (verlinkt) — die Expo-Versions-Regel ist bindend.
2. Bei allem, was mit der Stundenplan24-Quelle zu tun hat: nichts raten oder annehmen — echte
   Feldnamen/Verhalten am realen XML/HTTP-Verhalten verifizieren (z. B. `scripts/inspect-source-data.ts`
   gegen eine echte Schule laufen lassen, oder gegen die öffentliche Demo-Schule `10000000` testen,
   die ohne Login erreichbar ist).
3. `npx tsc --noEmit` und `npm test` nach jeder Änderung laufen lassen (bestehendes Muster in
   diesem Projekt).
4. Nichts committen oder pushen ohne explizite Nutzeranfrage.
