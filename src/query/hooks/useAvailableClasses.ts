import { useQuery } from "@tanstack/react-query";
import { resolveAdapter } from "../../data/adapters/registry";
import { useSettingsStore } from "../../stores/useSettingsStore";

export function useAvailableClasses() {
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);
  const isConfigured = Boolean(schoolConfig.stundenplan24?.schoolId && schoolConfig.stundenplan24?.credentialRef);

  return useQuery({
    queryKey: ["availableClasses", schoolConfig.stundenplan24?.schoolId],
    queryFn: () => resolveAdapter(schoolConfig).fetchAvailableClasses().then((classes) => [...classes].sort((a, b) => a.localeCompare(b))),
    enabled: isConfigured,
  });
}
