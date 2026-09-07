/**
 * Me — Telegram Mini App backend (Cloudflare Worker)
 *
 *   POST /api/llm       { initData, content, maxTokens }   -> универсальный ИИ-прокси на Gemini
 *                        content: строка ИЛИ массив [{type:"text",text}|{type:"image",source:{media_type,data}}]
 *   POST /api/save      { initData, analysis, source }      -> сохранить разбор в D1 + пуш в бот, вернуть { id }
 *   GET  /api/analyses?initData=...                         -> список разборов пользователя
 *   GET  /api/analysis?id=...&initData=...                  -> один разбор
 *   POST /webhook       (Telegram update)                   -> /start, /help
 *   GET  /setup?secret=SETUP_SECRET                         -> один раз: вебхук, команды, описания, кнопка-меню
 *
 * Secrets:  BOT_TOKEN, GEMINI_API_KEY, SETUP_SECRET
 * Vars:     WEBAPP_URL
 * Bindings: DB (D1)
 */

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      if (url.pathname === "/webhook" && request.method === "POST") return handleWebhook(request, env);
      if (url.pathname === "/setup") return handleSetup(url, env);
      if (url.pathname === "/api/llm" && request.method === "POST") return json(await apiLlm(request, env), 200, cors);
      if (url.pathname === "/api/save" && request.method === "POST") return json(await apiSave(request, env, ctx), 200, cors);
      if (url.pathname === "/api/analyses" && request.method === "GET") return json(await apiAnalyses(url, env), 200, cors);
      if (url.pathname === "/api/analysis" && request.method === "GET") return json(await apiAnalysis(url, env), 200, cors);
      if (url.pathname === "/") return new Response("Me backend OK");
      return json({ error: "not found" }, 404, cors);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500, cors);
    }
  },
};

/* ---------------- Telegram initData ---------------- */

async function verifyInitData(initData, botToken) {
  if (!initData) throw new Error("no initData");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const enc = new TextEncoder();
  const secret = await hmac(enc.encode("WebAppData"), enc.encode(botToken));
  const sig = await hmac(secret, enc.encode(dcs));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== hash) throw new Error("bad initData signature");
  if (Date.now() - Number(params.get("auth_date")) * 1000 > 24 * 3600 * 1000) throw new Error("initData expired");
  const user = JSON.parse(params.get("user") || "{}");
  if (!user.id) throw new Error("no user");
  return user;
}
async function hmac(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, msgBytes);
}

/* ---------------- Gemini proxy ---------------- */

async function apiLlm(request, env) {
  const { initData, content } = await request.json();
  await verifyInitData(initData, env.BOT_TOKEN);

  const parts = [];
  if (typeof content === "string") {
    parts.push({ text: content });
  } else if (Array.isArray(content)) {
    for (const c of content) {
      if (c && c.type === "text") parts.push({ text: c.text });
      else if (c && c.type === "image" && c.source)
        parts.push({ inline_data: { mime_type: c.source.media_type || "image/jpeg", data: c.source.data } });
    }
  }
  if (!parts.length) throw new Error("empty content");

  const r = await fetch(GEMINI_URL(env.GEMINI_API_KEY), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.3, maxOutputTokens: 2048 } }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("gemini: " + JSON.stringify(d).slice(0, 300));
  const text = d?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return { text };
}

/* ---------------- persistence + push ---------------- */

async function apiSave(request, env, ctx) {
  const { initData, analysis, source } = await request.json();
  const user = await verifyInitData(initData, env.BOT_TOKEN);
  const id = crypto.randomUUID();
  const created = Date.now();
  await env.DB.prepare(
    "INSERT INTO analyses (id, user_id, created_at, source, status, data) VALUES (?,?,?,?,?,?)"
  ).bind(id, user.id, created, source || "upload", "done", JSON.stringify(analysis || {})).run();

  const attn = (analysis?.markers || []).filter((m) => m.flag && m.flag !== "normal").length;
  const crit = (analysis?.critical || []).length;
  let text = "🧪 Анализ распознан и расшифрован.\n";
  if (crit) text += "⚠️ Есть показатель, с которым стоит срочно к врачу.\n";
  else if (attn) text += `${attn} показател${attn === 1 ? "ь" : "я/ей"} требуют внимания.\n`;
  else text += "Всё в пределах нормы.\n";
  text += "Откройте Me — разбор простыми словами уже готов.";

  ctx.waitUntil(sendMessage(env, user.id, text, {
    inline_keyboard: [[{ text: "Открыть разбор", web_app: { url: `${env.WEBAPP_URL}?startapp=blood_${id}` } }]],
  }));
  return { id };
}

async function apiAnalyses(url, env) {
  const user = await verifyInitData(url.searchParams.get("initData"), env.BOT_TOKEN);
  const { results } = await env.DB.prepare(
    "SELECT id, created_at, source, status, data FROM analyses WHERE user_id=? ORDER BY created_at ASC LIMIT 50"
  ).bind(user.id).all();
  return {
    items: (results || []).map((r) => ({
      id: r.id, created_at: r.created_at, source: r.source, status: r.status, analysis: safeParse(r.data),
    })),
  };
}

async function apiAnalysis(url, env) {
  const user = await verifyInitData(url.searchParams.get("initData"), env.BOT_TOKEN);
  const row = await env.DB.prepare(
    "SELECT id, created_at, source, status, data FROM analyses WHERE user_id=? AND id=?"
  ).bind(user.id, url.searchParams.get("id")).first();
  if (!row) throw new Error("not found");
  return { id: row.id, created_at: row.created_at, source: row.source, status: row.status, analysis: safeParse(row.data) };
}

/* ---------------- Telegram bot ---------------- */

async function handleWebhook(request, env) {
  const u = await request.json();
  const m = u.message;
  if (m && m.text) {
    if (m.text.startsWith("/start")) {
      await sendMessage(env, m.chat.id,
        "👋 <b>Me</b> — помощник по здоровью.\n\n" +
        "Сфотографируйте анализ или рецепт — я распознаю показатели и объясню каждый простыми словами, соберу график приёма лекарств и подготовлю отчёт для врача.\n\n" +
        "Нажмите кнопку ниже.",
        { inline_keyboard: [[{ text: "🩺 Открыть Me", web_app: { url: env.WEBAPP_URL } }]] });
    } else if (m.text.startsWith("/help")) {
      await sendMessage(env, m.chat.id,
        "Me переводит медицинские данные на понятный язык:\n\n" +
        "• фото анализа → разбор каждого показателя простыми словами\n" +
        "• фото рецепта → календарь приёма лекарств\n" +
        "• визит к врачу → голосовой опрос и структурированная запись\n" +
        "• отчёт для врача в один тап\n" +
        "• чат по вашим данным\n\n" +
        "Откройте приложение кнопкой «Открыть Me».");
    }
  }
  return new Response("ok");
}

async function sendMessage(env, chatId, text, replyMarkup) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId, text, parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: replyMarkup,
    }),
  });
  return r.json();
}

async function handleSetup(url, env) {
  if (url.searchParams.get("secret") !== env.SETUP_SECRET) return new Response("forbidden", { status: 403 });
  const base = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
  const call = (m, b) => fetch(`${base}/${m}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());
  const out = {};
  out.webhook = await call("setWebhook", { url: `${url.origin}/webhook`, allowed_updates: ["message"] });
  out.commands = await call("setMyCommands", { commands: [
    { command: "start", description: "Открыть приложение Me" },
    { command: "help", description: "Как это работает" },
  ] });
  out.menuButton = await call("setChatMenuButton", { menu_button: { type: "web_app", text: "Открыть Me", web_app: { url: env.WEBAPP_URL } } });
  out.shortDescription = await call("setMyShortDescription", { short_description: "Понимает ваши анализы и рецепты — объясняет простыми словами." });
  out.description = await call("setMyDescription", { description:
    "Me переводит медицинские данные на понятный язык. Сфотографируйте анализ или рецепт — приложение распознаёт показатели и объясняет каждый простыми словами, строит календарь приёма лекарств, фиксирует визиты к врачу и собирает отчёт для приёма. Есть чат по вашим данным и доступ для близких." });
  return json(out);
}

/* ---------------- utils ---------------- */

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...extra } });
}
function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
