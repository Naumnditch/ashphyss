/**
 * Renders scene.html to video, frame by frame, in headless Chromium.
 *
 *   npm install && npm run render                       full render → public/video/
 *   node render.mjs --encode-only                       re-encode the web files from the last master
 *   node render.mjs --stills 1,3.5,7.6 --out /tmp/x     a few PNG stills for review
 *
 * The scene is a pure function of time (window.renderAt(t)), so every run
 * produces the same video. Needs a Playwright Chromium: `npx playwright install chromium`.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), [])
);
const FPS = Number(args.fps ?? 30);
const WIDTH = Number(args.width ?? 1920);
const HEIGHT = Number(args.height ?? 1080);
const OUT = path.resolve(args.out ?? path.join(REPO, 'public/video'));
const WORK = path.resolve(args.work ?? path.join(HERE, '.render'));
// The film is rendered at 1080p but shipped at 720p: the homepage shows it at
// most ~1000 px wide, and 720p roughly quarters the file size.
const WEB_SCALE = `scale=${args['web-width'] ?? 1280}:-2:flags=lanczos`;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited ${code}\n${err.slice(-2000)}`))));
  });
}

const master = path.join(WORK, 'master.mp4');

async function encodeWebFiles() {
  fs.mkdirSync(OUT, { recursive: true });
  const mp4 = path.join(OUT, 'ashphys-hero.mp4');
  const webm = path.join(OUT, 'ashphys-hero.webm');
  const poster = path.join(OUT, 'ashphys-hero-poster.jpg');
  await run(ffmpegPath, ['-y', '-i', master, '-vf', WEB_SCALE, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high',
    '-level', '4.0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  await run(ffmpegPath, ['-y', '-i', master, '-vf', WEB_SCALE, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1',
    '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an', webm]);
  await run(ffmpegPath, ['-y', '-ss', String(args.poster ?? 8.6), '-i', master, '-frames:v', '1', '-vf', WEB_SCALE, '-q:v', '3', poster]);
  for (const f of [mp4, webm, poster]) console.log(path.relative(REPO, f), `${(fs.statSync(f).size / 1024).toFixed(0)} KB`);
}

if (args['encode-only']) {
  await encodeWebFiles();
  process.exit(0);
}

const server = await serve();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/video/hero/scene.html`);
await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 60000 }).catch(() => {
  throw new Error(`scene did not load:\n${errors.join('\n')}`);
});
const duration = await page.evaluate(() => window.DURATION);

const frame = async (t) => {
  await page.evaluate((time) => window.renderAt(time), t);
  return page.screenshot({ type: 'png' });
};

if (args.stills) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const t of args.stills.split(',').map(Number)) {
    fs.writeFileSync(path.join(OUT, `still-${t.toFixed(2)}.png`), await frame(t));
    console.log('still', t);
  }
} else {
  fs.mkdirSync(WORK, { recursive: true });
  // A near-lossless 1080p master first; the web files are encoded from it.
  const enc = spawn(ffmpegPath, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv444p', master], { stdio: ['pipe', 'ignore', 'pipe'] });
  let encErr = '';
  enc.stderr.on('data', (d) => (encErr += d));
  const total = Math.round(duration * FPS);
  const started = Date.now();
  for (let i = 0; i < total; i++) {
    const png = await frame(i / FPS);
    if (!enc.stdin.write(png)) await new Promise((r) => enc.stdin.once('drain', r));
    if (i % 30 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  enc.stdin.end();
  await new Promise((resolve, reject) => enc.on('close', (c) => (c === 0 ? resolve() : reject(new Error(encErr.slice(-2000))))));
  await encodeWebFiles();
}

if (errors.length) console.log('page errors:', errors);
await browser.close();
server.close();
