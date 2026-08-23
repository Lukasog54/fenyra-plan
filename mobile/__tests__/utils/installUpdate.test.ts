import { Platform } from "react-native";
import { downloadAndInstallApk } from "../../src/utils/installUpdate";

describe("downloadAndInstallApk", () => {
  it("rejects immediately on a non-Android platform, before touching the filesystem", async () => {
    Platform.OS = "ios";
    await expect(downloadAndInstallApk("https://example.com/app.apk")).rejects.toThrow(
      "In-app install is only supported on Android."
    );
  });
});
