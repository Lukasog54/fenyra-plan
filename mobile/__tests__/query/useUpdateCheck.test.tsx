import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useUpdateCheck } from "../../src/query/hooks/useUpdateCheck";
import { resetStores } from "../../test-utils/resetStores";
import * as updateCheckModule from "../../src/data/updates/UpdateCheck";
import { GITHUB_REPO } from "../../src/data/constants";

jest.mock("../../src/data/updates/UpdateCheck", () => ({
  checkForUpdate: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.0.10" } },
}));

const mockedCheckForUpdate = updateCheckModule.checkForUpdate as jest.MockedFunction<
  typeof updateCheckModule.checkForUpdate
>;

beforeEach(() => {
  resetStores();
  mockedCheckForUpdate.mockReset();
});

describe("useUpdateCheck", () => {
  it("reports an available update", async () => {
    mockedCheckForUpdate.mockResolvedValue({
      available: true,
      currentVersion: "1.0.10",
      latestVersion: "1.0.11",
      changelog: "Bug fixes",
      downloadUrl: "https://example.com/app.apk",
      htmlUrl: "https://example.com/releases/v1.0.11",
    });

    const { result } = await renderHookWithProviders(() => useUpdateCheck());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.available).toBe(true);
    expect(mockedCheckForUpdate).toHaveBeenCalledWith(GITHUB_REPO, "1.0.10");
  });

  it("returns null when there is no update information available", async () => {
    mockedCheckForUpdate.mockResolvedValue(null);

    const { result } = await renderHookWithProviders(() => useUpdateCheck());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("does not retry on failure", async () => {
    mockedCheckForUpdate.mockRejectedValue(new Error("network error"));

    const { result } = await renderHookWithProviders(() => useUpdateCheck());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedCheckForUpdate).toHaveBeenCalledTimes(1);
  });
});
