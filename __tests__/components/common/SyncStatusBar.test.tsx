import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { SyncStatusBar } from "../../../src/components/common/SyncStatusBar";
import { useSync, useSyncMeta } from "../../../src/query/hooks/useSync";
import { useNetworkStatus } from "../../../src/hooks/useNetworkStatus";

// Sharp edge: useSync/useSyncMeta transitively import src/data/database/db.ts (real expo-sqlite)
// via SyncService/repositories. A bare jest.mock("path") with no factory would automock by
// requiring the real module first, pulling in expo-sqlite and hanging the test runner. Always use
// an explicit factory here.
jest.mock("../../../src/query/hooks/useSync", () => ({
  useSync: jest.fn(),
  useSyncMeta: jest.fn(),
}));

jest.mock("../../../src/hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(),
}));

const mockUseSync = useSync as jest.Mock;
const mockUseSyncMeta = useSyncMeta as jest.Mock;
const mockUseNetworkStatus = useNetworkStatus as jest.Mock;

describe("SyncStatusBar", () => {
  beforeEach(() => {
    mockUseSync.mockReset();
    mockUseSyncMeta.mockReset();
    mockUseNetworkStatus.mockReset();
  });

  it("shows a spinner and 'Synchronisierung...' while syncing", async () => {
    mockUseSync.mockReturnValue({ mutate: jest.fn(), isPending: true });
    mockUseSyncMeta.mockReturnValue({ data: undefined });
    mockUseNetworkStatus.mockReturnValue(true);

    await renderWithProviders(<SyncStatusBar />);
    expect(screen.getByText("Synchronisierung...")).toBeTruthy();
  });

  it("shows the offline message when not online", async () => {
    mockUseSync.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseSyncMeta.mockReturnValue({ data: undefined });
    mockUseNetworkStatus.mockReturnValue(false);

    await renderWithProviders(<SyncStatusBar />);
    expect(screen.getByText("Offline · letzte Daten werden angezeigt")).toBeTruthy();
    expect(screen.getByText("Erneut versuchen")).toBeTruthy();
  });

  it("shows a sync-error message when online but the last sync failed", async () => {
    mockUseSync.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseSyncMeta.mockReturnValue({ data: { lastSyncStatus: "error", lastSyncedAt: null } });
    mockUseNetworkStatus.mockReturnValue(true);

    await renderWithProviders(<SyncStatusBar />);
    expect(screen.getByText("Sync fehlgeschlagen · letzte Daten werden angezeigt")).toBeTruthy();
    expect(screen.getByText("Erneut versuchen")).toBeTruthy();
  });

  it("shows the last-synced time when online and up to date", async () => {
    mockUseSync.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseSyncMeta.mockReturnValue({ data: { lastSyncStatus: "ok", lastSyncedAt: "2026-08-22T10:30:00.000Z" } });
    mockUseNetworkStatus.mockReturnValue(true);

    await renderWithProviders(<SyncStatusBar />);
    expect(screen.getByText(/^Aktualisiert /)).toBeTruthy();
    expect(screen.queryByText("Erneut versuchen")).toBeNull();
  });

  it("shows 'noch nie' when there is no lastSyncedAt", async () => {
    mockUseSync.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseSyncMeta.mockReturnValue({ data: { lastSyncStatus: "ok", lastSyncedAt: null } });
    mockUseNetworkStatus.mockReturnValue(true);

    await renderWithProviders(<SyncStatusBar />);
    expect(screen.getByText("Aktualisiert noch nie")).toBeTruthy();
  });

  it("calls mutate when tapped", async () => {
    const mutate = jest.fn();
    mockUseSync.mockReturnValue({ mutate, isPending: false });
    mockUseSyncMeta.mockReturnValue({ data: { lastSyncStatus: "ok", lastSyncedAt: null } });
    mockUseNetworkStatus.mockReturnValue(true);

    await renderWithProviders(<SyncStatusBar />);
    await fireEvent.press(screen.getByRole("button"));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("does not fire mutate again when tapped while already syncing (disabled)", async () => {
    const mutate = jest.fn();
    mockUseSync.mockReturnValue({ mutate, isPending: true });
    mockUseSyncMeta.mockReturnValue({ data: undefined });
    mockUseNetworkStatus.mockReturnValue(true);

    await renderWithProviders(<SyncStatusBar />);
    await fireEvent.press(screen.getByRole("button"));
    // Pressable with disabled=true does not invoke onPress.
    expect(mutate).not.toHaveBeenCalled();
  });
});
