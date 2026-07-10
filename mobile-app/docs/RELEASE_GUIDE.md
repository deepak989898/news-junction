# Release Guide

## Release workflow
1. Freeze branch and run regression + performance + offline checklists.
2. Build QA profile and validate with test users.
3. Build staging profile and run final smoke.
4. Build production and submit to stores.
5. Monitor crash/perf dashboards post-release.

## Hotfix workflow
1. Create hotfix branch from latest production tag.
2. Patch and run targeted regression.
3. Build `hotfix` profile.
4. Submit expedited release.
5. Update release notes and postmortem.

## Rollback documentation
- Use remote config to disable unstable features.
- Enforce minimum safe version if required.
- Trigger maintenance message for severe incidents.
- Publish fixed build via `hotfix` profile.
