# Environment Variables Setup Guide (Hindi)

## `.env.example` कहाँ है?

Project root: `.env.example` — सभी variables की सूची sanitized placeholders के साथ।

## Web (Next.js) — Local Development

1. `.env.example` को copy करें → `.env.local`
2. Firebase Console से values भरें
3. `npm run dev` चलाएँ

## Vercel में कैसे add करें?

1. Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Production, Preview, Development तीनों में same secrets (जहाँ ज़रूरी)
3. **Redeploy** करें — env change के बाद redeploy अनिवार्य

## Required Variables (Minimum Working Site)

| Variable | Required | Public? | Feature | Missing होने पर |
|----------|----------|---------|---------|----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Yes | Web + Admin UI | Firebase init fail |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Yes | Auth | Login fail |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Yes | Firestore | No data |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Yes | Images | Upload fail |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Yes | Firebase | Config incomplete |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Yes | Firebase | Config incomplete |
| `NEXT_PUBLIC_SITE_URL` | Yes | Yes | SEO, canonical | Wrong URLs |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes | **No** | All API routes | 500 errors |
| `CRON_SECRET` | Yes* | **No** | Cron automation | Crons blocked |
| `OPENAI_API_KEY` | Yes** | **No** | AI + images | AI disabled |

\* Automation cron के लिए  
\** AI features के लिए (या `GEMINI_API_KEY`)

## Optional Variables

| Variable | Feature | Status in code |
|----------|---------|----------------|
| `GEMINI_API_KEY` | Alt AI provider | Working |
| `GA4_*`, `GSC_*`, `CLARITY_*` | Analytics | Env check only |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Social tokens | Required for storage |
| `FACEBOOK_PAGE_ID`, `TELEGRAM_CHANNEL_ID` | Social post | FB/TG only |
| `STABILITY_API_KEY`, `IMAGEN_API_KEY` | Alt images | **Placeholder** |
| `ELEVENLABS_API_KEY` | Alt TTS | **Placeholder** |

## Mobile (Expo)

`mobile-app/` folder में `EXPO_PUBLIC_*` variables — web Firebase project same रखें।

`EXPO_PUBLIC_API_BASE_URL` = production Vercel URL (e.g. `https://news-junction.vercel.app`)

## Values कहाँ से मिलेंगी?

| Value | Source |
|-------|--------|
| Firebase public config | Firebase Console → Project Settings → Web app |
| Service account | Firebase Console → Project Settings → Service Accounts → Generate key |
| OpenAI | platform.openai.com → API Keys |
| Gemini | Google AI Studio |
| CRON_SECRET | खुद generate करें (32+ random chars) |

## Security Rules

- Secrets कभी git में commit न करें
- Client code में केवल `NEXT_PUBLIC_*`
- `FIREBASE_SERVICE_ACCOUNT_KEY` केवल Vercel server env में
