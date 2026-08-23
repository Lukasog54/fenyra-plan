import type { Lesson } from "../../models/Lesson";
import { FENYRA_BACKEND_URL } from "../../constants";

/**
 * Schlanker fetch-Wrapper gegen die Fenyra-Website (`web/` im Repo-Root - enthält das Backend als
 * eigene, zustandslose API-Routes, siehe `web/README.md`). Die Website speichert nichts selbst -
 * jeder Call bringt die Stundenplan24-Zugangsdaten als `Authorization: Basic` mit (dieselbe
 * Basic-Auth, die Stundenplan24 selbst erwartet - die Website reicht sie nur unverändert weiter).
 */

interface BackendResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${base64Encode(`${username}:${password}`)}`;
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Basic-Auth-Zugangsdaten sind ASCII (schulseitig vergebene Benutzernamen/Passwörter), ein
 * minimaler Encoder reicht - RN kennt kein globales `btoa`. Portiert aus dem früheren
 * Stundenplan24Adapter (der dieselbe Basic-Auth direkt gegen Stundenplan24 gebaut hat). */
function base64Encode(input: string): string {
  if (typeof btoa === "function") return btoa(input);

  let result = "";
  let i = 0;
  for (; i + 2 < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = input.charCodeAt(i + 1);
    const c = input.charCodeAt(i + 2);
    result += BASE64_CHARS[a >> 2] + BASE64_CHARS[((a & 3) << 4) | (b >> 4)] + BASE64_CHARS[((b & 15) << 2) | (c >> 6)] + BASE64_CHARS[c & 63];
  }
  const remaining = input.length - i;
  if (remaining === 1) {
    const a = input.charCodeAt(i);
    result += BASE64_CHARS[a >> 2] + BASE64_CHARS[(a & 3) << 4] + "==";
  } else if (remaining === 2) {
    const a = input.charCodeAt(i);
    const b = input.charCodeAt(i + 1);
    result += BASE64_CHARS[a >> 2] + BASE64_CHARS[((a & 3) << 4) | (b >> 4)] + BASE64_CHARS[(b & 15) << 2] + "=";
  }
  return result;
}

async function request<T>(path: string, username: string, password: string): Promise<BackendResponse<T>> {
  try {
    const response = await fetch(`${FENYRA_BACKEND_URL}${path}`, {
      headers: { Authorization: basicAuthHeader(username, password) },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      return { ok: false, status: response.status, data: null, error: data?.error ?? `HTTP ${response.status}` };
    }
    return { ok: true, status: response.status, data: data as T };
  } catch {
    return { ok: false, status: 0, data: null, error: "Verbindung zum Fenyra-Server fehlgeschlagen." };
  }
}

export interface BackendConnectionTestResult {
  ok: boolean;
  message?: string;
  reachable?: boolean;
}

export function testConnection(schoolId: string, username: string, password: string): Promise<BackendResponse<BackendConnectionTestResult>> {
  return request<BackendConnectionTestResult>(`/api/schools/${schoolId}/test-connection`, username, password);
}

export function fetchClassesFromBackend(schoolId: string, username: string, password: string): Promise<BackendResponse<{ classes: string[] }>> {
  return request<{ classes: string[] }>(`/api/schools/${schoolId}/classes`, username, password);
}

export interface BackendLessonsResponse {
  lessons: Lesson[];
  schoolName: string | null;
  sourceGeneratedAt: string | null;
}

export function fetchLessonsFromBackend(
  schoolId: string,
  username: string,
  password: string,
  from: string,
  to: string,
  className?: string
): Promise<BackendResponse<BackendLessonsResponse>> {
  const query = new URLSearchParams({ from, to, ...(className ? { className } : {}) });
  return request<BackendLessonsResponse>(`/api/schools/${schoolId}/lessons?${query}`, username, password);
}
