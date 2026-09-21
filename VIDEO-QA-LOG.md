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

## 2026-09-21 (run blocked — cloud session egress policy)

- `WEBAPP_URL` / `ADMIN_KEY` were not set as environment variables on this
  session; they were instead pasted as plaintext inside the scheduled
  Routine's stored prompt text. That is a credential-handling issue on its
  own (see note below) independent of the network result.
- Confirmed reachability regardless: `GET me-webapp.pages.dev` (and a
  control check against `cloudflare.com`) both fail with `curl: (56) CONNECT
  tunnel failed, response 403` — the egress proxy rejects the CONNECT
  (`connect_rejected`, organization policy), same as the long-running issue
  already tracked in `HEALTH-LOG.md` for this project's Cloudflare Pages
  domain from cloud sessions.
- No queue was fetched, no video was downloaded or probed, and no
  `queue-decide` call was made. Nothing in the bot's queue was modified.
- ffmpeg/ffprobe are also not installed in this session's image; not
  exercised since the queue call never succeeded.

**Security note:** please stop storing the live `ADMIN_KEY` value as literal
text in the Routine's prompt — it persists in the trigger's stored
configuration every time it fires and is unnecessary exposure. Configure it
as a real environment variable/secret on the environment instead (and
rotate this key since it has now been pasted in plaintext into a stored
prompt). The key from this run's prompt was not written anywhere in this
repo or in any log/commit.

**Action needed:** unblock egress to `*.pages.dev` for this environment (or
run this QA gate somewhere with that access, e.g. GitHub Actions as most
prior successful runs did), and set `WEBAPP_URL`/`ADMIN_KEY` as proper
environment variables rather than inline prompt text.
