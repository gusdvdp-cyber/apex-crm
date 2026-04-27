"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthConfirm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/inbox";
  const supabase = createClient();

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { window.location.href = next; return; }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        if (session) { subscription.unsubscribe(); window.location.href = next; }
      });
      setTimeout(() => { window.location.href = "/login"; }, 5000);
    };
    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-main)" }}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Verificando sesión...</p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <AuthConfirm />
    </Suspense>
  );
}
