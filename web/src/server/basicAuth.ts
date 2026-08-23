import type { SchoolCredentials } from "./stundenplan24/client";
import { config } from "./config";

/**
 * Liest `Authorization: Basic base64(username:password)` aus einem Request - dieselbe Basic-Auth,
 * die Stundenplan24 selbst erwartet (siehe stundenplan24/client.ts), hier nur einmal am Rand der
 * Website entgegengenommen und unverändert weitergereicht. Nichts davon wird gespeichert; jeder
 * Request bringt seine eigenen Zugangsdaten mit.
 */
export function credentialsFromRequest(request: Request, schoolId: string): SchoolCredentials | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return null;

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  if (!username || !password) return null;

  return { baseUrl: config.stundenplan24BaseUrl, schoolId, username, password };
}
