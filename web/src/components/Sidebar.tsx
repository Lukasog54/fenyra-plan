"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@/lib/auth";

const LINKS = [
  { href: "/heute", label: "Heute" },
  { href: "/plan", label: "Plan" },
  { href: "/vertretungen", label: "Vertretungen" },
];

export function Sidebar({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">FENYRA</div>
        <div className="sidebar-brand-sub">Plan</div>
      </div>

      <nav className="sidebar-nav">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={`sidebar-link${pathname === link.href ? " is-active" : ""}`}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-class">
          Klasse <strong>{session.selectedClassName}</strong>
        </div>
        <button onClick={onLogout} className="logout-button">
          Abmelden
        </button>
      </div>
    </aside>
  );
}
