import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { TextField } from "../../../src/components/common/TextField";

describe("TextField", () => {
  it("renders its label, placeholder and hint, passing input props through", async () => {
    await renderWithProviders(
      <TextField label="Benutzername" hint="Wird nicht angezeigt" placeholder="max.mustermann" />
    );

    expect(screen.getByText("Benutzername")).toBeTruthy();
    expect(screen.getByText("Wird nicht angezeigt")).toBeTruthy();
    expect(screen.getByPlaceholderText("max.mustermann")).toBeTruthy();
  });
});
