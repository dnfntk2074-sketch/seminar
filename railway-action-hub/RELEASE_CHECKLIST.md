# ACTION HUB paired releases

User instruction (2026-10-21): update the member app and admin app together on every Action Hub release.

- Back up the exact current source commit, successful deployment ID, and all PostgreSQL data externally before updates.
- Release `netlify-free/public` as one atomic bundle: user `/`, admin `/admin`, approvals `/approvals/`, enrollment `/access/`.
- Both user and admin apps must use the same `hub-api` deployment and production database. Never restore historical data during UI releases.
- Verify owner schedule edits, scheduled/completed transitions, notice and library changes, and matching activity-week/MVP aggregation in both apps.
- Verify owner-only approvals for library and commission, device binding, independent resource permission and immediate revocation. Do not approve production applicants merely for testing.
- Verify admin restart persistence via the Secure HttpOnly cookie; never store passwords in browser storage. Renewal only follows a valid authenticated session. Log out clears admin access.
- Check TOOLBOX life commission entry at https://hbtoolbox.vercel.app/ points to https://guri-hb-action-hub.netlify.app/commission/.
- Record frontend deploy ID, `hub-api` version, and TOOLBOX deploy ID. Preserve Netlify badge disabled.
- Latest October 19–20 Railway records remain unverified; never label data recovery complete until original records are compared.
