# Audio News Guide (Hindi)

## Status: PARTIALLY WORKING

OpenAI TTS real है; alternative providers placeholder; video render नहीं।

## Features

| Feature | Status | Provider |
|---------|--------|----------|
| Voice script (Hindi/English) | ✅ | OpenAI/Gemini text |
| TTS audio MP3 | ✅ | OpenAI `gpt-4o-mini-tts` |
| Firebase upload | ✅ | `ai-voice-video/` path |
| Subtitles SRT/VTT | ⚠️ | Rule-based (not word-aligned) |
| Video package | ⚠️ | Script + thumbnail only — no MP4 |
| Digest audio | ❌ | Scripts only, URLs empty |
| ElevenLabs | ❌ Placeholder | — |
| Google Cloud TTS | ❌ Placeholder | — |

## Admin Path

`/admin/ai/voice-video-studio`

## Workflow

1. Article select करें
2. **Generate Voice Script** (Hindi and/or English)
3. **Generate Audio** → MP3 uploaded to Firebase
4. **Approve** → article पर `audioHiUrl` / `audioEnUrl` set
5. Public article page पर audio player

## Environment

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
FIREBASE_SERVICE_ACCOUNT_KEY=...
```

## Public Display

`/article/{slug}` — audio player if `audioHiUrl` or `audioEnUrl` present

## Voice Policy

Code uses generic OpenAI TTS voices — **no celebrity/politician voice cloning** in implementation.

## Cost

OpenAI TTS per character — monitor in Operations Cost Monitor

## Test

1. Voice & Video Studio → select published article
2. Generate script → generate audio
3. Article page पर play button check करें

## Common Errors

| Error | Fix |
|-------|-----|
| No OPENAI_API_KEY | Vercel env |
| Upload failed | Storage rules + bucket |
| Provider placeholder | Use OpenAI only |

## Status Labels

- Audio generation: **PARTIALLY WORKING**
- Video render: **NOT IMPLEMENTED**
- Alt TTS: **PLACEHOLDER ONLY**
