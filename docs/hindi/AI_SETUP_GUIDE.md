# AI Setup Guide (Hindi)

## Supported Providers

| Provider | Text | Images | TTS |
|----------|------|--------|-----|
| OpenAI | ✅ Real | ✅ gpt-image-1 | ✅ gpt-4o-mini-tts |
| Gemini | ✅ gemini-1.5-flash | ❌ | ❌ |
| Google Gemini Image | ✅ gemini-3.1-flash-image | ❌ | ❌ |
| ElevenLabs/Google TTS | — | — | ❌ Placeholder |

## Environment Variables

```
OPENAI_API_KEY=sk-...        # Primary — text, images, TTS
GEMINI_API_KEY=...           # Optional alt text provider
```

**कभी client-side में expose न करें** — सभी calls server API routes से।

## Provider Selection

`/admin/automation/settings` → AI Provider: `openai` या `gemini`

**Note:** AI images हमेशा OpenAI use करते हैं (Gemini text के साथ भी)।

## AI Modules

| Module | Admin Path | API |
|--------|------------|-----|
| Automation articles | `/admin/automation` | process-pipeline |
| Content Studio | `/admin/ai/content-studio` | `/api/ai/content-action` |
| SEO Manager | `/admin/ai/seo-manager` | `/api/ai/seo-*` |
| Media Studio | `/admin/ai/media-studio` | `/api/ai/media/*` |
| Voice & Video | `/admin/ai/voice-video-studio` | `/api/ai/generate-*` |
| Editorial | `/admin/ai/editorial-manager` | `/api/ai/review-*` |
| Analytics insights | `/admin/ai/analytics-manager` | `/api/ai/growth-insights` |

## Cost Controls

- Automation daily caps in settings
- Operations → Cost Monitor (`/admin/ai/operations`)
- AI logs collection

## Safe Test

`/admin/system-verification` → OpenAI Key check (presence)  
Super Admin → **OpenAI Ping** (minimal API call)

## Common Errors

| Error | Fix |
|-------|-----|
| No AI provider configured | Set OPENAI_API_KEY on Vercel |
| OpenAI 401 | Invalid/expired key |
| Image generation failed | Check OPENAI_API_KEY + billing |
| Timeout on approve | Vercel Pro or disable AI images temporarily |

## Status

- Text generation: **IMPLEMENTED – CONFIGURATION REQUIRED**
- Images: **PARTIALLY WORKING**
- Alt providers: **PLACEHOLDER ONLY**
