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

console.log("ok — пульт: авторизация, очередь, одобрение, защита от повторного тапа");
