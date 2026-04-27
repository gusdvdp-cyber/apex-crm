"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Zap, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) { setError("Ingresá tu email"); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/callback?next=/set-password`,
    });
    if (error) {
      setError("No pudimos enviar el email. Verificá la dirección.");
      setLoading(false);
    } else {
      setSent(true);
    }
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
            <Zap size={17} color="#0a0a0a" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.3px" }}>Apex CRM</span>
        </div>

        {sent ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: "16px" }}>
            <CheckCircle2 size={44} color="#c8f135" strokeWidth={1.5} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 8px" }}>Revisá tu casilla</p>
              <p style={{ fontSize: "13px", color: "#555", margin: 0, lineHeight: "1.6" }}>
                Te enviamos un link a <span style={{ color: "#888" }}>{email}</span> para que puedas restablecer tu contraseña.
              </p>
            </div>
            <Link href="/login" style={{ fontSize: "13px", color: "#555", textDecoration: "none", marginTop: "8px", transition: "color 0.1s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#f0f0f0"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#555"}
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Mail size={20} color="#888" strokeWidth={1.8} />
            </div>

            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f0f0f0", margin: "0 0 6px", letterSpacing: "-0.4px" }}>Recuperar contraseña</h1>
            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 28px", lineHeight: "1.6" }}>
              Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  style={{
                    width: "100%", padding: "12px 14px", background: "#0d0d0d",
                    border: "1px solid #1e1e1e", borderRadius: "10px", color: "#f0f0f0",
                    fontSize: "14px", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#c8f135"}
                  onBlur={e => e.currentTarget.style.borderColor = "#1e1e1e"}
                />
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
                transition: "all 0.15s",
              }}>
                {loading ? "Enviando..." : "Enviar instrucciones"}
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
