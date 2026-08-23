import { View, ScrollView, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { useSyncMeta } from "../../../src/query/hooks/useSync";
import { useOfflineStats } from "../../../src/query/hooks/useOfflineStats";
import { getLessonsForRange } from "../../../src/data/database/repositories/lessonRepository";
import { resolveAdapter } from "../../../src/data/adapters/registry";
import { runDataSourceAudit, type DiagnosticEntry, type DiagnosticStatus } from "../../../src/data/diagnostics/DataSourceDiagnostics";
import { checkDataIntegrity, type DataIntegrityReport } from "../../../src/data/diagnostics/DataIntegrityCheck";
import { buildHealthCheckReport } from "../../../src/data/diagnostics/healthCheckReport";
import { defaultSyncRange } from "../../../src/utils/date";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
import { Button } from "../../../src/components/common/Button";
import type { Palette } from "../../../src/theme/colors";
import { radius, spacing, typography } from "../../../src/theme/tokens";

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <Card style={styles.row}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: palette.text }]}>{value}</Text>
    </Card>
  );
}

const STATUS_LABELS: Record<DiagnosticStatus, string> = {
  AVAILABLE: "verfügbar",
  UNAVAILABLE: "nicht verfügbar",
  AVAILABLE_BUT_NOT_PARSED: "verfügbar, nicht geparst",
  AVAILABLE_BUT_NOT_STORED: "verfügbar, nicht gespeichert",
  AVAILABLE_BUT_NOT_DISPLAYED: "verfügbar, nicht angezeigt",
  AVAILABLE_BUT_BROKEN: "verfügbar, aber fehlerhaft verarbeitet",
  ERROR: "Fehler",
  UNKNOWN: "nicht feststellbar",
  PASS: "OK",
  FAIL: "Fehler",
};

function statusColor(status: DiagnosticStatus, palette: Palette): string {
  switch (status) {
    case "AVAILABLE":
    case "PASS":
      return palette.success;
    case "UNAVAILABLE":
    case "ERROR":
    case "AVAILABLE_BUT_BROKEN":
    case "FAIL":
      return palette.danger;
    case "AVAILABLE_BUT_NOT_PARSED":
    case "AVAILABLE_BUT_NOT_STORED":
    case "AVAILABLE_BUT_NOT_DISPLAYED":
      return palette.warning;
    case "UNKNOWN":
      return palette.muted;
  }
}

function IntegrityRow({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={styles.integrityRow}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.integrityValue, { color: danger && value > 0 ? palette.danger : palette.text }]}>{value}</Text>
    </View>
  );
}

function AuditRow({ entry }: { entry: DiagnosticEntry }) {
  const { palette } = useTheme();
  const color = statusColor(entry.status, palette);
  return (
    <View style={styles.auditRow}>
      <View style={styles.auditRowHeader}>
        <Text style={[styles.auditLabel, { color: palette.text }]}>{entry.label}</Text>
        <View style={styles.statusWrapper}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.auditStatus, { color }]}>{STATUS_LABELS[entry.status]}</Text>
        </View>
      </View>
      {entry.detail ? <Text style={[styles.auditDetail, { color: palette.textSecondary }]}>{entry.detail}</Text> : null}
    </View>
  );
}

export default function DiagnoseScreen() {
  const { palette } = useTheme();
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);
  const sourceId = schoolConfig.id;
  const isConfigured = Boolean(schoolConfig.stundenplan24?.schoolId && schoolConfig.stundenplan24?.credentialRef);
  const { data: meta } = useSyncMeta();
  const { data: stats } = useOfflineStats();
  const { from, to } = defaultSyncRange();

  const { data: unmappedCount = 0 } = useQuery({
    queryKey: ["diagnostics", "unmapped", sourceId, from, to],
    queryFn: async () => {
      const lessons = await getLessonsForRange(sourceId, from, to);
      return lessons.filter((l) => l.status === "unknown").length;
    },
  });

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["diagnostics", "audit", sourceId, from, to],
    queryFn: () => runDataSourceAudit(resolveAdapter(schoolConfig), { from, to }),
    enabled: isConfigured,
  });

  const integrityMutation = useMutation({
    mutationFn: () => checkDataIntegrity(resolveAdapter(schoolConfig), { from, to }),
  });
  const integrity: DataIntegrityReport | undefined = integrityMutation.data;

  async function copyHealthCheck() {
    if (!audit) return;
    const report = buildHealthCheckReport(audit, integrity ?? null);
    await Clipboard.setStringAsync(report);
    Alert.alert("Kopiert", "Der IT-Health-Check wurde als Text in die Zwischenablage kopiert - kann direkt an die Schul-IT weitergegeben werden.");
  }

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.container}>
      <DiagnosticRow label="Schulnummer" value={schoolConfig.stundenplan24?.schoolId || "—"} />
      <DiagnosticRow label="Letzte Synchronisierung" value={meta?.lastSyncedAt ? new Date(meta.lastSyncedAt).toLocaleString("de-DE") : "Noch nie"} />
      <DiagnosticRow label="Sync-Status" value={meta?.lastSyncStatus ?? "never"} />
      <DiagnosticRow label="Gespeicherte Stunden" value={String(stats?.lessonCount ?? 0)} />
      <DiagnosticRow label="Rohdaten-Snapshots" value={String(stats?.rawSnapshotCount ?? 0)} />
      <DiagnosticRow label="Erkannte Änderungen" value={String(stats?.changeEventCount ?? 0)} />

      <Text style={[styles.warningHeading, { color: unmappedCount > 0 ? palette.warning : palette.textSecondary }]}>
        {unmappedCount > 0
          ? `WARNUNG: ${unmappedCount} Stunde(n) mit nicht klassifizierbarer Änderung (status "unknown"). Rohdaten dazu sind über die Rohdaten-Snapshots einsehbar.`
          : "Keine unklassifizierten Änderungen im aktuellen Zeitraum."}
      </Text>

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>SYSTEM-CHECK</Text>

      {auditLoading ? (
        <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.md }} />
      ) : audit ? (
        <Card>
          {audit.systemChecks.map((entry, index) => (
            <View key={entry.key}>
              <AuditRow entry={entry} />
              {index < audit.systemChecks.length - 1 ? <View style={[styles.divider, { backgroundColor: palette.border }]} /> : null}
            </View>
          ))}
        </Card>
      ) : null}

      {audit ? (
        <Button label="IT-Health-Check kopieren" variant="secondary" onPress={copyHealthCheck} style={{ marginTop: spacing.sm }} />
      ) : null}

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>DATENQUELLEN-AUDIT</Text>

      {auditLoading ? (
        <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.md }} />
      ) : audit ? (
        <Card>
          <AuditRow entry={audit.authentication} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          {audit.categories.map((entry, index) => (
            <View key={entry.key}>
              <AuditRow entry={entry} />
              {index < audit.categories.length - 1 ? <View style={[styles.divider, { backgroundColor: palette.border }]} /> : null}
            </View>
          ))}
        </Card>
      ) : (
        <Text style={{ color: palette.textSecondary }}>Noch nicht konfiguriert.</Text>
      )}

      <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>DATENINTEGRITÄT</Text>
      <Text style={[styles.integrityHint, { color: palette.textSecondary }]}>
        Vergleicht einen frischen Abruf direkt von der Quelle mit den aktuell gespeicherten Fenyra-Daten für
        denselben Zeitraum. Abweichungen können auch bedeuten, dass sich die Quelle seit der letzten
        Synchronisierung geändert hat, nicht zwingend ein Fenyra-Fehler.
      </Text>
      <Button
        label="Datenintegrität prüfen"
        onPress={() => integrityMutation.mutate()}
        loading={integrityMutation.isPending}
        disabled={!isConfigured}
        style={{ marginTop: spacing.sm }}
      />
      {integrityMutation.isError ? (
        <Text style={[styles.integrityHint, { color: palette.danger, marginTop: spacing.sm }]}>
          {integrityMutation.error instanceof Error ? integrityMutation.error.message : "Prüfung fehlgeschlagen."}
        </Text>
      ) : null}
      {integrity ? (
        <Card style={{ marginTop: spacing.sm }}>
          <IntegrityRow label="SOURCE RECORDS" value={integrity.sourceRecordCount} />
          <IntegrityRow label="FENYRA RECORDS" value={integrity.fenyraRecordCount} />
          <IntegrityRow label="MISSING" value={integrity.missing.length} danger />
          <IntegrityRow label="EXTRA" value={integrity.extra.length} danger />
          <IntegrityRow label="MISMATCH" value={integrity.mismatched.length} danger />
          {integrity.mismatched.length > 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              {integrity.mismatched.slice(0, 10).map((m, i) => (
                <Text key={i} style={[styles.auditDetail, { color: palette.textSecondary }]}>
                  {m.field}: „{String(m.sourceValue)}" (Quelle) vs. „{String(m.fenyraValue)}" (Fenyra)
                </Text>
              ))}
              {integrity.mismatched.length > 10 ? (
                <Text style={[styles.auditDetail, { color: palette.muted }]}>+ {integrity.mismatched.length - 10} weitere</Text>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pageHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: typography.caption.fontSize,
  },
  value: {
    fontSize: typography.body.fontSize,
    fontWeight: "700",
  },
  warningHeading: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  integrityHint: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
  integrityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  integrityValue: {
    fontSize: typography.body.fontSize,
    fontWeight: "700",
  },
  sectionHeading: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    marginTop: spacing.md,
  },
  auditRow: {
    paddingVertical: spacing.sm,
  },
  auditRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  auditLabel: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: "600",
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  statusWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  auditStatus: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
  },
  auditDetail: {
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
