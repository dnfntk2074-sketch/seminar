# Approval layout fix

- Source backup: backup/action-hub-20261021-before-approval-spacing at 74c3524f9f6bf6b4b9f89b88ff837f68706e63b7.
- Previous deploy: 6ad88c2aad5f1e6fb794082d.
- External database backup: /tmp/actionhub-before-approval-spacing.json, SHA-256 424acf9b69a351abeef9e6fb5e45546d914d369c871fe321887e102c2bcc2ba2.
- New published deploy: 6ad88eb1539964a9e1095918.
- Approval section moved inside .wrap. Its former placement after the min-height:100vh wrapper created a full viewport of blank space.
- Embedded approval intro removed and main top padding set to zero; standalone approval page preserved.
- Live DOM verified .wrap > #view-approvals and display:block iframe. Approval app JS syntax check passed. Signed-in phone layout not directly tested.
