# Environment Variables

## Web (Next.js + API)

### Public client vars (`NEXT_PUBLIC_*`)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_SITE_URL`

### Server-only secrets

- `CRON_SECRET`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (required for Google Gemini image generation; also used for Gemini text)
- `IMAGEN_API_KEY` (deprecated alias — use `GEMINI_API_KEY` instead)
- `ELEVENLABS_API_KEY` (optional provider)
- `GOOGLE_CLOUD_TTS_API_KEY` (optional provider)

### Analytics provider integrations (optional)

- `GA4_PROPERTY_ID`
- `GA4_CLIENT_EMAIL`
- `GA4_PRIVATE_KEY`
- `GSC_SITE_URL`
- `GSC_CLIENT_EMAIL`
- `GSC_PRIVATE_KEY`
- `CLARITY_PROJECT_ID`
- `CLARITY_API_TOKEN`
- `FIREBASE_ANALYTICS_MEASUREMENT_ID`

### Social manager

- `SOCIAL_TOKEN_ENCRYPTION_KEY`
- `FACEBOOK_PAGE_ID`
- `TELEGRAM_CHANNEL_ID`

### Firebase Admin SDK

Option A:

- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string)

Option B:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Mobile (Expo)

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_APP_VERSION`
- `EXPO_PUBLIC_FEATURE_FLAGS`

## Governance Rules

- Never commit real values to git.
- Use environment-specific secrets in Vercel/EAS/Firebase CI only.
- Rotate leaked or shared secrets immediately.
- Keep `.env.example` sanitized placeholders only.
