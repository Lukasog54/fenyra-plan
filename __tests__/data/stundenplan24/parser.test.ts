import fs from "fs";
import path from "path";
import { parseVpMobilXml, parseVplanXml } from "../../../src/data/adapters/stundenplan24/parser";

function readFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, "../../fixtures/stundenplan24", name), "utf-8");
}

describe("parseVpMobilXml", () => {
  it("parses the mobil XML into an object with an array of Std entries per class", () => {
    const xml = readFixture("mobil-sample.xml");
    const result = parseVpMobilXml(xml) as any;

    expect(result.VpMobil.Klassen.Kl[0].Kurz).toBe("10a");
    expect(Array.isArray(result.VpMobil.Klassen.Kl[0].Pl.Std)).toBe(true);
    expect(result.VpMobil.Klassen.Kl[0].Pl.Std).toHaveLength(6);
  });

  it("keeps the LeAe change-flag attribute alongside the text value", () => {
    const xml = readFixture("mobil-sample.xml");
    const result = parseVpMobilXml(xml) as any;
    const period3 = result.VpMobil.Klassen.Kl[0].Pl.Std[2];
    expect(period3.Le["#text"]).toBe("Weber");
    expect(period3.Le["@_LeAe"]).toBe("LeGeaendert");
  });

  it("does not throw on malformed XML, returning a best-effort parse instead of crashing", () => {
    expect(() => parseVpMobilXml("<VpMobil><Kopf><Datum>2026</Kopf></VpMobil>")).not.toThrow();
  });
});

describe("parseVplanXml", () => {
  it("parses the Vertretungsplan XML into a flat list of aktion entries", () => {
    const xml = readFixture("vplan-sample.xml");
    const result = parseVplanXml(xml) as any;

    expect(Array.isArray(result.vp.haupt.aktion)).toBe(true);
    expect(result.vp.haupt.aktion).toHaveLength(2);
    expect(result.vp.haupt.aktion[0].klasse).toBe("10a");
  });
});
