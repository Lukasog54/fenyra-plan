import { NextResponse } from "next/server";
import { credentialsFromRequest } from "@/server/basicAuth";
import { fetchAvailableClasses } from "@/server/stundenplan24/client";
import { statusForClassifiedError } from "@/server/errors/ClassifiedError";
import { checkRateLimit, clientKeyFor } from "@/server/rateLimit";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  if (!checkRateLimit(clientKeyFor(request))) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte kurz warten." }, { status: 429 });
  }

  const { schoolId } = await params;
  const creds = credentialsFromRequest(request, schoolId);
  if (!creds) {
    return NextResponse.json({ error: "Zugangsdaten fehlen (Authorization: Basic <username:password>)." }, { status: 401 });
  }

  try {
    const classes = await fetchAvailableClasses(creds);
    return NextResponse.json({ classes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Klassenliste konnte nicht abgerufen werden.";
    return NextResponse.json({ error: message }, { status: statusForClassifiedError(error) });
  }
}
