# Security Policy

## Supported Scope

- Web app (`src/`)
- Mobile app (`mobile-app/`)
- API routes and Firebase integrations
- Firestore/Storage rule strategy

## Reporting a Vulnerability

Please report security issues privately to project maintainers.  
Do not open public issues containing exploit details or secrets.

Include:

- affected component/route
- reproduction steps
- impact assessment
- suggested remediation if known

## Secret Handling

- Never commit real credentials.
- Rotate leaked tokens/keys immediately.
- Keep server secrets in deployment environment managers only.

## High-Priority Security Controls

- Admin routes must enforce auth + role checks.
- User data routes must enforce ownership.
- Cron endpoints must verify `CRON_SECRET`.
- Privileged actions must be audit logged.
