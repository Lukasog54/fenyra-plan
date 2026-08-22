import React from "react";
import { Text } from "react-native";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { Card } from "../../../src/components/common/Card";

describe("Card", () => {
  it("renders its children", async () => {
    await renderWithProviders(
      <Card>
        <Text>Inhalt</Text>
      </Card>
    );

    expect(screen.getByText("Inhalt")).toBeTruthy();
  });
});
