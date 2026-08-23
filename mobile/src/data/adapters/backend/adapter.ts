import type {
  ConnectionTestResult,
  SchoolDataSource,
  DataSourceConfig,
  FetchLessonsParams,
  FetchLessonsResult,
} from "../../models/SchoolDataSource";
import { getPassword } from "../../security/secureCredentials";
import { ClassifiedError } from "../../errors/ClassifiedError";
import { addDays } from "../../../utils/date";
import * as backendClient from "./BackendClient";

/**
 * Ersetzt den direkten Stundenplan24-Zugriff: die App spricht nur noch mit der Fenyra-Website
 * (`web/` im Repo-Root, enthält das Backend als eigene, zustandslose API-Routes). Implementiert
 * dasselbe `SchoolDataSource`-Interface wie zuvor `Stundenplan24Adapter` - der Rest der App
 * (SyncService, ChangeDetector, SQLite-Cache, alle Query-Hooks, alle UI-Screens) bleibt dadurch
 * unveraendert.
 *
 * Die Website speichert nichts serverseitig, daher bleibt hier - wie schon beim frueheren
 * `Stundenplan24Adapter` - das Stundenplan24-Passwort selbst in `secureCredentials.ts` (kein
 * Token-Tausch mehr): jeder Request baut daraus per-Call dieselbe Basic-Auth, die sonst direkt an
 * Stundenplan24 ginge, nur jetzt an die Website adressiert.
 */
export class BackendAdapter implements SchoolDataSource {
  constructor(public readonly config: DataSourceConfig) {}

  private isConfigured(): boolean {
    return Boolean(this.config.stundenplan24?.schoolId && this.config.stundenplan24?.username);
  }

  private async credentials(): Promise<{ schoolId: string; username: string; password: string } | null> {
    if (!this.isConfigured()) return null;
    // isConfigured() already guarantees username is a non-empty string here.
    const { schoolId, username } = this.config.stundenplan24! as { schoolId: string; username: string };
    const password = await getPassword(this.config.id);
    if (!password) return null;
    return { schoolId, username, password };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const creds = await this.credentials();
    if (!creds) {
      return { ok: false, message: "Keine Schulnummer/Benutzername/Passwort hinterlegt." };
    }

    const result = await backendClient.testConnection(creds.schoolId, creds.username, creds.password);
    if (!result.ok || !result.data) {
      return { ok: false, reachable: result.status !== 0, message: result.error ?? "Verbindung fehlgeschlagen." };
    }
    return result.data;
  }

  async fetchAvailableClasses(): Promise<string[]> {
    const creds = await this.credentials();
    if (!creds) return [];

    const result = await backendClient.fetchClassesFromBackend(creds.schoolId, creds.username, creds.password);
    if (!result.ok || !result.data) return [];
    return result.data.classes;
  }

  async fetchLessons(params: FetchLessonsParams): Promise<FetchLessonsResult> {
    const creds = await this.credentials();
    if (!creds) {
      throw new ClassifiedError(
        "SOURCE_ERROR",
        "Fenyra-Datenquelle ist nicht konfiguriert. Bitte Schulnummer und Zugangsdaten in den Einstellungen hinterlegen."
      );
    }

    const result = await backendClient.fetchLessonsFromBackend(
      creds.schoolId,
      creds.username,
      creds.password,
      params.from,
      params.to,
      params.className
    );
    if (!result.ok || !result.data) {
      const type = result.status === 401 ? "AUTH_ERROR" : result.status === 0 ? "NETWORK_ERROR" : "SOURCE_ERROR";
      throw new ClassifiedError(type, result.error ?? "Stundenplan konnte nicht vom Fenyra-Server abgerufen werden.");
    }

    // Die Website hat fuer den gesamten angefragten Bereich bereits selbst entschieden, welche Tage
    // real existieren (Wochenenden/Ferien liefern legitim keine Stunden) - anders als frueher der
    // On-Device-Adapter muss der Client hier keine einzelnen Tage mehr als "fehlgeschlagen"
    // behandeln, daher gilt der komplette angefragte Bereich als abgerufen.
    const datesFetched: string[] = [];
    let cursor = params.from;
    while (cursor <= params.to) {
      datesFetched.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return {
      lessons: result.data.lessons,
      syncMeta: {
        sourceId: this.config.id,
        lastSyncedAt: new Date().toISOString(),
        lastSyncStatus: "success",
        syncIntervalMinutes: 30,
        schoolName: result.data.schoolName ?? undefined,
        sourceGeneratedAt: result.data.sourceGeneratedAt ?? undefined,
      },
      datesFetched,
    };
  }
}
