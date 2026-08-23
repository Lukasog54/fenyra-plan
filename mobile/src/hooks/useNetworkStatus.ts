import { useEffect, useState } from "react";
import NetInfo, { NetInfoState, NetInfoStateType } from "@react-native-community/netinfo";

function deriveIsOnline(state: NetInfoState): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

let currentIsOnline = true;
// NetInfo has no synchronous "current state" getter - addEventListener's docs promise the
// listener fires "soon after you subscribe" with the current state, so this starts as
// "unknown" and is corrected within that first callback (registered at module load, below).
let currentConnectionType: NetInfoStateType = "unknown" as NetInfoStateType;
NetInfo.addEventListener((state) => {
  currentIsOnline = deriveIsOnline(state);
  currentConnectionType = state.type;
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

/** True once NetInfo has confirmed the active connection is Wi-Fi (not cellular/other/unknown). */
useNetworkStatus.getIsWifi = (): boolean => currentConnectionType === "wifi";
