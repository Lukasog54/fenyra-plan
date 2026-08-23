# Fenyra Web

Next.js-Website für Fenyra Plan - **enthält das komplette Backend** (Stundenplan24-Zugriff) als eigene
API-Routes, kein separater Server nötig. Die Mobile-App (`../mobile/`) greift nur noch auf diese
Website zurück, genau wie die Website selbst.

**Zustandslos:** Die Website speichert nichts - keine Datenbank, kein Cache, keine Zugangsdaten. Jeder
API-Call ruft live bei Stundenplan24 ab, parst die Antwort und gibt sie als JSON zurück. Das hält die
Website simpel (kein Master-Key, keine Migration, kein persistenter Speicher nötig) und macht sie zu
einem generischen Stundenplan24-JSON-Proxy, den auch künftige, andere Systeme nutzen können - nicht
nur App und Website.

## Architektur

- `src/server/stundenplan24/` - die eigentliche Stundenplan24-Logik (Fetch, XML-Parsing, Mapping),
  läuft serverseitig bei jedem API-Call neu. Reines Server-Modul, nie ins Browser-Bundle gezogen.
- `src/server/basicAuth.ts` - liest `Authorization: Basic <username:password>` aus einem Request und
  reicht die Zugangsdaten unverändert an Stundenplan24 weiter (dieselbe Basic-Auth, die Stundenplan24
  selbst erwartet) - nichts davon wird je gespeichert.
- `src/app/api/schools/[schoolId]/` - Route-Handler: `GET .../test-connection` (Zugangsdaten live
  prüfen), `GET .../classes`, `GET .../lessons?from&to&className` - alle Basic-Auth-geschützt.
- `src/lib/backendClient.ts` - fetch-Wrapper der Website selbst gegen ihre eigenen `/api/...`-Routes
  (relative Pfade, gleiche Origin).
- `src/lib/auth.ts` - Session (Schulnummer, Benutzername, **Passwort**, gewählte Klasse) in
  `localStorage` - bewusster Trade-off der zustandslosen Architektur: kein Klartext-Passwort mehr im
  Backend, dafür eins im Browser (pragmatische v1-Lösung).
- `src/app/login/` - Zugangsdaten-Check (`test-connection`) → Klassenwahl, in einem Rutsch (kein
  separates Onboarding/Login mehr nötig, da nichts angelegt wird).
- `src/app/(dashboard)/` - Heute/Plan/Vertretungen, Client-seitig Auth-geschützt im Layout.
- Theme (in `globals.css` als CSS-Variablen) - portiert aus `../mobile/src/theme/`.

Die Mobile-App spricht dieselben `/api/...`-Routes über ihre eigene, andere Origin an (siehe
`FENYRA_BACKEND_URL` in `mobile/src/data/constants.ts`), ebenfalls per Basic Auth.

## Setup

```bash
cd web
npm install
npm run dev
```

Läuft danach auf `http://localhost:3000` - kein `.env` nötig, solange die Stundenplan24-Standard-URL
passt (siehe `.env.example` für die eine optionale Variable).

## Deployment

Vorlagen liegen in `deploy/` (beide mit ausführlichen Setup-Schritten als Kommentar):

- `deploy/fenyra-web.service.example` - systemd-Unit, hält `npm run start` dauerhaft am Laufen und
  startet nach einem Server-Neustart automatisch neu.
- `deploy/Caddyfile.example` - Reverse-Proxy mit automatischem HTTPS-Zertifikat (Let's Encrypt, kein
  manuelles certbot). Wichtig hier, weil echte Stundenplan24-Passwörter durch die Verbindung gehen.

Kurzfassung:

```bash
# einmalig auf dem VPS
git clone <dein-repo> && cd fenyra-plan/web
npm ci && npm run build
sudo cp deploy/fenyra-web.service.example /etc/systemd/system/fenyra-web.service
# WorkingDirectory/User darin anpassen, dann:
sudo systemctl daemon-reload && sudo systemctl enable --now fenyra-web

sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
# Domain darin anpassen, dann:
sudo systemctl reload caddy
```

Kein persistenter Speicher nötig (kein Datenbank-Volume) - läuft also auch auf rein ephemeren
Hosting-Plattformen, falls du keinen eigenen VPS willst. **Was du selbst ergänzen musst, weil es hier
keine echte Server-Umgebung gibt**: einen tatsächlichen VPS/Hosting-Account, eine Domain, die per
A/AAAA-Record darauf zeigt, und danach `FENYRA_BACKEND_URL` in `mobile/src/data/constants.ts` auf
diese Domain umstellen (aktuell `http://localhost:3000` als Dev-Default).
