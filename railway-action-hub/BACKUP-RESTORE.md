# Pre-approval-center recovery points — 2026-10-18

Source repository: dnfntk2074-sketch/seminar

| Component | Source reference | Successful deployment |
|---|---|---|
| ACTION HUB | `backup/action-hub-20261018-before-approval` / `7a5b1c4b3d4e1f71feb7ecde03fc6ae05acc21d7` | Railway `c7f01509-d09f-43cb-be6e-47635a7fabf2` |
| TOOLBOX | `backup/toolbox-20261018-before-approval` / `c3fb210903f06b6b24459c03e5a9eb550433106d` | Vercel `dpl_H3VAaXXvxJhuj7hNKBPJjymjPnRU` |

Before each release the app takes transactionally consistent, database-resident copies of existing relevant tables in `hb_update_backups`, before `init()` or other migration/retention work. `releases` records the exact source revision, table names and row counts. If backup fails, the new process stops and must not be marked healthy. These copies share the production database and are a logical rollback checkpoint, not an independent disaster-recovery backup.

Operational code rollback: redeploy the recorded successful release, or publish the exact backup source commit. Do not force-reset branches. Application changes are additive; an immediate code rollback normally needs no data restore.

Data restore: first preserve the current state, inspect `hb_update_backups.releases` using an authenticated database administrator, and compare the requested table snapshot with current rows. Restore only the requested data in a transaction. Never bulk-overwrite schedules or library files that were created after the backup. No automatic restore or public backup-download endpoint is provided.

The calculator is stored as AES-256-GCM encrypted content. `COMMISSION_CONTENT_KEY` lives only in the Railway service environment; preserve it with the service configuration. Never put it in Git or print it to logs. Source backup references and old deployment artifacts may contain previously public calculator code: access control protects the current operational service; it cannot recall prior downloads or historical copies.
