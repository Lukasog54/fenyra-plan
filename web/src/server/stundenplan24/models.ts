import { z } from "zod";

/**
 * Portiert 1:1 aus mobile/src/data/adapters/stundenplan24/models.ts. Zod-Shapes fuer die echten
 * Indiware "mobil"- und Vertretungsplan-XML-Formate, verifiziert gegen echte Schulen - siehe
 * mobile/docs/stundenplan24-investigation.md.
 */

const AttributedText = z.union([z.string(), z.record(z.string(), z.unknown())]).optional();

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
