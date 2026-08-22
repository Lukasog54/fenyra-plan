import { ClassifiedError, classifiedTypeOf, type SyncErrorType } from "../../../src/data/errors/ClassifiedError";

const ALL_TYPES: SyncErrorType[] = ["NETWORK_ERROR", "AUTH_ERROR", "SOURCE_ERROR", "DATABASE_ERROR", "SYNC_ERROR"];

describe("ClassifiedError", () => {
  it("sets the type, message and name", () => {
    const err = new ClassifiedError("NETWORK_ERROR", "no connection");
    expect(err.type).toBe("NETWORK_ERROR");
    expect(err.message).toBe("no connection");
    expect(err.name).toBe("ClassifiedError");
  });

  it("is a real Error instance", () => {
    const err = new ClassifiedError("AUTH_ERROR", "bad credentials");
    expect(err).toBeInstanceOf(Error);
  });

  it("carries an optional cause through to the underlying Error", () => {
    const cause = new Error("root cause");
    const err = new ClassifiedError("DATABASE_ERROR", "db failed", { cause });
    expect(err.cause).toBe(cause);
  });

  it("has no cause when none is provided", () => {
    const err = new ClassifiedError("SYNC_ERROR", "generic");
    expect(err.cause).toBeUndefined();
  });
});

describe("classifiedTypeOf", () => {
  it.each(ALL_TYPES)("returns %s for a ClassifiedError of that type", (type) => {
    expect(classifiedTypeOf(new ClassifiedError(type, "msg"))).toBe(type);
  });

  it("falls back to SYNC_ERROR for a plain Error", () => {
    expect(classifiedTypeOf(new Error("plain"))).toBe("SYNC_ERROR");
  });

  it("falls back to SYNC_ERROR for a non-error value (string)", () => {
    expect(classifiedTypeOf("just a string")).toBe("SYNC_ERROR");
  });

  it("falls back to SYNC_ERROR for undefined", () => {
    expect(classifiedTypeOf(undefined)).toBe("SYNC_ERROR");
  });

  it("falls back to SYNC_ERROR for null", () => {
    expect(classifiedTypeOf(null)).toBe("SYNC_ERROR");
  });

  it("falls back to SYNC_ERROR for a plain object shaped like a ClassifiedError", () => {
    expect(classifiedTypeOf({ type: "NETWORK_ERROR", message: "fake" })).toBe("SYNC_ERROR");
  });
});
