# Me — запуск в Telegram (Уровень 2)

Стек, всё бесплатно, без карты:
- **Frontend** — Cloudflare Pages (`webapp/`)
- **Backend + бот** — Cloudflare Worker (`worker/`)
- **ИИ** — Google Gemini `2.5-flash` (free tier)
- **БД** — Cloudflare D1
- **Пуши** — Telegram Bot API

Время: ~20 минут.

---

## 0. Аккаунты и ключи

1. **@BotFather** в Telegram → `/mybots` → выбери бота → `API Token` → **Revoke current token** → скопируй новый. (Старый утёк в переписку, обязательно перевыпусти.)
2. **Gemini API key** — https://aistudio.google.com/app/apikey → *Create API key* → скопируй. Карта не нужна.
3. **Cloudflare** — https://dash.cloudflare.com/sign-up → подтверди почту. Карта не нужна.
4. На Mac:
   ```bash
   npm i -g wrangler
   wrangler login
   ```

---

## 1. Backend (Worker + БД)

```bash
cd worker

# создать базу
wrangler d1 create me-db
```
В выводе будет `database_id = "..."` — **вставь его** в `worker/wrangler.toml` (поле `database_id`).

```bash
# создать таблицы
wrangler d1 execute me-db --remote --file=./schema.sql

# секреты (вставляй значения по запросу)
wrangler secret put BOT_TOKEN         # новый токен из BotFather
wrangler secret put GEMINI_API_KEY    # ключ из AI Studio
wrangler secret put SETUP_SECRET      # придумай любую строку, напр. 8fk29x

# деплой
wrangler deploy
```
Запиши адрес воркера из вывода, вида
`https://me-backend.<твой-сабдомен>.workers.dev`

---

## 2. Frontend (Mini App)

1. Открой `webapp/index.html`, в шапке замени:
   ```js
   window.ME_API = "https://me-backend.<твой-сабдомен>.workers.dev";
   ```
2. Задеплой папку:
   ```bash
   cd ../webapp
   wrangler pages deploy . --project-name me-webapp
   ```
   Получишь адрес вида `https://me-webapp.pages.dev`.
   *(Альтернатива без CLI: на dash.cloudflare.com → Workers & Pages → Create → Pages → Upload assets → перетащи `webapp/`.)*

3. Впиши этот адрес в `worker/wrangler.toml` → `WEBAPP_URL`, и передеплой воркер:
   ```bash
   cd ../worker && wrangler deploy
   ```

---

## 3. Подключить бота

Открой один раз в браузере (подставь свои значения):
```
https://me-backend.<сабдомен>.workers.dev/setup?secret=<SETUP_SECRET>
```
Это ставит вебхук, команды `/start` `/help`, описание бота и кнопку-меню, открывающую Mini App.

Ответ должен быть JSON со сплошными `"ok": true`.

---

## 4. Проверка

1. Открой бота в Telegram → `/start` → кнопка **«Открыть Me»**.
2. Пройди онбординг → на главном нажми **«Загрузить анализ»** → выбери «Анализы крови» → загрузи фото бланка.
3. Через 3–8 сек: экран разбора + в чат бота придёт пуш «Анализ распознан».
4. Тапни пуш → откроется этот же разбор (deep link).

---

## Дальше (Уровень 3 — автосбор из почты)

Не входит в этот сетап. Нужно:
- Яндекс.Почта: IMAP по паролю приложения (без верификации) — проще всего начать с неё.
- Gmail: OAuth + верификация Google (2–6 недель).
- Cron Trigger в воркере (`[triggers] crons = ["*/10 * * * *"]`) — опрашивает ящики, при новом медписьме → `/api/llm` → `/api/save` (пуш уже встроен).

Файлы под это добавим отдельно.

---

## Стоимость

| | лимит free tier | когда упрёшься |
|---|---|---|
| Worker | 100k запросов/день | ~тысячи юзеров |
| D1 | 5 ГБ, 5M чтений/день | очень нескоро |
| Pages | безлимит статики | никогда |
| Gemini 2.5-flash | ~15 RPM, 1500 запросов/день | ~сотни анализов/день |

Пока пользователей < сотен — **0 ₽/мес**.
