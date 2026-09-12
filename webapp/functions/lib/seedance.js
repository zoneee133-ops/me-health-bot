/**
 * Seedance 2.5 (ByteDance) через очередь fal.ai.
 * Секрет: FAL_KEY (fal.ai dashboard → Keys).
 * Протокол очереди (submit → status_url → response_url) — общий для всех
 * моделей fal.ai: https://docs.fal.ai/model-apis/queue
 *
 * ВНИМАНИЕ: имена полей ниже (prompt/aspect_ratio/resolution/duration/
 * image_url/end_image_url) взяты из публичного описания модели на
 * fal.ai/models/bytedance/seedance-2.5 на момент написания (сен. 2026),
 * фактический вызов не протестирован (нет ключа). Перед первым реальным
 * /reel сверь их в fal.ai playground — эндпоинты меняют параметры без
 * предупреждения.
 */

const FAL_QUEUE_BASE = "https://queue.fal.run";
const SEEDANCE_APP = "fal-ai/bytedance/seedance-2.5";

const MODES = {
  text: "text-to-video",
  image: "image-to-video",
  reference: "reference-to-video",
};

export async function submitSeedanceJob(env, { mode = "text", prompt, imageUrl, endImageUrl, duration, resolution, aspectRatio, extra } = {}) {
  if (!env.FAL_KEY) throw new Error("FAL_KEY not set");
  const path = MODES[mode];
  if (!path) throw new Error(`unknown seedance mode: ${mode}`);
  if (!prompt) throw new Error("prompt required");

  const input = { prompt, ...(extra || {}) };
  if (duration != null) input.duration = duration;
  if (resolution) input.resolution = resolution;
  if (aspectRatio) input.aspect_ratio = aspectRatio;
  if (mode === "image" || mode === "reference") {
    if (!imageUrl) throw new Error(`${mode} mode requires imageUrl`);
    input.image_url = imageUrl;
    if (endImageUrl) input.end_image_url = endImageUrl;
  }

  const r = await fetch(`${FAL_QUEUE_BASE}/${SEEDANCE_APP}/${path}`, {
    method: "POST",
    headers: { Authorization: `Key ${env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`fal submit failed: ${r.status} ${(await r.text().catch(() => "")).slice(0, 300)}`);
  const data = await r.json();
  if (!data || !data.status_url || !data.response_url) throw new Error("fal submit: unexpected response shape");
  return data; // { request_id, status_url, response_url, cancel_url }
}

export async function pollSeedanceJob(job, { falKey, intervalMs = 8000, timeoutMs = 4 * 60 * 1000 } = {}) {
  const headers = { Authorization: `Key ${falKey}` };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await fetch(job.status_url, { headers });
    if (!r.ok) throw new Error(`fal status failed: ${r.status}`);
    const s = await r.json();
    if (s.status === "COMPLETED") {
      const rr = await fetch(job.response_url, { headers });
      if (!rr.ok) throw new Error(`fal result failed: ${rr.status}`);
      return await rr.json();
    }
    if (s.status === "FAILED" || s.status === "ERROR") throw new Error(`fal job failed: ${JSON.stringify(s).slice(0, 500)}`);
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error(`fal job timed out (request_id=${job.request_id})`);
}

export function extractVideoUrl(output) {
  const v = (output && (output.video || (output.output && output.output.video))) || output;
  const url = v && (v.url || v.video_url);
  if (typeof url !== "string" || !url.startsWith("http")) {
    throw new Error("no video url in fal response: " + JSON.stringify(output).slice(0, 300));
  }
  return url;
}
