---
name: pr-preflight
description: Check the diff for secrets and debug leftovers, write Conventional Commits, and draft the PR description. Use before pushing or opening a pull request.
---

# PR Pre-flight Workflow

## Steps
1. **Branch**
   - Must be `feat/<summary>` or `fix/<summary>`. Never commit directly to `main`.
2. **Clean the diff**
   - Run `git status` and `git diff --staged`.
   - Remove `console.log`, commented-out code, and temporary files.
   - Make sure no `.env*` file, `ANTHROPIC_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` value is staged.
   - Confirm `lib/ai/` files and anything using the service role key start with `import "server-only"`.
3. **UI text**
   - New user-facing text is Traditional Chinese with Taiwan phrasing (使用者, 牌組).
4. **Verify**
   - Run the `qa-workflow` skill, or at least `npm run lint`, `npm run typecheck`, `npm run test`.
5. **Commits**
   - Conventional Commits, atomic changes, e.g. `feat(review): add SM-2 grading buttons`.
6. **PR description**
   - Summary of changes, linked issue (`Fixes #<n>`), and a checklist showing lint / typecheck / test results.

## Rules
- Never run destructive git commands (`push --force`, `reset --hard`) without asking.
