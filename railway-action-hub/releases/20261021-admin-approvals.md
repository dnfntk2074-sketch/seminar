# Admin approval release — 2026-10-21

- Before source: c6793c8e189a6be153c6af46fe3ac889b88da853; remote backup `backup/action-hub-20261021-before-admin-approvals`.
- Before frontend: 6ad87617b91ef07a7eaea84d.
- External PostgreSQL JSON backup: `/tmp/actionhub-before-admin-approvals.json`; SHA-256 ed713af76b63dff7645bbe1c6fc16078424bbf16bfdaae81094e2d62b5fe923a. Contains credentials; do not publish its contents.
- Frontend: 6ad88c2aad5f1e6fb794082d, Netlify production; same bundle for member/admin/approval apps.
- Backend: hub-api version 10, verified JWT disabled at gateway because application routes enforce owner/device authorization.
- TOOLBOX: dpl_3npNzUpPXDpLXtrXrNuCf1B2Ffbf READY production; source d9c9001e87338f776312e9ce1c49933cfd8dc647, backup `backup/toolbox-20261021-before-new-hub`.
- Owner admin sessions: Secure, HttpOnly, SameSite=Lax cookie, 365-day lifetime renewed only from an authenticated `/api/admin/me`. Explicit logout clears admin cookie.
- Approval panel in admin uses same-origin `/approvals/?embedded=1`, filters library/commission; no independent admin account.
- Commission content now bundled on server and served only after owner or resource/device authorization, eliminating the old local encrypted-file dependency.
- Verified isolated authorization tests 7/7; 365-day signed session renewal; protected calculator rendering; anonymous approval API denied and commission redirected to application; live TOOLBOX points to recovered server.
- Browser: new admin login page and approval section exist, no app JavaScript errors. Owner login and restart on the user's actual phone remain for user confirmation; no production applicant decisions were made for testing.
- Live data read after deployment: 24 schedules, 18 library files; no pending library or commission requests. October 19–20 original Railway recovery remains unverified.
