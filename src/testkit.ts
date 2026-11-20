// 검사용 (?test 에서만 불러온다): 키보드 입력만으로 진행하는 손.
// 메뉴는 숫자 키, 걷기는 방향키로 한 칸씩, 미니게임은 각 게임에 맞는 키. 결과는 화면에 보이는 것과 같다.
/* eslint-disable */
// @ts-nocheck
export function installKeyboardKit(): void {
const codes={z:'KeyZ',a:'KeyA',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight'};
const S=(ms)=>new Promise(r=>setTimeout(r,ms));
const down=(k)=>{const o={key:k,code:codes[k]||('Digit'+k),bubbles:true}; window.dispatchEvent(new KeyboardEvent('keydown',o));};
const up=(k)=>{const o={key:k,code:codes[k]||('Digit'+k),bubbles:true}; window.dispatchEvent(new KeyboardEvent('keyup',o));};
const hold=async(k,ms)=>{down(k); await S(ms); up(k);};
window.__hold=hold;
const DIR={'0,-1':'ArrowUp','0,1':'ArrowDown','-1,0':'ArrowLeft','1,0':'ArrowRight'};
const FACE={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
async function walk(at){ const w=window.tal.world; const rt=w.routeFor(at); if(!rt) return false;
  for(const [x,y] of rt.path.slice(1)){ const p=w.player; const k=DIR[(x-p.x)+','+(y-p.y)]; if(!k) break; let t=0; down(k); while((p.x!==x||p.y!==y)&&t<40){await S(15);t++;} up(k); let u=0; while((p.px!==p.x*16||p.py!==p.y*16)&&u<40){await S(15);u++;} }
  await hold(FACE[rt.face],40); { const p=w.player; let u=0; await S(60); while((p.px!==p.x*16||p.py!==p.y*16)&&u<60){await S(15);u++;} } await S(80); await hold('z',50); await S(500); return true; }
async function game(h){
  if(/한 글자씩/.test(h)){ for(let i=0;i<60 && /한 글자씩|글자/.test(document.querySelector('#hint')?.textContent||'');i++){await hold('a',30);await S(40);} await hold('z',50); return 'type'; }
  if(/연타해서|놓지 않는다/.test(h)){ for(let i=0;i<120&&document.querySelector('#game.on');i++){ await hold('z',40); await S(90);} return 'tug'; }
  if(/땀 자리|뒤로 한 땀|앞으로 두 땀|천천히/.test(h)){ // 화면을 보고 바늘이 표시 위에 올 때 누른다 (캔버스 픽셀을 읽는다)
    const cv=document.querySelector('#game'); const cx=cv.getContext('2d');
    const find=(y,r,g,b)=>{ const d=cx.getImageData(0,y,cv.width,1).data; for(let x=0;x<cv.width;x++){ const i=x*4; if(Math.abs(d[i]-r)<6&&Math.abs(d[i+1]-g)<6&&Math.abs(d[i+2]-b)<6) return x; } return -1; };
    for(let i=0;i<4000&&document.querySelector('#game.on');i++){ const n=find(64,216,220,224), m=find(67,255,216,144); if(n>=0&&m>=0&&Math.abs(n-(m+1))<=1){ await hold('z',30); await S(260);} else await S(8); }
    return 'stitch'; }
  if(/보낸다/.test(h)){ await hold('z',50); return 'send'; }
  if(/댓글에 닿으면/.test(h)){ const ks=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']; for(let i=0;i<80 && document.querySelector('#game.on');i++){await hold(ks[(Math.random()*4)|0],150+Math.random()*200);} return 'dodge'; }
  if(/영상을 키운다/.test(h)){ await hold('ArrowLeft',950); await hold('ArrowDown',100); down('z'); for(let i=0;i<80&&document.querySelector('#game.on');i++) await S(100); up('z'); return 'zoom'; }
  if(/들이쉰다|멈춘다 · 그대로|내쉰다 · Z/.test(h)){ // 들이쉬는 차례가 올 때까지 기다렸다가, 8초 누르고 4초 뗀다
    const hint=()=>document.querySelector('#hint')?.textContent||'';
    for(let i=0;i<80&&!/^들이쉰다/.test(hint())&&document.querySelector('#game.on');i++) await S(100);
    for(let i=0;i<8&&document.querySelector('#game.on');i++){ await hold('z',8000); await S(4000);} return 'breath'; }
  if(/가만히 있는다/.test(h)){ while(document.querySelector('#game.on')) await S(200); return 'still'; }
  if(/숨을 참는다/.test(h)){ for(let i=0;i<30&&document.querySelector('#game.on');i++){ await hold('z',1500); await S(700);} return 'closet'; }
  if(/알림을 밀어/.test(h)){ for(let i=0;i<40&&document.querySelector('#game.on');i++){ await hold(i%2?'ArrowLeft':'ArrowRight',80); await S(150);} await hold('z',50); return 'flood'; }
  if(/고개를 기울인다/.test(h)){ await hold('ArrowLeft',900); await S(400); await hold('ArrowRight',900); for(let i=0;i<40&&document.querySelector('#game.on');i++) await S(100); return 'tilt'; }
  if(/눈길을/.test(h)){ for(let i=0;i<120&&document.querySelector('#game.on');i++){ await hold('ArrowUp',120); await S(60);} return 'gaze'; }
  return null; }
window.__kb = async (opt={}) => { const w=window.tal.world; const t0=performance.now(); const log=[];
  while(performance.now()-t0 < (opt.ms||40000) && !window.__abort){
    const txt=document.body.innerText;
    if(opt.stop && opt.stop.test(txt.slice(-600))) return {stop:'text',log};
    if(document.querySelector('#game.on')){ const h=document.querySelector('#hint')?.textContent||''; if(!h.trim()){ await S(300); continue; } const g=await game(h); if(!g) return {stop:'game',hint:h,log}; log.push('G:'+g); await S(600); continue; }
    const ch=[...document.querySelectorAll('button.ch')].filter(b=>b.offsetParent);
    if(ch.length){ const labels=ch.map(b=>b.innerText); let i=opt.pick?opt.pick(labels):-1; if(i<0) i=ch.findIndex(b=>!b.classList.contains('locked')); if(i<0) i=0; log.push('M:'+labels[i]); await hold(String(i+1),40); await S(300); continue; }
    if(w.binds){ const ats=[...new Set(w.binds.map(b=>b.at))].filter(a=>a!=='timeout'); if(!ats.length){ await S(800); continue; } let at=opt.at?opt.at(ats):ats[0]; const same=log.slice(-2).every(x=>x==='W:'+at); if(!opt.at && ats.length>1 && log.length>=2 && same) at=ats[1+Math.floor(Math.random()*(ats.length-1))]; log.push('W:'+at); if(opt.stopWalk) return {stop:'walk',ats,log};
      if(at==='wait'||at==='move'){ if(at==='move'){await hold('ArrowLeft',120);} else await hold('z',50); await S(600); continue; }
      const ok=await walk(at); if(!ok){ return {stop:'noroute',ats,log}; } await S(400); continue; }
    await hold('z',40); await S(opt.gap||220);
  }
  return {stop:'time',log}; };
}
