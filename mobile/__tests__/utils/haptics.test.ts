import * as Haptics from "expo-haptics";
import { lightImpact, selectionFeedback } from "../../src/utils/haptics";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

const mockedImpactAsync = Haptics.impactAsync as jest.MockedFunction<typeof Haptics.impactAsync>;
const mockedSelectionAsync = Haptics.selectionAsync as jest.MockedFunction<typeof Haptics.selectionAsync>;

describe("haptics", () => {
  it("lightImpact swallows a rejected impactAsync instead of throwing", async () => {
    mockedImpactAsync.mockRejectedValue(new Error("no haptics on this device"));
    expect(() => lightImpact()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });

  it("selectionFeedback swallows a rejected selectionAsync instead of throwing", async () => {
    mockedSelectionAsync.mockRejectedValue(new Error("no haptics on this device"));
    expect(() => selectionFeedback()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});
