import * as THREE from './three.module.js';
// ======================= CONFIG (tune here) =======================
const CFG={
 cam:{dist:7,height:5.4,side:2.2,lookAhead:12,pitchLift:5},
 gravity:26, torsoTurn:14, legTurn:6,
 mechs:{
  guardian:{name:'Guardian',hp:1300,speed:7.5,color:0x3a6fd5,enemyColor:0xa8322a,
   ability:'SHIELD',desc:'Heavy frame. Raise an energy shield that blocks all fire from the front. Moves at 50% speed while shielded.',
   shield:{hp:700,dur:6,cd:9,slow:0.5}},
  strider:{name:'Strider',hp:950,speed:10,color:0x1f9a9a,enemyColor:0xc0452a,
   ability:'JUMP',desc:'Agile frame. Jump-jets launch you over cover and onto containers and platforms.',
   jump:{vel:15,cd:4,airSpeed:1.25}},
  mender:{name:'Mender',hp:850,speed:9,color:0x3d8a3a,enemyColor:0x9a2f45,
   ability:'REGEN',desc:'Repair frame. After 3s without taking damage, auto-repairs 60 HP per second.',
   regen:{delay:3,rate:60}},
 },
 weapons:{
  minigun:{name:'Minigun',desc:'Huge fire rate, low damage per bullet. Spins up. Damage falls off past 60% range.',
   dmg:8,interval:0.045,spin:0.5,range:45,falloff:0.6,mag:150,reload:3.0,spread:0.05,speed:130,aiBurst:20},
  railgun:{name:'Railgun',desc:'Slow, precise, hits very hard at long range.',
   dmg:130,interval:1.1,range:110,mag:6,reload:3.5,spread:0.003,speed:240,aiBurst:1},
  hornet:{name:'Hornet Lock-On',desc:'Hold the crosshair on an enemy in range to lock, then fire homing rockets. Unlocked shots fly straight.',
   dmg:65,interval:0.28,range:55,mag:8,reload:4.0,spread:0.01,speed:42,splash:3.5,homing:true,lockTime:0.9,lockCone:0.2,turnRate:3.2,aiBurst:2},
 },
 enemy:{count:[3,5],hpMul:0.42,speedMul:0.75,dmgMul:0.55,fireMul:1.5,spread:0.07,torsoTurn:2.5,legTurn:4,burstPause:[1.3,2.6]},
};
// ==================================================================
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
function blocked(x,z,r,y=0){for(const o of obst)if(o.h>y+0.4&&Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r)return o;return null;}
function groundAt(x,z,y){let g=0;for(const o of obst)if(o.h<=y+0.45&&o.h>g&&Math.abs(x-o.x)<o.hx+.5&&Math.abs(z-o.z)<o.hz+.5)g=o.h;return g;}
function los(a,b){const d=b.clone().sub(a),L=d.length(),n=Math.ceil(L/1.5);for(let i=1;i<n;i++){const p=a.clone().addScaledVector(d,i/n);for(const o of obst)if(p.y<o.h&&Math.abs(p.x-o.x)<o.hx&&Math.abs(p.z-o.z)<o.hz)return false;}return true;}
// ---------- shared mech geometry/materials ----------
const TM={p:{stripe:M(0xf0f0f0),visor:new THREE.MeshBasicMaterial({color:0x40e0ff})},e:{stripe:M(0x111111),visor:new THREE.MeshBasicMaterial({color:0xff4020})}};
const shieldMat=new THREE.MeshBasicMaterial({color:0x60d8ff,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide});
const jetMat=new THREE.MeshBasicMaterial({color:0xffa030}),coreMat=new THREE.MeshBasicMaterial({color:0x60ff90}),coilMat=new THREE.MeshBasicMaterial({color:0x50c0ff});
const thrG=new THREE.CylinderGeometry(.3,.38,1.2,8),coreG=new THREE.SphereGeometry(.32,8,6),ringG=new THREE.TorusGeometry(.6,.07,4,12),coilG=new THREE.TorusGeometry(.3,.06,4,10),shieldG=new THREE.CylinderGeometry(3,3,4,10,1,true,-0.75,1.5);
// mech builder: team 'p'|'e', type key, weapon key
function mech(team,type,wpn){const T=CFG.mechs[type];const col=team==='p'?T.color:T.enemyColor;const g=new THREE.Group(),m=M(col),dk=M(0x333333),tm=TM[team];
 const lower=new THREE.Group();g.add(lower);const legs=[],jm=M(0x888888);
 for(const s of[-1,1]){const hipJ=new THREE.Group();hipJ.position.set(s*0.85,LEG.hipY,0);hipJ.add(new THREE.Mesh(jointG,jm));
  const th=new THREE.Mesh(boxG,dk);th.scale.set(.45,LEG.L1,.55);th.position.y=-LEG.L1/2;hipJ.add(th);
  const pis=new THREE.Mesh(pistonG,jm);pis.position.set(0,-LEG.L1/2,-.38);hipJ.add(pis);
  const knee=new THREE.Group();knee.position.y=-LEG.L1;knee.add(new THREE.Mesh(jointG,jm));hipJ.add(knee);
  const sh=new THREE.Mesh(boxG,m);sh.scale.set(.55,LEG.L2,.65);sh.position.y=-LEG.L2/2;knee.add(sh);
  const pis2=new THREE.Mesh(pistonG,jm);pis2.position.set(0,-LEG.L2/2,.4);knee.add(pis2);
  const ank=new THREE.Group();ank.position.y=-LEG.L2;const aj=new THREE.Mesh(jointG,jm);aj.scale.setScalar(.8);ank.add(aj);knee.add(ank);
  const ft=new THREE.Mesh(boxG,dk);ft.scale.set(.8,LEG.foot,1.4);ft.position.set(0,-LEG.foot/2-.1,.2);ank.add(ft);
  lower.add(hipJ);legs.push({hip:hipJ,knee,ank});}
 const hip=new THREE.Mesh(boxG,dk);hip.scale.set(2,.5,1);hip.position.y=LEG.hipY;lower.add(hip);
 const top=new THREE.Group();top.position.y=2.6;g.add(top);
 const add=(par,geo,mt,sx,sy,sz,x,y,z)=>{const o=new THREE.Mesh(geo,mt);o.scale.set(sx,sy,sz);o.position.set(x,y,z);par.add(o);return o;};
 const tw={guardian:[2.7,1.7,1.9],strider:[1.9,1.3,1.5],mender:[2.2,1.5,1.6]}[type];
 add(top,boxG,m,tw[0],tw[1],tw[2],0,.8,0);
 add(top,boxG,dk,tw[0]*.7,.9,.25,0,.75,tw[2]/2+.05);
 add(top,boxG,tm.stripe,tw[0]+.05,.18,tw[2]+.05,0,.8+tw[1]/2-.2,0);
 add(top,boxG,dk,1.05,.55,.45,0,.8+tw[1]/2+.25,.55);add(top,boxG,tm.visor,.85,.18,.05,0,.8+tw[1]/2+.3,.79);
 const pad=type==='guardian'?[1.2,.55,1.8]:[.8,.35,1.3];for(const s of[-1,1]){const sp=add(top,boxG,m,...pad,s*(tw[0]/2+.25),1.6,0);sp.rotation.z=s*-.3;}
 add(top,antG,MS.metal,1,1,1,.7,2.4,-.5);add(top,jointG,tm.visor,.25,.25,.25,.7,3.05,-.5);
 let shield=null,jets=[];
 if(type==='guardian'){shield=add(top,shieldG,shieldMat,1,1,1,0,.8,0);shield.visible=false;add(top,boxG,MS.metal,.4,1.2,.4,-tw[0]/2-.1,.4,.6);}
 if(type==='strider'){for(const s of[-1,1]){add(top,thrG,MS.metal,1,1,1,s*.55,.7,-1.05);const j=add(top,flashG,jetMat,1.2,1.4,1.2,s*.55,-.3,-1.05);j.rotation.x=Math.PI;j.visible=false;jets.push(j);}}
 if(type==='mender'){add(top,coreG,coreMat,1,1,1,0,.75,.95);const r=add(top,ringG,coreMat,1,1,1,0,.75,.95);}
 const guns=[],flash=[],spinners=[];const W=CFG.weapons[wpn];const mz={minigun:2.0,railgun:3.0,hornet:.9}[wpn];
 for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*(tw[0]/2+.35),.7,0);
  if(wpn==='minigun'){add(pv,boxG,dk,.6,.6,.9,0,0,.1);const sp=new THREE.Group();sp.position.z=1.2;pv.add(sp);spinners.push(sp);
   for(let k=0;k<3;k++){const a=k*2.09,b=add(sp,barrelG,MS.metal,.6,1.1,.6,Math.cos(a)*.15,Math.sin(a)*.15,0);b.rotation.x=Math.PI/2;}}
  else if(wpn==='railgun'){add(pv,boxG,dk,.45,.6,1.3,0,0,.1);const b=add(pv,barrelG,MS.metal,1.3,2,1.3,0,0,1.7);b.rotation.x=Math.PI/2;for(const z of[1.1,1.8])add(pv,coilG,coilMat,1,1,1,0,0,z);}
  else{add(pv,boxG,M(0x665544),.85,.85,1.1,0,.1,.1);for(let r=0;r<2;r++)for(let c=0;c<2;c++){const tb=add(pv,tubeG,MS.dark,1,1,1,-.2+c*.4,-.1+r*.4,.68);tb.rotation.x=Math.PI/2;}}
  const fl=add(pv,flashG,MS.flash,1,1,1,0,0,mz+.4);fl.rotation.x=-Math.PI/2;fl.visible=false;flash.push(fl);top.add(pv);guns.push(pv);}
 S.add(g);return{g,lower,legs,top,guns,flash,spinners,shield,jets,mz,flashT:0,smokeT:0,walk:0,legYaw:0,tYaw:0,gp:0};}
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function turn(cur,tgt,rate,dt){const d=wrap(tgt-cur);return cur+Math.sign(d)*Math.min(Math.abs(d),rate*dt);}
// legs face movement; if moving >110deg away from torso, legs face opposite and walk backwards
// keyframed walk: hip swing + knee lift on forward swing, ankle keeps foot flat; body height solved so planted foot touches ground
function legPose(L,ph,amp){const hip=-0.42*amp*Math.sin(ph),knee=LEG.idleKnee+amp*(0.25+0.95*Math.max(0,Math.cos(ph)));
 L.hip.rotation.x=hip;L.knee.rotation.x=knee;L.ank.rotation.x=-(hip+knee);return LEG.L1*Math.cos(hip)+LEG.L2*Math.cos(hip+knee);}
function animLegs(u,mvx,mvz,sp,dt,legTurn){let dir=1;
 if(sp>0.1){let my=Math.atan2(mvx,mvz);if(Math.abs(wrap(my-u.tYaw))>1.9){my+=Math.PI;dir=-1;}u.legYaw=turn(u.legYaw,my,legTurn,dt);u.walk+=dir*sp*dt*LEG.strideRate;}
 const air=u.air;u.amp=(u.amp||0)+((sp>0.1&&!air?Math.min(1,sp/6):0)-(u.amp||0))*Math.min(1,dt*6);
 const h=Math.max(legPose(u.legs[0],u.walk,u.amp),legPose(u.legs[1],u.walk+Math.PI,u.amp));
 if(air)for(const L of u.legs){L.knee.rotation.x=.9;L.hip.rotation.x=-.4;L.ank.rotation.x=-.5;}
 const off=h+LEG.foot+.1-LEG.hipY;u.lower.position.y=off;u.top.position.y=2.6+off;
 if(u.flashT>0){u.flashT-=dt;if(u.flashT<=0)u.flash.forEach(f=>f.visible=false);}
 for(const s of u.spinners)s.rotation.z+=dt*30*(u.spin||0);
 for(const j of u.jets)j.visible=air&&u.vy>-2;
 if(u.shield)u.shield.visible=u.shieldOn;
 if(u.hp<u.max*.35){u.smokeT-=dt;if(u.smokeT<=0){u.smokeT=.12;const p=new THREE.Vector3();u.top.getWorldPosition(p);p.y+=1.5;fx(p,.6,0x333333,{vy:3,grow:2.5,life:1.4,op:.6});}}
 u.lower.rotation.y=u.legYaw;u.top.rotation.y=u.tYaw;u.lower.rotation.z=Math.sin(u.walk)*0.04*u.amp;for(const g of u.guns)g.rotation.x=u.gp;}
// ---------- state ----------
let P,E=[],B=[],FX=[],mode='menu',clock=0;
const inp={mx:0,mz:0,fire:false,keys:{}};
const LS='mechArenaLoadout';let loadout={mech:'guardian',weapon:'minigun'};try{const l=JSON.parse(localStorage.getItem(LS));if(l&&CFG.mechs[l.mech]&&CFG.weapons[l.weapon])loadout=l;}catch(e){}
function saveLoadout(){try{localStorage.setItem(LS,JSON.stringify(loadout));}catch(e){}}
function makeUnit(team,type,wpn){const T=CFG.mechs[type],W=CFG.weapons[wpn],en=team==='e';const u=mech(team,type,wpn);
 Object.assign(u,{team,type,wpn,T,W,hp:T.hp*(en?CFG.enemy.hpMul:1),speed:T.speed*(en?CFG.enemy.speedMul:1),ammo:W.mag,reload:0,fireCd:0,spin:en?1:0,
  shieldOn:false,shieldHP:T.shield?T.shield.hp:0,shieldT:0,abCd:0,vy:0,air:false,lastHit:-99,lockT:0,lockTgt:null,cd:1+Math.random()*2,burst:0,think:0,tgt:null});u.max=u.hp;return u;}
function clearWorld(){E.forEach(e=>S.remove(e.g));if(P)S.remove(P.g);B.forEach(b=>S.remove(b.m));FX.forEach(f=>S.remove(f.m));B=[];FX=[];E=[];}
function newGame(){clearWorld();clock=0;
 P=makeUnit('p',loadout.mech,loadout.weapon);P.yaw=Math.PI;P.pitch=.05;P.g.position.set(0,0,48);P.tYaw=P.legYaw=Math.PI;
 const sp=[[-40,-46],[40,-46],[0,-50],[-46,-15],[46,-15]];const [a,b]=CFG.enemy.count;const n=a+Math.floor(Math.random()*(b-a+1));
 const mk=Object.keys(CFG.mechs),wk=Object.keys(CFG.weapons);
 for(let i=0;i<n;i++){const e=makeUnit('e',mk[Math.floor(Math.random()*3)],wk[Math.floor(Math.random()*3)]);e.g.position.set(sp[i][0],0,sp[i][1]);
  const bar=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.25),new THREE.MeshBasicMaterial({color:0xff3333}));bar.position.y=5.8;e.g.add(bar);e.bar=bar;E.push(e);}
 mode='play';showUI();}
// ---------- projectiles ----------
const PG={minigun:new THREE.BoxGeometry(.12,.12,1),railgun:new THREE.BoxGeometry(.18,.18,4),hornet:new THREE.BoxGeometry(.35,.35,1)};
const PM={minigun:new THREE.MeshBasicMaterial({color:0xffee66}),railgun:new THREE.MeshBasicMaterial({color:0x80e8ff}),hornet:new THREE.MeshBasicMaterial({color:0xffaa22})};
function shoot(from,dir,u,homing){const W=u.W;const m=new THREE.Mesh(PG[u.wpn],PM[u.wpn]);m.position.copy(from);m.lookAt(from.clone().add(dir));S.add(m);
 B.push({m,v:dir.clone().multiplyScalar(W.speed),owner:u.team,W,dist:0,dmg:W.dmg*(u.team==='e'?CFG.enemy.dmgMul:1),homing});}
const fxG=new THREE.SphereGeometry(1,8,6),sparkG=new THREE.BoxGeometry(.12,.12,.12);
function fx(p,s,c,o={}){const m=new THREE.Mesh(o.box?sparkG:fxG,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o.op||1,depthWrite:false}));m.position.copy(p);m.scale.setScalar(s*.2);S.add(m);FX.push({m,t:0,s,v:o.v||new THREE.Vector3(0,o.vy||0,0),grow:o.grow??1,life:o.life||.33,op:o.op||1,g:o.box?-20:0});}
function boom(p,s,c=0xff8800){fx(p,s,c);}
function sparks(p,c=0xffe070){for(let i=0;i<4;i++)fx(p,1,c,{box:1,grow:0,life:.35,v:new THREE.Vector3((Math.random()-.5)*12,Math.random()*8,(Math.random()-.5)*12)});}
function muzzle(u,i){u.flash[i].visible=true;u.flash[i].rotation.z=Math.random()*3;u.flashT=.05;const p=new THREE.Vector3();u.guns[i].getWorldPosition(p);const f=new THREE.Vector3(Math.sin(u.tYaw),0,Math.cos(u.tYaw));return p.addScaledVector(f,u.mz);}
function fireWeapon(u,aimPt,homing){const W=u.W;u.fireCd=W.interval*(u.team==='e'?CFG.enemy.fireMul:1)/(W.spin?Math.max(.3,u.spin):1);u.ammo--;
 const f=muzzle(u,u.ammo%2);const d=u.team==='p'?torsoDir(f,aimPt):aimPt.clone().sub(f).normalize();
 const s=W.spread+(u.team==='e'?CFG.enemy.spread:0);d.x+=(Math.random()-.5)*s;d.y+=(Math.random()-.5)*s*.6;d.z+=(Math.random()-.5)*s;d.normalize();
 shoot(f,d,u,homing);if(u.ammo<=0)u.reload=W.reload;}
// damage, with Guardian frontal shield
function frontal(u,pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,l=Math.hypot(dx,dz)||1;return (dx*Math.sin(u.tYaw)+dz*Math.cos(u.tYaw))/l>0.25;}
function dropShield(u){if(!u.shieldOn)return;u.shieldOn=false;u.abCd=u.T.shield.cd;}
function hurt(u,d,pos){if(u.shieldOn&&pos&&frontal(u,pos)){u.shieldHP-=d;sparks(pos,0x80e0ff);if(u.shieldHP<=0)dropShield(u);return;}u.hp-=d;u.lastHit=clock;}
// abilities
function ability(u){if(!u||mode!=='play')return;const T=u.T;
 if(T.shield){if(u.shieldOn)dropShield(u);else if(u.abCd<=0){u.shieldOn=true;u.shieldT=T.shield.dur;u.shieldHP=T.shield.hp;}}
 else if(T.jump){if(!u.air&&u.abCd<=0){u.vy=T.jump.vel;u.air=true;u.abCd=T.jump.cd;boom(u.g.position.clone().setY(.5),2,0xffaa44);}}}
function tickUnit(u,dt){const T=u.T;u.abCd=Math.max(0,u.abCd-dt);u.fireCd-=dt;
 if(u.reload>0){u.reload-=dt;if(u.reload<=0){u.reload=0;u.ammo=u.W.mag;}}
 if(u.shieldOn){u.shieldT-=dt;if(u.shieldT<=0)dropShield(u);}
 if(T.regen&&clock-u.lastHit>T.regen.delay&&u.hp<u.max&&u.hp>0)u.hp=Math.min(u.max,u.hp+T.regen.rate*(u.team==='e'?CFG.enemy.hpMul:1)*dt);
 const p=u.g.position,gy=groundAt(p.x,p.z,p.y);
 if(u.air||p.y>gy+.01){u.air=true;u.vy-=CFG.gravity*dt;p.y+=u.vy*dt;if(p.y<=gy){p.y=gy;u.vy=0;u.air=false;fx(p.clone().setY(gy+.3),1.5,0x999999,{life:.4});}}}
function speedOf(u){return u.speed*(u.shieldOn?u.T.shield.slow:1)*(u.air&&u.T.jump?u.T.jump.airSpeed:1);}
// player aim
const ray=new THREE.Raycaster();const AIMNDC=new THREE.Vector2(0,0.16);
function playerAim(){ray.setFromCamera(AIMNDC,C);const tg=[...E.map(e=>e.g),...obstMeshes,ground];const h=ray.intersectObjects(tg,true).find(h=>h.distance>CFG.cam.dist+2);return h?h.point:ray.ray.at(150,new THREE.Vector3());}
// ---------- input ----------
const ABKEYS=['KeyE','ShiftLeft','ShiftRight','Space'];
addEventListener('keydown',e=>{if(!inp.keys[e.code]&&ABKEYS.includes(e.code))ability(P);inp.keys[e.code]=true;if(e.code==='KeyR')manualReload();if(e.code==='Space')e.preventDefault();});addEventListener('keyup',e=>inp.keys[e.code]=false);
const cv=R.domElement;cv.addEventListener('mousedown',e=>{if(mode!=='play')return;if(document.pointerLockElement!==cv&&cv.requestPointerLock)cv.requestPointerLock();if(e.button===0)inp.mFire=true;if(e.button===2)ability(P);});
addEventListener('mouseup',e=>{if(e.button===0)inp.mFire=false;});addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(document.pointerLockElement===cv&&P){P.yaw-=e.movementX*.003;P.pitch=Math.max(-.3,Math.min(.5,P.pitch+e.movementY*.002));}});
const $=id=>document.getElementById(id);
const joy=$('joy'),knob=$('knob');let jid=null,jc;
joy.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];jid=t.identifier;const r=joy.getBoundingClientRect();jc={x:r.left+75,y:r.top+75};jm(t);},{passive:false});
function jm(t){let dx=t.clientX-jc.x,dy=t.clientY-jc.y;const d=Math.hypot(dx,dy),m=60;if(d>m){dx*=m/d;dy*=m/d;}knob.style.transform=`translate(${dx}px,${dy}px)`;inp.mx=dx/m;inp.mz=dy/m;}
// any touch in aimT (aim area OR held FIRE button) feeds aim deltas -> single-thumb fire+aim
const aimT=new Map();const AIMX=.006,AIMY=.004;
addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===jid)jm(t);const a=aimT.get(t.identifier);if(a&&P){P.yaw-=(t.clientX-a.x)*AIMX;P.pitch=Math.max(-.3,Math.min(.5,P.pitch+(t.clientY-a.y)*AIMY));a.x=t.clientX;a.y=t.clientY;}}
 if(!e.target.closest||!e.target.closest('#menu'))e.preventDefault();},{passive:false});
function tend(e){for(const t of e.changedTouches){if(t.identifier===jid){jid=null;inp.mx=inp.mz=0;knob.style.transform='';}aimT.delete(t.identifier);if(inp.fireId===t.identifier){inp.fire=false;inp.fireId=null;}}}
addEventListener('touchend',tend);addEventListener('touchcancel',tend);
$('aim').addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)aimT.set(t.identifier,{x:t.clientX,y:t.clientY});},{passive:false});
$('bMG').addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];inp.fire=true;inp.fireId=t.identifier;aimT.set(t.identifier,{x:t.clientX,y:t.clientY});},{passive:false});
$('bAB').addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];aimT.set(t.identifier,{x:t.clientX,y:t.clientY});ability(P);},{passive:false});
$('bRL').addEventListener('touchstart',e=>{e.preventDefault();manualReload();},{passive:false});
const TOUCH='ontouchstart' in window;
// ---------- loop ----------
const fwd=new THREE.Vector3(),rt=new THREE.Vector3(),tmp=new THREE.Vector3();
function move(u,dx,dz,dt,sp){const p=u.g.position,r=1.6;const nx=p.x+dx*sp*dt,nz=p.z+dz*sp*dt;if(!blocked(nx,p.z,r,p.y))p.x=nx;if(!blocked(p.x,nz,r,p.y))p.z=nz;}
function end(win){mode='over';$('msg').style.display='flex';$('mt').textContent=win?'VICTORY':'DESTROYED';$('ml').textContent=`${CFG.mechs[loadout.mech].name} + ${CFG.weapons[loadout.weapon].name}`;document.exitPointerLock&&document.exitPointerLock();inp.fire=false;inp.mFire=false;}
let last=performance.now(),menuA=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
 if(mode==='play')update(dt);else if(mode==='menu')menuTick(dt);updFx(dt);if(mode!=='menu')cam();R.render(S,C);}
function update(dt){clock+=dt;const k=inp.keys;let mx=inp.mx+((k.KeyD?1:0)-(k.KeyA?1:0)),mz=inp.mz+((k.KeyS?1:0)-(k.KeyW?1:0));
 if(k.ArrowLeft)P.yaw+=2*dt;if(k.ArrowRight)P.yaw-=2*dt;
 fwd.set(Math.sin(P.yaw),0,Math.cos(P.yaw));rt.set(-fwd.z,0,fwd.x);
 tickUnit(P,dt);
 const v=tmp.set(0,0,0).addScaledVector(fwd,-mz).addScaledVector(rt,mx);const sp=Math.min(1,v.length());const spd=speedOf(P);if(sp>.05){v.normalize();move(P,v.x,v.z,dt,spd*sp);}
 P.tYaw=turn(P.tYaw,P.yaw,CFG.torsoTurn,dt);P.gp+=((P.pitch-0.05)*0.8-P.gp)*Math.min(1,dt*8);
 animLegs(P,v.x,v.z,sp*spd,dt,CFG.legTurn);
 const W=P.W,firing=inp.fire||inp.mFire||k.KeyF;
 if(W.spin)P.spin=firing&&!P.reload?Math.min(1,P.spin+dt/W.spin):Math.max(0,P.spin-dt);
 updateLock(dt);
 if(firing&&P.fireCd<=0&&P.ammo>0&&!P.reload){const locked=W.homing&&P.lockTgt&&P.lockT>=W.lockTime;
  fireWeapon(P,playerAim(),locked?P.lockTgt:null);}
 // ---- AI ----
 const pp=P.g.position;for(const e of E){const ep=e.g.position;tickUnit(e,dt);const W=e.W;const toP=new THREE.Vector3().copy(pp).sub(ep);const dist=toP.length();
  const eye=ep.clone().setY(ep.y+3.3),pe=pp.clone().setY(pp.y+3.3);const see=los(eye,pe);
  e.think-=dt;if(e.think<=0){e.think=1.5+Math.random()*2;
   if(e.T.jump&&Math.random()<.3)ability(e);
   if(e.hp<e.max*.5||Math.random()<.35){const o=obst[4+Math.floor(Math.random()*(obst.length-4))];const away=new THREE.Vector3(o.x-pp.x,0,o.z-pp.z).normalize();e.tgt=new THREE.Vector3(o.x+away.x*(o.hx+2.5),0,o.z+away.z*(o.hz+2.5));}
   else{const a=Math.random()*6.28,r=Math.min(40,Math.max(15,W.range*.6))+Math.random()*8;e.tgt=new THREE.Vector3(pp.x+Math.cos(a)*r,0,pp.z+Math.sin(a)*r);}}
  if(e.T.shield&&!e.shieldOn&&e.abCd<=0&&clock-e.lastHit<.4)ability(e);
  let s=0,d=null;if(e.tgt){d=e.tgt.clone().sub(ep);d.y=0;if(d.length()>1.5){d.normalize();const bx=ep.x,bz=ep.z,es=speedOf(e);move(e,d.x,d.z,dt,es);if(Math.hypot(ep.x-bx,ep.z-bz)<.001)e.think=0;s=es;}}
  const ty=Math.atan2(toP.x,toP.z);e.tYaw=turn(e.tYaw,ty,CFG.enemy.torsoTurn,dt);const dy=wrap(ty-e.tYaw);
  animLegs(e,s?d.x:0,s?d.z:0,s,dt,CFG.enemy.legTurn);
  e.bar.quaternion.copy(C.quaternion);e.bar.scale.x=Math.max(0,e.hp/e.max);
  e.lockT=see&&dist<W.range?e.lockT+dt:0;e.cd-=dt;
  if(see&&dist<W.range*.95&&Math.abs(dy)<.3&&e.cd<=0&&!e.reload&&e.fireCd<=0){if(e.burst<=0)e.burst=W.aiBurst;
   fireWeapon(e,pe,W.homing&&e.lockT>W.lockTime?P:null);e.burst--;if(e.burst<=0||e.reload){e.burst=0;const bp=CFG.enemy.burstPause;e.cd=bp[0]+Math.random()*(bp[1]-bp[0]);}}}
 // ---- projectiles ----
 for(let i=B.length-1;i>=0;i--){const b=B[i],p=b.m.position,W=b.W,sp=W.speed;let hit=false,hitU=null;
  if(b.homing&&b.homing.hp>0){const tp=b.homing.g.position.clone();tp.y+=3;const want=tp.sub(p).normalize();const cur=b.v.clone().normalize();cur.lerp(want,Math.min(1,W.turnRate*dt)).normalize();b.v.copy(cur).multiplyScalar(sp);b.m.lookAt(p.clone().add(b.v));
   if(Math.random()<.5)fx(p.clone(),.5,0xaaaaaa,{life:.4,op:.5,grow:2});}
  const steps=W.speed>150?5:3;
  for(let s=0;s<steps&&!hit;s++){p.addScaledVector(b.v,dt/steps);b.dist+=sp*dt/steps;
   if(p.y<0||Math.abs(p.x)>A||Math.abs(p.z)>A){hit=true;break;}
   for(const o of obst)if(p.y<o.h&&Math.abs(p.x-o.x)<o.hx&&Math.abs(p.z-o.z)<o.hz){hit=true;break;}
   if(hit)break;
   const targets=b.owner==='p'?E:[P];for(const u of targets){const q=u.g.position,r=u.shieldOn?2.6:1.7;if(p.y>q.y&&p.y<q.y+5.4&&Math.hypot(p.x-q.x,p.z-q.z)<r){hitU=u;hit=true;break;}}}
  let mult=1;if(W.falloff&&b.dist>W.range*W.falloff)mult=1-.5*(b.dist-W.range*W.falloff)/(W.range*(1-W.falloff));
  const expired=b.dist>=W.range;
  if(hit||expired){const pos=p.clone();
   if(W.splash){boom(pos,hit?3:1.5,0xff7700);const targets=b.owner==='p'?E:[P];
    if(hitU)hurt(hitU,b.dmg,pos);for(const u of targets){if(u===hitU)continue;const dd=u.g.position.clone().setY(u.g.position.y+2.5).distanceTo(pos);if(dd<W.splash)hurt(u,b.dmg*.5*(1-dd/W.splash),pos);}}
   else if(hit){if(hitU)hurt(hitU,b.dmg*Math.max(.5,mult),pos);boom(pos,W===CFG.weapons.railgun?1.2:.5,W===CFG.weapons.railgun?0x80e8ff:0xffdd55);sparks(pos);}
   S.remove(b.m);B.splice(i,1);}}
 for(let i=E.length-1;i>=0;i--)if(E[i].hp<=0){const p=E[i].g.position.clone();p.y+=3;boom(p,6);boom(p.clone().setY(p.y+2),4,0x444444);S.remove(E[i].g);if(P.lockTgt===E[i])P.lockTgt=null;E.splice(i,1);}
 if(P.hp<=0){boom(pp.clone().setY(pp.y+3),6);P.hp=0;end(false);}else if(!E.length)end(true);
 hud();}
function updFx(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt/f.life;f.v.y+=f.g*dt;f.m.position.addScaledVector(f.v,dt);if(f.grow)f.m.scale.setScalar(f.s*(.2+f.t*f.grow));else f.m.scale.setScalar(f.s*(1-f.t));f.m.material.opacity=f.op*(1-f.t);if(f.t>=1){S.remove(f.m);f.m.material.dispose();FX.splice(i,1);}}}
// lock-on: enemy nearest the crosshair, within cone, range and line of sight
const lockEl=$('lock'),scr=new THREE.Vector3();
function updateLock(dt){const W=P.W;if(!W.homing){lockEl.style.display='none';return;}
 let best=null,bd=W.lockCone;const eye=P.g.position.clone();eye.y+=3.3;
 for(const e of E){scr.copy(e.g.position);scr.y+=3;const dist=scr.distanceTo(eye);if(dist>W.range)continue;scr.project(C);if(scr.z>1)continue;const d=Math.hypot(scr.x-AIMNDC.x,(scr.y-AIMNDC.y)*.7);if(d<bd&&los(eye,e.g.position.clone().setY(e.g.position.y+3.3))){bd=d;best=e;}}
 if(best!==P.lockTgt){P.lockTgt=best;P.lockT=0;}else if(best)P.lockT+=dt;
 if(best){scr.copy(best.g.position);scr.y+=3;scr.project(C);lockEl.style.display='flex';lockEl.style.left=((scr.x+1)/2*innerWidth)+'px';lockEl.style.top=((1-scr.y)/2*innerHeight)+'px';
  const f=Math.min(1,P.lockT/W.lockTime);const locked=f>=1;lockEl.style.background=`conic-gradient(${locked?'#f33a':'#fd4a'} ${f*360}deg,#0000 0)`;lockEl.style.borderColor=locked?'#f33':'#fd4';lockEl.textContent=locked?'LOCKED':'';}
 else lockEl.style.display='none';}
// shots follow the torso heading (yaw) with vertical aim from the crosshair target
function torsoDir(f,pt){const d=pt.clone().sub(f),h=Math.hypot(d.x,d.z);return new THREE.Vector3(Math.sin(P.tYaw)*h,d.y,Math.cos(P.tYaw)*h).normalize();}
const camRay=new THREE.Raycaster(),cO=new THREE.Vector3(),cD=new THREE.Vector3();
function cam(){if(!P)return;const K=CFG.cam,p=P.g.position;const b=new THREE.Vector3(-Math.sin(P.yaw),0,-Math.cos(P.yaw)),r=new THREE.Vector3(-b.z,0,b.x);
 cO.set(p.x,p.y+K.height,p.z);const want=new THREE.Vector3(p.x+b.x*K.dist-r.x*K.side,p.y+K.height+P.pitch*K.pitchLift,p.z+b.z*K.dist-r.z*K.side);
 cD.copy(want).sub(cO);const L=cD.length();cD.normalize();camRay.set(cO,cD);camRay.far=L;const h=camRay.intersectObjects(obstMeshes,false)[0];
 if(h)want.copy(cO).addScaledVector(cD,Math.max(1.2,h.distance-0.4));
 C.position.copy(want);C.lookAt(p.x-b.x*K.lookAhead-r.x*K.side,p.y+3.5-P.pitch*12,p.z-b.z*K.lookAhead-r.z*K.side);}
// ---------- HUD ----------
const hpf=$('hpf'),info=$('info'),bMG=$('bMG'),bAB=$('bAB'),gunBar=$('gunf'),abBar=$('abf'),rng=$('rng');let hudN=0;
function manualReload(){if(P&&mode==='play'&&!P.reload&&P.ammo<P.W.mag)P.reload=P.W.reload;}
function ring(el,frac,col){el.style.background=`conic-gradient(${col} ${frac*360}deg, #0006 0)`;}
function hud(){const W=P.W,T=P.T;hpf.style.width=(P.hp/P.max*100)+'%';
 const regen=T.regen&&clock-P.lastHit>T.regen.delay&&P.hp<P.max;hpf.style.background=regen?'linear-gradient(#8fa,#2c6)':'linear-gradient(#5f5,#2a2)';
 info.innerHTML=`HP ${Math.ceil(P.hp)}/${P.max} ${regen?'<b style="color:#6f9">+ REGEN</b>':''} &nbsp; Enemies: ${E.length}`;
 if(P.reload){const f=1-P.reload/W.reload;gunBar.style.width=f*100+'%';gunBar.style.background='#fa4';$('gunt').textContent=`${W.name}: RELOADING ${P.reload.toFixed(1)}s`;ring(bMG,f,'#fa48');bMG.textContent='RELOAD';}
 else{gunBar.style.width=P.ammo/W.mag*100+'%';gunBar.style.background='#ff6';$('gunt').textContent=`${W.name} ${P.ammo}/${W.mag}`;ring(bMG,P.ammo/W.mag,'#f448');bMG.textContent=P.ammo;}
 let af=1,at='',ac='#6cf';
 if(T.shield){if(P.shieldOn){af=Math.min(P.shieldT/T.shield.dur,P.shieldHP/T.shield.hp);at=`SHIELD UP ${Math.ceil(P.shieldHP)} HP · ${P.shieldT.toFixed(1)}s`;}else if(P.abCd>0){af=1-P.abCd/T.shield.cd;at=`SHIELD COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='SHIELD READY';}
 else if(T.jump){if(P.abCd>0){af=1-P.abCd/T.jump.cd;at=`JUMP COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='JUMP READY';}
 else{const t=clock-P.lastHit;af=P.hp>=P.max?1:Math.min(1,t/T.regen.delay);at=P.hp>=P.max?'REGEN: FULL':(af>=1?`REGENERATING +${T.regen.rate}/s`:`REGEN IN ${(T.regen.delay-t).toFixed(1)}s`);ac=af>=1?'#6f9':'#678';}
 abBar.style.width=af*100+'%';abBar.style.background=ac;$('abt').textContent=at;ring(bAB,af,ac+'8');
 if((hudN++&3)===0){const ap=playerAim(),d=ap.distanceTo(P.g.position);const inR=d<=W.range;rng.textContent=`${Math.round(d)}m / ${W.range}m${inR?'':' OUT OF RANGE'}`;rng.style.color=inR?'#8f8':'#f66';$('xh').style.borderColor=inR?'#fffa':'#f668';}}
// ---------- MENU ----------
const menu=$('menu'),mc=$('mc');let menuStep='title';
const statMax={hp:1300,speed:10};const bar=(l,v,t)=>`<div class="st"><span>${l}</span><div class="sb"><i style="width:${Math.max(4,v*100)}%"></i></div><em>${t}</em></div>`;
function preview(){if(P)S.remove(P.g);P=makeUnit('p',loadout.mech,loadout.weapon);P.g.position.set(0,0,48);P.tYaw=P.legYaw=Math.PI;P.yaw=Math.PI;P.pitch=.05;animLegs(P,0,0,0,0.016,1);}
function menuTick(dt){menuA+=dt*.35;if(!P)return;const p=P.g.position;P.tYaw=P.legYaw=Math.PI+Math.sin(menuA*.8)*.6;P.spin=P.W.spin?1:0;animLegs(P,0,0,0,dt,1);
 const a=Math.PI*0.75+menuA*0.3;const cx=p.x+Math.sin(a)*9,cz=p.z+Math.cos(a)*9;C.position.set(cx,4.5,cz);
 const lx=-Math.cos(a),lz=Math.sin(a);const side=innerWidth>700?2.8:0;C.lookAt(p.x+lx*side,3,p.z+lz*side);}
function renderMenu(){const Ms=CFG.mechs,Ws=CFG.weapons;let h='';
 if(menuStep==='title'){h=`<h1>MECH ARENA</h1><p class="sub">Choose your mech and weapon, then deploy.</p>
  <button class="big" data-go="mech">PLAY</button><button class="big alt" data-go="deploy">QUICK DEPLOY<br><small>${Ms[loadout.mech].name} + ${Ws[loadout.weapon].name}</small></button>`;}
 else if(menuStep==='mech'){h=`<h2>1 · SELECT MECH</h2><div class="cards">`+Object.entries(Ms).map(([k,m])=>`<div class="card ${k===loadout.mech?'sel':''}" data-mech="${k}"><div class="sw" style="background:#${m.color.toString(16).padStart(6,'0')}"></div><b>${m.name}</b><small>${m.ability}</small></div>`).join('')+`</div>`;
  const m=Ms[loadout.mech];const ab=m.shield?`${m.shield.hp} HP / ${m.shield.dur}s, ${m.shield.cd}s cooldown`:m.jump?`${m.jump.cd}s cooldown`:`+${m.regen.rate} HP/s after ${m.regen.delay}s`;
  h+=`<div class="det"><h3>${m.name} <small>— ${m.ability}</small></h3>${bar('ARMOR',m.hp/statMax.hp,m.hp)}${bar('SPEED',m.speed/statMax.speed,m.speed)}<p>${m.desc}</p><p class="ab">Ability: ${ab}</p></div>
  <div class="row"><button data-go="title">BACK</button><button class="go" data-go="weapon">NEXT ▶</button></div>`;}
 else{h=`<h2>2 · SELECT WEAPON</h2><div class="cards">`+Object.entries(Ws).map(([k,w])=>`<div class="card ${k===loadout.weapon?'sel':''}" data-wpn="${k}"><div class="wi">${k==='minigun'?'⁂':k==='railgun'?'━':'➹'}</div><b>${w.name}</b></div>`).join('')+`</div>`;
  const w=Ws[loadout.weapon];const rate=1/w.interval,dps=w.dmg*rate;
  h+=`<div class="det"><h3>${w.name}</h3>${bar('DAMAGE',w.dmg/130,w.dmg+' / hit')}${bar('FIRE RATE',Math.min(1,rate/22),rate.toFixed(1)+' /s')}${bar('RANGE',w.range/110,w.range+' m')}${bar('DPS',dps/180,Math.round(dps))}
  <p>${w.desc}</p><p class="ab">Magazine ${w.mag} · reload ${w.reload}s${w.homing?` · lock ${w.lockTime}s · splash ${w.splash}m`:''}</p></div>
  <div class="row"><button data-go="mech">◀ BACK</button><button class="go" data-go="deploy">DEPLOY</button></div>`;}
 mc.innerHTML=h;}
function goMenu(){clearWorld();mode='menu';menuStep='title';preview();renderMenu();showUI();}
function showUI(){menu.style.display=mode==='menu'?'flex':'none';$('hud').style.display=mode==='play'?'block':'none';$('msg').style.display=mode==='over'?'flex':'none';
 const t=TOUCH&&mode==='play'?'':'none';for(const id of['joy','bMG','bAB','bRL'])$(id).style.display=t;$('hint').style.display=TOUCH?'none':'';
 if(mode==='play'){bAB.textContent=P.T.ability;bAB.classList.toggle('passive',!!P.T.regen);}}
function menuClick(e){const el=e.target.closest('[data-go],[data-mech],[data-wpn]');if(!el)return;
 if(el.dataset.mech){loadout.mech=el.dataset.mech;saveLoadout();preview();}
 if(el.dataset.wpn){loadout.weapon=el.dataset.wpn;saveLoadout();preview();}
 if(el.dataset.go){if(el.dataset.go==='deploy'){saveLoadout();newGame();return;}menuStep=el.dataset.go;}
 renderMenu();}
menu.addEventListener('click',menuClick);
$('again').addEventListener('click',()=>newGame());$('tomenu').addEventListener('click',()=>goMenu());
goMenu();requestAnimationFrame(loop);
window.__game={hurt,get E(){return E},get P(){return P},get B(){return B},get mode(){return mode},ability:()=>ability(P),newGame,goMenu,get loadout(){return loadout},setLoadout:(m,w)=>{loadout={mech:m,weapon:w};}};
