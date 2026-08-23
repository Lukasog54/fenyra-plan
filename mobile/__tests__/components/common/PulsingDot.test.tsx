import React from "react";
import { render } from "@testing-library/react-native";
import { PulsingDot } from "../../../src/components/common/PulsingDot";

describe("PulsingDot", () => {
  it("renders without crashing, using the given color and size", async () => {
    const result = await render(<PulsingDot color="#ff0000" size={10} />);
    expect(result.toJSON()).toBeTruthy();
  });
});
