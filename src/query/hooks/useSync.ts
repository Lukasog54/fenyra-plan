import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sync } from "../../data/sync/SyncService";
import { getSyncMeta } from "../../data/database/repositories/syncMetaRepository";
import { resolveAdapter } from "../../data/adapters/registry";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { STUNDENPLAN24_SOURCE_ID } from "../../data/constants";
import { defaultSyncRange } from "../../utils/date";
import { queryKeys } from "../keys";

export function useSyncMeta() {
  return useQuery({
    queryKey: queryKeys.syncMeta(STUNDENPLAN24_SOURCE_ID),
    queryFn: () => getSyncMeta(STUNDENPLAN24_SOURCE_ID),
  });
}

export function useSync() {
  const queryClient = useQueryClient();
  const schoolConfig = useSettingsStore((s) => s.schoolConfig);

  return useMutation({
    mutationFn: async () => {
      const adapter = resolveAdapter(schoolConfig);
      return sync(adapter, defaultSyncRange());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["substitutionLessons"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncMeta(STUNDENPLAN24_SOURCE_ID) });
    },
  });
}
