# Simultaneous crown jewel blinking

- User requested all crown lights to blink at the same time.
- Prior deploy: 6ad8e2ba0dc04820749e981e. New published deploy: 6ad933dad92b4e5672b20b1f (ready).
- Exact source backup: backup/action-hub-20261022-before-synced-jewels at b24cc96fb8f78a6db76e0662061764da46f99504.
- External DB backup: /workspace/scratch/145766358d05/pre-synced-jewels-db-backup.json; SHA256 b665fc706feb86ce1d259fb989ca3bc6875fe3d0699e3ba827c361c1ed48494f. Verified 17 tables, 24 schedules, 18 library files. Contains secrets; never publish.
- Removed per-gem stagger. All jewels in each crown use the same page-clock phase, including newly rendered hall crowns. Preserved original artwork, color matching and 70% title sizes.
- Full member/admin bundle published atomically; no API, data or access changes. Script syntax passed. Live browser confirmed identical delays and opacity values across every five-gem crown; screenshot saved.
