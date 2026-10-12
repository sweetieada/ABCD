---
name: supabase-migration
description: Add or change Supabase tables safely with a new SQL migration, RLS policies, and regenerated TypeScript types. Use whenever the database schema changes.
---

# Supabase Schema Change Workflow

## Steps
1. **Read first**
   - Check the data model and RLS rules in `ARCHITECTURE.md` (section 3).
2. **Write a new migration**
   - Create a new file in `supabase/migrations/`. Never edit an existing migration.
   - Every new table must have `alter table <name> enable row level security;`.
3. **RLS policies (least privilege)**
   - `decks`: owner when `user_id = auth.uid()`; read-only for signed-in users when `is_public = true`.
   - `cards`: access follows the owning deck's `user_id`.
   - `reviews`: users read/write only their own rows.
   - Never write `using (true)` for write access.
4. **Regenerate types**
   - Run `npx supabase gen types typescript --local > types/database.ts`.
   - Never edit `types/database.ts` by hand. Update domain types in `types/index.ts` if needed.
5. **Test RLS**
   - Add or update an integration test proving user A cannot read or modify user B's data.

## Done when
- Migration applies cleanly on a local Supabase.
- `npm run typecheck` passes with the new types.
