import React from "react";
import { Text } from "react-native";
import { screen, fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { PressableScale } from "../../../src/components/common/PressableScale";

describe("PressableScale", () => {
  it("renders its children and fires onPress", async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <PressableScale onPress={onPress}>
        <Text>Tippen</Text>
      </PressableScale>
    );

    expect(screen.getByText("Tippen")).toBeTruthy();
    fireEvent.press(screen.getByText("Tippen"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
