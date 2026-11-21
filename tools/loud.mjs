// 소리 크기 재기: 헤드리스 Chrome 에서 배경음마다 몇 초씩 틀고 마지막 출력의 크기를 잰다.
// 노트북 스피커는 200Hz 아래를 거의 못 내니, 200Hz 위만 따로 잰다 (spk).
// 쓰는 법: node tools/loud.mjs [amb|sfx] [모듈 경로, 기본 /src/audio.ts]   (재는 동안 :5199 에 vite 를 따로 띄운다)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9341, what = process.argv[2] || 'amb', mod = process.argv[3] || '/src/audio.ts';
const dir = mkdtempSync(join(tmpdir(), 'tal-loud-'));
const vite = spawn('npx', ['vite', '--config', 'tools/vite.loud.config.mjs'], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch { await sleep(200); } }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  await send('Runtime.enable');
  for (let i = 0; i < 60; i++) { try { await fetch('http://localhost:5199/tools/blank.html'); break; } catch { await sleep(250); } }
  await send('Page.navigate', { url: 'http://localhost:5199/tools/blank.html' });
  await sleep(1200);
  const out = await ev(`(async () => {
    const a = await import(${JSON.stringify(mod)});
    const T = await import('/src/tables.ts');
    a.audioInit();
    const an = a.audioProbe(); await an.context.resume();
    const sr = an.context.sampleRate, N = an.fftSize, buf = new Float32Array(N), fq = new Float32Array(N / 2);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const meas = async (ms) => { // 평균 크기(rms), 200Hz 위 크기(spk), 가장 큰 순간(peak)
      let s = 0, sp = 0, n = 0, peak = 0;
      const end = performance.now() + ms;
      while (performance.now() < end) {
        an.getFloatTimeDomainData(buf); an.getFloatFrequencyData(fq);
        let e = 0; for (const v of buf) { e += v * v; peak = Math.max(peak, Math.abs(v)); }
        let tot = 0, hi = 0; for (let i = 1; i < fq.length; i++) { const p = Math.pow(10, fq[i] / 10); tot += p; if (i * sr / N > 200) hi += p; }
        s += e / N; sp += (e / N) * (tot ? hi / tot : 0); n++;
        await sleep(40);
      }
      const db = (x) => (x > 0 ? 10 * Math.log10(x) : -120).toFixed(1);
      return { rms: db(s / n), spk: db(sp / n), peak: (20 * Math.log10(peak || 1e-6)).toFixed(1) };
    };
    const res = {};
    if (${JSON.stringify(what)} === 'amb') {
      for (const nm of ['room', 'still', 'night', 'day', 'rain_in', 'rain_out', 'subway', 'station', 'crowd', 'store', 'party', 'grandma', 'funeral', 'er']) {
        a.ambient(nm); await sleep(3500); res[nm] = await meas(6000);
      }
      a.ambient('none'); await sleep(2500);
      for (const v of [0.3, 0.6, 1]) { a.setTension(v); await sleep(1500); res['tension ' + v] = await meas(2500); }
      a.setTension(0);
    } else {
      a.ambient('none'); await sleep(2500);
      const only = ${JSON.stringify(process.env.ONLY || '')};
      const quiet = async () => { // 앞 소리의 꼬리(울림 포함)가 다 사라질 때까지 기다린다
        for (let i = 0, calm = 0; i < 200 && calm < 6; i++) { an.getFloatTimeDomainData(buf); let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v)); calm = pk < 0.001 ? calm + 1 : 0; await sleep(50); }
      };
      for (const muf of [false, true]) {
        a.setMuffle(muf); await sleep(1500);
        for (const nm of Object.keys(T.SFX)) {
          if (only && !new RegExp(only).test(nm)) continue;
          await quiet();
          try { a.sfx(nm); } catch (e) { res[nm] = { rms: 'ERR ' + e.message, spk: '', peak: '' }; continue; }
          const m = await meas(1400);
          if (!muf) res[nm] = m; else res[nm].muf = m.peak;
        }
      }
    }
    res._ctx = { rms: an.context.state, spk: an.context.currentTime.toFixed(1), peak: '' };
    return res;
  })()`);
  for (const [k, v] of Object.entries(out)) console.log(k.padEnd(22), 'rms', String(v.rms).padStart(6), ' spk', String(v.spk).padStart(6), ' peak', String(v.peak).padStart(6), v.muf !== undefined ? ' 탈 ' + String(v.muf).padStart(6) : '');
} finally { try { ws?.close(); } catch { /* */ } chrome.kill(); vite.kill(); }
