// One-off: renders the mascot (src/client/ui/Mascot.tsx, mood "happy") to the PWA icon PNGs in
// public/icons/. The PNGs are committed, so this only reruns when the mascot changes.
//
//   PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright-core \
//   CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//   node src/client/pwa/generate-icons.mjs
//
// It needs any Chromium with Playwright; do not add Playwright as a dependency of the app and
// never run `playwright install` in a cloud session.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../../public/icons');

// Colours are the theme tokens in src/client/styles.css (raw hex is fine outside components).
const GROUND = '#f6f8ff';
const MASCOT = `
  <ellipse cx="72" cy="102" rx="58" ry="5" fill="#d6e0ff"/>
  <rect x="14" y="74" width="118" height="24" rx="12" fill="#ffb84d"/>
  <g stroke="#ffb84d" stroke-width="5" stroke-linecap="round">
    <line x1="112" y1="50" x2="104" y2="26"/><line x1="124" y1="50" x2="132" y2="26"/>
  </g>
  <circle cx="118" cy="62" r="18" fill="#ffb84d"/>
  <g fill="#fff" stroke="#1b2140" stroke-width="2">
    <circle cx="104" cy="24" r="7"/><circle cx="132" cy="24" r="7"/>
  </g>
  <circle cx="105" cy="25" r="3.2" fill="#1b2140"/><circle cx="133" cy="25" r="3.2" fill="#1b2140"/>
  <circle cx="110" cy="66" r="3.5" fill="#ff8fa3"/>
  <path d="M114 68 q6 6 12 0" stroke="#1b2140" fill="none" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="62" cy="56" r="34" fill="#2b59f0"/>
  <path d="M62 56 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0 a22 22 0 1 1 -44 0"
    stroke="#fff" fill="none" stroke-width="4.5" stroke-linecap="round"/>`;

// The artwork spans roughly x 4..145, y 13..107; its centre is (74.5, 60).
const CENTRE = [74.5, 60];
const HALF_DIAGONAL = 84; // from the centre to the farthest corner of that box

/** `fill` is the share of the icon width the artwork covers; maskable fits a circle instead. */
function iconSvg(size, { maskable = false, fill = 0.78 } = {}) {
  // Maskable icons keep everything inside the central 80% circle (radius 0.4 * size).
  const scale = maskable ? (0.4 * size) / HALF_DIAGONAL : (fill * size) / 141;
  const tx = size / 2 - CENTRE[0] * scale;
  const ty = size / 2 - CENTRE[1] * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${GROUND}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">${MASCOT}</g>
</svg>`;
}

const ICONS = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 }, // iOS rounds the corners itself
];

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
mkdirSync(outDir, { recursive: true });
for (const { file, size, maskable } of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${iconSvg(size, { maskable })}</body>`);
  writeFileSync(join(outDir, file), await page.screenshot({ type: 'png' }));
  await page.close();
}
await browser.close();
