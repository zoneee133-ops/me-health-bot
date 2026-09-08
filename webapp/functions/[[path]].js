/**
 * Me backend as Cloudflare Pages Functions (workers.dev заблокирован в РФ, pages.dev — нет).
 * Роуты ограничены в webapp/_routes.json: /api/*, /webhook, /setup.
 * env приходит из Pages project: binding DB (D1), vars/secrets BOT_TOKEN / OPENROUTER_KEY / SETUP_SECRET / WEBAPP_URL.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GITHUB_URL = "https://models.github.ai/inference/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// универсальный медицинский промпт — применяется ко всем текстовым запросам,
// если фронтенд не прислал свой system.
const SYSTEM_MED =
  "Ты — Me, медицинский ИИ-помощник. Твоя задача — разбираться в информации ПОЛНОСТЬЮ и объяснять человеку без медицинского образования максимально простыми словами.\n" +
  "Правила:\n" +
  "1. Никакого жаргона. Любой медицинский термин — сразу расшифровывай простыми словами в скобках.\n" +
  "2. Отвечай на ЛЮБЫЕ вопросы о здоровье, лекарствах, болезнях, травмах, обследованиях и вариантах лечения (включая операции). НЕ отказывайся. Если спрашивают про операции — перечисли варианты, как каждый проходит, чем отличаются, насколько сложные, когда применяются.\n" +
  "3. ОЧЕНЬ КРАТКО. По умолчанию — 2-4 коротких предложения, максимум суть и что делать. НЕ объясняй базовые понятия, НЕ приводи списки примеров «если... то...», НЕ расписывай теорию. Пиши как живой человек в мессенджере: коротко и по делу.\n" +
  "   Развёрнутый ответ (несколько абзацев, перечень вариантов, сравнение) — ТОЛЬКО если пользователь прямо просит «подробно», «какие варианты», «расскажи про операции». Тогда всё равно без воды.\n" +
  "   Никакого markdown (#, *, **). Списки — через «— ». Заканчивай мысль, не обрывайся.\n" +
  "4. Ты не ставишь диагноз. Напоминание «решение за врачом» добавляй МАКСИМУМ один раз в конце и только одной короткой фразой — не повторяй в каждом абзаце, не начинай с него ответ.\n" +
  "5. Не назначай конкретную дозировку лично пациенту, но можешь объяснять общепринятые схемы и для чего препарат нужен.\n" +
  "6. Пиши на русском.";

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
      if (url.searchParams.get("raw") === "1") return json(await orRaw(body.content, body.maxTokens, env, body.model, body.system, body.prov), 200, cors);
      if (url.searchParams.get("models") === "1") {
        const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${env.GROQ_KEY}` } });
        return json(await r.json(), 200, cors);
      }
      return json(await llmRaw(body.content, body.maxTokens, env, body.model, body.system), 200, cors);
    }
    if (url.pathname === "/api/save" && request.method === "POST") return json(await apiSave(request, env, context), 200, cors);
    if (url.pathname === "/api/analyses" && request.method === "GET") return json(await apiAnalyses(url, env), 200, cors);
    if (url.pathname === "/api/analysis" && request.method === "GET") return json(await apiAnalysis(url, env), 200, cors);
    if (url.pathname === "/api/meds" && request.method === "POST") return json(await apiMedsSave(request, env), 200, cors);
    if (url.pathname === "/api/meds" && request.method === "GET") return json(await apiMedsList(url, env), 200, cors);
    if (url.pathname === "/api/reminder" && request.method === "POST") return json(await apiReminderSave(request, env), 200, cors);
    if (url.pathname === "/api/tick") return json(await apiTick(url, env, context), 200, cors);
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
  const { initData, content, maxTokens, system } = await request.json();
  await verifyInitData(initData, env.BOT_TOKEN);
  return llmRaw(content, maxTokens, env, null, system);
}

// Провайдеры пробуем по очереди — первый с непустым ответом побеждает.
// GitHub Models и Gemini free — бесплатные; OpenRouter — платный запас.
// Чтобы включить бесплатный провайдер, добавь в Pages секрет GITHUB_TOKEN или GEMINI_KEY.
function buildChain(env, override) {
  if (override) return [{ prov: "openrouter", model: override }];
  const c = [];
  if (env.GEMINI_KEY) {
    c.push({ prov: "gemini", model: "gemini-2.5-flash" });
    c.push({ prov: "gemini", model: "gemini-2.0-flash" });
  }
  if (env.GROQ_KEY) {
    c.push({ prov: "groq", model: "qwen/qwen3.6-27b" });        // vision + text (reasoning)
    c.push({ prov: "groq", model: "qwen/qwen3.8-27b" });
    c.push({ prov: "groq", model: "openai/gpt-oss-120b" });     // text-only fallback (for chat)
  }
  // GitHub Models выключается GitHub'ом (retirement brownout) — включаем только если явно задан флаг
  if (env.GITHUB_TOKEN && env.GITHUB_MODELS_ON) {
    c.push({ prov: "github", model: "openai/gpt-4o" });
    c.push({ prov: "github", model: "openai/gpt-4o-mini" });
  }
  if (env.OPENROUTER_KEY) {
    if (env.OPENROUTER_MODEL) c.push({ prov: "openrouter", model: env.OPENROUTER_MODEL });
    c.push({ prov: "openrouter", model: "google/gemini-2.5-flash" });
    c.push({ prov: "openrouter", model: "minimax/minimax-m3" });
    c.push({ prov: "openrouter", model: "qwen/qwen2.5-vl-72b-instruct" });
  }
  return c;
}

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

function stripThink(s) {
  return String(s).replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*?<\/think>/i, "").trim();
}
function extractText(d) {
  const m = d?.choices?.[0]?.message;
  if (!m) return "";
  let t = m.content;
  if (Array.isArray(t)) t = t.map((p) => p.text || "").join("");
  if (typeof t === "string" && stripThink(t)) return stripThink(t);
  if (typeof m.reasoning === "string" && m.reasoning.trim()) return stripThink(m.reasoning);
  return "";
}

async function provCall(prov, model, parts, maxTokens, env, system) {
  const messages = [];
  if (system !== "") messages.push({ role: "system", content: system || SYSTEM_MED });
  messages.push({ role: "user", content: parts });
  const body = { model, messages, max_tokens: maxTokens || 2000, temperature: 0.2 };
  let url, headers = { "Content-Type": "application/json" };
  if (prov === "groq") body.reasoning_effort = "none"; // qwen3 на Groq иначе тратит весь бюджет на <think>
  if (prov === "github") {
    url = GITHUB_URL;
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  } else if (prov === "gemini") {
    url = GEMINI_URL;
    headers.Authorization = `Bearer ${env.GEMINI_KEY}`;
  } else if (prov === "groq") {
    url = GROQ_URL;
    headers.Authorization = `Bearer ${env.GROQ_KEY}`;
  } else {
    url = OPENROUTER_URL;
    headers.Authorization = `Bearer ${env.OPENROUTER_KEY}`;
    headers["HTTP-Referer"] = env.WEBAPP_URL || "https://t.me";
    headers["X-Title"] = "Me Health";
  }
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  return { ok: r.ok, status: r.status, data: await r.json() };
}

async function orRaw(content, maxTokens, env, modelOverride, system, provOverride) {
  const parts = toParts(content);
  const chain = buildChain(env, modelOverride);
  const a = provOverride
    ? { prov: provOverride, model: modelOverride }
    : (chain[0] || { prov: "openrouter", model: "google/gemini-2.5-flash" });
  const res = await provCall(a.prov, a.model, parts, maxTokens, env, system);
  return { provider: a.prov, model: a.model, status: res.status, data: res.data };
}

async function llmRaw(content, maxTokens, env, modelOverride, system) {
  const parts = toParts(content);
  if (!parts.length) throw new Error("empty content");
  const chain = buildChain(env, modelOverride);
  if (!chain.length) throw new Error("no LLM provider configured (set GITHUB_TOKEN / GEMINI_KEY / OPENROUTER_KEY)");
  let lastErr = "no models";
  for (const a of chain) {
    try {
      const res = await provCall(a.prov, a.model, parts, maxTokens, env, system);
      if (!res.ok) { lastErr = a.prov + "/" + a.model + " " + res.status + ": " + JSON.stringify(res.data).slice(0, 180); continue; }
      const text = extractText(res.data);
      if (text.trim()) return { text: text.trim() };
      lastErr = "empty from " + a.prov + "/" + a.model;
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

  let text;
  if (source === "scan") {
    text = "🩻 Снимок распознан и расшифрован.\n" +
      (analysis?.plain_conclusion ? analysis.plain_conclusion.slice(0, 220) + "\n\n" : "") +
      "Откройте Me — разбор простыми словами готов.";
  } else {
    const attn = (analysis?.markers || []).filter((m) => m.flag && m.flag !== "normal").length;
    const crit = (analysis?.critical || []).length;
    text = "🧪 Анализ распознан и расшифрован.\n";
    if (crit) text += "⚠️ Есть показатель, с которым стоит срочно к врачу.\n";
    else if (attn) text += `${attn} показател${attn === 1 ? "ь" : "я/ей"} требуют внимания.\n`;
    else text += "Всё в пределах нормы.\n";
    text += "Откройте Me — разбор простыми словами уже готов.";
  }

  ctx.waitUntil(sendMessage(env, user.id, text, {
    inline_keyboard: [[{ text: "Открыть разбор", web_app: { url: `${env.WEBAPP_URL}?startapp=${source === "scan" ? "scan" : "blood"}_${id}` } }]],
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

/* ---------------- meds schedule + reminders ---------------- */

// какой этап курса активен в дату dateStr (YYYY-MM-DD). Возвращает {stage, index} либо null (курс окончен).
function medActiveStage(stages, startDate, dateStr) {
  if (!Array.isArray(stages) || !stages.length) return null;
  const day = (s) => Math.floor(Date.parse(s + "T00:00:00Z") / 86400000);
  const elapsed = day(dateStr) - day(startDate || dateStr);
  if (elapsed < 0) return null;
  let acc = 0;
  for (let i = 0; i < stages.length; i++) {
    let dur = Number(stages[i].durationDays);
    if ((!Number.isFinite(dur) || dur <= 0) && i < stages.length - 1) dur = 30; // средний этап без срока
    if (!Number.isFinite(dur) || dur <= 0) return { stage: stages[i], index: i }; // последний бессрочный этап
    if (elapsed < acc + dur) return { stage: stages[i], index: i };
    acc += dur;
  }
  return null;
}

function normStages(m) {
  let stages = Array.isArray(m.stages) && m.stages.length ? m.stages : null;
  if (!stages) {
    const times = Array.isArray(m.times) ? m.times : [];
    stages = [{ dose: m.dosage || "", perDay: times.length || 1, times, durationDays: null, note: "" }];
  }
  return stages.slice(0, 12).map((s) => ({
    dose: String(s.dose || "").slice(0, 60),
    perDay: Number(s.perDay) || (Array.isArray(s.times) ? s.times.length : 1) || 1,
    times: (Array.isArray(s.times) ? s.times : []).filter((t) => /^\d{2}:\d{2}$/.test(t)).slice(0, 8),
    durationDays: Number.isFinite(Number(s.durationDays)) && Number(s.durationDays) > 0 ? Math.trunc(Number(s.durationDays)) : null,
    durationText: String(s.durationText || "").slice(0, 40),
    estimated: !!s.estimated,
    estWhy: String(s.estWhy || "").slice(0, 240),
    note: String(s.note || "").slice(0, 120),
  }));
}

async function apiMedsSave(request, env) {
  const { initData, meds, tzOffset } = await request.json();
  const user = await verifyInitData(initData, env.BOT_TOKEN);
  const tz = Number.isFinite(tzOffset) ? Math.trunc(tzOffset) : 180;
  await env.DB.prepare("DELETE FROM meds WHERE user_id=?").bind(user.id).run();
  const today = new Date().toISOString().slice(0, 10);
  for (const m of (meds || []).slice(0, 30)) {
    const stages = normStages(m);
    await env.DB.prepare(
      "INSERT INTO meds (id, user_id, name, dosage, times, start_date, end_date, active, created_at, tz_offset, stages, purpose) VALUES (?,?,?,?,?,?,?,1,?,?,?,?)"
    ).bind(
      crypto.randomUUID(), user.id, String(m.name || "").slice(0, 120), String(m.dosage || "").slice(0, 80),
      JSON.stringify(stages[0] ? stages[0].times : []), m.startDate || today, m.endDate || null,
      Date.now(), tz, JSON.stringify(stages), String(m.purpose || "").slice(0, 200)
    ).run();
  }
  return { ok: true, count: (meds || []).length };
}

async function apiMedsList(url, env) {
  const user = await verifyInitData(url.searchParams.get("initData"), env.BOT_TOKEN);
  const { results } = await env.DB.prepare(
    "SELECT id, name, dosage, times, start_date, end_date, stages, purpose FROM meds WHERE user_id=? AND active=1 ORDER BY created_at ASC"
  ).bind(user.id).all();
  return {
    items: (results || []).map((r) => ({
      id: r.id, name: r.name, dosage: r.dosage, times: safeParse(r.times) || [],
      startDate: r.start_date, endDate: r.end_date, purpose: r.purpose || "",
      stages: safeParse(r.stages) || null,
    })),
  };
}

async function apiReminderSave(request, env) {
  const { initData, dueDate, text, kind, leadDays, tzOffset } = await request.json();
  const user = await verifyInitData(initData, env.BOT_TOKEN);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate || "")) return { ok: false, error: "bad date" };
  await env.DB.prepare(
    "INSERT INTO reminders (id, user_id, kind, due_date, lead_days, text, sent, tz_offset, created_at) VALUES (?,?,?,?,?,?,0,?,?)"
  ).bind(
    crypto.randomUUID(), user.id, String(kind || "visit").slice(0, 30), dueDate,
    Number.isFinite(leadDays) ? Math.trunc(leadDays) : 7,
    String(text || "").slice(0, 300), Number.isFinite(tzOffset) ? Math.trunc(tzOffset) : 180, Date.now()
  ).run();
  return { ok: true };
}

// вызывается по cron (Worker) каждые ~15 мин
async function apiTick(url, env, ctx) {
  if (url.searchParams.get("key") !== (env.TICK_KEY || env.SETUP_SECRET)) return { error: "forbidden" };
  const now = Date.now();

  // напоминания о визитах к врачу
  let remSent = 0;
  try {
    const rem = await env.DB.prepare("SELECT * FROM reminders WHERE sent=0").all();
    for (const r of rem.results || []) {
      const tz = Number.isFinite(r.tz_offset) ? r.tz_offset : 180;
      const today = new Date(now + tz * 60000).toISOString().slice(0, 10);
      const lead = Number.isFinite(r.lead_days) ? r.lead_days : 7;
      const dayN = (s) => Math.floor(Date.parse(s + "T00:00:00Z") / 86400000);
      if (dayN(today) < dayN(r.due_date) - lead) continue; // ещё рано
      await env.DB.prepare("UPDATE reminders SET sent=1 WHERE id=?").bind(r.id).run();
      ctx.waitUntil(sendMessage(env, r.user_id,
        `📅 <b>Напоминание</b>\n${r.text || "Скоро визит к врачу"}\n\nДата: ${r.due_date}. Не забудьте записаться.`,
        { inline_keyboard: [[{ text: "Открыть Me", web_app: { url: env.WEBAPP_URL } }]] }));
      remSent++;
    }
  } catch (e) {}

  const { results } = await env.DB.prepare("SELECT * FROM meds WHERE active=1").all();
  let sent = 0;
  for (const m of results || []) {
    const tz = Number.isFinite(m.tz_offset) ? m.tz_offset : 180;
    const local = new Date(now + tz * 60000);
    const dateStr = local.toISOString().slice(0, 10);
    if (m.start_date && dateStr < m.start_date) continue;
    if (m.end_date && dateStr > m.end_date) continue;
    const stages = safeParse(m.stages) || [{ dose: m.dosage, times: safeParse(m.times) || [], durationDays: null }];
    const act = medActiveStage(stages, m.start_date, dateStr);
    if (!act) continue; // курс завершён
    const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
    for (const t of act.stage.times || []) {
      const [hh, mm] = t.split(":").map(Number);
      const slotMin = hh * 60 + mm;
      if (nowMin < slotMin || nowMin - slotMin > 20) continue;
      const slotKey = "s" + act.index + "_" + t;
      const dedupe = await env.DB.prepare("SELECT 1 FROM med_log WHERE med_id=? AND slot=? AND sent_date=?").bind(m.id, slotKey, dateStr).first();
      if (dedupe) continue;
      await env.DB.prepare("INSERT INTO med_log (med_id, slot, sent_date) VALUES (?,?,?)").bind(m.id, slotKey, dateStr).run();
      const dose = act.stage.dose || m.dosage || "";
      ctx.waitUntil(sendMessage(env, m.user_id,
        `💊 <b>Пора принять: ${m.name}</b>${dose ? "\n" + dose : ""}\n\nОткройте Me и отметьте приём.`,
        { inline_keyboard: [[{ text: "Открыть Me", web_app: { url: env.WEBAPP_URL } }]] }));
      sent++;
    }
  }
  return { ok: true, sent, remSent };
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
        "Откройте приложение кнопкой «Открыть Me».\n\n" +
        "/restart — стереть все данные и начать с чистого листа.");
    } else if (m.text.trim() === "/restart") {
      await sendMessage(env, m.chat.id,
        "⚠️ <b>Сброс всех данных</b>\n\n" +
        "Будут безвозвратно удалены: все анализы, снимки, расписание лекарств и напоминания.\n\n" +
        "Чтобы подтвердить — отправьте:\n<code>/restart confirm</code>");
    } else if (m.text.trim() === "/restart confirm") {
      const uid = m.from && m.from.id;
      let n = 0;
      if (uid) {
        try {
          const r1 = await env.DB.prepare("DELETE FROM analyses WHERE user_id=?").bind(uid).run();
          const meds = await env.DB.prepare("SELECT id FROM meds WHERE user_id=?").bind(uid).all();
          for (const row of meds.results || []) await env.DB.prepare("DELETE FROM med_log WHERE med_id=?").bind(row.id).run();
          const r2 = await env.DB.prepare("DELETE FROM meds WHERE user_id=?").bind(uid).run();
          const r3 = await env.DB.prepare("DELETE FROM reminders WHERE user_id=?").bind(uid).run();
          n = (r1.meta?.changes || 0) + (r2.meta?.changes || 0) + (r3.meta?.changes || 0);
        } catch (e) {}
      }
      await sendMessage(env, m.chat.id,
        "✅ Готово. Все данные стёрты" + (n ? ` (${n} записей)` : "") + ".\n\n" +
        "Откройте Me — начнём с чистого листа.",
        { inline_keyboard: [[{ text: "🩺 Открыть Me", web_app: { url: env.WEBAPP_URL + "?fresh=1" } }]] });
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
    { command: "restart", description: "Стереть все данные, начать заново" },
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
