# Free-host recovery — 2026-10-21

Original Railway source and volumes are preserved. The trial-expired Railway project was not deleted or upgraded.

- Source recovery point: `3417953585a8a4f284e2a84d1d0aa4e02142dd6f`
- Exact remote source backup: `backup/action-hub-20261021-before-free-recovery`
- Source and database archives are stored outside the production database.
- Database source snapshot is dated 2026-10-18; it contains 21 schedules and 18 library files. Changes after that snapshot have not been recovered from the stopped Railway server.
- Target database: the owner's existing Supabase project `guri-hb-action-hub` (`xncdmnislikuquuxpgxb`), private `hb_action_hub` schema. No direct anonymous database grants.
- Runtime: `supabase/functions/hub-api`, retaining the application's administrator, schedule ownership, and device approval checks. No default administrator credential is generated during recovery.
- Frontend: `netlify-free/public`, deployed to the existing `guri-hb-action-hub` Netlify project. Its API redirects use the same-site browser origin for cookies.
- Public visitor access is pending explicit action-time authorization. It must not be assumed from a successful team-member browser visit.
- The encrypted commission calculator requires the original `COMMISSION_CONTENT_KEY`, which has not been recovered. Do not replace the key or decrypt the payload with a new key.
- New origins require users to reconnect browser notifications and re-establish browser/device authorization. Existing owner-token data in the old origin's browser storage is not automatically transferred.

Never put database exports, migration tokens, live credentials, or library file contents in Git. Disable the temporary authenticated recovery importer after verification.

## Verified recovery

All 18 library documents (169040687 bytes) were restored into the private `hb-action-hub-library` bucket and verified against the original SHA-256 values. The API serves files only after its administrator/device approval check. The largest and smallest API downloads returned the original bytes. Database metadata keeps each original document ID; binary objects are kept outside Postgres to fit free-plan limits.

Authenticated administrator reads returned 200; anonymous administrator reads returned 401 and anonymous library reads returned 403. The public visitor setting is still blocked pending owner approval.
