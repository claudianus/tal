// 실제 흐름 검사: 헤드리스 Chrome 으로 미리보기(npm run preview, :4173)를 열고,
// '@대사' 자리에서 시작해 키보드 자동 플레이(__kb)로 게임을 하고, 게임 뒤에 나와야 할 대사가 나오는지 본다.
// 쓰는 법: node tools/flow.mjs            (아래 CASES 전부)
//          node tools/flow.mjs 약봉지      (이름에 그 글자가 든 것만)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:4173/?test';
const PORT = 9333;

// [이름, 시작 대사, 게임 뒤에 나와야 하는 대사 (정규식), 제한 초]
const CASES = [
  ['앨범', '찾고 싶었던 적이 없다', /볼펜으로 수염/, 90],
  ['공책', '내가 옆에 써 둔 대사를', /이 년 동안 웃었다/, 90],
  ['가리키기', '내가 그 창문에 서 있었어도', /우리 집 저기예요/, 90],
  ['그네 밀기', '아이 그네 뒤에 선다', /멍이 있다/, 90],
  ['손전등', '꼬리가 그늘 밖으로 밀려 나간다', /고양이 맞다\. 절반은/, 90],
  ['그네 밀기 2장', '어제처럼', /매번 조금만 더/, 90],
  ['가방', '가방 쪽으로 손을 내밀었다', /꼬마전구/, 90],
  ['비', '잠옷 어깨가 벌써 젖었다', /인조 모피가 무거워진다/, 60],
  ['약봉지', '날짜가 하나씩 찍혀 있었다', /정신병자 집안/, 120],
  ['소매', "뭘 숨기냐", /사십 명이 서 있었다/, 90],
  ['헤드 벗기', '헤드가 얼굴에서 안 떨어진다', /쓰레기 냄새가 섞인 공기/, 60],
  ['안감', '그 자리로 간다', /할머니 단추/, 60],
  ['떠는 휴대폰', '떨 때마다 책상 끝으로 간다', /이거 혹시 삼색이님이에요/, 60],
  ['윤서 카톡', '엄지가 거기로 가지 않고 위로 간다', /제발 죽든지/, 60],
  ['토토 긴 메시지', '스크롤바가 아직 남았다', /다 읽었다/, 90],
];
const SHOT = process.env.SHOT; // 폴더를 주면 게임마다 2.5초째 화면을 찍어 둔다

const only = process.argv[2];
const dir = mkdtempSync(join(tmpdir(), 'tal-flow-'));
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
  let fail = 0;
  for (const [name, from, after, secs] of CASES) {
    if (only && !name.includes(only)) continue;
    await send('Page.navigate', { url: URL });
    await sleep(1500);
    const t0 = Date.now();
    await evalJs(`(async () => {
      for (let i = 0; i < 50 && !window.talBegin; i++) await new Promise(r => setTimeout(r, 100));
      window.talBegin({ mode: 'chapter', title: ${JSON.stringify('@' + from)} });
      window.__flow = window.__kb({ ms: ${secs * 1000}, gap: 120, stop: ${after} });
      return 'started';
    })()`, 20000);
    if (SHOT) {
      for (let i = 0; i < 300; i++) { if (await evalJs(`!!document.querySelector('#game.on')`)) break; await sleep(100); }
      await sleep(2500);
      const img = await send('Page.captureScreenshot', { format: 'png' });
      const { writeFileSync } = await import('node:fs');
      writeFileSync(join(SHOT, name.replace(/\s+/g, '_') + '.png'), Buffer.from(img.data, 'base64'));
    }
    const r2 = await evalJs(`(async () => {
      const r = await window.__flow;
      return { stop: r.stop, hint: r.hint, games: r.log.filter(x => x.startsWith('G:') || x.startsWith('W:')), last: r.log.slice(-4), tail: document.body.innerText.slice(-140).replace(/\\s+/g, ' ') };
    })()`, (secs + 30) * 1000);
    const r = r2;
    const ok = r.stop === 'text' && r.games.length > 0;
    if (!ok) fail++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(10)} ${((Date.now() - t0) / 1000).toFixed(0).padStart(3)}s  행동 ${r.games.join(',') || '없음'}  끝 ${r.stop}${ok ? '' : `  마지막 ${JSON.stringify(r.last)}  화면 «${r.tail}»${r.hint ? '  힌트 ' + r.hint : ''}`}`);
  }
  console.log(fail ? `실패 ${fail}` : '전부 통과');
  process.exitCode = fail ? 1 : 0;
} finally {
  try { ws?.close(); } catch { /* */ }
  chrome.kill();
}
