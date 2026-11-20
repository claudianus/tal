// 장 하나를 처음부터 끝까지 키보드로 한 판 한다 (헤드리스 Chrome, 미리보기 :4173).
// 다음 장 제목이나 엔딩 크레딧이 나오면 끝. 고른 메뉴(M:)·몸짓·걷기(W:)·게임(G:)을 순서대로 적는다.
// 쓰는 법: PORT=9341 node tools/play.mjs 2   (CHAPTERS 의 번호)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:4173/?test';
const PORT = Number(process.env.PORT || 9340);

// [이름, 시작 대사, 게임 뒤에 나와야 하는 대사 (정규식), 제한 초, 꼭 있어야 하는 행동 (정규식, 생략 가능), 메뉴·몸짓에서 고를 글 (정규식, 생략 가능)]
const CHAPTERS = [
  ['프롤로그 — 방', /1장\s+·\s+탈/],
  ['1장 — 탈', /2장\s+·\s+무리/],
  ['2장 — 무리', /3장\s+·\s+들킴/],
  ['3장 — 들킴', /막간\s+·\s+윤서/],
  ['막간 — 윤서', /4장\s+·\s+바닥/],
  ['4장 — 바닥', /기획 · 방향|만든 사람/],
];
const idx = Number(process.argv[2] || 0);
const [title, next] = CHAPTERS[idx];
const MIN = Number(process.env.MIN || 25);
const dir = mkdtempSync(join(tmpdir(), 'tal-play-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--mute-audio', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr, timeout = 60000) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch { await sleep(200); } }
  if (!target) throw new Error('Chrome 이 뜨지 않았다');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(1500);
  const t0 = Date.now();
  await evalJs(`(async () => { for (let i = 0; i < 50 && !window.talBegin; i++) await new Promise(r => setTimeout(r, 100)); window.talBegin({ mode: 'chapter', title: ${JSON.stringify(title)} }); await new Promise(r => setTimeout(r, 2500)); window.__play_ = window.__kb({ ms: ${MIN * 60000}, gap: 110, stop: ${next} }); return 1; })()`, 30000);
  const r = await evalJs(`(async () => { const r = await window.__play_; return { stop: r.stop, hint: r.hint, log: r.log, tail: document.body.innerText.slice(-160).replace(/\\s+/g, ' ') }; })()`, (MIN * 60 + 60) * 1000);
  const n = (p) => r.log.filter((x) => x.startsWith(p)).length;
  const ok = r.stop === 'text' && n('M:') === 0; // 메뉴가 한 번이라도 뜨면 실패
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${title}  ${((Date.now() - t0) / 1000).toFixed(0)}s  게임 ${n('G:')} · 걷기·몸짓 ${n('W:')} · 메뉴 ${n('M:')}  끝 ${r.stop}${r.stop === 'text' ? '' : '  화면 «' + r.tail + '»' + (r.hint ? '  힌트 ' + r.hint : '')}`);
  console.log('  ' + r.log.join(' '));
  process.exitCode = ok ? 0 : 1;
} finally {
  try { ws?.close(); } catch { /* */ }
  chrome.kill();
}
