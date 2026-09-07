/**
 * me-cron — единственная задача: по расписанию дёрнуть /api/tick на Pages,
 * который проверяет расписание лекарств в D1 и шлёт напоминания в Telegram.
 */
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch(`${env.TICK_URL}?key=${encodeURIComponent(env.TICK_KEY)}`).catch(() => {})
    );
  },
  // ручной вызов для проверки: просто открой URL воркера (если есть) — вернёт ok
  async fetch(req, env) {
    const r = await fetch(`${env.TICK_URL}?key=${encodeURIComponent(env.TICK_KEY)}`);
    return new Response(await r.text(), { headers: { "content-type": "application/json" } });
  },
};
