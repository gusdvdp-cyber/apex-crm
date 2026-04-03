"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  Inbox, Users, KanbanSquare, BarChart3, Settings,
  ChevronUp, Zap, CalendarDays, Package, FileText,
  UserCheck, TrendingUp, BedDouble, UtensilsCrossed,
  Car, FolderOpen, HardHat, ShieldCheck, LogOut, User,
} from "lucide-react";
import { MODULE_DEFINITIONS } from "@/lib/modules";

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare: Inbox, Users, Kanban: KanbanSquare, BarChart2: BarChart3,
  CalendarDays, Package, FileText, UserCheck, TrendingUp,
  BedDouble, UtensilsCrossed, Car, FolderOpen, HardHat,
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  member: "Miembro",
};

interface SidebarProps {
  activeModuleKeys?: string[];
  isSuperAdmin?: boolean;
  userFullName?: string;
  userRole?: string;
}

const FALLBACK_KEYS = ["inbox", "contactos", "pipeline", "metricas"];

export default function Sidebar({
  activeModuleKeys,
  isSuperAdmin = false,
  userFullName = "Usuario",
  userRole = "member",
}: SidebarProps) {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const keys = activeModuleKeys ?? FALLBACK_KEYS;
  const activeModules = MODULE_DEFINITIONS.filter((m) => keys.includes(m.key));
  const initials = userFullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "220px", flexShrink: 0,
      background: "#080808", borderRight: "1px solid #161616",
      position: "relative",
    }}>

      {/* Logo */}
      <div style={{ padding: "24px 20px", borderBottom: "1px solid #161616" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", background: "var(--accent)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={13} color="#0a0a0a" strokeWidth={3} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "13px", color: "#f0f0f0", letterSpacing: "-0.3px" }}>
            Apex <span style={{ color: "var(--accent)" }}>CRM</span>
          </span>
        </div>
      </div>

      {/* Label */}
      <div style={{ padding: "20px 20px 8px" }}>
        <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#333" }}>
          Menú
        </span>
      </div>

      {/* Nav dinámico */}
      <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
        {activeModules.map((mod) => {
          const Icon = ICON_MAP[mod.icon] ?? Inbox;
          const isActive = pathname.startsWith(mod.route);
          return (
            <Link key={mod.key} href={mod.route}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "8px", textDecoration: "none", background: isActive ? "#1a1a1a" : "transparent", color: isActive ? "#f0f0f0" : "#444", borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent", fontSize: "12px", fontWeight: 500, transition: "all 0.1s ease" }}
              onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "#141414"; (e.currentTarget as HTMLElement).style.color = "#f0f0f0"; } }}
              onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#444"; } }}
            >
              <Icon size={15} strokeWidth={isActive ? 2.5 : 2} color={isActive ? "var(--accent)" : "inherit"} />
              <span style={{ flex: 1 }}>{mod.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid #161616", display: "flex", flexDirection: "column", gap: "4px" }}>

        {isSuperAdmin && (
          <Link href="/admin"
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "8px", textDecoration: "none", color: pathname.startsWith("/admin") ? "#f0f0f0" : "#444", background: pathname.startsWith("/admin") ? "#1a1a1a" : "transparent", borderLeft: pathname.startsWith("/admin") ? "2px solid var(--accent)" : "2px solid transparent", fontSize: "12px", fontWeight: 500, transition: "all 0.1s ease" }}
          >
            <ShieldCheck size={15} strokeWidth={2} />
            <span>Super Admin</span>
          </Link>
        )}

        <Link href="/settings"
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "8px", textDecoration: "none", color: "#444", fontSize: "12px", fontWeight: 500, transition: "all 0.1s ease" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#141414"; (e.currentTarget as HTMLElement).style.color = "#f0f0f0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#444"; }}
        >
          <Settings size={15} strokeWidth={2} />
          <span>Configuración</span>
        </Link>

        {/* User card — abre dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", background: "#111", border: `1px solid ${showDropdown ? "var(--accent)" : "#1e1e1e"}`, cursor: "pointer", transition: "border-color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"}
            onMouseLeave={(e) => { if (!showDropdown) (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}
          >
            <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "#0a0a0a", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#f0f0f0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userFullName}
              </p>
              <p style={{ fontSize: "9px", fontWeight: 600, color: "var(--accent)", margin: 0 }}>
                {ROLE_LABELS[userRole] ?? userRole}
              </p>
            </div>
            <ChevronUp size={11} color="#333" style={{ transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "#161616", border: "1px solid #1e1e1e", borderRadius: "10px", overflow: "hidden", zIndex: 50 }}>
              
              {/* Info */}
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #1e1e1e" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 2px" }}>{userFullName}</p>
                <p style={{ fontSize: "10px", color: "#444", margin: 0 }}>{ROLE_LABELS[userRole] ?? userRole}</p>
              </div>

              {/* Opciones */}
              <div style={{ padding: "6px" }}>
                <Link
                  href="/perfil"
                  onClick={() => setShowDropdown(false)}
                  style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px 10px", borderRadius: "7px", textDecoration: "none", color: "#888", fontSize: "12px", fontWeight: 500, transition: "all 0.1s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#f0f0f0"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#888"; }}
                >
                  <User size={13} /> Mi perfil
                </Link>

                {/* Logout — form POST */}
                <form action="/logout" method="POST">
                  <button type="submit"
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", padding: "8px 10px", borderRadius: "7px", background: "transparent", border: "none", color: "#ff4444", fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#ff444415"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <LogOut size={13} /> Cerrar sesión
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}