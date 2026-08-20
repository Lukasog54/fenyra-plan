import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

/** Intent.FLAG_GRANT_READ_URI_PERMISSION, from the Android SDK - lets the installer read our content:// URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

/**
 * Downloads the APK inside the app and hands it straight to Android's package installer, instead
 * of opening the browser and waiting for the user to find + tap the download notification.
 *
 * Android still shows its own install-confirmation screen at the end - that single tap can't be
 * skipped by any app, it's an OS security requirement (an app silently installing another app
 * would otherwise be a huge malware vector). This just removes every step before that one.
 */
export async function downloadAndInstallApk(url: string, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("In-app install is only supported on Android.");
  }

  const destination = `${FileSystem.cacheDirectory}fenyra-plan-update.apk`;
  const downloadResumable = FileSystem.createDownloadResumable(url, destination, {}, onProgress);
  const result = await downloadResumable.downloadAsync();
  if (!result) {
    throw new Error("Download did not complete.");
  }

  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    type: "application/vnd.android.package-archive",
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
