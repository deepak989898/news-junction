# Testing Strategy

## Objectives

- Prevent regressions across web admin/public, APIs, Firebase rules, automation pipelines, and mobile foundation.
- Enforce security and role-based guarantees.

## 1) Unit Testing

- Service-layer functions in `src/lib/*/service.ts`
- Utility functions (`permissions`, prompt builders, scoring heuristics)
- Mobile provider/services in `mobile-app/services` and `mobile-app/providers`

## 2) Component Testing

- Admin manager pages (critical state sections)
- Shared UI components
- Mobile UI primitives and route screens (foundation states)

## 3) API Route Testing

- Auth required vs unauthorized responses
- Role-gated paths (`super_admin` only operations)
- Validation failures and success responses
- Queue action safety cases (retry/cancel/confirm required)

## 4) Firebase Emulator Testing

- Firestore rules ownership constraints
- Admin/editor/public access matrix
- Storage rule path controls

## 5) Admin Flow Testing

- login + role guard
- AI manager settings + action routes
- operations center controls
- orchestrator workflow/queues/emergency controls

## 6) Automation & Cron Testing

- cron auth validation (`CRON_SECRET`)
- pipeline happy path + failure path
- queue retry and terminal states

## 7) SEO/Content Testing

- metadata generation shape validation
- schema/JSON-LD output checks

## 8) Performance Testing

- API latency sampling
- queue processing throughput
- Lighthouse for public pages (target 90+)
- mobile startup latency baseline

## 9) Security Testing

- unauthorized API calls
- privilege escalation attempts
- user data access isolation
- secret scanning in repo

## 10) Mobile Testing (Phase 6A+)

- onboarding flow
- auth session restore
- theme/language persistence
- offline placeholder behavior
- notification permission/token foundation

## Tooling Recommendations

- Web: Jest/Vitest + Testing Library + Playwright
- Mobile: Jest + React Native Testing Library + Detox (later phases)
- Security: secret scanner + dependency audit

## Quality Gates (Pre-merge)

- [ ] TypeScript clean
- [ ] Build passes
- [ ] Lint passes
- [ ] Critical API tests pass
- [ ] Rules validation passes
- [ ] No leaked secrets
