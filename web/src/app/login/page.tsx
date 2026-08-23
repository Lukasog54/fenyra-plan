"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import * as backend from "@/lib/backendClient";
import { saveSession, updateSession } from "@/lib/auth";

const USER_TYPES = [
  { id: "schueler", label: "Schüler" },
  { id: "lehrer", label: "Lehrer" },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "class">("credentials");

  const [schoolId, setSchoolId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classes, setClasses] = useState<string[]>([]);
  const [manualClass, setManualClass] = useState("");

  const canSubmitCredentials = schoolId.trim().length > 0 && username.trim().length > 0 && password.length > 0;

  async function handleConnect() {
    if (!canSubmitCredentials || connecting) return;
    setConnecting(true);
    setError(null);

    const trimmedSchoolId = schoolId.trim();
    const result = await backend.testConnection(trimmedSchoolId, username, password);

    if (!result.ok || !result.data?.ok) {
      setError(result.data?.message ?? result.error ?? "Verbindung fehlgeschlagen.");
      setConnecting(false);
      return;
    }

    saveSession({ schoolId: trimmedSchoolId, username, password, selectedClassName: null });

    const classesResult = await backend.fetchClasses(trimmedSchoolId, username, password);
    setClasses(classesResult.ok && classesResult.data ? classesResult.data.classes : []);
    setConnecting(false);
    setStep("class");
  }

  function handleSelectClass(className: string) {
    const trimmed = className.trim();
    if (!trimmed) return;
    updateSession({ selectedClassName: trimmed });
    router.replace("/heute");
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="login-hero-inner">
          <div style={{ color: "var(--color-accent)", fontWeight: 800, letterSpacing: 4, fontSize: 15, marginBottom: "var(--space-lg)" }}>
            FENYRA PLAN
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15, marginBottom: "var(--space-lg)" }}>
            Dein Stundenplan,
            <br />
            auch am Rechner.
          </h1>
          <p style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1.6, maxWidth: 400 }}>
            Dieselben Stundenplan- und Vertretungsdaten wie in der App - live von Stundenplan24, ohne
            Zwischenspeicherung. Einmal anmelden, danach reicht die Klassenauswahl.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div style={{ width: "100%", maxWidth: 380 }}>
          {step === "credentials" ? (
            <>
              <h2 style={headingStyle}>Schule einrichten</h2>

              <label style={labelStyle}>Schulnummer</label>
              <input
                style={inputStyle}
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                placeholder="8-stellig, z. B. 12345678"
                inputMode="numeric"
                autoComplete="off"
              />

              <label style={labelStyle}>Benutzer</label>
              <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
                {USER_TYPES.map((type) => {
                  const isSelected = username === type.id;
                  return (
                    <button key={type.id} onClick={() => setUsername(type.id)} style={chipStyle(isSelected)} type="button">
                      {type.label}
                    </button>
                  );
                })}
              </div>
              <input
                style={inputStyle}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="oder eigener Benutzername"
                autoComplete="off"
              />

              <label style={labelStyle}>Passwort</label>
              <input
                style={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort"
                type="password"
                autoComplete="off"
              />
              <p style={hintStyle}>
                Für die öffentliche Testschule (Schulnummer 10000000) reicht ein beliebiger Wert - Stundenplan24 prüft
                dort kein Passwort, das Feld muss aber trotzdem ausgefüllt sein.
              </p>

              <button onClick={handleConnect} disabled={!canSubmitCredentials || connecting} style={buttonStyle(!canSubmitCredentials || connecting)}>
                {connecting ? "Verbinde…" : "Verbinden"}
              </button>

              {error ? <p style={errorStyle}>{error}</p> : null}
            </>
          ) : (
            <>
              <h2 style={headingStyle}>Klasse wählen</h2>
              <p style={hintStyle}>Gemeinsamer Schul-Login, jede Person wählt danach ihre eigene Klasse.</p>

              {classes.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
                  {classes.map((className) => (
                    <button key={className} onClick={() => handleSelectClass(className)} style={chipStyle(false)} type="button">
                      {className}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={hintStyle}>Keine Klassenliste vom Server erhalten - Klasse unten manuell eingeben.</p>
              )}

              <label style={labelStyle}>Oder manuell</label>
              <input
                style={inputStyle}
                value={manualClass}
                onChange={(e) => setManualClass(e.target.value)}
                placeholder="z. B. 10a"
                autoComplete="off"
              />
              <button onClick={() => handleSelectClass(manualClass)} disabled={!manualClass.trim()} style={buttonStyle(!manualClass.trim())}>
                Übernehmen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const headingStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: -0.3,
  marginBottom: "var(--space-lg)",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  color: "var(--color-text-secondary)",
  marginBottom: "var(--space-xs)",
  marginTop: "var(--space-md)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-text)",
  marginBottom: "var(--space-sm)",
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--color-muted)",
  marginTop: "var(--space-xs)",
  marginBottom: "var(--space-md)",
};

const errorStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--color-danger)",
  marginTop: "var(--space-sm)",
};

function buttonStyle(disabled: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "12px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: disabled ? "var(--color-border)" : "var(--color-accent)",
    color: disabled ? "var(--color-text-secondary)" : "var(--color-accent-text)",
    fontWeight: 700,
    marginTop: "var(--space-md)",
  };
}

function chipStyle(active: boolean): CSSProperties {
  return {
    border: `1.5px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-pill)",
    padding: "8px 14px",
    background: active ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
    fontWeight: 600,
    fontSize: 14,
  };
}
