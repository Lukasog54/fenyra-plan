import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useAvailableClasses } from "../../src/query/hooks/useAvailableClasses";
import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { resetStores } from "../../test-utils/resetStores";
import * as registry from "../../src/data/adapters/registry";
import type { SchoolDataSource } from "../../src/data/models/SchoolDataSource";

jest.mock("../../src/data/adapters/registry", () => ({
  resolveAdapter: jest.fn(),
}));

const mockedResolveAdapter = registry.resolveAdapter as jest.MockedFunction<typeof registry.resolveAdapter>;

function makeAdapter(fetchAvailableClasses: jest.Mock): SchoolDataSource {
  return {
    config: { id: "stundenplan24", displayName: "Test", kind: "stundenplan24" },
    fetchLessons: jest.fn(),
    fetchAvailableClasses,
    testConnection: jest.fn(),
  };
}

beforeEach(() => {
  resetStores();
  mockedResolveAdapter.mockReset();
});

describe("useAvailableClasses", () => {
  it("is disabled and does not query when the school source isn't configured", async () => {
    const fetchAvailableClasses = jest.fn().mockResolvedValue(["10a"]);
    mockedResolveAdapter.mockReturnValue(makeAdapter(fetchAvailableClasses));

    const { result } = await renderHookWithProviders(() => useAvailableClasses());

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchAvailableClasses).not.toHaveBeenCalled();
  });

  it("fetches and alphabetically sorts classes once configured", async () => {
    useSettingsStore.getState().updateSchoolConfig({ schoolId: "12345", credentialRef: "cred-1" });
    const fetchAvailableClasses = jest.fn().mockResolvedValue(["10b", "10a", "9c"]);
    mockedResolveAdapter.mockReturnValue(makeAdapter(fetchAvailableClasses));

    const { result } = await renderHookWithProviders(() => useAvailableClasses());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["10a", "10b", "9c"]);
  });

  it("surfaces an error when fetching available classes fails", async () => {
    useSettingsStore.getState().updateSchoolConfig({ schoolId: "12345", credentialRef: "cred-1" });
    const fetchAvailableClasses = jest.fn().mockRejectedValue(new Error("auth failed"));
    mockedResolveAdapter.mockReturnValue(makeAdapter(fetchAvailableClasses));

    const { result } = await renderHookWithProviders(() => useAvailableClasses());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
