import { validateMobil, validateVplan, Stundenplan24ValidationError } from "../../../src/data/adapters/stundenplan24/validator";

describe("validateMobil", () => {
  it("throws a Stundenplan24ValidationError with issue details when a required field is missing", () => {
    const raw = {
      VpMobil: {
        Kopf: {},
        Klassen: { Kl: [{ /* Kurz missing */ Pl: { Std: [] } }] },
      },
    };

    expect(() => validateMobil(raw)).toThrow(Stundenplan24ValidationError);
    try {
      validateMobil(raw);
    } catch (error) {
      expect(error).toBeInstanceOf(Stundenplan24ValidationError);
      const validationError = error as Stundenplan24ValidationError;
      expect(validationError.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: expect.arrayContaining(["VpMobil"]) })])
      );
    }
  });

  it("preserves unrecognized fields on a Std entry instead of stripping them (passthrough)", () => {
    const raw = {
      VpMobil: {
        Kopf: {},
        Klassen: {
          Kl: [
            {
              Kurz: "10a",
              Pl: { Std: [{ St: 1, Fa: "Mathematik", UnbekanntesFeld: "sollte erhalten bleiben" }] },
            },
          ],
        },
      },
    };

    const result = validateMobil(raw);
    const std = result.VpMobil.Klassen.Kl[0].Pl.Std[0] as Record<string, unknown>;
    expect(std.UnbekanntesFeld).toBe("sollte erhalten bleiben");
  });
});

describe("validateVplan", () => {
  it("throws when the vp root is missing", () => {
    expect(() => validateVplan({ somethingElse: {} })).toThrow(Stundenplan24ValidationError);
  });

  it("accepts a document with no aktion entries (a day with no substitutions)", () => {
    const result = validateVplan({ vp: { kopf: {} } });
    expect(result.vp.haupt).toBeUndefined();
  });
});
