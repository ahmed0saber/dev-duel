#!/usr/bin/env node
// Renders motion-graphic/index.html frame-by-frame (MG.seek + screenshot) and
// encodes it with audio.wav into an MP4. Frame-exact, independent of machine speed.
//
// Usage:
//   node motion-graphic/record.mjs [--fps 30] [--workers 4] [--from 0] [--to 269.56]
//                                  [--out motion-graphic/dev-duel.mp4] [--crf 18]
//                                  [--png] [--no-audio]

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const WIDTH = 1920;
const HEIGHT = 1080;

function parseArgs(argv) {
  const opts = {
    fps: 30,
    workers: Math.max(1, Math.min(4, os.cpus().length - 1)),
    from: 0,
    to: null,
    out: path.join(HERE, "dev-duel.mp4"),
    crf: 18,
    png: false,
    audio: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--fps") opts.fps = Number(next());
    else if (a === "--workers") opts.workers = Math.max(1, Number(next()));
    else if (a === "--from") opts.from = Number(next());
    else if (a === "--to") opts.to = Number(next());
    else if (a === "--out") opts.out = path.resolve(next());
    else if (a === "--crf") opts.crf = Number(next());
    else if (a === "--png") opts.png = true;
    else if (a === "--no-audio") opts.audio = false;
    else if (a === "-h" || a === "--help") {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 9).join("\n"));
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (rel.endsWith("/")) rel += "index.html";
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end();
        return;
      }
      const data = await fsp.readFile(file);
      res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function runFfmpeg(args, { stdin = false } = {}) {
  const proc = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: [stdin ? "pipe" : "ignore", "inherit", "inherit"],
  });
  const done = new Promise((resolve, reject) => {
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  });
  return { proc, done };
}

function writeFrame(stream, buf) {
  return stream.write(buf) ? Promise.resolve() : new Promise((r) => stream.once("drain", r));
}

async function renderSegment({ browser, url, opts, startFrame, endFrame, segFile, onFrame }) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("[page error]", err.message));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.MG && window.MG.ready, null, { timeout: 60000 });

  const { proc, done } = runFfmpeg(
    [
      "-f", "image2pipe",
      "-framerate", String(opts.fps),
      "-c:v", opts.png ? "png" : "mjpeg",
      "-i", "-",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", String(opts.crf),
      "-pix_fmt", "yuv420p",
      "-r", String(opts.fps),
      segFile,
    ],
    { stdin: true },
  );

  for (let f = startFrame; f < endFrame; f++) {
    const t = opts.from + f / opts.fps;
    await page.evaluate(
      (time) =>
        new Promise((resolve) => {
          window.MG.seek(time);
          requestAnimationFrame(() => resolve());
        }),
      t,
    );
    const buf = await page.screenshot(
      opts.png ? { type: "png" } : { type: "jpeg", quality: 95 },
    );
    await writeFrame(proc.stdin, buf);
    onFrame();
  }

  proc.stdin.end();
  await done;
  await context.close();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const server = await startServer();
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/motion-graphic/?mode=record`;
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "devduel-rec-"));
  const browser = await chromium.launch({
    args: ["--force-color-profile=srgb", "--hide-scrollbars", "--font-render-hinting=none"],
  });

  try {
    if (opts.to == null) {
      const probe = await browser.newPage();
      await probe.goto(url);
      await probe.waitForFunction(() => window.MG && window.MG.ready, null, { timeout: 60000 });
      opts.to = await probe.evaluate(() => window.MG.duration);
      await probe.close();
    }

    const duration = opts.to - opts.from;
    if (!(duration > 0)) throw new Error("--to must be greater than --from");
    const totalFrames = Math.round(duration * opts.fps);
    const workers = Math.min(opts.workers, totalFrames);
    const per = Math.ceil(totalFrames / workers);

    console.log(
      `Rendering ${totalFrames} frames (${opts.from}s → ${opts.to}s @ ${opts.fps}fps) with ${workers} worker(s)…`,
    );

    let rendered = 0;
    const t0 = Date.now();
    const tick = () => {
      rendered++;
      if (rendered % opts.fps === 0 || rendered === totalFrames) {
        const elapsed = (Date.now() - t0) / 1000;
        const eta = (elapsed / rendered) * (totalFrames - rendered);
        process.stdout.write(
          `\r  ${rendered}/${totalFrames} frames  ${((rendered / totalFrames) * 100).toFixed(1)}%  ` +
            `elapsed ${elapsed.toFixed(0)}s  eta ${eta.toFixed(0)}s   `,
        );
      }
    };

    const segments = [];
    const jobs = [];
    for (let w = 0; w < workers; w++) {
      const startFrame = w * per;
      const endFrame = Math.min(totalFrames, startFrame + per);
      if (startFrame >= endFrame) break;
      const segFile = path.join(tmpDir, `seg-${String(w).padStart(2, "0")}.mp4`);
      segments.push(segFile);
      jobs.push(renderSegment({ browser, url, opts, startFrame, endFrame, segFile, onFrame: tick }));
    }
    await Promise.all(jobs);
    process.stdout.write("\n");

    const listFile = path.join(tmpDir, "segments.txt");
    await fsp.writeFile(listFile, segments.map((s) => `file '${s.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));

    await fsp.mkdir(path.dirname(opts.out), { recursive: true });
    const audioFile = path.join(HERE, "audio.wav");
    const muxArgs = ["-f", "concat", "-safe", "0", "-i", listFile];
    if (opts.audio && fs.existsSync(audioFile)) {
      muxArgs.push("-ss", String(opts.from), "-t", String(duration), "-i", audioFile);
      muxArgs.push("-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest");
    } else {
      muxArgs.push("-c:v", "copy");
    }
    muxArgs.push("-movflags", "+faststart", opts.out);

    console.log("Muxing segments + audio…");
    await runFfmpeg(muxArgs).done;
    console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${opts.out}`);
  } finally {
    await browser.close();
    server.close();
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("\n" + (err.stack || err));
  process.exit(1);
});
