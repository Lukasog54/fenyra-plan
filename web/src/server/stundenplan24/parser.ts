import { XMLParser } from "fast-xml-parser";

/** Portiert 1:1 aus mobile/src/data/adapters/stundenplan24/parser.ts. */
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
