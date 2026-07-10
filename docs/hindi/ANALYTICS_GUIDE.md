# Analytics Guide (Hindi)

## Status: PARTIALLY WORKING

Internal Firestore metrics real; external providers env-only; revenue placeholder.

## Data Sources

| Source | Real Data? | How |
|--------|------------|-----|
| Article views | ✅ Yes | Client `incrementNewsViews()` → Firestore `news.views` |
| Top articles/categories | ✅ Yes | Firestore queries |
| GA4 | ❌ No API pull | Env vars checked only |
| Google Search Console | ❌ No API pull | Env vars checked only |
| Microsoft Clarity | ❌ No API pull | Env vars checked only |
| Firebase Analytics (web) | ❌ No gtag script | Env check only |
| Revenue | ❌ Placeholder | `views * 0.002` formula |
| PDF export | ❌ Placeholder | Returns .txt file |
| Growth insights | ⚠️ Mixed | Rules + real AI recommendations |

## Admin Path

`/admin/ai/analytics-manager`  
`/admin/ai/operations` (integration status)

## Optional Env Variables

```
GA4_PROPERTY_ID=
GA4_CLIENT_EMAIL=
GA4_PRIVATE_KEY=
GSC_SITE_URL=
GSC_CLIENT_EMAIL=
GSC_PRIVATE_KEY=
CLARITY_PROJECT_ID=
CLARITY_API_TOKEN=
FIREBASE_ANALYTICS_MEASUREMENT_ID=
```

Missing होने पर: internal analytics still works; external cards show "Disconnected"

## Reports

| Report | Status |
|--------|--------|
| Daily summary | AI-generated from internal data |
| Weekly/Monthly | AI-generated |
| CSV export | Working |
| Excel export | Working |
| PDF export | PLACEHOLDER |

## Trending

- **Manual:** `isTrending` flag on article — homepage display ✅
- **AI discovery:** `trendSuggestions` from internal views — does NOT auto-set trending flag
- **Google Trends:** NOT IMPLEMENTED

## External Accounts (Optional)

- Google Analytics 4 property
- Google Search Console verified site
- Microsoft Clarity project

## Test

1. Article page खोलें → views increment (Firestore)
2. Analytics Manager → dashboard load
3. `/admin/system-verification` → Analytics Env test

## Status Labels

- Internal analytics: **VERIFIED WORKING** (views)
- External analytics: **NOT IMPLEMENTED** (API integration)
- Revenue cards: **PLACEHOLDER ONLY**
