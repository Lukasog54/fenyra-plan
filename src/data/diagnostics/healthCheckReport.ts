import type { DataSourceAuditReport, DiagnosticStatus } from "./DataSourceDiagnostics";
import type { DataIntegrityReport } from "./DataIntegrityCheck";

const OK: DiagnosticStatus[] = ["PASS", "AVAILABLE"];
const FAILED: DiagnosticStatus[] = ["FAIL", "UNAVAILABLE", "ERROR", "AVAILABLE_BUT_BROKEN"];

function glyphFor(status: DiagnosticStatus): string {
  if (OK.includes(status)) return "✓";
  if (FAILED.includes(status)) return "✗";
  return "?";
}

function row(label: string, glyph: string): string {
  return `${label.padEnd(24, " ")} ${glyph}`;
}

/**
 * Plain-text "IT-Modus" health check, built only from checks that are actually run (see
 * DataSourceDiagnostics.runDataSourceAudit) - a row is "?" rather than a fabricated "✓" whenever
 * there is no real underlying check for it (e.g. Data Integrity before the manual check has ever
 * been run). Meant to be copied and handed to a school's IT/support staff as-is.
 */
export function buildHealthCheckReport(audit: DataSourceAuditReport, integrity: DataIntegrityReport | null): string {
  const byKey = (key: string): DiagnosticStatus => audit.systemChecks.find((c) => c.key === key)?.status ?? "UNKNOWN";

  const integrityGlyph = integrity ? (integrity.missing.length === 0 && integrity.extra.length === 0 && integrity.mismatched.length === 0 ? "✓" : "✗") : "?";

  const lines = [
    "FENYRA PLAN HEALTH CHECK",
    "",
    row("Internet", glyphFor(byKey("internetverbindung"))),
    row("Stundenplan24", glyphFor(byKey("erreichbarkeit"))),
    row("Authentication", glyphFor(byKey("authentifizierung_check"))),
    row("Session", glyphFor(byKey("session"))),
    row("Data Retrieval", glyphFor(byKey("datenabruf"))),
    row("Parser / Mapping", glyphFor(byKey("datenabruf"))),
    row("SQLite", glyphFor(byKey("datenbank"))),
    row("Synchronization", glyphFor(byKey("synchronisierung"))),
    row("Data Integrity", integrityGlyph),
    "",
    "RESULT:",
  ];

  const allChecked = audit.systemChecks.every((c) => OK.includes(c.status));
  const allKnown = audit.systemChecks.every((c) => c.status !== "UNKNOWN") && integrity !== null;
  if (allChecked && integrityGlyph === "✓") {
    lines.push("SYSTEM HEALTHY");
  } else if (!allKnown) {
    lines.push("PASS WITH SOURCE LIMITATIONS (nicht alle Checks durchgeführt - siehe Details in Fenyra)");
  } else {
    lines.push("SYSTEM NEEDS ATTENTION - Details in Fenyra unter Einstellungen -> Daten-Diagnose");
  }

  lines.push("", `Erstellt: ${new Date(audit.generatedAt).toLocaleString("de-DE")}`, `Schulnummer-Quelle: ${audit.sourceId}`);

  return lines.join("\n");
}
