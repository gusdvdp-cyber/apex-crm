"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
      setTimeout(() => { window.location.href = "/inbox"; }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-main)" }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <ShieldCheck size={16} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Apex CRM</span>
        </div>

        {done ? (
          <div className="text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>¡Listo!</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Contraseña guardada. Redirigiendo...</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Creá tu contraseña</h1>
            <p className="text-xs mb-6" style={{ color: "var(--text-secondary)" }}>Elegí una contraseña para acceder a tu cuenta</p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: "var(--bg-main)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repetí la contraseña"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: "var(--bg-main)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>

              {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold mt-1 transition-opacity"
                style={{ background: "var(--accent)", color: "white", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
