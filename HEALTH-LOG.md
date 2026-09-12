# HEALTH-LOG

Автоматический health-check прод-бэкенда (https://me-webapp.pages.dev), каждые 6 часов.

---

## 2026-09-11 18:42 UTC — ПРОВЕРКА НЕ ВЫПОЛНЕНА

**Причина:** сетевой egress этой облачной сессии блокирует доступ к домену
`me-webapp.pages.dev` на уровне организационной политики (proxy отвечает
`403 connect_rejected` / `EGRESS_BLOCKED` на любой запрос, включая обычный
`curl` и `WebFetch`). Это не проблема продакшена и не проблема кода — сама
среда агента не может достучаться до хоста.

Проверено:
- `curl -X POST https://me-webapp.pages.dev/webhook` → нет соединения (exit 56, agent-proxy: `connect_rejected`, gateway 403 на CONNECT)
- `GET https://me-webapp.pages.dev/` → та же блокировка
- `GET https://me-webapp.pages.dev/api/health` → та же блокировка
- `WebFetch` того же URL → `EGRESS_BLOCKED`

**Действие не предпринято** — фикс не в коде репозитория, чинить нечего.
Реальный статус прода не подтверждён этим запуском.

**Нужно от владельца:** разрешить исходящий доступ к `me-webapp.pages.dev`
(и `*.pages.dev`) в настройках сетевой политики окружения этой задачи, иначе
health-check в текущей конфигурации не может работать ни при каком состоянии
прода.

---

## 2026-09-12 00:42 UTC — ПРОВЕРКА НЕ ВЫПОЛНЕНА (повторно)

**Причина:** та же организационная блокировка egress, что и в прошлой
проверке (2026-09-11 18:42 UTC) — не устранена за прошедшие ~6 часов.
`agent-proxy` по-прежнему отвечает `403 connect_rejected` на CONNECT к
`me-webapp.pages.dev:443`.

Проверено:
- `curl -X POST https://me-webapp.pages.dev/webhook` → exit 56, `CONNECT tunnel failed, response 403`
- `GET https://me-webapp.pages.dev/` → та же блокировка
- `GET https://me-webapp.pages.dev/api/health` → та же блокировка
- `curl -sS http://127.0.0.1:44443/__agentproxy/status` подтверждает: `recentRelayFailures` → `connect_rejected`, `gateway answered 403 to CONNECT (policy denial or upstream failure)`, host `me-webapp.pages.dev:443`

**Действие не предпринято** — это ограничение сетевой политики окружения
агента, а не проблема кода или прода. Реальный статус прода снова не
подтверждён этим запуском.

**Нужно от владельца:** health-check в этой сессии не может работать, пока
исходящий доступ к `me-webapp.pages.dev` (и `*.pages.dev`) заблокирован
политикой окружения — см. предыдущую запись.
