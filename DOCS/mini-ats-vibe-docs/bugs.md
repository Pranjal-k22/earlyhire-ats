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

_No confirmed open defects. Phase 5 verification complete (101/101 tests passing across API [81 tests] and Web [20 tests], zero ESLint or TypeScript issues)._

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

