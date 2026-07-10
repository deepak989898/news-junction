# Push Notification Guide (Hindi)

## Current Status: NOT IMPLEMENTED

Push notification **delivery system** अभी पूरी तरह implement नहीं है।

## क्या exists है?

| Component | Status |
|-----------|--------|
| AI `push_notification` text | ✅ Content Studio |
| Mobile token registration | ✅ `userPushTokens` Firestore |
| Mobile admin notifications UI | ⚠️ UI only |
| Server FCM/Expo sender | ❌ Missing |
| Web push / service worker | ❌ Missing |
| `notifications` collection writer | ❌ Missing |

## Mobile App

- `mobile-app/services/notifications/push.ts` — Expo push token → Firestore
- `mobile-app/app/admin/notifications.tsx` — schedule UI
- **Bug:** POST `/api/operations/alerts` wrong payload — scheduling likely fails

## Required for Full Implementation

### Firebase Cloud Messaging
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- Service worker for web push
- FCM Admin SDK `messaging().send()` on server

### Expo Push
- Expo project ID (EAS)
- Server call to `https://exp.host/--/api/v2/push/send`

### Apple (iOS)
- APNs key in Apple Developer + EAS credentials

### Android
- `google-services.json` in Expo project

## Env Variables (Future)

```
# Not wired in current codebase:
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
EXPO_PUBLIC_PROJECT_ID=
FCM_SERVER_KEY=  # legacy — use Admin SDK
```

## Admin Test (Current)

❌ Mass notification send — **not available**

✅ AI push text generate: Content Studio → push_notification action

## Status Label

**NOT IMPLEMENTED** — caption/UI only

## Recommended Next Steps

1. Server route: `/api/notifications/send` with FCM/Expo
2. Fix mobile admin API contract
3. Admin composer on web admin
4. Delivery logs in `notifications` collection
