# Location & District Setup Guide (Hindi/English)

## Overview

News Junction uses **762 Indian districts** and **755+ cities** from a normalized dataset.
Location data powers: local news feed, राज्य page, automation geo-mapping, and mobile sync.

## Dataset

- **Source:** LGD-style India districts (iaseth/data-for-india)
- **Files:** `src/lib/location/data/india-districts.json`
- **Refresh:** `npm run import:districts`

## Step 1: Deploy latest code

Ensure Vercel has the latest build with location + chunked seed fix.

## Step 2: Firestore indexes

```bash
firebase deploy --only firestore:indexes
```

Required for geo queries: `stateId`, `districtId`, `cityId`, `geoScope` on `news` collection.

## Step 3: Seed locations (Admin)

1. Login: `/admin/login` (super_admin or editor)
2. Open: `/admin/locations`
3. Click **Seed Firestore locations**
4. Wait for progress — seeds in chunks (states → districts → cities)
5. Success toast: "Firestore locations seeded successfully"

## Step 4: Backfill existing articles

1. **Backfill (dry run)** — preview mapping
2. **Backfill locations** — apply geo fields to published articles
3. Manually reviewed articles (`locationReviewed: true`) are skipped

## Step 5: Test on website

1. Header → **अपना क्षेत्र चुनें**
2. Select State (e.g. Uttar Pradesh) → District list loads from API
3. Optional: City
4. Homepage shows local sections: city → district → state → national
5. `/category/rajya` — state/district news (not empty)
6. `/state/uttar-pradesh` — state page

## API endpoints (web + mobile)

| URL | Purpose |
|-----|---------|
| `GET /api/locations` | All states + meta |
| `GET /api/locations/districts?stateId=IN-UP` | Districts for state |
| `GET /api/locations/cities?districtId=UP-LU` | Cities for district |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Seed JSON error / timeout | Use chunked seed (latest code); redeploy |
| Districts empty in selector | Check `/api/locations/districts?stateId=IN-UP` in browser |
| राज्य page empty | Run backfill; new articles get geo on publish |
| 404 on docs links | Use `/docs/hindi/LOCATION_SETUP_GUIDE.md` after deploy |

## Vercel env vars

Same as main setup: Firebase Admin, `OPENAI_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.

No extra env vars required for location feature.
