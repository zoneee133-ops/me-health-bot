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

## 2026-09-14 ~12:50 UTC — cloud QA session run (BLOCKED, not a GitHub Actions run)

`WEBAPP_URL` and `ADMIN_KEY` were both supplied for this run. `GET
$WEBAPP_URL/api/queue?status=pending&kind=reel` failed before any response
was received:

- `curl -X GET https://me-webapp.pages.dev/api/queue?status=pending&kind=reel -H "X-Admin-Key: ***"` → exit 56, `CONNECT tunnel failed, response 403`
- Agent-proxy status (`/__agentproxy/status`) shows `recentRelayFailures` with `kind: connect_rejected`, `detail: gateway answered 403 to CONNECT (policy denial or upstream failure)`, `host: me-webapp.pages.dev:443`
- Control check `https://github.com` → HTTP 400 (connection established normally)
- Control check `https://www.cloudflare.com` → same `connect_rejected` / 403 on CONNECT

This is the identical organizational egress block already documented in
`HEALTH-LOG.md` (12 consecutive occurrences as of 2026-09-14 12:42 UTC): this
cloud session's environment cannot open outbound connections to
`*.pages.dev` / `*.workers.dev` / `cloudflare.com` at the agent-proxy/gateway
level. It is not a DNS, TLS, credential, or code issue — general internet
egress (github.com) works fine from this same session.

**No queue items were listed, downloaded, or decided.** No approve/reject
calls were made — the queue GET never returned, so there was nothing to
act on. `ADMIN_KEY` was not logged or written anywhere.

Note: the GitHub Actions-driven QA runs above (same day, every ~6h) are a
separate, working execution channel that already covers this gate and shows
`pending reels: 0` as of the last run — the real reel queue is already being
serviced. This particular scheduled cloud-session task is structurally
unable to perform its job under the current network policy and is fully
redundant with the working GitHub Actions gate.

**Action needed from the owner:** either (a) allow outbound access to
`*.pages.dev` / `*.workers.dev` / `cloudflare.com` in this cloud session's
environment network policy, or (b) disable this scheduled cloud-session QA
task, since the GitHub Actions workflow already performs the same gate
successfully.
