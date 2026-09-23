# Dependency Audit Log

Еженедельный автоматический аудит зависимостей (npm audit / npm outdated) по всем package.json в репозитории.

---

## 2026-09-16

Проверенные папки с package.json: `.` (root), `video/`. (В `webapp/` и `worker/` package.json нет — это Cloudflare Pages/Workers без npm-зависимостей, аудит там не применим.)

**root (`package.json`)**
- `npm audit`: 0 vulnerabilities.
- `npm outdated`: `ffmpeg-static` уже на последней версии (5.3.0). Изменений не требовалось.

**video (`video/package.json`)**
- `npm audit`: 0 vulnerabilities.
- `npm outdated`: `remotion` и `@remotion/cli` — patch-обновление 4.0.523 → 4.0.525 (в пределах уже заданного диапазона `^4.0.523`). `react`/`react-dom` уже на последней версии (19.3.0).
- Применено: patch-обновление `remotion` и `@remotion/cli` до 4.0.525. Проверено: `tsc --noEmit` — чисто, `npx remotion` — работает. Закоммичено и запушено (chore(deps): safe update remotion, @remotion/cli — 2026-09-16).
- Major-версии фреймворков (React, Remotion) не менялись — только patch в рамках уже разрешённого диапазона.

Уязвимостей высокой/критичной severity не найдено. Breaking/major обновлений не найдено — трогать код сверх безопасного patch-апдейта не пришлось.

---

## 2026-09-23

Проверенные папки с package.json: `.` (root), `video/`. (В `webapp/` и `worker/` по-прежнему нет package.json.)

**root (`package.json`)**
- `npm audit`: 0 vulnerabilities.
- `npm outdated`: пусто, `ffmpeg-static` на последней версии (5.3.0). Изменений не требовалось.

**video (`video/package.json`)**
- `npm audit`: 0 vulnerabilities.
- `npm outdated`: `remotion` и `@remotion/cli` — patch-обновление 4.0.525 → 4.0.527 (в пределах уже заданного диапазона `^4.0.525`). `react`/`react-dom`/typescript-тулинг без изменений.
- Применено: patch-обновление `remotion` и `@remotion/cli` до 4.0.527 (обновился только `package-lock.json`, диапазон в `package.json` не менялся). Проверено: `tsc --noEmit` — чисто, `npx remotion versions` — работает. Закоммичено и запушено (chore(deps): safe update remotion, @remotion/cli — 2026-09-23).
- Major-версии фреймворков (React, Remotion) не менялись — только patch в рамках уже разрешённого диапазона.

Уязвимостей высокой/критичной severity не найдено. Breaking/major обновлений не найдено — трогать код сверх безопасного patch-апдейта не пришлось.
