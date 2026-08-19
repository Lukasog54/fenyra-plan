import * as SecureStore from "expo-secure-store";

/**
 * Passwords live only in the platform-backed secure store (Android Keystore
 * / iOS Keychain via expo-secure-store) - never in Zustand/AsyncStorage,
 * never in SQLite, never in a log line. `DataSourceConfig.credentialRef`
 * only ever holds this key, never the secret itself.
 */
export function credentialKeyFor(sourceId: string): string {
  return `stundenplan24_password_${sourceId}`;
}

export async function savePassword(sourceId: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(credentialKeyFor(sourceId), password);
}

export async function getPassword(sourceId: string): Promise<string | null> {
  return SecureStore.getItemAsync(credentialKeyFor(sourceId));
}

export async function deletePassword(sourceId: string): Promise<void> {
  await SecureStore.deleteItemAsync(credentialKeyFor(sourceId));
}
