# Phase Roadmap

## Phase 1–4 (Foundation to Core Web Platform)

### Goal
- Establish CMS/news ingestion/admin/public baseline.

### Main modules
- Auth + roles
- News/category/source management
- Automation fetch/process
- Public article/category/search surfaces

### Dependencies
- Firebase Auth/Firestore/Storage
- Vercel deployment

### Safety notes
- Admin route guards required
- Public read only for published content

### Completion checklist
- [ ] Admin CRUD stable
- [ ] Public rendering stable
- [ ] Cron fetch/process operational

## Phase 5A–5J (AI/Operations/Orchestration)

### 5A – AI Content Studio
- Goal: AI-assisted content actions + risk checks + approval flow
- Safety: preview before apply, high-risk checks, logs/cost controls

### 5B – AI SEO Manager
- Goal: SEO audits/meta/slug/internal links/FAQ/content gaps
- Safety: no misleading SEO claims, maintain attribution

### 5C – AI Media Studio
- Goal: image generation/moderation/storage/versioning
- Safety: moderation + approval before use

### 5D – AI Social Manager
- Goal: social generation/scheduling/campaigns/queue/analytics
- Safety: token security + approval workflows

### 5E – AI Voice & Video Studio
- Goal: scripts/audio/subtitles/video package generation
- Safety: no voice-cloning/fake footage narratives

### 5F – AI Editorial Manager
- Goal: editorial scoring/source consistency/duplicate checks
- Safety: advisory framing, not factual certainty claims

### 5G – AI Analytics Manager
- Goal: growth/revenue insight aggregation and reports
- Safety: no fabricated external analytics

### 5H – AI Personalization Engine
- Goal: user-preference/activity-based recommendations
- Safety: no sensitive inference, personalization optional

### 5I – AI Operations Center
- Goal: health/queues/cron/errors/alerts/cost control center
- Safety: safe recovery only, no destructive auto-healing

### 5J – AI Master Orchestrator
- Goal: workflow/event/job orchestration and emergency controls
- Safety: strict role gates + audit logs + safe mode controls

## Phase 6A–6E (Mobile Program)

### 6A – Mobile Foundation (completed baseline)
- Goal: Expo app architecture, auth/settings/navigation/offline/notifications base

### 6B – Mobile Auth Hardening + Data Guards
- Goal: production-grade social auth + route guards + persisted query cache

### 6C – Mobile Content Experience
- Goal: feed/category/article reader UX with pagination/offline-read patterns

### 6D – Mobile Engagement
- Goal: bookmarks/notifications/preferences parity with web

### 6E – Mobile Release Readiness
- Goal: QA hardening, accessibility, telemetry, store readiness

## Future Phase 7 (Scale & Reliability)

- Event-driven processing maturity
- advanced observability/SLOs
- data lifecycle automation
- cost governance and autoscaling patterns

## Future Phase 8 (Enterprise Expansion)

- multi-tenant capabilities
- policy-as-code governance
- advanced AI compliance and explainability
- regionalization and legal controls

## Global Safety Notes

- Never bypass auth/approval workflows
- Never auto-modify source code or deployment settings from AI flows
- Keep all privileged actions auditable
