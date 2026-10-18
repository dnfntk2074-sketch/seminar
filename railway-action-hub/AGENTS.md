# Required update safeguards

- User instruction: before every update, back up the current state.
- Before changing an operational branch, preserve its current exact commit with a dated remote backup tag and record the current successful deployment ID.
- Run `backupBeforeUpdate(pool)` successfully before startup migrations or retention work; never bypass its failure to make a deployment pass.
- Backup copies are in the private PostgreSQL schema `hb_update_backups`. They must not be exposed through public APIs or checked into the source repository.
- Preserve all existing schedule and library data. Validate anonymous denial, device binding, resource isolation, owner-only approval and immediate revocation before publishing access changes.
- Only the owner may change app source, configuration, deployments or access policies. Applicant permissions grant app use only.
