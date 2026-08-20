import { validateMobil, validateVplan, Stundenplan24ValidationError } from "../../../src/data/adapters/stundenplan24/validator";
import { parseVplanXml } from "../../../src/data/adapters/stundenplan24/parser";

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

  // fast-xml-parser turns a genuinely empty <haupt></haupt>/<kopfinfo/> into an empty string,
  // not an object (same issue as <Pl/>/<Unterricht/> on the mobil side) - a day with zero
  // Vertretungen produces exactly this, so it has to be parsed through the real parser here,
  // not a hand-built object, to actually exercise the bug this guards against.
  it("accepts a real day-with-no-substitutions XML response (empty <haupt> and <kopfinfo> tags)", () => {
    const xml = "<vp><kopf><schulname>Testschule</schulname><kopfinfo/></kopf><haupt></haupt></vp>";
    const result = validateVplan(parseVplanXml(xml));
    expect(result.vp.kopf.schulname).toBe("Testschule");
    expect(result.vp.haupt?.aktion).toEqual([]);
  });
});
