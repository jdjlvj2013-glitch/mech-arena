import * as THREE from './three.module.js';
// ======================= CONFIG (tune here) =======================
const CFG={
 cam:{dist:7,height:5.4,side:2.2,lookAhead:12,aimMaxYaw:0.6,aimMaxPitch:0.5,aimTurn:20,pitchLift:5,shakeStep:0.06,shakeLand:0.25,shakeHit:0.12,shakeDecay:7},
 gravity:26, legTurn:6,
 // mass/inertia: velocity ramps toward input (m/s^2); torso is a damped spring (slight overshoot then settle)
 move:{accel:16,decel:20,heavyMul:0.75,torsoK:140,torsoC:17,aiTorsoK:60,aiTorsoC:13,staggerSlow:0.35},
 // walk: world-planted feet with 2-bone IK; step length/timing matched to speed
 gait:{pelvis:2.05,stride:[0.9,1.9],strideK:0.17,stepMin:0.17,stepMax:0.5,lift:0.45,settle:0.3,sway:0.14,dip:0.12,crouchJump:0.18,crouchDepth:0.7},
 fx:{debris:8,smokeWreck:0.35,maxFx:260},
 mechs:{
  guardian:{name:'Guardian',hp:1300,speed:7.5,mass:1.3,color:0x3a6fd5,enemyColor:0xa8322a,
   ability:'SHIELD',desc:'Heavy frame. Raise an energy shield that blocks all fire from the front. Moves at 50% speed while shielded.',
   shield:{hp:700,dur:6,cd:9,slow:0.5,unfold:0.3}},
  strider:{name:'Strider',hp:950,speed:10,mass:0.9,color:0x1f9a9a,enemyColor:0xc0452a,
   ability:'JUMP',desc:'Agile frame. Jump-jets launch you over cover and onto containers and platforms.',
   jump:{vel:15,cd:4,airSpeed:1.25}},
  mender:{name:'Mender',hp:850,speed:9,mass:1,color:0x3d8a3a,enemyColor:0x9a2f45,
   ability:'REGEN',desc:'Repair frame. After 3s without taking damage, auto-repairs 60 HP per second.',
   regen:{delay:3,rate:60}},
 },
 weapons:{
  minigun:{name:'Minigun',desc:'Huge fire rate, low damage per bullet. Spins up. Damage falls off past 60% range.',
   dmg:8,interval:0.045,spin:0.5,range:45,falloff:0.6,mag:150,reload:3.0,spread:0.012,speed:160,aiBurst:20,kick:0.12,jolt:0.004},
  railgun:{name:'Railgun',desc:'Slow, precise, hits very hard at long range.',
   dmg:130,interval:1.1,range:110,mag:6,reload:3.5,spread:0,speed:240,hitscan:true,aiBurst:1,kick:0.6,jolt:0.06},
  hornet:{name:'Hornet Lock-On',desc:'Hold the crosshair on an enemy in range to lock, then fire homing rockets. Unlocked shots fly straight.',
   dmg:65,interval:0.28,range:55,mag:8,reload:4.0,spread:0.01,speed:42,splash:3.5,homing:true,lockTime:0.9,lockCone:0.2,turnRate:3.2,aiBurst:2,kick:0.3,jolt:0.02},
 },
 hitbox:{hx:1.5,y0:0.2,y1:5.4,shield:2.6},
 hitReact:{flinch:0.0012,maxFlinch:0.25,staggerDmg:60,staggerT:0.35},
 // AI skill profiles. team modes use 'normal' for both sides; duel uses the chosen difficulty for the enemy
 diff:{
  easy:  {name:'Easy',  hpMul:0.6, dmgMul:0.45,fireMul:1.7,spread:0.11, react:1.0,lead:0,  think:[1.6,2.6],ability:0.15,cover:false,strafe:0,  speedMul:0.7, burstPause:[1.6,3.0]},
  normal:{name:'Normal',hpMul:0.8, dmgMul:0.6, fireMul:1.4,spread:0.055,react:0.55,lead:0.5,think:[1.0,2.0],ability:0.5, cover:false,strafe:0.5,speedMul:0.8, burstPause:[1.0,2.2]},
  hard:  {name:'Hard',  hpMul:1.0, dmgMul:0.75,fireMul:1.15,spread:0.025,react:0.22,lead:1.0,think:[0.5,1.1],ability:1,  cover:true, strafe:1,  speedMul:0.95,burstPause:[0.5,1.2]},
 },
 allyProfile:'normal', enemyProfile:'normal',
 modes:{team:{name:'Team Battle',sub:'3 v 3',desc:'You + 2 AI allies vs 3 AI mechs. Destroy the whole enemy team.'},
  duel:{name:'Duel',sub:'1 v 1',desc:'One enemy mech. Pick a difficulty: higher levels aim better, react faster, use cover and abilities.'},
  base:{name:'Capture the Base',sub:'3 v 3',desc:'Stand in the enemy base with no defenders to capture it. Win by capture or by destroying all enemies. Defend your own base!'}},
 capture:{radius:7,time:12,perExtra:0.5,decay:0.35,bases:{b:[0,47],r:[0,-47]}},
 gfx:{high:{pixelRatio:1.5,shadows:true,shadowMap:1024},low:{pixelRatio:1,shadows:false,shadowMap:512},autoFallbackFps:26,autoWindow:3},
};
// ==================================================================
const R=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio,1.5));R.setSize(innerWidth,innerHeight);
R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;R.outputColorSpace=THREE.SRGBColorSpace;
R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.prepend(R.domElement);
const S=new THREE.Scene();
const C=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,0.1,220);
addEventListener('resize',()=>{R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix();});
S.add(new THREE.HemisphereLight(0xcfe0ff,0x5a5040,0.7));
const dl=new THREE.DirectionalLight(0xfff0d8,2.6);dl.position.set(30,50,20);dl.castShadow=true;
{const sc=dl.shadow.camera;sc.left=sc.bottom=-28;sc.right=sc.top=28;sc.near=1;sc.far=140;dl.shadow.mapSize.set(1024,1024);dl.shadow.bias=-0.0008;dl.shadow.normalBias=0.04;}
S.add(dl,dl.target);
const SUN=new THREE.Vector3(30,50,20).normalize();
const A=60;// half size
function tex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);}return t;}
// gradient sky
const skyT=tex(8,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1e3a68');gr.addColorStop(.35,'#4f7db5');gr.addColorStop(.5,'#a9c3dc');gr.addColorStop(.53,'#e8dcc0');gr.addColorStop(1,'#6b6352');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(200,24,12),new THREE.MeshBasicMaterial({map:skyT,side:THREE.BackSide,fog:false,depthWrite:false}));S.add(skyDome);
{const sun=new THREE.Mesh(new THREE.SphereGeometry(6,12,8),new THREE.MeshBasicMaterial({color:0xfff4d0,fog:false}));sun.position.set(30,50,20).normalize().multiplyScalar(190);skyDome.add(sun);}
// environment map for metal reflections (PMREM of the sky dome)
{const es=new THREE.Scene();es.add(skyDome.clone());const pm=new THREE.PMREMGenerator(R);S.environment=pm.fromScene(es,0.04).texture;pm.dispose();}
S.background=new THREE.Color(0x8fb4d8);
S.fog=new THREE.Fog(0xb9bfc0,50,150);
// procedural ground: concrete tiles + dirt noise + painted lines
const groundT=tex(256,256,(g,w,h)=>{g.fillStyle='#6d6f5e';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(${Math.random()<.5?'40,40,30':'150,145,120'},${Math.random()*.15})`;const r=Math.random()*10;g.fillRect(Math.random()*w,Math.random()*h,r,r);}
 g.strokeStyle='rgba(30,30,25,.55)';g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke();}},12);
const groundR=tex(128,128,(g,w,h)=>{g.fillStyle='#ddd';g.fillRect(0,0,w,h);for(let i=0;i<500;i++){const v=150+Math.random()*105|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(Math.random()*w,Math.random()*h,3+Math.random()*8,3+Math.random()*8);}},24);groundR.colorSpace=THREE.NoColorSpace;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(A*2,A*2),new THREE.MeshStandardMaterial({map:groundT,roughnessMap:groundR,roughness:1,metalness:0}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;S.add(ground);
const LEG={hipY:2.5,L1:1.2,L2:1.2,foot:.25,idleKnee:.25,strideRate:1.5};
const jointG=new THREE.SphereGeometry(.34,8,6),pistonG=new THREE.CylinderGeometry(.09,.09,1,6);
// mech metal: PBR with procedural panel lines + grime (map) and roughness variation
const panelT=tex(128,128,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let i=0;i<260;i++){g.fillStyle=`rgba(80,70,60,${Math.random()*.12})`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*10,1+Math.random()*4);}
 g.strokeStyle='rgba(20,20,20,.55)';g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);g.beginPath();g.moveTo(0,h*.55);g.lineTo(w,h*.55);g.moveTo(w*.4,0);g.lineTo(w*.4,h*.55);g.stroke();
 g.fillStyle='rgba(30,30,30,.6)';for(const [x,y] of [[8,8],[w-8,8],[8,h-8],[w-8,h-8],[w*.4+6,10]]){g.beginPath();g.arc(x,y,2.2,0,7);g.fill();}
 const gr=g.createLinearGradient(0,h*.6,0,h);gr.addColorStop(0,'rgba(90,60,30,0)');gr.addColorStop(1,'rgba(90,60,30,.35)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const panelR=tex(64,64,(g,w,h)=>{g.fillStyle='#777';g.fillRect(0,0,w,h);for(let i=0;i<120;i++){const v=90+Math.random()*140|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*6,1+Math.random()*3);}});panelR.colorSpace=THREE.NoColorSpace;
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,map:panelT,roughnessMap:panelR,metalness:o.metal??0.6,roughness:o.rough??0.65,envMapIntensity:1,...(o.emissive?{emissive:o.emissive,emissiveIntensity:o.ei||1}:{})});
const antG=new THREE.CylinderGeometry(.04,.04,1.3,4),barrelG=new THREE.CylinderGeometry(.1,.1,1.4,6),tubeG=new THREE.CylinderGeometry(.13,.13,.15,6),flashG=new THREE.ConeGeometry(.35,1,6);
const _mc={};const MS={metal:M(0x9aa0a6),dark:M(0x111111),flash:new THREE.MeshBasicMaterial({color:0xffe080}),
 stripe:c=>_mc['s'+c]||(_mc['s'+c]=M(c===0x3a7bd5?0xf0f0f0:0x111111)),visor:c=>_mc['v'+c]||(_mc['v'+c]=new THREE.MeshBasicMaterial({color:c===0x3a7bd5?0x40e0ff:0xff4020}))};
const boxG=new THREE.BoxGeometry(1,1,1);
const obst=[];// {x,z,hx,hz,h}
const winT=tex(64,64,(g,w,h)=>{g.fillStyle='#8a8478';g.fillRect(0,0,w,h);for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.fillStyle=Math.random()<.3?'#ffd98a':'#1d2630';g.fillRect(x*32+8,y*32+8,16,14);}g.fillStyle='#6a655c';g.fillRect(0,30,64,3);});
const crateT=tex(64,64,(g,w,h)=>{g.fillStyle='#8b6a3c';g.fillRect(0,0,w,h);g.strokeStyle='#5a4220';g.lineWidth=6;g.strokeRect(3,3,58,58);g.beginPath();g.moveTo(0,0);g.lineTo(64,64);g.stroke();});
const contT=tex(128,64,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=8){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,0,3,h);}});
const matCache={};function mat(c,map){const key=c+(map?map.uuid:'');return matCache[key]||(matCache[key]=new THREE.MeshStandardMaterial({color:c,map,roughness:0.85,metalness:0.05}));}
function solid(x,z,w,d,h,material,ry=0){const m=new THREE.Mesh(boxG,material);m.scale.set(w,h,d);m.position.set(x,h/2,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=true;S.add(m);if(ry){const t=w;if(Math.abs(Math.sin(ry))>.7){w=d;d=t;}}obst.push({x,z,hx:w/2,hz:d/2,h,m});return m;}
function wall(x,z,w,d,h,c=0x8a8a80){return solid(x,z,w,d,h,mat(c));}
function building(x,z,w,d,h){const t=winT.clone();t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.round(w/3),Math.round(h/3));solid(x,z,w,d,h,new THREE.MeshStandardMaterial({map:t,roughness:.8,metalness:.1}));const r=new THREE.Mesh(boxG,mat(0x4a4a48));r.scale.set(w+.4,.4,d+.4);r.position.set(x,h+.2,z);S.add(r);}
function ruin(x,z,len,horiz){const n=4,seg=len/n;for(let i=0;i<n;i++){const h=1.5+Math.random()*3.5,o=-len/2+seg*(i+.5);horiz?solid(x+o,z,seg,1.2,h,mat(0x9a8f78)):solid(x,z+o,1.2,seg,h,mat(0x9a8f78));}}
function crate(x,z,s=2){solid(x,z,s,s,s,mat(0xffffff,crateT));}
function container(x,z,horiz,c){horiz?solid(x,z,8,3,3,mat(c,contT)):solid(x,z,3,8,3,mat(c,contT));}
function pillar(x,z){const m=new THREE.Mesh(pillarG,mat(0x9a9890));m.position.set(x,4,z);m.castShadow=m.receiveShadow=true;S.add(m);obst.push({x,z,hx:.9,hz:.9,h:8,m});}
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
// ---------- mech builder: team 'b'|'r', type key, weapon key ----------
const TMK={b:'p',r:'e'};
function mech(team,type,wpn){const T=CFG.mechs[type];const col=team==='b'?T.color:T.enemyColor;const g=new THREE.Group(),m=M(col,{metal:.45,rough:.55}),dk=M(0x2a2a2c,{metal:.7,rough:.5}),tm=TM[TMK[team]];
 const lower=new THREE.Group();g.add(lower);const legs=[],jm=M(0x8a8d90,{metal:.9,rough:.3}),rod=M(0xd0d4d8,{metal:1,rough:.15});
 for(const s of[-1,1]){const hipJ=new THREE.Group();hipJ.rotation.order='ZXY';hipJ.position.set(s*0.85,LEG.hipY,0);hipJ.add(new THREE.Mesh(jointG,jm));
  const th=new THREE.Mesh(boxG,dk);th.scale.set(.45,LEG.L1,.55);th.position.y=-LEG.L1/2;hipJ.add(th);
  const thA=new THREE.Mesh(boxG,m);thA.scale.set(.55,LEG.L1*.6,.2);thA.position.set(0,-LEG.L1*.4,.33);hipJ.add(thA);
  // hydraulic piston: cylinder on thigh, rod scaled with knee angle
  const cyl=new THREE.Mesh(pistonG,jm);cyl.scale.set(1.6,.55,1.6);cyl.position.set(s*.32,-LEG.L1*.3,-.38);hipJ.add(cyl);
  const prod=new THREE.Mesh(pistonG,rod);prod.position.set(s*.32,-LEG.L1*.75,-.38);hipJ.add(prod);
  const knee=new THREE.Group();knee.position.y=-LEG.L1;knee.add(new THREE.Mesh(jointG,jm));hipJ.add(knee);
  const sh=new THREE.Mesh(boxG,m);sh.scale.set(.55,LEG.L2,.65);sh.position.y=-LEG.L2/2;knee.add(sh);
  const pis2=new THREE.Mesh(pistonG,rod);pis2.position.set(0,-LEG.L2/2,.4);knee.add(pis2);
  const ank=new THREE.Group();ank.rotation.order='ZXY';ank.position.y=-LEG.L2;const aj=new THREE.Mesh(jointG,jm);aj.scale.setScalar(.8);ank.add(aj);knee.add(ank);
  const ft=new THREE.Mesh(boxG,dk);ft.scale.set(.8,LEG.foot,1.4);ft.position.set(0,-LEG.foot/2-.1,.2);ank.add(ft);
  const toe=new THREE.Mesh(boxG,m);toe.scale.set(.82,.12,.4);toe.position.set(0,-.05,.75);ank.add(toe);
  lower.add(hipJ);legs.push({hip:hipJ,knee,ank,prod,s,foot:new THREE.Vector3(),from:new THREE.Vector3(),to:new THREE.Vector3(),sw:-1,dur:.3});}
 const hip=new THREE.Mesh(boxG,dk);hip.scale.set(2,.5,1);hip.position.y=LEG.hipY;lower.add(hip);
 const top=new THREE.Group();top.position.y=2.6;g.add(top);
 const add=(par,geo,mt,sx,sy,sz,x,y,z)=>{const o=new THREE.Mesh(geo,mt);o.scale.set(sx,sy,sz);o.position.set(x,y,z);par.add(o);return o;};
 const tw={guardian:[2.7,1.7,1.9],strider:[1.9,1.3,1.5],mender:[2.2,1.5,1.6]}[type];
 add(top,boxG,m,tw[0],tw[1],tw[2],0,.8,0);
 add(top,boxG,dk,tw[0]*.7,.9,.25,0,.75,tw[2]/2+.05);
 add(top,boxG,tm.stripe,tw[0]+.05,.18,tw[2]+.05,0,.8+tw[1]/2-.2,0);
 add(top,boxG,dk,1.05,.55,.45,0,.8+tw[1]/2+.25,.55);add(top,boxG,tm.visor,.85,.18,.05,0,.8+tw[1]/2+.3,.79);
 // emissive running lights + vents
 const lm=team==='b'?LIGHT_B:LIGHT_R;for(const s of[-1,1])add(top,boxG,lm,.12,.12,.06,s*tw[0]*.36,.8+tw[1]*.25,tw[2]/2+.2);
 const vent=add(top,boxG,dk,tw[0]*.5,.15,.5,0,.8+tw[1]/2+.02,-tw[2]*.3);
 // shoulder pads on lag pivots (secondary motion)
 const pads=[];const pad=type==='guardian'?[1.2,.55,1.8]:[.8,.35,1.3];for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*(tw[0]/2+.1),1.45,0);top.add(pv);const sp=add(pv,boxG,m,...pad,s*.15,.15,0);sp.rotation.z=s*-.3;pads.push(pv);}
 const antP=new THREE.Group();antP.position.set(.7,1.75,-.5);top.add(antP);add(antP,antG,MS.metal,1,1,1,0,.65,0);add(antP,jointG,tm.visor,.25,.25,.25,0,1.3,0);
 let shield=null,jets=[];
 if(type==='guardian'){shield=add(top,shieldG,shieldMat,1,1,1,0,.8,0);shield.visible=false;add(top,boxG,MS.metal,.4,1.2,.4,-tw[0]/2-.1,.4,.6);}
 if(type==='strider'){for(const s of[-1,1]){add(top,thrG,MS.metal,1,1,1,s*.55,.7,-1.05);const j=add(top,flashG,jetMat,1.2,1.4,1.2,s*.55,-.3,-1.05);j.rotation.x=Math.PI;j.visible=false;jets.push(j);}}
 if(type==='mender'){add(top,coreG,coreMat,1,1,1,0,.75,.95);add(top,ringG,coreMat,1,1,1,0,.75,.95);}
 const guns=[],flash=[],spinners=[],kickers=[];const mz={minigun:2.0,railgun:3.0,hornet:.9}[wpn];
 const coil=wpn==='railgun'?new THREE.MeshStandardMaterial({color:0x2a5070,emissive:0x50c0ff,emissiveIntensity:.2,metalness:.5,roughness:.3}):null;
 for(const s of[-1,1]){const pv=new THREE.Group();pv.position.set(s*(tw[0]/2+.35),.7,0);const kb=new THREE.Group();pv.add(kb);kickers.push(kb);
  if(wpn==='minigun'){add(kb,boxG,dk,.6,.6,.9,0,0,.1);const sp=new THREE.Group();sp.position.z=1.2;kb.add(sp);spinners.push(sp);
   for(let k=0;k<3;k++){const a=k*2.09,b=add(sp,barrelG,MS.metal,.6,1.1,.6,Math.cos(a)*.15,Math.sin(a)*.15,0);b.rotation.x=Math.PI/2;}}
  else if(wpn==='railgun'){add(kb,boxG,dk,.45,.6,1.3,0,0,.1);const b=add(kb,barrelG,MS.metal,1.3,2,1.3,0,0,1.7);b.rotation.x=Math.PI/2;for(const z of[1.1,1.8])add(kb,coilG,coil,1,1,1,0,0,z);}
  else{add(kb,boxG,M(0x665544),.85,.85,1.1,0,.1,.1);for(let r=0;r<2;r++)for(let c=0;c<2;c++){const tb=add(kb,tubeG,MS.dark,1,1,1,-.2+c*.4,-.1+r*.4,.68);tb.rotation.x=Math.PI/2;}}
  const fl=add(pv,flashG,MS.flash,1,1,1,0,0,mz+.4);fl.rotation.x=-Math.PI/2;fl.visible=false;flash.push(fl);top.add(pv);guns.push(pv);}
 g.traverse(o=>{if(o.isMesh&&o.material!==shieldMat&&o.material!==jetMat&&o.material!==MS.flash)o.castShadow=true;});
 S.add(g);return{g,lower,legs,top,guns,flash,spinners,kickers,shield,jets,pads,antP,vent,coil,mz,mats:[m,dk],flashT:0,smokeT:0,legYaw:0,tYaw:0,tYawV:0,gp:0};}
const LIGHT_B=new THREE.MeshBasicMaterial({color:0x60d0ff}),LIGHT_R=new THREE.MeshBasicMaterial({color:0xff5040});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function turn(cur,tgt,rate,dt){const d=wrap(tgt-cur);return cur+Math.sign(d)*Math.min(Math.abs(d),rate*dt);}
// ---------- locomotion: inertia, world-planted feet with 2-bone IK, weight shift, secondary motion ----------
const _v=new THREE.Vector3(),_w=new THREE.Vector3(),_h=new THREE.Vector3();
const L1=LEG.L1,L2=LEG.L2;
function homeOf(u,L,out){const p=u.g.position,ly=u.legYaw;return out.set(p.x+Math.cos(ly)*L.s*0.9+Math.sin(ly)*0.15,p.y,p.z-Math.sin(ly)*L.s*0.9+Math.cos(ly)*0.15);}
function initFeet(u){for(const L of u.legs){homeOf(u,L,L.foot);L.sw=-1;}}
function ik(u,L){// ankle target in lower-local space -> hip roll/pitch + knee bend, ankle keeps foot flat
 _v.set(L.foot.x,L.foot.y+LEG.foot+0.1,L.foot.z);u.lower.worldToLocal(_v);_v.sub(L.hip.position);
 const r=Math.atan2(_v.x,-_v.y),a=Math.hypot(_v.x,_v.y),d=Math.min(L1+L2-0.002,Math.max(0.4,Math.hypot(a,_v.z)));
 const th=Math.atan2(-_v.z,a),be=Math.acos(Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))),k=Math.PI-Math.acos(Math.max(-1,Math.min(1,(L1*L1+L2*L2-d*d)/(2*L1*L2))));
 L.hip.rotation.set(th-be,0,r);L.knee.rotation.x=k;L.ank.rotation.set(-(th-be+k),0,-r);
 L.prod.scale.y=0.55+0.55*k;L.prod.position.y=-LEG.L1*0.55-L.prod.scale.y*0.25;}
function animMech(u,dt){const G=CFG.gait,p=u.g.position,v=u.vel,sp=Math.hypot(v.x,v.z);
 if(u.dying!==undefined)return deathAnim(u,dt);
 // legs face movement (walk backwards if moving away from torso)
 if(sp>0.4){let my=Math.atan2(v.x,v.z);if(Math.abs(wrap(my-u.tYaw))>1.9)my+=Math.PI;u.legYaw=turn(u.legYaw,my,CFG.legTurn/(u.T.mass||1),dt);}
 const stride=Math.min(G.stride[1],G.stride[0]+sp*G.strideK),stepT=Math.min(G.stepMax,Math.max(G.stepMin,stride/Math.max(sp,0.01)))*(u.T.mass||1)**0.5;
 if(u.air){for(const L of u.legs){L.hip.rotation.set(-.5,0,L.s*.08);L.knee.rotation.x=1.1;L.ank.rotation.set(-.6,0,0);L.sw=-1;}u.wasAir=true;}
 else{if(u.wasAir){u.wasAir=false;initFeet(u);}
  let sw=u.legs.find(L=>L.sw>=0);
  if(!sw){let best=null,bd=0;for(const L of u.legs){homeOf(u,L,_h).addScaledVector(v,stepT*0.5);const d=Math.hypot(L.foot.x-_h.x,L.foot.z-_h.z);
    const need=sp>0.4?stride*0.5:G.settle;const pref=L===u.lastLeg?0.85:1;if(d>need&&d*pref>bd){bd=d*pref;best=L;}}
   if(best){best.sw=0;best.from.copy(best.foot);best.dur=stepT;u.lastLeg=best;sw=best;}}
  if(sw){sw.sw=Math.min(1,sw.sw+dt/sw.dur);homeOf(u,sw,sw.to).addScaledVector(v,(1-sw.sw)*sw.dur+stepT*0.5);
   const e=sw.sw*sw.sw*(3-2*sw.sw);sw.foot.lerpVectors(sw.from,sw.to,e);sw.foot.y=p.y+Math.sin(Math.PI*sw.sw)*G.lift*Math.min(1,0.4+sp/6);
   if(sw.sw>=1){sw.sw=-1;sw.foot.y=p.y;u.dip=1;footstep(u,sw.foot);}}
  for(const L of u.legs)if(L.sw<0)L.foot.y=p.y;}
 // weight shift over the planted foot, bob dip at footfall, crouch (jump wind-up / landing)
 const st=u.legs.find(L=>L.sw<0&&u.legs.some(o=>o!==L&&o.sw>=0));const swayT=st?st.s*G.sway*Math.min(1,0.3+sp/4):0;
 u.sway+=(swayT-u.sway)*Math.min(1,dt*6);u.dip=Math.max(0,u.dip-dt*5);
 const cT=u.jumpWind>0?1:0;u.crouch+=(cT-u.crouch)*Math.min(1,dt*(cT?14:4));
 const off=G.pelvis-LEG.hipY-u.crouch*G.crouchDepth-u.dip*G.dip*(u.T.mass||1)-(u.stagT>0?0.2:0);
 const rx=Math.cos(u.legYaw)*u.sway,rz=-Math.sin(u.legYaw)*u.sway;
 u.lower.position.set(rx,off,rz);u.top.position.set(rx*.8,2.6+off,rz*.8);
 u.lower.rotation.set(0,u.legYaw,-u.sway*0.25);
 u.lower.updateMatrixWorld(true);if(!u.air)for(const L of u.legs)ik(u,L);
 // torso: yaw from spring, recoil jolt + hit flinch + stagger lurch
 u.jolt=Math.max(0,u.jolt-dt*4*Math.max(.1,u.jolt*10));u.fl.x-=u.fl.x*Math.min(1,dt*7);u.fl.z-=u.fl.z*Math.min(1,dt*7);
 u.top.rotation.order='YXZ';u.top.rotation.set(-u.jolt+u.fl.x+u.crouch*0.12,u.tYaw,u.fl.z-u.sway*0.15);
 // secondary: antenna + shoulder pads spring driven by body acceleration & torso spin
 const ca=Math.cos(u.tYaw),sa=Math.sin(u.tYaw),ax=u.acc.x*ca-u.acc.z*sa,az=u.acc.x*sa+u.acc.z*ca;
 u.jgV.x+=(-90*u.jg.x-7*u.jgV.x-ax*0.4-u.tYawV*1.5)*dt;u.jgV.z+=(-90*u.jg.z-7*u.jgV.z+az*0.4+u.dip*3)*dt;u.jg.x+=u.jgV.x*dt;u.jg.z+=u.jgV.z*dt;
 u.antP.rotation.set(u.jg.z*0.8,0,u.jg.x*0.8);for(const pd of u.pads)pd.rotation.set(u.jg.z*0.3,u.jg.x*0.25,0);
 // weapons: barrel kick-back, spin, railgun charge glow, flash
 for(let i=0;i<u.kickers.length;i++){u.kick[i]=Math.max(0,u.kick[i]-dt*u.kick[i]*12-dt*.2);u.kickers[i].position.z=-u.kick[i];}
 for(const s of u.spinners)s.rotation.z+=dt*35*(u.spin||0);
 if(u.coil){const ch=u.reload?0:Math.max(0,1-u.fireCd/u.W.interval);u.coil.emissiveIntensity=0.15+3*ch*ch;}
 if(u.ventT>0){u.ventT-=dt;if(Math.random()<.5){u.vent.getWorldPosition(_w);fx(_w,.5,0xdde4ea,{vy:3.5,grow:2.5,life:.8,op:.45});}}
 if(u.flashT>0){u.flashT-=dt;if(u.flashT<=0)u.flash.forEach(f=>f.visible=false);}
 for(const j of u.jets){j.visible=u.air&&u.vy>-4;j.scale.y=1.2+Math.random()*.8;}
 if(u.air&&u.vy>-4&&u.jets.length&&Math.random()<.6){u.jets[0].getWorldPosition(_w);fx(_w,.5,0xffaa55,{vy:-6,grow:2,life:.35,op:.7});}
 // shield unfold/retract
 if(u.shield){const t=u.shieldOn?1:0,r=1/u.T.shield.unfold;u.shA+=Math.sign(t-u.shA)*Math.min(Math.abs(t-u.shA),r*dt);u.shield.visible=u.shA>0.02;u.shield.scale.set(Math.max(.05,u.shA),0.25+0.75*u.shA,Math.max(.05,u.shA));}
 if(u.hp<u.max*.35){u.smokeT-=dt;if(u.smokeT<=0){u.smokeT=.15;u.top.getWorldPosition(_w);_w.y+=1.5;fx(_w,.6,0x333333,{vy:3,grow:2.5,life:1.4,op:.6});}}
 if(u.plate)updPlate(u);}
function footstep(u,f){if(FX.length<CFG.fx.maxFx*.8)fx(_w.set(f.x,f.y+.2,f.z),.9*(u.T.mass||1),0x9a927e,{grow:2.2,life:.5,op:.45});
 if(u===P){shake(CFG.cam.shakeStep*(u.T.mass||1));sfx('step');}}
function deathAnim(u,dt){const t=u.dying+=dt,f=Math.min(1,t/0.9);
 for(const L of u.legs){L.hip.rotation.set(-0.9*f,0,L.s*.25*f);L.knee.rotation.x=1.9*f;L.ank.rotation.set(-1.0*f,0,0);}
 u.lower.position.y=-1.15*f;u.top.position.y=2.6-1.3*f;u.top.rotation.set(0.5*f,u.tYaw,u.dieSide*0.35*f,'YXZ');
 if(t<0.9){if(Math.random()<.35){u.top.getWorldPosition(_w);sparks(_w.addScaledVector(rnd3(),1.2));}}
 else if(!u.wreck){u.wreck=true;u.top.getWorldPosition(_w);explode(_w.clone(),1.4);for(const m of u.mats){m.color.multiplyScalar(0.28);m.metalness=0.3;}
  for(const g of u.guns)g.rotation.x=0.6;if(u.plate)u.plate.visible=false;if(u.shield)u.shield.visible=false;u.jets.forEach(j=>j.visible=false);}
 else{u.smokeT-=dt;if(u.smokeT<=0){u.smokeT=CFG.fx.smokeWreck;u.top.getWorldPosition(_w);_w.y+=1;fx(_w,.9,0x2a2a2a,{vy:2.5,grow:3,life:2.2,op:.55});if(Math.random()<.15)sparks(_w,0xff9040);}}}
const rnd3=()=>new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5);
// ---------- state ----------
let P=null,U=[],B=[],FX=[],mode='menu',clock=0,endT=-1,result=null,SPEC=null,camYaw=0,shakeA=0;
const STATS={shots:0,hits:0,kills:0};
const inp={mx:0,mz:0,fire:false,keys:{}};
const foes=t=>U.filter(x=>x.alive&&x.team!==t),mates=t=>U.filter(x=>x.alive&&x.team===t);
const LS='mechArenaLoadout',LS2='mechArenaSettings';let loadout={mech:'guardian',weapon:'minigun'};try{const l=JSON.parse(localStorage.getItem(LS));if(l&&CFG.mechs[l.mech]&&CFG.weapons[l.weapon])loadout=l;}catch(e){}
let settings={mode:'team',diff:'normal',gfx:'high'};try{Object.assign(settings,JSON.parse(localStorage.getItem(LS2))||{});}catch(e){}
function saveLoadout(){try{localStorage.setItem(LS,JSON.stringify(loadout));localStorage.setItem(LS2,JSON.stringify(settings));}catch(e){}}
function makeUnit(team,type,wpn,prof){const T=CFG.mechs[type],W=CFG.weapons[wpn],pr=prof?CFG.diff[prof]:null;const u=mech(team,type,wpn);
 Object.assign(u,{team,type,wpn,T,W,prof:pr,alive:true,hp:T.hp*(pr?pr.hpMul:1),speed:T.speed*(pr?pr.speedMul:1),ammo:W.mag,reload:0,fireCd:0,spin:0,
  shieldOn:false,shA:0,shieldHP:T.shield?T.shield.hp:0,shieldT:0,abCd:0,vy:0,air:false,lastHit:-99,lockT:0,lockTgt:null,cd:1+Math.random()*2,burst:0,think:0,goal:null,
  vel:new THREE.Vector3(),acc:new THREE.Vector3(),jg:new THREE.Vector3(),jgV:new THREE.Vector3(),fl:new THREE.Vector3(),kick:[0,0],jolt:0,sway:0,dip:0,crouch:0,jumpWind:0,
  stagT:0,ventT:0,kills:0,seeT:0,strafeD:1,strafeT:0,scanT:0,tgt:null,dieSide:Math.random()<.5?-1:1,yaw:0,pitch:.05});u.max=u.hp;return u;}
// nameplates: team-colored name + hp bar (canvas sprite)
function makePlate(u,ally){const c=document.createElement('canvas');c.width=256;c.height=64;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,fog:false}));s.scale.set(3.4,.85,1);s.position.y=6.7;u.g.add(s);u.plate=s;u.pc=c;u.pt=t;u.ally=ally;u.plHp=-1;updPlate(u);}
function updPlate(u){const h=Math.ceil(u.hp/u.max*40);if(h===u.plHp)return;u.plHp=h;const g=u.pc.getContext('2d'),col=u.ally?'#4cc8ff':'#ff5544';g.clearRect(0,0,256,64);
 g.font='bold 24px system-ui,sans-serif';g.textAlign='center';g.lineWidth=4;g.strokeStyle='#000a';const n=(u.ally?'▲ ':'◆ ')+u.T.name;g.strokeText(n,128,26);g.fillStyle=col;g.fillText(n,128,26);
 g.fillStyle='#000a';g.fillRect(28,38,200,14);g.fillStyle=col;g.fillRect(30,40,196*u.hp/u.max,10);u.pt.needsUpdate=true;}
// ---------- bases (capture mode) ----------
const BASES={};
for(const [t,[x,z]] of Object.entries(CFG.capture.bases)){const col=t==='b'?0x40b0ff:0xff4a3a,gr=new THREE.Group();gr.position.set(x,0,z);S.add(gr);
 const ringM=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.7,depthWrite:false});const ring=new THREE.Mesh(new THREE.RingGeometry(CFG.capture.radius-.5,CFG.capture.radius,48),ringM);ring.rotation.x=-Math.PI/2;ring.position.y=.04;gr.add(ring);
 const fillM=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.12,depthWrite:false});const fill=new THREE.Mesh(new THREE.CircleGeometry(CFG.capture.radius-.5,48),fillM);fill.rotation.x=-Math.PI/2;fill.position.y=.03;gr.add(fill);
 const bm=new THREE.MeshStandardMaterial({color:0x333333,emissive:col,emissiveIntensity:1.5,metalness:.5,roughness:.4});const bc=new THREE.Mesh(new THREE.CylinderGeometry(.5,.8,1.2,8),M(0x555555));bc.position.y=.6;gr.add(bc);
 const beac=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,9,6),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.35,depthWrite:false}));beac.position.y=5.5;gr.add(beac);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,7,6),M(0xcccccc,{metal:1,rough:.2}));pole.position.set(1.2,3.5,0);gr.add(pole);
 const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.1),new THREE.MeshStandardMaterial({color:col,side:THREE.DoubleSide,emissive:col,emissiveIntensity:.3}));flag.position.set(2.1,6.4,0);gr.add(flag);
 const lamp=new THREE.Mesh(new THREE.SphereGeometry(.45,10,8),bm);lamp.position.y=1.4;gr.add(lamp);
 BASES[t]={team:t,x,z,g:gr,ringM,fillM,flag,bm,prog:0,state:''};}
function showBases(on){for(const b of Object.values(BASES)){b.g.visible=on;b.prog=0;b.state='';}}
function tickBases(dt){const K=CFG.capture;for(const b of Object.values(BASES)){const inZ=u=>u.alive&&!u.air&&Math.hypot(u.g.position.x-b.x,u.g.position.z-b.z)<K.radius;
 const att=U.filter(u=>u.team!==b.team&&inZ(u)).length,def=U.filter(u=>u.team===b.team&&inZ(u)).length;
 if(att&&!def){b.prog=Math.min(1,b.prog+dt/K.time*(1+K.perExtra*(att-1)));b.state='CAPTURING';}else if(att&&def)b.state='CONTESTED';else{b.prog=Math.max(0,b.prog-dt/K.time*K.decay);b.state=b.prog>0?'RECOVERING':'';}
 const pul=b.state==='CAPTURING'?0.5+0.5*Math.sin(clock*10):0;b.ringM.opacity=.6+pul*.4;b.fillM.opacity=.1+b.prog*.35;b.bm.emissiveIntensity=1.5+pul*3;b.flag.position.y=6.4-b.prog*5;b.flag.rotation.y=Math.sin(clock*3)*.3;}}
// ---------- world/match setup ----------
function clearWorld(){for(const u of U)S.remove(u.g);if(P&&!U.includes(P))S.remove(P.g);B.forEach(b=>S.remove(b.m));FX.forEach(f=>{S.remove(f.m);f.m.material.dispose();});B=[];FX=[];U=[];P=null;SPEC=null;}
const rk=o=>{const k=Object.keys(o);return k[Math.floor(Math.random()*k.length)];};
function spawn(u,x,z,yaw){u.g.position.set(x,0,z);u.tYaw=u.legYaw=u.yaw=yaw;initFeet(u);U.push(u);}
function newGame(){clearWorld();clock=0;endT=-1;result=null;STATS.shots=STATS.hits=STATS.kills=0;const md=settings.mode;
 P=makeUnit('b',loadout.mech,loadout.weapon,null);P.isPlayer=true;spawn(P,0,48,Math.PI);P.pitch=.05;camYaw=Math.PI;
 const team=md!=='duel';
 if(team){const roles=md==='base'?['att','def']:['esc','esc'];[[-7,50],[7,50]].forEach(([x,z],i)=>{const a=makeUnit('b',rk(CFG.mechs),rk(CFG.weapons),CFG.allyProfile);a.role=roles[i];spawn(a,x,z,Math.PI);makePlate(a,true);});}
 const n=team?3:1,eroles=md==='base'?['def','att','att']:['hunt','hunt','hunt'];
 for(let i=0;i<n;i++){const e=makeUnit('r',rk(CFG.mechs),rk(CFG.weapons),md==='duel'?settings.diff:CFG.enemyProfile);e.role=eroles[i];const sp=[[0,-48],[-7,-50],[7,-50]][i];spawn(e,sp[0],sp[1],0);makePlate(e,false);}
 showBases(md==='base');mode='play';showUI();}
// ---------- projectiles & effects ----------
const PG={minigun:new THREE.BoxGeometry(.12,.12,1),railgun:new THREE.BoxGeometry(.18,.18,4),hornet:new THREE.BoxGeometry(.35,.35,1)};
const PM={minigun:new THREE.MeshBasicMaterial({color:0xffee66}),railgun:new THREE.MeshBasicMaterial({color:0x80e8ff}),hornet:new THREE.MeshBasicMaterial({color:0xffaa22})};
function shoot(from,dir,u,homing){const W=u.W;const m=new THREE.Mesh(PG[u.wpn],PM[u.wpn]);m.position.copy(from);m.lookAt(from.clone().add(dir));S.add(m);
 B.push({m,v:dir.clone().multiplyScalar(W.speed),owner:u.team,src:u,W,dist:0,dmg:W.dmg*(u.prof?u.prof.dmgMul:1),homing});}
const fxG=new THREE.SphereGeometry(1,8,6),sparkG=new THREE.BoxGeometry(.12,.12,.12),debG=new THREE.BoxGeometry(.5,.35,.6);
function fx(p,s,c,o={}){if(FX.length>=CFG.fx.maxFx)return;const m=new THREE.Mesh(o.geo||(o.box?sparkG:fxG),o.mat||new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o.op||1,depthWrite:false}));m.position.copy(p);m.scale.setScalar(s*.2);S.add(m);
 FX.push({m,t:0,s,v:o.v||new THREE.Vector3(0,o.vy||0,0),grow:o.grow??1,life:o.life||.33,op:o.op||1,g:o.g??(o.box?-20:0),spin:o.spin,solid:!!o.mat});}
function boom(p,s,c=0xff8800){fx(p,s,c);}
function sparks(p,c=0xffe070){for(let i=0;i<4;i++)fx(p,1,c,{box:1,grow:0,life:.35,v:new THREE.Vector3((Math.random()-.5)*12,Math.random()*8,(Math.random()-.5)*12)});}
const debM=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.6,roughness:.6});
const FL=new THREE.PointLight(0xffb060,0,30,1.6);S.add(FL);let flI=0;
function flashLight(p,i){if(i>=flI){FL.position.copy(p);flI=i;}}
function explode(p,k=1){fx(p,5*k,0xffcc66,{life:.25});fx(p,4*k,0xff6a00,{life:.5,grow:1.6});fx(p.clone().setY(p.y+1.5),4*k,0x3a3a3a,{life:1.6,grow:2.2,vy:3,op:.7});
 for(let i=0;i<CFG.fx.debris;i++)fx(p,2.5*k,0,{geo:debG,mat:debM,grow:0,life:1.6,g:-24,spin:rnd3().multiplyScalar(12),v:new THREE.Vector3((Math.random()-.5)*16,6+Math.random()*10,(Math.random()-.5)*16)});
 sparks(p,0xffa040);sparks(p);flashLight(p,6*k);if(P&&p.distanceTo(P.g.position)<40)shake(.5*k*(1-p.distanceTo(P.g.position)/40));sfx('boom');}
function updFx(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt/f.life;f.v.y+=f.g*dt;f.m.position.addScaledVector(f.v,dt);
  if(f.spin){f.m.rotation.x+=f.spin.x*dt;f.m.rotation.y+=f.spin.y*dt;if(f.m.position.y<.2){f.m.position.y=.2;f.v.multiplyScalar(.4);f.v.y=Math.abs(f.v.y)*.3;f.spin.multiplyScalar(.5);}}
  if(f.keep){}else if(f.solid)f.m.scale.setScalar(f.s*.2*(f.t>.8?(1-f.t)*5:1));else if(f.grow)f.m.scale.setScalar(f.s*(.2+f.t*f.grow));else f.m.scale.setScalar(f.s*(1-f.t));
  if(!f.solid)f.m.material.opacity=f.op*(1-f.t);if(f.t>=1){S.remove(f.m);if(!f.solid)f.m.material.dispose();FX.splice(i,1);}}
 FL.intensity=flI*40;flI=Math.max(0,flI-dt*30);}
function shake(a){shakeA=Math.min(1,shakeA+a);}
// tiny WebAudio thuds (unlocked on first touch/click)
let AC=null;const unlockAudio=()=>{if(!AC)try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}if(AC&&AC.state==='suspended')AC.resume();};
addEventListener('touchstart',unlockAudio,{passive:true});addEventListener('mousedown',unlockAudio);
function sfx(k){if(!AC||AC.state!=='running')return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type='sine';const big=k==='boom';
 o.frequency.setValueAtTime(big?90:70,t);o.frequency.exponentialRampToValueAtTime(big?30:38,t+(big?.6:.18));g.gain.setValueAtTime(big?.5:.22,t);g.gain.exponentialRampToValueAtTime(.001,t+(big?.7:.2));o.connect(g).connect(AC.destination);o.start(t);o.stop(t+(big?.75:.22));}
function muzzle(u,i){u.flash[i].visible=true;u.flash[i].rotation.z=Math.random()*3;u.flashT=.05;const p=new THREE.Vector3();u.guns[i].updateMatrixWorld(true);return u.guns[i].localToWorld(p.set(0,0,u.mz));}
function fireWeapon(u,aimPt,homing){if(u===P)STATS.shots++;const W=u.W,pr=u.prof;u.fireCd=W.interval*(pr?pr.fireMul:1)/(W.spin?Math.max(.3,u.spin):1);u.ammo--;
 const gi=u.ammo%2,f=muzzle(u,gi);const d=aimPt.clone().sub(f).normalize();
 const s=W.spread+(pr?pr.spread:0);d.x+=(Math.random()-.5)*s;d.y+=(Math.random()-.5)*s*.6;d.z+=(Math.random()-.5)*s;d.normalize();
 u.kick[gi]=Math.min(1,u.kick[gi]+W.kick);u.jolt=Math.min(.12,u.jolt+W.jolt);if(u.wpn==='railgun')u.ventT=.7;
 if(u===P){flashLight(f,u.wpn==='railgun'?4:1.5);shake(W.jolt*2);}
 shoot(f,d,u,homing);if(u.ammo<=0)u.reload=W.reload;}
function frontal(u,pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,l=Math.hypot(dx,dz)||1;return (dx*Math.sin(u.tYaw)+dz*Math.cos(u.tYaw))/l>0.25;}
function dropShield(u){if(!u.shieldOn)return;u.shieldOn=false;u.abCd=u.T.shield.cd;}
function hurt(u,d,pos,src){if(!u||!u.alive)return;if(u.shieldOn&&pos&&frontal(u,pos)){u.shieldHP-=d;sparks(pos,0x80e0ff);if(u.shieldHP<=0)dropShield(u);return;}
 u.hp-=d;u.lastHit=clock;if(src)u.lastAtt=src;const H=CFG.hitReact;
 if(pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,c=Math.cos(u.tYaw),s=Math.sin(u.tYaw),lz=dx*s+dz*c,lx=dx*c-dz*s,l=Math.hypot(lx,lz)||1,k=Math.min(H.maxFlinch,d*H.flinch);
  u.fl.x+=lz/l*k;u.fl.z+=-lx/l*k;}// torso tips away from the impact
 if(d>=H.staggerDmg){u.stagT=H.staggerT;u.fl.x*=1.5;}
 if(u===P)shake(CFG.cam.shakeHit*Math.min(2,d/40));
 if(u.hp<=0)killUnit(u,src);}
function killUnit(u,src){if(!u.alive)return;u.alive=false;u.hp=0;u.dying=0;u.shieldOn=false;u.flash.forEach(f=>f.visible=false);
 if(src&&src!==u){src.kills++;if(src===P)STATS.kills++;}for(const x of U)if(x.lockTgt===u)x.lockTgt=null;
 if(u===P&&mode==='play'){const a=mates('b')[0];if(a)SPEC=a;}}
function ability(u){if(!u||!u.alive||mode!=='play')return;const T=u.T;
 if(T.shield){if(u.shieldOn)dropShield(u);else if(u.abCd<=0){u.shieldOn=true;u.shieldT=T.shield.dur;u.shieldHP=T.shield.hp;}}
 else if(T.jump){if(!u.air&&u.abCd<=0&&u.jumpWind<=0){u.jumpWind=CFG.gait.crouchJump;u.abCd=T.jump.cd;}}}
function tickUnit(u,dt){const T=u.T;u.abCd=Math.max(0,u.abCd-dt);u.fireCd-=dt;u.stagT=Math.max(0,u.stagT-dt);
 if(u.jumpWind>0){u.jumpWind-=dt;if(u.jumpWind<=0){u.vy=T.jump.vel;u.air=true;fx(u.g.position.clone().setY(u.g.position.y+.5),2,0xffaa44);fx(u.g.position.clone().setY(u.g.position.y+.3),2.5,0x9a927e,{grow:2,life:.6,op:.5});}}
 if(u.reload>0){u.reload-=dt;if(u.reload<=0){u.reload=0;u.ammo=u.W.mag;}}
 if(u.shieldOn){u.shieldT-=dt;if(u.shieldT<=0)dropShield(u);}
 if(T.regen&&clock-u.lastHit>T.regen.delay&&u.hp<u.max&&u.hp>0)u.hp=Math.min(u.max,u.hp+T.regen.rate*(u.prof?u.prof.hpMul:1)*dt);
 const p=u.g.position,gy=groundAt(p.x,p.z,p.y);
 if(u.air||p.y>gy+.01){u.air=true;u.vy-=CFG.gravity*dt;p.y+=u.vy*dt;if(p.y<=gy){const iv=-u.vy;p.y=gy;u.vy=0;u.air=false;u.crouch=Math.min(1,Math.max(u.crouch,iv/18));
   fx(p.clone().setY(gy+.3),2.2,0x9a927e,{grow:2.5,life:.6,op:.55});if(u===P){shake(CFG.cam.shakeLand*Math.min(1,iv/15));sfx('step');}}}}
function speedOf(u){return u.speed*(u.shieldOn?u.T.shield.slow:1)*(u.air&&u.T.jump?u.T.jump.airSpeed:1)*(u.stagT>0?CFG.move.staggerSlow:1)*(u.jumpWind>0?0.3:1);}
// inertia: velocity ramps toward the wanted velocity, heavier mechs ramp slower
function drive(u,wx,wz,dt){const K=CFG.move,m=u.T.mass||1,sp=speedOf(u),tx=wx*sp,tz=wz*sp,v=u.vel;const ox=v.x,oz=v.z;
 const dx=tx-v.x,dz=tz-v.z,dl=Math.hypot(dx,dz),rate=(Math.hypot(tx,tz)>Math.hypot(v.x,v.z)?K.accel:K.decel)/m*(u.air?.4:1)*dt;
 if(dl>rate){v.x+=dx/dl*rate;v.z+=dz/dl*rate;}else{v.x=tx;v.z=tz;}
 const p=u.g.position,r=1.6,nx=p.x+v.x*dt,nz=p.z+v.z*dt;if(!blocked(nx,p.z,r,p.y))p.x=nx;else v.x=0;if(!blocked(p.x,nz,r,p.y))p.z=nz;else v.z=0;
 p.x=Math.max(-A+2,Math.min(A-2,p.x));p.z=Math.max(-A+2,Math.min(A-2,p.z));
 u.acc.set((v.x-ox)/Math.max(dt,1e-3),0,(v.z-oz)/Math.max(dt,1e-3));}
// torso spring-damper (overshoot + settle)
function torso(u,tgt,dt,k,c){const m=u.T.mass||1,e=wrap(tgt-u.tYaw);u.tYawV+=(e*k/m-u.tYawV*c/Math.sqrt(m))*dt;u.tYaw+=u.tYawV*dt;}
// player aim
const ray=new THREE.Raycaster();const AIMNDC=new THREE.Vector2(0,0.16);let aimOnEnemy=false,hitMarkT=0;
function playerAim(){ray.setFromCamera(AIMNDC,C);const R_=foes('b');const tg=[...R_.map(e=>e.g),...obstMeshes,ground];const h=ray.intersectObjects(tg,true).find(h=>h.distance>C.position.distanceTo(P.g.position)+1&&!h.object.isSprite);
 aimOnEnemy=!!(h&&R_.some(e=>{let o=h.object;while(o){if(o===e.g)return true;o=o.parent;}return false;}));return h?h.point:ray.ray.at(150,new THREE.Vector3());}
// ---------- input ----------
const $=id=>document.getElementById(id);
const ABKEYS=['KeyE','ShiftLeft','ShiftRight','Space'];
addEventListener('keydown',e=>{if(!inp.keys[e.code]&&ABKEYS.includes(e.code))ability(P);inp.keys[e.code]=true;if(e.code==='KeyR')manualReload();if(e.code==='Space')e.preventDefault();});addEventListener('keyup',e=>inp.keys[e.code]=false);
const cv=R.domElement;cv.addEventListener('mousedown',e=>{if(mode!=='play')return;if(document.pointerLockElement!==cv&&cv.requestPointerLock)cv.requestPointerLock();if(e.button===0)inp.mFire=true;if(e.button===2)ability(P);});
addEventListener('mouseup',e=>{if(e.button===0)inp.mFire=false;});addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(document.pointerLockElement===cv&&P){P.yaw-=e.movementX*.003;P.pitch=Math.max(-.3,Math.min(.5,P.pitch+e.movementY*.002));}});
const joy=$('joy'),knob=$('knob');let jid=null,jc;
joy.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];jid=t.identifier;const r=joy.getBoundingClientRect();jc={x:r.left+75,y:r.top+75};jm(t);},{passive:false});
function jm(t){let dx=t.clientX-jc.x,dy=t.clientY-jc.y;const d=Math.hypot(dx,dy),m=60;if(d>m){dx*=m/d;dy*=m/d;}knob.style.transform=`translate(${dx}px,${dy}px)`;inp.mx=dx/m;inp.mz=dy/m;}
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
// ---------- AI ----------
const _t=new THREE.Vector3(),_e=new THREE.Vector3();
const eyeOf=(u,o)=>o.set(u.g.position.x,u.g.position.y+3.3,u.g.position.z);
function coverFrom(u,th){let best=null,bd=1e9;const p=u.g.position;for(const o of obst){if(o.h<3||o.hx>20||o.hz>20)continue;const ax=o.x-th.x,az=o.z-th.z,al=Math.hypot(ax,az)||1;
  const cx=o.x+ax/al*(Math.max(o.hx,o.hz)+2.6),cz=o.z+az/al*(Math.max(o.hx,o.hz)+2.6),d=Math.hypot(cx-p.x,cz-p.z);if(d<bd&&d<35){bd=d;best=new THREE.Vector3(cx,0,cz);}}return best;}
function aiTick(u,dt){const pr=u.prof,W=u.W,p=u.g.position,eye=eyeOf(u,new THREE.Vector3());
 u.scanT-=dt;if(u.scanT<=0||!u.tgt||!u.tgt.alive){u.scanT=.3;let best=null,bd=1e9;u.see=false;
  for(const f of foes(u.team)){const d=f.g.position.distanceTo(p);if(d>90)continue;const vis=los(eye,eyeOf(f,_e));const sc=d*(vis?1:2.5)*(f===u.lastAtt?.7:1);if(sc<bd){bd=sc;best=f;u.see=vis;}}u.tgt=best;}
 else u.see=los(eye,eyeOf(u.tgt,_e));
 const t=u.tgt,dist=t?t.g.position.distanceTo(p):1e9,see=t&&u.see;u.seeT=see?u.seeT+dt:0;
 // goals by role
 u.think-=dt;if(u.think<=0||!u.goal){u.think=pr.think[0]+Math.random()*(pr.think[1]-pr.think[0]);const own=BASES[u.team],eb=BASES[u.team==='b'?'r':'b'];u.cover=false;
  if(pr.cover&&t&&see&&(u.reload>0||u.hp<u.max*.4)){const c=coverFrom(u,t.g.position);if(c){u.goal=c;u.cover=true;}}
  if(!u.cover){if(u.role==='def'){u.goal=new THREE.Vector3(own.x+(Math.random()-.5)*8,0,own.z+(Math.random()-.5)*8);if(t&&dist<25&&see)u.goal=null;}
   else if(u.role==='att')u.goal=new THREE.Vector3(eb.x+(Math.random()-.5)*5,0,eb.z+(Math.random()-.5)*5);
   else if(u.role==='esc'&&P&&P.alive&&(!t||dist>W.range*.9)){const s=u===U[1]?-1:1,c=Math.cos(P.tYaw),sn=Math.sin(P.tYaw);u.goal=new THREE.Vector3(P.g.position.x+s*6*c-sn*5,0,P.g.position.z-s*6*sn-c*5);}
   else if(t){const a=Math.atan2(p.x-t.g.position.x,p.z-t.g.position.z)+(Math.random()-.5)*1.6,r=Math.min(40,Math.max(14,W.range*.6))+Math.random()*6;u.goal=new THREE.Vector3(t.g.position.x+Math.sin(a)*r,0,t.g.position.z+Math.cos(a)*r);}
   else u.goal=new THREE.Vector3((Math.random()-.5)*60,0,(Math.random()-.5)*60);}
  // abilities
  if(Math.random()<pr.ability){if(u.T.jump&&t&&(!see||clock-u.lastHit<1))ability(u);}
  if(pr.ability>=1&&u.T.shield&&u.shieldOn&&!(clock-u.lastHit<1.5))dropShield(u);}
 if(u.T.shield&&!u.shieldOn&&u.abCd<=0&&clock-u.lastHit<.4&&t&&see&&Math.random()<pr.ability*dt*20)ability(u);
 // move (+ strafing while engaged)
 let wx=0,wz=0;if(u.goal){const dx=u.goal.x-p.x,dz=u.goal.z-p.z,l=Math.hypot(dx,dz);if(l>1.5){wx=dx/l;wz=dz/l;}}
 if(see&&pr.strafe>0&&!u.cover&&dist<W.range){u.strafeT-=dt;if(u.strafeT<=0){u.strafeT=.8+Math.random()*1.4;u.strafeD=-u.strafeD;}const tx=t.g.position.x-p.x,tz=t.g.position.z-p.z,l=Math.hypot(tx,tz)||1;
  wx+=-tz/l*u.strafeD*pr.strafe;wz+=tx/l*u.strafeD*pr.strafe;if(u.role!=='att'&&!u.goal||dist<W.range*.5){}}
 const wl=Math.hypot(wx,wz);if(wl>1){wx/=wl;wz/=wl;}const bx=p.x,bz=p.z;drive(u,wx,wz,dt);if(wl>.3&&Math.hypot(p.x-bx,p.z-bz)<.002*Math.max(1,dt*60)){u.stuck=(u.stuck||0)+dt;if(u.stuck>.5){u.stuck=0;u.goal=new THREE.Vector3(p.x+(Math.random()-.5)*20,0,p.z+(Math.random()-.5)*20);u.think=1;}}
 // torso/aim with lead
 let ap=null;if(t){const tp=t.g.position,tof=W.hitscan?0:dist/W.speed;ap=new THREE.Vector3(tp.x+t.vel.x*tof*pr.lead,tp.y+2.8+(t.vel?0:0),tp.z+t.vel.z*tof*pr.lead);}
 const ty=ap&&(see||dist<50)?Math.atan2(ap.x-p.x,ap.z-p.z):(Math.hypot(u.vel.x,u.vel.z)>.5?Math.atan2(u.vel.x,u.vel.z):u.tYaw);
 torso(u,ty,dt,CFG.move.aiTorsoK,CFG.move.aiTorsoC);if(ap)aimGuns(u,ap,dt);
 const want=see&&dist<W.range*.95&&u.seeT>pr.react;if(W.spin)u.spin=want&&!u.reload?Math.min(1,u.spin+dt/W.spin):Math.max(0,u.spin-dt);
 u.lockT=see&&dist<W.range?u.lockT+dt:0;u.cd-=dt;if(!u.reload&&!see&&u.ammo<W.mag*.3)u.reload=W.reload;
 if(want&&Math.abs(wrap(ty-u.tYaw))<.25&&u.cd<=0&&!u.reload&&u.fireCd<=0&&(!W.spin||u.spin>.5)){if(u.burst<=0)u.burst=W.aiBurst;
  fireWeapon(u,ap,W.homing&&u.lockT>W.lockTime?t:null);u.burst--;if(u.burst<=0||u.reload){u.burst=0;const bp=pr.burstPause;u.cd=bp[0]+Math.random()*(bp[1]-bp[0]);}}}
// ---------- loop ----------
const fwd=new THREE.Vector3(),rt=new THREE.Vector3();
function outcome(){const md=settings.mode,b=mates('b').length,r=mates('r').length;
 if(md==='base'){if(BASES.r.prog>=1)return[true,'Enemy base captured'];if(BASES.b.prog>=1)return[false,'Your base was captured'];}
 if(!r)return[true,md==='duel'?'Opponent destroyed':'All enemies destroyed'];if(!b)return[false,md==='duel'?'You were destroyed':'Your team was destroyed'];return null;}
function end(win,why){mode='over';showUI();const md=settings.mode;$('mt').textContent=win?'VICTORY':'DEFEAT';$('mt').style.color=win?'#6f9':'#f66';
 $('mm').textContent=`${CFG.modes[md].name} ${CFG.modes[md].sub}${md==='duel'?' · '+CFG.diff[settings.diff].name:''}`;$('ml').textContent=why;
 $('mk').textContent=`Kills: ${STATS.kills}  ·  Team kills: ${U.filter(u=>u.team==='b').reduce((a,u)=>a+u.kills,0)}  ·  Accuracy: ${STATS.shots?Math.round(STATS.hits/STATS.shots*100):0}%`;
 document.exitPointerLock&&document.exitPointerLock();inp.fire=false;inp.mFire=false;}
let last=performance.now(),menuA=0,fpsT=0,fpsN=0,fps=60,lowT=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
 fpsT+=dt;fpsN++;if(fpsT>=.5){fps=fpsN/fpsT;fpsT=fpsN=0;if(mode==='play'&&settings.gfx==='high'&&!window.__noAuto){lowT=fps<CFG.gfx.autoFallbackFps?lowT+.5:0;if(lowT>=CFG.gfx.autoWindow){setGfx('low');toast('Low fps: graphics switched to LOW');}}}
 if(mode==='play')update(dt);else if(mode==='menu')menuTick(dt);else if(mode==='over'){for(const u of U)animMech(u,dt);}
 updFx(dt);if(mode!=='menu')cam(dt);R.render(S,C);}
function update(dt){clock+=dt;const k=inp.keys;
 if(P.alive){let mx=inp.mx+((k.KeyD?1:0)-(k.KeyA?1:0)),mz=inp.mz+((k.KeyS?1:0)-(k.KeyW?1:0));
  if(k.ArrowLeft)P.yaw+=2*dt;if(k.ArrowRight)P.yaw-=2*dt;
  fwd.set(Math.sin(P.yaw),0,Math.cos(P.yaw));rt.set(-fwd.z,0,fwd.x);tickUnit(P,dt);
  const v=_t.set(0,0,0).addScaledVector(fwd,-mz).addScaledVector(rt,mx);const l=v.length();if(l>1)v.divideScalar(l);drive(P,v.x,v.z,dt);
  torso(P,P.yaw,dt,CFG.move.torsoK,CFG.move.torsoC);
  const W=P.W,firing=inp.fire||inp.mFire||k.KeyF;
  if(W.spin)P.spin=firing&&!P.reload?Math.min(1,P.spin+dt/W.spin):Math.max(0,P.spin-dt);
  updateLock(dt);cam(0);const AP=playerAim();aimGuns(P,AP,dt);
  if(firing&&P.fireCd<=0&&P.ammo>0&&!P.reload&&(!W.spin||P.spin>.3)){const locked=W.homing&&P.lockTgt&&P.lockT>=W.lockTime;aimGuns(P,AP,1);fireWeapon(P,AP,locked?P.lockTgt:null);}}
 else{P.vel.set(0,0,0);lockEl.style.display='none';}
 for(const u of U)if(u!==P&&u.alive){tickUnit(u,dt);aiTick(u,dt);}
 for(const u of U){if(!u.alive)u.vel.set(0,0,0);animMech(u,dt);}
 // projectiles (friendly fire off: sweeps/splash only test the shooter's foes)
 for(let i=B.length-1;i>=0;i--){const b=B[i],p=b.m.position,W=b.W,sp=W.speed;let hit=false,hitU=null;
  if(b.homing&&b.homing.alive){const tp=b.homing.g.position.clone();tp.y+=3;const want=tp.sub(p).normalize();const cur=b.v.clone().normalize();cur.lerp(want,Math.min(1,W.turnRate*dt)).normalize();b.v.copy(cur).multiplyScalar(sp);b.m.lookAt(p.clone().add(b.v));}
  if(b.W.homing&&Math.random()<.6)fx(p.clone(),.45,0xb0b0b0,{life:.5,op:.45,grow:2.2});
  const p0=p.clone(),L=W.hitscan?W.range-b.dist:Math.min(sp*dt,W.range-b.dist+.01);const dir=b.v.clone().normalize();
  const sw=sweep(p0,dir,L,b.owner);if(sw){p.addScaledVector(dir,sw.t);b.dist+=sw.t;hit=true;hitU=sw.u;if(hitU&&b.src===P){STATS.hits++;hitMarkT=.18;}}else{p.addScaledVector(dir,L);b.dist+=L;}
  if(W.hitscan&&!b.beam){b.beam=1;beam(p0,p.clone(),b.owner==='b'?0x80e8ff:0xff6060);if(!hit)b.dist=W.range;}
  let mult=1;if(W.falloff&&b.dist>W.range*W.falloff)mult=1-.5*(b.dist-W.range*W.falloff)/(W.range*(1-W.falloff));
  if(hit||b.dist>=W.range){const pos=p.clone();
   if(W.splash){boom(pos,hit?3:1.5,0xff7700);flashLight(pos,2);if(hitU)hurt(hitU,b.dmg,pos,b.src);for(const u of foes(b.owner)){if(u===hitU)continue;const dd=u.g.position.clone().setY(u.g.position.y+2.5).distanceTo(pos);if(dd<W.splash)hurt(u,b.dmg*.5*(1-dd/W.splash),pos,b.src);}}
   else if(hit){if(hitU)hurt(hitU,b.dmg*Math.max(.5,mult),pos,b.src);const rg=W===CFG.weapons.railgun;boom(pos,rg?1.2:.5,rg?0x80e8ff:0xffdd55);sparks(pos);}
   S.remove(b.m);B.splice(i,1);}}
 if(settings.mode==='base')tickBases(dt);
 if(!P.alive&&(!SPEC||!SPEC.alive))SPEC=mates('b')[0]||SPEC;
 if(endT<0){const o=outcome();if(o){result=o;endT=clock+1.6;}}else if(clock>=endT){end(result[0],result[1]);return;}
 hud();}
// lock-on: enemy nearest the crosshair, within cone, range and line of sight
const lockEl=$('lock'),scr=new THREE.Vector3();
function updateLock(dt){const W=P.W;if(!W.homing){lockEl.style.display='none';return;}
 let best=null,bd=W.lockCone;const eye=P.g.position.clone();eye.y+=3.3;
 for(const e of foes('b')){scr.copy(e.g.position);scr.y+=3;const dist=scr.distanceTo(eye);if(dist>W.range)continue;scr.project(C);if(scr.z>1)continue;const d=Math.hypot(scr.x-AIMNDC.x,(scr.y-AIMNDC.y)*.7);if(d<bd&&los(eye,e.g.position.clone().setY(e.g.position.y+3.3))){bd=d;best=e;}}
 if(best!==P.lockTgt){P.lockTgt=best;P.lockT=0;}else if(best)P.lockT+=dt;
 if(best){scr.copy(best.g.position);scr.y+=3;scr.project(C);lockEl.style.display='flex';lockEl.style.left=((scr.x+1)/2*innerWidth)+'px';lockEl.style.top=((1-scr.y)/2*innerHeight)+'px';
  const f=Math.min(1,P.lockT/W.lockTime);const locked=f>=1;lockEl.style.background=`conic-gradient(${locked?'#f33a':'#fd4a'} ${f*360}deg,#0000 0)`;lockEl.style.borderColor=locked?'#f33':'#fd4';lockEl.textContent=locked?'LOCKED':'';}
 else lockEl.style.display='none';}
// camera: over-the-shoulder on the player, or on a spectated ally; collision pull-in; shake; sun shadow follows
const camRay=new THREE.Raycaster(),cO=new THREE.Vector3(),cD=new THREE.Vector3(),want=new THREE.Vector3();
function cam(dt){if(!P)return;const K=CFG.cam,f=(P.alive||!SPEC)?P:SPEC,p=f.g.position;
 if(f===P)camYaw=P.yaw;else camYaw+=wrap(f.tYaw-camYaw)*Math.min(1,(dt||0)*3);
 const bx=-Math.sin(camYaw),bz=-Math.cos(camYaw),rx=-bz,rz=bx,pit=f===P?P.pitch:.05;
 cO.set(p.x,p.y+K.height,p.z);want.set(p.x+bx*K.dist-rx*K.side,p.y+K.height+pit*K.pitchLift,p.z+bz*K.dist-rz*K.side);
 cD.copy(want).sub(cO);const L=cD.length();cD.normalize();camRay.set(cO,cD);camRay.far=L;const h=camRay.intersectObjects(obstMeshes,false)[0];
 if(h)want.copy(cO).addScaledVector(cD,Math.max(1.2,h.distance-0.4));
 if(dt){shakeA=Math.max(0,shakeA-shakeA*K.shakeDecay*dt-dt*.05);}const s=shakeA*shakeA*0.6;
 C.position.set(want.x+(Math.random()-.5)*s,want.y+(Math.random()-.5)*s,want.z+(Math.random()-.5)*s);
 C.lookAt(p.x-bx*K.lookAhead-rx*K.side,p.y+3.5-pit*12,p.z-bz*K.lookAhead-rz*K.side);
 dl.position.set(p.x+SUN.x*60,SUN.y*60,p.z+SUN.z*60);dl.target.position.set(p.x,0,p.z);}
// ---------- graphics quality ----------
function setGfx(q){settings.gfx=q;saveLoadout();const g=CFG.gfx[q];R.setPixelRatio(Math.min(devicePixelRatio,g.pixelRatio));R.setSize(innerWidth,innerHeight);
 R.shadowMap.enabled=g.shadows;dl.castShadow=g.shadows;dl.shadow.mapSize.set(g.shadowMap,g.shadowMap);if(dl.shadow.map){dl.shadow.map.dispose();dl.shadow.map=null;}
 S.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);}});if(mode==='menu')renderMenu();}
let toastT=0;function toast(t){const el=$('toast');el.textContent=t;el.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>el.style.display='none',3000);}
// ---------- HUD ----------
const hpf=$('hpf'),info=$('info'),bMG=$('bMG'),bAB=$('bAB'),gunBar=$('gunf'),abBar=$('abf'),rng=$('rng');let hudN=0;
function manualReload(){if(P&&P.alive&&mode==='play'&&!P.reload&&P.ammo<P.W.mag)P.reload=P.W.reload;}
function ring(el,frac,col){el.style.background=`conic-gradient(${col} ${frac*360}deg, #0006 0)`;}
function hud(){const W=P.W,T=P.T;hudN++;
 if((hudN&7)===0){const nb=mates('b').length,nr=mates('r').length;$('teams').innerHTML=`<b class="tb">BLUE ${nb}</b><b class="tk">☠ ${STATS.kills}</b><b class="tr">${nr} RED</b>`;
  const cp=$('cap');if(settings.mode==='base'){cp.style.display='block';const o=BASES.b,e=BASES.r;$('capO').style.width=o.prog*100+'%';$('capE').style.width=e.prog*100+'%';
   $('capOt').textContent=`YOUR BASE ${Math.round(o.prog*100)}% ${o.state==='CAPTURING'?'⚠ UNDER ATTACK':o.state}`;$('capOt').className=o.state==='CAPTURING'?'warn':'';$('capEt').textContent=`ENEMY BASE ${Math.round(e.prog*100)}% ${e.state}`;}else cp.style.display='none';
  const sp=$('spec');if(!P.alive&&SPEC&&SPEC.alive){sp.style.display='block';sp.textContent=`DESTROYED — spectating ${SPEC.T.name} (ally)`;}else sp.style.display='none';}
 hpf.style.width=(P.hp/P.max*100)+'%';
 const regen=T.regen&&clock-P.lastHit>T.regen.delay&&P.hp<P.max&&P.alive;hpf.style.background=regen?'linear-gradient(#8fa,#2c6)':'linear-gradient(#5f5,#2a2)';
 info.innerHTML=`HP ${Math.ceil(P.hp)}/${Math.round(P.max)} ${regen?'<b style="color:#6f9">+ REGEN</b>':''}`;
 if(P.reload){const f=1-P.reload/W.reload;gunBar.style.width=f*100+'%';gunBar.style.background='#fa4';$('gunt').textContent=`${W.name}: RELOADING ${P.reload.toFixed(1)}s`;ring(bMG,f,'#fa48');bMG.textContent='RELOAD';}
 else{gunBar.style.width=P.ammo/W.mag*100+'%';gunBar.style.background='#ff6';$('gunt').textContent=`${W.name} ${P.ammo}/${W.mag}`;ring(bMG,P.ammo/W.mag,'#f448');bMG.textContent=P.ammo;}
 let af=1,at='',ac='#6cf';
 if(T.shield){if(P.shieldOn){af=Math.min(P.shieldT/T.shield.dur,P.shieldHP/T.shield.hp);at=`SHIELD UP ${Math.ceil(P.shieldHP)} HP · ${P.shieldT.toFixed(1)}s`;}else if(P.abCd>0){af=1-P.abCd/T.shield.cd;at=`SHIELD COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='SHIELD READY';}
 else if(T.jump){if(P.abCd>0){af=1-P.abCd/T.jump.cd;at=`JUMP COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='JUMP READY';}
 else{const t=clock-P.lastHit;af=P.hp>=P.max?1:Math.min(1,t/T.regen.delay);at=P.hp>=P.max?'REGEN: FULL':(af>=1?`REGENERATING +${T.regen.rate}/s`:`REGEN IN ${(T.regen.delay-t).toFixed(1)}s`);ac=af>=1?'#6f9':'#678';}
 abBar.style.width=af*100+'%';abBar.style.background=ac;$('abt').textContent=at;ring(bAB,af,ac+'8');
 if((hudN&3)===0&&P.alive){const ap=playerAim(),d=ap.distanceTo(P.g.position);const inR=d<=W.range;rng.textContent=`${Math.round(d)}m / ${W.range}m${inR?'':' OUT OF RANGE'}`;rng.style.color=inR?'#8f8':'#f66';$('xh').style.borderColor=aimOnEnemy?(inR?'#f33':'#f668'):(inR?'#fffa':'#fff6');}
 $('xh').classList.toggle('hit',hitMarkT>0);hitMarkT-=1/60;}
// ---------- MENU ----------
const menu=$('menu'),mc=$('mc');let menuStep='title';
const statMax={hp:1300,speed:10};const bar=(l,v,t)=>`<div class="st"><span>${l}</span><div class="sb"><i style="width:${Math.max(4,v*100)}%"></i></div><em>${t}</em></div>`;
function preview(){if(P)S.remove(P.g);P=makeUnit('b',loadout.mech,loadout.weapon,null);P.g.position.set(0,0,48);P.tYaw=P.legYaw=Math.PI;P.yaw=Math.PI;P.pitch=.05;initFeet(P);animMech(P,.016);}
function menuTick(dt){menuA+=dt*.35;if(!P)return;const p=P.g.position;P.tYaw=Math.PI+Math.sin(menuA*.8)*.6;P.legYaw=Math.PI;P.spin=P.W.spin?1:0;animMech(P,dt);
 const a=Math.PI*0.75+menuA*0.3;const cx=p.x+Math.sin(a)*9,cz=p.z+Math.cos(a)*9;C.position.set(cx,4.5,cz);
 const lx=-Math.cos(a),lz=Math.sin(a);const side=innerWidth>700?2.8:0;C.lookAt(p.x+lx*side,3,p.z+lz*side);dl.position.set(p.x+SUN.x*60,SUN.y*60,p.z+SUN.z*60);dl.target.position.set(p.x,0,p.z);}
function renderMenu(){const Ms=CFG.mechs,Ws=CFG.weapons,Md=CFG.modes;let h='';const md=Md[settings.mode];
 const gq=`<div class="gq">Graphics: <button data-gfx="high" class="${settings.gfx==='high'?'on':''}">HIGH</button><button data-gfx="low" class="${settings.gfx==='low'?'on':''}">LOW</button></div>`;
 if(menuStep==='title'){h=`<h1>MECH ARENA</h1><p class="sub">Choose a mode, your mech and weapon, then deploy.</p>
  <button class="big" data-go="mode">PLAY</button><button class="big alt" data-go="deploy">QUICK DEPLOY<br><small>${md.name}${settings.mode==='duel'?' ('+CFG.diff[settings.diff].name+')':''} · ${Ms[loadout.mech].name} + ${Ws[loadout.weapon].name}</small></button>${gq}`;}
 else if(menuStep==='mode'){h=`<h2>1 · SELECT MODE</h2><div class="cards">`+Object.entries(Md).map(([k,m])=>`<div class="card ${k===settings.mode?'sel':''}" data-mode="${k}"><div class="md">${m.sub}</div><b>${m.name}</b></div>`).join('')+`</div>
  <div class="det"><h3>${md.name} <small>— ${md.sub}</small></h3><p>${md.desc}</p>${settings.mode==='duel'?`<div class="dif">`+Object.entries(CFG.diff).map(([k,d])=>`<button data-diff="${k}" class="${k===settings.diff?'on':''}">${d.name.toUpperCase()}</button>`).join('')+`</div><p class="ab">${({easy:'Slow reactions, wide spread, weaker armor and damage.',normal:'Leads moving targets, strafes a little.',hard:'Fast reactions, accurate leads, strafes, uses cover and abilities smartly.'})[settings.diff]}</p>`:''}</div>
  <div class="row"><button data-go="title">BACK</button><button class="go" data-go="mech">NEXT ▶</button></div>`;}
 else if(menuStep==='mech'){h=`<h2>2 · SELECT MECH</h2><div class="cards">`+Object.entries(Ms).map(([k,m])=>`<div class="card ${k===loadout.mech?'sel':''}" data-mech="${k}"><div class="sw" style="background:#${m.color.toString(16).padStart(6,'0')}"></div><b>${m.name}</b><small>${m.ability}</small></div>`).join('')+`</div>`;
  const m=Ms[loadout.mech];const ab=m.shield?`${m.shield.hp} HP / ${m.shield.dur}s, ${m.shield.cd}s cooldown`:m.jump?`${m.jump.cd}s cooldown`:`+${m.regen.rate} HP/s after ${m.regen.delay}s`;
  h+=`<div class="det"><h3>${m.name} <small>— ${m.ability}</small></h3>${bar('ARMOR',m.hp/statMax.hp,m.hp)}${bar('SPEED',m.speed/statMax.speed,m.speed)}<p>${m.desc}</p><p class="ab">Ability: ${ab}</p></div>
  <div class="row"><button data-go="mode">◀ BACK</button><button class="go" data-go="weapon">NEXT ▶</button></div>`;}
 else{h=`<h2>3 · SELECT WEAPON</h2><div class="cards">`+Object.entries(Ws).map(([k,w])=>`<div class="card ${k===loadout.weapon?'sel':''}" data-wpn="${k}"><div class="wi">${k==='minigun'?'⁂':k==='railgun'?'━':'➹'}</div><b>${w.name}</b></div>`).join('')+`</div>`;
  const w=Ws[loadout.weapon];const rate=1/w.interval,dps=w.dmg*rate;
  h+=`<div class="det"><h3>${w.name}</h3>${bar('DAMAGE',w.dmg/130,w.dmg+' / hit')}${bar('FIRE RATE',Math.min(1,rate/22),rate.toFixed(1)+' /s')}${bar('RANGE',w.range/110,w.range+' m')}${bar('DPS',dps/180,Math.round(dps))}
  <p>${w.desc}</p><p class="ab">Magazine ${w.mag} · reload ${w.reload}s${w.homing?` · lock ${w.lockTime}s · splash ${w.splash}m`:''}</p></div>
  <div class="row"><button data-go="mech">◀ BACK</button><button class="go" data-go="deploy">DEPLOY</button></div>`;}
 mc.innerHTML=h;}
function goMenu(){clearWorld();showBases(false);mode='menu';menuStep='title';preview();renderMenu();showUI();}
function showUI(){menu.style.display=mode==='menu'?'flex':'none';$('hud').style.display=mode==='play'?'block':'none';$('msg').style.display=mode==='over'?'flex':'none';
 const t=TOUCH&&mode==='play'?'':'none';for(const id of['joy','bMG','bAB','bRL'])$(id).style.display=t;$('hint').style.display=TOUCH||mode!=='play'?'none':'';
 if(mode==='play'){bAB.textContent=P.T.ability;bAB.classList.toggle('passive',!!P.T.regen);}}
function menuClick(e){const el=e.target.closest('[data-go],[data-mech],[data-wpn],[data-mode],[data-diff],[data-gfx]');if(!el)return;const d=el.dataset;
 if(d.mech){loadout.mech=d.mech;saveLoadout();preview();}
 if(d.wpn){loadout.weapon=d.wpn;saveLoadout();preview();}
 if(d.mode){settings.mode=d.mode;saveLoadout();}if(d.diff){settings.diff=d.diff;saveLoadout();}
 if(d.gfx){setGfx(d.gfx);}
 if(d.go){if(d.go==='deploy'){saveLoadout();newGame();return;}menuStep=d.go;}
 renderMenu();}
menu.addEventListener('click',menuClick);
$('again').addEventListener('click',()=>newGame());$('tomenu').addEventListener('click',()=>goMenu());
setGfx(settings.gfx);goMenu();requestAnimationFrame(loop);
window.__game={hurt,STATS,C,cam,obst,obstMeshes,BASES,CFG,get U(){return U},get E(){return foes('b')},get P(){return P},get B(){return B},get mode(){return mode},get fps(){return fps},get SPEC(){return SPEC},get settings(){return settings},
 ability:()=>ability(P),newGame,goMenu,setGfx,get loadout(){return loadout},setLoadout:(m,w)=>{loadout={mech:m,weapon:w};},
 startMatch:(md,df)=>{settings.mode=md;if(df)settings.diff=df;newGame();},setBaseProg:(t,v)=>{BASES[t].prog=v;},
 killTeam:t=>{for(const u of U)if(u.team===t&&u.alive)hurt(u,1e6,null,null);},killUnit:u=>hurt(u,1e6,null,null)};
// barrel convergence: rotate each gun pivot so its +Z points at the aim point
const _l=new THREE.Vector3();
function aimGuns(u,pt,dt){const K=CFG.cam;u.top.updateMatrixWorld(true);for(const g of u.guns){g.rotation.order='YXZ';
 _l.copy(pt);g.parent.worldToLocal(_l);_l.sub(g.position);const yaw=Math.max(-K.aimMaxYaw,Math.min(K.aimMaxYaw,Math.atan2(_l.x,_l.z)));
 const pit=Math.max(-K.aimMaxPitch,Math.min(K.aimMaxPitch,Math.atan2(-_l.y,Math.hypot(_l.x,_l.z))));const k=Math.min(1,dt*K.aimTurn);
 g.rotation.y+=(yaw-g.rotation.y)*k;g.rotation.x+=(pit-g.rotation.x)*k;}}
function rayBox(o,d,mn,mx,L){let t0=0,t1=L;for(const a of['x','y','z']){const v=d[a];if(Math.abs(v)<1e-9){if(o[a]<mn[a]||o[a]>mx[a])return -1;continue;}
 let ta=(mn[a]-o[a])/v,tb=(mx[a]-o[a])/v;if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return -1;}return t0;}
const _mn=new THREE.Vector3(),_mx=new THREE.Vector3();
function sweep(o,d,L,owner){let best=null;const H=CFG.hitbox;
 if(d.y<0){const tg=-o.y/d.y;if(tg>=0&&tg<=L)best={t:tg,u:null};}
 for(const ob of obst){_mn.set(ob.x-ob.hx,-1,ob.z-ob.hz);_mx.set(ob.x+ob.hx,ob.h,ob.z+ob.hz);const t=rayBox(o,d,_mn,_mx,L);if(t>=0&&(!best||t<best.t))best={t,u:null};}
 for(const u of foes(owner)){const q=u.g.position,r=u.shieldOn?H.shield:H.hx;_mn.set(q.x-r,q.y+H.y0,q.z-r);_mx.set(q.x+r,q.y+H.y1,q.z+r);const t=rayBox(o,d,_mn,_mx,L);if(t>=0&&(!best||t<best.t))best={t,u};}
 if(!best){const e=o.clone().addScaledVector(d,L);if(Math.abs(e.x)>A||Math.abs(e.z)>A)best={t:L,u:null};}
 return best;}
const beamG=new THREE.BoxGeometry(.12,.12,1);
function beam(a,b,c){const m=new THREE.Mesh(beamG,new THREE.MeshBasicMaterial({color:c,transparent:true,depthWrite:false}));const l=a.distanceTo(b);m.position.copy(a).lerp(b,.5);m.scale.z=l;m.lookAt(b);S.add(m);FX.push({m,t:0,s:1,v:new THREE.Vector3(),grow:0,life:.2,op:.9,g:0,keep:1});}
