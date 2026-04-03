"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyOrgTheme } from "@/lib/supabase/theme";

interface ThemeProviderProps {
  children: React.ReactNode;
  organizationId?: string;
}

export default function ThemeProvider({ children, organizationId }: ThemeProviderProps) {
  useEffect(() => {
    const loadTheme = async () => {
      const supabase = createClient();

      let orgId = organizationId;

      // fallback: si no viene la prop, lo busca como antes
      if (!orgId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();
        orgId = profile?.organization_id;
      }

      if (!orgId) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("primary_color, secondary_color, logo_url")
        .eq("id", orgId)
        .single();

      if (org) {
        applyOrgTheme(
          org.primary_color || "#c8f135",
          org.secondary_color || "#0a0a0a",
          org.logo_url
        );
      }
    };

    loadTheme();
  }, [organizationId]);

  return <>{children}</>;
}