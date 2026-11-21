// 미니게임 로직 시험: 브라우저 없이 step 을 돌려서 정해진 입력으로 결과가 나오는지 본다.
// node tools/games-sim.mjs
import { build } from 'esbuild';
const stub = {
  name: 'stub',
  setup(b) {
    b.onResolve({ filter: /\.\/(audio|ui)\.ts$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({
      contents: a.path.includes('audio') ? 'export const sfx = () => {}; export const setTension = () => {}; export const step = () => {};' : 'export const hint = () => {}; export const ghost = () => {}; export const isFast = () => false; export const setGameKeys = () => {}; export const el = {};',
      loader: 'js',
    }));
  },
};
const r = await build({ entryPoints: ['src/games.ts'], bundle: true, write: false, format: 'esm', plugins: [stub], platform: 'node' });
const mod = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
const G = mod._GAMES;
const ctx = new Proxy({}, { get: (_, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: () => true });

// script: [[시각(초), 키, 누름(true)/뗌(false)]]. 키를 누르면 그 프레임에 hit 가 생긴다.
function run(id, script, limit = 60, opt = { ghosts: ['x'] }) {
  const g = G[id](opt), dt = 1 / 60;
  const keys = { up: false, down: false, left: false, right: false, z: false };
  let t = 0, i = 0;
  const ev = [...script].sort((a, b) => a[0] - b[0]);
  for (; t < limit; t += dt) {
    const hit = new Set();
    while (i < ev.length && ev[i][0] <= t) { const [, k, d] = ev[i++]; if (d && !keys[k]) hit.add(k); keys[k] = d; }
    const out = g.step(dt, t, keys, hit);
    g.draw(ctx, t);
    if (out) return [out, +t.toFixed(1)];
  }
  return [null, limit];
}
const tap = (t, k) => [[t, k, true], [t + 0.05, k, false]];
const seq = (t0, ks, gap = 0.2) => ks.flatMap((k, j) => tap(t0 + j * gap, k));
const res = {};
// 다이얼: 위로 끝까지, 왼쪽 끝 → 1, 1, 오른쪽 → 2, 아래로 → 통화. 떨림 때문에 몇 번 반복한다.
{
  const ks = [];
  for (let n = 0; n < 6; n++) ks.push('up', 'up', 'up', 'up', 'left', 'left', 'left', 'z', 'up', 'up', 'up', 'up', 'left', 'left', 'left', 'z', 'up', 'up', 'up', 'up', 'left', 'left', 'left', 'right', 'z', 'down', 'down', 'down', 'down', 'down', 'z');
  res.dial = run('dial', seq(0.5, ks, 0.12), 120);
}
res.type = run('type', [...seq(0.3, Array(30).fill('right'), 0.1), ...tap(4, 'z')]);
res.closet_hold = run('closet', [[0.5, 'z', true], [6, 'z', false], [7, 'z', true], [12, 'z', false], [13, 'z', true]]);
res.closet_idle = run('closet', []);
res.flood = run('flood', [...seq(1, Array(10).fill('left'), 0.3)]);
res.flood_z = run('flood', tap(2, 'z'));
res.still = run('still', []);
res.still_wake = run('still', tap(3, 'z'));
res.stitch = run('stitch', seq(0.5, Array(200).fill('z'), 0.15), 60);
// 숨: 4초 들이쉬고 4초 멈추고(계속 누름) 4초 내쉰다. 따라 하면 진정되고, 아무것도 안 해도 일곱 번이면 끝난다.
res.breath = run('breath', [0, 12, 24, 36, 48].flatMap((s) => [[s, 'z', true], [s + 8, 'z', false]]), 90);
res.breath_idle = run('breath', [], 90);
// 거울: 위로 누르고 버티면 얼굴에 눈길이 붙는다. 가만히 있으면 시간이 지나 끝난다.
{ // 그림에서 눈길 고리의 자리를 읽어, 얼굴(가운데 위) 쪽으로 방향키를 누르는 사람처럼 한다
  const g = G.gaze({ ghosts: ['x'] }); let fs = '', pts = [], t = 0, out = null;
  const c2 = new Proxy({}, { get: (_, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'fillRect' ? (x, y, w, h) => { if (w === 1 && h === 1 && /(236,228,214|200,190,180)/.test(fs)) pts.push([x, y]); } : () => {}, set: (_, k, v) => { if (k === 'fillStyle') fs = String(v); return true; } });
  let gx = 98, gy = 114;
  for (; t < 40 && !out; t += 1 / 60) {
    const keys = { up: gy > 42, down: gy < 36, left: gx > 132, right: gx < 124, z: false };
    out = g.step(1 / 60, t, keys, new Set()); pts = []; g.draw(c2, t);
    if (pts.length) { gx = pts.reduce((a, p) => a + p[0], 0) / pts.length; gy = pts.reduce((a, p) => a + p[1], 0) / pts.length; }
  }
  res.gaze = [out, +t.toFixed(1)];
}
res.gaze_idle = run('gaze', [], 40);
console.log(res);
