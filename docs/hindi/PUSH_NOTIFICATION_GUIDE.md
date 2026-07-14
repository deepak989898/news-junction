# Push Notification Guide (Hindi)

## Current Status: IMPLEMENTED (Expo Push)

Push notification **delivery** अब server पर implement है।

## क्या exists है?

| Component | Status |
|-----------|--------|
| AI `push_notification` text | ✅ Content Studio |
| Mobile token registration | ✅ `userPushTokens` Firestore |
| Mobile admin send UI | ✅ `/api/notifications/send` |
| Server Expo push sender | ✅ `src/lib/notifications/push-send.ts` |
| Auto-send on publish | ✅ `enrichArticleOnPublish` |
| Delivery logs | ✅ `pushLogs` + `notifications` |
| Web push / service worker | ❌ Optional future (VAPID) |

## Auto behaviour

हर published article (manual / automation / Google Trends) पर:
1. FAQ + internal links enrich होते हैं
2. Push text बनता है
3. Registered Expo tokens पर notification भेजी जाती है
4. `news/{id}.pushSentAt` से duplicate send रोकते हैं

## Env Variables

```
# Optional — for higher Expo rate limits
EXPO_ACCESS_TOKEN=

# Optional future web push
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Firebase Admin credentials already required for Firestore; Expo Push API public endpoint works without a key for basic volume.

## Admin Test

1. Mobile app में login → notifications allow → token `userPushTokens` में save
2. Web admin → publish any article **OR**
3. Mobile admin → Push Notifications → Send Now
4. Check Firestore `pushLogs` / `notifications`

## Status Label

**IMPLEMENTED** — Expo Push on publish + manual send
