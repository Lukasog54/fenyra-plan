import { Stundenplan24Adapter } from "../../../src/data/adapters/stundenplan24/adapter";
import { savePassword } from "../../../src/data/security/secureCredentials";
import type { DataSourceConfig } from "../../../src/data/models/SchoolDataSource";

const UNCONFIGURED: DataSourceConfig = { id: "stundenplan24", displayName: "Stundenplan24", kind: "stundenplan24" };

const CONFIGURED: DataSourceConfig = {
  id: "stundenplan24",
  displayName: "Stundenplan24",
  kind: "stundenplan24",
  stundenplan24: {
    baseUrl: "https://www.stundenplan24.de",
    schoolId: "12345678",
    username: "schueler",
    credentialRef: "stundenplan24_password_stundenplan24",
  },
};

function mockFetchOnce(status: number, body = ""): jest.Mock {
  const mockFetch = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, text: async () => body });
  (global as any).fetch = mockFetch;
  return mockFetch;
}

describe("Stundenplan24Adapter.testConnection", () => {
  it("reports not-configured without making a network request", async () => {
    const fetchSpy = jest.fn();
    (global as any).fetch = fetchSpy;
    const adapter = new Stundenplan24Adapter(UNCONFIGURED);

    const result = await adapter.testConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Server-URL\/Schulnummer/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requests <baseUrl>/<schulnummer>/mobil/ with a Basic Auth header built from the stored password", async () => {
    await savePassword("stundenplan24", "geheim123");
    const mockFetch = mockFetchOnce(200);
    const adapter = new Stundenplan24Adapter(CONFIGURED);

    const result = await adapter.testConnection();

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
    await savePassword("stundenplan24", "falsch");
    mockFetchOnce(401);
    const adapter = new Stundenplan24Adapter(CONFIGURED);

    const result = await adapter.testConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Anmeldung fehlgeschlagen/);
  });

  it("maps a network failure (fetch throws) to a connection-failed message", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("Network request failed"));
    const adapter = new Stundenplan24Adapter(CONFIGURED);

    const result = await adapter.testConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Verbindung fehlgeschlagen/);
  });
});

describe("Stundenplan24Adapter.fetchLessons", () => {
  it("throws a clear error instead of guessing when not configured", async () => {
    const adapter = new Stundenplan24Adapter(UNCONFIGURED);
    await expect(adapter.fetchLessons({ from: "2026-08-19", to: "2026-08-19" })).rejects.toThrow(/nicht konfiguriert/);
  });

  it("requests the exact PlanKl<YYYYMMDD>.xml mobil path for each requested date", async () => {
    const mockFetch = jest
      .fn()
      // mobil succeeds with an empty-but-valid document, vplan fails (treated as "no substitution list published")
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          '<VpMobil><Kopf><datei>PlanKl20260819.xml</datei></Kopf><Klassen><Kl><Kurz>10a</Kurz><Pl><Std><St>1</St></Std></Pl></Kl></Klassen></VpMobil>',
      });
    (global as any).fetch = mockFetch;
    const adapter = new Stundenplan24Adapter(CONFIGURED);

    await adapter.fetchLessons({ from: "2026-08-19", to: "2026-08-19" });

    const requestedUrls = mockFetch.mock.calls.map((call) => call[0]);
    expect(requestedUrls).toContain("https://www.stundenplan24.de/12345678/mobil/mobdaten/PlanKl20260819.xml");
    expect(requestedUrls).toContain("https://www.stundenplan24.de/12345678/vplan/vdaten/VplanKl20260819.xml");
  });

  // Verified against the real source (curl, no fabricated behavior): an unpublished day
  // (weekend/holiday) and a wrong Schulnummer/expired auth both come back as the identical
  // plain HTTP 404, so this can only be told apart at the whole-range level, not per day.
  it("throws when every day in the range fails, instead of silently succeeding with zero lessons (e.g. wrong Schulnummer)", async () => {
    mockFetchOnce(404, "<html>Stundenplan24 - Seite nicht gefunden</html>");
    const adapter = new Stundenplan24Adapter(CONFIGURED);

    await expect(adapter.fetchLessons({ from: "2026-08-19", to: "2026-08-21" })).rejects.toThrow(
      /kein Stundenplan abgerufen werden/
    );
  });

  it("does not throw when only some days in the range have no published plan (normal weekend/holiday gaps)", async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
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
    (global as any).fetch = mockFetch;
    const adapter = new Stundenplan24Adapter(CONFIGURED);

    const result = await adapter.fetchLessons({ from: "2026-08-19", to: "2026-08-20" });

    expect(result.lessons.length).toBeGreaterThan(0);
    expect(result.syncMeta.lastSyncStatus).toBe("success");
  });

  // Confirmed against the real source (curl): mobil's <Kopf><zeitstempel> and vplan's
  // <kopf><schulname> are both genuinely provided fields, previously parsed but never
  // extracted anywhere - see docs/stundenplan24-investigation.md.
  it("extracts schoolName (vplan <schulname>) and sourceGeneratedAt (mobil <zeitstempel>) for today's file", async () => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const compact = iso.replace(/-/g, "");

    const mockFetch = jest.fn().mockImplementation((url: string) => {
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
    (global as any).fetch = mockFetch;
    const adapter = new Stundenplan24Adapter(CONFIGURED);

    const result = await adapter.fetchLessons({ from: iso, to: iso });

    expect(result.syncMeta.schoolName).toBe("Testschule");
    expect(result.syncMeta.sourceGeneratedAt).toBe("12.08.2026, 10:04");
  });
});
