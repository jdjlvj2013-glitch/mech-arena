import * as THREE from './three.module.js';
// ================= CONFIG (tune here) =================
const CFG={
 player:{hp:1000,speed:9,legTurn:6,torsoTurn:14},
 cam:{dist:7,height:5.4,side:2.2,lookAhead:12,pitchLift:5},
 gun:{mag:60,reload:2.5,fireInterval:0.09,dmg:14,spread:0.03},
 rocket:{max:4,recharge:3.0,cooldown:0.35,dmg:140,splash:4},
 enemy:{hp:400,speed:6,legTurn:4,torsoTurn:2.5,mag:24,reload:3.0,burstInterval:0.15,burstPause:[1.2,2.4],dmg:9,
        rockets:2,rocketRecharge:6.0,rocketChance:0.15},
};
// ======================================================
const R=new THREE.WebGLRenderer({antialias:false});
R.setPixelRatio(Math.min(devicePixelRatio,1.5));R.setSize(innerWidth,innerHeight);R.shadowMap.enabled=false;
document.body.prepend(R.domElement);
const S=new THREE.Scene();S.background=new THREE.Color(0x8fb4d8);S.fog=new THREE.Fog(0x8fb4d8,60,140);
const C=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,0.1,200);
addEventListener('resize',()=>{R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix();});
S.add(new THREE.HemisphereLight(0xffffff,0x445533,1.1));const dl=new THREE.DirectionalLight(0xffffff,1.2);dl.position.set(30,50,20);S.add(dl);
const A=60;// half size
const ground=new THREE.Mesh(new THREE.PlaneGeometry(A*2,A*2),new THREE.MeshLambertMaterial({color:0x6b7a55}));ground.rotation.x=-Math.PI/2;S.add(ground);
const grid=new THREE.GridHelper(A*2,24,0x445,0x556);grid.position.y=0.02;S.add(grid);
const M=c=>new THREE.MeshLambertMaterial({color:c});
const boxG=new THREE.BoxGeometry(1,1,1);
const obst=[];// {x,z,hx,hz,h}
function wall(x,z,w,d,h,c=0x8a8a80){const m=new THREE.Mesh(boxG,M(c));m.scale.set(w,h,d);m.position.set(x,h/2,z);S.add(m);obst.push({x,z,hx:w/2,hz:d/2,h,m});}
wall(0,-A,A*2,2,6,0x555);wall(0,A,A*2,2,6,0x555);wall(-A,0,2,A*2,6,0x555);wall(A,0,2,A*2,6,0x555);
[[0,0,8,8,7],[-25,-20,12,3,5],[25,20,12,3,5],[-25,22,3,12,5],[25,-22,3,12,5],[0,-35,14,3,5],[0,35,14,3,5],[-40,0,3,10,6],[40,0,3,10,6],[-12,12,4,4,4],[12,-12,4,4,4],[14,14,4,4,4],[-14,-14,4,4,4]].forEach(o=>wall(...o,0x9a8f78));
const obstMeshes=obst.map(o=>o.m);
function blocked(x,z,r){for(const o of obst)if(Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r)return o;return null;}
// line of sight: sample
function los(a,b){const d=b.clone().sub(a),L=d.length(),n=Math.ceil(L/1.5);for(let i=1;i<n;i++){const p=a.clone().addScaledVector(d,i/n);for(const o of obst)if(p.y<o.h&&Math.abs(p.x-o.x)<o.hx&&Math.abs(p.z-o.z)<o.hz)return false;}return true;}
// mech builder
function mech(col){const g=new THREE.Group(),m=M(col),dk=M(0x333333);
 const lower=new THREE.Group();g.add(lower);const legs=[];for(const s of[-1,1]){const l=new THREE.Group();l.position.set(s*0.8,2.4,0);const th=new THREE.Mesh(boxG,dk);th.scale.set(.5,1.3,.6);th.position.y=-.6;const sh=new THREE.Mesh(boxG,m);sh.scale.set(.6,1.3,.7);sh.position.y=-1.7;const ft=new THREE.Mesh(boxG,dk);ft.scale.set(.8,.3,1.3);ft.position.set(0,-2.3,.2);l.add(th,sh,ft);lower.add(l);legs.push(l);}
 const top=new THREE.Group();top.position.y=2.6;g.add(top);
 const hip=new THREE.Mesh(boxG,dk);hip.scale.set(2,.5,1);hip.position.y=2.4;lower.add(hip);
 const t=new THREE.Mesh(boxG,m);t.scale.set(2.2,1.5,1.6);t.position.y=.8;top.add(t);
 const cab=new THREE.Mesh(boxG,M(0x222a33));cab.scale.set(1,.5,.4);cab.position.set(0,1.1,.75);top.add(cab);
 const guns=[];for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*1.4,.7,0);const gp=new THREE.Mesh(boxG,dk);gp.scale.set(.5,.5,1.8);gp.position.z=.6;pv.add(gp);top.add(pv);guns.push(pv);}
 const pod=new THREE.Mesh(boxG,M(0x665544));pod.scale.set(.7,.6,.9);pod.position.set(-.7,1.8,-.1);top.add(pod);
 S.add(g);return{g,lower,legs,top,guns,pod,walk:0,legYaw:0,tYaw:0,gp:0};}
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function turn(cur,tgt,rate,dt){const d=wrap(tgt-cur);return cur+Math.sign(d)*Math.min(Math.abs(d),rate*dt);}
// legs face movement; if moving >110deg away from torso, legs face opposite and walk backwards
function animLegs(u,mvx,mvz,sp,dt,legTurn){let dir=1;
 if(sp>0.1){let my=Math.atan2(mvx,mvz);if(Math.abs(wrap(my-u.tYaw))>1.9){my+=Math.PI;dir=-1;}u.legYaw=turn(u.legYaw,my,legTurn,dt);u.walk+=dir*sp*dt*1.1;}
 const tgtA=sp>0.1?Math.sin(u.walk)*0.55:0;for(let i=0;i<2;i++){const want=i?-tgtA:tgtA;u.legs[i].rotation.x+=(want-u.legs[i].rotation.x)*Math.min(1,dt*12);}
 u.lower.rotation.y=u.legYaw;u.top.rotation.y=u.tYaw;const bob=sp>0.1?Math.abs(Math.cos(u.walk))*0.18:0;u.top.position.y+=(2.6+bob-u.top.position.y)*Math.min(1,dt*10);
 u.top.rotation.z=sp>0.1?Math.sin(u.walk)*0.03:0;for(const g of u.guns)g.rotation.x=u.gp;}
// state
let P,E=[],B=[],FX=[],over=false;
const inp={mx:0,mz:0,mg:false,rk:false,keys:{}};
function newGame(){E.forEach(e=>S.remove(e.g));if(P)S.remove(P.g);B.forEach(b=>S.remove(b.m));FX.forEach(f=>S.remove(f.m));B=[];FX=[];
 P=Object.assign(mech(0x3a7bd5),{hp:CFG.player.hp,max:CFG.player.hp,yaw:Math.PI,pitch:0.05,ammo:CFG.gun.mag,reload:0,rk:CFG.rocket.max,rkCd:0,rkRe:0,fireCd:0});P.g.position.set(0,0,48);P.tYaw=P.legYaw=Math.PI;
 E=[];const sp=[[-40,-45],[40,-45],[0,-50],[-45,-15],[45,-15]];const n=3+Math.floor(Math.random()*3);
 for(let i=0;i<n;i++){const e=Object.assign(mech(0xc0392b),{hp:CFG.enemy.hp,max:CFG.enemy.hp,cd:1+Math.random()*2,tgt:null,think:0,burst:0,ammo:CFG.enemy.mag,reload:0,rk:CFG.enemy.rockets,rkRe:0});e.g.position.set(sp[i][0],0,sp[i][1]);
  const bar=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.25),new THREE.MeshBasicMaterial({color:0xff3333}));bar.position.y=5.6;e.g.add(bar);e.bar=bar;E.push(e);}
 over=false;document.getElementById('msg').style.display='none';}
const bulletG=new THREE.BoxGeometry(.15,.15,1.2),rocketG=new THREE.BoxGeometry(.35,.35,1),bm=new THREE.MeshBasicMaterial({color:0xffee66}),ebm=new THREE.MeshBasicMaterial({color:0xff5533}),rm=new THREE.MeshBasicMaterial({color:0xffaa22});
function shoot(from,dir,owner,rocket){const m=new THREE.Mesh(rocket?rocketG:bulletG,rocket?rm:(owner==='p'?bm:ebm));m.position.copy(from);m.lookAt(from.clone().add(dir));S.add(m);
 B.push({m,v:dir.clone().multiplyScalar(rocket?45:110),owner,rocket,life:rocket?3:1.2,dmg:rocket?CFG.rocket.dmg:(owner==='p'?CFG.gun.dmg:CFG.enemy.dmg)});}
const fxG=new THREE.SphereGeometry(1,8,6);
function boom(p,s,c=0xff8800){const m=new THREE.Mesh(fxG,new THREE.MeshBasicMaterial({color:c,transparent:true}));m.position.copy(p);m.scale.setScalar(.2);S.add(m);FX.push({m,t:0,s});}
function muzzle(u,i){const p=new THREE.Vector3();u.guns[i].getWorldPosition(p);const f=new THREE.Vector3(Math.sin(u.tYaw),0,Math.cos(u.tYaw));return p.addScaledVector(f,1.5);}
// aim direction for player: from camera through crosshair
const ray=new THREE.Raycaster();
function playerAim(){ray.setFromCamera(new THREE.Vector2(0,0.16),C);const tg=[...E.map(e=>e.g),...obst.map(o=>o.m),ground];const h=ray.intersectObjects(tg,true).find(h=>h.distance>CFG.cam.dist+2);return h?h.point:ray.ray.at(120,new THREE.Vector3());}
// input: keyboard/mouse
addEventListener('keydown',e=>{inp.keys[e.code]=true;if(e.code==='KeyR')manualReload();});addEventListener('keyup',e=>inp.keys[e.code]=false);
const cv=R.domElement;cv.addEventListener('mousedown',e=>{if(document.pointerLockElement!==cv&&cv.requestPointerLock){cv.requestPointerLock();}if(e.button===0)inp.mMG=true;if(e.button===2)inp.mRK=true;});
addEventListener('mouseup',e=>{if(e.button===0)inp.mMG=false;if(e.button===2)inp.mRK=false;});addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(document.pointerLockElement===cv){P.yaw-=e.movementX*.003;P.pitch=Math.max(-.3,Math.min(.5,P.pitch+e.movementY*.002));}});
// touch
const joy=document.getElementById('joy'),knob=document.getElementById('knob');let jid=null,jc;
joy.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];jid=t.identifier;const r=joy.getBoundingClientRect();jc={x:r.left+75,y:r.top+75};jm(t);},{passive:false});
function jm(t){let dx=t.clientX-jc.x,dy=t.clientY-jc.y;const d=Math.hypot(dx,dy),m=60;if(d>m){dx*=m/d;dy*=m/d;}knob.style.transform=`translate(${dx}px,${dy}px)`;inp.mx=dx/m;inp.mz=dy/m;}
addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===jid)jm(t);if(t.identifier===aid){P.yaw-=(t.clientX-ax)*.006;P.pitch=Math.max(-.3,Math.min(.5,P.pitch+(t.clientY-ay)*.004));ax=t.clientX;ay=t.clientY;}}e.preventDefault();},{passive:false});
function tend(e){for(const t of e.changedTouches){if(t.identifier===jid){jid=null;inp.mx=inp.mz=0;knob.style.transform='';}if(t.identifier===aid)aid=null;}}
addEventListener('touchend',tend);addEventListener('touchcancel',tend);
const aim=document.getElementById('aim');let aid=null,ax,ay;
aim.addEventListener('touchstart',e=>{e.preventDefault();if(aid===null){const t=e.changedTouches[0];aid=t.identifier;ax=t.clientX;ay=t.clientY;}},{passive:false});
function hold(id,k){const b=document.getElementById(id);b.addEventListener('touchstart',e=>{e.preventDefault();inp[k]=true;},{passive:false});b.addEventListener('touchend',e=>{e.preventDefault();inp[k]=false;});b.addEventListener('touchcancel',()=>inp[k]=false);}
hold('bMG','mg');hold('bRK','rk');
document.getElementById('rs').onclick=newGame;document.getElementById('rs').addEventListener('touchend',e=>{e.preventDefault();newGame();});
if(!('ontouchstart' in window)){joy.style.display='none';document.getElementById('bMG').style.display='none';document.getElementById('bRK').style.display='none';document.getElementById('bRL').style.display='none';}
else document.getElementById('hint').style.display='none';
// game loop
const fwd=new THREE.Vector3(),rt=new THREE.Vector3(),tmp=new THREE.Vector3();
function move(u,dx,dz,dt,sp){const p=u.g.position,r=1.6;const nx=p.x+dx*sp*dt,nz=p.z+dz*sp*dt;if(!blocked(nx,p.z,r))p.x=nx;if(!blocked(p.x,nz,r))p.z=nz;}
function hurt(u,d){u.hp-=d;}
function end(win){over=true;const m=document.getElementById('msg');m.style.display='flex';document.getElementById('mt').textContent=win?'VICTORY':'DESTROYED';document.exitPointerLock&&document.exitPointerLock();}
let last=performance.now();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(!over)update(dt);updFx(dt);cam();R.render(S,C);}
function update(dt){const k=inp.keys;let mx=inp.mx+((k.KeyD?1:0)-(k.KeyA?1:0)),mz=inp.mz+((k.KeyS?1:0)-(k.KeyW?1:0));
 if(k.ArrowLeft)P.yaw+=2*dt;if(k.ArrowRight)P.yaw-=2*dt;
 fwd.set(Math.sin(P.yaw),0,Math.cos(P.yaw));rt.set(-fwd.z,0,fwd.x);
 const v=tmp.set(0,0,0).addScaledVector(fwd,-mz).addScaledVector(rt,mx);const sp=Math.min(1,v.length());if(sp>.05){v.normalize();move(P,v.x,v.z,dt,CFG.player.speed*sp);}
 P.tYaw=turn(P.tYaw,P.yaw,CFG.player.torsoTurn,dt);P.gp+=((P.pitch-0.05)*0.8-P.gp)*Math.min(1,dt*8);
 animLegs(P,v.x,v.z,sp*CFG.player.speed,dt,CFG.player.legTurn);
 const G=CFG.gun,RK=CFG.rocket;P.fireCd-=dt;P.rkCd-=dt;
 if(P.reload>0){P.reload-=dt;if(P.reload<=0){P.reload=0;P.ammo=G.mag;}}
 if(P.rk<RK.max){P.rkRe-=dt;if(P.rkRe<=0){P.rk++;P.rkRe=P.rk<RK.max?RK.recharge:0;}}
 const pt=(inp.mg||inp.mMG||k.Space)?playerAim():null;
 if(pt&&P.fireCd<=0&&P.ammo>0&&!P.reload){P.fireCd=G.fireInterval;P.ammo--;const i=P.ammo%2,f=muzzle(P,i);const d=torsoDir(f,pt);d.x+=(Math.random()-.5)*G.spread;d.y+=(Math.random()-.5)*G.spread;shoot(f,d.normalize(),'p',false);if(P.ammo===0)P.reload=G.reload;}
 if((inp.rk||inp.mRK||k.KeyQ)&&P.rkCd<=0&&P.rk>0){const t=playerAim();P.rkCd=RK.cooldown;if(P.rk===RK.max)P.rkRe=RK.recharge;P.rk--;const f=new THREE.Vector3();P.pod.getWorldPosition(f);shoot(f,torsoDir(f,t),'p',true);}
 // AI
 const pp=P.g.position;for(const e of E){const ep=e.g.position;const toP=tmp.copy(pp).sub(ep);const dist=toP.length();const eye=ep.clone().setY(3.3),pe=pp.clone().setY(3.3);const see=los(eye,pe);
  e.think-=dt;if(e.think<=0){e.think=1.5+Math.random()*2;
   if(e.hp<e.max*.5||Math.random()<.35){// seek cover: pick obstacle, go to far side from player
    const o=obst[4+Math.floor(Math.random()*(obst.length-4))];const away=new THREE.Vector3(o.x-pp.x,0,o.z-pp.z).normalize();e.tgt=new THREE.Vector3(o.x+away.x*(o.hx+2.5),0,o.z+away.z*(o.hz+2.5));}
   else{const a=Math.random()*6.28,r=18+Math.random()*12;e.tgt=new THREE.Vector3(pp.x+Math.cos(a)*r,0,pp.z+Math.sin(a)*r);}}
  let s=0;if(e.tgt){var d=e.tgt.clone().sub(ep);d.y=0;if(d.length()>1.5){d.normalize();const bx=ep.x,bz=ep.z;move(e,d.x,d.z,dt,CFG.enemy.speed);if(Math.hypot(ep.x-bx,ep.z-bz)<.01)e.think=0;s=CFG.enemy.speed;}}
  const ty=Math.atan2(toP.x,toP.z);e.tYaw=turn(e.tYaw,ty,CFG.enemy.torsoTurn,dt);const dy=wrap(ty-e.tYaw);
  animLegs(e,s?d.x:0,s?d.z:0,s,dt,CFG.enemy.legTurn);
  const EC=CFG.enemy;if(e.reload>0){e.reload-=dt;if(e.reload<=0){e.reload=0;e.ammo=EC.mag;}}if(e.rk<EC.rockets){e.rkRe-=dt;if(e.rkRe<=0){e.rk++;e.rkRe=EC.rocketRecharge;}}
  e.bar.quaternion.copy(C.quaternion);e.bar.scale.x=Math.max(0,e.hp/e.max);
  e.cd-=dt;if(see&&dist<70&&Math.abs(dy)<.3&&e.cd<=0&&!e.reload){if(e.burst<=0)e.burst=6;e.burst--;e.cd=e.burst>0?EC.burstInterval:EC.burstPause[0]+Math.random()*(EC.burstPause[1]-EC.burstPause[0]);
   if(e.rk>0&&Math.random()<EC.rocketChance){if(e.rk===EC.rockets)e.rkRe=EC.rocketRecharge;e.rk--;const f=ep.clone().setY(4.4);shoot(f,pe.clone().sub(f).normalize(),'e',true);}
   else{const f=muzzle(e,e.burst%2),d=pe.clone().sub(f).normalize();d.x+=(Math.random()-.5)*.08;d.y+=(Math.random()-.5)*.05;d.z+=(Math.random()-.5)*.08;shoot(f,d.normalize(),'e',false);e.ammo--;if(e.ammo<=0){e.reload=EC.reload;e.burst=0;}}}}
 // bullets
 for(let i=B.length-1;i>=0;i--){const b=B[i],p=b.m.position;const steps=3;let hit=false;
  for(let s=0;s<steps&&!hit;s++){p.addScaledVector(b.v,dt/steps);
   if(p.y<0||Math.abs(p.x)>A||Math.abs(p.z)>A){hit=true;break;}
   for(const o of obst)if(p.y<o.h&&Math.abs(p.x-o.x)<o.hx&&Math.abs(p.z-o.z)<o.hz){hit=true;break;}
   const targets=b.owner==='p'?E:[P];for(const u of targets){const q=u.g.position;if(p.y<5.2&&Math.hypot(p.x-q.x,p.z-q.z)<1.7){hurt(u,b.dmg);hit=true;break;}}}
  b.life-=dt;if(hit||b.life<=0){if(hit){boom(p.clone(),b.rocket?3:.6,b.rocket?0xff7700:0xffdd55);if(b.rocket){const targets=b.owner==='p'?E:[P];for(const u of targets){const dd=u.g.position.clone().setY(2.5).distanceTo(p);if(dd<CFG.rocket.splash)hurt(u,b.dmg*.4*(1-dd/CFG.rocket.splash));}}}S.remove(b.m);B.splice(i,1);}}
 for(let i=E.length-1;i>=0;i--)if(E[i].hp<=0){const p=E[i].g.position.clone().setY(3);boom(p,6);boom(p.clone().setY(5),4,0x444444);S.remove(E[i].g);E.splice(i,1);}
 if(P.hp<=0){boom(pp.clone().setY(3),6);P.hp=0;end(false);}else if(!E.length)end(true);
 hud();}
function updFx(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt*3;f.m.scale.setScalar(f.s*f.t);f.m.material.opacity=1-f.t;if(f.t>=1){S.remove(f.m);f.m.material.dispose();FX.splice(i,1);}}}
// shots follow the torso heading (yaw) with vertical aim from the crosshair target
function torsoDir(f,pt){const d=pt.clone().sub(f),h=Math.hypot(d.x,d.z);return new THREE.Vector3(Math.sin(P.tYaw)*h,d.y,Math.cos(P.tYaw)*h).normalize();}
const camRay=new THREE.Raycaster(),cO=new THREE.Vector3(),cD=new THREE.Vector3();
function cam(){if(!P)return;const K=CFG.cam,p=P.g.position;const b=new THREE.Vector3(-Math.sin(P.yaw),0,-Math.cos(P.yaw)),r=new THREE.Vector3(-b.z,0,b.x);
 // r points to the mech's left in view; negate for right-shoulder offset
 cO.set(p.x,K.height,p.z);const want=new THREE.Vector3(p.x+b.x*K.dist-r.x*K.side,K.height+P.pitch*K.pitchLift,p.z+b.z*K.dist-r.z*K.side);
 cD.copy(want).sub(cO);const L=cD.length();cD.normalize();camRay.set(cO,cD);camRay.far=L;const h=camRay.intersectObjects(obstMeshes,false)[0];
 if(h)want.copy(cO).addScaledVector(cD,Math.max(1.2,h.distance-0.4));
 C.position.copy(want);C.lookAt(p.x-b.x*K.lookAhead-r.x*K.side,3.5-P.pitch*12,p.z-b.z*K.lookAhead-r.z*K.side);}
const hpf=document.getElementById('hpf'),info=document.getElementById('info');
const bMG=document.getElementById('bMG'),bRK=document.getElementById('bRK'),gunBar=document.getElementById('gunf'),rkPips=document.getElementById('rkp');
function manualReload(){if(P&&!over&&!P.reload&&P.ammo<CFG.gun.mag)P.reload=CFG.gun.reload;}
document.getElementById('bRL').addEventListener('touchstart',e=>{e.preventDefault();manualReload();},{passive:false});
function ring(el,frac,col){el.style.background=`conic-gradient(${col} ${frac*360}deg, #0006 0)`;}
function hud(){const G=CFG.gun,RK=CFG.rocket;hpf.style.width=(P.hp/P.max*100)+'%';
 info.innerHTML=`HP ${Math.ceil(P.hp)} &nbsp; Enemies: ${E.length}`;
 if(P.reload){const f=1-P.reload/G.reload;gunBar.style.width=f*100+'%';gunBar.style.background='#fa4';document.getElementById('gunt').textContent=`RELOADING ${P.reload.toFixed(1)}s`;ring(bMG,f,'#fa48');bMG.textContent='RELOAD';}
 else{gunBar.style.width=P.ammo/G.mag*100+'%';gunBar.style.background='#ff6';document.getElementById('gunt').textContent=`GUN ${P.ammo}/${G.mag}`;ring(bMG,P.ammo/G.mag,'#f448');bMG.textContent=P.ammo;}
 const rf=P.rk<RK.max?1-P.rkRe/RK.recharge:1;let h='';for(let i=0;i<RK.max;i++){const f=i<P.rk?1:(i===P.rk?rf:0);h+=`<span class="pip"><i style="height:${f*100}%;background:${f>=1?'#fa4':'#a66'}"></i></span>`;}rkPips.innerHTML=h;
 ring(bRK,P.rk>=RK.max?1:rf,P.rk?'#fa48':'#a668');bRK.textContent=P.rk+' RKT';}
newGame();requestAnimationFrame(loop);
window.__game={get E(){return E},get P(){return P}};
