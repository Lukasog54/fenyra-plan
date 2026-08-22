import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import { Button } from "../../src/components/common/Button";

describe("Button", () => {
  it("renders its label and fires onPress", async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Weiter" onPress={onPress} />);

    expect(screen.getByText("Weiter")).toBeTruthy();
    fireEvent.press(screen.getByText("Weiter"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows a loading indicator instead of the label when loading", async () => {
    await renderWithProviders(<Button label="Weiter" onPress={jest.fn()} loading />);
    expect(screen.queryByText("Weiter")).toBeNull();
  });

  it("does not fire onPress when disabled", async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Weiter" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText("Weiter"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
