import { useEffect, useState } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

function deriveIsOnline(state: NetInfoState): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

let currentIsOnline = true;
NetInfo.addEventListener((state) => {
  currentIsOnline = deriveIsOnline(state);
});

/** Live network connectivity, backed by NetInfo (not inferred from sync errors). */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(currentIsOnline);

  useEffect(() => {
    return NetInfo.addEventListener((state) => setIsOnline(deriveIsOnline(state)));
  }, []);

  return isOnline;
}

/** Imperative read for use outside components (e.g. interval/background sync guards). */
useNetworkStatus.getIsOnline = (): boolean => currentIsOnline;
