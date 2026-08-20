import { checkForUpdate } from "../../../src/data/updates/UpdateCheck";

function mockFetchOnce(status: number, body: unknown): void {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("checkForUpdate", () => {
  it("reports available=true when the latest release is newer than the installed version", async () => {
    mockFetchOnce(200, {
      tag_name: "v1.2.0",
      body: "Neue Funktionen",
      html_url: "https://github.com/owner/repo/releases/tag/v1.2.0",
      assets: [{ name: "app.apk", browser_download_url: "https://github.com/owner/repo/releases/download/v1.2.0/app.apk" }],
    });

    const result = await checkForUpdate("owner/repo", "1.0.0");

    expect(result).not.toBeNull();
    expect(result!.available).toBe(true);
    expect(result!.latestVersion).toBe("1.2.0");
    expect(result!.downloadUrl).toBe("https://github.com/owner/repo/releases/download/v1.2.0/app.apk");
  });

  it("reports available=false when already on the latest version", async () => {
    mockFetchOnce(200, { tag_name: "v1.0.0", body: "", html_url: "https://x", assets: [] });

    const result = await checkForUpdate("owner/repo", "1.0.0");

    expect(result!.available).toBe(false);
  });

  it("reports available=false when the installed version is newer (e.g. a pre-release build)", async () => {
    mockFetchOnce(200, { tag_name: "v1.0.0", body: "", html_url: "https://x", assets: [] });

    const result = await checkForUpdate("owner/repo", "1.1.0");

    expect(result!.available).toBe(false);
  });

  it("falls back to the release page when no .apk asset is attached", async () => {
    mockFetchOnce(200, { tag_name: "v2.0.0", body: "", html_url: "https://github.com/owner/repo/releases/tag/v2.0.0", assets: [] });

    const result = await checkForUpdate("owner/repo", "1.0.0");

    expect(result!.downloadUrl).toBeNull();
    expect(result!.htmlUrl).toBe("https://github.com/owner/repo/releases/tag/v2.0.0");
  });

  it("returns null (not a fabricated 'up to date') when the repo has no releases yet", async () => {
    mockFetchOnce(404, {});

    const result = await checkForUpdate("owner/repo-with-no-releases", "1.0.0");

    expect(result).toBeNull();
  });

  it("returns null when the network request fails outright", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("network down"));

    const result = await checkForUpdate("owner/repo", "1.0.0");

    expect(result).toBeNull();
  });
});
