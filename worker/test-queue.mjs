/* Проверка пульта (очередь на одобрение). Запуск:  node worker/test-queue.mjs
   D1 подменяется настоящим sqlite, Telegram API — заглушкой. */
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const db = new DatabaseSync(":memory:");
db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));

const D1 = {
  prepare(sql) {
    const run = (args) => {
      if (/^\s*(SELECT)/i.test(sql)) throw new Error("run() on SELECT");
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    };
    const mk = (args) => ({
      run: async () => run(args),
      first: async () => db.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: db.prepare(sql).all(...args) }),
    });
    return { bind: (...a) => mk(a), ...mk([]) };
  },
};

const sent = [];
globalThis.fetch = async (url, init) => {
  const body = init?.body ? JSON.parse(init.body) : {};
  sent.push({ url: String(url), body });
  return { ok: true, json: async () => ({ ok: true, result: {} }) };
};

const env = { DB: D1, BOT_TOKEN: "t", ADMIN_ID: "777", ADMIN_KEY: "secret", WEBAPP_URL: "https://x", WEBHOOK_SECRET: "wh" };
const mod = await import(pathToFileURL(new URL("../webapp/functions/[[path]].js", import.meta.url).pathname));

const call = (path, { method = "GET", headers = {}, body } = {}) =>
  mod.onRequest({
    request: new Request("https://x" + path, { method, headers, body: body && JSON.stringify(body) }),
    env, waitUntil: () => {}, next: async () => new Response("static"),
  });

const push = (key, payload) => call("/api/queue", { method: "POST", headers: { "X-Admin-Key": key, "Content-Type": "application/json" }, body: payload });

// 1. без ключа и с чужим ключом — не пускаем
assert.equal((await push("", { kind: "reel", title: "x" })).status, 401);
assert.equal((await push("wrong", { kind: "reel", title: "x" })).status, 401);

// 2. мусорный kind и пустой title — отбиваем
assert.equal((await push("secret", { kind: "hack", title: "x" })).status, 400);
assert.equal((await push("secret", { kind: "reel", title: "" })).status, 400);

// 3. валидная карточка -> в БД pending + карточка ушла Роберту с кнопками
const r = await push("secret", { kind: "reel", title: "Ролик про эозинофилы", body: "хук 2 сек", payload: { platform: "tiktok" } });
assert.equal(r.status, 200);
const { id } = await r.json();
assert.equal(db.prepare("SELECT status FROM queue WHERE id=?").get(id).status, "pending");
const card = sent.at(-1);
assert.match(card.url, /sendMessage$/);
assert.equal(String(card.body.chat_id), "777");
assert.equal(card.body.reply_markup.inline_keyboard[0][0].callback_data, `q:ok:${id}`);

// 4. до одобрения карточки нет в approved
assert.deepEqual((await (await call("/api/queue?status=approved", { headers: { "X-Admin-Key": "secret" } })).json()).items, []);

// 5. чужой пользователь тапнуть не может
const tap = (fromId, data) => call("/webhook", {
  method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": "wh", "Content-Type": "application/json" },
  body: { callback_query: { id: "1", from: { id: fromId }, data, message: { chat: { id: fromId }, message_id: 5, text: "карточка" } } },
});
await tap(999, `q:ok:${id}`);
assert.equal(db.prepare("SELECT status FROM queue WHERE id=?").get(id).status, "pending");

// 6. Роберт одобряет -> approved, агент видит карточку и payload
await tap(777, `q:ok:${id}`);
assert.equal(db.prepare("SELECT status FROM queue WHERE id=?").get(id).status, "approved");
const { items } = await (await call("/api/queue?status=approved", { headers: { "X-Admin-Key": "secret" } })).json();
assert.equal(items.length, 1);
assert.equal(items[0].payload.platform, "tiktok");

// 7. повторный тап (уже отклонить) решение не переигрывает
const before = db.prepare("SELECT decided_at FROM queue WHERE id=?").get(id).decided_at;
await tap(777, `q:no:${id}`);
const after = db.prepare("SELECT status, decided_at FROM queue WHERE id=?").get(id);
assert.equal(after.status, "approved");
assert.equal(after.decided_at, before);
assert.match(sent.at(-1).body.text, /Уже решено/);

// 8. GET очереди без ключа закрыт
assert.equal((await call("/api/queue?status=pending")).status, 401);

// 9. поддержка: текст пользователя -> карточка Роберту + подтверждение автору
const say = (fromId, text, replyTo) => call("/webhook", {
  method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": "wh", "Content-Type": "application/json" },
  body: { message: { chat: { id: fromId, type: "private" }, from: { id: fromId, first_name: "Аня" }, text, reply_to_message: replyTo } },
});
let nextMsgId = 100;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const r = await realFetch(url, init);
  return { ok: true, json: async () => ({ ok: true, result: { message_id: nextMsgId++ } }) };
};

sent.length = 0;
await say(555, "не распознаёт мой анализ, помогите");
const toAdmin = sent.filter((s) => String(s.body.chat_id) === "777");
assert.equal(toAdmin.length, 1);
assert.match(toAdmin[0].body.text, /не распознаёт мой анализ/);
assert.match(sent.at(-1).body.text, /Передал вопрос/);
const fb = db.prepare("SELECT user_id, msg_id, status FROM queue WHERE kind='feedback'").get();
assert.equal(fb.user_id, "555");
assert.equal(fb.status, "approved");

// 10. текст пользователя не исполняется как разметка — уходит экранированным
sent.length = 0;
await say(556, "<b>жирный</b> & <script>");
assert.match(sent.find((s) => String(s.body.chat_id) === "777").body.text, /&lt;b&gt;жирный&lt;\/b&gt; &amp; &lt;script&gt;/);

// 11. Роберт отвечает реплаем на карточку -> ответ уходит автору вопроса
sent.length = 0;
await say(777, "Проверьте качество фото — снимите при дневном свете.", { message_id: fb.msg_id });
const back = sent.find((s) => String(s.body.chat_id) === "555");
assert.ok(back, "ответ не дошёл до пользователя");
assert.match(back.body.text, /дневном свете/);

// 12. лимит: 6-е сообщение за сутки Роберту уже не летит
sent.length = 0;
for (let i = 0; i < 6; i++) await say(558, `вопрос ${i}`);
assert.equal(sent.filter((s) => String(s.body.chat_id) === "777").length, 5);
assert.match(sent.at(-1).body.text, /Уже передал/);

// 13. вся цепочка распознавания легла -> Роберту летит ровно одна карточка, не поток
env.GEMINI_KEY = "g";
const okFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("generativelanguage") || String(url).includes("openrouter") || String(url).includes("groq"))
    return { ok: false, status: 429, json: async () => ({}) };
  return okFetch(url, init);
};
const llm = () => call("/api/health", { method: "POST", headers: { "X-Setup-Key": "s", "Content-Type": "application/json" }, body: { content: "тест" } });
env.SETUP_SECRET = "s";
sent.length = 0;
assert.equal((await llm()).status, 502);
assert.equal((await llm()).status, 502);
assert.equal((await llm()).status, 502);
const alerts = sent.filter((s) => /sendMessage/.test(s.url) && /Сбой/.test(s.body.text || ""));
assert.equal(alerts.length, 1, `ожидал 1 оповещение, пришло ${alerts.length}`);
assert.match(alerts[0].body.text, /429/);
globalThis.fetch = okFetch;

console.log("ok — пульт: авторизация, очередь, одобрение, защита от повторного тапа");
// 14. reel c video_url -> сначала sendVideo, потом карточка с кнопками
sent.length = 0;
await call("/api/queue", {
  method: "POST",
  headers: { "X-Admin-Key": "secret", "Content-Type": "application/json" },
  body: { kind: "reel", title: "Ролик 1 — мама", body: "на одобрение", payload: { video_url: "https://me-webapp.pages.dev/media/reel-01-mama.mp4" } },
});
const vid = sent.find((s) => /sendVideo/.test(s.url));
assert.ok(vid, "sendVideo не вызван");
assert.equal(vid.body.video, "https://me-webapp.pages.dev/media/reel-01-mama.mp4");
assert.ok(sent.findIndex((s) => /sendVideo/.test(s.url)) < sent.findIndex((s) => /sendMessage/.test(s.url)), "видео должно идти до карточки");

// 15. reel без video_url -> sendVideo НЕ вызывается
sent.length = 0;
await call("/api/queue", {
  method: "POST",
  headers: { "X-Admin-Key": "secret", "Content-Type": "application/json" },
  body: { kind: "reel", title: "Только текст" },
});
assert.ok(!sent.some((s) => /sendVideo/.test(s.url)), "sendVideo не должен вызываться без video_url");

// 16. чужой (не .mp4) URL в video_url отбрасывается
sent.length = 0;
await call("/api/queue", {
  method: "POST",
  headers: { "X-Admin-Key": "secret", "Content-Type": "application/json" },
  body: { kind: "reel", title: "x", payload: { video_url: "https://evil.example/x.exe" } },
});
assert.ok(!sent.some((s) => /sendVideo/.test(s.url)), "не-mp4 URL должен отклоняться");

console.log("ok — поддержка: вопрос дошёл, разметка обезврежена, ответ вернулся, лимит держит");
console.log("ok — ролик: видео уходит до карточки, только .mp4, только при наличии video_url");
