#!/usr/bin/env node
/**
 * Генерация клипа через Seedance 2.5 (ByteDance) для локального
 * контент-пайплайна (Remotion + tts.py). Провайдер: fal.ai (очередь).
 *
 * Нужен ключ: export FAL_KEY=...  (fal.ai dashboard → Keys)
 *
 * Примеры:
 *   node content/_tools/seedance.mjs \
 *     --prompt "женщина держит телефон с приложением Me, тёплый свет" \
 *     --out content/reel-eozinofily/seedance-clip.mp4
 *
 *   node content/_tools/seedance.mjs --mode image \
 *     --image https://example.com/frame.jpg \
 *     --prompt "камера медленно наезжает на экран телефона" \
 *     --out content/reel-eozinofily/seedance-clip.mp4
 *
 * ВНИМАНИЕ: имена полей запроса (prompt/aspect_ratio/resolution/duration/
 * image_url/end_image_url) взяты из публичного описания модели на
 * fal.ai/models/bytedance/seedance-2.5 (сен. 2026), сам вызов не
 * протестирован — до первого реального запуска сверь их в fal.ai
 * playground. Протокол очереди (submit → status → result) — общий для
 * всех моделей fal.ai: https://docs.fal.ai/model-apis/queue
 */

import { writeFile } from "node:fs/promises";

const FAL_QUEUE_BASE = "https://queue.fal.run";
const SEEDANCE_APP = "fal-ai/bytedance/seedance-2.5";
const MODES = { text: "text-to-video", image: "image-to-video", reference: "reference-to-video" };

function parseArgs(argv) {
  const out = { mode: "text", pollIntervalSec: 5, timeoutSec: 600 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    switch (key) {
      case "prompt": out.prompt = val; i++; break;
      case "mode": out.mode = val; i++; break;
      case "image": out.imageUrl = val; i++; break;
      case "end-image": out.endImageUrl = val; i++; break;
      case "duration": out.duration = Number(val); i++; break;
      case "resolution": out.resolution = val; i++; break;
      case "aspect": out.aspectRatio = val; i++; break;
      case "out": out.outPath = val; i++; break;
      case "poll-interval": out.pollIntervalSec = Number(val); i++; break;
      case "timeout": out.timeoutSec = Number(val); i++; break;
      default: throw new Error(`unknown flag --${key}`);
    }
  }
  return out;
}

async function submit(args) {
  const path = MODES[args.mode];
  if (!path) throw new Error(`unknown --mode ${args.mode} (text|image|reference)`);
  if (!args.prompt) throw new Error("--prompt required");
  if (!args.outPath) throw new Error("--out required");

  const input = { prompt: args.prompt };
  if (args.duration != null && !Number.isNaN(args.duration)) input.duration = args.duration;
  if (args.resolution) input.resolution = args.resolution;
  if (args.aspectRatio) input.aspect_ratio = args.aspectRatio;
  if (args.mode === "image" || args.mode === "reference") {
    if (!args.imageUrl) throw new Error(`--mode ${args.mode} requires --image`);
    input.image_url = args.imageUrl;
    if (args.endImageUrl) input.end_image_url = args.endImageUrl;
  }

  const r = await fetch(`${FAL_QUEUE_BASE}/${SEEDANCE_APP}/${path}`, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`submit failed: ${r.status} ${(await r.text().catch(() => "")).slice(0, 300)}`);
  const data = await r.json();
  if (!data.status_url || !data.response_url) throw new Error("unexpected submit response shape: " + JSON.stringify(data).slice(0, 300));
  return data;
}

async function poll(job, { pollIntervalSec, timeoutSec }) {
  const headers = { Authorization: `Key ${process.env.FAL_KEY}` };
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    const r = await fetch(job.status_url, { headers });
    if (!r.ok) throw new Error(`status failed: ${r.status}`);
    const s = await r.json();
    process.stdout.write(`\r  статус: ${s.status}${s.queue_position != null ? ` (позиция в очереди: ${s.queue_position})` : ""}   `);
    if (s.status === "COMPLETED") {
      const rr = await fetch(job.response_url, { headers });
      if (!rr.ok) throw new Error(`result failed: ${rr.status}`);
      console.log();
      return await rr.json();
    }
    if (s.status === "FAILED" || s.status === "ERROR") throw new Error(`job failed: ${JSON.stringify(s).slice(0, 500)}`);
    await new Promise((res) => setTimeout(res, pollIntervalSec * 1000));
  }
  throw new Error(`timed out after ${timeoutSec}s (request_id=${job.request_id})`);
}

function extractVideoUrl(output) {
  const v = (output && (output.video || (output.output && output.output.video))) || output;
  const url = v && (v.url || v.video_url);
  if (typeof url !== "string" || !url.startsWith("http")) {
    throw new Error("no video url in response: " + JSON.stringify(output).slice(0, 500));
  }
  return url;
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY env var not set");
  const args = parseArgs(process.argv.slice(2));

  console.log(`→ Seedance 2.5 (${args.mode}): "${args.prompt}"`);
  const job = await submit(args);
  console.log(`  request_id: ${job.request_id}`);

  const output = await poll(job, args);
  const videoUrl = extractVideoUrl(output);
  console.log(`  готово: ${videoUrl}`);

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`download failed: ${videoRes.status}`);
  const buf = Buffer.from(await videoRes.arrayBuffer());
  await writeFile(args.outPath, buf);
  console.log(`✓ сохранено: ${args.outPath} (${(buf.length / 1024 / 1024).toFixed(1)} МБ)`);
}

main().catch((e) => {
  console.error(`\n✗ ${e && e.message ? e.message : e}`);
  process.exit(1);
});
