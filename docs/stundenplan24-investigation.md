# Stundenplan24 / Indiware mobil — technische Untersuchung

Stand: 2026-08-19. **Update**: Nach der ersten Runde (verifiziert nur gegen die öffentliche Beispielschule
`10000000`) wurde die Integration jetzt zusätzlich **live gegen eine echte, reale Schule mit echten,
vom Nutzer autorisiert bereitgestellten Zugangsdaten getestet** (Basic Auth mit Schulnummer/Benutzer/Passwort).
Schulnummer und Zugangsdaten selbst werden hier bewusst nicht dokumentiert. Die Struktur unten ist damit nicht
mehr nur „öffentliche Demo verifiziert", sondern **gegen eine echte Vertretungsplan-Situation eines echten
Schultages geprüft** (170 echte Unterrichtsstunden, 12 Klassen, 9 echte Ausfälle, mehrere echte Raum-/
Lehreränderungen am 19.08.2026).

## Zwei getrennte Apps/Feeds, keine gemeinsame Datei

Die Startseite (https://stundenplan24.de/) verlinkt pro Schulnummer vier relevante Unterprodukte, alle unter
`https://www.stundenplan24.de/<schulnummer>/<produkt>/` (die getestete reale Schule war unter der Kurzform
`https://stundenplan24.de/<schulnummer>/<produkt>/` ohne „www." ebenso erreichbar):

```text
Stundenplan24 (Portal, öffentlich, nur Schulnummer-Eingabe)
│
├── mobil     → Indiware mobil (Schüler)   — Klassenplan MIT Vertretungen, aber ohne Originalwerte
├── moble     → Indiware mobil (Lehrer)    — dieselbe Struktur, personalisiert für Lehrer
├── vplan     → Vertretungsplan (Schüler)  — dedizierte, flache Liste NUR der Änderungen
├── vplanle   → Vertretungsplan (Lehrer)
├── wplan     → Wochenplan (Version 6)     — nicht untersucht
└── splan     → Stundenplan (Version 5)    — nicht untersucht
```

**Wichtigste Erkenntnis**: Weder `mobil` noch `vplan` liefern einen strukturierten „Originalwert" (z. B. den alten
Raum) direkt im Vertretungs-Datensatz. Stattdessen liefert `mobil` PRO TAG eine XML-Datei, die den Tag bereits
inklusive aller Vertretungen zeigt, mit Änderungs-Flags als XML-Attribute (`LeAe="LeGeaendert"` etc.) auf dem
jeweils GEÄNDERTEN Feld. Der *ursprüngliche* Lehrer/Fach lässt sich nur über die pro Klasse mitgelieferte
`<Unterricht>`-Tabelle rekonstruieren (Stundennummer `<Nr>` → kanonisches Fach/Lehrer). Für den Raum gibt es
keine entsprechende Tabelle — der ursprüngliche Raum ist **nicht rekonstruierbar**. Fenyras eigener
`ChangeDetector` (Diff zweier aufeinanderfolgender Syncs) bleibt deshalb der einzige Weg, echte
„204 → 301"-Verläufe über die Zeit zu zeigen.

**WICHTIG — mit echten Daten gelernt**: Die Änderungs-Flags (`FaAe`/`LeAe`/`RaAe`) sind das EINZIGE verlässliche
Signal für „das hat sich geändert". Ein Vergleich des aktuellen Werts gegen die `<Unterricht>`-Tabelle als
zusätzliche Heuristik (frühere Implementierung) erzeugte an der echten Schule **89 falsche „Fachänderungen"**,
weil Kurs-/Gruppen-Fachkürzel (z. B. `ch1` für eine Chemie-Kursgruppe) legitim vom generischen Fachkürzel in
`<Unterricht>` (`Ch`) abweichen, ohne dass sich etwas geändert hat. Diese Heuristik wurde entfernt — nur noch die
expliziten `Ae`-Attribute der Quelle zählen.

## Feed: Indiware mobil (`<baseUrl>/<schulnummer>/mobil/mobdaten/PlanKl<YYYYMMDD>.xml`)

```text
Format:            XML, Root <VpMobil>                                    [VERIFIZIERT, echte Schule]
Authentifizierung: HTTP Basic Auth                                        [VERIFIZIERT, echte Schule]
                    - ohne Credentials: HTTP 401
                    - mit falschem Passwort: HTTP 401
                    - mit korrekten Credentials: HTTP 200
Struktur:
  <VpMobil><Kopf>...</Kopf><Klassen><Kl>
    <Kurz>10a</Kurz>
    <KlStunden><KlSt ZeitVon="07:20" ZeitBis="08:05">1</KlSt>...</KlStunden>   Zeitraster (pro Klasse)
    <Kurse>...</Kurse>                        Kurse/Gruppen der Klasse (kann <Kurse/> leer sein)
    <Unterricht><Ue><UeNr UeLe="Do" UeFa="DE" [UeGr="..."]>72</UeNr></Ue>...</Unterricht>
    <Pl><Std>
      <St>1</St>[<Beginn>07:20</Beginn><Ende>08:05</Ende>]
      <Fa [FaAe="FaGeaendert"]>DE</Fa>
      [<Ku2>Kursname</Ku2>]
      <Le [LeAe="LeGeaendert"]>Do</Le>
      <Ra [RaAe="RaGeaendert"]>114a</Ra>
      <Nr>72</Nr>
      <If>Freitext-Hinweis, oft leer</If>
    </Std></Pl>
  </Kl></Klassen></VpMobil>
Fach/Lehrer/Raum:  kurze Kürzel, keine ausgeschriebenen Namen im Feed
```

**Neue, an der echten Schule verifizierte Erkenntnisse (die Beispielschule zeigte das nicht):**

1. **`<Beginn>`/`<Ende>` sind NICHT garantiert vorhanden.** Die echte getestete Schule lieferte sie für keine
   einzige Stunde (0 von 170 hatten sie). Fenyra fällt jetzt auf `<KlStunden><KlSt ZeitVon="...">` (Startzeit
   pro Klasse+Periode) zurück. Eine Endzeit gibt es dafür **keine** entsprechende Fallback-Quelle — bei dieser
   Schule war sogar `ZeitBis=""` im Zeitraster selbst leer. Fenyra zeigt in diesem Fall nur die Startzeit an,
   erfindet keine Endzeit.
2. **`<Pl>`, `<Unterricht>`, `<Kurse>`, `<KlStunden>` können als selbstschließende Leer-Tags auftreten**
   (`<Pl/>` etc.), z. B. für Klassen ohne Unterricht an dem Tag. `fast-xml-parser` macht daraus einen leeren
   String statt eines Objekts — führte zu einem Zod-Validierungsfehler, der den kompletten Tages-Abruf
   abgebrochen hätte. Behoben: wird jetzt als „leere Liste" normalisiert.
3. **Ausfall-Konvention bestätigt** (vorher nur Heuristik): `<Fa FaAe="FaGeaendert">---</Fa>` +
   `<Le LeAe="LeGeaendert">&nbsp;</Le>` + `<Ra RaAe="RaGeaendert">&nbsp;</Ra>` + `<If>„... fällt aus"</If>`.
   Wichtig: `&nbsp;` ist kein gültiges XML-Standard-Entity und wird von `fast-xml-parser` **nicht** dekodiert,
   sondern als Literal-Text `"&nbsp;"` durchgereicht — Fenyra normalisiert das jetzt zu „leer/undefined" statt es
   als Rohtext anzuzeigen.

## Feed: Vertretungsplan (`<baseUrl>/<schulnummer>/vplan/vdaten/VplanKl<YYYYMMDD>.xml`)

```text
Format:            XML, Root <vp>                                          [VERIFIZIERT]
Struktur:
  <vp><kopf>
    <datei>...</datei><titel>...</titel><schulname>...</schulname><datum>...</datum>
    <kopfinfo><aenderungl>Liste Lehrer</aenderungl><aenderungk>Liste Klassen</aenderungk></kopfinfo>
  </kopf>
  <haupt><aktion>
    <klasse>5a</klasse><stunde>3</stunde>
    <fach [fageaendert="ae"]>EN</fach>
    <lehrer [legeaendert="ae"]>Bau</lehrer>
    <raum [rageaendert="ae"]>17a</raum>
    <info>für EN Czi</info>
  </aktion></haupt>
  <!-- laut Client-JS zusätzlich möglich, nicht mit echten Daten beobachtet: -->
  <!-- <klausur><jahrgang/><kurs/><kursleiter/><stunde/><beginn/><dauer/><kinfo/></klausur> -->
  <!-- <fussinfo>Freitext</fussinfo> -->
</vp>
Schulname:         <schulname> im <kopf> vorhanden → „Schulinformationen" sind über diesen Feed verfügbar
```

## Was weiterhin unverifiziert ist

- **`Klausur`/`fussinfo`** im Vertretungsplan-Feed: nur aus dem Client-JavaScript abgeleitet, an keiner der
  beiden geprüften Schulen mit echten Daten beobachtet.
- **`wplan`/`splan`** (Wochenplan/Stundenplan Version 5) wurden nicht untersucht.
- Ob JEDE Schule dieselbe Ausfall-Konvention (`Fa="---"`, `&nbsp;`) verwendet, oder ob es schulspezifische
  Varianten gibt, ist mit einer einzelnen echten Schule nicht abschließend belegt — aber jetzt ein echter,
  beobachteter Fall statt reiner Vermutung.

## Umsetzungsstatus in Fenyra

`src/data/adapters/stundenplan24/{models,parser,validator,mapper,adapter}.ts` implementieren die oben
verifizierte Struktur, live getestet gegen eine echte Schule:

- Cross-Referenzierung der `<Unterricht>`-Tabelle für echte Original-Fach/Lehrer-Werte.
- Ehrliches `undefined` für `originalRoom` (Feed liefert das nicht) und für `endTime`, wenn die Quelle keine
  liefert (keine Fake-Daten, keine geratenen Werte).
- Änderungserkennung ausschließlich über die expliziten `Ae`-Attribute der Quelle (kein Raten mehr).
- `Stundenplan24Adapter.fetchLessons()` ruft `mobil` und `vplan` pro Tag ab und führt sie zusammen.
- `baseUrl` ist die Portal-Wurzel (z. B. `https://www.stundenplan24.de`); Fenyra hängt `/<schulnummer>/mobil/...`
  bzw. `/<schulnummer>/vplan/...` selbst an.

Getestet: 36 automatisierte Tests (Fixtures unter `__tests__/fixtures/stundenplan24/`) **plus** ein einmaliger,
nicht committeter Live-Abgleich gegen eine echte, reale Schule (170 echte Unterrichtsstunden erfolgreich
geparst, gemappt, alle 3 dabei gefundenen Bugs behoben und gegen dieselben echten Daten erneut verifiziert).
Die Rohdaten der echten Schule wurden nach dem Test gelöscht, nicht ins Repository übernommen.
