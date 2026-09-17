# Video QA Log

Automated reel QA gate — runs every 12 hours against `$WEBAPP_URL/api/queue` (pending reels) and `$WEBAPP_URL/api/queue-decide`.

## 2026-09-11 (run skipped — missing config)

- `WEBAPP_URL` is not set in the environment.
- `ADMIN_KEY` is not set in the environment.

Cannot query the queue or make any approve/reject decisions without both. No reels were checked, downloaded, or decided in this run. Nothing was modified in the bot's queue.

**Action needed:** set `WEBAPP_URL` and `ADMIN_KEY` as environment variables on this session/environment so the next scheduled run can proceed.

## 2026-09-11T15:27:53Z — GitHub Actions run
- pending reels: 4
- ee2ebdb4-cf92-47d3-afe9-4ceb4d8b1072: passed QA, daily cap reached — left pending
- dda13018-7c8c-4a26-87ef-e5757cee3ad2: passed QA, daily cap reached — left pending
- cc6ea275-b882-4b04-a6ae-0409cc3dedb7: passed QA, daily cap reached — left pending
- bd18bcea-86a6-430d-af05-d2ec6a3ee649: passed QA, daily cap reached — left pending

## 2026-09-11T18:32:00Z — GitHub Actions run
- pending reels: 4
- ee2ebdb4-cf92-47d3-afe9-4ceb4d8b1072: passed QA, daily cap reached — left pending
- dda13018-7c8c-4a26-87ef-e5757cee3ad2: passed QA, daily cap reached — left pending
- cc6ea275-b882-4b04-a6ae-0409cc3dedb7: passed QA, daily cap reached — left pending
- bd18bcea-86a6-430d-af05-d2ec6a3ee649: passed QA, daily cap reached — left pending

## 2026-09-12T00:34:37Z — GitHub Actions run
- pending reels: 4
- ee2ebdb4-cf92-47d3-afe9-4ceb4d8b1072: passed QA, approved
- dda13018-7c8c-4a26-87ef-e5757cee3ad2: passed QA, approved
- cc6ea275-b882-4b04-a6ae-0409cc3dedb7: passed QA, daily cap reached — left pending
- bd18bcea-86a6-430d-af05-d2ec6a3ee649: passed QA, daily cap reached — left pending

## 2026-09-12T06:32:44Z — GitHub Actions run
- pending reels: 2
- cc6ea275-b882-4b04-a6ae-0409cc3dedb7: passed QA, daily cap reached — left pending
- bd18bcea-86a6-430d-af05-d2ec6a3ee649: passed QA, daily cap reached — left pending

## 2026-09-12T12:32:31Z — GitHub Actions run
- pending reels: 2
- cc6ea275-b882-4b04-a6ae-0409cc3dedb7: passed QA, daily cap reached — left pending
- bd18bcea-86a6-430d-af05-d2ec6a3ee649: passed QA, daily cap reached — left pending

## 2026-09-12T18:29:02Z — GitHub Actions run
- pending reels: 2
- cc6ea275-b882-4b04-a6ae-0409cc3dedb7: passed QA, daily cap reached — left pending
- bd18bcea-86a6-430d-af05-d2ec6a3ee649: passed QA, daily cap reached — left pending

## 2026-09-13T00:36:28Z — GitHub Actions run
- pending reels: 2
- cc6ea275-b882-4b04-a6ae-0409cc3dedb7: passed QA, approved
- bd18bcea-86a6-430d-af05-d2ec6a3ee649: passed QA, approved

## 2026-09-13T06:37:14Z — GitHub Actions run
- pending reels: 0

## 2026-09-13T12:32:41Z — GitHub Actions run
- pending reels: 0

## 2026-09-13T18:30:32Z — GitHub Actions run
- pending reels: 0

## 2026-09-14T00:37:01Z — GitHub Actions run
- pending reels: 0

## 2026-09-14T06:37:35Z — GitHub Actions run
- pending reels: 0

## 2026-09-14T12:37:32Z — GitHub Actions run
- pending reels: 0

## 2026-09-14T18:33:41Z — GitHub Actions run
- pending reels: 0

## 2026-09-15T00:37:53Z — GitHub Actions run
- pending reels: 0

## 2026-09-15T06:37:18Z — GitHub Actions run
- pending reels: 0

## 2026-09-15T12:34:48Z — GitHub Actions run
- pending reels: 0

## 2026-09-15T18:30:18Z — GitHub Actions run
- pending reels: 0

## 2026-09-16T00:35:10Z — GitHub Actions run
- pending reels: 0

## 2026-09-16T06:36:01Z — GitHub Actions run
- pending reels: 0

## 2026-09-16T12:35:35Z — GitHub Actions run
- pending reels: 0

## 2026-09-16T18:32:11Z — GitHub Actions run
- pending reels: 0

## 2026-09-17T00:35:56Z — GitHub Actions run
- pending reels: 0

## 2026-09-17T06:35:42Z — GitHub Actions run
- pending reels: 0

## 2026-09-17T12:34:58Z — GitHub Actions run
- pending reels: 0

## 2026-09-17T12:51:22Z — run skipped (egress blocked)
- `WEBAPP_URL` and `ADMIN_KEY` were provided, but this run's environment egress policy denied the outbound connection to `me-webapp.pages.dev:443` (proxy returned 403 CONNECT — org policy denial, not a DNS/TLS/app-level failure).
- Could not query `/api/queue`, so no reels were downloaded, checked, or decided in this run. No changes were made to the bot's queue.
- **Action needed:** allow outbound HTTPS to `me-webapp.pages.dev` for this scheduled task's environment/network policy so future cloud runs can reach the webapp.
