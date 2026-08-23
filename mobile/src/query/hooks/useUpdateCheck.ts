import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { checkForUpdate } from "../../data/updates/UpdateCheck";
import { GITHUB_REPO } from "../../data/constants";

export function useUpdateCheck() {
  const currentVersion = Constants.expoConfig?.version ?? "0.0.0";

  return useQuery({
    queryKey: ["updateCheck", GITHUB_REPO, currentVersion],
    queryFn: () => checkForUpdate(GITHUB_REPO, currentVersion),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
