# AGENTS.md — Instructions for AI Coding Agents

These instructions apply to every AI coding agent or automated implementation tool working in this repository.

## 1. Before writing code

1. Read `Architecture-essentials.md` completely.
2. Read `PRD.md` to understand requirements, business rules, exclusions, acceptance criteria, and success metrics.
3. Check `Architecture.md` for data models, API contracts, security design, folder structure, environment variables, and commands.
4. Inspect the existing code, package scripts, lockfile, git status, and tests before changing anything.
5. Identify the smallest useful implementation step. State the files you expect to change and how you will verify acceptance criteria.

## 2. Core rules

- Never invent product requirements. If a requirement is materially ambiguous or conflicts with the documents, state the precise conflict and ask the project owner. Continue independent work when safe.
- Do not change the approved stack or add new product features without explicit approval.
- Keep components, controllers, and service functions small and modular. Follow the architecture's separation of concerns.
- Make the smallest scope-safe change; do not rewrite unrelated working code.
- Follow the stage transition matrix, role permissions, schema, API envelopes, and metric formulas documented in `PRD.md` and `Architecture.md`.
- Treat all incoming HTTP data as untrusted. Validate request params, query strings, and bodies on the server.
- Never trust frontend-only access control. Enforce authentication and authorization on the API.
- Never place secrets in source control or browser-exposed `VITE_*` variables.
- Never put JWTs in `localStorage` or `sessionStorage`; use the documented HttpOnly cookie flow.
- Never use real candidate personal data in development fixtures or public demos.
- Never run a destructive seed/reset against production.
- Do not remove or weaken a test, linter rule, type check, schema check, or security control merely to get a green build.

## 3. Required quality checks

From the repository root, run these commands before marking implementation complete:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For documentation-only changes, run the checks if the repository is already installed and scripts are available; at minimum, review all links/commands and ensure the documented commands match `package.json`. Do not claim a command passed unless it was actually run. If a command is missing or fails for an unrelated baseline reason, report the exact blocker and run all remaining checks that are safe.

## 4. Implementation workflow

1. Map the task to specific acceptance criteria in `PRD.md`.
2. Check existing code for reusable types, validation schemas, components, and services.
3. Implement the backend rule and tests before relying on the UI for correctness.
4. Add/update API contracts and UI only as needed for the vertical slice.
5. Run focused tests, then the full required checks.
6. Review the diff for unrelated changes, debug code, hard-coded values, unsafe query construction, secrets, and inaccurate documentation.
7. Update `README.md`/`docs/API.md` and architecture files when behavior, routes, schema, environment variables, or commands change.
8. Report what changed, checks run, results, known limitations, and what still needs manual verification.

## 5. Definition of done

A task is done only when:
- Its documented acceptance criteria are met.
- Relevant tests cover happy path and important error/permission/conflict cases.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` have been run and results reported accurately.
- No new unhandled TypeScript errors, runtime errors, or browser console errors are known.
- Changed UI includes loading, empty, and error states where applicable.
- Documentation is synchronized with the implementation.
- No secrets, real PII, or production data are included in the diff.

## 6. Do not

- Do not fabricate API endpoints, metrics, permissions, fields, or workflow stages.
- Do not put business logic in giant React components or route handlers.
- Do not pass `req.query` or `req.body` directly to MongoDB filters/updates.
- Do not bypass validation, authorization, or stage-history writing.
- Do not silently cascade-delete related records.
- Do not introduce placeholder buttons that appear to work but do nothing.
- Do not hard-code dashboard figures or seed credentials into production logic.
- Do not claim deployment, test, or security verification that was not performed.


## UI/UX Reference Rules

Before implementing or modifying any frontend page:

1. Inspect all files inside `DOCS/ui-ux/`, including screenshots,
   mockups, design images, and other visual references.
2. Identify the intended layout, colors, typography, spacing,
   navigation, cards, tables, forms, charts, and responsive behavior.
3. Use these references as the visual source of truth for the UI.
4. Recreate the designs using reusable React components,
   TypeScript, and Tailwind CSS.
5. Do not use a screenshot as a substitute for a functional UI.
   Buttons, forms, navigation, filters, and charts must work.
6. Do not invent features just because they appear in a reference.
   Follow `DOCS/PRD.md` for product scope and behavior.
7. If a reference conflicts with the PRD or architecture, preserve
   the documented requirements and record the conflict for review.
8. Support desktop, tablet, and mobile screen sizes.
9. Before marking a page complete, compare the implementation
   against the reference and verify its interactions.
10. Record missing assets, ambiguous designs, and visual
    mismatches in `DOCS/audit.md`.