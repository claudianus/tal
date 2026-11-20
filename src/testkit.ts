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
  if(/소매 끝을 쥔다/.test(h)){ for(let i=0;i<200&&document.querySelector('#game.on');i++){ await hold('z',40); await S(90);} return 'sleeve'; }
  if(/연타해서|놓지 않는다/.test(h)){ for(let i=0;i<120&&document.querySelector('#game.on');i++){ await hold('z',40); await S(90);} return 'tug'; }
  if(/땀 자리|뒤로 한 땀|앞으로 두 땀|천천히/.test(h)){ // 화면을 보고 바늘이 표시 위에 올 때 누른다 (캔버스 픽셀을 읽는다)
    const cv=document.querySelector('#game'); const cx=cv.getContext('2d');
    const find=(y,r,g,b)=>{ const d=cx.getImageData(0,y,cv.width,1).data; for(let x=0;x<cv.width;x++){ const i=x*4; if(Math.abs(d[i]-r)<6&&Math.abs(d[i+1]-g)<6&&Math.abs(d[i+2]-b)<6) return x; } return -1; };
    for(let i=0;i<4000&&document.querySelector('#game.on');i++){ const n=find(64,216,220,224), m=find(67,255,216,144); if(n>=0&&m>=0&&Math.abs(n-(m+1))<=1){ await hold('z',30); await S(260);} else await S(8); }
    return 'stitch'; }
  if(/세 자리|Z 로 누른다/.test(h)){ // 다이얼: 손끝을 구석으로 몰았다가 번호 자리로 옮겨 누른다
    const goal=(h.match(/(\d) (\d) (\d)/)||[]).slice(1).join('')||'112';
    const POS={'1':[0,0],'2':[1,0],'3':[2,0],'4':[0,1],'5':[1,1],'6':[2,1],'7':[0,2],'8':[1,2],'9':[2,2],'0':[1,3]};
    for(let tries=0;tries<6&&document.querySelector('#game.on');tries++){
      for(const d of goal){ for(let i=0;i<3;i++){await hold('ArrowLeft',25);await S(30);} for(let i=0;i<4;i++){await hold('ArrowUp',25);await S(30);}
        const [x,y]=POS[d]; for(let i=0;i<x;i++){await hold('ArrowRight',25);await S(30);} for(let i=0;i<y;i++){await hold('ArrowDown',25);await S(30);} await hold('z',30); await S(120); }
      if(/통화/.test(document.querySelector('#hint')?.textContent||'')){ for(let i=0;i<5;i++){await hold('ArrowDown',25);await S(30);} await hold('z',30); break; }
    }
    for(let i=0;i<40&&document.querySelector('#game.on');i++) await S(100); return 'dial'; }
  if(/손을 움직인다/.test(h)){ // 젤리 손: 화면에서 지폐(초록)·동전(금색)과 내 젤리(분홍)를 찾아 그쪽으로 민다
    const cv=document.querySelector('#game'); const cx=cv.getContext('2d');
    const box=(test)=>{ const d=cx.getImageData(0,0,cv.width,cv.height).data; let n=0,sx=0,sy=0; for(let y=0;y<cv.height;y++) for(let x=0;x<cv.width;x++){ const i=(y*cv.width+x)*4; if(test(d[i],d[i+1],d[i+2])){n++;sx+=x;sy+=y;} } return n?[sx/n,sy/n,n]:null; };
    const near=(r,g,b,R,G,B)=>Math.abs(r-R)<10&&Math.abs(g-G)<10&&Math.abs(b-B)<10;
    for(let i=0;i<300&&document.querySelector('#game.on');i++){
      const pad=box((r,g,b)=>near(r,g,b,232,154,168)); if(!pad){await S(100);continue;}
      const bill=box((r,g,b)=>near(r,g,b,156,191,154)); const coin=box((r,g,b)=>near(r,g,b,192,180,144));
      const t=bill&&bill[2]>80? [bill[0],bill[1]] : coin? [coin[0],coin[1]] : null; if(!t){await S(150);continue;}
      const dx=t[0]-pad[0], dy=t[1]-(pad[1]+2);
      if(Math.abs(dx)<5&&Math.abs(dy)<5){ await hold('z',30); await S(400); continue; }
      if(Math.abs(dx)>=5) await hold(dx>0?'ArrowRight':'ArrowLeft', Math.min(90,20+Math.abs(dx)));
      if(Math.abs(dy)>=5) await hold(dy>0?'ArrowDown':'ArrowUp', Math.min(90,20+Math.abs(dy)));
      await S(220);
    }
    return 'paw'; }
  if(/보낸다/.test(h)){ await hold('z',50); return 'send'; }
  if(/박자를 맞춰 발을|아이 그네 높이에/.test(h)){ const tog=/아이 그네/.test(h); let last=-9; // 그네가 가는 쪽을 보고 누른다. 같이 탈 땐 아이보다 높으면 거른다
    for(let i=0;i<2000 && document.querySelector('#game.on');i++){ const st=window.__play?.peek?.(); if(st && performance.now()-last>800 && Math.abs(st.v)>0.6){ last=performance.now(); if(!(tog && st.A>0.36)) await hold(st.v>0?'ArrowRight':'ArrowLeft',50); } await S(30); } return 'swing'; }
  if(/셔터까지 그대로/.test(h)){ let on=true; down('z'); for(let i=0;i<300&&document.querySelector('#game.on');i++){ const st=window.__play?.peek?.()||{}; if(on && st.shake>0.7 && st.tt<9){ up('z'); on=false; await S(500); down('z'); on=true; } await S(50);} up('z'); return 'photo'; }
  if(/물병이 손 앞에/.test(h)){ for(let i=0;i<200&&document.querySelector('#game.on');i++){ const st=window.__play?.peek?.(); if(st && st.f>0.88){ await hold('z',50); break;} await S(15);} for(let i=0;i<40&&document.querySelector('#game.on');i++) await S(100); return 'catch'; }
  if(/지퍼가 올라간다/.test(h)){ let nz=0; for(let i=0;i<2000&&document.querySelector('#game.on');i++){ const st=window.__play?.peek?.()||{}; if(st.snag){ up('ArrowRight'); if(performance.now()>nz){ await hold('z',40); nz=performance.now()+180; } } else down('ArrowRight'); await S(20);} up('ArrowRight'); return 'zip'; }
  if(/손이 올라간다/.test(h)){ let rest=false, nk=0; for(let i=0;i<2000&&document.querySelector('#game.on');i++){ const st=window.__play?.peek?.()||{}; if(st.dread>0.6) rest=true; if(st.dread<0.15) rest=false; if(rest) up('z'); else down('z'); if(!rest && st.hand>0.88 && performance.now()>nk){ await hold('ArrowRight',40); nk=performance.now()+350; } await S(20);} up('z'); return 'knock'; }
  if(/아이 집이 있는 107동/.test(h)){ for(let i=0;i<200&&document.querySelector('#game.on');i++){ const st=window.__play?.peek?.(); if(!st) break; const d=st.target-st.x; if(Math.abs(d)<6){ await hold('z',40); break; } await hold(d>0?'ArrowRight':'ArrowLeft', Math.min(300, Math.abs(d)*12)); } for(let i=0;i<40&&document.querySelector('#game.on');i++) await S(100); return 'point'; }
  if(/내 사진을 찾는다/.test(h)){ for(let i=0;i<40&&document.querySelector('#game.on');i++){ const st=window.__play?.peek?.(); if(!st) break; const tx=st.me%6, ty=Math.floor(st.me/6); if(st.cx!==tx){ await hold('ArrowRight',40);} else if(st.cy!==ty){ await hold('ArrowDown',40);} else { await hold('z',40); break; } await S(150);} for(let i=0;i<40&&document.querySelector('#game.on');i++) await S(100); return 'album'; }
  if(/Z 를 누르면 끈다/.test(h)){ const w=Math.random()<0.5?3000+Math.random()*6000:30000; for(let i=0;i*200<w && document.querySelector('#game.on');i++) await S(200); if(document.querySelector('#game.on')) await hold('z',80); for(let i=0;i<60&&document.querySelector('#game.on');i++) await S(200); return 'watch'; }
  if(/Z 를 누르면 나간다/.test(h)){ for(let i=0;i<60 && document.querySelector('#game.on');i++){await hold('z',70); await S(250+Math.random()*300);} return 'leave'; }
  if(/엄지를 띄운다/.test(h)){ // 왼쪽 세로 막대의 표시 높이를 읽고, 내려갔을 때만 누른다
    const cv=document.querySelector('#game'); const cx=cv.getContext('2d'); const k=cv.width/256;
    for(let i=0;i<400 && document.querySelector('#game.on');i++){
      const col=cx.getImageData(Math.round(60*k+1),Math.round(30*k),1,Math.round(92*k)).data; let yy=-1;
      for(let j=0;j<col.length/4;j++){ const r=col[j*4],g=col[j*4+1]; if(r>200&&(g>200||g<120)){yy=j;break;} }
      const pp=yy<0?0.5:(yy/k)/87; if(pp>0.45){ await hold('ArrowUp',50); await S(120);} else await S(60);
    } return 'lurk'; }
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
