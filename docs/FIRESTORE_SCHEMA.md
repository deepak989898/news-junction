# Firestore Schema Standard

This document defines current collection contracts and governance guidance.  
Field lists are **canonical minimums**; modules may add non-breaking metadata fields.

## Core Principles

- Use ISO timestamps (`createdAt`, `updatedAt`) for module logs/state docs.
- Keep ownership fields (`uid`) for user-scoped data.
- Prefer append-only logs; avoid destructive updates unless required.
- Index all common filter + sort combinations.

---

## `news`

- Purpose: Published/draft news articles.
- Key fields:
  - `titleHi` (string, required)
  - `titleEn` (string, required)
  - `slug` (string, required, unique intent)
  - `summaryHi`, `summaryEn` (string, required)
  - `contentHi`, `contentEn` (string, required)
  - `status` (string enum: `draft|published`, required)
  - `categoryId`, `categoryNameHi`, `categoryNameEn` (string, required)
  - `author` (string, required)
  - `publishedAt`, `updatedAt` (string, optional/required by workflow)
- Index requirements:
  - status + updatedAt/publishedAt ordering
  - slug lookup
- Permissions:
  - Public read only when `status == published`
  - Admin/editor write, super_admin delete
- Retention:
  - Indefinite (editorial record)

## `categories`

- Purpose: News taxonomy.
- Fields:
  - `nameHi`, `nameEn`, `slug` (string, required)
  - `isActive` (boolean, required)
  - `order` (number, required)
- Index:
  - active + order
- Permissions:
  - Public read, admin/editor create/update, super_admin delete
- Retention:
  - Indefinite

## `users`

- Purpose: User/admin profile + role mapping.
- Fields:
  - `uid` (string, required)
  - `email` (string, required)
  - `role` (enum: `super_admin|editor` for admin users)
  - profile metadata fields (optional)
- Index:
  - role filters for admin panel tooling
- Permissions:
  - Self read + admin read; super_admin update/delete
- Retention:
  - Account lifecycle bound

## `settings`

- Purpose: System/global module settings docs.
- Fields:
  - doc-specific schema (`analyticsSettings`, `personalizationSettings`, `operationsSettings`, `orchestratorSettings`, etc.)
  - `updatedAt` (string)
- Index:
  - Usually doc-id based; no heavy composite required
- Permissions:
  - Admin read; super_admin write
- Retention:
  - Indefinite config state

## `sources`

- Purpose: Upstream ingestion source definitions.
- Fields:
  - source metadata (name, type, url/feed config, trust metadata)
  - `isActive` (boolean)
  - `updatedAt`
- Permissions:
  - Admin/editor create/update/read; super_admin delete
- Retention:
  - Indefinite

## `rawNews`

- Purpose: Pre-processed fetched items before editorial pipeline.
- Fields:
  - source payload fields
  - `status` (queued/processed/etc.)
  - `error` (optional)
  - `createdAt`, `updatedAt`
- Index:
  - status + createdAt
- Permissions:
  - Admin read/update, server create, super_admin delete
- Retention:
  - Recommended rolling retention (30–90 days) after stable processing

## `automationLogs`

- Purpose: Automation pipeline operational logs.
- Fields:
  - `actionType`, `status`, `message` (required)
  - `metadata` (map, optional)
  - `createdAt` (required)
- Index:
  - createdAt desc
- Permissions:
  - Admin read, server create, super_admin maintenance
- Retention:
  - 90–180 days recommended

## `mediaAssets`

- Purpose: Approved/generated media metadata.
- Fields:
  - `articleId`, `url`, `type`, `status`
  - optimization metadata
  - `createdAt`, `updatedAt`
- Index:
  - articleId + createdAt
- Permissions:
  - Admin read/update, server create, super_admin delete
- Retention:
  - Indefinite while referenced

## `socialPostQueue`

- Purpose: Social publishing queue.
- Fields:
  - `articleId`, `platform`, `status`, `scheduledAt`
  - `retryCount`, `error`
  - `createdAt`, `updatedAt`
- Index:
  - status + createdAt/scheduledAt
- Permissions:
  - Admin read/update, server create, super_admin delete
- Retention:
  - 60–180 days after terminal status

## `audioAssets`

- Purpose: Generated voice assets metadata.
- Fields:
  - `articleId`, `language`, `provider`, `voice`, `audioUrl`
  - `duration`, `status`, `cost`
  - `createdAt`, `updatedAt`
- Index:
  - articleId + createdAt
- Permissions:
  - Admin read/update, server create, super_admin delete
- Retention:
  - Indefinite while referenced

## `editorialReviews`

- Purpose: AI editorial quality review outputs.
- Fields:
  - `articleId`, `reviewType`, `reviewScore`, `status`
  - `issues[]`, `suggestions[]`
  - `createdAt`, `updatedAt`
- Index:
  - articleId + createdAt
  - status + createdAt
- Permissions:
  - Admin read/update, server create, super_admin delete
- Retention:
  - 6–24 months recommended

## `analyticsSnapshots`

- Purpose: Cached analytics summaries.
- Fields:
  - `rangeKey`, `summary` (map), `createdAt`
- Index:
  - rangeKey + createdAt desc
- Permissions:
  - Admin read, server create, super_admin maintenance
- Retention:
  - 30–90 days recommended

## `userBookmarks`

- Purpose: User saved article list.
- Fields:
  - `uid`, `articleId`, `title`, `slug`
  - `categoryName`, `language`
  - `createdAt`
- Index:
  - uid + createdAt desc
- Permissions:
  - user-owned read/write/delete
- Retention:
  - user lifecycle

## `userPreferences`

- Purpose: Personalized UX settings (language/theme/notifications/etc.).
- Fields:
  - `uid` (required)
  - `preferredLanguage` (`hi|en`)
  - `preferredCategories[]`, followed entity arrays
  - notification + UI preference fields
  - `updatedAt`
- Index:
  - uid doc-id access, optional preference analytics indexes
- Permissions:
  - user-owned read/write, super_admin delete
- Retention:
  - user lifecycle

## `workflowExecutions`

- Purpose: Orchestrator workflow run history.
- Fields:
  - `workflowId`, `workflowName`, `trigger`, `status`
  - `startedAt`, `completedAt`, `duration`
  - `steps[]`, `errors[]`, `initiatedBy`
- Index:
  - status + startedAt desc
  - workflowId + startedAt desc
- Permissions:
  - admin read, server create/update, super_admin maintenance
- Retention:
  - 6–24 months recommended (or archive policy)

---

## Additional Governance Collections

- `operationLogs`, `systemLogs`, `queueLogs`, `cronLogs`, `healthChecks`
- `workflowDefinitions`, `workflowTemplates`, `workflowAuditLogs`, `eventLogs`, `jobExecutions`
- AI module logs: `aiContentLogs`, `aiSeoLogs`, `aiMediaLogs`, `voiceVideoLogs`, `analyticsLogs`, etc.

Use consistent log schema across all:

- `actionType` (string)
- `status` (string enum where applicable)
- `message` (string)
- `metadata` (map)
- `createdAt` (string)

## Retention Policy Guidance

- Operational logs: 90 days default
- Security/audit logs: 365 days minimum
- Workflow execution logs: 180+ days
- User preference/bookmarks: user lifecycle
- Published content: indefinite
