/**
 * Session-Speicherung im Browser (`localStorage`) - pragmatische v1-Lösung. Da die Website nichts
 * serverseitig speichert (kein Token-Ausstellungs-Server mehr), muss hier das Stundenplan24-Passwort
 * selbst liegen, um es bei jedem Request erneut als Basic-Auth mitzuschicken - bewusster Trade-off
 * der zustandslosen Architektur, kein Klartext-Passwort im Backend mehr, dafür eins im Browser.
 */
const STORAGE_KEY = "fenyra.session";

export interface Session {
  schoolId: string;
  username: string;
  password: string;
  selectedClassName: string | null;
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function updateSession(partial: Partial<Session>): Session | null {
  const current = loadSession();
  if (!current) return null;
  const next: Session = { ...current, ...partial };
  saveSession(next);
  return next;
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
