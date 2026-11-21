// 손가락으로만 해 본다: 터치 기기로 흉내 낸 헤드리스 Chrome 에 CDP 터치 이벤트를 보낸다 (키보드 없이).
// 화면 누르기로 넘기기 · 패드를 누르고 있어 걷기 · Z 로 조사 · 선택창 누르기 · 휴대폰 선택지 누르기 · 휴대폰 화면 눌러 내리기 ·
// 미니게임에서 Z 를 누르고 있다가 떼기(손가락이 미끄러져 나간 경우까지)를 하나씩 확인한다.
// 쓰는 법: DEV=portrait PORT=9381 node tools/touch.mjs "2장 — 무리"
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:4173/?test';
const PORT = Number(process.env.PORT || 9380);
const DEVS = { portrait: [390, 844], landscape: [844, 390], small: [360, 640], land_small: [640, 360] };
const [VW, VH] = DEVS[process.env.DEV || 'portrait'];
const TITLE = process.argv[2] || '프롤로그 — 방';
const SECS = Number(process.env.SECS || 240);
const dir = mkdtempSync(join(tmpdir(), 'tal-touch-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--window-size=${VW},${VH}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const touch = async (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await sleep(60); await touch('touchEnd', x, y); };
const hold = async (x, y, ms) => { await touch('touchStart', x, y); await sleep(ms); await touch('touchEnd', x, y); };
const center = (q) => ev(`(() => { const e = document.querySelector(${JSON.stringify(q)}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : null; })()`);

const got = { 넘기기: 0, 패드걷기: 0, Z조사: 0, 선택창: 0, 휴대폰선택지: 0, 휴대폰내리기: 0, Z누르고떼기: 0, Z미끄러짐: 0 };
const bad = [];
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch { await sleep(200); } }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  const errs = [];
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: URL });
  await sleep(1800);
  await ev(`(async () => { for (let i = 0; i < 200 && !(window.talBegin && window.__kb); i++) await new Promise(r => setTimeout(r, 100)); return 1; })()`);
  if (TITLE === '프롤로그 — 방') { // 시작 화면의 '처음부터' 를 손가락으로 누른다
    const b = await ev(`(() => { const b = [...document.querySelectorAll('#menu-btns button')].find(b => b.textContent === '처음부터'); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    await tap(b[0], b[1]);
  } else await ev(`window.talBegin({ mode: 'chapter', title: ${JSON.stringify(TITLE)} })`);
  await sleep(3500);
  const t0 = Date.now();
  let walks = 0, kbUntil = 0;
  const NEED = ['넘기기', '패드걷기', 'Z조사', '휴대폰내리기', 'Z누르고떼기', 'Z미끄러짐', '선택창', '휴대폰선택지']; // 선택창·휴대폰 선택지는 본편에서 뜨지 않는다 (play.mjs 가 메뉴 0 을 요구한다). 뜨면 눌러 본다.
  while (Date.now() - t0 < SECS * 1000 && NEED.some((k) => !got[k])) {
    const s = await ev(`(() => { const st = document.getElementById('stage'), w = window.tal.world;
      return { cl: st.className, game: !!document.querySelector('#game.on'), hint: document.getElementById('hint').textContent,
        wch: document.querySelectorAll('#winchoices.on .ch:not(.locked)').length, pch: document.querySelectorAll('#choices .ch:not(.locked)').length,
        binds: w.binds ? [...new Set(w.binds.map(b => b.at))] : null, more: st.classList.contains('more'), body: document.getElementById('win-body').textContent + '|' + document.getElementById('flow').children.length }; })()`);
    if (Date.now() < kbUntil) { await sleep(300); continue; }
    if (s.game) {
      if (!got.Z누르고떼기) { // 누르고 있는 동안 z, 떼면 풀린다
        const z = await center('#pad-z'); if (!z) { bad.push('미니게임에 Z 단추가 없다'); break; }
        await touch('touchStart', z[0], z[1]); await sleep(500);
        const on = await ev(`!!(window.__keys && window.__keys.z)`);
        await touch('touchEnd', z[0], z[1]); await sleep(150);
        const off = await ev(`!(window.__keys && window.__keys.z)`);
        if (on && off) got.Z누르고떼기++; else bad.push(`Z 누르기 ${on} 떼기 ${off}`);
        await touch('touchStart', z[0], z[1]); await sleep(300); await touch('touchCancel'); await sleep(150); // 손가락이 미끄러져 나갔다 (전화가 왔다 등)
        if (await ev(`!(window.__keys && window.__keys.z)`)) got.Z미끄러짐++; else bad.push('Z 가 눌린 채로 남았다 (touchcancel)');
      }
      await ev(`window.__kb({ ms: 1500, noMenu: true })`); kbUntil = Date.now() + 1600; continue; // 판은 시험용 손이 마저 한다
    }
    if (s.wch) {
      const c = await center('#winchoices.on .ch:not(.locked)'); await tap(c[0], c[1]); await sleep(500);
      if (!(await ev(`document.querySelectorAll('#winchoices.on .ch').length`))) got.선택창++; else bad.push('선택창을 눌러도 안 골라진다');
      continue;
    }
    if (s.pch) {
      const c = await center('#choices .ch:not(.locked)'); await tap(c[0], c[1]); await sleep(500);
      if (!(await ev(`document.querySelectorAll('#choices .ch').length`))) got.휴대폰선택지++; else bad.push('휴대폰 선택지를 눌러도 안 골라진다');
      continue;
    }
    if (s.binds && s.binds.some((a) => !['move', 'wait', 'timeout', 'up', 'down', 'left', 'right'].includes(a)) && walks < 3) {
      walks++;
      const at = s.binds.find((a) => !['move', 'wait', 'timeout', 'up', 'down', 'left', 'right'].includes(a));
      const rt = await ev(`(() => { const r = window.tal.world.routeFor(${JSON.stringify(at)}); return r ? { path: r.path, face: r.face } : null; })()`);
      if (!rt) { await ev(`window.__kb({ ms: 1200, noMenu: true })`); kbUntil = Date.now() + 1300; continue; }
      const btn = async (d) => center(`#pad [data-dir="${d}"]`);
      const x0 = await ev(`[window.tal.world.player.x, window.tal.world.player.y]`);
      for (const [x, y] of rt.path.slice(1)) {
        const p = await ev(`[window.tal.world.player.x, window.tal.world.player.y]`);
        const d = x > p[0] ? 'right' : x < p[0] ? 'left' : y > p[1] ? 'down' : 'up';
        const b = await btn(d); if (!b) { bad.push('걷는데 패드가 없다'); break; }
        await touch('touchStart', b[0], b[1]);
        for (let i = 0; i < 40; i++) { const q = await ev(`[window.tal.world.player.x, window.tal.world.player.y]`); if (q[0] === x && q[1] === y) break; await sleep(15); }
        await touch('touchEnd', b[0], b[1]); await sleep(120);
      }
      const x1 = await ev(`[window.tal.world.player.x, window.tal.world.player.y]`);
      if (rt.path.length > 1) { if (x1[0] !== x0[0] || x1[1] !== x0[1]) got.패드걷기++; else bad.push('패드를 눌러도 안 걷는다'); }
      const fb = await btn(rt.face); if (fb) await hold(fb[0], fb[1], 60); await sleep(200);
      const z = await center('#pad-z'); await tap(z[0], z[1]); await sleep(700);
      const after = await ev(`(() => { const w = window.tal.world; return w.binds ? w.binds.map(b => b.at).join() : '' })()`);
      if (after !== s.binds.join()) got.Z조사++;
      continue;
    }
    if (s.binds) { await ev(`window.__kb({ ms: 1200, noMenu: true })`); kbUntil = Date.now() + 1300; continue; }
    if (s.more) {
      const scroll = s.cl.includes('scroll');
      await tap(VW / 2, VH * 0.32); await sleep(scroll ? 250 : 120);
      // 글자가 찍히는 중이면 한 번 더 누른다
      for (let i = 0; i < 25; i++) { const b = await ev(`document.getElementById('win-body').textContent + '|' + document.getElementById('flow').children.length + '|' + document.getElementById('stage').classList.contains('more')`); if (b.split('|').slice(0, 2).join('|') !== s.body) { got[scroll ? '휴대폰내리기' : '넘기기']++; break; } await sleep(80); }
      continue;
    }
    await sleep(150);
  }
  // 선택창·휴대폰 선택지는 본편에서 뜨지 않으니, 같은 함수를 직접 띄워 손가락으로 눌러 본다
  for (const [skin, box, name] of [['none', '#winchoices.on .ch', '선택창'], ['kakao', '#choices .ch', '휴대폰선택지']]) {
    if (got[name]) continue;
    await ev(`(async () => { window.talSkin(${JSON.stringify(skin)}); await window.talLine('narr', '시험 줄', { instant: true }); window.__pick = window.talChoose(['첫째', '둘째', '셋째']); window.__pick.then(i => window.__picked = i); return 1; })()`);
    await sleep(400);
    const c = await ev(`(() => { const b = document.querySelectorAll(${JSON.stringify(box)})[1]; if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.height]; })()`);
    if (!c) { bad.push(name + '가 뜨지 않았다'); continue; }
    await tap(c[0], c[1]); await sleep(400);
    const picked = await ev(`window.__picked`);
    if (picked === 1) got[name]++; else bad.push(`${name} 둘째를 눌렀는데 ${picked}`);
    if (c[2] < 40) bad.push(`${name} 줄 높이 ${Math.round(c[2])}px`);
    await ev(`window.__picked = undefined; window.talSkin('none'); 1`);
  }
  const miss = NEED.filter((k) => !got[k]);
  console.log(`${!bad.length && !errs.length && !miss.length ? 'OK  ' : 'FAIL'} ${process.env.DEV || 'portrait'} ${TITLE}  ${Object.entries(got).map(([k, v]) => k + ' ' + v).join(' · ')}`);
  if (miss.length) console.log('  못 해 본 것: ' + miss.join(', '));
  if (bad.length) console.log('  문제: ' + [...new Set(bad)].join(' | '));
  if (errs.length) console.log('  오류: ' + [...new Set(errs)].slice(0, 3).join(' | '));
  process.exitCode = bad.length || errs.length || miss.length ? 1 : 0;
} finally {
  try { ws?.close(); } catch { /* */ }
  chrome.kill();
}
