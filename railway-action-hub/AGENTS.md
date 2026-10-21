# Required update safeguards

- User instruction (2026-10-21): every ACTION HUB update must also update and verify the administrator app in the same release. Preserve working library and life-commission approval management and persistent owner login; follow RELEASE_CHECKLIST.md.

- User instruction: before every update, back up the current state.
- Before changing an operational branch, preserve its current exact commit with a dated remote backup reference (branch or tag) and record the current successful deployment ID.
- Before a production release, create and verify an external PostgreSQL backup and record its location, checksum and successful deployment ID. Backups must be outside the production database and its volume.
- Never create CTAS copies or full backups in the production database during startup. This exhausted the 500 MB volume on 2026-10-18. Startup must not perform a database backup.
- Check database disk headroom before migrations. Use an isolated database for tests and never send test applications or decisions to production.
- Preserve all existing schedule and library data. Validate anonymous denial, device binding, resource isolation, owner-only approval and immediate revocation before publishing access changes.
- Only the owner may change app source, configuration, deployments or access policies. Applicant permissions grant app use only.
