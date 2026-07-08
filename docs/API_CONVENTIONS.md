# API Conventions

## Route Layout

- Pattern: `/api/<domain>/<action>`
- File location: `src/app/api/<domain>/<action>/route.ts`
- Runtime: `export const runtime = "nodejs"` for server-dependent handlers

## Method Semantics

- `GET`: read-only retrieval
- `POST`: command/action/create
- `PUT`: idempotent update
- `DELETE`: explicit deletion/cancel (when needed)

## Authentication

- Admin routes:
  - verify Firebase token from `Authorization: Bearer <idToken>`
  - resolve role using `verifyAdmin`
- User routes:
  - verify Firebase user token using `verify-user`

## Authorization Rules

- `super_admin` only:
  - global settings updates
  - emergency controls
  - destructive workflow/module operations
- `editor`:
  - operational content and manager workflows
- user:
  - only own personalization data

## Request/Response Contract

- Success: JSON payload object
- Error: `{ "error": "<human-readable message>" }` with proper status code
- Standard status codes:
  - `200` success
  - `400` validation/confirmation missing
  - `401` unauthenticated
  - `403` forbidden
  - `404` not found
  - `500` internal error

## Safety Controls in Commands

- Require `confirm` boolean for dangerous actions:
  - cron manual run
  - emergency controls
  - mass queue operations
  - settings that impact automation

## Validation Conventions

- Parse and validate request body before side effects
- Reject unknown enum values
- Enforce required keys (`id`, `action`, `workflowId`, etc.)

## Logging Requirements

For privileged actions, log:

- actor uid
- action type
- target resource
- timestamp
- result status/error

## Idempotency Guidance

- Use deterministic doc IDs where practical for tokens/settings
- For repeated command calls, design safe re-entry (`retry_failed`, `resume`)

## Versioning Guidance

- Current APIs are unversioned internal routes.
- For external clients, introduce `/api/v1/*` and preserve compatibility windows.
