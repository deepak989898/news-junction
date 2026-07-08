# News Junction Architecture

## 1) System Overview

News Junction is a multi-surface platform:

- Web Admin + Public Site: Next.js App Router (`src/app`)
- Mobile App Foundation: Expo React Native (`mobile-app`)
- Backend Runtime: Next.js Route Handlers on Vercel
- Data Plane: Firebase Authentication, Firestore, Firebase Storage
- AI Providers: OpenAI + Gemini (server-side only)

Design principles:

- Server-authoritative writes for automation/AI workflows
- Role-based access control for admin surfaces
- User-owned personalization data boundaries
- Queue-driven background processing where possible
- Auditability for privileged/system actions

## 2) Web Architecture

- UI routes: `src/app/(public)` and `src/app/admin/(protected)`
- API routes: `src/app/api/**/route.ts`
- Domain services: `src/lib/**`
- Shared auth guard: `src/lib/auth/verify-admin.ts`
- Permissions helper: `src/lib/permissions.ts`

Current major web subsystems:

- Automation engine (`src/lib/automation`)
- AI content/SEO/media/social/voice/editorial/analytics/personalization/operations/orchestrator modules
- Public article/category/search pages
- Admin dashboards and managers

## 3) Mobile Architecture (Foundation)

- Independent workspace: `mobile-app/`
- Navigation: Expo Router (`app/`, `(tabs)`, `(drawer)`)
- Core providers: auth, theme, i18n, network, notifications, error boundary
- Firebase client services: `mobile-app/firebase/*`
- State approach: React Query + Context (minimal global store)
- Offline baseline: connectivity service + placeholder sync/retry

The mobile app intentionally does not implement feed/search/bookmark business logic in Phase 6A.

## 4) Firebase Architecture

- Auth: Firebase Authentication
  - Admin authorization via `users/{uid}.role`
  - Roles: `super_admin`, `editor`
- Firestore:
  - CMS core collections (`news`, `categories`, `sources`, etc.)
  - AI module collections (logs/settings/queues/results)
  - Personalization + operations + orchestrator collections
- Storage:
  - Public + admin media paths with role-aware write rules
  - AI media and AI voice/video namespaces

## 5) Firestore Collection Domains

- Core CMS: `news`, `categories`, `users`, `settings`, `sources`, `rawNews`, `automationLogs`
- AI Content/SEO/Media/Social/Voice/Editorial/Analytics
- Personalization: `userBookmarks`, `userPreferences`, `userFollows`, etc.
- Operations: `systemLogs`, `operationLogs`, `queueLogs`, `cronLogs`, `healthChecks`
- Orchestrator: `workflowExecutions`, `workflowDefinitions`, `workflowTemplates`, `aiModules`, `eventLogs`, `jobExecutions`, `workflowAuditLogs`

## 6) Firebase Storage Paths

- `/news/**` public read, admin write
- `/media/**` public read, admin write
- `/site/**` super admin write
- `/ai-media/**` admin write
- `/ai-voice-video/**` admin write

## 7) API Layer Architecture

- Route convention: `src/app/api/<domain>/<action>/route.ts`
- Runtime: Node.js for server routes
- Auth:
  - Admin APIs: `verifyAdmin`
  - User personalization APIs: `verify-user` (token verification)
- Policy:
  - Super admin required for sensitive settings/emergency/privileged updates
  - Confirmation flags for dangerous operational actions

## 8) AI Module Architecture

Each AI module generally follows:

- `types.ts`: typed contracts
- `defaults.ts`: settings defaults/prompts/IDs
- `service.ts`: business logic + persistence + logging
- `client-api.ts`: frontend API helpers
- `api/*`: route handlers for secure server actions
- `admin/(protected)/ai/*`: UI manager pages

Cross-cutting AI safety:

- advisory output framing for sensitive workflows
- approval requirements for high-risk categories/actions
- usage/cost controls and logs

## 9) Cron + Queue Architecture

- Cron config: `vercel.json`
  - `/api/cron/fetch-news`
  - `/api/cron/process-news`
  - `/api/cron/cleanup`
- Queue pattern:
  - Queue collections store items (`status`, retries, timestamps, error)
  - Processor endpoints/services transition queue states
  - Operations dashboard provides safe retry/cancel controls

## 10) Identity, Roles, and Access

- Admin roles resolved from Firestore user doc
- `super_admin`:
  - platform settings
  - destructive operations
  - emergency controls
- `editor`:
  - operational publishing/editorial/AI tooling without top-level destructive authority
- Public users:
  - auth for own personalization data

## 11) Security Model

- Firestore rules as primary data guardrail
- Storage rules for path-level write controls
- Server route auth + role checks before side effects
- Secrets only server-side (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.)
- Cron secret required for cron endpoints

## 12) Logging, Error Handling, Monitoring

- Module-specific logs (`ai*Logs`, editorial/social/etc.)
- System operations logs (`systemLogs`, `operationLogs`)
- Orchestrator audit/event logs (`workflowAuditLogs`, `eventLogs`)
- Error strategy:
  - route try/catch with structured JSON error response
  - operation/action logging for privileged flows
- Monitoring:
  - operations health dashboard
  - queue status snapshots
  - cron logs
  - cost and alert dashboards

## 13) Known Architectural Risks (Current)

- Root repo currently mixes web + mobile workspaces (mitigated by TS exclude for `mobile-app`)
- Some AI/ops/orchestrator docs and retention policies were implicit before Phase 0
- Multiple queue collections with evolving schemas require strict schema governance

## 14) Governance Decisions (Phase 0)

- Documentation-first standards before new features
- No runtime behavior changes in this phase
- No production data mutation or deployment setting changes
