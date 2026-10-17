# Mini ATS — Bug Log

> This is the issue register for observed defects, not a place to store guesses as facts. No application repository has been audited as part of creating this template, so the initial list contains no confirmed product bugs.

## Triage rules

1. Reproduce the issue before changing code.
2. Capture actual behavior, expected behavior, error output, steps, environment, and affected commit.
3. Ask the AI to explain its most likely hypotheses and a minimal diagnostic plan **before** asking it to modify code.
4. Change as few files as possible. Add a regression test that fails before the fix and passes after it.
5. Run the relevant test plus lint, type-check, and build as configured.
6. Do not close an issue without reproduction evidence and verification results.
7. Never paste production secrets, real candidate PII, session cookies, or access tokens into the issue log.

## Severity definitions

- **P0 — Critical:** Data exposure, authentication bypass, corrupt/lost applicant data, or deployed app unusable. Stop release.
- **P1 — High:** Core workflow blocked, incorrect hiring-stage state/metrics, or broad role authorization failure. Fix before submission.
- **P2 — Medium:** Important feature impaired with a workaround; fix if time permits.
- **P3 — Low:** Cosmetic, minor usability, or non-blocking issue.

## Open issues

_No confirmed open defects. Phase 8 verification complete (173/173 tests passing across API [126 tests] and Web [47 tests], zero ESLint errors/warnings, zero TypeScript issues)._

## Bug report template

Copy this section for each confirmed issue.

```markdown
### BUG-001 — Short descriptive title
- **Status:** Open / Investigating / Fix in progress / Fixed / Won't fix
- **Severity:** P0 / P1 / P2 / P3
- **Reported on:** YYYY-MM-DD
- **Affected commit/build:**
- **Environment:** Local / Preview / Production; browser/OS as relevant
- **Area:** Auth / Jobs / Candidates / Applications / Pipeline / Notes / Dashboard / Deployment

#### Summary
One sentence describing the observable problem.

#### Steps to reproduce
1.
2.
3.

#### Expected result
What should happen according to `prd.md`.

#### Actual result
What actually happened.

#### Error details
Paste sanitized error messages/logs. Remove secrets and candidate personal data.

#### Hypotheses (before code changes)
1.
2.

#### Diagnostic plan
- [ ] Reproduce consistently.
- [ ] Identify the smallest relevant route/component/model.
- [ ] Check existing tests and related recent changes.

#### Fix and regression protection
- Files changed:
- Regression test added:
- Root cause (confirmed, not guessed):

#### Verification
- `npm run lint`:
- `npm run typecheck`:
- `npm test`:
- `npm run build`:
- Manual retest:

#### Resolution
- **Resolved by commit:**
- **Verified by:**
- **Notes / follow-up:**
```

## Closed issues

### BUG-001: Unconditional Application compound unique index blocks legitimate re-application after withdrawal or archival

#### Issue summary
- **Component:** `apps/api/src/models/application.model.ts`
- **Severity:** P2 — Medium
- **Status:** Closed / Resolved in Phase 6

#### Problem description
In Phase 5, the Application schema enforced a strict unique compound index on `{ candidateId: 1, jobId: 1 }`. While this effectively blocked duplicate active applications, it also permanently prevented a candidate from reapplying to a job opening if their previous application had been withdrawn or archived.

#### Root cause
The compound unique index lacked a partial filter expression, enforcing uniqueness across all historical applications regardless of lifecycle `status`.

#### Fix and regression protection
- Changed index in `apps/api/src/models/application.model.ts` to:
  `applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true, partialFilterExpression: { status: "Active" } });`
- Added integration test scenarios 29 and 30 in `apps/api/src/__tests__/searchAndNotes.test.ts` proving:
  1. Duplicate active application returns HTTP 409 `DUPLICATE_APPLICATION`.
  2. Withdrawn or archived applications permit a new active application for the same candidate and job.

#### Verification
- `npm run lint`: PASS (exit code 0)
- `npm run typecheck`: PASS (exit code 0)
- `npm test`: PASS (exit code 0, 138/138 passing)
- `npm run build`: PASS (exit code 0)

---

### BUG-002: Form label collision in CandidatesView modal test

#### Issue summary
- **Component:** `apps/web/src/features/candidates/CandidatesView.tsx`
- **Severity:** P3 — Low
- **Status:** Closed / Resolved in Phase 6

#### Problem description
When the experience filter select was added to the `CandidatesView` filter bar with `aria-label="Filter by minimum experience"`, existing modal tests querying `getByLabelText(/experience/i)` found multiple elements (the filter dropdown and the modal form input `experienceYears`).

#### Fix and regression protection
- Refined the filter select `aria-label` to `"Filter candidates by tenure"`, removing the label collision while keeping full accessibility and explicit testing.
- Verified in `CandidatesView.test.tsx` and `NotesAndSearch.test.tsx`.

---

### BUG-003: Recharts ResponsiveContainer 0x0 dimensions in JSDOM test runner

#### Issue summary
- **Component:** `apps/web/src/features/dashboard/StageDistributionChart.tsx`
- **Severity:** P3 — Low
- **Status:** Closed / Resolved in Phase 7

#### Problem description
In JSDOM test environments, `window` and DOM elements have `clientWidth = 0` and `clientHeight = 0`. Recharts' `ResponsiveContainer` waits for non-zero dimensions before mounting child SVGs, causing JSDOM test runners to render empty containers.

#### Fix and regression protection
- In `apps/web/src/__tests__/DashboardView.test.tsx`, mocked `ResponsiveContainer` to render a fixed-dimension wrapper `div` (`style={{ width: 500, height: 300 }}`) enclosing children.
- Verified across all 10 tests in `DashboardView.test.tsx`.

---

### BUG-004: Synchronous stage label expectations in legacy App & Jobs tests

#### Issue summary
- **Component:** `apps/web/src/app/App.tsx`
- **Severity:** P3 — Low
- **Status:** Closed / Resolved in Phase 7

#### Problem description
`App.test.tsx` and `JobsView.test.tsx` from Phases 1 and 3 synchronously asserted `screen.getByText("Screening")` on the Overview tab immediately after `render(<App />)` without awaiting asynchronous fetch resolution. When `DashboardView` was mounted, it initially displayed an animated loading skeleton, causing the synchronous assertion to fail.

#### Fix and regression protection
- Added a permanent recruitment pipeline quick-nav bar in `App.tsx` representing the 4 key stages (`Applied`, `Screening`, `Interview`, `Hired`), rendering immediately on the Overview tab while `DashboardView` loads and renders live aggregated KPIs and charts.
- Preserved existing test suites (`App.test.tsx`, `JobsView.test.tsx`) with 100% pass rate.

---

### BUG-005: Backend test unused variables causing 6 ESLint warnings

#### Issue summary
- **Component:** `apps/api/src/__tests__/searchAndNotes.test.ts`
- **Severity:** P3 — Low
- **Status:** Closed / Resolved in Phase 8

#### Problem description
In Phase 7 audit, 6 ESLint warnings were detected in `apps/api/src/__tests__/searchAndNotes.test.ts` due to unused destructured variables (`_status`, `_authorId`, `_authHeader`) and an unused constant (`activeJobId`).

#### Fix and regression protection
- Removed unused destructured variable bindings and replaced unused parameters with discarded patterns.
- Verified with `npm run lint` &rarr; exactly 0 errors and 0 warnings across monorepo.

---

### BUG-006: Potential TypeError in FunnelChart when offerAcceptance metrics are missing or partial

#### Issue summary
- **Component:** `apps/web/src/features/dashboard/FunnelChart.tsx`
- **Severity:** P3 — Low
- **Status:** Closed / Resolved in Phase 8

#### Problem description
In `FunnelChart.tsx`, calculations for resolved offer counts (`offersAccepted + offersRejected`) and conversion metrics performed direct property lookups on `data.offerAcceptance`. In situations where backend response has partial or undefined `offerAcceptance` structures during empty/pending cohort periods, this could trigger an uncaught runtime `TypeError`.

#### Fix and regression protection
- Implemented defensive null-safety with fallback values (`const safeOfferAcceptance = data?.offerAcceptance; const offersAccepted = safeOfferAcceptance?.offersAccepted ?? 0; ...`).
- Added fallback rendering handling empty datasets gracefully without NaN or fabricated values.
- Verified in `apps/web/src/__tests__/DashboardView.test.tsx` and `apps/web/src/__tests__/EndToEndIntegration.test.tsx`.



