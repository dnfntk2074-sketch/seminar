# Separate administrator request dashboards

- Previous source: 3a3f6eb; remote backup: backup/action-hub-20261021-before-separated-requests.
- Published Netlify deploy: 6ad8d315cecce54bf45d6a85; previous deploy: 6ad8bd32bd23fc94c7389a07.
- External PostgreSQL backup: /tmp/actionhub-before-separated-requests.json; SHA-256: 52a5153fce16f00ce1b458b1a81689db394018d7030dd958ab1ae1a736eacab1. Verified JSON includes all 17 application tables, 24 schedules and 18 library files. Backup contains secrets; never publish it.
- Member/admin/approval/enrollment files published as one atomic static bundle. No backend or database changes.
- Home shows library and commission request dashboards independently. Dashboard buttons open the matching resource. Approval center uses separate tabs, starts at pending status on tab change, and preserves resource-specific decisions.
- Syntax checks and isolated DOM rendering tests passed for independent pending/approved counts and request lists. Production admin, approval JS/CSS and member index return HTTP 200 and exactly match packaged files.
- Netlify published status verified in browser. Administrator login renders normally; authenticated phone interaction was not performed in this session. No production applications or decisions were created for testing.
