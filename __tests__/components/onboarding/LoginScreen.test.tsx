import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { resetStores } from "../../../test-utils/resetStores";
import { LoginScreen } from "../../../src/components/onboarding/LoginScreen";
import { useSettingsStore } from "../../../src/stores/useSettingsStore";
import * as registry from "../../../src/data/adapters/registry";
import { PUBLIC_DEMO_SCHOOL_ID } from "../../../src/data/constants";
import type { SchoolDataSource } from "../../../src/data/models/SchoolDataSource";

// registry.resolveAdapter constructs a real Stundenplan24Adapter which performs network I/O -
// mock it directly (with an explicit factory, per the project's db-import sharp-edge convention)
// rather than letting the real adapter run in tests.
jest.mock("../../../src/data/adapters/registry", () => ({
  resolveAdapter: jest.fn(),
}));

const mockedResolveAdapter = registry.resolveAdapter as jest.MockedFunction<typeof registry.resolveAdapter>;

function makeAdapter(testConnection: jest.Mock): SchoolDataSource {
  return {
    config: { id: "stundenplan24", displayName: "Test", kind: "stundenplan24" },
    fetchLessons: jest.fn(),
    fetchAvailableClasses: jest.fn(),
    testConnection,
  };
}

beforeEach(() => {
  resetStores();
  mockedResolveAdapter.mockReset();
});

describe("LoginScreen", () => {
  it("does not call the adapter when required fields are still empty", async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByText("Verbinden"));
    expect(mockedResolveAdapter).not.toHaveBeenCalled();
  });

  it("does not call the adapter until a password is entered for a non-demo school", async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("8-stellig, z. B. 12345678"), "12345678");
    await fireEvent.press(screen.getByText("Schüler"));
    await fireEvent.press(screen.getByText("Verbinden"));
    expect(mockedResolveAdapter).not.toHaveBeenCalled();
  });

  it("selecting a user-type chip fills the username field", async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByText("Lehrer"));
    expect(screen.getByDisplayValue("lehrer")).toBeTruthy();
  });

  it("allows connecting to the public demo school without a password", async () => {
    const testConnection = jest.fn().mockResolvedValue({ ok: true });
    mockedResolveAdapter.mockReturnValue(makeAdapter(testConnection));

    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("8-stellig, z. B. 12345678"), PUBLIC_DEMO_SCHOOL_ID);
    await fireEvent.press(screen.getByText("Schüler"));

    await fireEvent.press(screen.getByText("Verbinden"));
    await waitFor(() => expect(testConnection).toHaveBeenCalledTimes(1));
  });

  it("updates the school config in the store on a successful connection", async () => {
    const testConnection = jest.fn().mockResolvedValue({ ok: true });
    mockedResolveAdapter.mockReturnValue(makeAdapter(testConnection));

    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("8-stellig, z. B. 12345678"), "87654321");
    await fireEvent.press(screen.getByText("Schüler"));
    await fireEvent.changeText(screen.getByPlaceholderText("Passwort"), "hunter2");

    await fireEvent.press(screen.getByText("Verbinden"));

    await waitFor(() => expect(useSettingsStore.getState().schoolConfig.stundenplan24?.schoolId).toBe("87654321"));
    expect(useSettingsStore.getState().schoolConfig.stundenplan24?.credentialRef).toBeTruthy();
  });

  it("shows the error message and does not update the store when the connection fails", async () => {
    const testConnection = jest.fn().mockResolvedValue({ ok: false, message: "Falsche Zugangsdaten" });
    mockedResolveAdapter.mockReturnValue(makeAdapter(testConnection));

    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("8-stellig, z. B. 12345678"), "87654321");
    await fireEvent.press(screen.getByText("Schüler"));
    await fireEvent.changeText(screen.getByPlaceholderText("Passwort"), "hunter2");

    await fireEvent.press(screen.getByText("Verbinden"));

    await waitFor(() => expect(screen.getByText("Falsche Zugangsdaten")).toBeTruthy());
    expect(useSettingsStore.getState().schoolConfig.stundenplan24?.schoolId).toBe("");
  });
});
