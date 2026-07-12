# Social Media Setup Guide (Hindi)

## दो अलग चीज़ें

### 1. Caption Generation ✅
AI से Facebook, Instagram, X, LinkedIn, Telegram captions — **काम करता है** (API key चाहिए)

### 2. Actual Posting ⚠️
केवल **Facebook** और **Telegram** — बाकी platforms "setup required" error

## Caption Generation

### Admin कहाँ?
`/admin/ai/social-manager`

### Steps
1. Published article select करें
2. Platforms choose करें
3. **Generate** → AI captions
4. Review → Schedule (queue में)

### Env
`OPENAI_API_KEY` या `GEMINI_API_KEY`

## Actual Publishing (Facebook + Telegram)

### Required Env
```
SOCIAL_TOKEN_ENCRYPTION_KEY=random_32_char_string
FACEBOOK_PAGE_ID=your_page_id
TELEGRAM_CHANNEL_ID=@yourchannel
```

### Social Accounts
`/admin/social/accounts` → Connect account → token encrypted store

### Process Queue
`/admin/ai/social-manager` → Process Queue  
या API: `/api/ai/social/process-queue`

### Auto-publish Cron (Vercel Hobby)
Vercel **Hobby (free)** plan par cron **sirf 1 baar per day** chal sakta hai.  
Is project mein: `/api/cron/process-social-queue` — daily ~10 AM IST (`30 4 * * *` UTC).

**Har 15 minute auto-publish** ke liye (Hobby par Vercel cron se nahi):
1. [cron-job.org](https://cron-job.org) ya [EasyCron](https://www.easycron.com) (free) use karein
2. URL: `https://news-junction.vercel.app/api/cron/process-social-queue`
3. Method: GET
4. Header: `Authorization: Bearer YOUR_CRON_SECRET`
5. Schedule: har 15 minute (business hours ke liye custom schedule)

**Ya** Vercel **Pro plan** upgrade karein — tab Vercel cron har 15 min chala sakte hain.

**Instant publish:** Admin → AI Social Manager → **Publish Now** (cron ki zaroorat nahi).

## Platform Status

| Platform | Caption | Post |
|----------|---------|------|
| Facebook | ✅ | ✅ Graph API |
| Telegram | ✅ | ✅ Bot API |
| X (Twitter) | ✅ | ❌ OAuth needed |
| LinkedIn | ✅ | ❌ OAuth needed |
| Instagram | ✅ | ❌ Graph setup needed |
| WhatsApp | ✅ | ❌ Placeholder |
| YouTube | ✅ | ❌ Placeholder |

## External Accounts

- **Facebook:** Meta Developer App + Page access token
- **Telegram:** @BotFather → bot token + channel admin

## Analytics Sync

`/api/ai/social/analytics-sync` — **PLACEHOLDER** — returns `synced: false`

## Status

- Caption generation: **IMPLEMENTED – CONFIGURATION REQUIRED**
- Auto-posting: **PARTIALLY WORKING**
- Platform analytics pull: **NOT IMPLEMENTED**

## Test (Safe)

Caption generate करें — **post न करें** जब तक tokens configure न हों।
