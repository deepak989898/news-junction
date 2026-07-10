# News Junction — पूर्ण Admin गाइड (Hindi)

> अंतिम अपडेट: जुलाई 2026 | सिस्टम ऑडिट के आधार पर

यह दस्तावेज़ बताता है कि News Junction में **क्या वास्तव में काम करता है**, admin इसे **कहाँ देखे**, और **क्या manually setup करना होगा**।

**System Verification पेज:** `/admin/system-verification` (केवल Super Admin)

---

## कुल स्थिति (संक्षेप)

| स्तर | विवरण |
|------|--------|
| **Overall** | **Partially Ready** — core CMS + automation + AI tools काम कर सकते हैं |
| **Production Ready नहीं** | Newsletter delivery, push sender, full SEO metadata, mobile admin gaps |
| **Configuration ज़रूरी** | Firebase Admin, CRON_SECRET, OPENAI_API_KEY, automation enable |

---

## 1. स्वचालित समाचार संग्रह (RSS / GDELT)

### यह क्या करता है?
RSS feeds और GDELT से समाचार fetch करके `rawNews` collection में सेव करता है।

### यह कैसे काम करता है?
1. Cron या manual "Run Fetch" → `fetch-pipeline.ts`
2. RSS parser (`rss-fetcher.ts`) या GDELT API
3. Duplicate check → `rawNews` में status `fetched` या `duplicate`

### Admin इसे कहाँ देखेगा?
- **Sources:** `/admin/sources`
- **Automation:** `/admin/automation`
- **Approval Queue:** `/admin/automation/queue`

### इसे test कैसे करें?
1. `/admin/system-verification` → **RSS Fetch** test
2. `/admin/automation` → "Run Fetch Now"
3. Queue में items दिखें

### Working होने पर क्या दिखाई देगा?
- Automation logs में fetch entries
- Queue में BBC/अन्य source के items thumbnails के साथ

### Error होने पर क्या दिखाई देगा?
- "Automation disabled"
- "Unauthorized" (cron secret missing)
- Firebase Admin error

### Environment variables
`FIREBASE_SERVICE_ACCOUNT_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_FIREBASE_*`

### External accounts
Firebase, Vercel (cron)

### क्या automatic है?
हाँ — अगर `automationEnabled: true` और cron configured

### Admin manually क्या करे?
Sources add करें, automation enable करें, approve करें

### Cost?
RSS/GDELT — मुफ़्त; Vercel cron Hobby plan limits

### Status
**IMPLEMENTED – CONFIGURATION REQUIRED** (default: automation off)

---

## 2. AI हिंदी / अंग्रेज़ी लेख

### यह क्या करता है?
Source से Hindi + English headline, summary, full article, tags, SEO fields generate करता है।

### कैसे काम करता है?
`process-pipeline` → `ai-processor` → OpenAI (`gpt-4o-mini`) या Gemini (`gemini-1.5-flash`)

### Admin कहाँ?
`/admin/automation/queue`, `/admin/ai/content-studio`

### Test
Process run करें → queue में AI content देखें

### Env
`OPENAI_API_KEY` या `GEMINI_API_KEY`

### Status
**IMPLEMENTED – CONFIGURATION REQUIRED** — real API, mock नहीं

---

## 3. AI छवि (Featured Image)

### यह क्या करता है?
Approve पर OpenAI `gpt-image-1` से image या RSS image को Firebase पर host करता है।

### Admin कहाँ?
`/admin/automation/settings` → "Generate AI Featured Images"

### Test
Approve एक article → Firestore `news.imageUrl` में `firebasestorage.googleapis.com` URL होनी चाहिए

### Env
`OPENAI_API_KEY`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### Status
**PARTIALLY WORKING** — Imagen/Stability placeholder हैं

---

## 4. SEO, Sitemap, Schema

### Status
**PARTIALLY WORKING**
- AI SEO Manager: real
- Sitemap: अब published articles include (Firebase configured होने पर)
- Article metadata: कुछ client-side — crawlers के लिए कमज़ोर

### Admin कहाँ?
`/admin/ai/seo-manager`, `/sitemap.xml`, `/robots.txt`

---

## 5. Social Media

### Caption generation
**IMPLEMENTED** — AI से multi-platform captions

### Actual posting
**PARTIALLY WORKING** — केवल Facebook + Telegram; X/LinkedIn/Instagram setup required error

### Admin
`/admin/ai/social-manager`, `/admin/social/accounts`

---

## 6. Push Notifications

### Status
**NOT IMPLEMENTED** — केवल AI push text; server sender नहीं

---

## 7. Newsletter

### Status
**NOT IMPLEMENTED** (delivery) — केवल AI `newsletter_snippet` text field

---

## 8. Audio News

### Status
**PARTIALLY WORKING** — OpenAI TTS + MP3 upload; video render नहीं

### Admin
`/admin/ai/voice-video-studio`

---

## 9. Analytics

### Status
**PARTIALLY WORKING**
- Firestore `views` — real
- GA4/GSC/Clarity — env presence only, no API pull
- Revenue — placeholder formula

### Admin
`/admin/ai/analytics-manager`

---

## 10. Duplicate Detection

### Status
**VERIFIED WORKING** — URL + title similarity (Jaccard) + slug

### Admin
`/admin/automation/settings` → duplicate threshold

---

## 11. Mobile App

### Status
**PARTIALLY WORKING**
- Reader: Firestore direct — works
- Admin mobile: कुछ APIs role mismatch

### Docs
`MOBILE_SYNC_GUIDE.md`

---

## Admin Pages — Quick Reference

| Page | URL |
|------|-----|
| Dashboard | `/admin` |
| News | `/admin/news` |
| Sources | `/admin/sources` |
| Automation | `/admin/automation` |
| Approval Queue | `/admin/automation/queue` |
| Automation Settings | `/admin/automation/settings` |
| System Verification | `/admin/system-verification` |
| AI Content Studio | `/admin/ai/content-studio` |
| AI SEO Manager | `/admin/ai/seo-manager` |
| AI Media Studio | `/admin/ai/media-studio` |
| AI Voice & Video | `/admin/ai/voice-video-studio` |
| AI Analytics | `/admin/ai/analytics-manager` |
| AI Operations | `/admin/ai/operations` |
| Social Manager | `/admin/ai/social-manager` |
| Settings | `/admin/settings` |

---

## Website पर content कैसे दिखेगा?

1. Source fetch → Process → **Admin Approve** → `news` collection `status: published`
2. Homepage: `/` — published articles only
3. Article: `/article/{slug}`

**ध्यान:** Auto-publish default **OFF** है — admin approval ज़रूरी।

---

## अगले कदम (Production के लिए)

1. Vercel env vars set करें (`.env.example` देखें)
2. Firebase rules deploy करें (catch-all rule tighten करें)
3. Automation enable + sources add
4. CRON_SECRET set
5. एक article approve करके website verify करें
6. `/admin/system-verification` से सभी tests run करें

विस्तृत guides: इसी folder में अन्य `.md` files।
