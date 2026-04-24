# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint (flat config, next/core-web-vitals + next/typescript)
```

No test framework is configured. There is no `npm test` command.

## Architecture

**Apex CRM** is a white-label, multi-tenant SaaS CRM built on Next.js 16 App Router + Supabase.

### Route Groups

| Group | Path | Purpose |
|---|---|---|
| `(dashboard)` | `/inbox`, `/contactos`, `/pipeline`, etc. | Protected CRM pages — auth enforced in `layout.tsx` |
| `(admin)` | `/admin` | Super-admin org management |
| `(auth)` | `/auth/callback`, `/logout` | Supabase auth flow |
| API | `/api/messages/send` | Proxy to Evolution API or Chatwoot |

`middleware.ts` guards all routes except `/login`, `/auth/callback`, `/privacy`, `/terms`. Authenticated users are redirected away from `/login` to `/inbox`.

### Multi-Tenancy

Each **organization** (tenant) has:
- Custom branding (`primary_color`, `secondary_color`, logo) applied as CSS variables via `lib/supabase/theme.ts`
- A subset of active **modules** stored in `org_modules` table
- A `slug` used for admin routing

The module registry lives in `lib/modules.ts`. Modules are split into three tiers: `CORE` (always shown), `BASE` (optional), and `NICHO` (industry-vertical). The `Sidebar` component filters navigation based on what's active for the current org.

### Supabase

- Browser client: `lib/supabase/client.ts`
- Server client (RSC / Route Handlers): `lib/supabase/server.ts` — uses `cookies()` from `next/headers`
- Auth is email/password only. Session is managed via cookies using `@supabase/ssr`.

### Messaging Integrations

Outbound messages route through `/api/messages/send`:

- **WhatsApp** → Evolution API (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`)
- **Instagram / Facebook** → Chatwoot (`CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`) or Meta Graph API (`META_PAGE_ACCESS_TOKEN`, `META_IG_ACCESS_TOKEN`)

The `inbox` module renders received media (images, audio) from WhatsApp conversations stored in Supabase.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
EVOLUTION_API_URL
EVOLUTION_API_KEY
EVOLUTION_INSTANCE
META_PAGE_ACCESS_TOKEN
META_IG_ACCESS_TOKEN
CHATWOOT_URL
CHATWOOT_API_TOKEN
CHATWOOT_ACCOUNT_ID
```

## Deployment

Deployed to **Netlify** via `netlify.toml` using `@netlify/plugin-nextjs`. Build command is `npm run build`, publish dir is `.next`.
