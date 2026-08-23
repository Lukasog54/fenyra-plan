import React from "react";
import { screen, fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { ToggleRow } from "../../../src/components/common/ToggleRow";

describe("ToggleRow", () => {
  it("renders its label/hint and fires onToggle on press", async () => {
    const onToggle = jest.fn();
    await renderWithProviders(
      <ToggleRow label="Benachrichtigungen" hint="Bei Änderungen informieren" value={false} onToggle={onToggle} />
    );

    expect(screen.getByText("Benachrichtigungen")).toBeTruthy();
    expect(screen.getByText("Bei Änderungen informieren")).toBeTruthy();

    fireEvent.press(screen.getByText("Benachrichtigungen"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
