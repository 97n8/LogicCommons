import React from "react";
import {
  Home,
  BookOpen,
  Globe,
  Briefcase,
  LayoutGrid,
  Settings,
  LogOut,
  Search,
  Send,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// ── Config & Colors (dark theme to match your existing app) ────────────────
const SIDEBAR_WIDTH = "228px";

const COLORS = {
  bg: "#09090b",
  panel: "#18181b",
  border: "#27272a",
  borderStrong: "#3f3f46",
  text: "#f4f4f5",
  sub: "#a1a1aa",
  muted: "#71717a",
  green: "#10b981",
  greenMid: "#34d399",
  greenLight: "#052e16",
  greenPale: "#0a2a1f",
  amber: "#fbbf24",
  amberBg: "#3a2f1f",
} as const;

// ── Component ─────────────────────────────────────────────────────────────
export function LogicCommonsOS() {
  return (
    <div
      style={{
        background: COLORS.bg,
        color: COLORS.text,
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: "14px",
      }}
    >
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
        <aside
          style={{
            width: SIDEBAR_WIDTH,
            background: "#18181b",
            borderRight: `1px solid ${COLORS.border}`,
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            boxShadow: "1px 0 0 #27272a",
            zIndex: 30,
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              padding: "20px 18px 18px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                background: `linear-gradient(135deg, ${COLORS.greenMid}, ${COLORS.green})`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "system-ui", fontWeight: 600, fontSize: "13.5px", letterSpacing: "-0.01em" }}>
                LogicCommons OS
              </div>
              <div style={{ fontSize: "10.5px", color: COLORS.muted, marginTop: "1px" }}>
                PublicLogic LLC
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav
            style={{
              flex: 1,
              padding: "8px 10px 8px",
              display: "flex",
              flexDirection: "column",
              gap: "1px",
            }}
          >
            <div style={{ fontSize: "9.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.muted, fontWeight: 600, padding: "16px 18px 6px" }}>
              Navigation
            </div>

            {/* Home (active) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                padding: "8px 10px",
                borderRadius: "7px",
                fontSize: "13px",
                color: COLORS.green,
                background: COLORS.greenLight,
                fontWeight: 500,
                cursor: "default",
              }}
            >
              <Home size={15} />
              Home
            </div>

            {/* Other nav items */}
            {[
              { icon: BookOpen, label: "Library", href: "#" },
              { icon: Globe, label: "Environments", href: "#" },
              { icon: Briefcase, label: "CaseSpace", href: "#" },
              { icon: Settings, label: "Settings", href: "#" },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "8px 10px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  color: COLORS.sub,
                  textDecoration: "none",
                  transition: "all 0.12s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = COLORS.bg;
                  e.currentTarget.style.color = COLORS.text;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = COLORS.sub;
                }}
              >
                <item.icon size={15} />
                {item.label}
              </a>
            ))}

            <div style={{ height: "1px", background: COLORS.border, margin: "8px 10px" }} />
          </nav>

          {/* Sidebar Footer */}
          <div
            style={{
              padding: "14px 18px 18px",
              borderTop: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                padding: "9px 11px",
                background: COLORS.panel,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "8px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLORS.greenLight}, ${COLORS.greenMid})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  color: COLORS.green,
                  fontSize: "11px",
                }}
              >
                NB
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Nathan
                </div>
                <div style={{ fontSize: "10.5px", color: COLORS.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  nathan@publiclogic.org
                </div>
              </div>
            </div>

            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                fontSize: "12px",
                color: COLORS.sub,
                background: "none",
                border: `1px solid ${COLORS.border}`,
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: "pointer",
                width: "100%",
                transition: "all 0.12s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#18181b";
                e.currentTarget.style.color = COLORS.text;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = COLORS.sub;
              }}
            >
              <LogOut size={12} />
              Log out
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
        <div style={{ marginLeft: SIDEBAR_WIDTH, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          {/* Topbar */}
          <div
            style={{
              background: "rgba(24,24,27,0.95)",
              backdropFilter: "blur(12px)",
              borderBottom: `1px solid ${COLORS.border}`,
              padding: "0 36px",
              height: "54px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "sticky",
              top: 0,
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, fontWeight: 600 }}>
              <LayoutGrid size={13} />
              Entry Portal
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.panel,
                  borderRadius: "8px",
                  padding: "7px 15px",
                  cursor: "pointer",
                  color: COLORS.sub,
                  transition: "all 0.12s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = COLORS.bg;
                  e.currentTarget.style.color = COLORS.text;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = COLORS.panel;
                  e.currentTarget.style.color = COLORS.sub;
                }}
              >
                <Search size={13} />
                Search
              </button>

              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${COLORS.greenMid}, ${COLORS.green})`,
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "7px 16px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.28), 0 1px 2px rgba(0,0,0,0.08)",
                  transition: "all 0.15s",
                }}
                onClick={() => alert("🚀 Launching PuddleJumper (demo)")}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(16,185,129,0.35), 0 1px 3px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(16,185,129,0.28), 0 1px 2px rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Send size={14} />
                Launch PuddleJumper
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div style={{ padding: "48px 40px 40px", flex: 1, maxWidth: "1100px" }}>
            {/* Hero */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px", gap: "24px" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "10.5px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: COLORS.green,
                    fontWeight: 600,
                    background: COLORS.greenPale,
                    border: `1px solid ${COLORS.greenLight}`,
                    borderRadius: "100px",
                    padding: "4px 10px",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.greenMid }} />
                  LogicCommons OS · Entry Portal
                </div>

                <h1
                  style={{
                    fontSize: "clamp(2rem, 3.2vw, 2.7rem)",
                    fontWeight: 700,
                    lineHeight: 1.1,
                    letterSpacing: "-0.025em",
                    marginBottom: "12px",
                  }}
                >
                  Good morning, <span style={{ color: COLORS.sub, fontWeight: 300 }}>Nathan.</span><br />
                  Where are we working today?
                </h1>

                <p style={{ fontSize: "14px", color: COLORS.sub, lineHeight: 1.7, maxWidth: "480px" }}>
                  Select your entry point below. Access is role-governed — every action is recordable, transferable, and defensible.
                </p>
              </div>

              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "10px", paddingTop: "6px" }}>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    color: COLORS.sub,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.panel,
                    borderRadius: "8px",
                    padding: "8px 14px",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = COLORS.borderStrong;
                    e.currentTarget.style.background = COLORS.bg;
                    e.currentTarget.style.color = COLORS.text;
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.sub} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                  Connect Microsoft 365
                </button>

                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    color: "#fff",
                    background: COLORS.green,
                    border: `1px solid ${COLORS.green}`,
                    borderRadius: "8px",
                    padding: "8px 14px",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#34d399"}
                  onMouseOut={(e) => e.currentTarget.style.background = COLORS.green}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open SharePoint
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              {/* Library Card */}
              <a
                href="#"
                style={{
                  background: COLORS.panel,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "14px",
                  padding: "26px",
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.18s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = COLORS.borderStrong;
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "9.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.muted, fontWeight: 600, marginBottom: "18px" }}>
                  01 — Library
                </div>
                <div style={{ width: "44px", height: "44px", borderRadius: "11px", background: COLORS.greenLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
                  <BookOpen size={21} style={{ color: COLORS.green }} />
                </div>
                <div style={{ fontSize: "15.5px", fontWeight: 600, letterSpacing: "-0.01em", marginBottom: "9px" }}>
                  LogicCommons Library
                </div>
                <div style={{ fontSize: "12.5px", color: COLORS.sub, lineHeight: 1.7, flex: 1 }}>
                  Browse standards, templates, protocols, and reference materials maintained across the system.
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "22px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
                    Open Library <span style={{ transition: "transform 0.18s" }}>→</span>
                  </span>
                  <span style={{ fontSize: "9.5px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, padding: "3px 8px", borderRadius: "100px", background: COLORS.greenPale, color: COLORS.green, border: `1px solid ${COLORS.greenLight}` }}>
                    Active
                  </span>
                </div>
              </a>

              {/* Environment Card */}
              <a
                href="#"
                style={{
                  background: COLORS.panel,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "14px",
                  padding: "26px",
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.18s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = COLORS.borderStrong;
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "9.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.muted, fontWeight: 600, marginBottom: "18px" }}>
                  02 — Environment
                </div>
                <div style={{ width: "44px", height: "44px", borderRadius: "11px", background: COLORS.greenLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
                  <Globe size={21} style={{ color: COLORS.green }} />
                </div>
                <div style={{ fontSize: "15.5px", fontWeight: 600, letterSpacing: "-0.01em", marginBottom: "9px" }}>
                  My Environment
                </div>
                <div style={{ fontSize: "12.5px", color: COLORS.sub, lineHeight: 1.7, flex: 1 }}>
                  Your workspace, active modules, system preferences, and current deployment status.
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "22px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
                    Enter Environment <span style={{ transition: "transform 0.18s" }}>→</span>
                  </span>
                  <span style={{ fontSize: "9.5px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, padding: "3px 8px", borderRadius: "100px", background: COLORS.greenPale, color: COLORS.green, border: `1px solid ${COLORS.greenLight}` }}>
                    Active
                  </span>
                </div>
              </a>

              {/* CaseSpace Card */}
              <a
                href="#"
                style={{
                  background: COLORS.panel,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "14px",
                  padding: "26px",
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.18s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = COLORS.borderStrong;
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "9.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.muted, fontWeight: 600, marginBottom: "18px" }}>
                  03 — CaseSpace
                </div>
                <div style={{ width: "44px", height: "44px", borderRadius: "11px", background: COLORS.greenLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
                  <Briefcase size={21} style={{ color: COLORS.green }} />
                </div>
                <div style={{ fontSize: "15.5px", fontWeight: 600, letterSpacing: "-0.01em", marginBottom: "9px" }}>
                  Personal CaseSpace
                </div>
                <div style={{ fontSize: "12.5px", color: COLORS.sub, lineHeight: 1.7, flex: 1 }}>
                  Your active client and staff case files. Role-scoped access only. Records remain in system on exit.
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "22px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
                    Open CaseSpace <span style={{ transition: "transform 0.18s" }}>→</span>
                  </span>
                  <span style={{ fontSize: "9.5px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, padding: "3px 8px", borderRadius: "100px", background: COLORS.greenPale, color: COLORS.green, border: `1px solid ${COLORS.greenLight}` }}>
                    Active
                  </span>
                </div>
              </a>
            </div>

            {/* Status Strip */}
            <div
              style={{
                background: COLORS.panel,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "11px",
                padding: "14px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: COLORS.sub, padding: "4px 10px", borderRadius: "100px", border: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
                  <CheckCircle2 size={14} style={{ color: "#34d399" }} /> System operational
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: COLORS.sub, padding: "4px 10px", borderRadius: "100px", border: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
                  <CheckCircle2 size={14} style={{ color: "#34d399" }} /> VAULT connected
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: COLORS.sub, padding: "4px 10px", borderRadius: "100px", border: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
                  <CheckCircle2 size={14} style={{ color: "#34d399" }} /> Archive connected
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: COLORS.sub, padding: "4px 10px", borderRadius: "100px", border: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
                  <AlertTriangle size={14} style={{ color: COLORS.amber }} /> Calendar not connected
                </div>
              </div>

              <div style={{ fontSize: "11px", color: COLORS.muted }}>
                LogicCommons OS · v1.0 · PublicLogic LLC
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const HomePage = LogicCommonsOS;
export default LogicCommonsOS;