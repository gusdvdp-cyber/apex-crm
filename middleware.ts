import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // ── 1. Extraer org slug del subdominio ─────────────────────
  const host = request.headers.get("host") ?? "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";

  let orgSlug: string | null = null;
  if (rootDomain && host !== rootDomain && host.endsWith(`.${rootDomain}`)) {
    const sub = host.slice(0, -(`.${rootDomain}`.length));
    // Solo un nivel de subdominio (ej: "hotel-palermo", no "sub.hotel-palermo")
    if (sub && !sub.includes(".")) orgSlug = sub;
  }

  // Propagamos el slug al request para que los Server Components lo lean con headers()
  const requestHeaders = new Headers(request.headers);
  if (orgSlug) requestHeaders.set("x-org-slug", orgSlug);

  // ── 2. Supabase SSR ────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Recreamos la respuesta conservando los requestHeaders con x-org-slug
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login");
  const isCallback = path.startsWith("/auth/callback") || path.startsWith("/callback");
  const isPublic = path.startsWith("/privacy") || path.startsWith("/terms") || path.startsWith("/set-password");
  const isApi = path.startsWith("/api");

  // ── 3. Reglas de redirección ───────────────────────────────
  if (!user && !isAuthPage && !isCallback && !isPublic && !isApi) {
    // No autenticado → ir al login del mismo subdominio
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthPage) {
    // Ya logueado → ir al inbox del mismo subdominio
    return NextResponse.redirect(new URL("/inbox", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
