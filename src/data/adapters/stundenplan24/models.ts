import { z } from "zod";

/**
 * Zod shapes for the real Indiware "mobil" and Vertretungsplan XML formats,
 * verified against Stundenplan24's own public example school (Schulnummer
 * 10000000, no login required) at https://www.stundenplan24.de/10000000/ -
 * see docs/stundenplan24-investigation.md for how this was confirmed and
 * what's still unverified (e.g. the exact cancellation convention). Mirrors
 * fast-xml-parser's output shape (see parser.ts): a text node with an XML
 * attribute becomes `{ "@_AttrName": ..., "#text": ... }`, a plain text
 * node with no attributes stays a plain string. `.passthrough()`
 * everywhere so unrecognized fields survive into `rawData`.
 */

const AttributedText = z.union([z.string(), z.record(z.string(), z.unknown())]).optional();

/**
 * A class with nothing scheduled that day (e.g. on a break) gets a
 * self-closing tag like `<Pl/>` or `<Unterricht/>`, which fast-xml-parser
 * turns into an empty string rather than an object - confirmed against a
 * real school's live feed, not the demo school (which never had an empty
 * one). Normalizes that to `{ [key]: [] }` before the object schema runs.
 */
function emptyTagToObject<T extends z.ZodTypeAny>(schema: T, key: string): z.ZodType<z.infer<T>> {
  return z.preprocess((val) => (typeof val === "string" || val === undefined || val === null ? { [key]: [] } : val), schema);
}

// ===== Indiware "mobil" feed: <baseUrl>/<schulnummer>/mobil/mobdaten/PlanKl<YYYYMMDD>.xml =====

export const RawStdSchema = z
  .object({
    St: z.union([z.string(), z.number()]),
    Beginn: z.string().optional(),
    Ende: z.string().optional(),
    Fa: AttributedText,
    Ku2: AttributedText,
    Le: AttributedText,
    Ra: AttributedText,
    Nr: z.union([z.string(), z.number()]).optional(),
    If: AttributedText,
  })
  .passthrough();

const RawKlStSchema = z
  .object({
    "@_ZeitVon": z.string().optional(),
    "@_ZeitBis": z.string().optional(),
    "#text": z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const RawUeNrSchema = z
  .object({
    "@_UeLe": z.string().optional(),
    "@_UeFa": z.string().optional(),
    "@_UeGr": z.string().optional(),
    "#text": z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const RawKlSchema = z
  .object({
    Kurz: z.string(),
    KlStunden: emptyTagToObject(
      z.object({ KlSt: z.array(RawKlStSchema).optional() }).passthrough(),
      "KlSt"
    ).optional(),
    Unterricht: emptyTagToObject(
      z
        .object({ Ue: z.array(z.object({ UeNr: RawUeNrSchema }).passthrough()).optional() })
        .passthrough(),
      "Ue"
    ).optional(),
    Pl: emptyTagToObject(z.object({ Std: z.array(RawStdSchema) }).passthrough(), "Std"),
  })
  .passthrough();

export const RawMobilKopfSchema = z
  .object({
    planart: z.string().optional(),
    zeitstempel: z.string().optional(),
    DatumPlan: z.string().optional(),
    datei: z.string().optional(),
    schulnummer: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const RawMobilDocumentSchema = z
  .object({
    VpMobil: z
      .object({
        Kopf: RawMobilKopfSchema,
        Klassen: z.object({ Kl: z.array(RawKlSchema) }).passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

// ===== Vertretungsplan feed: <baseUrl>/<schulnummer>/vplan/vdaten/VplanKl<YYYYMMDD>.xml =====

export const RawAktionSchema = z
  .object({
    klasse: z.string(),
    stunde: z.union([z.string(), z.number()]),
    fach: AttributedText,
    lehrer: AttributedText,
    raum: AttributedText,
    info: z.string().optional(),
  })
  .passthrough();

/**
 * Same self-closing-tag issue as emptyTagToObject above, for object schemas with no natural
 * array field to seed (e.g. `<kopfinfo/>` on a day with nothing to report) - normalizes the
 * empty string fast-xml-parser produces to `{}` instead, which every field here already
 * tolerates via `.optional()`.
 */
function emptyTagToEmptyObject<T extends z.ZodTypeAny>(schema: T): z.ZodType<z.infer<T>> {
  return z.preprocess((val) => (typeof val === "string" || val === undefined || val === null ? {} : val), schema);
}

export const RawVplanKopfSchema = z
  .object({
    datei: z.string().optional(),
    titel: z.string().optional(),
    schulname: z.string().optional(),
    datum: z.string().optional(),
    kopfinfo: emptyTagToEmptyObject(
      z
        .object({
          aenderungl: z.string().optional(),
          aenderungk: z.string().optional(),
        })
        .passthrough()
    ).optional(),
  })
  .passthrough();

export const RawVplanDocumentSchema = z
  .object({
    vp: z
      .object({
        kopf: RawVplanKopfSchema,
        // A day with zero Vertretungen has an empty <haupt/> - same self-closing-tag issue as
        // <Pl/>/<Unterricht/>/<KlStunden/> on the mobil side (see emptyTagToObject above),
        // confirmed to actually happen via a live parser/validator round-trip test, not assumed.
        haupt: emptyTagToObject(z.object({ aktion: z.array(RawAktionSchema).optional() }).passthrough(), "aktion").optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type RawStd = z.infer<typeof RawStdSchema>;
export type RawKl = z.infer<typeof RawKlSchema>;
export type RawMobilDocument = z.infer<typeof RawMobilDocumentSchema>;
export type RawAktion = z.infer<typeof RawAktionSchema>;
export type RawVplanDocument = z.infer<typeof RawVplanDocumentSchema>;
