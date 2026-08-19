import { XMLParser } from "fast-xml-parser";

/**
 * XML -> plain JS object only. No interpretation of field meaning happens
 * here. Attributes are kept (e.g. `LeAe="LeGeaendert"` change flags,
 * `ZeitVon`/`ZeitBis` on period times, `UeLe`/`UeFa`/`UeGr` on the
 * Unterricht lookup table) since the mapper needs them.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  isArray: (tagName) => ["Kl", "Std", "Ue", "Ku", "KlSt", "ft", "aktion", "klausur", "fussinfo"].includes(tagName),
});

export function parseVpMobilXml(xml: string): unknown {
  return parser.parse(xml);
}

export function parseVplanXml(xml: string): unknown {
  return parser.parse(xml);
}
