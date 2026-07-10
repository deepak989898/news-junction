# Automation Test Guide (Hindi)

## Workflow Overview

```
Fetch → rawNews (fetched)
  → Process (AI) → pendingApproval
    → Admin Approve → news (published) → Website
```

## पूर्व शर्तें

- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` set
- [ ] `OPENAI_API_KEY` या `GEMINI_API_KEY` set
- [ ] Sources added (`/admin/sources`)
- [ ] Automation enabled (`/admin/automation` toggle)

## Test 1: RSS Fetch (Safe)

1. `/admin/system-verification` → **RSS Fetch** → should pass
2. `/admin/automation` → **Run Fetch Now**
3. Check logs — "Fetched X items"

**Expected:** `rawNews` docs with status `fetched` or `duplicate`

**No auto-publish** — default auto-publish OFF

## Test 2: Process (AI)

1. `/admin/automation` → **Run Process Now** (up to 5)
2. Wait 30–60s per item (AI call)

**Expected:** Queue (`/admin/automation/queue`) में `PendingApproval` items

## Test 3: Approve (Manual — publishes to website)

1. `/admin/automation/queue` → एक item select
2. **Approve** (green check)
3. Wait for image generation (up to 2 min)

**Expected:**
- Website homepage पर article
- Firestore `news` → `status: published`
- `imageUrl` = Firebase Storage URL (not `/logo.png`)

## Test 4: Duplicate Detection

1. Same RSS source दोबारा fetch करें
2. Duplicate items → status `duplicate` in rawNews

**Matching:** Exact URL + Jaccard title similarity (threshold 0.75 default)

## Test 5: Cron (Production)

```bash
curl -H "Authorization: Bearer CRON_SECRET" https://YOUR_DOMAIN/api/cron/fetch-news
```

**Requires:** `CRON_SECRET` on Vercel

## GDELT Test

1. `/admin/sources` → Add source type **GDELT**
2. Run fetch — GDELT API items (no images usually)

## Image Repair (Published articles)

Browser console (logged in as admin):

```javascript
fetch('/api/automation/repair-images', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ repairAll: true })
}).then(r => r.json()).then(console.log)
```

## Failure Behaviour

| Failure | Result |
|---------|--------|
| Automation disabled | Fetch/process no-op |
| No API key | Process → failed |
| Duplicate | status duplicate, not in queue |
| Timeout | failed status + errorMessage |
| No CRON_SECRET | Cron 401 |

## Daily Limits (defaults)

- `maxArticlesPerDay`: check automation settings
- Cron process: 2 items per run only

## Status Labels

| Component | Status |
|-----------|--------|
| RSS fetch | VERIFIED WORKING (BBC test) |
| GDELT | IMPLEMENTED – CONFIG REQUIRED |
| AI process | IMPLEMENTED – CONFIG REQUIRED |
| Approve/publish | IMPLEMENTED – CONFIG REQUIRED |
| Auto-publish | OFF by default |
| Manual source type | NOT IMPLEMENTED (skipped) |
