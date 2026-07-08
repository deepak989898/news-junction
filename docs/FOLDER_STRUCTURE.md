# Folder Structure Standard

## Repository Root

- `src/` → Web app (Next.js)
- `mobile-app/` → Mobile app (Expo)
- `docs/` → Governance/architecture/standards docs
- Firebase and deployment configs:
  - `firestore.rules`
  - `firestore.indexes.json`
  - `storage.rules`
  - `firebase.json`
  - `vercel.json`

## Web App (`src/`)

- `app/`
  - `(public)/` public-facing pages
  - `admin/(protected)/` admin UIs
  - `api/` route handlers
- `components/` reusable UI/layout/admin components
- `contexts/` app-level providers (auth/language/settings)
- `firebase/` browser Firebase helpers
- `lib/`
  - domain modules (automation + AI + operations + orchestrator + personalization)
  - auth/permissions/security helpers
- `types/` TypeScript domain types

### API Route Pattern

`src/app/api/<domain>/<action>/route.ts`

Examples:

- `api/ai/seo-audit/route.ts`
- `api/personalization/recommendations/route.ts`
- `api/operations/health/route.ts`
- `api/orchestrator/workflows/route.ts`

## Mobile App (`mobile-app/`)

- `app/` expo-router routes
- `components/` reusable design system components
- `features/` feature slices
- `hooks/` hook wrappers
- `services/` integrations/business service facades
- `firebase/` Firebase setup
- `providers/` app-level providers
- `store/` minimal global state place
- `types/`, `constants/`, `utils/`, `theme/`, `config/`, `locales/`, `testing/`

## Folder Naming Rules

- lowercase kebab-case for folders (`ai-media`, `voice-video-studio` routes if path requires)
- Next.js route groups in parentheses only for route organization: `(public)`, `(protected)`, `(tabs)`
- Avoid deep nesting > 4 levels unless domain isolation requires it

## File Naming Rules

- Components: PascalCase (`AdminSidebar.tsx`)
- Hooks: `useX.ts` (`useThemePreference.ts`)
- Services/utility modules: kebab-case (`verify-admin.ts`, `client-api.ts`)
- Types/defaults: `types.ts`, `defaults.ts`, `service.ts`, `client-api.ts` per module

## Import Rules

- Use path aliases where configured:
  - Web: `@/* -> src/*`
  - Mobile: `@/* -> mobile-app/*`
- Avoid long relative traversals when alias exists
- Keep module boundaries clear (no cross-import from mobile to web and vice versa)
