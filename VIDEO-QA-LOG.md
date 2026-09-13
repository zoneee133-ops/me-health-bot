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

## 2026-09-13 — cloud QA session (blocked, not a config issue)

`WEBAPP_URL` and `ADMIN_KEY` were both provided to this run. `GET
$WEBAPP_URL/api/queue?status=pending&kind=reel` failed before reaching the
app: `curl: (56) CONNECT tunnel failed, response 403`. The session's agent
proxy status confirms this is an org egress-policy denial on the
`me-webapp.pages.dev` host itself (`connect_rejected`, "gateway answered 403
to CONNECT"), not a certificate or credential problem — this matches the
same Cloudflare Pages/Workers block already tracked in `HEALTH-LOG.md`
across multiple runs.

No queue items were listed, no videos were downloaded or probed, and no
`queue-decide` calls were made — this cloud session simply cannot reach the
API. `ADMIN_KEY` was not sent anywhere (there was nothing to send it to).

This run made no changes to the bot's queue. The GitHub Actions-based video
QA job (see the entries above, authored by `github-actions[bot]`) has real
network access and continues to run this same gate successfully — this
cloud-session job is redundant with it under the current network policy and
cannot itself decide any reels until `*.pages.dev` egress is allowed here.
