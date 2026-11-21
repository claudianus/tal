// 미니게임이 지는 수가 있는지 본다: 가만히 / 아무렇게나 / Z 연타 세 가지 손으로 각 판을 여러 번 돌려 결과를 센다.
// node tools/stakes.mjs
import { build } from 'esbuild';
const ctx = new Proxy({}, { get: (_, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 6 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => {}), set: () => true });
const fakeEl = () => new Proxy({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, dataset: {} }, { get: (o, k) => (k in o ? o[k] : k === 'getContext' ? () => ctx : () => fakeEl()), set: () => true });
globalThis.document = { getElementById: () => fakeEl(), createElement: () => fakeEl(), querySelector: () => fakeEl(), body: fakeEl() };
globalThis.window = globalThis; globalThis.ImageData = class { constructor(a, w, h) { this.data = a; this.width = w; this.height = h ?? a.length / 4 / w; } };
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /\.\/(audio|ui)\.ts$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: a.path.includes('audio') ? 'export const sfx = () => {}; export const setTension = () => {}; export const step = () => {}; export const body = () => {}; export const tone = () => {};' : 'export const hint = () => {}; export const ghost = () => {}; export const isFast = () => false; export const setGameKeys = () => {}; export const el = {}; export const DIR_KEY = "방향키";', loader: 'js' }));
} };
const r = await build({ entryPoints: ['src/games.ts'], bundle: true, write: false, format: 'esm', plugins: [stub], platform: 'node', logLevel: 'silent' });
const mod = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
const G = mod._GAMES;

let seed = 1; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const KS = ['up', 'down', 'left', 'right', 'z'];
function run(id, hand, limit = 90) {
  let g; try { g = G[id]({ ghosts: ['x', 'y'], text: '가나다라마', n: 3, ...JSON.parse(process.env.OPT || '{}') }); } catch (e) { return ['ERR:' + e.message, 0]; }
  const keys = { up: false, down: false, left: false, right: false, z: false, any: false }, dt = 1 / 60;
  for (let t = 0; t < limit; t += dt) {
    const hit = new Set();
    if (hand === 'rand' && rnd() < 0.12) { const k = KS[Math.floor(rnd() * 5)]; if (!keys[k]) hit.add(k); keys[k] = !keys[k]; }
    if (hand === 'smart' && g.peek) { const pk = g.peek(); const want = id === 'hush' ? Math.abs(pk.x) < 1.0 : id === 'curtain' ? !(pk.warn || pk.up) : false; if (want && !keys.z) hit.add('z'); keys.z = want; }
    if (hand === 'mash') { const on = Math.floor(t * 8) % 2 === 0; if (on && !keys.z) hit.add('z'); keys.z = on; }
    let out; try { out = g.step(dt, t, keys, hit); g.draw(ctx, t); } catch (e) { return ['ERR:' + e.message, +t.toFixed(1)]; }
    if (out) return [out, +t.toFixed(1)];
  }
  return ['(안 끝남)', limit];
}
const ids = process.argv[2] ? process.argv[2].split(',') : Object.keys(G);
const rows = [];
for (const id of ids) {
  const row = { id };
  for (const hand of (process.env.HANDS || 'idle,rand,mash').split(',')) {
    const cnt = {}; let ts = 0; const N = hand === 'idle' ? 1 : Number(process.env.N || 8);
    for (let i = 0; i < N; i++) { seed = 7 + i * 31; const [o, t] = run(id, hand); cnt[o] = (cnt[o] || 0) + 1; ts += t; }
    row[hand] = Object.entries(cnt).map(([k, v]) => (N > 1 ? `${k}×${v}` : k)).join(' ') + ` (${(ts / N).toFixed(0)}s)`;
  }
  const outs = new Set(Object.entries(row).filter(([k]) => k !== 'id').map(([, v]) => v).flatMap((s) => s.replace(/ \(\d+s\)$/, '').split(' ').map((x) => x.replace(/×\d+$/, ''))));
  row.갈림 = outs.size > 1 ? '있음' : '없음';
  rows.push(row);
}
for (const r of rows) console.log(r.id.padEnd(9), r.갈림, Object.entries(r).filter(([k]) => !['id', '갈림'].includes(k)).map(([k, v]) => `${k}:${v}`).join('  '));
