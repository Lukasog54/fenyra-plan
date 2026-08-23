import type { Lesson } from "./types";

/**
 * fetch-Wrapper gegen die eigenen API-Routes dieser Website (`src/app/api/`, Server-Code in
 * `src/server/`) - Backend und Website sind ein Projekt, daher reichen relative Pfade (gleiche
 * Origin). Die API ist zustandslos: jeder Call bringt seine eigenen Stundenplan24-Zugangsdaten als
 * `Authorization: Basic` mit (siehe `basicAuthHeader`), die Website speichert nichts serverseitig.
 */
interface BackendResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export function basicAuthHeader(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<BackendResponse<T>> {
  try {
    const response = await fetch(path, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      return { ok: false, status: response.status, data: null, error: data?.error ?? `HTTP ${response.status}` };
    }
    return { ok: true, status: response.status, data: data as T };
  } catch {
    return { ok: false, status: 0, data: null, error: "Verbindung zur Website fehlgeschlagen." };
  }
}

export interface ConnectionTestResult {
  ok: boolean;
  message?: string;
  reachable?: boolean;
}

export function testConnection(schoolId: string, username: string, password: string): Promise<BackendResponse<ConnectionTestResult>> {
  return request<ConnectionTestResult>(`/api/schools/${schoolId}/test-connection`, {
    headers: { Authorization: basicAuthHeader(username, password) },
  });
}

export function fetchLessons(
  schoolId: string,
  username: string,
  password: string,
  from: string,
  to: string,
  className?: string
): Promise<BackendResponse<{ lessons: Lesson[]; schoolName: string | null; sourceGeneratedAt: string | null }>> {
  const query = new URLSearchParams({ from, to, ...(className ? { className } : {}) });
  return request(`/api/schools/${schoolId}/lessons?${query}`, {
    headers: { Authorization: basicAuthHeader(username, password) },
  });
}

export function fetchClasses(schoolId: string, username: string, password: string): Promise<BackendResponse<{ classes: string[] }>> {
  return request<{ classes: string[] }>(`/api/schools/${schoolId}/classes`, {
    headers: { Authorization: basicAuthHeader(username, password) },
  });
}
