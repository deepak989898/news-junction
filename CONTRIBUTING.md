# Contributing

## Branch and PR Workflow

- Create feature branches from main.
- Keep PRs scoped to one concern.
- Include test/build evidence in PR description.
- Do not mix governance docs and runtime feature changes unless requested.

## Required Checks Before PR

- `npm run build` (web)
- lint/type checks for changed workspace
- validate no secrets in diff
- confirm role/security constraints still enforced

## Code Standards

Follow:

- `docs/CODING_STANDARDS.md`
- `docs/API_CONVENTIONS.md`
- `docs/SECURITY_RULES_GUIDE.md`

## Commit Hygiene

- Use clear commit messages with intent.
- Avoid unrelated formatting churn.
- Never commit `.env*` with real values.

## Documentation

When behavior changes:

- update affected docs in `/docs`
- add changelog note in `docs/CHANGELOG.md`
