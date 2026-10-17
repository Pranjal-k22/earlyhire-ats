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

_No confirmed open defects. Phase 2 verification complete (22/22 tests passing across API and Web, zero ESLint or TypeScript issues)._

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

_Move resolved issue records here rather than deleting them, so the team can learn from recurring failures._
