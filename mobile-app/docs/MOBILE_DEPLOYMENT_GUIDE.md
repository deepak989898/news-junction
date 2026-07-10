# Mobile Deployment Guide

## Environments
- Development: local dev client and debug instrumentation.
- Internal: team/internal testing builds.
- QA: test cycles with release-like configs.
- Staging: pre-prod validation.
- Production: store-ready signed builds.
- Hotfix: urgent patch profile with isolated release channel.

## Required env vars
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_APP_VERSION`
- `EXPO_PUBLIC_RELEASE_CHANNEL`
- `EXPO_PUBLIC_FEATURE_FLAGS`
- `EXPO_PUBLIC_SENTRY_DSN`
- Firebase public vars (`EXPO_PUBLIC_FIREBASE_*`)

## Build commands
- Dev client: `eas build --profile development --platform all`
- Internal: `eas build --profile internal --platform all`
- QA: `eas build --profile qa --platform all`
- Staging: `eas build --profile staging --platform all`
- Production: `eas build --profile production --platform all`
- Hotfix: `eas build --profile hotfix --platform all`

## Submit
- Android: `eas submit --platform android --profile production`
- iOS: `eas submit --platform ios --profile production`

## Rollback plan
1. Set remote config `emergencyDisable = true` if critical outage.
2. Toggle risky flags off in runtime config.
3. Ship hotfix through `hotfix` profile.
4. If needed, force minimum version and redirect users to store update.
