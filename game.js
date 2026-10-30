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
const S=new THREE.Scene();
const C=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,0.1,200);
addEventListener('resize',()=>{R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix();});
S.add(new THREE.HemisphereLight(0xdde8ff,0x4a4a3a,1.15));const dl=new THREE.DirectionalLight(0xfff0d8,1.3);dl.position.set(30,50,20);S.add(dl);
const A=60;// half size
function tex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);}return t;}
// gradient sky
S.background=tex(4,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#2d4f80');gr.addColorStop(.55,'#8fb4d8');gr.addColorStop(1,'#d9c9a8');g.fillStyle=gr;g.fillRect(0,0,w,h);});
S.fog=new THREE.Fog(0xb8bcb0,45,130);
// procedural ground: concrete tiles + dirt noise + painted lines
const groundT=tex(256,256,(g,w,h)=>{g.fillStyle='#6d6f5e';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(${Math.random()<.5?'40,40,30':'150,145,120'},${Math.random()*.15})`;const r=Math.random()*10;g.fillRect(Math.random()*w,Math.random()*h,r,r);}
 g.strokeStyle='rgba(30,30,25,.55)';g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke();}},12);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(A*2,A*2),new THREE.MeshLambertMaterial({map:groundT}));ground.rotation.x=-Math.PI/2;S.add(ground);
{const ln=new THREE.Mesh(new THREE.RingGeometry(9,9.6,32),new THREE.MeshBasicMaterial({color:0xd8c050}));ln.rotation.x=-Math.PI/2;ln.position.y=.03;S.add(ln);}
const LEG={hipY:2.5,L1:1.2,L2:1.2,foot:.25,idleKnee:.25,strideRate:1.5};
const jointG=new THREE.SphereGeometry(.34,8,6),pistonG=new THREE.CylinderGeometry(.09,.09,1,6);
const M=c=>new THREE.MeshLambertMaterial({color:c});
const antG=new THREE.CylinderGeometry(.04,.04,1.3,4),barrelG=new THREE.CylinderGeometry(.1,.1,1.4,6),tubeG=new THREE.CylinderGeometry(.13,.13,.15,6),flashG=new THREE.ConeGeometry(.35,1,6);
const _mc={};const MS={metal:M(0x9aa0a6),dark:M(0x111111),flash:new THREE.MeshBasicMaterial({color:0xffe080}),
 stripe:c=>_mc['s'+c]||(_mc['s'+c]=M(c===0x3a7bd5?0xf0f0f0:0x111111)),visor:c=>_mc['v'+c]||(_mc['v'+c]=new THREE.MeshBasicMaterial({color:c===0x3a7bd5?0x40e0ff:0xff4020}))};
const boxG=new THREE.BoxGeometry(1,1,1);
const obst=[];// {x,z,hx,hz,h}
const winT=tex(64,64,(g,w,h)=>{g.fillStyle='#8a8478';g.fillRect(0,0,w,h);for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.fillStyle=Math.random()<.3?'#ffd98a':'#1d2630';g.fillRect(x*32+8,y*32+8,16,14);}g.fillStyle='#6a655c';g.fillRect(0,30,64,3);});
const crateT=tex(64,64,(g,w,h)=>{g.fillStyle='#8b6a3c';g.fillRect(0,0,w,h);g.strokeStyle='#5a4220';g.lineWidth=6;g.strokeRect(3,3,58,58);g.beginPath();g.moveTo(0,0);g.lineTo(64,64);g.stroke();});
const contT=tex(128,64,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=8){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,0,3,h);}});
const matCache={};function mat(c,map){const key=c+(map?map.uuid:'');return matCache[key]||(matCache[key]=new THREE.MeshLambertMaterial({color:c,map}));}
function solid(x,z,w,d,h,material,ry=0){const m=new THREE.Mesh(boxG,material);m.scale.set(w,h,d);m.position.set(x,h/2,z);m.rotation.y=ry;S.add(m);if(ry){const t=w;if(Math.abs(Math.sin(ry))>.7){w=d;d=t;}}obst.push({x,z,hx:w/2,hz:d/2,h,m});return m;}
function wall(x,z,w,d,h,c=0x8a8a80){return solid(x,z,w,d,h,mat(c));}
function building(x,z,w,d,h){const t=winT.clone();t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.round(w/3),Math.round(h/3));solid(x,z,w,d,h,new THREE.MeshLambertMaterial({map:t}));const r=new THREE.Mesh(boxG,mat(0x4a4a48));r.scale.set(w+.4,.4,d+.4);r.position.set(x,h+.2,z);S.add(r);}
function ruin(x,z,len,horiz){const n=4,seg=len/n;for(let i=0;i<n;i++){const h=1.5+Math.random()*3.5,o=-len/2+seg*(i+.5);horiz?solid(x+o,z,seg,1.2,h,mat(0x9a8f78)):solid(x,z+o,1.2,seg,h,mat(0x9a8f78));}}
function crate(x,z,s=2){solid(x,z,s,s,s,mat(0xffffff,crateT));}
function container(x,z,horiz,c){horiz?solid(x,z,8,3,3,mat(c,contT)):solid(x,z,3,8,3,mat(c,contT));}
function pillar(x,z){const m=new THREE.Mesh(pillarG,mat(0x9a9890));m.position.set(x,4,z);S.add(m);obst.push({x,z,hx:.9,hz:.9,h:8,m});}
function platform(x,z,w,d){solid(x,z,w,d,1.6,mat(0x7d7a70));const rl=new THREE.Mesh(boxG,mat(0xc8a030));rl.scale.set(w,.3,.3);rl.position.set(x,1.9,z-d/2+.15);S.add(rl);}
const pillarG=new THREE.CylinderGeometry(.9,1.1,8,8);
// boundary: tall walls with hazard trim
for(const [x,z,w,d] of [[0,-A,A*2,2],[0,A,A*2,2],[-A,0,2,A*2],[A,0,2,A*2]]){wall(x,z,w,d,8,0x5a5d62);const t=new THREE.Mesh(boxG,mat(0xd0a020));t.scale.set(w+.1,.5,d+.1);t.position.set(x,7.5,z);S.add(t);}
building(0,0,9,9,10);building(-38,-38,10,8,12);building(38,38,8,10,11);building(-40,36,8,8,9);building(40,-36,9,8,13);
ruin(-25,-20,12,true);ruin(25,20,12,true);ruin(-25,22,12,false);ruin(25,-22,12,false);
container(0,-34,true,0xb03a2e);container(0,34,true,0x2e6bb0);container(-44,0,false,0x2e8a4a);container(44,0,false,0xc07a20);
crate(-12,12);crate(-10,13.5,1.5);crate(12,-12);crate(13.7,-10.5,1.5);crate(14,14);crate(-14,-14);crate(-30,5,2.5);crate(30,-5,2.5);
pillar(-18,0);pillar(18,0);pillar(0,-18);pillar(0,18);
platform(-12,-36,6,4);platform(12,36,6,4);
// lamp props (emissive only, no real lights)
{const poleG=new THREE.CylinderGeometry(.12,.15,6,6),bulbG=new THREE.SphereGeometry(.35,8,6),bm=new THREE.MeshBasicMaterial({color:0xfff2b0}),pm=mat(0x333333);
 for(const [x,z] of [[-20,-45],[20,-45],[-20,45],[20,45],[-50,-20],[50,20],[-50,20],[50,-20]]){const p=new THREE.Mesh(poleG,pm);p.position.set(x,3,z);const b=new THREE.Mesh(bulbG,bm);b.position.set(x,6.1,z);S.add(p,b);}}
const obstMeshes=obst.map(o=>o.m);
function blocked(x,z,r){for(const o of obst)if(Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r)return o;return null;}
// line of sight: sample
function los(a,b){const d=b.clone().sub(a),L=d.length(),n=Math.ceil(L/1.5);for(let i=1;i<n;i++){const p=a.clone().addScaledVector(d,i/n);for(const o of obst)if(p.y<o.h&&Math.abs(p.x-o.x)<o.hx&&Math.abs(p.z-o.z)<o.hz)return false;}return true;}
// mech builder
function mech(col){const g=new THREE.Group(),m=M(col),dk=M(0x333333);
 const lower=new THREE.Group();g.add(lower);const legs=[],jm=M(0x888888);
 for(const s of[-1,1]){// hip joint -> thigh -> knee joint -> shin -> ankle joint -> foot
  const hipJ=new THREE.Group();hipJ.position.set(s*0.85,LEG.hipY,0);hipJ.add(new THREE.Mesh(jointG,jm));
  const th=new THREE.Mesh(boxG,dk);th.scale.set(.45,LEG.L1,.55);th.position.y=-LEG.L1/2;hipJ.add(th);
  const pis=new THREE.Mesh(pistonG,jm);pis.position.set(0,-LEG.L1/2,-.38);hipJ.add(pis);
  const knee=new THREE.Group();knee.position.y=-LEG.L1;knee.add(new THREE.Mesh(jointG,jm));hipJ.add(knee);
  const sh=new THREE.Mesh(boxG,m);sh.scale.set(.55,LEG.L2,.65);sh.position.y=-LEG.L2/2;knee.add(sh);
  const pis2=new THREE.Mesh(pistonG,jm);pis2.position.set(0,-LEG.L2/2,.4);knee.add(pis2);
  const ank=new THREE.Group();ank.position.y=-LEG.L2;const aj=new THREE.Mesh(jointG,jm);aj.scale.setScalar(.8);ank.add(aj);knee.add(ank);
  const ft=new THREE.Mesh(boxG,dk);ft.scale.set(.8,LEG.foot,1.4);ft.position.set(0,-LEG.foot/2-.1,.2);ank.add(ft);
  lower.add(hipJ);legs.push({hip:hipJ,knee,ank});}
 const top=new THREE.Group();top.position.y=2.6;g.add(top);
 const hip=new THREE.Mesh(boxG,dk);hip.scale.set(2,.5,1);hip.position.y=LEG.hipY;lower.add(hip);
 const t=new THREE.Mesh(boxG,m);t.scale.set(2.2,1.5,1.6);t.position.y=.8;top.add(t);
 const add=(par,geo,mt,sx,sy,sz,x,y,z)=>{const o=new THREE.Mesh(geo,mt);o.scale.set(sx,sy,sz);o.position.set(x,y,z);par.add(o);return o;};
 add(top,boxG,dk,1.6,.9,.25,0,.75,.86);// chest plate
 add(top,boxG,MS.stripe(col),2.25,.18,1.65,0,1.25,0);// team stripe
 add(top,boxG,dk,1.05,.55,.45,0,1.65,.55);// cockpit
 add(top,boxG,MS.visor(col),.85,.18,.05,0,1.7,.79);// visor glow
 for(const s of[-1,1]){const sp=add(top,boxG,m,.8,.35,1.3,s*1.35,1.6,0);sp.rotation.z=s*-.3;}// shoulder pads
 add(top,antG,MS.metal,1,1,1,.7,2.4,-.5);add(top,jointG,MS.visor(col),.25,.25,.25,.7,3.05,-.5);// antenna
 const guns=[],flash=[];for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*1.45,.7,0);add(pv,boxG,dk,.55,.55,1.1,0,0,.2);
  for(const bx of[-.12,.12]){const br=add(pv,barrelG,MS.metal,1,1,1,bx,0,1.2);br.rotation.x=Math.PI/2;}
  const fl=add(pv,flashG,MS.flash,1,1,1,0,0,2.1);fl.rotation.x=-Math.PI/2;fl.visible=false;flash.push(fl);top.add(pv);guns.push(pv);}
 const pod=new THREE.Group();pod.position.set(-.75,1.9,-.1);top.add(pod);add(pod,boxG,M(0x665544),.9,.7,1,0,0,0);
 for(let r=0;r<2;r++)for(let c=0;c<2;c++){const tb=add(pod,tubeG,MS.dark,1,1,1,-.2+c*.4,-.15+r*.3,.45);tb.rotation.x=Math.PI/2;}
 S.add(g);return{g,lower,legs,top,guns,pod,flash,flashT:0,smokeT:0,walk:0,legYaw:0,tYaw:0,gp:0};}
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function turn(cur,tgt,rate,dt){const d=wrap(tgt-cur);return cur+Math.sign(d)*Math.min(Math.abs(d),rate*dt);}
// legs face movement; if moving >110deg away from torso, legs face opposite and walk backwards
// keyframed walk: hip swing + knee lift on forward swing, ankle keeps foot flat; body height solved so planted foot touches ground
function legPose(L,ph,amp){const hip=-0.42*amp*Math.sin(ph),knee=LEG.idleKnee+amp*(0.25+0.95*Math.max(0,Math.cos(ph)));
 L.hip.rotation.x=hip;L.knee.rotation.x=knee;L.ank.rotation.x=-(hip+knee);return LEG.L1*Math.cos(hip)+LEG.L2*Math.cos(hip+knee);}
function animLegs(u,mvx,mvz,sp,dt,legTurn){let dir=1;
 if(sp>0.1){let my=Math.atan2(mvx,mvz);if(Math.abs(wrap(my-u.tYaw))>1.9){my+=Math.PI;dir=-1;}u.legYaw=turn(u.legYaw,my,legTurn,dt);u.walk+=dir*sp*dt*LEG.strideRate;}
 u.amp=(u.amp||0)+((sp>0.1?Math.min(1,sp/6):0)-(u.amp||0))*Math.min(1,dt*6);
 const h=Math.max(legPose(u.legs[0],u.walk,u.amp),legPose(u.legs[1],u.walk+Math.PI,u.amp));
 const off=h+LEG.foot+.1-LEG.hipY;u.lower.position.y=off;u.top.position.y=2.6+off;
 if(u.flashT>0){u.flashT-=dt;if(u.flashT<=0)u.flash.forEach(f=>f.visible=false);}
 if(u.hp<u.max*.35){u.smokeT-=dt;if(u.smokeT<=0){u.smokeT=.12;const p=new THREE.Vector3();u.top.getWorldPosition(p);p.y+=1.5;fx(p,.6,0x333333,{vy:3,grow:2.5,life:1.4,op:.6});}}
 u.lower.rotation.y=u.legYaw;u.top.rotation.y=u.tYaw;u.lower.rotation.z=Math.sin(u.walk)*0.04*u.amp;for(const g of u.guns)g.rotation.x=u.gp;}
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
function fx(p,s,c,o={}){const m=new THREE.Mesh(o.box?sparkG:fxG,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o.op||1,depthWrite:false}));m.position.copy(p);m.scale.setScalar(s*.2);S.add(m);FX.push({m,t:0,s,v:o.v||new THREE.Vector3(0,o.vy||0,0),grow:o.grow??1,life:o.life||.33,op:o.op||1,g:o.box?-20:0});}
const sparkG=new THREE.BoxGeometry(.12,.12,.12);
function boom(p,s,c=0xff8800){fx(p,s,c);}
function sparks(p){for(let i=0;i<4;i++)fx(p,1,0xffe070,{box:1,grow:0,life:.35,v:new THREE.Vector3((Math.random()-.5)*12,Math.random()*8,(Math.random()-.5)*12)});}
function muzzle(u,i){u.flash[i].visible=true;u.flash[i].rotation.z=Math.random()*3;u.flashT=.05;const p=new THREE.Vector3();u.guns[i].getWorldPosition(p);const f=new THREE.Vector3(Math.sin(u.tYaw),0,Math.cos(u.tYaw));return p.addScaledVector(f,1.5);}
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
// any touch in aimT (aim area OR a held fire button) feeds aim deltas
const aimT=new Map();const AIMX=.006,AIMY=.004;
addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===jid)jm(t);const a=aimT.get(t.identifier);if(a&&P){P.yaw-=(t.clientX-a.x)*AIMX;P.pitch=Math.max(-.3,Math.min(.5,P.pitch+(t.clientY-a.y)*AIMY));a.x=t.clientX;a.y=t.clientY;}}e.preventDefault();},{passive:false});
function tend(e){for(const t of e.changedTouches){if(t.identifier===jid){jid=null;inp.mx=inp.mz=0;knob.style.transform='';}aimT.delete(t.identifier);for(const k of['mg','rk'])if(inp[k+'Id']===t.identifier){inp[k]=false;inp[k+'Id']=null;}}}
addEventListener('touchend',tend);addEventListener('touchcancel',tend);
const aim=document.getElementById('aim');
aim.addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)aimT.set(t.identifier,{x:t.clientX,y:t.clientY});},{passive:false});
function hold(id,k){const b=document.getElementById(id);b.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];inp[k]=true;inp[k+'Id']=t.identifier;aimT.set(t.identifier,{x:t.clientX,y:t.clientY});},{passive:false});}
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
  b.life-=dt;if(hit||b.life<=0){if(hit){if(b.rocket)boom(p.clone(),3,0xff7700);else{boom(p.clone(),.5,0xffdd55);sparks(p.clone());}if(b.rocket){const targets=b.owner==='p'?E:[P];for(const u of targets){const dd=u.g.position.clone().setY(2.5).distanceTo(p);if(dd<CFG.rocket.splash)hurt(u,b.dmg*.4*(1-dd/CFG.rocket.splash));}}}S.remove(b.m);B.splice(i,1);}}
 for(let i=E.length-1;i>=0;i--)if(E[i].hp<=0){const p=E[i].g.position.clone().setY(3);boom(p,6);boom(p.clone().setY(5),4,0x444444);S.remove(E[i].g);E.splice(i,1);}
 if(P.hp<=0){boom(pp.clone().setY(3),6);P.hp=0;end(false);}else if(!E.length)end(true);
 hud();}
function updFx(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt/f.life;f.v.y+=f.g*dt;f.m.position.addScaledVector(f.v,dt);if(f.grow)f.m.scale.setScalar(f.s*(.2+f.t*f.grow));else f.m.scale.setScalar(f.s*(1-f.t));f.m.material.opacity=f.op*(1-f.t);if(f.t>=1){S.remove(f.m);f.m.material.dispose();FX.splice(i,1);}}}
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
