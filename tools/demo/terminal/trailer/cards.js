/**
 * Draws the pictures the trailer puts around the terminal with Playwright: the intro card, the closing card, and one caption strip
 * (a transparent 1280x720 PNG) for each scene that has a caption in scenes.json.
 *
 *   NODE_PATH=$(npm root -g) node cards.js --out=out [--bg=#181a21]
 *
 * --bg is the terminal's own background, so the terminal sits on the page without a seam. compose.py reads the same colour.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const out = path.resolve(args.out || 'out');
const bg = args.bg || '#181a21';
const docs = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'assets');
const svg = f => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(docs, f)).toString('base64');
const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'));
fs.mkdirSync(path.join(out, 'cards'), { recursive: true });

const base = `
  html,body{margin:0;width:1280px;height:720px;overflow:hidden}
  body{font-family:Inter,"Helvetica Neue",Arial,sans-serif;color:#e9f1f7}
  .teal{background:linear-gradient(90deg,#00ff75,#00dbff);-webkit-background-clip:text;color:transparent}
`;
const card = (inner) => `<html><style>${base}
  body{background:radial-gradient(ellipse 70% 60% at 50% 40%,#10202b 0%,#070b10 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center}
  img.logo{height:92px}
  h1{font-size:54px;letter-spacing:-.02em;margin:0;font-weight:700}
  .sub{font-size:24px;color:#93a8b8}
  code{font-family:"DejaVu Sans Mono",Menlo,monospace;font-size:30px;background:#0f1822;border:1px solid #1f3a4a;border-radius:12px;padding:12px 24px;color:#19f08a}
  .by{position:absolute;bottom:34px;display:flex;align-items:center;gap:12px;color:#93a8b8;font-size:20px}
  .by img{height:30px}
</style><body>${inner}</body></html>`;
const by = `<div class="by"><span>Powered by</span><img src="${svg('ecosystem/boxlang.svg')}"></div>`;

const pages = {
  intro: card(`<img class="logo" src="${svg('bxagents-logo-full-dark.svg')}"><h1>Your agent, <span class="teal">in your terminal</span></h1><div class="sub">AI agents without the plumbing</div>${by}`),
  outro: card(`<img class="logo" src="${svg('bxagents-logo-full-dark.svg')}"><h1>Build it. <span class="teal">Then talk to it.</span></h1><code>$ bxAgents new</code><div class="sub">bxagents.ai &nbsp;·&nbsp; github.com/ortus-boxlang/bx-agents</div>${by}`)
};
const caption = text => `<html><style>${base}
  body{background:transparent}
  .cap{position:absolute;left:0;right:0;bottom:22px;display:flex;justify-content:center}
  .cap span{font-size:30px;font-weight:600;padding:10px 28px;border-radius:999px;background:rgba(7,11,16,.86);border:1px solid #1f3a4a;color:#e9f1f7}
  .cap b{color:#19f08a;font-weight:700;margin-right:10px}
</style><body><div class="cap"><span><b>›</b>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [id, html] of Object.entries(pages)) {
    await p.setContent(html); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(out, 'cards', id + '.png') });
  }
  for (const s of scenes) {
    if (!s.caption || s.card) continue;
    await p.setContent(caption(s.caption));
    await p.screenshot({ path: path.join(out, 'cards', 'caption-' + s.id + '.png'), omitBackground: true });
  }
  await b.close();
  console.log('cards:', fs.readdirSync(path.join(out, 'cards')).length);
})();
