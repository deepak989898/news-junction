# Firebase Setup Guide (Hindi)

## Project

आपका project: Firebase Console में configured (e.g. `brightkids-61594`)

## Step-by-Step Setup

### 1. Authentication

1. Firebase Console → **Authentication** → Sign-in method
2. **Email/Password** enable करें
3. **Authorized domains** में add करें:
   - `localhost`
   - `news-junction.vercel.app`
   - custom domain (अगर है)

### 2. Firestore Database

1. Firestore create करें (region: `nam5` per `firebase.json`)
2. Rules deploy: `firestore.rules`
3. Indexes deploy: `firestore.indexes.json`

### 3. Storage

1. Storage bucket enable
2. Rules deploy: `storage.rules`
3. Paths: `news/`, `media/`, `ai-media/`, `ai-voice-video/`

### 4. Admin User बनाना

1. Authentication में user create करें (email/password)
2. Firestore → `users` collection → document ID = user UID:

```json
{
  "email": "admin@example.com",
  "name": "Admin Name",
  "role": "super_admin",
  "createdAt": "<timestamp>"
}
```

**Roles:** `super_admin`, `editor` (web admin)

### 5. Service Account (Server)

1. Project Settings → Service Accounts → Generate new private key
2. JSON को Vercel में `FIREBASE_SERVICE_ACCOUNT_KEY` के रूप में set करें (single line)

### 6. Client Config (Web)

Firebase Console → Web app → config values → `NEXT_PUBLIC_FIREBASE_*`

## Deploy Commands

```bash
# Firebase CLI login
firebase login

# Project select
firebase use your-project-id

# Rules + indexes + storage
firebase deploy --only firestore:rules,firestore:indexes,storage

# Full deploy (hosting अलग है — site Vercel पर)
firebase deploy --only firestore,storage
```

## Security Warning — Catch-All Rule

`firestore.rules` में temporary catch-all rule है जो **2029 तक** unlisted collections को public read/write दे सकती है।

**Production से पहले:** explicit rules add करें और catch-all हटाएँ (admin approval के बाद)।

Collections needing explicit rules:
- `workflowDefinitions`, `jobExecutions`, `aiModules`, `eventLogs`
- `notifications`, mobile AI chat collections

## Collections (मुख्य)

| Collection | Purpose |
|------------|---------|
| `news` | Published articles |
| `categories` | Categories |
| `sources` | RSS/GDELT sources |
| `rawNews` | Automation queue |
| `automationLogs` | Fetch/process logs |
| `users` | Admin roles |
| `settings` | Site + automation settings |

## Mobile App

Same Firebase project use करें — `EXPO_PUBLIC_FIREBASE_*` = same values as web.

## Verification

1. `/admin/login` — login success
2. `/admin/system-verification` → Firebase tests pass
3. Firestore Console → `news`, `sources` visible

## Troubleshooting

| Error | Fix |
|-------|-----|
| Missing index | `firebase deploy --only firestore:indexes` |
| Permission denied | Check `users` role + rules |
| Storage upload fail | Check `storage.rules` + admin role |
| Admin API 500 | `FIREBASE_SERVICE_ACCOUNT_KEY` on Vercel |
