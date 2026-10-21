# Active weekly counting indicators

- Before source: b9b609a7cb3e4f73a0ef56193ecbd10ac4707595; backup/action-hub-20261021-before-progress-badges.
- Previous deploy 6ad8bb3af3fb8aca5af43746; new published deploy 6ad8bd32bd23fc94c7389a07.
- External DB backup /tmp/actionhub-before-progress-badges.json; SHA-256 8f7741c72ac48c8469ea1af9f835bf8c5885f63fc782252f307b2f0698881e1d.
- MVP live counting: 3 dots staggered 0/.2/.4 seconds, soft badge light sweep. Current hall week uses same dots/sweep. Future/final badges unchanged. Admin current-week state has matching pulsing indicator.
- Reduced-motion preference disables animations. No change to records, scoring, title rules, tied hall lines or single-line MVP fit.
- JS syntax passed. Live computed styles confirmed hbCountDot delays 0s,0.2s,0.4s and hbCountSweep; current hall has three dots; MVP remains nowrap.
