"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loadSession, clearSession, type Session } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileTopBar, MobileTabBar } from "@/components/MobileNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const current = loadSession();
    if (!current?.password || !current.selectedClassName) {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  if (session === undefined) {
    return <div style={{ padding: "var(--space-xl)", color: "var(--color-text-secondary)" }}>Lädt…</div>;
  }
  if (!session) return null;

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      <Sidebar session={session} onLogout={handleLogout} />
      <MobileTopBar session={session} onLogout={handleLogout} />
      <main className="main-content">{children}</main>
      <MobileTabBar />
    </div>
  );
}
