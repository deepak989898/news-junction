# News Junction Mobile (Phase 6E)

Standalone Expo + React Native foundation connected to the existing Firebase project.

## Quick start

1. Copy `.env.example` to `.env`
2. Install dependencies: `npm install`
3. Start dev server: `npm run start`
4. Run Android/iOS with `npm run android` / `npm run ios`

## Scope

- Reader app (6B), AI experience (6C), admin/operations (6D), and enterprise readiness/release tooling (6E).
- Backend logic stays on existing web APIs/Firebase; mobile consumes wrappers only.

## Enterprise readiness

- Runtime config and update gating support.
- Crash reporting integration scaffolding (`Sentry`).
- Performance metric tracking service.
- Diagnostics and app health screens.
- Background sync task registration scaffold.
- Release profiles in `eas.json`.
- Deployment and QA documentation in `mobile-app/docs/`.

## Notes

- App is intentionally separate from web code.
- Uses same Firebase project credentials.
- Google Sign-In remains scaffolded placeholder.
