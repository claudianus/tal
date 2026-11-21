// 스마트폰 화면 검사: 터치 기기로 흉내 낸 헤드리스 Chrome 에서 장 하나를 끝까지 하면서,
// 패드·Z·대화창·선택창·휴대폰 화면·미니게임판·안내·사진이 서로 겹치거나 화면 밖으로 나가는 순간을 잡는다.
// 처음 보는 문제마다 화면을 찍어 둔다 (OUT 폴더).
// 쓰는 법: DEV=portrait PORT=9351 node tools/mobile.mjs 2      (DEV: portrait | landscape | small)
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:4173/?test';
const PORT = Number(process.env.PORT || 9350);
const DEVS = { portrait: [390, 844], landscape: [844, 390], small: [360, 640], tall: [412, 915], land_small: [640, 360] };
const DEV = process.env.DEV || 'portrait';
const [VW, VH] = DEVS[DEV];
const OUT = process.env.OUT || join(tmpdir(), 'tal-mobile');
const CHAPTERS = [
  ['프롤로그 — 방', /1장\s+·\s+탈/],
  ['1장 — 탈', /2장\s+·\s+무리/],
  ['2장 — 무리', /3장\s+·\s+들킴/],
  ['3장 — 들킴', /막간\s+·\s+윤서/],
  ['막간 — 윤서', /4장\s+·\s+바닥/],
  ['4장 — 바닥', /기획 · 방향|만든 사람/],
  ['에필로그 — 탈', /기획 · 방향|만든 사람/],
  ['에필로그 — 남겨진 방', /기획 · 방향|만든 사람/],
  ['에필로그 — 전화', /기획 · 방향|만든 사람/],
];
const idx = Number(process.argv[2] || 0);
const [title, next] = CHAPTERS[idx];
const MIN = Number(process.env.MIN || 25);
mkdirSync(OUT, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), 'tal-mob-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--window-size=${VW},${VH}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr, timeout = 60000) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

// 페이지 안에서 400ms 마다 도는 검사. 문제 이름 → 처음 본 때의 설명
const PROBE = `(() => {
  const VW = innerWidth, VH = innerHeight;
  const vis = (e) => { if (!e) return null; const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return null;
    let p = e.parentElement; while (p && p.id !== 'stage') { const ps = getComputedStyle(p); if (ps.display === 'none' || Number(ps.opacity) < 0.05) return null; p = p.parentElement; }
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 ? r : null; };
  const cut = (a, b, m = 0) => a && b && a.left < b.right - m && b.left < a.right - m && a.top < b.bottom - m && b.top < a.bottom - m;
  const $ = (q) => document.querySelector(q);
  const st = $('#stage'), cl = st.className;
  const seen = window.__mob || (window.__mob = { probs: {}, fresh: [] });
  seen.now = seen.now || {}; const prev = seen.now; seen.now = {};
  const add = (k, d) => { seen.now[k] = 1; if (!prev[k]) return; /* 두 번 잇달아 보여야 문제로 친다 (장면이 바뀌는 한순간은 거른다) */ if (!seen.probs[k]) { seen.probs[k] = { n: 0, d, cl }; seen.fresh.push(k); } seen.probs[k].n++; };
  // 메뉴·카드: 보이는 단추가 화면 밖에 있으면, 스크롤로 닿을 수 있어야 한다
  for (const box of ['#menu', '#pausemenu', '#card.on']) { const b = $(box); if (!b || b.hidden || !vis(b)) continue;
    const sc = b.scrollHeight > b.clientHeight + 2 ? getComputedStyle(b).overflowY : 'none';
    for (const btn of b.querySelectorAll('button')) { const r = vis(btn); if (!r) continue;
      if (r.top < -1 || r.bottom > VH + 1 || r.left < -1 || r.right > VW + 1) { if (!/auto|scroll/.test(sc) || r.top + b.scrollTop < 0) add('닿지 않는 단추×' + box, btn.textContent.trim().slice(0, 12)); } }
    if (b.scrollHeight > b.clientHeight + 2 && b.scrollTop === 0) { const first = b.querySelector('h1, h2, h3, p, button'); const r = first && first.getBoundingClientRect(); if (r && r.top < -1) add('위가 잘린다×' + box, Math.round(r.top) + 'px'); } }
  if (!$('#menu').hidden || !$('#pausemenu').hidden) return;
  // 손으로 할 일이 있는데 패드가 없다 (터치 기기)
  if (matchMedia('(pointer: coarse)').matches && !vis($('#pad'))) { const w0 = window.tal?.world; if ((w0 && w0.binds && !$('#winchoices.on') && !document.querySelector('#choices .ch')) || $('#game.on') || cl.includes(' roam') || cl.includes('peer')) add('패드 없음', cl.includes('peer') ? 'peer' : $('#game.on') ? 'game' : 'walk'); }
  const pad = vis($('#pad')), z = vis($('#pad-z')), mb = vis($('#menu-btn'));
  const ctl = [['패드', pad], ['Z', z]];
  const win = $('#win.on') && vis($('#win'));
  const wch = $('#winchoices.on') && vis($('#winchoices'));
  const phone = $('#col').dataset.skin !== 'none' && vis($('#col'));
  const flow = phone && vis($('#flow'));
  const chs = [...document.querySelectorAll('#choices .ch')].map(vis).filter(Boolean);
  const game = $('#game.on') && vis($('#game'));
  const hint = $('#hint.on') && vis($('#hint'));
  const pic = vis($('#pics .frame'));
  const tr = vis($('#clock')), views = $('#views.on') && vis($('#views'));
  const gauges = [...document.querySelectorAll('.gauge.on')].map(vis).filter(Boolean);
  const timer = $('#timer.on') && vis($('#timer'));
  const who = vis($('#who'));
  const items = [['대화창', win], ['선택창', wch], ['휴대폰 글', flow], ['미니게임', game], ['안내', hint], ['사진', pic], ['계기', gauges[0]], ['계기', gauges[gauges.length - 1]]];
  for (const [cn, c] of ctl) for (const [n, r] of items) if (c && cut(c, r, 2)) add(cn + '×' + n, n);
  for (const [cn, c] of ctl) for (const r of chs) if (c && cut(c, r, 2)) { add(cn + '×휴대폰 선택지', ''); break; }
  if (win && wch && cut(win, wch, 2)) add('대화창×선택창', '');
  if (win && pic && cut(win, pic, 2)) add('대화창×사진', '');
  if (win && game && cut(win, game, 8) && !cl.includes('game')) add('대화창×미니게임', '');
  if (hint) for (const [n, r] of [['시계', tr], ['조회수', views], ['메뉴 단추', mb], ['사진', pic], ['계기', gauges[0]], ['누구', who], ['대화창', win]]) if (cut(hint, r, 1)) add('안내×' + n, '');
  if (mb) for (const [n, r] of [['계기', gauges[0]], ['누구', who], ['휴대폰 머리', phone && vis($('#dev-head'))]]) if (cut(mb, r, 1)) add('메뉴 단추×' + n, '');
  if (timer && hint && cut(timer, hint, 0)) add('시간 막대×안내', '');
  for (const [n, r] of [['대화창', win], ['선택창', wch], ['안내', hint], ['사진', pic], ['미니게임', game], ['휴대폰', phone]]) if (r && (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1)) add('화면 밖×' + n, Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom));
  for (const r of chs) if (r.height < 40) { add('작은 선택지', Math.round(r.height) + 'px'); break; }
  if (wch) for (const b of document.querySelectorAll('#winchoices .ch')) { const r = b.getBoundingClientRect(); if (r.height < 40) { add('작은 선택창 줄', Math.round(r.height) + 'px'); break; } }
  // 걷는 맵: 내 캐릭터가 대화창·패드·Z 에 가려지는가
  const w = window.tal?.world;
  if (w?.map && cl.includes('has-map') && !cl.includes(' game')) { // 미니게임 중에는 판이 지도 앞에 있다 const rc = $('#world').getBoundingClientRect(); const [cx, cy] = w.camera();
    const px = rc.left + (w.player.px + 8 - cx) / w.W * rc.width, py = rc.top + (w.player.py + 8 - cy) / w.H * rc.height;
    const me = { left: px - 14, right: px + 14, top: py - 36, bottom: py + 8 };
    for (const [n, r] of [['대화창', win], ['패드', pad], ['Z', z], ['선택창', wch]]) if (cut(me, r, 0)) add('나×' + n, w.mapId);
    if (px < 0 || px > VW || py < 0 || py > VH) add('나×화면 밖', w.mapId);
    if (w.W < 160) add('지도가 좁다', w.mapId + ' ' + w.W + 'px'); }
  // 대화창 글이 넘친다
  if (win) { const b = $('#win-body'); if (b.scrollHeight > b.clientHeight + 4 && win.height > VH * 0.42) add('대화창이 너무 크다', Math.round(win.height) + 'px'); }
})()`;

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch { await sleep(200); } }
  if (!target) throw new Error('Chrome 이 뜨지 않았다');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  const errs = [];
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (process.env.WARN) await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('tal.warn', '1'); } catch {}` });
  await send('Page.navigate', { url: URL });
  await sleep(1500);
  const coarse = await evalJs(`matchMedia('(pointer: coarse)').matches`);
  if (!coarse) console.log('  (pointer: coarse 가 아니다 — 패드가 안 보인다)');
  const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64')); };
  await shot(`${DEV}-menu.png`);
  const t0 = Date.now();
  await evalJs(`(async () => { for (let i = 0; i < 200 && !(window.talBegin && window.__kb); i++) await new Promise(r => setTimeout(r, 100)); window.__roamy = true; window.talBegin({ mode: 'chapter', title: ${JSON.stringify(title)} }); await new Promise(r => setTimeout(r, 2500)); window.__play_ = window.__kb({ ms: ${MIN * 60000}, gap: 160, stop: ${next} }); window.__play_.then(r => window.__done = r); setInterval(() => { try { ${PROBE} } catch (e) { (window.__mobErr = window.__mobErr || []).push(String(e)); } }, 400); return 1; })()`, 30000);
  let shots = 0, lastPeriodic = 0, done = null;
  while (!done && Date.now() - t0 < (MIN * 60 + 60) * 1000) {
    await sleep(700);
    const st = await evalJs(`(() => { const m = window.__mob || { fresh: [] }; const f = m.fresh.splice(0); return { f, done: window.__done ? { stop: window.__done.stop, n: window.__done.log.length } : null }; })()`);
    for (const k of st.f) if (shots < 40) await shot(`${DEV}-${idx}-${String(++shots).padStart(2, '0')}-${k.replace(/[^\p{L}\p{N}]+/gu, '_')}.png`);
    if (Date.now() - lastPeriodic > 45000 && shots < 40) { lastPeriodic = Date.now(); await shot(`${DEV}-${idx}-t${Math.round((Date.now() - t0) / 1000)}.png`); }
    done = st.done;
  }
  const probs = await evalJs(`window.__mob ? window.__mob.probs : {}`);
  console.log(`${done?.stop === 'text' ? 'OK  ' : 'FAIL'} ${DEV} ${title}  ${((Date.now() - t0) / 1000).toFixed(0)}s  끝 ${done?.stop}  오류 ${errs.length}${errs.length ? ' ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''}`);
  for (const [k, v] of Object.entries(probs).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${String(v.n).padStart(5)}  ${k}  ${v.d || ''}  [${v.cl.replace(/pov-yunjae|has-map/g, '').trim()}]`);
  process.exitCode = done?.stop === 'text' && !errs.length ? 0 : 1;
} finally {
  try { ws?.close(); } catch { /* */ }
  chrome.kill();
}
