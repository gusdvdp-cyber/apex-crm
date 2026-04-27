"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const handleSubmit = async () => {
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => { window.location.href = "/inbox"; }, 2000);
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
      background: "radial-gradient(ellipse at 50% 0%, #c8f13514 0%, transparent 60%), #0a0a0a",
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px", background: "#111",
        border: "1px solid #1e1e1e", borderRadius: "20px", padding: "36px 32px",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.5)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#c8f135", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={17} color="#0a0a0a" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.3px" }}>Apex CRM</span>
        </div>

        {done ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: "12px" }}>
            <CheckCircle2 size={40} color="#c8f135" strokeWidth={1.5} />
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>¡Contraseña guardada!</p>
            <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>Redirigiendo al inbox...</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px", letterSpacing: "-0.4px" }}>Creá tu contraseña</h1>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 28px" }}>Elegí una contraseña segura para tu cuenta</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Nueva contraseña</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres" onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={{ ...inputStyle, paddingRight: "44px" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#c8f135"}
                    onBlur={e => e.currentTarget.style.borderColor = "#1e1e1e"}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#444", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Confirmar contraseña</label>
                <div style={{ position: "relative" }}>
                  <input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repetí la contraseña" onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={{ ...inputStyle, paddingRight: "44px" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#c8f135"}
                    onBlur={e => e.currentTarget.style.borderColor = "#1e1e1e"}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#444", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: "#ff444415", border: "1px solid #ff444430", borderRadius: "8px", padding: "10px 12px" }}>
                  <p style={{ fontSize: "12px", color: "#ff7070", margin: 0 }}>{error}</p>
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading} style={{
                width: "100%", padding: "13px", borderRadius: "10px",
                background: loading ? "#1e1e1e" : "#c8f135",
                border: "none", color: loading ? "#555" : "#0a0a0a",
                fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s", marginTop: "2px",
              }}>
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>

              <Link href="/login" style={{ fontSize: "12px", color: "#444", textDecoration: "none", textAlign: "center", transition: "color 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#888"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#444"}
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
