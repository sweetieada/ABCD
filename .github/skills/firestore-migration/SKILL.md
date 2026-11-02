---
name: firestore-migration
description: Safely update Firestore document schemas, Security Rules, indexes, and owner-isolation tests.
---

# Firestore Migration

Whenever Firestore document shapes, queries, or access patterns change:

1. Update the Zod validators and domain types for every changed document.
2. Update `firestore.rules` with default-deny access, exact field validation, immutable ownership, and create/update validation.
3. Update `firestore.indexes.json` for any new compound query.
4. Add Firebase Emulator tests for allowed owner access, denied cross-user access, and invalid data.
5. Run `npm run typecheck`, `npm run test`, and `npm run test:rules`, and report any checks that could not be completed.

Do not consider a schema change complete until the validators, rules, indexes, and owner-isolation tests are all in place.
