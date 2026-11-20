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
const PORT = Number(process.env.PORT || 9333);

// [이름, 시작 대사, 게임 뒤에 나와야 하는 대사 (정규식), 제한 초, 꼭 있어야 하는 행동 (정규식, 생략 가능), 메뉴·몸짓에서 고를 글 (정규식, 생략 가능)]
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
  ['고지서', '두 쪽이 따로 논다', /찢어진 자리는 맞춰도 보인다/, 60],
  ['선풍기', '집에서는 안 나는 소리다', /바람이 멎는다/, 60],
  ['비 숨', '탈 안에서는 내 숨이 제일 크게', /잠들었다/, 90],
  ['서랍 담기', '병원 이름이 다르다', /초록 점은 꺼져 있다/, 60],
  ['엔딩 A 그네', '발끝으로 민다. 그네가 조금 간다', /그럼 왜 왔어요/, 90],
  ['옷장 날짜', '옷은 몇 벌 없다', /2012년까지 이어진다/, 90, /G:dates/],
  ['곰표 지우기', '곰표가 입력창을 누른다', /한 글자씩 지운다/, 90, /G:type/],
  ['몸짓 하은 그림', '선생님이 이게 누구냐고 해서', /이건 아저씨 가져요/, 60, /W:(left|right)/],
  ['하트', '완성하면 사진 ㄱㄱ', /토토는 내 얼굴을 모른다/, 60, /G:react/, /하트만/],
  ['안방 앞 지나기', '거실. 열일곱 걸음짜리 거실.', /코 고는 소리 사이사이로 걸었다/, 90, /W:z_entry/],
  ['안방 앞 들킴', '거실. 열일곱 걸음짜리 거실.', /이불이 뒤척인다/, 90, /W:z_entry/, null, 'window.__careless = true'],
  ['순찰 도망', '오늘도 그렇게 생각한다', /유리문이 등 뒤에서 닫힌다/, 150, /W:homedoor/],
  ['지워지는 말풍선', '사 년 동안 전부 읽었다', /삼 초쯤 걸렸다/, 60, /G:erase/],
  ['실명 스크롤', '내 이름이 저기 있다', /중학교 삼 학년의 내가/, 60, /G:leak/],
  ['예약 3장', '이 세 글자를 치는 게', /저장되지 않았을/, 120, /G:book/],
  ['예약 에필로그', '가진 것 중에 제일 큰 걸', /두 번째에 눌렸다/, 90, /G:book/],
  ['3장 밤 문', '엄마도 봤다', /삑\. 삑삑/, 60],
  ['엔딩 B 누운 채 시작', '꿰맨 지 일주일이다.', /등을 따라 주황 실이 지나간다/, 60, /W:head/],
  ['커튼 틈', '캡처를 닫아도 107동은', /끝내 하나도 구별되지 않는다/, 90, /G:curtain/],
  ['커튼 틈 찍힘', '캡처를 닫아도 107동은', /틈을 늦게 놓았다/, 90, /G:curtain/, null, 'window.__careless = true'],
  ['아버지 발소리', '현관이 열린다.', /숨은 한 번도 새지 않았다/, 90, /G:hush/],
  ['아버지 발소리 들킴', '현관이 열린다.', /숨이 샜다/, 90, /G:hush/, null, 'window.__careless = true'],
  ['막간 검색', '이불 속에서 화면 밝기를', /한 줄이다|성도착증|병 이름을/, 90],
  ['휴게실 선풍기 다시', '네. 들어가십시오', /못 들은 척/, 60],
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
  // 페이지가 멈추면 CDP 응답이 오지 않는다: 노드 쪽에서 끊는다
  const r = await Promise.race([send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout }), sleep(timeout + 5000).then(() => { throw new Error('멈춤 ' + timeout + 'ms'); })]);
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
  for (const [name, from, after, secs, expect, pick, pre] of CASES) {
    if (only && !name.includes(only)) continue;
    const tc = Date.now();
    try {
    await send('Page.navigate', { url: URL });
    await sleep(1500);
    const t0 = Date.now();
    await evalJs(`(async () => {
      for (let i = 0; i < 200 && !(window.talBegin && window.__kb); i++) await new Promise(r => setTimeout(r, 100));
      ${pre || ''};
      window.talBegin({ mode: 'chapter', title: ${JSON.stringify('@' + from)} });
      window.__flow = window.__kb({ ms: ${secs * 1000}, gap: 120, stop: ${after}${pick ? `, pick: (ls) => ls.findIndex((l) => ${pick}.test(l)), at: (ats) => { const h = document.querySelector('#hint')?.textContent || ''; const m = h.split('·').map((x) => x.trim()).find((x) => ${pick}.test(x)); const k = m && ({ '↑': 'up', '↓': 'down', '←': 'left', '→': 'right', Z: 'wait' })[m[0]]; return k && ats.includes(k) ? k : ats[0]; }` : ''} });
      return 'started';
    })()`, 20000);
    if (SHOT) {
      for (let i = 0; i < 300; i++) { if (await evalJs(`!!document.querySelector('#game.on') || /손전등|인파|코 고는/.test(document.querySelector('#hint')?.textContent || '')`)) break; await sleep(100); }
      await sleep(Number(process.env.SHOTAT || 2500));
      const img = await send('Page.captureScreenshot', { format: 'png' });
      const { writeFileSync } = await import('node:fs');
      writeFileSync(join(SHOT, name.replace(/\s+/g, '_') + '.png'), Buffer.from(img.data, 'base64'));
    }
    const r2 = await evalJs(`(async () => {
      const r = await window.__flow;
      return { stop: r.stop, hint: r.hint, games: r.log.filter(x => x.startsWith('G:') || x.startsWith('W:')), last: r.log.slice(-4), tail: document.body.innerText.slice(-140).replace(/\\s+/g, ' ') };
    })()`, (secs + 30) * 1000);
    const r = r2;
    const ok = r.stop === 'text' && r.games.length > 0 && (!expect || expect.test(r.games.join(',')));
    if (!ok) fail++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(10)} ${((Date.now() - t0) / 1000).toFixed(0).padStart(3)}s  행동 ${r.games.join(',') || '없음'}  끝 ${r.stop}${ok ? '' : `  마지막 ${JSON.stringify(r.last)}  화면 «${r.tail}»${r.hint ? '  힌트 ' + r.hint : ''}`}`);
      } catch (e) { fail++; console.log(`FAIL ${name.padEnd(10)} ${((Date.now() - tc) / 1000).toFixed(0).padStart(3)}s  ${e.message}`); await send('Page.navigate', { url: 'about:blank' }).catch(() => {}); await sleep(500); }
  }
  console.log(fail ? `실패 ${fail}` : '전부 통과');
  process.exitCode = fail ? 1 : 0;
} finally {
  try { ws?.close(); } catch { /* */ }
  chrome.kill();
}
