import { useQuery } from "@tanstack/react-query";
import { getOfflineStats } from "../../data/database/db";

export function useOfflineStats() {
  return useQuery({
    queryKey: ["offlineStats"],
    queryFn: getOfflineStats,
  });
}
