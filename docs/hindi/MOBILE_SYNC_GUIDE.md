# Mobile Sync Guide (Hindi)

## Status: PARTIALLY WORKING

Reader app Firestore से data लेता है; admin mobile partial; full sync incomplete.

## Architecture

| Layer | Method |
|-------|--------|
| Reader news | Direct Firestore (`mobile-app/services/news/firestore.ts`) |
| Admin APIs | REST + Firebase token → `/api/mobile/admin/*` |
| AI reader | `/api/mobile/ai/*` |
| Runtime config | `/api/mobile/runtime/config` |

## Same Firebase Project?

✅ हाँ — `EXPO_PUBLIC_FIREBASE_*` = same as `NEXT_PUBLIC_FIREBASE_*`

## Working Features

| Feature | Status |
|---------|--------|
| Home feed (featured/trending/breaking) | ✅ |
| Article detail | ✅ |
| Categories | ✅ |
| Bookmarks | ✅ Firestore user collection |
| Reading history | ✅ |
| Comments | ✅ |
| Offline article cache | ✅ |
| Admin dashboard | ✅ `/api/mobile/admin/dashboard` |
| Admin article status | ✅ |
| Admin user roles | ✅ super_admin only for users |
| Admin search | ✅ |

## Partial / Broken

| Feature | Issue |
|---------|-------|
| Mobile admin Operations | Web API needs editor/super_admin — moderator blocked |
| Push notifications admin | API payload mismatch |
| Background sync | `futureSyncPlaceholder()` — not implemented |
| Google Sign-In | Placeholder on login screen |
| Reset password (admin users) | No-op button |
| TypeScript build | ~40+ errors reported in audit |

## Required Env (mobile-app)

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_API_BASE_URL=https://your-vercel-domain.vercel.app
EXPO_PUBLIC_APP_VERSION=1.0.0
```

Optional: `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_FEATURE_FLAGS`

## EAS / Store

See `mobile-app/docs/` for deployment guides (RELEASE_GUIDE, STORE_PREPARATION_CHECKLIST)

## Role Mismatch

| Role | Web Admin | Mobile Admin APIs |
|------|-----------|-------------------|
| super_admin | ✅ | ✅ |
| editor | ✅ | ✅ write |
| moderator | ❌ web shell issue | ✅ mobile write |
| viewer | ❌ | ✅ read only |

## Test Mobile Sync

1. Publish article on web admin
2. Mobile app refresh — article should appear (same Firestore)
3. `EXPO_PUBLIC_API_BASE_URL` correct होना चाहिए

## Build Test

```bash
cd mobile-app
npm install
npx tsc --noEmit
```

## Status Label

**PARTIALLY WORKING** — reader sync yes; admin + push + background sync gaps
