import { renderHook } from "@testing-library/react-native";
import { usePressScale } from "../../src/hooks/usePressScale";

describe("usePressScale", () => {
  it("can be called inside a component without throwing, and returns the expected shape", async () => {
    const { result } = await renderHook(() => usePressScale());

    expect(result.current).toEqual(
      expect.objectContaining({
        animatedStyle: expect.anything(),
        onPressIn: expect.any(Function),
        onPressOut: expect.any(Function),
      })
    );

    expect(() => {
      result.current.onPressIn();
      result.current.onPressOut();
    }).not.toThrow();
  });
});
