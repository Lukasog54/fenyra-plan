import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { SettingsRow } from "../../../src/components/settings/SettingsRow";

describe("SettingsRow", () => {
  it("renders the label and optional value", async () => {
    await renderWithProviders(<SettingsRow icon="settings-outline" label="Design" value="Dunkel" />);
    expect(screen.getByText("Design")).toBeTruthy();
    expect(screen.getByText("Dunkel")).toBeTruthy();
  });

  it("does not render a value when none is given", async () => {
    await renderWithProviders(<SettingsRow icon="settings-outline" label="Design" />);
    expect(screen.queryByText("Dunkel")).toBeNull();
  });

  it("fires onPress when pressed", async () => {
    const onPress = jest.fn();
    await renderWithProviders(<SettingsRow icon="settings-outline" label="Design" onPress={onPress} />);
    await fireEvent.press(screen.getByText("Design"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is disabled (no onPress fired) when no onPress prop is given", async () => {
    // Pressable with no onPress simply has nothing to call; this asserts pressing it is a
    // no-op that doesn't throw (an unhandled rejection here would fail the test).
    await renderWithProviders(<SettingsRow icon="settings-outline" label="Design" />);
    await fireEvent.press(screen.getByText("Design"));
  });
});
