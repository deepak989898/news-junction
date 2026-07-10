# Troubleshooting Guide

## App won’t start
- Verify `.env` values.
- Check Firebase project config.
- Reinstall dependencies and clear Metro cache.

## API failures
- Confirm `EXPO_PUBLIC_API_BASE_URL`.
- Validate auth token/session.
- Inspect diagnostics and health screens.

## Update issues
- Verify runtime config endpoint.
- Check minimum/latest version values.
- Confirm store URLs configured.

## Crash spikes
- Review Sentry issues by release channel.
- Disable risky features via runtime flags.
- Ship hotfix profile.

## Sync issues
- Inspect offline queue and retry actions.
- Confirm network quality and background task registration.
