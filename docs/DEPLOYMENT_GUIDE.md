# Deployment Guide

## 1) Local Development

Web:

1. `npm install`
2. copy `.env.example` to `.env.local`
3. `npm run dev`

Mobile:

1. `cd mobile-app`
2. `npm install`
3. copy `.env.example` to `.env`
4. `npm run start`

## 2) Firebase Setup

- Create/select Firebase project
- Enable Authentication providers in use
- Firestore database in production mode with rules deployed
- Storage bucket configured with `storage.rules`

Deploy rules/indexes:

- `firebase deploy --only firestore:rules`
- `firebase deploy --only firestore:indexes`
- `firebase deploy --only storage`

## 3) Vercel Setup (Web)

- Connect Git repo
- Set environment variables from `docs/ENVIRONMENT_VARIABLES.md`
- Ensure production branch strategy
- Confirm cron configuration from `vercel.json`

## 4) Cron Setup

- Use Vercel cron schedules defined in `vercel.json`
- Protect cron endpoints with `CRON_SECRET`
- Monitor cron logs via Operations dashboard + Vercel logs

## 5) Build and Release

Web:

- `npm run build`
- deploy via Vercel

Mobile:

- `eas build --profile development|preview|production`
- use channel strategy for Expo Updates

## 6) GitHub Workflow (Recommended)

- PR checks:
  - typecheck
  - lint
  - build
  - rule syntax validation
- Block merge on failed checks

## 7) Production Checklist

- [ ] Env vars set and validated
- [ ] Firestore/Storage rules deployed
- [ ] Indexes deployed
- [ ] Build and runtime smoke tests pass
- [ ] Admin auth and role gates verified
- [ ] Cron endpoints secured
- [ ] Monitoring dashboards healthy

## 8) Rollback Plan

Web rollback:

- revert to previous Vercel deployment
- validate cron and env compatibility

Firebase rollback:

- restore previous rules/index files from git history and redeploy

Operational rollback:

- enable safe mode / pause automation in operations + orchestrator
- clear failing queue states only through safe controls
