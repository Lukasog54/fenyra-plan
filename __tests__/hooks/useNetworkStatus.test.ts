import { renderHook, act } from "@testing-library/react-native";
import NetInfo from "@react-native-community/netinfo";
import { useNetworkStatus } from "../../src/hooks/useNetworkStatus";

function setNetInfoState(next: object) {
  (NetInfo as unknown as { __setState: (s: object) => void }).__setState(next);
}

describe("useNetworkStatus", () => {
  beforeEach(() => {
    // Reset the mock's underlying state back to its default "online, wifi" shape between tests.
    setNetInfoState({ isConnected: true, isInternetReachable: true, type: "wifi" });
  });

  it("returns true when NetInfo reports connected + reachable", async () => {
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
  });

  it("updates to false when NetInfo reports disconnected", async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => {
      setNetInfoState({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current).toBe(false);
  });

  it("treats isInternetReachable === false as offline even when isConnected is true", async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => {
      setNetInfoState({ isConnected: true, isInternetReachable: false });
    });

    expect(result.current).toBe(false);
  });

  it("treats isInternetReachable === null (unknown) as online, since it isn't explicitly false", async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => {
      setNetInfoState({ isConnected: true, isInternetReachable: null });
    });

    expect(result.current).toBe(true);
  });

  it("unsubscribes its listener on unmount", async () => {
    const { unmount } = await renderHook(() => useNetworkStatus());
    unmount();
    // Nothing left listening; setting a new state shouldn't throw even after unmount.
    expect(() => {
      setNetInfoState({ isConnected: false });
    }).not.toThrow();
  });

  describe("static helpers", () => {
    it("getIsOnline reflects the module-level listener's last known state", async () => {
      await act(async () => {
        setNetInfoState({ isConnected: true, isInternetReachable: true });
      });
      expect(useNetworkStatus.getIsOnline()).toBe(true);

      await act(async () => {
        setNetInfoState({ isConnected: false, isInternetReachable: false });
      });
      expect(useNetworkStatus.getIsOnline()).toBe(false);
    });

    it("getIsWifi is true only when the connection type is wifi", async () => {
      await act(async () => {
        setNetInfoState({ type: "wifi" });
      });
      expect(useNetworkStatus.getIsWifi()).toBe(true);

      await act(async () => {
        setNetInfoState({ type: "cellular" });
      });
      expect(useNetworkStatus.getIsWifi()).toBe(false);
    });
  });
});
