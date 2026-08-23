import { buildHealthCheckReport } from "../../../src/data/diagnostics/healthCheckReport";
import type { DataSourceAuditReport } from "../../../src/data/diagnostics/DataSourceDiagnostics";
import type { DataIntegrityReport } from "../../../src/data/diagnostics/DataIntegrityCheck";

function makeAudit(overrides: Partial<DataSourceAuditReport["systemChecks"][number]>[] = []): DataSourceAuditReport {
  const base = [
    { key: "internetverbindung", label: "Internetverbindung", status: "PASS" as const },
    { key: "erreichbarkeit", label: "Stundenplan24-Erreichbarkeit", status: "PASS" as const },
    { key: "authentifizierung_check", label: "Authentifizierung", status: "PASS" as const },
    { key: "session", label: "Session", status: "PASS" as const },
    { key: "datenabruf", label: "Datenabruf / Parser / Mapping", status: "PASS" as const },
    { key: "datenbank", label: "Datenbank", status: "PASS" as const },
    { key: "synchronisierung", label: "Synchronisierung", status: "PASS" as const },
  ];
  for (const override of overrides) {
    const row = base.find((r) => r.key === override.key);
    if (row) Object.assign(row, override);
  }
  return {
    sourceId: "stundenplan24",
    generatedAt: "2026-08-20T10:00:00.000Z",
    range: { from: "2026-08-19", to: "2026-08-19" },
    authentication: { key: "authentication", label: "Authentifizierung", status: "AVAILABLE" },
    systemChecks: base,
    categories: [],
  };
}

const CLEAN_INTEGRITY: DataIntegrityReport = {
  range: { from: "2026-08-19", to: "2026-08-19" },
  sourceRecordCount: 10,
  fenyraRecordCount: 10,
  missing: [],
  extra: [],
  mismatched: [],
};

describe("buildHealthCheckReport", () => {
  it("reports SYSTEM HEALTHY when every check passed and integrity is clean", () => {
    const report = buildHealthCheckReport(makeAudit(), CLEAN_INTEGRITY);
    expect(report).toContain("SYSTEM HEALTHY");
    expect(report).toContain("Internet                 ✓");
  });

  it("reports PASS WITH SOURCE LIMITATIONS when integrity was never actually run (not fabricated as OK)", () => {
    const report = buildHealthCheckReport(makeAudit(), null);
    expect(report).toContain("PASS WITH SOURCE LIMITATIONS");
    expect(report).toContain("Data Integrity           ?");
  });

  it("reports SYSTEM NEEDS ATTENTION when a real check failed", () => {
    const report = buildHealthCheckReport(makeAudit([{ key: "erreichbarkeit", status: "FAIL" }]), CLEAN_INTEGRITY);
    expect(report).toContain("SYSTEM NEEDS ATTENTION");
    expect(report).toContain("Stundenplan24            ✗");
  });
});
