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

## 2026-09-17T00:51:41Z — cloud QA agent run (blocked — egress policy)
- `WEBAPP_URL` and `ADMIN_KEY` were both provided to this run.
- The outbound HTTPS request to `$WEBAPP_URL/api/queue` was rejected before
  it reached the server: the session's egress proxy returned `403` on the
  CONNECT tunnel to `me-webapp.pages.dev:443` ("gateway answered 403 to
  CONNECT (policy denial or upstream failure)"), confirmed via the proxy's
  own status endpoint. This is a network egress policy restriction on this
  execution environment, not a missing-config or application-level issue.
- No queue request was made, no videos were downloaded or inspected, and no
  `queue-decide` calls were made. No reel statuses were changed.
- `ffmpeg`/`ffprobe` were installed successfully in this environment and are
  ready for the next run once egress to the webapp host is allowed.
- Note: a separate `github-actions[bot]` workflow appears to run this same
  QA gate on its own schedule and successfully reaches `$WEBAPP_URL` (see
  the run immediately above, and prior entries) — the reel queue is likely
  still being serviced by that path even while this cloud session is
  blocked.

**Action needed:** allow outbound HTTPS to the webapp host (`me-webapp.pages.dev`)
in this session's/environment's egress policy so future cloud QA runs can
reach `$WEBAPP_URL`.
