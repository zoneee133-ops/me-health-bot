/**
 * Me backend as Cloudflare Pages Functions (workers.dev заблокирован в РФ, pages.dev — нет).
 * Роуты ограничены в webapp/_routes.json: /api/*, /webhook, /setup.
 * env приходит из Pages project: binding DB (D1), vars/secrets BOT_TOKEN / OPENROUTER_KEY / SETUP_SECRET / WEBAPP_URL.
 */

const DEFAULT_MODEL = "minimax/minimax-m3:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function onRequest(context) {
  const { request, env } = context;
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
    if (url.pathname === "/api/llm-test" && request.method === "POST" && url.searchParams.get("secret") === env.SETUP_SECRET) {
      const body = await request.json();
      if (url.searchParams.get("raw") === "1") return json(await orRaw(body.content, body.maxTokens, env, body.model), 200, cors);
      return json(await llmRaw(body.content, body.maxTokens, env, body.model), 200, cors);
    }
    if (url.pathname === "/api/save" && request.method === "POST") return json(await apiSave(request, env, context), 200, cors);
    if (url.pathname === "/api/analyses" && request.method === "GET") return json(await apiAnalyses(url, env), 200, cors);
    if (url.pathname === "/api/analysis" && request.method === "GET") return json(await apiAnalysis(url, env), 200, cors);
    return json({ error: "not found" }, 404, cors);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500, cors);
  }
}

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

/* ---------------- OpenRouter proxy ---------------- */

async function apiLlm(request, env) {
  const { initData, content, maxTokens } = await request.json();
  await verifyInitData(initData, env.BOT_TOKEN);
  return llmRaw(content, maxTokens, env);
}

// список моделей-кандидатов: пробуем по очереди, берём первую с непустым ответом.
// OpenRouter постоянно закрывает :free модели, поэтому нужен запас.
const MODEL_CHAIN = [
  "minimax/minimax-m3",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash-001",
  "qwen/qwen2.5-vl-72b-instruct",
];

function toParts(content) {
  const parts = [];
  if (typeof content === "string") {
    parts.push({ type: "text", text: content });
  } else if (Array.isArray(content)) {
    for (const c of content) {
      if (c && c.type === "text") parts.push({ type: "text", text: c.text });
      else if (c && c.type === "image" && c.source)
        parts.push({ type: "image_url", image_url: { url: `data:${c.source.media_type || "image/jpeg"};base64,${c.source.data}` } });
    }
  }
  return parts;
}

function extractText(d) {
  const m = d?.choices?.[0]?.message;
  if (!m) return "";
  let t = m.content;
  if (Array.isArray(t)) t = t.map((p) => p.text || "").join("");
  if (typeof t === "string" && t.trim()) return t;
  if (typeof m.reasoning === "string" && m.reasoning.trim()) return m.reasoning; // reasoning-модели
  return "";
}

async function orCall(model, parts, maxTokens, env) {
  const r = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENROUTER_KEY}`,
      "HTTP-Referer": env.WEBAPP_URL || "https://t.me",
      "X-Title": "Me Health",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: parts }],
      max_tokens: maxTokens || 2000,
      temperature: 0.2,
    }),
  });
  return { ok: r.ok, status: r.status, data: await r.json() };
}

async function orRaw(content, maxTokens, env, modelOverride) {
  const parts = toParts(content);
  const model = modelOverride || env.OPENROUTER_MODEL || MODEL_CHAIN[0];
  const res = await orCall(model, parts, maxTokens, env);
  return { model, status: res.status, data: res.data };
}

async function llmRaw(content, maxTokens, env, modelOverride) {
  const parts = toParts(content);
  if (!parts.length) throw new Error("empty content");
  const chain = modelOverride
    ? [modelOverride]
    : [env.OPENROUTER_MODEL, ...MODEL_CHAIN].filter(Boolean);
  let lastErr = "no models";
  for (const model of chain) {
    try {
      const res = await orCall(model, parts, maxTokens, env);
      if (!res.ok) { lastErr = "openrouter " + res.status + ": " + JSON.stringify(res.data).slice(0, 200); continue; }
      const text = extractText(res.data);
      if (text.trim()) return { text: text.trim() };
      lastErr = "empty from " + model;
    } catch (e) {
      lastErr = String((e && e.message) || e);
    }
  }
  throw new Error(lastErr);
}

/* ---------------- persistence + push ---------------- */

async function apiSave(request, env, ctx) {
  const { initData, analysis, source } = await request.json();
  const user = await verifyInitData(initData, env.BOT_TOKEN);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO analyses (id, user_id, created_at, source, status, data) VALUES (?,?,?,?,?,?)"
  ).bind(id, user.id, Date.now(), source || "upload", "done", JSON.stringify(analysis || {})).run();

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
  const site = env.WEBAPP_URL || url.origin;
  const base = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
  const call = (m, b) => fetch(`${base}/${m}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());
  const out = {};
  out.webhook = await call("setWebhook", { url: `${site}/webhook`, allowed_updates: ["message"], drop_pending_updates: true });
  out.webhookInfo = await call("getWebhookInfo", {});
  out.commands = await call("setMyCommands", { commands: [
    { command: "start", description: "Открыть приложение Me" },
    { command: "help", description: "Как это работает" },
  ] });
  out.menuButton = await call("setChatMenuButton", { menu_button: { type: "web_app", text: "Открыть Me", web_app: { url: site } } });
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
