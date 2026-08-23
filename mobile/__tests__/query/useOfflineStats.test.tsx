import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useOfflineStats } from "../../src/query/hooks/useOfflineStats";
import { resetStores } from "../../test-utils/resetStores";
import * as db from "../../src/data/database/db";

jest.mock("../../src/data/database/db", () => ({
  getOfflineStats: jest.fn(),
}));

const mockedGetOfflineStats = db.getOfflineStats as jest.MockedFunction<typeof db.getOfflineStats>;

beforeEach(() => {
  resetStores();
  mockedGetOfflineStats.mockReset();
});

describe("useOfflineStats", () => {
  it("returns the offline stats from the database", async () => {
    mockedGetOfflineStats.mockResolvedValue({ lessonCount: 42, rawSnapshotCount: 7, changeEventCount: 3 });

    const { result } = await renderHookWithProviders(() => useOfflineStats());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ lessonCount: 42, rawSnapshotCount: 7, changeEventCount: 3 });
  });

  it("surfaces an error when reading stats fails", async () => {
    mockedGetOfflineStats.mockRejectedValue(new Error("db unavailable"));

    const { result } = await renderHookWithProviders(() => useOfflineStats());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
