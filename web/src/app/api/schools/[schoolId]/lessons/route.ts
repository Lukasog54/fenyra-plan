import { NextResponse } from "next/server";
import { z } from "zod";
import { credentialsFromRequest } from "@/server/basicAuth";
import { fetchLessons } from "@/server/stundenplan24/client";
import { statusForClassifiedError } from "@/server/errors/ClassifiedError";
import { checkRateLimit, clientKeyFor } from "@/server/rateLimit";

const RangeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from muss YYYY-MM-DD sein"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to muss YYYY-MM-DD sein"),
  className: z.string().optional(),
});

/** Zustandsloser Live-Proxy: ruft bei jedem Aufruf frisch bei Stundenplan24 ab, speichert nichts. */
export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  if (!checkRateLimit(clientKeyFor(request))) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte kurz warten." }, { status: 429 });
  }

  const { schoolId } = await params;
  const creds = credentialsFromRequest(request, schoolId);
  if (!creds) {
    return NextResponse.json({ error: "Zugangsdaten fehlen (Authorization: Basic <username:password>)." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = RangeQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "from und to (YYYY-MM-DD) sind erforderlich." }, { status: 400 });
  }
  const { from, to, className } = parsed.data;

  try {
    const result = await fetchLessons(creds, { from, to, className });
    return NextResponse.json({
      lessons: result.lessons,
      schoolName: result.schoolName ?? null,
      sourceGeneratedAt: result.sourceGeneratedAt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stundenplan konnte nicht abgerufen werden.";
    return NextResponse.json({ error: message }, { status: statusForClassifiedError(error) });
  }
}
