# Newsletter Setup Guide (Hindi)

## Current Status

| Feature | Status |
|---------|--------|
| AI newsletter snippet text | PLACEHOLDER ONLY |
| Subscriber form | NOT IMPLEMENTED |
| Email delivery | NOT IMPLEMENTED |
| Daily/weekly digest cron | NOT IMPLEMENTED |
| Unsubscribe flow | NOT IMPLEMENTED |

## क्या काम करता है?

### AI Newsletter Snippet
- **Path:** `/admin/ai/content-studio`
- **Action:** `newsletter_snippet`
- **Result:** Article पर `newsletterSnippet` text field

### Newsletter Banner Image
- **Path:** `/admin/ai/media-studio`
- **Type:** `newsletter_banner`
- AI image for newsletter design — storage only

### In-App Digest (Not Email)
- Personalization module — in-app recommendations
- `/admin/ai/personalization`

## क्या नहीं है?

- ❌ SendGrid, Resend, Mailgun, Nodemailer
- ❌ `subscribers` collection management
- ❌ Subscribe form on public website
- ❌ Email templates + send cron
- ❌ Delivery logs

## Operations Health

`newsletter` health check = noop (`Promise.resolve()`) — always passes UI check

## External Account Needed (Future)

- SendGrid / Resend / Amazon SES account
- Verified sender domain

## Env Variables (Future — Not in codebase)

```
# Example for future integration:
RESEND_API_KEY=
NEWSLETTER_FROM_EMAIL=news@yourdomain.com
```

## Admin Test (Current)

1. Content Studio → article select → newsletter_snippet generate
2. Text field में snippet दिखे — **email नहीं जाएगा**

## Status Labels

- Newsletter generation (text): **PLACEHOLDER ONLY**
- Newsletter delivery: **NOT IMPLEMENTED**

## Cost

Email provider pricing applies when implemented — currently **no cost** (not built)
