import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { spacing, typography } from "../../../src/theme/tokens";

interface DataRow {
  label: string;
  herkunft: string;
  zweck: string;
  speicherort: string;
  dauer: string;
  extern: string;
}

const DATA_ROWS: DataRow[] = [
  {
    label: "Zugangsdaten (Schulnummer, Benutzertyp)",
    herkunft: "Eigene Eingabe in den Einstellungen.",
    zweck: "Adressierung der richtigen Schule bei Stundenplan24/Indiware.",
    speicherort: "Lokal auf dem Gerät (App-Einstellungen, nicht verschlüsselt, aber nicht aus der App heraus abrufbar).",
    dauer: "Bis manuell geändert oder die Zugangsdaten entfernt werden.",
    extern: "Ja: bei jeder Synchronisierung als Teil der Server-Adresse an Stundenplan24 gesendet.",
  },
  {
    label: "Passwort",
    herkunft: "Eigene Eingabe in den Einstellungen.",
    zweck: "HTTP-Basic-Authentifizierung gegenüber Stundenplan24 bei jeder Anfrage - es gibt keine Sitzung/kein Login-Token.",
    speicherort: "Ausschließlich im verschlüsselten Systemspeicher (Android Keystore / iOS Schlüsselbund über expo-secure-store). Niemals in der Datenbank, den Einstellungen, Logs oder Absturzberichten.",
    dauer: "Bis manuell entfernt (Einstellungen → Datenquelle → „Entfernen“).",
    extern: "Ja: bei jeder Synchronisierung im Authorization-Header an Stundenplan24 gesendet.",
  },
  {
    label: "Stundenplan-/Vertretungsdaten (Fach, Lehrer, Raum, Klasse, Status, Bemerkung)",
    herkunft: "Von Stundenplan24/Indiware bereitgestellt - Fenyra fragt sie im Auftrag des Nutzers ab, erzeugt sie nicht selbst.",
    zweck: "Anzeige des eigenen Stundenplans und Vertretungsplans, auch offline.",
    speicherort: "Lokale SQLite-Datenbank auf dem Gerät.",
    dauer: "Bis der Cache geleert wird (Einstellungen → Offline-Daten) oder die Zugangsdaten entfernt werden (löscht seit diesem Audit automatisch mit, siehe unten).",
    extern: "Nein - nur Empfang von der Quelle, keine Weitergabe an Dritte.",
  },
  {
    label: "Rohdaten-Snapshots der Quellantworten",
    herkunft: "Unveränderte Kopie der XML-Antwort von Stundenplan24.",
    zweck: "Fehlerdiagnose (z. B. um einen falsch verarbeiteten Datensatz nachvollziehen zu können).",
    speicherort: "Lokale SQLite-Datenbank auf dem Gerät.",
    dauer: "Bis der Cache geleert wird.",
    extern: "Nein.",
  },
  {
    label: "Profil-Einstellungen (Anzeigename, ausgewählte Klasse)",
    herkunft: "Eigene Eingabe.",
    zweck: "Personalisierung der Anzeige (z. B. Standard-Klassenfilter im Vertretungsplan).",
    speicherort: "Lokal auf dem Gerät (App-Einstellungen).",
    dauer: "Bis manuell geändert oder die App deinstalliert wird.",
    extern: "Nein.",
  },
  {
    label: "Sync-Metadaten (Zeitpunkt, Status, Fehlermeldungen)",
    herkunft: "Von Fenyra selbst beim Synchronisieren erzeugt.",
    zweck: "Anzeige „Zuletzt synchronisiert“, Fehlerdiagnose.",
    speicherort: "Lokale SQLite-Datenbank auf dem Gerät.",
    dauer: "Bis der Cache geleert wird.",
    extern: "Nein.",
  },
];

export default function DatenschutzScreen() {
  const { palette } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.intro, { color: palette.text }]}>
        Technische Übersicht, welche Daten Fenyra verarbeitet, woher sie kommen, wozu sie gebraucht werden, wo sie
        gespeichert werden, wie lange und ob sie das Gerät verlassen. Das ist eine technische Beschreibung des
        Ist-Zustands, keine rechtsverbindliche Datenschutzerklärung - rechtliche Fragen sind unten explizit als
        <Text style={{ fontWeight: "700" }}> LEGAL_REVIEW_REQUIRED</Text> markiert.
      </Text>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>VERARBEITETE DATEN</Text>
      {DATA_ROWS.map((row) => (
        <Card key={row.label} style={styles.card}>
          <Text style={[styles.rowLabel, { color: palette.text }]}>{row.label}</Text>
          <Field label="Herkunft" value={row.herkunft} palette={palette} />
          <Field label="Zweck" value={row.zweck} palette={palette} />
          <Field label="Speicherort" value={row.speicherort} palette={palette} />
          <Field label="Speicherdauer" value={row.dauer} palette={palette} />
          <Field label="Externe Übertragung" value={row.extern} palette={palette} />
        </Card>
      ))}

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>EXTERNE DIENSTE</Text>
      <Card style={styles.card}>
        <Field
          label="Stundenplan24 / Indiware"
          value="Die vom Nutzer selbst konfigurierte, autorisierte Schuldatenquelle. Empfängt bei jeder Synchronisierung Schulnummer, Benutzertyp und Passwort (HTTP Basic Auth) sowie den angefragten Zeitraum. Einzige Stelle, die Zugangsdaten sieht."
          palette={palette}
        />
        <Field
          label="GitHub Releases API"
          value="Unauthentifizierter Abruf von github.com/Lukasog54/fenyra-plan/releases/latest beim Öffnen von „Über die App“, um auf eine neue Version zu prüfen. Es werden keine Nutzer- oder Schuldaten übertragen, nur ein anonymer HTTP-GET."
          palette={palette}
        />
        <Field
          label="Sonstige Dienste (Analytics, Crash-Reporting, Push-Server)"
          value="Keine. Fenyra bindet keinen Analytics-/Tracking-/Crash-Reporting-Dienst ein und registriert keinen Push-Token bei Expo/Google - geprüft durch Code-Durchsuchung (keine entsprechenden Aufrufe im Quellcode)."
          palette={palette}
        />
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>APP-BERECHTIGUNGEN</Text>
      <Card style={styles.card}>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          Internetzugriff (für die Synchronisierung mit Stundenplan24 und den Update-Check) und
          Benachrichtigungen (Android 13+ fragt dafür explizit um Erlaubnis, nur falls Benachrichtigungen in den
          Einstellungen aktiviert werden). Keine Standort-, Kamera-, Mikrofon-, Kontakte- oder sonstigen
          sensiblen Berechtigungen.
        </Text>
        <Text style={[styles.legalTag, { color: palette.warning }]}>
          LEGAL_REVIEW_REQUIRED: Die exakte, vom Android-Build tatsächlich erzeugte Berechtigungsliste
          (AndroidManifest.xml) ist hier aus dem Quellcode abgeleitet, nicht aus dem fertigen Build ausgelesen -
          vor einer offiziellen Datenschutzerklärung sollte sie am gebauten APK verifiziert werden.
        </Text>
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>BENACHRICHTIGUNGEN</Text>
      <Card style={styles.card}>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          Wenn aktiviert, können Push-Benachrichtigungen Ausschnitte aus dem Stundenplan enthalten (z. B. Fach,
          Lehrerkürzel oder Raum einer ausgefallenen Stunde). Diese Benachrichtigungen werden ausschließlich lokal
          auf dem Gerät erzeugt (kein externer Push-Server ist beteiligt), können je nach Geräte-Einstellung aber
          auf dem Sperrbildschirm sichtbar sein.
        </Text>
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>LÖSCHUNG</Text>
      <Card style={styles.card}>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          „Entfernen“ beim Passwort (Einstellungen → Datenquelle) löscht das gespeicherte Passwort UND alle lokal
          zwischengespeicherten Stundenplan-/Vertretungsdaten dieser Schule von diesem Gerät. „Cache leeren“
          (Einstellungen → Offline-Daten) löscht Stundenplan-/Vertretungsdaten, Rohdaten-Snapshots und
          Sync-Metadaten, lässt aber Zugangsdaten und Profil-Einstellungen unangetastet. Die vollständige
          Deinstallation der App entfernt alle oben genannten Daten inklusive der im Systemspeicher gesicherten
          Zugangsdaten (Android/iOS-Standardverhalten).
        </Text>
      </Card>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>OFFENE RECHTLICHE PUNKTE</Text>
      <Card style={styles.card}>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          Diese Liste beschreibt nur, WAS technisch passiert - keine rechtlichen Bewertungen werden hier
          behauptet. Folgende Punkte sind als <Text style={{ fontWeight: "700" }}>LEGAL_REVIEW_REQUIRED</Text>{" "}
          markiert und sollten von der Schule bzw. einem Datenschutzbeauftragten geprüft werden:
        </Text>
        <Text style={[styles.legalItem, { color: palette.textSecondary }]}>
          • Rechtsgrundlage und Auftragsverhältnis für die Verarbeitung von Lehrer-Kürzeln/-Namen (personenbezogene
          Daten von Schulpersonal, nicht des Nutzers selbst) innerhalb des Vertretungsplans.
        </Text>
        <Text style={[styles.legalItem, { color: palette.textSecondary }]}>
          • Ob eine förmliche Datenschutzerklärung im rechtlichen Sinn (§ 13 DSGVO-Informationspflichten)
          erforderlich ist, abhängig davon, ob/wie die App durch die Schule offiziell eingesetzt wird.
        </Text>
        <Text style={[styles.legalItem, { color: palette.textSecondary }]}>
          • Verantwortlichkeit im Sinne der DSGVO (Schule als Verantwortlicher vs. Nutzer als Verantwortlicher für
          die eigene, selbst gehostete App-Installation) - hängt vom tatsächlichen Einsatzmodell ab.
        </Text>
        <Text style={[styles.legalItem, { color: palette.textSecondary }]}>
          • Exakte AndroidManifest-Berechtigungsliste am fertigen Build verifizieren (siehe oben).
        </Text>
      </Card>
    </ScrollView>
  );
}

function Field({ label, value, palette }: { label: string; value: string; palette: { textSecondary: string; text: string } }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.fieldValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  intro: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginTop: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  field: {
    marginTop: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: typography.caption.fontSize + 1,
    lineHeight: 18,
  },
  paragraph: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
  },
  legalTag: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  legalItem: {
    fontSize: typography.caption.fontSize,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
