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
