import { View, ScrollView, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import { useSyncMeta } from "../../../src/query/hooks/useSync";
import { useOfflineStats } from "../../../src/query/hooks/useOfflineStats";
import { getLessonsForRange } from "../../../src/data/database/repositories/lessonRepository";
import { resolveAdapter } from "../../../src/data/adapters/registry";
import { runDataSourceAudit, type DiagnosticEntry, type DiagnosticStatus } from "../../../src/data/diagnostics/DataSourceDiagnostics";
import { defaultSyncRange } from "../../../src/utils/date";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Card } from "../../../src/components/common/Card";
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
  ERROR: "Fehler",
  UNKNOWN: "nicht feststellbar",
};

function statusColor(status: DiagnosticStatus, palette: Palette): string {
  switch (status) {
    case "AVAILABLE":
      return palette.success;
    case "UNAVAILABLE":
    case "ERROR":
      return palette.danger;
    case "AVAILABLE_BUT_NOT_PARSED":
    case "AVAILABLE_BUT_NOT_STORED":
    case "AVAILABLE_BUT_NOT_DISPLAYED":
      return palette.warning;
    case "UNKNOWN":
      return palette.muted;
  }
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
