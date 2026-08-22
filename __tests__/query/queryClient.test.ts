import { queryClient } from "../../src/query/queryClient";

describe("queryClient", () => {
  it("is configured with a 60s staleTime and a single retry", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.retry).toBe(1);
  });
});
