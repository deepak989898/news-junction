# Coding Standards

## 1) TypeScript Rules

- `strict: true` required
- Avoid `any`; prefer explicit interfaces/types
- Validate unknown data at boundaries (request body, external provider responses)
- Use bracket-safe access for dynamic Firestore records when necessary
- Keep module contracts in `types.ts`

## 2) Naming Conventions

- Variables/functions: `camelCase`
- Types/interfaces/enums/components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` only for true constants
- Files: kebab-case except React components (PascalCase)

## 3) Component Structure

- Split presentational UI and service calls where practical
- Prefer small reusable UI components in `components/`
- Keep screen/page components orchestration-focused
- Use loading/error/empty states explicitly

## 4) API Route Pattern

- File: `route.ts`
- Export `runtime = "nodejs"` when server dependencies required
- Guard auth first
- Validate input next
- Execute side effects
- Return structured JSON with clear errors

## 5) Firebase Service Pattern

- Put Firestore/Storage logic in service modules (`src/lib/*/service.ts`)
- Route handlers should orchestrate auth + request/response only
- Centralize shared access helpers (`verify-admin`, `verify-user`)

## 6) Hook Pattern

- Hooks should expose stable small contracts
- Avoid side effects in render paths
- Keep hooks pure unless explicitly service-bound

## 7) Error Handling Pattern

- Use `try/catch` around all async route handlers
- Return actionable error messages without leaking secrets
- Log privileged/system failures to collections (`systemLogs`, module logs)

## 8) Validation Pattern

- Validate request payloads before write operations
- Enforce required fields and allowed enum values
- Reject invalid workflow/step definitions before persistence

## 9) Logging Pattern

- Log privileged actions (settings/emergency/retries)
- Log AI actions with usage/cost metadata where available
- Use structured fields: `actionType`, `status`, `message`, `createdAt`, `metadata`

## 10) Import/Export Rules

- Prefer named exports for services/utilities
- Default export only for top-level page/component entrypoints
- Avoid circular imports across modules

## 11) Comments and Documentation

- Add concise comments only for non-obvious behavior
- Keep docs in `/docs` authoritative for architecture and governance
