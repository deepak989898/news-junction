# Security Rules Guide

## 1) Roles and Trust Boundaries

- `super_admin`: highest privilege
- `editor`: operational admin
- public users: end users with user-owned personalization scope

Role source of truth:

- Firestore `users/{uid}.role`

## 2) Firestore Rule Strategy

Current strategy:

- Core admin collections: admin read, server/system create, limited updates, super admin delete
- User-owned collections (`userPreferences`, `userBookmarks`, etc.): owner read/write
- Public read limited to published content for `news`

Mandatory future checks:

- Ensure all server-created collections have `allow create: if false` for clients
- Keep ownership checks for all user-scoped docs (`resource.data.uid == request.auth.uid`)

## 3) Storage Rule Strategy

- Public read for news/media assets
- Admin write for managed content paths
- Super admin delete for sensitive paths

Avoid:

- broad write access for authenticated users on shared buckets

## 4) Server Route Protection

- Authenticate every non-public route with Firebase ID token
- Authorize role before executing side effects
- Never trust client-provided role claims directly

## 5) Secret Management

- API keys and service account credentials must remain server-side env vars
- Never expose `OPENAI_API_KEY`, `GEMINI_API_KEY`, admin credentials in frontend bundles
- Rotate secrets on leakage suspicion

## 6) Cron Security

- Require `CRON_SECRET` and verify request headers
- Never allow unauthenticated cron execution endpoints

## 7) Admin Audit Logging

Log all privileged actions:

- settings changes
- queue retries/cancellations
- emergency controls
- module/workflow toggles

Use immutable append logs where possible.

## 8) Rate Limiting Strategy (Recommended)

Current repo does not enforce global API throttling centrally.

Recommended:

- middleware/IP throttles for sensitive route groups
- per-user quotas for heavy AI endpoints
- circuit-breakers when providers fail or quota near limits

## 9) Security Risks to Address

- `.env.example` previously contained realistic-looking secret values; sanitized in governance update
- root monorepo can accidentally typecheck/build wrong workspace if guardrails absent
- many operational routes rely on role checks; must keep regression tests around authz

## 10) Security Checklist

- [ ] No secrets in committed code/docs
- [ ] Admin routes enforce `verifyAdmin`
- [ ] Super-admin-only actions checked explicitly
- [ ] User data routes enforce ownership
- [ ] Cron secret validation enabled
- [ ] Logs/audit trails available for privileged actions
