import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useSync, useSyncMeta } from "../../src/query/hooks/useSync";
import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { resetStores } from "../../test-utils/resetStores";
import * as syncService from "../../src/data/sync/SyncService";
import * as syncMetaRepository from "../../src/data/database/repositories/syncMetaRepository";
import * as registry from "../../src/data/adapters/registry";
import { queryKeys } from "../../src/query/keys";
import { STUNDENPLAN24_SOURCE_ID } from "../../src/data/constants";
import type { SyncMeta } from "../../src/data/models/SyncMeta";
import type { SchoolDataSource } from "../../src/data/models/SchoolDataSource";

jest.mock("../../src/data/sync/SyncService", () => ({
  sync: jest.fn(),
}));

jest.mock("../../src/data/database/repositories/syncMetaRepository", () => ({
  getSyncMeta: jest.fn(),
  saveSyncMeta: jest.fn(),
}));

jest.mock("../../src/data/adapters/registry", () => ({
  resolveAdapter: jest.fn(),
}));

const mockedSync = syncService.sync as jest.MockedFunction<typeof syncService.sync>;
const mockedGetSyncMeta = syncMetaRepository.getSyncMeta as jest.MockedFunction<typeof syncMetaRepository.getSyncMeta>;
const mockedResolveAdapter = registry.resolveAdapter as jest.MockedFunction<typeof registry.resolveAdapter>;

function makeAdapter(): SchoolDataSource {
  return {
    config: { id: STUNDENPLAN24_SOURCE_ID, displayName: "Test", kind: "stundenplan24" },
    fetchLessons: jest.fn(),
    fetchAvailableClasses: jest.fn(),
    testConnection: jest.fn(),
  };
}

function makeSyncMeta(overrides: Partial<SyncMeta> = {}): SyncMeta {
  return {
    sourceId: STUNDENPLAN24_SOURCE_ID,
    lastSyncedAt: "2026-08-20T10:00:00.000Z",
    lastSyncStatus: "success",
    syncIntervalMinutes: 30,
    ...overrides,
  };
}

beforeEach(() => {
  resetStores();
  mockedSync.mockReset();
  mockedGetSyncMeta.mockReset();
  mockedResolveAdapter.mockReset();
  mockedResolveAdapter.mockReturnValue(makeAdapter());
});

describe("useSyncMeta", () => {
  it("returns sync meta from the repository", async () => {
    mockedGetSyncMeta.mockResolvedValue(makeSyncMeta());

    const { result } = await renderHookWithProviders(() => useSyncMeta());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.lastSyncStatus).toBe("success");
    expect(mockedGetSyncMeta).toHaveBeenCalledWith(STUNDENPLAN24_SOURCE_ID);
  });
});

describe("useSync", () => {
  it("invalidates lessons, substitutionLessons and syncMeta caches on success", async () => {
    mockedSync.mockResolvedValue({ events: [], syncMeta: makeSyncMeta() });

    const { result, queryClient } = await renderHookWithProviders(() => useSync());
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["lessons"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["substitutionLessons"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.syncMeta(STUNDENPLAN24_SOURCE_ID) });
  });

  it("tracks progress phases reported by the sync service", async () => {
    mockedSync.mockImplementation(async (_adapter, _range, onProgress) => {
      onProgress?.("connecting");
      onProgress?.("fetching");
      onProgress?.("saving");
      onProgress?.("done");
      return { events: [], syncMeta: makeSyncMeta() };
    });

    const { result } = await renderHookWithProviders(() => useSync());

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.progress).toBe("done");
  });

  it("surfaces an error and does not invalidate caches when sync fails", async () => {
    mockedSync.mockRejectedValue(new Error("network down"));

    const { result, queryClient } = await renderHookWithProviders(() => useSync());
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("resolves the adapter from the current school config", async () => {
    mockedSync.mockResolvedValue({ events: [], syncMeta: makeSyncMeta() });
    useSettingsStore.getState().updateSchoolConfig({ schoolId: "12345" });

    const { result } = await renderHookWithProviders(() => useSync());

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedResolveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ stundenplan24: expect.objectContaining({ schoolId: "12345" }) })
    );
  });
});
