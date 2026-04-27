"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Handles implicit-flow invites where Supabase puts tokens in the URL hash.
// The browser Supabase client picks them up automatically via detectSessionInUrl.
export default function AuthConfirmPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/inbox";
  const supabase = createClient();

  useEffect(() => {
    const run = async () => {
      // Let the client SDK pick up the session from the hash fragment
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = next;
      } else {
        // Listen for the session to be set from the hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            subscription.unsubscribe();
            window.location.href = next;
          }
        });
        // Timeout fallback
        setTimeout(() => { window.location.href = "/login"; }, 5000);
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-main)" }}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Verificando sesión...</p>
    </div>
  );
}
