import { NextResponse } from "next/server";
import { credentialsFromRequest } from "@/server/basicAuth";
import { testConnection } from "@/server/stundenplan24/client";
import { checkRateLimit, clientKeyFor } from "@/server/rateLimit";

/** Ersetzt das frühere Onboarding/Login: prüft Zugangsdaten live gegen Stundenplan24, speichert
 * nichts. Nutzt dieselbe Basic-Auth wie die Daten-Routen - der "Verbinden"-Button der App/Website
 * ruft das vor dem ersten Sync einmal auf, um Tippfehler früh zu erkennen. */
export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  if (!checkRateLimit(clientKeyFor(request))) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte kurz warten." }, { status: 429 });
  }

  const { schoolId } = await params;
  const creds = credentialsFromRequest(request, schoolId);
  if (!creds) {
    return NextResponse.json({ ok: false, message: "Zugangsdaten fehlen (Authorization: Basic <username:password>)." }, { status: 401 });
  }

  const result = await testConnection(creds);
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
