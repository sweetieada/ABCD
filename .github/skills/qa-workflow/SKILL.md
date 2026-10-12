---
name: qa-workflow
description: Run the repository's lint, typecheck, unit tests, and end-to-end tests in order; fix failures until all checks pass.
---

# QA Workflow

Run these commands from the repository root, in this exact order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run test:e2e`

Run each command only after the previous command passes. If a command fails, inspect the failure, make the smallest appropriate fix, and rerun that command. Continue through the sequence only after it passes. Repeat as needed until all four commands pass.

Never call the real Claude API from tests. Mock Claude/API calls and use fixtures or other deterministic test data. If a test would make a real Claude API request, fix or safely skip that test setup before running it; do not make the request.

Do not report success unless every command above has passed.
