# Phase 2: Staff accounts

Admin creates and manages staff logins. No public sign-up.

Unzip over the project root. This zip contains only files that are new or changed in this phase.

## Steps

1. Make sure SUPABASE_SECRET_KEY is set in .env.local (server only; the older SUPABASE_SERVICE_ROLE_KEY name also works). Restart npm run dev after changing it.

## Files added

- src/app/admin/staff/page.tsx
- src/app/api/staff/route.ts
- src/app/api/staff/[id]/route.ts
- src/app/api/staff/bulk/route.ts
- src/components/staff/StaffTable.tsx
- src/components/staff/StaffForm.tsx
- src/components/staff/ResetPasswordDialog.tsx
- src/components/staff/BulkCreateDialog.tsx
- src/components/staff/StaffFilters.tsx
- src/lib/staff.ts
- src/lib/schemas/staff.ts
- src/types/staff.ts
- src/lib/i18n/messages/staff.ts

## Files replaced (full file, overwrite)

- src/config/features.ts

## Check it works

- Staff accounts appears in the sidebar. Add a field staff member with a login ID (for example rakesh.chatra) and the suggested temporary password; at first sign-in they must choose a new password.
- Switch them off: their next page load signs them out and they cannot sign in again. Switch them on: they can sign in.
- Demoting or switching off the only admin is refused with a clear message; you cannot switch off or demote yourself.
- Reset password shows a new temporary password and the person must change it at next sign-in.
- Add from CSV: rows with empty passwords get one made; the result table shows each row, and the passwords file downloads.
- Delete is offered only for accounts with no uploads; each change appears in activity_log.
