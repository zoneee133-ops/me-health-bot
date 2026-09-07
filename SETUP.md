# Me — запуск в Telegram (без терминала, без Google)

Всё делается в браузере: сайт Cloudflare + сайт OpenRouter + @BotFather.
Терминал не нужен. Время ~25 минут.

Стек (бесплатно, работает из России):
- **ИИ** — OpenRouter, бесплатные vision-модели
- **Backend + бот** — Cloudflare Worker
- **БД** — Cloudflare D1
- **Frontend** — Cloudflare Pages

---

## 1. Ключи

### 1.1 Токен бота
@BotFather → `/mybots` → твой бот → **API Token** → **Revoke current token** → скопируй новый.
(Старый снова попал в переписку — обязательно перевыпусти.)

### 1.2 Ключ OpenRouter
1. https://openrouter.ai → **Sign In** (через Google / GitHub / почту).
2. Правый верх → **Keys** → **Create Key** → название `me` → **Create**.
3. Скопируй ключ (начинается на `sk-or-...`).
Баланс пополнять не нужно — бесплатные модели работают при нулевом балансе.

### 1.3 Аккаунт Cloudflare
https://dash.cloudflare.com/sign-up → подтверди почту. Карта не нужна.

---

## 2. База данных (Cloudflare, браузер)

1. dash.cloudflare.com → слева **Storage & Databases** → **D1 SQL Database** → **Create**.
2. Имя: `me-db` → **Create**.
3. Открой `me-db` → вкладка **Console**.
4. Открой файл `worker/schema.sql`, скопируй всё содержимое, вставь в консоль → **Execute**.
   Должно быть «Success».

---

## 3. Backend (Worker, браузер)

1. **Workers & Pages** → **Create** → вкладка **Workers** → **Create Worker**.
2. Имя: `me-backend` → **Deploy** (пока пустой).
3. **Edit code** → выдели весь код в редакторе, удали.
4. Открой `worker/src/index.js`, скопируй **всё**, вставь в редактор → **Deploy**.
5. Запиши адрес воркера сверху, вида
   `https://me-backend.<твой-логин>.workers.dev`

### 3.1 Переменные воркера
Вкладка **Settings** → **Variables and Secrets** → **Add**:

| Имя | Тип | Значение |
|---|---|---|
| `BOT_TOKEN` | Secret | новый токен из 1.1 |
| `OPENROUTER_KEY` | Secret | ключ `sk-or-...` из 1.2 |
| `SETUP_SECRET` | Secret | придумай строку, напр. `me8fk29xz` |
| `WEBAPP_URL` | Text | пока пропусти — заполнишь в шаге 5 |

**Deploy** после добавления.

### 3.2 Привязка базы
**Settings** → **Bindings** → **Add** → **D1 database**:
- Variable name: `DB`
- D1 database: `me-db`
→ **Deploy**.

---

## 4. Frontend (Pages, браузер)

1. На Mac найди файл `webapp/index.html`, **двойной клик** — откроется в TextEdit
   (если открылся в браузере: правый клик по файлу → «Открыть в программе» → TextEdit).
2. В самом верху найди строку:
   ```
   window.ME_API = "https://me-backend.YOUR-SUBDOMAIN.workers.dev";
   ```
   Замени адрес на свой из шага 3.5. Сохрани (Cmd+S).
3. dash.cloudflare.com → **Workers & Pages** → **Create** → вкладка **Pages** → **Upload assets**.
4. Имя проекта: `me-webapp` → перетащи в окно **весь файл `webapp/index.html`** (или папку `webapp`) → **Deploy site**.
5. Запиши адрес, вида `https://me-webapp.pages.dev`.

---

## 5. Связать всё

1. Вернись в Worker → **Settings** → **Variables and Secrets** → задай
   `WEBAPP_URL` (Text) = адрес Pages из шага 4.5 → **Deploy**.
2. Открой в браузере (подставь свои значения):
   ```
   https://me-backend.<логин>.workers.dev/setup?secret=<SETUP_SECRET>
   ```
   Ответ — JSON, во всех строках `"ok": true`.

---

## 6. Проверка

1. Открой бота в Telegram → `/start` → кнопка **«Открыть Me»**.
2. Онбординг → главный экран → **«Загрузить анализ»** → «Анализы крови» → загрузи фото бланка.
3. Через 5–15 сек: экран разбора + в чат бота придёт пуш «Анализ распознан».
4. Тапни пуш → откроется тот же разбор.

Если разбор не приходит — открой бота, вкладка Worker → **Logs** (Real-time) в дашборде,
повтори загрузку, посмотри ошибку. Часто: не задан `OPENROUTER_KEY` или `DB`.

---

## Про качество распознавания

Бесплатная модель `qwen2.5-vl-72b` неплохо читает печатные бланки и разборчивый почерк.
Совсем неразборчивую рукопись может читать с ошибками — это нормально для бесплатного этапа.
Позже можно переключить модель: Worker → Settings → добавь переменную
`OPENROUTER_MODEL` (Text) = напр. `google/gemini-2.0-flash-exp:free`.

---

## Дальше — автосбор из почты (Уровень 3)

Отдельно. Cron Trigger в воркере + Яндекс IMAP по паролю приложения.
Пуш-логика уже готова (`/api/save`). Файлы добавим, когда скажешь.

---

## Стоимость: 0 ₽/мес

Cloudflare free: 100k запросов воркера/день, D1 5 ГБ, Pages безлимит.
OpenRouter free-модели: лимит по частоте, не по деньгам.
Хватит на сотни пользователей.
