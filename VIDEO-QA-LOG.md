# Video QA Log

Automated reel QA gate — runs every 12 hours against `$WEBAPP_URL/api/queue` (pending reels) and `$WEBAPP_URL/api/queue-decide`.

## 2026-09-11 (run skipped — missing config)

- `WEBAPP_URL` is not set in the environment.
- `ADMIN_KEY` is not set in the environment.

Cannot query the queue or make any approve/reject decisions without both. No reels were checked, downloaded, or decided in this run. Nothing was modified in the bot's queue.

**Action needed:** set `WEBAPP_URL` and `ADMIN_KEY` as environment variables on this session/environment so the next scheduled run can proceed.
