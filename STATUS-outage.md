# ⚠️ PROD OUTAGE — нужен деплой

## Что случилось
Между ~20:48 и ~20:51 деплой сломал Functions-бандл на Cloudflare Pages.
Сейчас **любой POST → 405**: `/webhook`, `/api/queue`, `/api/health`,
`/api/channel-post`. Значит **бот не принимает вебхуки** — новые /start, фото,
голосовые не обрабатываются. GET (само приложение) работает.

## Причина
Не код. `functions/[[path]].js` в порядке (`node -c` проходит, `onRequest`
на месте). Один и тот же коммит `1b25045` задеплоился дважды: `abd39d00`
(21 мин назад) отвечал 403 на POST /webhook — **это правильно**; `fe8e91ed`
(18 мин назад) — уже 405. Транзиентный сбой сборки на стороне CF.

## Фикс — один деплой
```bash
cd "/Users/robert/Desktop/Projects/ME/webapp" && npx wrangler pages deploy . --project-name me-webapp --commit-dirty=true
```
После — проверить: `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://me-webapp.pages.dev/webhook -H "X-Telegram-Bot-Api-Secret-Token: wh" -d '{}'`
должно вернуть **403** (не 405).

Я задеплоить не могу — `wrangler deploy` под soft-deny (ты сам настроил через
/auto-mode-setup), тебя не было.

## Что стоит на паузе из-за этого
- Посты в Telegram-канал через `/api/channel-post` — не проходят (405). reel A
  не опубликовался.
- Instagram не затронут (постится через браузер, не через API).

## Готово, ждёт публикации после фикса
- Рилсы A-D + E-H (ferritin/report/mail/scan) — `content/brand/`, обложки в
  `content/brand/reel-covers/`
- 12 image-first постов IG — `content/brand/instagram/imgpost_*`
- 3D-промо (верт + квадрат) — `content/brand/promo-3d*.mp4`
- Актуальное (7 highlight, 24 картинки) — `content/brand/instagram/hl-*`, гайд
  `HIGHLIGHTS.md`
- Мем (иконка в кошельке) — `/private/tmp/.../scratchpad/meme_me.png`
- Контент-план — `content/brand/instagram/CONTENT-PLAN.md`

## Уже опубликовано
- **Канал t.me/me_zdorovie**: закреп + 3 факт-поста с картинками + showcase-ролик
- **Instagram @me_abouthealth_bot**: профиль (аватар, bio) + карусель + рилс C
  «Покажи маме» + showcase-рилс. 3 поста, обложки премиальные.
