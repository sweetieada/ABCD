---
name: supabase-migration
description: Safely update the Supabase database schema with migrations, RLS policies, regenerated TypeScript types, and ownership tests.
---

# Supabase Migration

Whenever changing the database schema:

1. Add a new, timestamped SQL migration under `supabase/migrations/`. Do not edit an existing migration to change an already-applied schema.
2. Enable row-level security (RLS) on every new table and define policies that enforce the intended access rules. Review affected existing tables and policies when the change alters data ownership or access.
3. Regenerate `types/database.ts` using the repository's Supabase type-generation command. Do not hand-edit the generated file.
4. Add or update tests that verify data isolation: user A must not be able to read user B's data. Use the project's local Supabase/test setup and ensure the test exercises the RLS policies.
5. Run the relevant migration and tests, and report any checks that could not be completed.

Do not consider a schema change complete until the migration, RLS policies, regenerated types, and user-isolation test are all in place.
