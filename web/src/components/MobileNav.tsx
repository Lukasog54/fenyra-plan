"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@/lib/auth";
import { IconHeute, IconPlan, IconVertretungen } from "./icons";

const TABS = [
  { href: "/heute", label: "Heute", Icon: IconHeute },
  { href: "/plan", label: "Plan", Icon: IconPlan },
  { href: "/vertretungen", label: "Vertretungen", Icon: IconVertretungen },
];

/**
 * Eigenstaendiges Mobile-Layout statt einer umgeflossenen Sidebar - obere Leiste mit Branding und
 * Abmelden, untere Tab-Leiste mit Icons (daumenerreichbar, wie in der nativen App). Nur < 860px
 * sichtbar (siehe globals.css), Desktop nutzt stattdessen Sidebar.tsx.
 */
export function MobileTopBar({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <header className="mobile-topbar">
      <div>
        <span className="mobile-topbar-brand">FENYRA</span>
        <span style={{ color: "var(--color-text-secondary)", fontSize: 12, marginLeft: 8 }}>{session.selectedClassName}</span>
      </div>
      <button onClick={onLogout} className="logout-button">
        Abmelden
      </button>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="mobile-tabbar">
      <div className="mobile-tabbar-inner">
        {TABS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`mobile-tab${pathname === href ? " is-active" : ""}`}>
            <Icon />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
