import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { resetStores } from "../../../test-utils/resetStores";
import { ClassSelectionScreen } from "../../../src/components/onboarding/ClassSelectionScreen";
import { useAvailableClasses } from "../../../src/query/hooks/useAvailableClasses";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";

// useAvailableClasses is a react-query hook driven by the network-backed adapter; mocking it
// directly (explicit factory) keeps this a pure component test of ClassSelectionScreen's
// loading/error/success/manual-entry branches.
jest.mock("../../../src/query/hooks/useAvailableClasses", () => ({
  useAvailableClasses: jest.fn(),
}));

const mockUseAvailableClasses = useAvailableClasses as jest.Mock;

beforeEach(() => {
  resetStores();
  mockUseAvailableClasses.mockReset();
});

describe("ClassSelectionScreen", () => {
  it("shows neither the error state nor any class rows while classes are loading", async () => {
    mockUseAvailableClasses.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: jest.fn(), isRefetching: false });
    await renderWithProviders(<ClassSelectionScreen />);
    // isLoading takes precedence over the error/empty and success branches (see the component's
    // isLoading ? ... : isError || empty ? ... : ... chain) - assert neither of those render.
    expect(screen.queryByText(/Klassenliste konnte nicht geladen werden/)).toBeNull();
    expect(screen.queryByText("Erneut versuchen")).toBeNull();
    // The heading and manual-entry section are outside the conditional and still render.
    expect(screen.getByText("Klasse wählen")).toBeTruthy();
  });

  it("shows an error state with a retry button when the query errors", async () => {
    const refetch = jest.fn();
    mockUseAvailableClasses.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch, isRefetching: false });
    await renderWithProviders(<ClassSelectionScreen />);

    expect(screen.getByText(/Klassenliste konnte nicht geladen werden/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Erneut versuchen"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the error state when the query succeeds with an empty list", async () => {
    mockUseAvailableClasses.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
    await renderWithProviders(<ClassSelectionScreen />);
    expect(screen.getByText(/Klassenliste konnte nicht geladen werden/)).toBeTruthy();
  });

  it("renders one row per available class and selects it on press", async () => {
    mockUseAvailableClasses.mockReturnValue({ data: ["10a", "10b"], isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
    await renderWithProviders(<ClassSelectionScreen />);

    expect(screen.getByText("10a")).toBeTruthy();
    expect(screen.getByText("10b")).toBeTruthy();

    await fireEvent.press(screen.getByText("10b"));
    expect(useSettingsStore.getState().selectedClassName).toBe("10b");
  });

  it("disables the manual OK button until a class name is typed, then selects the trimmed value", async () => {
    mockUseAvailableClasses.mockReturnValue({ data: ["10a"], isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
    await renderWithProviders(<ClassSelectionScreen />);

    await fireEvent.press(screen.getByText("OK"));
    expect(useSettingsStore.getState().selectedClassName).toBeNull();

    await fireEvent.changeText(screen.getByPlaceholderText("Klasse manuell eintragen"), "  11c  ");
    await fireEvent.press(screen.getByText("OK"));
    expect(useSettingsStore.getState().selectedClassName).toBe("11c");
  });
});
