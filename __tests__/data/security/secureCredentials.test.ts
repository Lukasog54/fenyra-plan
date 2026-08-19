import { savePassword, getPassword, deletePassword, credentialKeyFor } from "../../../src/data/security/secureCredentials";

describe("secureCredentials", () => {
  it("round-trips a password through the platform secure store", async () => {
    await savePassword("stundenplan24", "geheim123");
    expect(await getPassword("stundenplan24")).toBe("geheim123");
  });

  it("returns null once a password has been deleted", async () => {
    await savePassword("stundenplan24", "geheim123");
    await deletePassword("stundenplan24");
    expect(await getPassword("stundenplan24")).toBeNull();
  });

  it("derives a stable, source-specific key", () => {
    expect(credentialKeyFor("stundenplan24")).toBe("stundenplan24_password_stundenplan24");
    expect(credentialKeyFor("other-school")).not.toBe(credentialKeyFor("stundenplan24"));
  });
});
