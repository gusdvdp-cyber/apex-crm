import { headers } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const headerList = await headers();
  const slug = headerList.get("x-org-slug");

  let orgName = "Apex CRM";
  let orgColor: string | null = null;
  let orgLogo: string | null = null;

  if (slug) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: org } = await admin
      .from("organizations")
      .select("name, primary_color, logo_url")
      .eq("slug", slug)
      .single();

    if (org) {
      orgName = org.name;
      orgColor = org.primary_color ?? null;
      orgLogo = org.logo_url ?? null;
    }
  }

  return <LoginForm orgName={orgName} orgColor={orgColor} orgLogo={orgLogo} />;
}
