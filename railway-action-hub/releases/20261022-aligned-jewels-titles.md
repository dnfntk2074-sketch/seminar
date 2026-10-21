# Align native crown jewels and reduce title size

- Prior successful deploy: 6ad8e067a8de86abc12aac80. First verification deploy: 6ad8e1e4b05ee801016b2713; final corrected deployment: 6ad8e2ba0dc04820749e981e, ready.
- Exact remote backups: backup/action-hub-20261022-before-jewel-alignment-titles at f5293480d5d9e3ab5a47aec30a6eb55542e5ebf5; backup/action-hub-20261022-before-pink-detection at 1067afaa45afd4e882f21647c8625ac9400d66a3.
- External DB backups: /workspace/scratch/145766358d05/pre-alignment-titles-db-backup.json (SHA256 098fbaab6d6d04a6d95fce31ee6c03290fe4919b3cd623485069002d2220b1dc), /workspace/scratch/145766358d05/pre-pink-detection-db-backup.json (SHA256 fd58adebd16aee1521f2c85444c4572097764c4d109f6e835e593e4703649520). Each verified 17 application tables, 24 schedules, 18 library files. Contains secrets; never publish.
- Render original device emoji once to a cached canvas image. Locate actual green and pink/red jewel pixels and center matching colored light overlays on their components; merge fragments split by highlights. No external image or font requests. Reduced motion respected.
- Titles TFA / 이사 are separate safe text nodes at 70% of name font size in MVP and hall only. 박효선 이사 exception retained. Joint MVP remains a fitted single line, tied hall names separate rows.
- Final browser verification: five correctly aligned lights per crown, green/pink/green/pink/green; matching rgb(54,233,154) and rgb(255,124,189). Main name/title fonts 30/21px; hall 10/7px. Screenshot captured.
- Full member/admin/approvals bundle published atomically. No backend, data, login or approval-policy changes. Script syntax passed.
