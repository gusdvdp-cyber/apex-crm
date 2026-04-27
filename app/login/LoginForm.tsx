"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Zap } from "lucide-react";

interface Props {
  orgName: string;
  orgColor: string | null;
  orgLogo: string | null;
}

export default function LoginForm({ orgName, orgColor, orgLogo }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const accent = orgColor ?? "var(--accent)";

  const handleLogin = async () => {
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

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-main)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5 mb-8">
          {orgLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgLogo} alt={orgName} className="w-8 h-8 rounded-xl object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: accent }}
            >
              <Zap size={16} color="white" strokeWidth={2.5} />
            </div>
          )}
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            {orgName}
          </span>
        </div>

        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Bienvenido
        </h1>
        <p className="text-xs mb-6" style={{ color: "var(--text-secondary)" }}>
          Ingresá a tu cuenta para continuar
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
              style={{
                background: "var(--bg-main)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
              style={{
                background: "var(--bg-main)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mt-1 transition-opacity"
            style={{
              background: accent,
              color: "white",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}
