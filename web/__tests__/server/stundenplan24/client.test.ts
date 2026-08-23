import { describe, it, expect, vi } from "vitest";
import { fetchLessons, testConnection } from "../../../src/server/stundenplan24/client";
import { ClassifiedError } from "../../../src/server/errors/ClassifiedError";

const CREDS = {
  baseUrl: "https://www.stundenplan24.de",
  schoolId: "12345678",
  username: "schueler",
  password: "geheim123",
};

function mockFetchOnce(status: number, body = ""): ReturnType<typeof vi.fn> {
  const mockFetch = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, text: async () => body });
  (globalThis as any).fetch = mockFetch;
  return mockFetch;
}

describe("testConnection", () => {
  it("requests <baseUrl>/<schulnummer>/mobil/ with a Basic Auth header built from the given credentials", async () => {
    const mockFetch = mockFetchOnce(200);

    const result = await testConnection(CREDS);

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://www.stundenplan24.de/12345678/mobil/");
    const authHeader = init.headers.Authorization as string;
    expect(authHeader).toMatch(/^Basic /);
    const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString("utf-8");
    expect(decoded).toBe("schueler:geheim123");
  });

  it("maps HTTP 401 to an authentication-failed message, not a generic error", async () => {
    mockFetchOnce(401);

    const result = await testConnection(CREDS);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Anmeldung fehlgeschlagen/);
  });

  it("maps a network failure (fetch throws) to a connection-failed message", async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("Network request failed"));

    const result = await testConnection(CREDS);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Verbindung fehlgeschlagen/);
  });
});

describe("fetchLessons", () => {
  it("requests the exact PlanKl<YYYYMMDD>.xml mobil path for each requested date", async () => {
    const mockFetch = vi
      .fn()
      // mobil succeeds with an empty-but-valid document, vplan fails (treated as "no substitution list published")
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          '<VpMobil><Kopf><datei>PlanKl20260819.xml</datei></Kopf><Klassen><Kl><Kurz>10a</Kurz><Pl><Std><St>1</St></Std></Pl></Kl></Klassen></VpMobil>',
      });
    (globalThis as any).fetch = mockFetch;

    await fetchLessons(CREDS, { from: "2026-08-19", to: "2026-08-19" });

    const requestedUrls = mockFetch.mock.calls.map((call) => call[0]);
    expect(requestedUrls).toContain("https://www.stundenplan24.de/12345678/mobil/mobdaten/PlanKl20260819.xml");
    expect(requestedUrls).toContain("https://www.stundenplan24.de/12345678/vplan/vdaten/VplanKl20260819.xml");
  });

  // Verified against the real source (curl, no fabricated behavior): an unpublished day
  // (weekend/holiday) and a wrong Schulnummer/expired auth both come back as the identical
  // plain HTTP 404, so this can only be told apart at the whole-range level, not per day.
  it("throws when every day in the range fails, instead of silently succeeding with zero lessons (e.g. wrong Schulnummer)", async () => {
    mockFetchOnce(404, "<html>Stundenplan24 - Seite nicht gefunden</html>");

    await expect(fetchLessons(CREDS, { from: "2026-08-19", to: "2026-08-21" })).rejects.toThrow(/kein Stundenplan abgerufen werden/);
  });

  it("classifies an all-days network failure as NETWORK_ERROR (fetch itself throws, not an HTTP-status response)", async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("Network request failed"));

    const error = await fetchLessons(CREDS, { from: "2026-08-19", to: "2026-08-21" }).catch((e) => e);

    expect(error).toBeInstanceOf(ClassifiedError);
    expect((error as ClassifiedError).type).toBe("NETWORK_ERROR");
  });

  it("classifies an all-days HTTP 401 failure as AUTH_ERROR (server reachable, credentials rejected)", async () => {
    mockFetchOnce(401);

    const error = await fetchLessons(CREDS, { from: "2026-08-19", to: "2026-08-21" }).catch((e) => e);

    expect(error).toBeInstanceOf(ClassifiedError);
    expect((error as ClassifiedError).type).toBe("AUTH_ERROR");
  });

  // A wrong Schulnummer and a server outage (5xx) both surface as SOURCE_ERROR, not falsely as
  // NETWORK_ERROR or AUTH_ERROR - genuinely indistinguishable from a plain HTTP-status response
  // alone, so this asserts the honest fallback rather than fabricating a distinction the source
  // doesn't support.
  it("classifies an all-days HTTP 404 (e.g. wrong Schulnummer) as SOURCE_ERROR", async () => {
    mockFetchOnce(404, "<html>Stundenplan24 - Seite nicht gefunden</html>");

    const error = await fetchLessons(CREDS, { from: "2026-08-19", to: "2026-08-21" }).catch((e) => e);

    expect(error).toBeInstanceOf(ClassifiedError);
    expect((error as ClassifiedError).type).toBe("SOURCE_ERROR");
  });

  it("classifies an all-days HTTP 500 (server outage) as SOURCE_ERROR, not NETWORK_ERROR or AUTH_ERROR", async () => {
    mockFetchOnce(500);

    const error = await fetchLessons(CREDS, { from: "2026-08-19", to: "2026-08-21" }).catch((e) => e);

    expect(error).toBeInstanceOf(ClassifiedError);
    expect((error as ClassifiedError).type).toBe("SOURCE_ERROR");
  });

  it("does not throw when only some days in the range have no published plan (normal weekend/holiday gaps)", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("PlanKl20260819")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            '<VpMobil><Kopf><datei>PlanKl20260819.xml</datei></Kopf><Klassen><Kl><Kurz>10a</Kurz><Pl><Std><St>1</St></Std></Pl></Kl></Klassen></VpMobil>',
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: async () => "" });
    });
    (globalThis as any).fetch = mockFetch;

    const result = await fetchLessons(CREDS, { from: "2026-08-19", to: "2026-08-20" });

    expect(result.lessons.length).toBeGreaterThan(0);
  });

  // Confirmed against the real source (curl): mobil's <Kopf><zeitstempel> and vplan's
  // <kopf><schulname> are both genuinely provided fields.
  it("extracts schoolName (vplan <schulname>) and sourceGeneratedAt (mobil <zeitstempel>) for today's file", async () => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const compact = iso.replace(/-/g, "");

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes(`PlanKl${compact}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            `<VpMobil><Kopf><zeitstempel>12.08.2026, 10:04</zeitstempel><datei>PlanKl${compact}.xml</datei></Kopf><Klassen><Kl><Kurz>10a</Kurz><Pl><Std><St>1</St></Std></Pl></Kl></Klassen></VpMobil>`,
        });
      }
      if (url.includes(`VplanKl${compact}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => `<vp><kopf><schulname>Testschule</schulname></kopf><haupt></haupt></vp>`,
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: async () => "" });
    });
    (globalThis as any).fetch = mockFetch;

    const result = await fetchLessons(CREDS, { from: iso, to: iso });

    expect(result.schoolName).toBe("Testschule");
    expect(result.sourceGeneratedAt).toBe("12.08.2026, 10:04");
  });
});
