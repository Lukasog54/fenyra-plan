import * as SecureStore from "expo-secure-store";

/**
 * Passwords live only in the platform-backed secure store (Android Keystore
 * / iOS Keychain via expo-secure-store) - never in Zustand/AsyncStorage,
 * never in SQLite, never in a log line. `DataSourceConfig.credentialRef`
 * only ever holds this key, never the secret itself.
 *
 * Since the move to `BackendAdapter` (`src/data/adapters/backend/`), this
 * stores the actual Stundenplan24 password rather than a Fenyra-issued
 * token - the website (`web/`) is itself stateless and never stores
 * credentials server-side, so every request needs the password again to
 * build the same Basic-Auth header that used to go straight to Stundenplan24
 * (now sent to the website instead, which forwards it unchanged).
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
