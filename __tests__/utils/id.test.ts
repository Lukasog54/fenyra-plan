import { generateId } from "../../src/utils/id";

describe("generateId", () => {
  it("prefixes the id with the given prefix", () => {
    expect(generateId("lesson")).toMatch(/^lesson_/);
  });

  it("produces an id with three underscore-separated segments", () => {
    const id = generateId("evt");
    expect(id.split("_")).toHaveLength(3);
  });

  it("generates different ids on successive calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId("x")));
    expect(ids.size).toBe(50);
  });

  it("works with an empty prefix", () => {
    expect(generateId("")).toMatch(/^_[0-9a-z]+_[0-9a-z]+$/);
  });
});
