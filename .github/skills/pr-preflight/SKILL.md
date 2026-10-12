---
name: pr-preflight
description: Check for debug logging and exposed API keys, validate Conventional Commit messages, and prepare a project-compliant pull request description.
---

# PR Preflight

Before opening a pull request:

1. Review the full branch diff for leftover `console.log` statements and exposed credentials or API keys. Check changed files and relevant repository history; do not print or copy secret values into reports. Remove debug logging and remediate any exposed secret before proceeding. Never commit API keys or `.env*` files.
2. Check the commit messages in the branch against Conventional Commits (for example, `feat:`, `fix:`, `refactor:`, or `test:`). If any do not conform, report the specific messages and propose corrected messages; do not rewrite or amend commits unless explicitly requested.
3. Draft a concise pull request description in English, following the repository's project rules: summarize the change, explain its impact, and list relevant verification. Report any required checks that were not run or did not pass; never claim they passed without evidence.

Do not open the pull request while an unresolved exposed secret or debug log remains. Clearly report findings and any blocker.
