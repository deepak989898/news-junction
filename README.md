# News Junction

Enterprise news platform with:

- Web app: Next.js + Firebase
- Mobile app: Expo React Native (`mobile-app/`)
- AI modules: content/seo/media/social/voice/editorial/analytics/personalization/operations/orchestrator

## Workspaces

- Web: repository root (`src/`)
- Mobile: `mobile-app/`

Both use the same Firebase project, but mobile is independently structured and built.

## Quick Start (Web)

1. Copy `.env.example` to `.env.local`
2. Install dependencies:
   - `npm install`
3. Run development server:
   - `npm run dev`

Build:

- `npm run build`

## Quick Start (Mobile)

1. `cd mobile-app`
2. Copy `mobile-app/.env.example` to `mobile-app/.env`
3. `npm install`
4. `npm run start`

## Docs

Governance and standards are in `/docs`:

- `docs/ARCHITECTURE.md`
- `docs/CODING_STANDARDS.md`
- `docs/FIRESTORE_SCHEMA.md`
- `docs/API_CONVENTIONS.md`
- `docs/SECURITY_RULES_GUIDE.md`
- `docs/AI_SAFETY_GUIDE.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/TESTING_STRATEGY.md`
- `docs/PHASE_ROADMAP.md`
- `docs/CHANGELOG.md`

## Safety and Security

- Never commit real secrets.
- Keep API keys server-side only.
- Enforce admin role checks on privileged routes.
- Use `CRON_SECRET` for cron endpoints.

See `SECURITY.md` for disclosure policy.
