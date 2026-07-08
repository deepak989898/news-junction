# AI Safety Guide

## 1) Non-Negotiable Safety Rules

- No fabricated facts or fake breaking news.
- No unsupported claims presented as certainty.
- No full copyrighted article copying from third-party sources.
- Source attribution is required when summarizing/reframing.
- High-risk categories must require human approval.
- AI must never auto-modify code/security rules/deployment settings.

## 2) High-Risk Categories

Always enforce review before publishing for:

- politics
- crime
- health
- finance
- religion
- legal
- election
- conflict/violence

## 3) Output Policy

- AI output is advisory unless explicitly approved and applied by authorized users.
- Show preview/diff before apply.
- Preserve original source context and attribution metadata.
- Avoid sensational/clickbait rewrites in sensitive domains.

## 4) Approval Policy

- Approval gates at:
  - AI content application
  - social distribution where configured
  - voice/video package release where configured
  - orchestrator workflows touching publish/distribution in safe mode

## 5) Logging and Traceability

All AI actions must log:

- action type
- user/actor
- module/provider/model
- usage/tokens/cost (if available)
- approval status
- createdAt

## 6) Cost and Abuse Controls

- enforce module-level usage limits
- alert near threshold
- disable auto-heavy actions when provider degraded or quota near max

## 7) Privacy and Sensitive Inference

- do not infer sensitive personal characteristics from user behavior
- personalization must use explicit actions/preferences only

## 8) Incident Response

If unsafe output is detected:

- stop auto-apply
- mark item for manual review
- log incident in operations/system logs
- update prompt/template guardrails
