# Release safeguards and recovery

Before every production update:

1. Preserve the exact running source commit under a dated remote backup reference and record the successful deployment ID.
2. Export a consistent PostgreSQL backup to storage outside the production DB and its volume. Verify archive readability and checksum before deployment. Do not log credentials or publish backups in Git.
3. Check disk headroom; test access-control changes with an isolated database before release.
4. After release compare existing schedule/library counts and verify the service before declaring success.

Never create database-resident backup tables on startup. The old CTAS backup implementation filled the production volume on 2026-10-18 and has been removed.

Current pre-approval recovery point: `backup/action-hub-20261018-recovered-before-approvals`, source `9d944436eb72bc3fcbbe14960e6c05c7c4480317` (same application tree as `7a5b1c4b3d4e1f71feb7ecde03fc6ae05acc21d7`). Successful Railway deployment: `9394900c-0aa0-4c01-a7fe-3bb0987c64c8`.

For code rollback redeploy the recorded successful application build, or publish the recorded source using a new fast-forward commit. Never reset or wipe the database. Additive access-control tables do not require restoring schedules or library data to roll back application code.

The calculator payload is encrypted with AES-256-GCM. Preserve `COMMISSION_CONTENT_KEY` in service configuration; never print or commit it. Access control cannot revoke historical public downloads.

The isolated `preview-server.js` requires an explicit preview flag and refuses to start when a production database URL is present. It uses synthetic data in memory and is not the production entry point.
