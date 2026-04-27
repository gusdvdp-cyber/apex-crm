"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Zap, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface Props {
  orgName: string;
  orgColor: string | null;
  orgLogo: string | null;
}

export default function LoginForm({ orgName, orgColor, orgLogo }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const accent = orgColor ?? "#c8f135";

  const handleLogin = async () => {
    if (!email || !password) { setError("Completá todos los campos"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    } else {
      window.location.href = "/inbox";
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", background: "#0d0d0d",
    border: "1px solid #1e1e1e", borderRadius: "10px", color: "#f0f0f0",
    fontSize: "14px", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at 50% 0%, ${accent}14 0%, transparent 60%), #0a0a0a`,
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px", background: "#111",
        border: "1px solid #1e1e1e", borderRadius: "20px", padding: "36px 32px",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.5)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          {orgLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgLogo} alt={orgName} style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={17} color="#0a0a0a" strokeWidth={2.5} />
            </div>
          )}
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.3px" }}>{orgName}</span>
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px", letterSpacing: "-0.4px" }}>Bienvenido</h1>
        <p style={{ fontSize: "13px", color: "#555", margin: "0 0 28px" }}>Ingresá a tu cuenta para continuar</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Email */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = accent}
              onBlur={e => e.currentTarget.style.borderColor = "#1e1e1e"}
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em" }}>Contraseña</label>
              <Link href="/forgot-password"
                style={{ fontSize: "11px", color: "#555", textDecoration: "none", transition: "color 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = accent}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#555"}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ ...inputStyle, paddingRight: "44px" }}
                onFocus={e => e.currentTarget.style.borderColor = accent}
                onBlur={e => e.currentTarget.style.borderColor = "#1e1e1e"}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#444", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#ff444415", border: "1px solid #ff444430", borderRadius: "8px", padding: "10px 12px" }}>
              <p style={{ fontSize: "12px", color: "#ff7070", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleLogin} disabled={loading} style={{
            width: "100%", padding: "13px", borderRadius: "10px",
            background: loading ? "#1e1e1e" : accent,
            border: "none", color: loading ? "#555" : "#0a0a0a",
            fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s", marginTop: "2px",
          }}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}
