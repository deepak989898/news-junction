# Troubleshooting Guide (Hindi)

## General

1. `/admin/system-verification` — safe tests run करें
2. Vercel → Logs check करें
3. Firebase Console → Firestore/Storage/Auth
4. Browser hard refresh (Ctrl+Shift+R)

---

## Login / Auth

| Problem | Solution |
|---------|----------|
| Admin login fail | Firebase Auth enabled? `users` doc exists? |
| Access denied | Role `super_admin` or `editor` in Firestore |
| API 401 | Token expired — re-login |

---

## Automation

| Problem | Solution |
|---------|----------|
| No content on website | Articles `published` status? Approve from queue |
| Fetch returns nothing | Automation enabled? Active sources? |
| Process fails | OPENAI_API_KEY set? Check rawNews `errorMessage` |
| Cron not running | CRON_SECRET on Vercel? Redeploy |
| FUNCTION_INVOCATION_TIMEOUT | Smaller batches; Vercel Pro |
| Duplicate on process | Normal — lower threshold or ignore |
| Images show logo on site | Re-approve or `/api/automation/repair-images` |

---

## Images

| Problem | Solution |
|---------|----------|
| Upload fail in admin | Storage rules; super_admin/editor role |
| BBC image on site but broken | Should be Firebase URL after approve fix |
| AI image fail | OPENAI_API_KEY + billing; falls back to RSS host |

---

## API Errors

| Problem | Solution |
|---------|----------|
| HTML instead of JSON | Wrong URL or server error — check Vercel logs |
| 500 on all APIs | FIREBASE_SERVICE_ACCOUNT_KEY missing/invalid |
| Firebase Admin credentials missing | Set on Vercel, redeploy |

---

## SEO / Sitemap

| Problem | Solution |
|---------|----------|
| Articles not in sitemap | Firebase Admin on server; redeploy sitemap fix |
| Social preview wrong | Article metadata client-side — known limitation |

---

## Mobile

| Problem | Solution |
|---------|----------|
| No articles in app | Same Firebase project? Published status? |
| Admin API fail | EXPO_PUBLIC_API_BASE_URL; role editor+ |
| Build errors | Run `npx tsc` in mobile-app |

---

## Firestore Index Errors

Error message में index link → create index या:

```bash
firebase deploy --only firestore:indexes
```

---

## Security

| Issue | Action |
|-------|--------|
| Catch-all Firestore rule until 2029 | Tighten rules before production |
| Secrets in git | Rotate immediately |

---

## Logs Locations

| Log | Where |
|-----|-------|
| Automation | `/admin/automation` dashboard |
| AI / Operations | `/admin/ai/operations` |
| Vercel | Vercel Dashboard → Logs |
| Firebase | Firebase Console → Firestore `automationLogs` |

---

## Support Checklist

जब help माँगें तो ये share करें:
1. `/admin/system-verification` screenshot
2. Vercel env var names (values नहीं)
3. Error message exact text
4. Article slug / rawNews id
