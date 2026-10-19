# Phase 1: Foundation and auth

Project skeleton, theme, login, roles, app shells, shared building blocks. Already declares every feature flag, nav item, env key and activity action later phases use (the old patch 1 is folded in), so later phases never edit these files.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Use Node.js 20.9 or newer. Create the app: npx create-next-app@latest storage-org-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" (Next.js 16: middleware.ts is now proxy.ts)
2. Run npx shadcn@latest init (choose the Radix component library if asked; the code uses asChild), then add every UI component the project will need: npx shadcn@latest add button input label select textarea dialog dropdown-menu tabs table badge checkbox switch sonner tooltip skeleton card separator sheet popover command radio-group scroll-area
3. Unzip this phase over the project, after the shadcn step. It replaces the create-next-app versions of layout.tsx, globals.css, page.tsx and next.config.ts. Delete src/app/favicon.ico only if you have your own icon.
4. Create a free Supabase project. In Authentication settings turn OFF public sign-ups. Copy .env.example to .env.local and fill the Supabase values (Project settings, API keys: the publishable key and the secret key).
5. Run supabase/migrations/0001_foundation.sql in the Supabase SQL editor.
6. Create the first admin: add a user in Supabase Auth (Add user, auto-confirm), then run: insert into profiles (id, full_name, role, must_change_password) values ('<user uuid>', 'Your name', 'admin', false);

## Database

Run `supabase/migrations/0001_foundation.sql` in the Supabase SQL editor.

## Install

```
npm i @supabase/supabase-js @supabase/ssr next-themes zod react-hook-form @hookform/resolvers @tanstack/react-query lucide-react date-fns server-only tw-animate-css
```

## Env values

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (the older NEXT_PUBLIC_SUPABASE_ANON_KEY also works)`, `SUPABASE_SECRET_KEY (the older SUPABASE_SERVICE_ROLE_KEY also works)`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_LOGIN_DOMAIN`

## Files added

- .env.example
- README.md
- next.config.ts
- supabase/migrations/0001_foundation.sql
- src/app/layout.tsx
- src/app/globals.css
- src/app/page.tsx
- src/app/not-found.tsx
- src/app/error.tsx
- src/app/(auth)/layout.tsx
- src/app/(auth)/login/page.tsx
- src/app/(auth)/change-password/page.tsx
- src/app/api/auth/login-event/route.ts
- src/app/(uploader)/layout.tsx
- src/app/admin/layout.tsx
- src/app/admin/page.tsx
- src/proxy.ts
- src/components/auth/LoginForm.tsx
- src/components/auth/ChangePasswordForm.tsx
- src/components/layout/ThemeProvider.tsx
- src/components/layout/ThemeToggle.tsx
- src/components/layout/LangToggle.tsx
- src/components/layout/QueryProvider.tsx
- src/components/layout/ProfileProvider.tsx
- src/components/layout/AdminSidebar.tsx
- src/components/layout/UploaderNav.tsx
- src/components/layout/UserMenu.tsx
- src/components/layout/OfflineBanner.tsx
- src/components/layout/InstallPrompt.tsx
- src/components/layout/RegisterSW.tsx
- src/components/shared/ActivityChip.tsx
- src/components/shared/ColorChip.tsx
- src/components/shared/PageHeader.tsx
- src/components/shared/EmptyState.tsx
- src/components/shared/ConfirmDialog.tsx
- src/config/activity-types.ts
- src/config/features.ts
- src/config/nav.ts
- src/config/app.ts
- src/lib/supabase/client.ts
- src/lib/supabase/server.ts
- src/lib/supabase/admin.ts
- src/lib/supabase/proxy.ts
- src/lib/auth.ts
- src/lib/activity.ts
- src/lib/api.ts
- src/lib/env.ts
- src/lib/i18n/index.ts
- src/lib/i18n/server.ts
- src/lib/i18n/provider.tsx
- src/lib/i18n/messages/common.ts
- src/lib/i18n/messages/auth.ts
- src/hooks/useProfile.ts
- src/types/profile.ts
- src/types/activity.ts

## Files replaced (full file, overwrite)

- none

## Check it works

- npm run dev, open /login, sign in as the admin: you land on /admin and see the welcome page.
- Theme toggle switches light/dark/system and survives a reload; the Hindi button switches labels.
- A user with role uploader cannot open /admin (redirected to /).
- A row appears in activity_log with action = 'login'.
- npx tsc --noEmit and npm run lint pass.
