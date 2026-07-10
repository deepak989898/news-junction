# Vercel Setup Guide (Hindi)

## Project Connection

1. GitHub repo connect करें
2. **Root Directory:** project root (Next.js app)
3. **Framework:** Next.js (auto-detect)
4. **Build Command:** `npm run build` (default)
5. **Output:** Next.js default

## Node Version

`package.json` engines check करें — Vercel usually Node 20.x

## Environment Variables Checklist

Production में ये set करें:

- [ ] `NEXT_PUBLIC_FIREBASE_*` (6 variables)
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://news-junction.vercel.app` (या custom domain)
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` (पूरी JSON single line)
- [ ] `CRON_SECRET`
- [ ] `OPENAI_API_KEY`
- [ ] (Optional) `GEMINI_API_KEY`

**Redeploy** after every env change.

## Cron Jobs (`vercel.json`)

| Cron | Schedule (UTC) | Route |
|------|----------------|-------|
| fetch-news | 03:00 daily | `/api/cron/fetch-news` |
| process-news | 03:15 daily | `/api/cron/process-news` |
| cleanup | 04:00 daily | `/api/cron/cleanup` |

### Cron Requirements

- `CRON_SECRET` **अनिवार्य** — missing होने पर सभी cron 401
- Vercel Hobby: cron + function timeout limits (60s)
- Approve route: 120s (Pro recommended for heavy AI image)

## Function Timeouts (`vercel.json`)

| Route | maxDuration |
|-------|-------------|
| `/api/automation/approve` | 120s |
| `/api/automation/trigger` | 60s |
| `/api/cron/fetch-news` | 60s |
| `/api/cron/process-news` | 60s |

## Domain

1. Vercel → Domains → add custom domain
2. `NEXT_PUBLIC_SITE_URL` update करें
3. Firebase Auth → Authorized domains में domain add करें

## Manual Cron Test

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR_DOMAIN/api/cron/fetch-news
```

## Deployment Commands

```bash
git push origin main
# Vercel auto-deploys
# या
npx vercel --prod
```

## Verification

1. Deploy success in Vercel dashboard
2. `/admin/login` works
3. `/admin/system-verification` → tests pass
4. Vercel → Logs में cron entries (03:00 UTC के बाद)

## Common Issues

| Issue | Fix |
|-------|-----|
| API returns HTML not JSON | Redeploy; check route path |
| FUNCTION_INVOCATION_TIMEOUT | Reduce batch size; upgrade Pro |
| Cron not running | CRON_SECRET + Hobby cron limits |
| Env not applied | Redeploy after env add |
