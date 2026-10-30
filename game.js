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
// ======================= PROGRESSION: coins, upgrades, unlocks, paints =======================
CFG.mechs.phantom={name:'Phantom',hp:900,speed:9.5,mass:0.95,color:0x6b4fa8,enemyColor:0x9a2a50,ability:'DASH',
 desc:'Stealth raider. Fires a burst of thrusters for a lightning-fast dash in the direction you are moving.',dash:{speed:34,dur:0.22,cd:5}};
CFG.weapons.shotgun={name:'Scattergun',desc:'Close-range shotgun: 9 heavy pellets per blast. Devastating up close, useless far away.',
 dmg:15,pellets:9,interval:0.8,range:28,mag:6,reload:3.2,spread:0.11,speed:150,aiBurst:1,kick:0.7,jolt:0.07};
CFG.econ={win:100,loss:25,kill:20,capture:60,duelMul:{easy:0.7,normal:1,hard:1.5},
 upCost:[0,150,300,550,900],// cost to go from level i to i+1 (index = current level)
 locked:{phantom:800,shotgun:700,minigun_l:600,railgun_s:250,railgun_l:900,hornet_s:250,hornet_l:800,shotgun_s:400,shotgun_l:1000},paintCost:250,enemyScale:0.15};
CFG.paints={default:{name:'Factory',col:null},desert:{name:'Desert Camo',col:0xb59a68,camo:[0x8a7048,0xd8c08a]},
 arctic:{name:'Arctic Camo',col:0xdfe6ea,camo:[0x9aa7b0,0xffffff]},jungle:{name:'Jungle Camo',col:0x4c6a34,camo:[0x2b3d1f,0x7a8a4a]},
 gold:{name:'Gold',col:0xd4a530,metal:0.9},stealth:{name:'Stealth Black',col:0x26262c,rough:0.8}};
// ---- v12: weapon sizes. Each family has Small / Medium / Large variants; every mount fires its own weapon independently ----
const SIZES={S:{r:1,name:'Small',dmg:.55,int:.8,range:.85,reload:.8,mag:1.2,wt:1,sc:.72},M:{r:2,name:'Medium',dmg:1,int:1,range:1,reload:1,mag:1,wt:2,sc:1},L:{r:3,name:'Large',dmg:1.7,int:1.15,range:1.15,reload:1.25,mag:.8,wt:4,sc:1.38}};
// mediums are the v11 weapons; now each mount carries its own gun, so per-gun cadence is halved (a pair = the old single weapon) and mags trimmed
for(const [k,W] of Object.entries(CFG.weapons)){W.interval=+(W.interval*2).toFixed(3);W.mag=Math.ceil(W.mag*.6);W.fam=k;W.size='M';}
const VAR={minigun:{S:['Light SMG','Compact rapid-fire SMG. Light and quick to reload.'],L:['Heavy Rotary Cannon','Six-barrel cannon. Slow spin-up, shreds armor.']},
 railgun:{S:['Pistol Rail','Light rail sidearm. Quick precise shots, modest punch.'],L:['Heavy Railgun','Artillery-grade rail. Crushing long-range slugs, slow cycle.']},
 hornet:{S:['Light Rocket Pod','Small lock-on rocket pod.'],L:['Missile Battery','Heavy lock-on battery. Big warheads, wide splash.']},
 shotgun:{S:['Scatter Pistol','Short-range sidearm shotgun.'],L:['Heavy Scattergun','Massive close-range blast.']}};
for(const f of Object.keys(VAR))for(const z of['S','L']){const b=CFG.weapons[f],q=SIZES[z],W=Object.assign({},b,{name:VAR[f][z][0],desc:VAR[f][z][1],fam:f,size:z});
 W.dmg=+(b.dmg*q.dmg).toFixed(1);W.interval=+(b.interval*q.int).toFixed(3);W.range=Math.round(b.range*q.range);W.reload=+(b.reload*q.reload).toFixed(2);W.mag=Math.max(2,Math.round(b.mag*q.mag));
 if(W.splash)W.splash=+(b.splash*(z==='L'?1.4:.75)).toFixed(1);if(W.spin)W.spin=b.spin*(z==='L'?1.6:.6);W.kick=b.kick*q.sc;W.jolt=b.jolt*q.dmg;CFG.weapons[f+'_'+z.toLowerCase()]=W;}
// stable display order: family, then S/M/L
{const o={};for(const f of['minigun','railgun','hornet','shotgun'])for(const k of[f+'_s',f,f+'_l'])o[k]=CFG.weapons[k];CFG.weapons=o;}
// hardpoints per mech (s = side: -1 left group, +1 right group). A slot takes its size or smaller.
CFG.slots={guardian:[{z:'L',s:1,n:'Right arm'},{z:'L',s:-1,n:'Left arm'},{z:'S',s:1,n:'Right shoulder'},{z:'S',s:-1,n:'Left shoulder'}],
 strider:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'}],mender:[{z:'M',s:1,n:'Right arm'},{z:'S',s:-1,n:'Left arm'}],phantom:[{z:'M',s:1,n:'Right arm'},{z:'S',s:-1,n:'Left arm'}]};
CFG.defSlots={guardian:['minigun','minigun','minigun_s','minigun_s'],strider:['minigun','minigun'],mender:['minigun','minigun_s'],phantom:['minigun','minigun_s']};
// firepower: per-mech damage factor (Guardian's 4 mounts share one reactor)
CFG.firepower={guardian:.62,strider:1,mender:1.1,phantom:1.1};
const fits=(k,sl)=>SIZES[CFG.weapons[k].size].r<=SIZES[sl.z].r;
const wtOf=a=>a.reduce((t,k)=>t+SIZES[CFG.weapons[k].size].wt,0);
// heavier loadouts slow the mech a little (relative to its stock loadout)
const weightMul=(type,a)=>Math.max(.85,Math.min(1.08,1-.03*(wtOf(a)-wtOf(CFG.defSlots[type]))));
// upgrade stats per level (level 1 = base, max 5)
const UPS={mech:{armor:{name:'Armor',per:0.08},speed:{name:'Speed',per:0.04},ability:{name:'Ability',per:0.10}},
 wpn:{dmg:{name:'Damage',per:0.08},rate:{name:'Fire rate',per:0.06},reload:{name:'Reload',per:0.08},range:{name:'Range',per:0.08}}};
const SAVE_KEY='mechArena.save.v2',SAVE_KEY1='mechArena.save.v1';
function freshSave(){return {v:2,coins:0,earned:0,wins:0,lv:{},unlocked:[],paints:['default'],paint:{}};}
let SAVE=freshSave();try{let s=JSON.parse(localStorage.getItem(SAVE_KEY));if(!s){const o=JSON.parse(localStorage.getItem(SAVE_KEY1));if(o&&o.v===1){s=Object.assign(o,{v:2,migrated:1});localStorage.setItem(SAVE_KEY,JSON.stringify(s));}}
 if(s&&s.v===2)SAVE=Object.assign(freshSave(),s);}catch(e){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE));}catch(e){}}
const lvl=(k,s)=>(SAVE.lv[k]&&SAVE.lv[k][s])||1;
const isLocked=k=>k in CFG.econ.locked&&!SAVE.unlocked.includes(k);
const upCost=(k,s)=>{const l=lvl(k,s);return l>=5?0:CFG.econ.upCost[l];};
function buyUp(k,s){const c=upCost(k,s);if(!c||SAVE.coins<c)return false;SAVE.coins-=c;(SAVE.lv[k]=SAVE.lv[k]||{})[s]=lvl(k,s)+1;persist();return true;}
function buyUnlock(k){const c=CFG.econ.locked[k];if(!isLocked(k)||SAVE.coins<c)return false;SAVE.coins-=c;SAVE.unlocked.push(k);persist();return true;}
function buyPaint(k){if(SAVE.paints.includes(k)||SAVE.coins<CFG.econ.paintCost)return false;SAVE.coins-=CFG.econ.paintCost;SAVE.paints.push(k);persist();return true;}
function resetProgress(){SAVE=freshSave();persist();loadout=freshLoadout();saveLoadout();}
// derived (upgraded) stat blocks
function mechAt(k,L){const b=CFG.mechs[k],T=JSON.parse(JSON.stringify(b));T.color=b.color;T.enemyColor=b.enemyColor;const a=L.armor-1,s=L.speed-1,ab=L.ability-1,P=UPS.mech;
 T.hp=Math.round(b.hp*(1+P.armor.per*a));T.speed=+(b.speed*(1+P.speed.per*s)).toFixed(2);
 if(T.shield)T.shield.hp=Math.round(b.shield.hp*(1+P.ability.per*ab));
 if(T.jump)T.jump.cd=+(b.jump.cd*(1-0.08*ab)).toFixed(2);
 if(T.regen)T.regen.rate=Math.round(b.regen.rate*(1+0.12*ab));
 if(T.dash)T.dash.cd=+(b.dash.cd*(1-0.08*ab)).toFixed(2);return T;}
function wpnAt(k,L){const b=CFG.weapons[k],W=Object.assign({},b),P=UPS.wpn;
 W.dmg=+(b.dmg*(1+P.dmg.per*(L.dmg-1))).toFixed(1);W.interval=+(b.interval*(1-P.rate.per*(L.rate-1))).toFixed(4);
 W.reload=+(b.reload*(1-P.reload.per*(L.reload-1))).toFixed(2);
 if(b.homing)W.lockTime=+(b.lockTime*(1-0.10*(L.range-1))).toFixed(2);else W.range=Math.round(b.range*(1+P.range.per*(L.range-1)));return W;}
const levelsOf=(k,kind)=>Object.fromEntries(Object.keys(UPS[kind]).map(s=>[s,lvl(k,s)]));
const upMech=k=>mechAt(k,levelsOf(k,'mech')),upWpn=k=>wpnAt(k,levelsOf(k,'wpn'));
// 0..1 progress of the equipped loadout (for modest enemy scaling)
function progress(){const a=Object.values(levelsOf(loadout.mech,'mech')),b=slotsOf(loadout.mech).flatMap(k=>Object.values(levelsOf(k,'wpn')));return [...a,...b].reduce((s,x)=>s+x-1,0)/((a.length+b.length)*4);}
// paint
const camoTex={};function camo(k){if(camoTex[k])return camoTex[k];const p=CFG.paints[k],c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 const hex=n=>'#'+n.toString(16).padStart(6,'0');g.fillStyle=hex(p.col);g.fillRect(0,0,64,64);let sd=k.length*977;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;
 for(const col of p.camo)for(let i=0;i<9;i++){g.fillStyle=hex(col);g.beginPath();g.ellipse(r()*64,r()*64,4+r()*9,3+r()*6,r()*3,0,7);g.fill();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return camoTex[k]=t;}
function applyPaint(u,k){const p=CFG.paints[k];if(!p||!p.col)return;const m=u.mats[0];m.color.setHex(p.camo?0xffffff:p.col);if(p.camo){m.map=camo(k);}
 if(p.metal!==undefined)m.metalness=p.metal;if(p.rough!==undefined)m.roughness=p.rough;m.needsUpdate=true;}
const paintOf=k=>SAVE.paint[k]||'default';
// match reward
function reward(win,why){const E=CFG.econ,md=settings.mode,mul=md==='duel'?E.duelMul[settings.diff]:1,rows=[];
 rows.push([win?'Victory':'Participation',win?E.win:E.loss]);if(STATS.kills)rows.push([`Kills ×${STATS.kills}`,STATS.kills*E.kill]);
 if(win&&why==='Enemy base captured')rows.push(['Base captured',E.capture]);
 let tot=rows.reduce((s,r)=>s+r[1],0);if(mul!==1){const x=Math.round(tot*mul)-tot;rows.push([`${CFG.diff[settings.diff].name} difficulty ×${mul}`,x]);tot+=x;}
 SAVE.coins+=tot;SAVE.earned+=tot;if(win)SAVE.wins++;persist();return {rows,tot};}
let A=60;// half size (per map)
function tex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);}return t;}
// gradient sky
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
// ================= MAPS (v10) =================
const skyC=document.createElement('canvas');skyC.width=8;skyC.height=256;const skyT=new THREE.CanvasTexture(skyC);skyT.colorSpace=THREE.SRGBColorSpace;
function paintSky(st){const g=skyC.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);st.forEach(([o,c])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,8,256);skyT.needsUpdate=true;}
paintSky([[0,'#1e3a68'],[.35,'#4f7db5'],[.5,'#a9c3dc'],[.53,'#e8dcc0'],[1,'#6b6352']]);
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(200,24,12),new THREE.MeshBasicMaterial({map:skyT,side:THREE.BackSide,fog:false,depthWrite:false}));skyDome.renderOrder=-1;S.add(skyDome);
const sunM=new THREE.Mesh(new THREE.SphereGeometry(6,12,8),new THREE.MeshBasicMaterial({color:0xfff4d0,fog:false}));sunM.position.set(30,50,20).normalize().multiplyScalar(190);skyDome.add(sunM);
let envRT=null;function bakeEnv(){const es=new THREE.Scene();const d=skyDome.clone();d.scale.setScalar(1);d.position.set(0,0,0);es.add(d);const pm=new THREE.PMREMGenerator(R);if(envRT)envRT.dispose();envRT=pm.fromScene(es,0.04);S.environment=envRT.texture;pm.dispose();}
S.background=new THREE.Color(0x8fb4d8);S.fog=new THREE.Fog(0xb9bfc0,50,150);
const groundR=tex(128,128,(g,w,h)=>{g.fillStyle='#ddd';g.fillRect(0,0,w,h);for(let i=0;i<500;i++){const v=150+Math.random()*105|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(Math.random()*w,Math.random()*h,3+Math.random()*8,3+Math.random()*8);}},24);groundR.colorSpace=THREE.NoColorSpace;
const groundMat=new THREE.MeshStandardMaterial({roughnessMap:groundR,roughness:1,metalness:0});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;S.add(ground);
let rnd=Math.random;function seeded(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R2=(a,b)=>a+rnd()*(b-a);
function groundTex(th){return tex(256,256,(g,w,h)=>{g.fillStyle=th.g[0];g.fillRect(0,0,w,h);for(let i=0;i<1100;i++){g.fillStyle=Math.random()<.5?th.g[1]:th.g[2];g.globalAlpha=Math.random()*.18;const r=Math.random()*12;g.fillRect(Math.random()*w,Math.random()*h,r,r*(th.streak||1));}g.globalAlpha=1;
 if(th.lines){g.strokeStyle=th.lines;g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke();}}
 if(th.ripple){g.strokeStyle=th.ripple;g.lineWidth=2;for(let y=0;y<h;y+=14){g.beginPath();for(let x=0;x<=w;x+=8)g.lineTo(x,y+Math.sin(x/20+y)*4);g.stroke();}}});}
const MAPG=new THREE.Group();S.add(MAPG);
const boxG=new THREE.BoxGeometry(1,1,1),pillarG=new THREE.CylinderGeometry(.9,1.1,8,8),rockG=new THREE.DodecahedronGeometry(1,0),domeG=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),cylG=new THREE.CylinderGeometry(1,1,1,12),poleG=new THREE.CylinderGeometry(.12,.15,6,6),bulbG=new THREE.SphereGeometry(.35,8,6);
const obst=[];const obstMeshes=[];// {x,z,hx,hz,h,m}
const winT=tex(64,64,(g,w,h)=>{g.fillStyle='#8a8478';g.fillRect(0,0,w,h);for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.fillStyle=Math.random()<.3?'#ffd98a':'#1d2630';g.fillRect(x*32+8,y*32+8,16,14);}g.fillStyle='#6a655c';g.fillRect(0,30,64,3);});
const crateT=tex(64,64,(g,w,h)=>{g.fillStyle='#8b6a3c';g.fillRect(0,0,w,h);g.strokeStyle='#5a4220';g.lineWidth=6;g.strokeRect(3,3,58,58);g.beginPath();g.moveTo(0,0);g.lineTo(64,64);g.stroke();});
const contT=tex(128,64,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let x=0;x<w;x+=8){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,0,3,h);}});
const rockT=tex(64,64,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let i=0;i<300;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.2})`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*8,1+Math.random()*3);}});
const matCache={};function mat(c,map,o){const key=c+(map?map.uuid:'')+(o?JSON.stringify(o):'');return matCache[key]||(matCache[key]=new THREE.MeshStandardMaterial({color:c,map,roughness:0.85,metalness:0.05,...(o||{})}));}
// instanced batching: every static prop is collected and drawn as one InstancedMesh per (geometry,material)
let batch=new Map();const _o=new THREE.Object3D();
function put(geo,material,x,y,z,sx,sy,sz,ry=0,shadow=true){const k=geo.uuid+material.uuid;let b=batch.get(k);if(!b){b={geo,material,mats:[],shadow,col:[]};batch.set(k,b);}_o.position.set(x,y,z);_o.rotation.set(0,ry,0);_o.scale.set(sx,sy,sz);_o.updateMatrix();b.mats.push(_o.matrix.clone());return b;}
function solid(x,z,w,d,h,material,ry=0,y0=0){const b=put(boxG,material,x,y0+h/2,z,w,h,d,ry);if(ry&&Math.abs(Math.sin(ry))>.7){const t=w;w=d;d=t;}const o={x,z,hx:w/2,hz:d/2,h:y0+h};obst.push(o);b.col.push(o);return o;}
function deco(geo,material,x,y,z,sx,sy,sz,ry){put(geo,material,x,y,z,sx,sy??sx,sz??sx,ry);}
function flushBatch(){for(const b of batch.values()){const im=new THREE.InstancedMesh(b.geo,b.material,b.mats.length);b.mats.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=b.shadow;im.receiveShadow=true;im.computeBoundingSphere();MAPG.add(im);if(b.col.length){b.col.forEach(o=>o.m=im);obstMeshes.push(im);}}batch=new Map();}
function wall(x,z,w,d,h,c=0x8a8a80){return solid(x,z,w,d,h,mat(c));}
const bldMats={};function building(x,z,w,d,h,c=0x8a8478){const k=Math.round(w/3)+'_'+Math.round(h/3)+c;let m=bldMats[k];if(!m){const t=winT.clone();t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.round(w/3),Math.round(h/3));m=bldMats[k]=new THREE.MeshStandardMaterial({map:t,color:new THREE.Color(c).lerp(new THREE.Color(0xffffff),.5),roughness:.8,metalness:.1});}
 solid(x,z,w,d,h,m);deco(boxG,mat(0x4a4a48),x,h+.2,z,w+.4,.4,d+.4);}
function ruin(x,z,len,horiz,c=0x9a8f78){const n=4,seg=len/n;for(let i=0;i<n;i++){const h=1.5+rnd()*3.5,o=-len/2+seg*(i+.5);horiz?solid(x+o,z,seg,1.2,h,mat(c)):solid(x,z+o,1.2,seg,h,mat(c));}}
function crate(x,z,s=2){solid(x,z,s,s,s,mat(0xffffff,crateT));}
function container(x,z,horiz,c,stack=1){for(let i=0;i<stack;i++)horiz?solid(x,z,8,3,3,mat(c,contT),0,i*3):solid(x,z,3,8,3,mat(c,contT),0,i*3);}
function pillar(x,z,c=0x9a9890){deco(pillarG,mat(c),x,4,z,1,1,1);obst.push({x,z,hx:.9,hz:.9,h:8,m:null,pil:1});}
function platform(x,z,w,d){solid(x,z,w,d,1.6,mat(0x7d7a70));deco(boxG,mat(0xc8a030),x,1.9,z-d/2+.15,w,.3,.3);}
function rock(x,z,s,c,h){h=h||s*1.2;deco(rockG,mat(c,rockT),x,h*.45,z,s,h*.6,s,rnd()*6);obst.push({x,z,hx:s*.75,hz:s*.75,h:h*.9,m:null});}
function mesa(x,z,w,d,h,c){solid(x,z,w,d,h,mat(c,rockT));for(let i=0;i<3;i++)deco(rockG,mat(c,rockT),x+R2(-w/2,w/2),R2(.5,h*.5),z+(rnd()<.5?-1:1)*d/2,R2(1.5,3));}
function stairsX(xe,z,dir,w,top){const n=Math.ceil(top/.38);for(let i=1;i<n;i++)solid(xe+dir*(i-.5)*1.3,z,1.3,w,top*(n-i)/n,mat(0x8a6a50,rockT));}
function dome(x,z,r,c){deco(domeG,mat(c,null,{metalness:.3,roughness:.4}),x,0,z,r,r*.8,r);obst.push({x,z,hx:r*.7,hz:r*.7,h:r*.8,m:null});}
function tank(x,z,r,h,c){deco(cylG,mat(c,null,{metalness:.5,roughness:.5}),x,h/2,z,r,h,r);obst.push({x,z,hx:r*.85,hz:r*.85,h,m:null});}
function lamp(x,z,c=0xfff2b0){deco(poleG,mat(0x333333),x,3,z,1,1,1);deco(bulbG,new THREE.MeshBasicMaterial({color:c}),x,6.1,z,1);}
function border(c=0x5a5d62,h=8,trim=0xd0a020){for(const [x,z,w,d] of [[0,-A,A*2,2],[0,A,A*2,2],[-A,0,2,A*2],[A,0,2,A*2]]){wall(x,z,w,d,h,c);deco(boxG,mat(trim),x,h-.5,z,w+.1,.5,d+.1);}}
// reserved zones: keep spawn lanes and bases clear
function free(x,z,r){if(Math.abs(x)>A-r-3||Math.abs(z)>A-r-3)return false;if(Math.abs(x)<14+r&&Math.abs(z)>A-22-r)return false;for(const o of obst)if(Math.abs(x-o.x)<o.hx+r+3&&Math.abs(z-o.z)<o.hz+r+3)return false;return true;}
function scatter(n,r,fn,tries=40){for(let i=0;i<n;i++)for(let t=0;t<tries;t++){const x=R2(-A,A),z=R2(-A,A);if(free(x,z,r)){fn(x,z);break;}}}
function mirror(fn){fn(1);fn(-1);}// point-symmetric layouts for fairness
const MAPS={
 arena:{name:'Arena',A:60,sky:[[0,'#1e3a68'],[.35,'#4f7db5'],[.5,'#a9c3dc'],[.53,'#e8dcc0'],[1,'#6b6352']],bg:0x8fb4d8,fog:[0xb9bfc0,50,150],hemi:[0xcfe0ff,0x5a5040,.7],sun:[0xfff0d8,2.6],
  ground:{g:['#6d6f5e','rgb(40,40,30)','rgb(150,145,120)'],lines:'rgba(30,30,25,.55)'},rep:12,
  build(){border();building(0,0,9,9,10);building(-38,-38,10,8,12);building(38,38,8,10,11);building(-40,36,8,8,9);building(40,-36,9,8,13);
  ruin(-25,-20,12,true);ruin(25,20,12,true);ruin(-25,22,12,false);ruin(25,-22,12,false);
  container(0,-34,true,0xb03a2e);container(0,34,true,0x2e6bb0);container(-44,0,false,0x2e8a4a);container(44,0,false,0xc07a20);
  crate(-12,12);crate(-10,13.5,1.5);crate(12,-12);crate(13.7,-10.5,1.5);crate(14,14);crate(-14,-14);crate(-30,5,2.5);crate(30,-5,2.5);
  pillar(-18,0);pillar(18,0);pillar(0,-18);pillar(0,18);platform(-12,-36,6,4);platform(12,36,6,4);
  for(const [x,z] of [[-20,-45],[20,-45],[-20,45],[20,45],[-50,-20],[50,20],[-50,20],[50,-20]])lamp(x,z);}},
 desert:{name:'Desert Outpost',A:85,sky:[[0,'#3b6fb0'],[.4,'#8bb6dd'],[.5,'#f2dcb0'],[.53,'#e6c48a'],[1,'#a07a48']],bg:0xe8d2a8,fog:[0xe6cfa0,60,175],hemi:[0xfff0d0,0x9a7040,.8],sun:[0xffe6b8,3],
  ground:{g:['#c9a46a','rgb(150,110,60)','rgb(240,210,150)'],ripple:'rgba(140,100,50,.25)'},rep:16,
  build(){border(0xb08a58,7,0x7a5a30);mirror(s=>{mesa(s*32,s*-10,16,12,9,0xb06a3a);mesa(s*-45,s*30,12,18,11,0xa8643a);mesa(s*8,s*38,10,8,6,0xb87444);
   solid(s*-22,s*-30,10,5,2.6,mat(0x8a8060));solid(s*22,s*14,5,10,2.6,mat(0x8a8060));// bunkers
   ruin(s*55,s*-45,14,false,0xc0a070);container(s*-60,s*-8,false,0x9a6a30);platform(s*14,s*-58,7,4);
   for(const [x,z] of [[-10,0],[10,0]])solid(s*x,s*z+s*8,6,2,1.6,mat(0x9a8a60));});
   solid(0,0,8,8,5,mat(0x8a7a58));deco(boxG,mat(0x5a4a30),0,5.3,0,9,.6,9);
   scatter(16,2,(x,z)=>rock(x,z,R2(1.6,3.2),0xa86c40));scatter(10,1.2,(x,z)=>crate(x,z,R2(1.5,2.4)));
   for(let i=0;i<14;i++){const x=R2(-A,A),z=R2(-A,A);deco(domeG,mat(0xd8b47a),x,-.15,z,R2(4,9),R2(.3,.55),R2(4,9),rnd()*3);}}},
 city:{name:'Ruined City',A:80,sky:[[0,'#3a3e48'],[.4,'#6a6e76'],[.5,'#a09a90'],[.53,'#8a847a'],[1,'#3e3a36']],bg:0x8a8a88,fog:[0x8f8c86,35,135],hemi:[0xc8ccd8,0x4a4440,.75],sun:[0xffe8d0,2],
  ground:{g:['#4a4c50','rgb(30,30,32)','rgb(110,110,105)'],lines:'rgba(220,200,90,.5)'},rep:14,
  build(){border(0x4a4c52,10,0x9a2020);// city blocks with streets every 32 m, alleys inside
   for(const bx of [-48,-16,16,48])for(const bz of [-36,-4,28]){if(Math.abs(bx)<20&&Math.abs(bz)>30)continue;const n=1+(rnd()*2|0);
    for(let i=0;i<n;i++){const w=R2(7,11),d=R2(7,11),ox=n>1?(i?5:-5):R2(-2,2);const x=bx+ox,z=bz+R2(-3,3);if(!free(x,z,Math.max(w,d)/2-3))continue;
     rnd()<.25?(ruin(x,z,w,true,0x7a7470),ruin(x,z+d/2,d,false,0x7a7470)):building(x,z,w,d,R2(10,24),[0x9a9490,0x7a6e66,0x8a8a92][rnd()*3|0]);}}
   scatter(26,1.5,(x,z)=>{const r=rnd();r<.45?deco(rockG,mat(0x6a6660,rockT),x,.4,z,R2(1,2.2),R2(.5,1),R2(1,2.2)):r<.7?solid(x,z,R2(3,6),1.2,R2(1,2.2),mat(0x77706a),rnd()<.5?0:Math.PI/2):container(x,z,rnd()<.5,0x8a3a2a);});
   scatter(10,1,(x,z)=>{solid(x,z,4,2,1.4,mat(0x3a5a7a));deco(boxG,mat(0x222222),x,1.6,z,3.4,.6,1.6);});// wrecked cars
   for(const x of [-64,-32,0,32,64])for(const z of [-60,60])if(Math.abs(x)>20)lamp(x,z,0xffc070);}},
 port:{name:'Industrial Port',A:90,sky:[[0,'#24466e'],[.4,'#6b90b8'],[.5,'#c8d4dc'],[.53,'#9aa6ae'],[1,'#3a4650']],bg:0xa8b8c4,fog:[0xa6b4bc,45,165],hemi:[0xd0e0f0,0x405060,.8],sun:[0xfff4e0,2.4],
  ground:{g:['#7a7c78','rgb(50,52,50)','rgb(140,140,130)'],lines:'rgba(40,40,40,.45)'},rep:18,
  build(){for(const [x,z,w,d] of [[0,-A,A*2,2],[0,A,A*2,2],[-A,0,2,A*2]]){wall(x,z,w,d,8,0x5a6068);deco(boxG,mat(0xe0b020),x,7.5,z,w+.1,.5,d+.1);}
   solid(A,0,2,A*2,1.2,mat(0x44403a));for(let z=-A+6;z<A;z+=12)deco(cylG,mat(0x222222),A-1.5,.8,z,.4,1.6,.4);// quay edge + bollards
   const wat=new THREE.Mesh(new THREE.PlaneGeometry(160,A*2+200),new THREE.MeshStandardMaterial({color:0x1d4a66,roughness:.15,metalness:.6}));wat.rotation.x=-Math.PI/2;wat.position.set(A+80,-.6,0);MAPG.add(wat);
   const cc=[0xb03a2e,0x2e6bb0,0x2e8a4a,0xc07a20,0x6a4a8a,0x8a8a8a];
   mirror(s=>{for(let r=0;r<3;r++)for(let c=0;c<2;c++){const x=s*(20+c*10+R2(-1,1)),z=s*(-20+r*16);if(rnd()<.85)container(x,z,false,cc[rnd()*6|0],1+(rnd()<.4));}
    building(s*-55,s*-45,22,14,12,0x8a8a92);building(s*-60,s*35,16,22,10,0x7a8088);
    for(let i=0;i<3;i++)container(s*(-24-i*9),s*48,true,cc[rnd()*6|0]);platform(s*45,s*55,8,4);tank(s*65,s*-62,4,7,0xc8c8c0);});
   for(const z of [-30,30]){for(const dx of [-3,3])for(const dz of [-3,3])solid(70+dx,z+dz,1,1,18,mat(0xd0a020,null,{metalness:.6,roughness:.5}));deco(boxG,mat(0xd0a020),70-6,19,z,30,1.4,1.6);}// cranes
   scatter(14,1.2,(x,z)=>crate(x,z,R2(1.5,2.5)));for(const z of [-75,-25,25,75])lamp(80,z);}},
 arctic:{name:'Arctic Base',A:80,sky:[[0,'#5a7aa0'],[.4,'#a8c0d8'],[.5,'#e8f0f8'],[.53,'#dfe8f0'],[1,'#b0c0cc']],bg:0xd8e4ee,fog:[0xdce6ee,30,125],hemi:[0xe8f0ff,0x8090a0,.95],sun:[0xf0f6ff,2.2],
  ground:{g:['#e4ecf2','rgb(170,190,205)','rgb(255,255,255)'],streak:.3},rep:14,
  build(){border(0x8a9aa8,7,0x2a7ac0);mirror(s=>{dome(s*-30,s*-20,8,0xe0e4e8);dome(s*40,s*8,6,0xd0d8e0);dome(s*-50,s*45,5,0xe0e4e8);
   building(s*15,s*-40,14,8,7,0x8a98a8);solid(s*-15,s*25,12,3,3,mat(0x5a6a7a));tank(s*55,s*-35,3,6,0xb04030);
   container(s*-62,s*-5,false,0x2a6aa0);platform(s*30,s*45,7,4);});
   pillar(-12,0,0xc0d0dc);pillar(12,0,0xc0d0dc);solid(0,0,4,14,4,mat(0xa8c8e0,rockT,{roughness:.2,metalness:.1}));
   scatter(22,2,(x,z)=>rock(x,z,R2(1.6,3.5),0xb8d8ec));for(let i=0;i<12;i++){const x=R2(-A,A),z=R2(-A,A);deco(domeG,mat(0xf4f8fc),x,-.15,z,R2(4,10),R2(.3,.55),R2(4,10));}
   for(const [x,z] of [[-25,-60],[25,60],[-60,0],[60,0]])lamp(x,z,0xa0e0ff);}},
 canyon:{name:'Canyon Valley',A:95,sky:[[0,'#2c5a96'],[.4,'#7aa6d0'],[.5,'#f0c8a0'],[.53,'#c08060'],[1,'#6a3a24']],bg:0xd0a888,fog:[0xd4a888,55,180],hemi:[0xffe0c8,0x6a3a24,.8],sun:[0xffd8b0,2.8],
  ground:{g:['#a8683e','rgb(110,60,30)','rgb(200,140,90)'],streak:.4},rep:18,
  build(){border(0x8a4a2a,14,0x5a2a14);// canyon walls lining the valley, two raised plateaus with stairs + bridges
   mirror(s=>{for(let i=0;i<6;i++){const z=-A+15+i*31;mesa(s*(A-12),z,R2(10,16),R2(16,24),R2(10,16),0x9a5430);}
    solid(s*-30,s*-25,24,16,2.4,mat(0x9a5a34,rockT));stairsX(s*-18,s*-25,s,6,2.4);stairsX(s*-42,s*-25,-s,6,2.4);
    solid(s*-30,s*0.5,4,35,2.4,mat(0x6a4a30));for(let k=-1;k<=1;k+=2)deco(boxG,mat(0x3a2a1a),s*-30+k*2,2.9,s*0.5,.2,1,35);// bridge/causeway
    solid(s*-30,s*24,16,12,2.4,mat(0x9a5a34,rockT));stairsX(s*-22,s*24,s,5,2.4);mesa(s*15,s*-50,12,10,8,0xa05a34);mesa(s*30,s*30,10,14,9,0xa05a34);
    ruin(s*10,s*20,12,true,0xb07a50);container(s*45,s*-5,false,0x6a6a5a);});
   solid(0,0,10,4,3,mat(0x8a5a3a,rockT));scatter(22,2,(x,z)=>rock(x,z,R2(1.6,3.4),0xa06038));scatter(8,1.2,(x,z)=>crate(x,z,2));}}
};
const MAP_KEYS=Object.keys(MAPS);let MAP=null,mapKey=null;const HEMI=S.children.find(o=>o.isHemisphereLight);
function applyDraw(){const f=MAP.fog,k=settings.gfx==='low'?.72:1;S.fog.near=f[1]*k;S.fog.far=f[2]*k;C.far=S.fog.far+15;C.updateProjectionMatrix();skyDome.scale.setScalar(C.far*.9/200);}
function loadMap(key,seed){const m=MAPS[key];mapKey=key;MAP=m;A=m.A;rnd=seeded(seed??(Math.random()*1e9|0));
 for(const c of [...MAPG.children]){MAPG.remove(c);if(c.isInstancedMesh)c.dispose();}obst.length=0;obstMeshes.length=0;
 paintSky(m.sky);S.background.setHex(m.bg);S.fog.color.setHex(m.fog[0]);HEMI.color.setHex(m.hemi[0]);HEMI.groundColor.setHex(m.hemi[1]);HEMI.intensity=m.hemi[2];dl.color.setHex(m.sun[0]);dl.intensity=m.sun[1];
 if(groundMat.map)groundMat.map.dispose();groundMat.map=groundTex(m.ground);groundMat.map.repeat.set(m.rep,m.rep);groundMat.needsUpdate=true;ground.scale.set(A*2,A*2,1);
 m.build();flushBatch();
 // non-batched collision shapes (rocks/domes/tanks/pillars) still need ray targets: map them to their instanced mesh by proximity is overkill; use invisible proxy boxes merged in one InstancedMesh
 const px=obst.filter(o=>!o.m);if(px.length){const im=new THREE.InstancedMesh(boxG,new THREE.MeshBasicMaterial({visible:false}),px.length);px.forEach((o,i)=>{_o.position.set(o.x,o.h/2,o.z);_o.rotation.set(0,0,0);_o.scale.set(o.hx*2,o.h,o.hz*2);_o.updateMatrix();im.setMatrixAt(i,_o.matrix);o.m=im;});im.computeBoundingSphere();MAPG.add(im);obstMeshes.push(im);}
 const bz=A-13;CFG.capture.bases={b:[0,bz],r:[0,-bz]};if(typeof BASES!=='undefined')for(const [t,[x,z]] of Object.entries(CFG.capture.bases)){const b=BASES[t];if(b){b.x=x;b.z=z;b.g.position.set(x,0,z);}}
 bakeEnv();applyDraw();return m;}

function blocked(x,z,r,y=0){for(const o of obst)if(o.h>y+0.4&&Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r)return o;return null;}
function groundAt(x,z,y){let g=0;for(const o of obst)if(o.h<=y+0.45&&o.h>g&&Math.abs(x-o.x)<o.hx+.5&&Math.abs(z-o.z)<o.hz+.5)g=o.h;return g;}
function los(a,b){const d=b.clone().sub(a),L=d.length(),n=Math.ceil(L/1.5);for(let i=1;i<n;i++){const p=a.clone().addScaledVector(d,i/n);for(const o of obst)if(p.y<o.h&&Math.abs(p.x-o.x)<o.hx&&Math.abs(p.z-o.z)<o.hz)return false;}return true;}
// ---------- shared mech geometry/materials ----------
const TM={p:{stripe:M(0xf0f0f0),visor:new THREE.MeshBasicMaterial({color:0x40e0ff})},e:{stripe:M(0x111111),visor:new THREE.MeshBasicMaterial({color:0xff4020})}};
const shieldMat=new THREE.MeshBasicMaterial({color:0x60d8ff,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide});
const jetMat=new THREE.MeshBasicMaterial({color:0xffa030}),coreMat=new THREE.MeshBasicMaterial({color:0x60ff90}),coilMat=new THREE.MeshBasicMaterial({color:0x50c0ff});
const thrG=new THREE.CylinderGeometry(.3,.38,1.2,8),coreG=new THREE.SphereGeometry(.32,8,6),ringG=new THREE.TorusGeometry(.6,.07,4,12),coilG=new THREE.TorusGeometry(.3,.06,4,10),shieldG=new THREE.CylinderGeometry(3,3,4,10,1,true,-0.75,1.5);
// ---------- mech builder v11: per-frame structure (legs/arms/hardpoints/detail). team 'b'|'r', type key, weapon key ----------
const TMK={b:'p',r:'e'};
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const cableG=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0,0,0),V3(.12,-.3,-.12),V3(.05,-.65,-.1),V3(0,-.85,0)]),8,.045,4);
const ventGT=tex(64,32,(g,w,h)=>{g.fillStyle='#222';g.fillRect(0,0,w,h);g.fillStyle='#555';for(let y=3;y<h;y+=6)g.fillRect(3,y,w-6,2);});
const ventMat=new THREE.MeshStandardMaterial({map:ventGT,metalness:.7,roughness:.5});
const cableMat=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.6,metalness:.2});
const decalMats={};function decalMat(team,type){const k=team+type;if(decalMats[k])return decalMats[k];
 const t=tex(128,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.save();g.beginPath();g.rect(0,0,52,h);g.clip();for(let i=-4;i<10;i++){g.fillStyle=i%2?'#111':'#f0c020';g.beginPath();g.moveTo(i*14,0);g.lineTo(i*14+14,0);g.lineTo(i*14-18,h);g.lineTo(i*14-32,h);g.fill();}g.restore();
  g.fillStyle=team==='b'?'#e8f4ff':'#ffe0d8';g.font='bold 40px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText({guardian:'G-01',strider:'S-27',mender:'M-09',phantom:'P-X'}[type],90,34);});
 return decalMats[k]=new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.6,metalness:.2,polygonOffset:true,polygonOffsetFactor:-2});}
const planeG=new THREE.PlaneGeometry(1,1),droneG=new THREE.OctahedronGeometry(.32,0),rotorG=new THREE.TorusGeometry(.38,.04,4,12),dishG=new THREE.CylinderGeometry(.45,.1,.18,10),clawG=new THREE.ConeGeometry(.12,.55,4);
// leg specs: x/z hip offset, hx/hz foot home offset (lower-local), l1/l2 bone lengths, rev = reverse (digitigrade) knee, grp = gait group (legs in a group step together), w = thickness
const FRAMES={
 guardian:{legs:[{x:-1.15,z:.95,hx:-1.75,hz:1.35,grp:0},{x:1.15,z:-.95,hx:1.75,hz:-1.35,grp:0,rev:1},{x:1.15,z:.95,hx:1.75,hz:1.35,grp:1},{x:-1.15,z:-.95,hx:-1.75,hz:-1.35,grp:1,rev:1}].map(l=>({...l,l1:1.05,l2:1.3,w:1.15})),
  tw:[3.0,1.35,2.5],hips:[2.5,.6,2.2]},
 strider:{legs:[-1,1].map((s,i)=>({x:s*.8,z:0,hx:s*.95,hz:.1,grp:i,l1:1.0,l2:1.55,rev:1,w:.8})),tw:[1.8,1.2,1.7],hips:[1.7,.45,.9]},
 mender:{legs:[-1,1].map((s,i)=>({x:s*.95,z:0,hx:s*1.05,hz:.15,grp:i,l1:1.2,l2:1.2,w:1.2})),tw:[2.0,1.9,1.7],hips:[2.1,.55,1.1]},
 phantom:{legs:[-1,1].map((s,i)=>({x:s*.7,z:0,hx:s*.8,hz:.1,grp:i,l1:1.28,l2:1.22,w:.7})),tw:[1.7,1.05,2.1],hips:[1.5,.4,.8]}};
function mech(team,type,slots){const T=CFG.mechs[type],F=FRAMES[type];const col=team==='b'?T.color:T.enemyColor;const hi=typeof settings==='undefined'||settings.gfx!=='low';
 const g=new THREE.Group(),m=M(col,{metal:.45,rough:.55}),dk=M(0x2a2a2c,{metal:.7,rough:.5}),tm=TM[TMK[team]],lm=team==='b'?LIGHT_B:LIGHT_R;
 const add=(par,geo,mt,sx,sy,sz,x,y,z,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geo,mt);o.scale.set(sx,sy,sz);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);par.add(o);return o;};
 const grp=(par,x,y,z)=>{const o=new THREE.Group();o.position.set(x,y,z);par.add(o);return o;};
 const lower=new THREE.Group();g.add(lower);const legs=[],jm=M(0x8a8d90,{metal:.9,rough:.3}),rod=M(0xd0d4d8,{metal:1,rough:.15});const jets=[];
 // ---- legs ----
 for(const d of F.legs){const s=Math.sign(d.x),w=d.w,rv=d.rev?-1:1;const hipJ=new THREE.Group();hipJ.rotation.order='ZXY';hipJ.position.set(d.x,LEG.hipY,d.z);add(hipJ,jointG,jm,w,w,w,0,0,0);
  add(hipJ,boxG,dk,.45*w,d.l1,.55*w,0,-d.l1/2,0);const thA=add(hipJ,boxG,m,.55*w,d.l1*.6,.2,0,-d.l1*.4,.33*rv);
  add(hipJ,pistonG,jm,1.6,.55,1.6,s*.32*w,-d.l1*.3,-.38*rv);const prod=add(hipJ,pistonG,rod,1,1,1,s*.32*w,-d.l1*.75,-.38*rv);
  if(hi)add(hipJ,cableG,cableMat,1,d.l1,1,-s*.3*w,-.05,-.2*rv);
  const knee=grp(hipJ,0,-d.l1,0);add(knee,jointG,jm,w,w,w,0,0,0);
  add(knee,boxG,m,.55*w,d.l2,.65*w,0,-d.l2/2,0);const pis2=add(knee,pistonG,rod,1,1,1,0,-d.l2/2,.4*rv);
  if(d.rev){add(knee,boxG,dk,.35*w,.5,.5,0,.1,-.35);add(knee,boxG,m,.62*w,.25,.75*w,0,-d.l2*.8,0);}// reverse-knee spur + calf band
  if(hi)add(knee,boxG,lm,.08,.08,.04,0,-d.l2*.25,.34*w*rv+.02*rv);
  const ank=new THREE.Group();ank.rotation.order='ZXY';ank.position.y=-d.l2;add(ank,jointG,jm,.8*w,.8*w,.8*w,0,0,0);knee.add(ank);
  if(type==='strider'){for(const a of[-.45,0,.45])add(ank,clawG,dk,1,1,1,Math.sin(a)*.35,-.25,.35+Math.cos(a)*.15,Math.PI/2,0,0);add(ank,clawG,dk,.8,.8,.8,0,-.25,-.45,-Math.PI/2,0,0);add(ank,boxG,m,.5,.2,.6,0,-.15,.05);
   const j=add(knee,flashG,jetMat,.7,1,.7,0,-d.l2*.55,-.45);j.rotation.x=Math.PI;j.visible=false;jets.push(j);add(knee,thrG,MS.metal,.5,.5,.5,0,-d.l2*.4,-.45);}
  else if(type==='guardian'){add(ank,cylG,dk,.55,.3,.55,0,-.22,0);add(ank,boxG,m,1.2,.12,1.2,0,-.05,0);}// elephant pad foot
  else if(type==='phantom'){add(ank,boxG,dk,.35,LEG.foot,1.5,0,-LEG.foot/2-.1,.25);add(ank,boxG,m,.38,.1,.5,0,-.05,.95,-.3,0,0);}
  else{add(ank,boxG,dk,.9,LEG.foot,1.4,0,-LEG.foot/2-.1,.2);add(ank,boxG,m,.92,.12,.4,0,-.05,.75);}
  lower.add(hipJ);legs.push({hip:hipJ,knee,ank,prod,pis2,thA,thV:0,thR:0,s,hx:d.hx,hz:d.hz,l1:d.l1,l2:d.l2,rev:!!d.rev,grp:d.grp,foot:new THREE.Vector3(),from:new THREE.Vector3(),to:new THREE.Vector3(),sw:-1,dur:.3});}
 const hp=F.hips;add(lower,boxG,dk,hp[0],hp[1],hp[2],0,LEG.hipY,0);if(hi)add(lower,boxG,ventMat,hp[0]*.5,.05,hp[2]*.5,0,LEG.hipY+hp[1]/2+.01,0);
 // ---- torso ----
 const top=new THREE.Group();top.position.y=2.6;g.add(top);const tw=F.tw,cy=.8,tY=cy+tw[1]/2;
 const pads=[],arms=[],drones=[];let shield=null,vent,antP,coreM=null;
 if(type==='guardian'){// heavy hull: slab torso, sloped glacis, side skirts, low turret head
  add(top,boxG,m,tw[0],tw[1],tw[2],0,cy,0);add(top,boxG,m,tw[0]*.9,.9,.7,0,cy+.15,tw[2]/2+.2,-.6,0,0);add(top,boxG,dk,tw[0]*.7,.5,.3,0,cy-.45,tw[2]/2+.1);
  add(top,boxG,tm.stripe,tw[0]+.05,.16,tw[2]+.05,0,tY-.15,0);for(const s of[-1,1])add(top,boxG,m,.25,1.0,tw[2]*.9,s*(tw[0]/2+.12),cy-.2,0,0,0,s*.12);
  add(top,boxG,dk,1.3,.5,1.0,0,tY+.25,.35);add(top,boxG,tm.visor,1.1,.14,.05,0,tY+.3,.86);vent=add(top,boxG,ventMat,1.6,.12,.8,0,tY+.01,-.7);
  for(const s of[-1,1]){const pv=grp(top,s*(tw[0]/2+.1),tY+.05,0);add(pv,boxG,m,1.2,.5,1.9,s*.15,.15,0,0,0,s*-.25);pads.push(pv);}
  // shield arm (left): shoulder joint + strut + heavy plate on a lag pivot
  const sa=grp(top,-tw[0]/2-.35,cy+.2,.2);add(sa,jointG,jm,1.3,1.3,1.3,0,0,0);add(sa,boxG,dk,.35,.35,1.2,-.25,0,.2);
  const sp=add(sa,boxG,m,.25,2.3,2.4,-.62,-.35,.45);add(sa,boxG,tm.stripe,.27,.2,2.42,-.62,.6,.45);if(hi){const dc=add(sa,planeG,decalMat(team,type),1.6,.8,1,-.76,-.45,.45,0,-Math.PI/2,0);}
  arms.push({pv:sa,kind:'shield'});
  shield=add(top,shieldG,shieldMat,1.15,1,1.15,0,.8,0);shield.visible=false;}
 else if(type==='strider'){// hunched predator cockpit, forward nose, dorsal jet pack
  add(top,boxG,m,tw[0],tw[1],tw[2],0,cy,0);add(top,boxG,m,1.3,.7,1.1,0,cy-.05,tw[2]/2+.45,.25,0,0);add(top,boxG,tm.visor,1.0,.16,.05,0,cy+.12,tw[2]/2+1.0,.25,0,0);
  add(top,boxG,tm.stripe,.3,tw[1]+.05,tw[2]+.05,0,cy,0);add(top,boxG,dk,1.2,.6,.8,0,cy+.1,-tw[2]/2-.3);vent=add(top,boxG,ventMat,.8,.1,.6,0,cy+.41,-tw[2]/2-.3);
  for(const s of[-1,1]){add(top,thrG,MS.metal,1,1,1,s*.55,cy-.1,-tw[2]/2-.55);const j=add(top,flashG,jetMat,1.2,1.4,1.2,s*.55,cy-1.1,-tw[2]/2-.55,Math.PI,0,0);j.visible=false;jets.unshift(j);
   const pv=grp(top,s*(tw[0]/2+.05),tY,0);add(pv,boxG,m,.6,.3,1.1,s*.1,.1,0,0,0,s*-.4);pads.push(pv);}}
 else if(type==='mender'){// tall support frame: rounded core, repair core + ring, sensor mast, two manipulator arms, repair drones
  add(top,cylG,m,tw[0]/2,tw[1],tw[0]/2,0,cy+.1,0);add(top,boxG,m,tw[0]*.85,.6,tw[2],0,cy-.6,0);add(top,boxG,tm.stripe,tw[0]+.02,.15,.4,0,cy+.55,0);
  coreM=add(top,coreG,coreMat,1.1,1.1,1.1,0,cy+.1,tw[2]/2+.1);add(top,ringG,coreMat,1.1,1.1,1.1,0,cy+.1,tw[2]/2+.1);
  add(top,boxG,dk,.9,.5,.5,0,tY+.4,.45);add(top,boxG,tm.visor,.7,.14,.05,0,tY+.45,.71);vent=add(top,boxG,ventMat,1.2,.1,.6,0,tY+.12,-.55);
  for(const s of[-1,1]){const pv=grp(top,s*(tw[0]/2+.05),tY+.05,0);add(pv,boxG,m,.7,.35,1.1,s*.1,.1,0,0,0,s*-.3);pads.push(pv);
   // manipulator arm: shoulder -> upper -> elbow -> forearm -> tool (spinning welder)
   const sh=grp(top,s*.75,cy+.2,-.55);add(sh,jointG,jm,.8,.8,.8,0,0,0);add(sh,boxG,dk,.22,.22,1.0,0,0,.5);const el=grp(sh,0,0,1.0);add(el,jointG,jm,.6,.6,.6,0,0,0);add(el,boxG,m,.2,.2,.9,0,0,.45);
   const tool=grp(el,0,0,.95);add(tool,clawG,MS.metal,1,1,1,0,0,.1,Math.PI/2,0,0);const tl=add(tool,boxG,coreMat,.12,.12,.12,0,0,.42);arms.push({sh,el,tool,tl,s,kind:'tool'});}
  for(let i=0;i<2;i++){const dr=grp(g,0,4.5,0);add(dr,droneG,m,1,.6,1,0,0,0);add(dr,rotorG,MS.metal,1,1,1,0,.15,0,Math.PI/2,0,0);add(dr,coreG,coreMat,.35,.35,.35,0,-.15,0);drones.push({g:dr,ph:i*Math.PI,p:new THREE.Vector3()});}}
 else{// phantom: lean wedge, canopy, swept fins, twin dash thrusters
  add(top,boxG,m,tw[0],tw[1],tw[2],0,cy,0);add(top,boxG,m,tw[0]*.7,.6,1.1,0,cy+.1,tw[2]/2+.4,0,0,0).rotation.x=.35;
  add(top,boxG,tm.visor,.9,.35,.7,0,tY+.05,.35,-.3,0,0);add(top,boxG,tm.stripe,tw[0]+.04,.1,tw[2]+.04,0,cy-.2,0);vent=add(top,boxG,ventMat,.8,.08,.6,0,tY+.01,-.6);
  for(const s of[-1,1]){add(top,boxG,m,.1,.9,1.3,s*.65,1.6,-.7,0,0,s*.5);add(top,boxG,lm,.05,.6,.06,s*.82,1.7,-.1,0,0,s*.5);
   add(top,thrG,MS.metal,.8,.8,.8,s*.55,.55,-1.15,Math.PI/2,0,0);const j=add(top,flashG,jetMat,1,1.6,1,s*.55,.55,-1.8,-Math.PI/2,0,0);j.visible=false;jets.push(j);
   const pv=grp(top,s*(tw[0]/2),tY,0);add(pv,boxG,m,.45,.2,1.0,s*.05,.05,0,0,0,s*-.5);pads.push(pv);}}
 // shared detail: running lights, cables, side decal
 for(const s of[-1,1])add(top,boxG,lm,.12,.12,.06,s*tw[0]*.36,cy+tw[1]*.25,tw[2]/2+.05+(type==='strider'?.0:0));
 if(hi){for(const s of[-1,1])add(top,cableG,cableMat,1,.8,1,s*tw[0]*.3,tY,-tw[2]/2+.1,0,0,0);if(type!=='guardian')add(top,planeG,decalMat(team,type),.9,.45,1,tw[0]/2+.01,cy,-.1,0,Math.PI/2,0);
  add(top,boxG,dk,tw[0]*.6,.08,.08,0,cy-tw[1]/2+.1,tw[2]/2+.02);}
 antP=new THREE.Group();antP.position.set(type==='mender'?.55:.6,tY+(type==='mender'?.5:.1),-.5);top.add(antP);add(antP,antG,MS.metal,1,type==='mender'?1.8:1,1,0,type==='mender'?1.1:.65,0);
 add(antP,jointG,tm.visor,.25,.25,.25,0,type==='mender'?2.25:1.3,0);if(type==='mender')add(antP,dishG,MS.metal,1,1,1,0,1.5,0,.5,0,0);
 // ---- weapon hardpoints (CFG.slots order); each mount builds its own weapon model, scaled by size ----
 const guns=[],flash=[],spinners=[],kickers=[];const MZ={minigun:2.0,railgun:3.0,hornet:.9,shotgun:1.7};let coil=null;
 if(typeof slots==='string')slots=CFG.slots[type].map(()=>slots);
 CFG.slots[type].forEach((sl,i)=>{const s=sl.s,k=slots[i]||CFG.defSlots[type][i],Wd=CFG.weapons[k],wpn=Wd.fam,z=Wd.size,sc=SIZES[z].sc,big=z==='L',sm=z==='S';let x,y,z0;
  if(type==='guardian'&&sl.z==='S'){x=s*.95;y=tY+.85;z0=-.25;add(top,boxG,dk,.5,.6,.5,x,tY+.35,z0);}
  else{x=s*(tw[0]/2+(type==='guardian'?.75:.35)+(big?.12:0));y=type==='strider'?.55:.7;z0=type==='guardian'?.25:0;if(type==='guardian'&&s<0)x=-tw[0]/2-.35-(big?.1:0);
   add(top,jointG,jm,.9,.9,.9,s*(tw[0]/2+.05),y+.05,z0);if(type!=='guardian'||s>0)add(top,boxG,dk,.6,.3,.3,s*(tw[0]/2+.15),y+.05,z0);}
  const pv=new THREE.Group();pv.position.set(x,y,z0);const kb=new THREE.Group();kb.scale.setScalar(sc);pv.add(kb);kickers.push(kb);let spn=null,cm=null;
  if(wpn==='minigun'){add(kb,boxG,dk,.6,.6,big?1.3:.9,0,0,.1);spn=new THREE.Group();spn.position.z=1.2;kb.add(spn);spinners.push(spn);const nb=big?6:3;
   for(let j=0;j<nb;j++){const a=j*Math.PI*2/nb,r=big?.2:.15,bb=add(spn,barrelG,MS.metal,.6,sm?.8:1.1,.6,Math.cos(a)*r,Math.sin(a)*r,0);bb.rotation.x=Math.PI/2;}
   if(big)add(kb,cylG,dk,.32,.25,.32,0,0,.75,Math.PI/2,0,0);if(hi&&!sm)add(kb,boxG,M(0x5a5030),.25,.35,.5,s*.4,-.1,0);}
  else if(wpn==='railgun'){cm=new THREE.MeshStandardMaterial({color:0x2a5070,emissive:0x50c0ff,emissiveIntensity:.2,metalness:.5,roughness:.3});coil=coil||cm;
   add(kb,boxG,dk,.45,.6,1.3,0,0,.1);const bb=add(kb,barrelG,MS.metal,1.3,sm?1.4:2,1.3,0,0,sm?1.3:1.7);bb.rotation.x=Math.PI/2;for(const zz of(big?[1.0,1.5,2.0]:sm?[1.0]:[1.1,1.8]))add(kb,coilG,cm,1,1,1,0,0,zz);
   if(big){add(kb,boxG,dk,.7,.25,1.6,0,.42,.3);add(kb,boxG,lm,.08,.08,.5,0,.56,.3);}}
  else if(wpn==='shotgun'){add(kb,boxG,dk,.6,.55,1.1,0,0,.1);const bx=big?[-.2,0,.2]:sm?[0]:[-.14,.14];for(const xx of bx){const bb=add(kb,barrelG,MS.metal,1.5,sm?.8:1.2,1.5,xx,0,sm?.8:1.1);bb.rotation.x=Math.PI/2;}add(kb,boxG,MS.metal,.5,.12,.5,0,-.3,.9);}
  else{const n=big?3:2,rows=sm?1:2;add(kb,boxG,M(0x665544),.45*n,.42*rows+.05,1.1,0,.1,.1);for(let r=0;r<rows;r++)for(let c=0;c<n;c++){const tb=add(kb,tubeG,MS.dark,1,1,1,(c-(n-1)/2)*.4,.1+(r-(rows-1)/2)*.4,.68);tb.rotation.x=Math.PI/2;}}
  const fl=add(pv,flashG,MS.flash,sc,sc,sc,0,0,(MZ[wpn]+.4)*sc);fl.rotation.x=-Math.PI/2;fl.visible=false;flash.push(fl);pv.userData={mz:MZ[wpn]*sc,spin:spn,coil:cm};top.add(pv);guns.push(pv);});
 const mz0=1;
 g.traverse(o=>{if(o.isMesh&&o.material!==shieldMat&&o.material!==jetMat&&o.material!==MS.flash&&o.material!==cableMat&&!(o.material.transparent))o.castShadow=hi||o.geometry===boxG;});
 S.add(g);return{g,lower,legs,top,guns,flash,spinners,kickers,shield,jets,pads,arms,drones,coreM,antP,vent,coil,mz:mz0,mats:[m,dk],flashT:0,smokeT:0,legYaw:0,tYaw:0,tYawV:0,gp:0};}
const LIGHT_B=new THREE.MeshBasicMaterial({color:0x60d0ff}),LIGHT_R=new THREE.MeshBasicMaterial({color:0xff5040});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function turn(cur,tgt,rate,dt){const d=wrap(tgt-cur);return cur+Math.sign(d)*Math.min(Math.abs(d),rate*dt);}
// ---------- locomotion: inertia, world-planted feet with 2-bone IK, weight shift, secondary motion ----------
const _v=new THREE.Vector3(),_w=new THREE.Vector3(),_h=new THREE.Vector3();
const L1=LEG.L1,L2=LEG.L2;
function homeOf(u,L,out){const p=u.g.position,ly=u.legYaw;const c=Math.cos(ly),n=Math.sin(ly);return out.set(p.x+c*L.hx+n*L.hz,p.y,p.z-n*L.hx+c*L.hz);}
function initFeet(u){for(const L of u.legs){homeOf(u,L,L.foot);L.sw=-1;}}
function ik(u,L){// ankle target in lower-local space -> hip roll/pitch + knee bend, ankle keeps foot flat
 _v.set(L.foot.x,L.foot.y+LEG.foot+0.1,L.foot.z);u.lower.worldToLocal(_v);_v.sub(L.hip.position);
 const L1=L.l1,L2=L.l2,rv=L.rev?-1:1;const r=Math.atan2(_v.x,-_v.y),a=Math.hypot(_v.x,_v.y),d=Math.min(L1+L2-0.002,Math.max(0.4,Math.hypot(a,_v.z)));
 const th=Math.atan2(-_v.z,a),be=Math.acos(Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))),k=Math.PI-Math.acos(Math.max(-1,Math.min(1,(L1*L1+L2*L2-d*d)/(2*L1*L2))));
 const hx=th-be*rv,kk=k*rv;L.hip.rotation.set(hx,0,r);L.knee.rotation.x=kk;L.ank.rotation.set(-(hx+kk),0,-r);
 L.prod.scale.y=0.55+0.55*k;L.prod.position.y=-L1*0.55-L.prod.scale.y*0.25;
 const ak=-(hx+kk)*rv;L.pis2.scale.y=Math.max(.35,0.9+0.5*ak);}
function legLag(u,L,dt){// thigh armor plate trails the hip swing (spring)
 const hx=L.hip.rotation.x,dv=(hx-(L.hx0===undefined?hx:L.hx0))/Math.max(dt,1e-3);L.hx0=hx;
 L.thV+=(-160*L.thR-10*L.thV-dv*0.9)*dt;L.thR+=L.thV*dt;L.thR=Math.max(-.5,Math.min(.5,L.thR));L.thA.rotation.x=L.thR;}
function animMech(u,dt){const G=CFG.gait,p=u.g.position,v=u.vel,sp=Math.hypot(v.x,v.z);
 if(u.dying!==undefined)return deathAnim(u,dt);
 // legs face movement (walk backwards if moving away from torso)
 if(sp>0.4){let my=Math.atan2(v.x,v.z);if(Math.abs(wrap(my-u.tYaw))>1.9)my+=Math.PI;u.legYaw=turn(u.legYaw,my,CFG.legTurn/(u.T.mass||1),dt);}
 const stride=Math.min(G.stride[1],G.stride[0]+sp*G.strideK),stepT=Math.min(G.stepMax,Math.max(G.stepMin,stride/Math.max(sp,0.01)))*(u.T.mass||1)**0.5;
 if(u.air){for(const L of u.legs){const rv=L.rev?-1:1;L.hip.rotation.set(-.5*rv,0,L.s*.08);L.knee.rotation.x=1.1*rv;L.ank.rotation.set(-.6*rv,0,0);L.sw=-1;}u.wasAir=true;}
 else{if(u.wasAir){u.wasAir=false;initFeet(u);}
  let sws=u.legs.filter(L=>L.sw>=0);
  if(!sws.length){let best=null,bd=0;for(const L of u.legs){homeOf(u,L,_h).addScaledVector(v,stepT*0.5);const d=Math.hypot(L.foot.x-_h.x,L.foot.z-_h.z);
    const need=sp>0.4?stride*0.5:G.settle;const pref=L.grp===u.lastGrp?0.85:1;if(d>need&&d*pref>bd){bd=d*pref;best=L;}}
   if(best){for(const L of u.legs)if(L.grp===best.grp){L.sw=0;L.from.copy(L.foot);L.dur=stepT;sws.push(L);}u.lastGrp=best.grp;}}
  for(const sw of sws){sw.sw=Math.min(1,sw.sw+dt/sw.dur);homeOf(u,sw,sw.to).addScaledVector(v,(1-sw.sw)*sw.dur+stepT*0.5);
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
 u.lower.updateMatrixWorld(true);if(!u.air)for(const L of u.legs)ik(u,L);for(const L of u.legs)legLag(u,L,dt);
 // torso: yaw from spring, recoil jolt + hit flinch + stagger lurch
 u.jolt=Math.max(0,u.jolt-dt*4*Math.max(.1,u.jolt*10));u.fl.x-=u.fl.x*Math.min(1,dt*7);u.fl.z-=u.fl.z*Math.min(1,dt*7);
 u.top.rotation.order='YXZ';u.top.rotation.set(-u.jolt+u.fl.x+u.crouch*0.12,u.tYaw,u.fl.z-u.sway*0.15);
 // secondary: antenna + shoulder pads spring driven by body acceleration & torso spin
 const ca=Math.cos(u.tYaw),sa=Math.sin(u.tYaw),ax=u.acc.x*ca-u.acc.z*sa,az=u.acc.x*sa+u.acc.z*ca;
 u.jgV.x+=(-90*u.jg.x-7*u.jgV.x-ax*0.4-u.tYawV*1.5)*dt;u.jgV.z+=(-90*u.jg.z-7*u.jgV.z+az*0.4+u.dip*3)*dt;u.jg.x+=u.jgV.x*dt;u.jg.z+=u.jgV.z*dt;
 u.antP.rotation.set(u.jg.z*0.8,0,u.jg.x*0.8);for(const pd of u.pads)pd.rotation.set(u.jg.z*0.3,u.jg.x*0.25,0);
 u.armT=(u.armT||0)+dt;for(const a of u.arms){if(a.kind==='shield'){a.pv.rotation.set(u.jg.z*0.5-u.shA*0.4,u.jg.x*0.4+u.shA*0.5,u.jg.x*0.2);continue;}
  const w=u.armT*1.6+a.s;a.sh.rotation.set(-.35+Math.sin(w)*.25+u.jg.z*.6,a.s*(.35+Math.sin(w*.7)*.2)+u.jg.x*.5,0);a.el.rotation.set(.7+Math.sin(w*1.3)*.35,-a.s*.4,0);a.tool.rotation.z+=dt*8;
  a.tl.visible=Math.sin(w*5)>0;}
 for(const d of u.drones){const t=u.armT*1.3+d.ph,dg=d.g;d.p.set(Math.cos(t)*2.4,4.6+Math.sin(t*2)*.35,Math.sin(t)*2.4);dg.position.x+=(d.p.x-dg.position.x)*Math.min(1,dt*4);dg.position.y+=(d.p.y-dg.position.y)*Math.min(1,dt*4);dg.position.z+=(d.p.z-dg.position.z)*Math.min(1,dt*4);
  dg.rotation.set(-u.vel.z*.03,t*3,u.vel.x*.03);}
 if(u.coreM)u.coreM.rotation.y+=dt*2;
 // weapons: barrel kick-back, spin, railgun charge glow, flash
 for(let i=0;i<u.kickers.length;i++){u.kick[i]=Math.max(0,u.kick[i]-dt*u.kick[i]*12-dt*.2);u.kickers[i].position.z=-u.kick[i];}
 for(const w of u.ws){if(w.spinner)w.spinner.rotation.z+=dt*35*w.spin;if(w.coil){const ch=w.reload?0:Math.max(0,1-w.fireCd/w.W.interval);w.coil.emissiveIntensity=0.15+3*ch*ch;}}
 if(u.ventT>0){u.ventT-=dt;if(Math.random()<.5){u.vent.getWorldPosition(_w);fx(_w,.5,0xdde4ea,{vy:3.5,grow:2.5,life:.8,op:.45});}}
 if(u.flashT>0){u.flashT-=dt;if(u.flashT<=0)u.flash.forEach(f=>f.visible=false);}
 for(const j of u.jets){j.visible=(u.air&&u.vy>-4)||u.dashT>0;j.scale.y=1.2+Math.random()*.8;}
 if(u.air&&u.vy>-4&&u.jets.length&&Math.random()<.6){u.jets[0].getWorldPosition(_w);fx(_w,.5,0xffaa55,{vy:-6,grow:2,life:.35,op:.7});}
 // shield unfold/retract
 if(u.shield){const t=u.shieldOn?1:0,r=1/u.T.shield.unfold;u.shA+=Math.sign(t-u.shA)*Math.min(Math.abs(t-u.shA),r*dt);u.shield.visible=u.shA>0.02;u.shield.scale.set(Math.max(.05,u.shA),0.25+0.75*u.shA,Math.max(.05,u.shA));}
 if(u.hp<u.max*.35){u.smokeT-=dt;if(u.smokeT<=0){u.smokeT=.15;u.top.getWorldPosition(_w);_w.y+=1.5;fx(_w,.6,0x333333,{vy:3,grow:2.5,life:1.4,op:.6});}}
 if(u.plate)updPlate(u);}
function footstep(u,f){if(FX.length<CFG.fx.maxFx*.8)fx(_w.set(f.x,f.y+.2,f.z),.9*(u.T.mass||1),0x9a927e,{grow:2.2,life:.5,op:.45});
 if(u===P){shake(CFG.cam.shakeStep*(u.T.mass||1));sfx('step');}}
function deathAnim(u,dt){const t=u.dying+=dt,ease=x=>x<=0?0:x>=1?1:1-Math.pow(1-x,3);
 // staggered collapse: hit-side knee buckles first, the other follows, torso pitches over and bounces on the ground
 const s=u.dieSide,a=ease((t-0.05)/0.5),b=ease((t-0.3)/0.55),f=Math.max(a,b)*0.5+Math.min(a,b)*0.5;
 for(const L of u.legs){const q=L.s===s?a:b;L.hip.rotation.set(-1.0*q*(L.rev?-.5:1),0,L.s*(.12+.25*q));const rv=L.rev?-1:1;L.knee.rotation.x=(0.3+1.8*q)*rv;L.ank.rotation.set(-0.9*q*rv,0,0);L.prod.scale.y=0.55+0.55*(0.3+1.8*q);}
 const fall=ease((t-0.35)/0.6),bounce=t>0.95&&t<1.4?Math.sin((t-0.95)/0.45*Math.PI)*0.12*(1.4-t):0;
 u.lower.position.y=-1.15*f;u.lower.rotation.z=s*0.18*f;u.top.position.y=2.6-1.3*f-0.35*fall+bounce;
 u.top.rotation.set(0.15*a+0.45*fall,u.tYaw+s*0.25*fall,s*(0.15*a+0.35*fall),'YXZ');
 for(const g of u.guns)g.rotation.x=0.7*fall;for(const d of u.drones)d.g.position.y=Math.max(.4,d.g.position.y-dt*6);u.antP.rotation.set(-0.8*fall,0,s*0.6*fall);
 if(t<0.95){if(Math.random()<.45){u.top.getWorldPosition(_w);sparks(_w.addScaledVector(rnd3(),1.4));}if(!u.pop&&t>0.25){u.pop=1;u.top.getWorldPosition(_w);boom(_w.clone().addScaledVector(rnd3(),1),1,0xff8030);}}
 else if(!u.wreck){u.wreck=true;u.top.getWorldPosition(_w);explode(_w.clone(),1.4);for(const m of u.mats){m.color.multiplyScalar(0.28);m.metalness=0.3;}
  if(u.plate)u.plate.visible=false;if(u.shield)u.shield.visible=false;u.jets.forEach(j=>j.visible=false);if(u===P)shake(0.5);}
 else{u.smokeT-=dt;if(u.smokeT<=0){u.smokeT=CFG.fx.smokeWreck;u.top.getWorldPosition(_w);_w.y+=1;fx(_w,.9,0x2a2a2a,{vy:2.5,grow:3,life:2.2,op:.55});if(Math.random()<.15)sparks(_w,0xff9040);}}}
const rnd3=()=>new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5);
// ---------- state ----------
let P=null,U=[],B=[],FX=[],mode='menu',clock=0,endT=-1,result=null,SPEC=null,camYaw=0,shakeA=0;
const STATS={shots:0,hits:0,kills:0};
const inp={mx:0,mz:0,fire:false,keys:{}};
const foes=t=>U.filter(x=>x.alive&&x.team!==t),mates=t=>U.filter(x=>x.alive&&x.team===t);
const LS='mechArenaLoadout.v2',LS1='mechArenaLoadout',LS2='mechArenaSettings';
function freshLoadout(){return {v:2,mech:'guardian',slots:JSON.parse(JSON.stringify(CFG.defSlots))};}
// best variant of a family for a slot (same family, largest that fits & is owned) -> used for migration and setLoadout
function adapt(k,sl,own){const f=CFG.weapons[k].fam;for(const z of['L','M','S']){const c=f+(z==='M'?'':'_'+z.toLowerCase());if(CFG.weapons[c]&&SIZES[z].r<=SIZES[sl.z].r&&(!own||!isLocked(c))&&SIZES[z].r<=SIZES[CFG.weapons[k].size].r)return c;}return 'minigun_s';}
let loadout=freshLoadout();try{const l=JSON.parse(localStorage.getItem(LS));if(l&&l.v===2&&CFG.mechs[l.mech])loadout=Object.assign(freshLoadout(),l);
 else{const o=JSON.parse(localStorage.getItem(LS1));if(o&&CFG.mechs[o.mech]&&CFG.weapons[o.weapon]){loadout.mech=o.mech;for(const t in CFG.slots)loadout.slots[t]=CFG.slots[t].map((sl,i)=>sl.z==='S'?CFG.defSlots[t][i]:adapt(o.weapon,sl,false));}}}catch(e){}
function slotsOf(t){let a=loadout.slots[t];if(!a||a.length!==CFG.slots[t].length||a.some((k,i)=>!CFG.weapons[k]||!fits(k,CFG.slots[t][i])))a=loadout.slots[t]=CFG.defSlots[t].slice();return a;}
function aiSlots(t){return CFG.slots[t].map(sl=>{const ks=Object.keys(CFG.weapons).filter(k=>fits(k,sl)&&(CFG.weapons[k].size===sl.z||Math.random()<.3));return ks[Math.floor(Math.random()*ks.length)];});}
let settings={mode:'team',diff:'normal',gfx:'high',map:'random'};try{Object.assign(settings,JSON.parse(localStorage.getItem(LS2))||{});}catch(e){}
function saveLoadout(){try{loadout.weapon=slotsOf(loadout.mech)[0];localStorage.setItem(LS,JSON.stringify(loadout));localStorage.setItem(LS2,JSON.stringify(settings));}catch(e){}}
function makeUnit(team,type,slots,prof){if(typeof slots==='string')slots=CFG.slots[type].map(sl=>adapt(slots,sl,false));const me=team==='b'&&!prof,T=me?upMech(type):CFG.mechs[type];let pr=prof?Object.assign({},CFG.diff[prof]):null;
 if(pr&&team==='r'){const k=1+CFG.econ.enemyScale*progress();pr.hpMul*=k;pr.dmgMul*=k;pr.scale=k;}const u=mech(team,type,slots);
 u.ws=slots.map((k,i)=>{const W=me?upWpn(k):CFG.weapons[k],gd=u.guns[i].userData;return {k,W,gi:i,s:CFG.slots[type][i].s,ammo:W.mag,reload:0,fireCd:0,spin:0,burst:0,cd:Math.random()*1.5,spinner:gd.spin,coil:gd.coil};});
 const pw=u.ws.slice().sort((a,b)=>SIZES[b.W.size].r-SIZES[a.W.size].r||b.W.range-a.W.range)[0].W,wpn=slots[0];
 Object.assign(u,{team,type,wpn,T,W:pw,prof:pr,alive:true,hp:T.hp*(pr?pr.hpMul:1),speed:T.speed*(pr?pr.speedMul:1)*weightMul(type,slots),
  shieldOn:false,shA:0,shieldHP:T.shield?T.shield.hp:0,shieldT:0,abCd:0,vy:0,air:false,lastHit:-99,lockT:0,lockTgt:null,cd:1+Math.random()*2,burst:0,think:0,goal:null,
  vel:new THREE.Vector3(),acc:new THREE.Vector3(),jg:new THREE.Vector3(),jgV:new THREE.Vector3(),fl:new THREE.Vector3(),kick:u.guns.map(()=>0),jolt:0,sway:0,dip:0,crouch:0,jumpWind:0,
  stagT:0,dashT:0,ventT:0,kills:0,seeT:0,strafeD:1,strafeT:0,scanT:0,tgt:null,dieSide:Math.random()<.5?-1:1,yaw:0,pitch:.05});u.max=u.hp;Object.defineProperty(u,'reload',{get(){return u.ws.every(w=>w.reload>0)?Math.max(...u.ws.map(w=>w.reload)):0;}});Object.defineProperty(u,'ammo',{get(){return u.ws.reduce((t,w)=>t+(w.reload?0:w.ammo),0);}});return u;}
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
let lastMap=null;function pickMap(){if(settings.map!=='random'&&MAPS[settings.map])return settings.map;const k=MAP_KEYS.filter(k=>k!==lastMap);return k[Math.floor(Math.random()*k.length)];}
function newGame(){clearWorld();lastMap=pickMap();loadMap(lastMap);const SZ=A-12;clock=0;endT=-1;result=null;STATS.shots=STATS.hits=STATS.kills=0;const md=settings.mode;
 P=makeUnit('b',loadout.mech,slotsOf(loadout.mech),null);P.isPlayer=true;applyPaint(P,paintOf(loadout.mech));spawn(P,0,SZ,Math.PI);P.pitch=.05;camYaw=Math.PI;
 const team=md!=='duel';
 if(team){const roles=md==='base'?['att','def']:['esc','esc'];[[-7,SZ+2],[7,SZ+2]].forEach(([x,z],i)=>{const a=(t=>makeUnit('b',t,aiSlots(t),CFG.allyProfile))(rk(CFG.mechs));a.role=roles[i];spawn(a,x,z,Math.PI);makePlate(a,true);});}
 const n=team?3:1,eroles=md==='base'?['def','att','att']:['hunt','hunt','hunt'];
 for(let i=0;i<n;i++){const e=(t=>makeUnit('r',t,aiSlots(t),md==='duel'?settings.diff:CFG.enemyProfile))(rk(CFG.mechs));e.role=eroles[i];const sp=[[0,-SZ],[-7,-SZ-2],[7,-SZ-2]][i];spawn(e,sp[0],sp[1],0);makePlate(e,false);}
 showBases(md==='base');mode='play';showUI();mapBanner();drawMiniBase();}
// ---------- projectiles & effects ----------
const PG={minigun:new THREE.BoxGeometry(.12,.12,1),railgun:new THREE.BoxGeometry(.18,.18,4),hornet:new THREE.BoxGeometry(.35,.35,1),shotgun:new THREE.BoxGeometry(.1,.1,.7)};
const PM={minigun:new THREE.MeshBasicMaterial({color:0xffee66}),railgun:new THREE.MeshBasicMaterial({color:0x80e8ff}),hornet:new THREE.MeshBasicMaterial({color:0xffaa22}),shotgun:new THREE.MeshBasicMaterial({color:0xffcc88})};
function shoot(from,dir,u,homing,W){W=W||u.W;const m=new THREE.Mesh(PG[W.fam],PM[W.fam]);m.scale.setScalar(SIZES[W.size].sc);m.position.copy(from);m.lookAt(from.clone().add(dir));S.add(m);
 B.push({m,v:dir.clone().multiplyScalar(W.speed),owner:u.team,src:u,W,dist:0,dmg:W.dmg*(u.prof?u.prof.dmgMul:1)*(CFG.firepower[u.type]||1),homing});}
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
function muzzle(u,i){u.flash[i].visible=true;u.flash[i].rotation.z=Math.random()*3;u.flashT=.05;const p=new THREE.Vector3();u.guns[i].updateMatrixWorld(true);return u.guns[i].localToWorld(p.set(0,0,u.guns[i].userData.mz||u.mz));}
function fireWeapon(u,w,aimPt,homing){if(u===P)STATS.shots++;const W=w.W,pr=u.prof;w.fireCd=W.interval*(pr?pr.fireMul:1)/(W.spin?Math.max(.3,w.spin):1);w.ammo--;
 const gi=w.gi,f=muzzle(u,gi);const d=aimPt.clone().sub(f).normalize();
 const s=(W.pellets?0:W.spread)+(pr?pr.spread:0);d.x+=(Math.random()-.5)*s;d.y+=(Math.random()-.5)*s*.6;d.z+=(Math.random()-.5)*s;d.normalize();
 u.kick[gi]=Math.min(1,u.kick[gi]+W.kick);u.jolt=Math.min(.12,u.jolt+W.jolt);if(W.fam==='railgun')u.ventT=.7;
 if(u===P){flashLight(f,W.fam==='railgun'?4:1.5);shake(W.jolt*2);}
 for(let n=0;n<(W.pellets||1);n++){const dd=n?d.clone().add(new THREE.Vector3((Math.random()-.5)*W.spread,(Math.random()-.5)*W.spread*.5,(Math.random()-.5)*W.spread)).normalize():d;shoot(f,dd,u,homing,W);}if(w.ammo<=0)w.reload=W.reload;}
function frontal(u,pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,l=Math.hypot(dx,dz)||1;return (dx*Math.sin(u.tYaw)+dz*Math.cos(u.tYaw))/l>0.25;}
function dropShield(u){if(!u.shieldOn)return;u.shieldOn=false;u.abCd=u.T.shield.cd;}
function hurt(u,d,pos,src){if(!u||!u.alive)return;if(u.shieldOn&&pos&&frontal(u,pos)){u.shieldHP-=d;sparks(pos,0x80e0ff);if(u.shieldHP<=0)dropShield(u);return;}
 u.hp-=d;u.lastHit=clock;if(src)u.lastAtt=src;const H=CFG.hitReact;
 if(pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,c=Math.cos(u.tYaw),s=Math.sin(u.tYaw),lz=dx*s+dz*c,lx=dx*c-dz*s,l=Math.hypot(lx,lz)||1,k=Math.min(H.maxFlinch,d*H.flinch);
  u.fl.x+=lz/l*k;u.fl.z+=-lx/l*k;}// torso tips away from the impact
 if(d>=H.staggerDmg){u.stagT=H.staggerT;u.fl.x*=1.5;}
 if(u===P)shake(CFG.cam.shakeHit*Math.min(2,d/40));
 if(u.hp<=0)killUnit(u,src);}
function killUnit(u,src){if(!u.alive)return;u.alive=false;u.hp=0;u.dying=0;if(u.plate)u.plate.visible=false;u.shieldOn=false;u.flash.forEach(f=>f.visible=false);
 if(src&&src!==u){src.kills++;if(src===P)STATS.kills++;}for(const x of U)if(x.lockTgt===u)x.lockTgt=null;
 if(u===P&&mode==='play'){const a=mates('b')[0];if(a)SPEC=a;}}
function ability(u){if(!u||!u.alive||mode!=='play')return;const T=u.T;
 if(T.shield){if(u.shieldOn)dropShield(u);else if(u.abCd<=0){u.shieldOn=true;u.shieldT=T.shield.dur;u.shieldHP=T.shield.hp;}}
 else if(T.jump){if(!u.air&&u.abCd<=0&&u.jumpWind<=0){u.jumpWind=CFG.gait.crouchJump;u.abCd=T.jump.cd;}}
 else if(T.dash&&u.abCd<=0&&!u.air){let x=u.vel.x,z=u.vel.z,l=Math.hypot(x,z);if(l<.5){x=Math.sin(u.tYaw);z=Math.cos(u.tYaw);l=1;}u.dashD={x:x/l,z:z/l};u.dashT=T.dash.dur;u.abCd=T.dash.cd;u.crouch=Math.max(u.crouch,.5);
  fx(u.g.position.clone().setY(.4),2.2,0x9a927e,{grow:2.5,life:.5,op:.5});if(u===P){shake(.18);sfx('step');}}}
function tickUnit(u,dt){const T=u.T;u.abCd=Math.max(0,u.abCd-dt);for(const w of u.ws)w.fireCd-=dt;u.stagT=Math.max(0,u.stagT-dt);
 if(u.jumpWind>0){u.jumpWind-=dt;if(u.jumpWind<=0){u.vy=T.jump.vel;u.air=true;fx(u.g.position.clone().setY(u.g.position.y+.5),2,0xffaa44);fx(u.g.position.clone().setY(u.g.position.y+.3),2.5,0x9a927e,{grow:2,life:.6,op:.5});}}
 for(const w of u.ws)if(w.reload>0){w.reload-=dt;if(w.reload<=0){w.reload=0;w.ammo=w.W.mag;}}
 if(u.shieldOn){u.shieldT-=dt;if(u.shieldT<=0)dropShield(u);}
 if(T.regen&&clock-u.lastHit>T.regen.delay&&u.hp<u.max&&u.hp>0)u.hp=Math.min(u.max,u.hp+T.regen.rate*(u.prof?u.prof.hpMul:1)*dt);
 const p=u.g.position,gy=groundAt(p.x,p.z,p.y);
 if(u.air||p.y>gy+.01){u.air=true;u.vy-=CFG.gravity*dt;p.y+=u.vy*dt;if(p.y<=gy){const iv=-u.vy;p.y=gy;u.vy=0;u.air=false;u.crouch=Math.min(1,Math.max(u.crouch,iv/18));
   fx(p.clone().setY(gy+.3),2.2,0x9a927e,{grow:2.5,life:.6,op:.55});if(u===P){shake(CFG.cam.shakeLand*Math.min(1,iv/15));sfx('step');}}}}
function speedOf(u){return u.speed*(u.shieldOn?u.T.shield.slow:1)*(u.air&&u.T.jump?u.T.jump.airSpeed:1)*(u.stagT>0?CFG.move.staggerSlow:1)*(u.jumpWind>0?0.3:1);}
// inertia: velocity ramps toward the wanted velocity, heavier mechs ramp slower
function drive(u,wx,wz,dt){if(u.dashT>0){u.dashT-=dt;const s=u.T.dash.speed;wx=u.dashD.x;wz=u.dashD.z;u.vel.set(wx*s,0,wz*s);const p=u.g.position,nx=p.x+u.vel.x*dt,nz=p.z+u.vel.z*dt;if(!blocked(nx,p.z,1.6,p.y))p.x=nx;if(!blocked(p.x,nz,1.6,p.y))p.z=nz;p.x=Math.max(-A+2,Math.min(A-2,p.x));p.z=Math.max(-A+2,Math.min(A-2,p.z));if(u.dashT<=0)u.vel.multiplyScalar(.35);return;}
 const K=CFG.move,m=u.T.mass||1,sp=speedOf(u),tx=wx*sp,tz=wz*sp,v=u.vel;const ox=v.x,oz=v.z;
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
function tend(e){for(const t of e.changedTouches){if(t.identifier===jid){jid=null;inp.mx=inp.mz=0;knob.style.transform='';}aimT.delete(t.identifier);for(const f of['fire','fireL','fireR'])if(inp[f+'Id']===t.identifier){inp[f]=false;inp[f+'Id']=null;}}}
addEventListener('touchend',tend);addEventListener('touchcancel',tend);
$('aim').addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)aimT.set(t.identifier,{x:t.clientX,y:t.clientY});},{passive:false});
for(const [id,f] of [['bMG','fire'],['bFL','fireL'],['bFR','fireR']])$(id).addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];inp[f]=true;inp[f+'Id']=t.identifier;aimT.set(t.identifier,{x:t.clientX,y:t.clientY});},{passive:false});
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
  for(const f of foes(u.team)){const d=f.g.position.distanceTo(p);if(d>400)continue;const vis=los(eye,eyeOf(f,_e));const sc=d*(vis?1:2.5)*(f===u.lastAtt?.7:1);if(sc<bd){bd=sc;best=f;u.see=vis;}}u.tgt=best;}
 else u.see=los(eye,eyeOf(u.tgt,_e));
 const t=u.tgt,dist=t?t.g.position.distanceTo(p):1e9,see=t&&u.see;u.seeT=see?u.seeT+dt:0;
 // goals by role
 u.think-=dt;if(u.think<=0||!u.goal){u.think=pr.think[0]+Math.random()*(pr.think[1]-pr.think[0]);const own=BASES[u.team],eb=BASES[u.team==='b'?'r':'b'];u.cover=false;
  if(pr.cover&&t&&see&&(u.reload>0||u.hp<u.max*.4)){const c=coverFrom(u,t.g.position);if(c){u.goal=c;u.cover=true;}}
  if(!u.cover){if(u.role==='def'){u.goal=new THREE.Vector3(own.x+(Math.random()-.5)*8,0,own.z+(Math.random()-.5)*8);if(t&&dist<25&&see)u.goal=null;}
   else if(u.role==='att')u.goal=new THREE.Vector3(eb.x+(Math.random()-.5)*5,0,eb.z+(Math.random()-.5)*5);
   else if(u.role==='esc'&&P&&P.alive&&(!t||dist>W.range*.9)){const s=u===U[1]?-1:1,c=Math.cos(P.tYaw),sn=Math.sin(P.tYaw);u.goal=new THREE.Vector3(P.g.position.x+s*6*c-sn*5,0,P.g.position.z-s*6*sn-c*5);}
   else if(t){const a=Math.atan2(p.x-t.g.position.x,p.z-t.g.position.z)+(Math.random()-.5)*1.6,r=Math.min(40,Math.max(14,W.range*.6))+Math.random()*6;u.goal=new THREE.Vector3(t.g.position.x+Math.sin(a)*r,0,t.g.position.z+Math.cos(a)*r);}
   else u.goal=new THREE.Vector3((Math.random()-.5)*A*1.4,0,(Math.random()-.5)*A*1.4);}
  // abilities
  if(Math.random()<pr.ability){if(u.T.jump&&t&&(!see||clock-u.lastHit<1))ability(u);if(u.T.dash&&t&&clock-u.lastHit<.6)ability(u);}
  if(pr.ability>=1&&u.T.shield&&u.shieldOn&&!(clock-u.lastHit<1.5))dropShield(u);}
 if(u.T.shield&&!u.shieldOn&&u.abCd<=0&&clock-u.lastHit<.4&&t&&see&&Math.random()<pr.ability*dt*20)ability(u);
 // move (+ strafing while engaged)
 let wx=0,wz=0;if(u.goal){const dx=u.goal.x-p.x,dz=u.goal.z-p.z,l=Math.hypot(dx,dz);if(l>1.5){wx=dx/l;wz=dz/l;}}
 if(see&&pr.strafe>0&&!u.cover&&dist<W.range){u.strafeT-=dt;if(u.strafeT<=0){u.strafeT=.8+Math.random()*1.4;u.strafeD=-u.strafeD;}const tx=t.g.position.x-p.x,tz=t.g.position.z-p.z,l=Math.hypot(tx,tz)||1;
  wx+=-tz/l*u.strafeD*pr.strafe;wz+=tx/l*u.strafeD*pr.strafe;if(u.role!=='att'&&!u.goal||dist<W.range*.5){}}
 if(wx||wz){const a0=Math.atan2(wx,wz),m=Math.hypot(wx,wz);if(blocked(p.x+Math.sin(a0)*3.2,p.z+Math.cos(a0)*3.2,1.4,p.y)){const sd=u.avoid||(u.avoid=Math.random()<.5?1:-1);for(const da of [.6,1.1,1.6,-.6,-1.1,-1.6]){const a=a0+da*sd;if(!blocked(p.x+Math.sin(a)*3.2,p.z+Math.cos(a)*3.2,1.4,p.y)){wx=Math.sin(a)*m;wz=Math.cos(a)*m;break;}}}else u.avoid=0;}
 const wl=Math.hypot(wx,wz);if(wl>1){wx/=wl;wz/=wl;}const bx=p.x,bz=p.z;drive(u,wx,wz,dt);if(wl>.3&&Math.hypot(p.x-bx,p.z-bz)<.002*Math.max(1,dt*60)){u.stuck=(u.stuck||0)+dt;if(u.stuck>.5){u.stuck=0;u.goal=new THREE.Vector3(p.x+(Math.random()-.5)*20,0,p.z+(Math.random()-.5)*20);u.think=1;}}
 // torso/aim with lead
 let ap=null;if(t){const tp=t.g.position,tof=W.hitscan?0:dist/W.speed;ap=new THREE.Vector3(tp.x+t.vel.x*tof*pr.lead,tp.y+2.8+(t.vel?0:0),tp.z+t.vel.z*tof*pr.lead);}
 const ty=ap&&(see||dist<50)?Math.atan2(ap.x-p.x,ap.z-p.z):(Math.hypot(u.vel.x,u.vel.z)>.5?Math.atan2(u.vel.x,u.vel.z):u.tYaw);
 torso(u,ty,dt,CFG.move.aiTorsoK,CFG.move.aiTorsoC);if(ap)aimGuns(u,ap,dt);
 const want=see&&u.seeT>pr.react;u.lockT=see&&dist<W.range?u.lockT+dt:0;const facing=Math.abs(wrap(ty-u.tYaw))<.25;
 // each mount fires on its own: only when the target is inside that weapon's range
 for(const w of u.ws){const X=w.W,ok=want&&dist<X.range*.95;if(X.spin)w.spin=ok&&!w.reload?Math.min(1,w.spin+dt/X.spin):Math.max(0,w.spin-dt);
  w.cd-=dt;if(!w.reload&&!see&&w.ammo<X.mag*.3)w.reload=X.reload;
  if(ok&&facing&&w.cd<=0&&!w.reload&&w.fireCd<=0&&(!X.spin||w.spin>.5)){if(w.burst<=0)w.burst=X.aiBurst;
   fireWeapon(u,w,ap,X.homing&&u.lockT>X.lockTime?t:null);w.burst--;if(w.burst<=0||w.reload){w.burst=0;const bp=pr.burstPause;w.cd=bp[0]+Math.random()*(bp[1]-bp[0]);}}}}
// ---------- loop ----------
const fwd=new THREE.Vector3(),rt=new THREE.Vector3();
function outcome(){const md=settings.mode,b=mates('b').length,r=mates('r').length;
 if(md==='base'){if(BASES.r.prog>=1)return[true,'Enemy base captured'];if(BASES.b.prog>=1)return[false,'Your base was captured'];}
 if(!r)return[true,md==='duel'?'Opponent destroyed':'All enemies destroyed'];if(!b)return[false,md==='duel'?'You were destroyed':'Your team was destroyed'];return null;}
function end(win,why){mode='over';showUI();const md=settings.mode;$('mt').textContent=win?'VICTORY':'DEFEAT';$('mt').style.color=win?'#6f9':'#f66';
 $('mm').textContent=`${CFG.modes[md].name} ${CFG.modes[md].sub}${md==='duel'?' · '+CFG.diff[settings.diff].name:''}`;$('ml').textContent=why;
 $('mk').textContent=`Kills: ${STATS.kills}  ·  Team kills: ${U.filter(u=>u.team==='b').reduce((a,u)=>a+u.kills,0)}  ·  Accuracy: ${STATS.shots?Math.round(STATS.hits/STATS.shots*100):0}%`;
 document.exitPointerLock&&document.exitPointerLock();inp.fire=false;inp.mFire=false;
 const rw=reward(win,why);LAST_REWARD=rw;const ce=$('coins');ce.innerHTML=rw.rows.map((r,i)=>`<div class="cr" style="animation-delay:${i*.25}s"><span>${r[0]}</span><b>${r[1]>=0?'+':''}${r[1]}</b></div>`).join('')+`<div class="ct"><span>TOTAL</span><b>🪙 +<i id="cup">0</i></b></div><div class="cb">Balance: 🪙 <i id="cbal">${SAVE.coins-rw.tot}</i></div>`;
 const t0=performance.now(),dur=1200+rw.rows.length*250,b0=SAVE.coins-rw.tot;cancelAnimationFrame(cupRAF);
 const step=n=>{const f=Math.min(1,(n-t0)/dur),e=1-Math.pow(1-f,3);$('cup').textContent=Math.round(rw.tot*e);$('cbal').textContent=Math.round(b0+rw.tot*e);if(f<1)cupRAF=requestAnimationFrame(step);};cupRAF=requestAnimationFrame(step);}
let LAST_REWARD=null,cupRAF=0;
let last=performance.now(),menuA=0,fpsT=0,fpsN=0,fps=60,lowT=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
 fpsT+=dt;fpsN++;if(fpsT>=.5){fps=fpsN/fpsT;fpsT=fpsN=0;if(mode==='play'&&settings.gfx==='high'&&!window.__noAuto){lowT=fps<CFG.gfx.autoFallbackFps?lowT+.5:0;if(lowT>=CFG.gfx.autoWindow){setGfx('low');toast('Low fps: graphics switched to LOW');}}}
 if(mode==='play')update(dt);else if(mode==='menu')menuTick(dt);else if(mode==='over'){for(const u of U)animMech(u,dt);}
 updFx(dt);if(mode!=='menu')cam(dt);skyDome.position.copy(C.position);if(mode==='play')drawMini();R.render(S,C);}
function update(dt){clock+=dt;const k=inp.keys;
 if(P.alive){let mx=inp.mx+((k.KeyD?1:0)-(k.KeyA?1:0)),mz=inp.mz+((k.KeyS?1:0)-(k.KeyW?1:0));
  if(k.ArrowLeft)P.yaw+=2*dt;if(k.ArrowRight)P.yaw-=2*dt;
  fwd.set(Math.sin(P.yaw),0,Math.cos(P.yaw));rt.set(-fwd.z,0,fwd.x);tickUnit(P,dt);
  const v=_t.set(0,0,0).addScaledVector(fwd,-mz).addScaledVector(rt,mx);const l=v.length();if(l>1)v.divideScalar(l);drive(P,v.x,v.z,dt);
  torso(P,P.yaw,dt,CFG.move.torsoK,CFG.move.torsoC);
  // FIRE = all mounts; L / R buttons (or 1 / 2 keys) fire one side's group. Each mount has its own cadence, ammo and reload.
  const fa=inp.fire||inp.mFire||k.KeyF,fL=fa||inp.fireL||k.Digit1||k.KeyQ,fR=fa||inp.fireR||k.Digit2||k.KeyC;
  updateLock(dt);cam(0);const AP=playerAim();aimGuns(P,AP,dt);let snapped=false;
  for(const w of P.ws){const W=w.W,on=w.s<0?fL:fR;if(W.spin)w.spin=on&&!w.reload?Math.min(1,w.spin+dt/W.spin):Math.max(0,w.spin-dt);
   if(on&&w.fireCd<=0&&w.ammo>0&&!w.reload&&(!W.spin||w.spin>.3)){if(!snapped){aimGuns(P,AP,1);snapped=true;}const locked=W.homing&&P.lockTgt&&P.lockT>=W.lockTime;fireWeapon(P,w,AP,locked?P.lockTgt:null);}}}
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
function updateLock(dt){const hw=P.ws.find(w=>w.W.homing),W=hw?hw.W:P.W;if(!W.homing){lockEl.style.display='none';return;}
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
 cO.set(p.x,p.y+K.height,p.z);const ck=P&&P.type==='guardian'?1.35:P&&P.type==='strider'?1.12:1;want.set(p.x+bx*K.dist*ck-rx*K.side*ck,p.y+K.height*(ck>1.2?1.12:1)+pit*K.pitchLift,p.z+bz*K.dist*ck-rz*K.side*ck);
 cD.copy(want).sub(cO);const L=cD.length();cD.normalize();camRay.set(cO,cD);camRay.far=L;const h=camRay.intersectObjects(obstMeshes,false)[0];
 if(h)want.copy(cO).addScaledVector(cD,Math.max(1.2,h.distance-0.4));
 if(dt){shakeA=Math.max(0,shakeA-shakeA*K.shakeDecay*dt-dt*.05);}const s=shakeA*shakeA*0.6;
 C.position.set(want.x+(Math.random()-.5)*s,want.y+(Math.random()-.5)*s,want.z+(Math.random()-.5)*s);
 C.lookAt(p.x-bx*K.lookAhead-rx*K.side,p.y+3.5-pit*12,p.z-bz*K.lookAhead-rz*K.side);
 dl.position.set(p.x+SUN.x*60,SUN.y*60,p.z+SUN.z*60);dl.target.position.set(p.x,0,p.z);}
// ---------- graphics quality ----------
function setGfx(q){settings.gfx=q;if(MAP)applyDraw();saveLoadout();const g=CFG.gfx[q];R.setPixelRatio(Math.min(devicePixelRatio,g.pixelRatio));R.setSize(innerWidth,innerHeight);
 R.shadowMap.enabled=g.shadows;dl.castShadow=g.shadows;dl.shadow.mapSize.set(g.shadowMap,g.shadowMap);if(dl.shadow.map){dl.shadow.map.dispose();dl.shadow.map=null;}
 S.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);}});if(mode==='menu')renderMenu();}
let toastT=0;function toast(t){const el=$('toast');el.textContent=t;el.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>el.style.display='none',3000);}
// ---------- HUD ----------
const hpf=$('hpf'),info=$('info'),bMG=$('bMG'),bAB=$('bAB'),gunBar=$('gunf'),abBar=$('abf'),rng=$('rng');let hudN=0;
function manualReload(){if(P&&P.alive&&mode==='play')for(const w of P.ws)if(!w.reload&&w.ammo<w.W.mag)w.reload=w.W.reload;}
function ring(el,frac,col){el.style.background=`conic-gradient(${col} ${frac*360}deg, #0006 0)`;}
function hud(){const W=P.W,T=P.T;hudN++;
 if((hudN&7)===0){const nb=mates('b').length,nr=mates('r').length;$('teams').innerHTML=`<b class="tb">BLUE ${nb}</b><b class="tk">☠ ${STATS.kills}</b><b class="tr">${nr} RED</b>`;
  const cp=$('cap');if(settings.mode==='base'){cp.style.display='block';const o=BASES.b,e=BASES.r;$('capO').style.width=o.prog*100+'%';$('capE').style.width=e.prog*100+'%';
   $('capOt').textContent=`YOUR BASE ${Math.round(o.prog*100)}% ${o.state==='CAPTURING'?'⚠ UNDER ATTACK':o.state}`;$('capOt').className=o.state==='CAPTURING'?'warn':'';$('capEt').textContent=`ENEMY BASE ${Math.round(e.prog*100)}% ${e.state}`;}else cp.style.display='none';
  const sp=$('spec');if(!P.alive&&SPEC&&SPEC.alive){sp.style.display='block';sp.textContent=`DESTROYED — spectating ${SPEC.T.name} (ally)`;}else sp.style.display='none';}
 hpf.style.width=(P.hp/P.max*100)+'%';
 const regen=T.regen&&clock-P.lastHit>T.regen.delay&&P.hp<P.max&&P.alive;hpf.style.background=regen?'linear-gradient(#8fa,#2c6)':'linear-gradient(#5f5,#2a2)';
 info.innerHTML=`HP ${Math.ceil(P.hp)}/${Math.round(P.max)} ${regen?'<b style="color:#6f9">+ REGEN</b>':''}`;
 // per-mount ammo / reload list + group button rings
 const frac=w=>w.reload?1-w.reload/w.W.reload:w.ammo/w.W.mag,grp=g=>{const a=P.ws.filter(w=>w.s===g);return a.length?a.reduce((t,w)=>t+frac(w),0)/a.length:0;};
 if((hudN&3)===0){$('gunt').innerHTML=P.ws.map(w=>`<div class="wl${w.reload?' rl':''}"><b>${w.s<0?'◀L':'R▶'}</b><span class="szb z${w.W.size}">${w.W.size}</span> ${w.W.name}<em>${w.reload?'RELOAD '+w.reload.toFixed(1)+'s':w.ammo+'/'+w.W.mag}</em><i style="width:${frac(w)*100}%"></i></div>`).join('');
  const all=P.ws.reduce((t,w)=>t+frac(w),0)/P.ws.length,rl=P.ws.every(w=>w.reload);gunBar.style.width=all*100+'%';gunBar.style.background=rl?'#fa4':'#ff6';ring(bMG,all,rl?'#fa48':'#f448');bMG.textContent=rl?'RELOAD':'FIRE';
  ring($('bFL'),grp(-1),'#fc48');ring($('bFR'),grp(1),'#fc48');}
 let af=1,at='',ac='#6cf';
 if(T.shield){if(P.shieldOn){af=Math.min(P.shieldT/T.shield.dur,P.shieldHP/T.shield.hp);at=`SHIELD UP ${Math.ceil(P.shieldHP)} HP · ${P.shieldT.toFixed(1)}s`;}else if(P.abCd>0){af=1-P.abCd/T.shield.cd;at=`SHIELD COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='SHIELD READY';}
 else if(T.dash){if(P.abCd>0){af=1-P.abCd/T.dash.cd;at=`DASH COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='DASH READY';}
 else if(T.jump){if(P.abCd>0){af=1-P.abCd/T.jump.cd;at=`JUMP COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='JUMP READY';}
 else{const t=clock-P.lastHit;af=P.hp>=P.max?1:Math.min(1,t/T.regen.delay);at=P.hp>=P.max?'REGEN: FULL':(af>=1?`REGENERATING +${T.regen.rate}/s`:`REGEN IN ${(T.regen.delay-t).toFixed(1)}s`);ac=af>=1?'#6f9':'#678';}
 abBar.style.width=af*100+'%';abBar.style.background=ac;$('abt').textContent=at;ring(bAB,af,ac+'8');
 if((hudN&3)===0&&P.alive){const ap=playerAim(),d=ap.distanceTo(P.g.position);const mr=Math.max(...P.ws.map(w=>w.W.range)),nIn=P.ws.filter(w=>d<=w.W.range).length,inR=nIn>0;rng.textContent=`${Math.round(d)}m · ${nIn}/${P.ws.length} in range (max ${mr}m)${inR?'':' OUT OF RANGE'}`;rng.style.color=inR?'#8f8':'#f66';$('xh').style.borderColor=aimOnEnemy?(inR?'#f33':'#f668'):(inR?'#fffa':'#fff6');}
 $('xh').classList.toggle('hit',hitMarkT>0);hitMarkT-=1/60;}
// ---------- MENU ----------
const menu=$('menu'),mc=$('mc');let menuStep='title';
const statMax={hp:1300,speed:10};const bar=(l,v,t)=>`<div class="st"><span>${l}</span><div class="sb"><i style="width:${Math.max(4,v*100)}%"></i></div><em>${t}</em></div>`;
function preview(){if(P)S.remove(P.g);P=makeUnit('b',loadout.mech,slotsOf(loadout.mech),null);applyPaint(P,paintOf(loadout.mech));P.g.position.set(0,0,48);P.tYaw=P.legYaw=Math.PI;P.yaw=Math.PI;P.pitch=.05;initFeet(P);animMech(P,.016);}
let LINEUP=null;
function menuTick(dt){menuA+=dt*.35;if(LINEUP){for(const u of LINEUP){for(const w of u.ws)w.spin=1;animMech(u,dt);}C.position.set(9,7.5,28);C.lookAt(-1,2.4,48);return;}if(!P)return;const p=P.g.position;P.tYaw=Math.PI+Math.sin(menuA*.8)*.6;P.legYaw=Math.PI;for(const w of P.ws)w.spin=w.W.spin?1:0;animMech(P,dt);
 const a=Math.PI*0.75+menuA*0.3;const cx=p.x+Math.sin(a)*9,cz=p.z+Math.cos(a)*9;C.position.set(cx,4.5,cz);
 const lx=-Math.cos(a),lz=Math.sin(a);const side=innerWidth>700?2.8:0;C.lookAt(p.x+lx*side,3,p.z+lz*side);dl.position.set(p.x+SUN.x*60,SUN.y*60,p.z+SUN.z*60);dl.target.position.set(p.x,0,p.z);}
let gtab='mech',gsel=null,resetArm=false;
const coinTag=()=>`<div class="coinbal">🪙 <b id="bal">${SAVE.coins}</b></div>`;
const lockTag=k=>isLocked(k)?`<small class="lk">🔒 🪙${CFG.econ.locked[k]}</small>`:'';
const wIcon=k=>({minigun:'⁂',railgun:'━',hornet:'➹',shotgun:'⋰'})[CFG.weapons[k].fam];
const szTag=k=>{const z=CFG.weapons[k].size;return `<span class="szb z${z}">${z}</span>`;};let slotSel=0,pickSel=null;
function wStats(w){const rate=1/w.interval,dps=w.dmg*(w.pellets||1)*rate;return `${bar('DAMAGE',w.dmg*(w.pellets||1)/230,w.dmg+(w.pellets?' ×'+w.pellets:' / hit'))}${bar('FIRE RATE',Math.min(1,rate/14),rate.toFixed(1)+' /s')}${bar('RANGE',w.range/130,w.range+' m')}${bar('DPS',dps/150,Math.round(dps))}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · mag ${w.mag} · reload ${w.reload}s${w.homing?` · lock ${w.lockTime}s · splash ${w.splash}m`:''}</p>`;}
function abText(m){return m.shield?`${m.shield.hp} HP / ${m.shield.dur}s, ${m.shield.cd}s cooldown`:m.jump?`${m.jump.cd}s cooldown`:m.dash?`${m.dash.cd}s cooldown`:`+${m.regen.rate} HP/s after ${m.regen.delay}s`;}
function buyBox(k){const c=CFG.econ.locked[k];return isLocked(k)?`<div class="buy"><span>🔒 Locked</span>${SAVE.coins>=c?`<button class="go" data-buy="${k}">UNLOCK 🪙${c}</button>`:`<button disabled>🪙${c} — need ${c-SAVE.coins} more</button>`}</div>`:'';}
// garage stat rows: label, current, next
function mechRows(k){const L=levelsOf(k,'mech'),T=mechAt(k,L),out=[];
 for(const s of Object.keys(UPS.mech)){const n=Object.assign({},L);n[s]=Math.min(5,L[s]+1);const N=mechAt(k,n);
  const f=s==='armor'?[T.hp,N.hp,' HP']:s==='speed'?[T.speed,N.speed,' m/s']:T.shield?[T.shield.hp,N.shield.hp,' shield HP']:T.jump?[T.jump.cd,N.jump.cd,'s jump cd']:T.dash?[T.dash.cd,N.dash.cd,'s dash cd']:[T.regen.rate,N.regen.rate,' HP/s regen'];
  out.push([s,s==='ability'?`Ability (${T.ability})`:UPS.mech[s].name,L[s],f]);}return out;}
function wpnRows(k){const L=levelsOf(k,'wpn'),W=wpnAt(k,L),out=[];
 for(const s of Object.keys(UPS.wpn)){const n=Object.assign({},L);n[s]=Math.min(5,L[s]+1);const N=wpnAt(k,n);
  const f=s==='dmg'?[W.dmg,N.dmg,W.pellets?' ×'+W.pellets:' /hit']:s==='rate'?[(1/W.interval).toFixed(1),(1/N.interval).toFixed(1),' /s']:s==='reload'?[W.reload,N.reload,'s reload']:W.homing?[W.lockTime,N.lockTime,'s lock']:[W.range,N.range,' m'];
  out.push([s,s==='range'&&W.homing?'Lock time':UPS.wpn[s].name,L[s],f]);}return out;}
function garage(){const Ms=CFG.mechs,Ws=CFG.weapons;let h=`<div class="gh"><h2>GARAGE</h2>${coinTag()}</div><div class="tabs">`+[['mech','MECHS'],['wpn','WEAPONS'],['paint','PAINT']].map(([k,n])=>`<button data-gtab="${k}" class="${gtab===k?'on':''}">${n}</button>`).join('')+`</div>`;
 const list=gtab==='wpn'?Ws:Ms;if(!list[gsel])gsel=gtab==='wpn'?slotsOf(loadout.mech)[0]:loadout.mech;
 h+=`<div class="cards${gtab==='wpn'?' gw':''}">`+Object.entries(list).map(([k,m])=>`<div class="card ${k===gsel?'sel':''}" data-gsel="${k}">${gtab==='wpn'?`<div class="wi">${wIcon(k)}</div>${szTag(k)}`:`<div class="sw" style="background:#${m.color.toString(16).padStart(6,'0')}"></div>`}<b>${m.name}</b>${lockTag(k)}</div>`).join('')+`</div><div class="det">`;
 if(isLocked(gsel))h+=`<h3>${list[gsel].name}</h3><p>${list[gsel].desc}</p>${buyBox(gsel)}`;
 else if(gtab==='paint'){const cur=paintOf(gsel);h+=`<h3>${Ms[gsel].name} paint</h3><div class="paints">`+Object.entries(CFG.paints).map(([k,p])=>{const own=SAVE.paints.includes(k),c=p.col??Ms[gsel].color,bg=p.camo?`repeating-linear-gradient(45deg,#${c.toString(16).padStart(6,'0')} 0 8px,#${p.camo[0].toString(16).padStart(6,'0')} 8px 14px,#${p.camo[1].toString(16).padStart(6,'0')} 14px 18px)`:'#'+c.toString(16).padStart(6,'0');
  return `<div class="pt ${k===cur?'sel':''}" data-paint="${k}"><i style="background:${bg}"></i><span>${p.name}</span><small>${k===cur?'EQUIPPED':own?'tap to equip':'🔒 🪙'+CFG.econ.paintCost}</small></div>`;}).join('')+`</div>`;}
 else{const rows=gtab==='wpn'?wpnRows(gsel):mechRows(gsel),kind=gtab==='wpn'?'wpn':'mech';h+=`<h3>${list[gsel].name} upgrades</h3>`;
  for(const [s,name,l,f] of rows){const c=upCost(gsel,s);h+=`<div class="up"><div><b>${name}</b><div class="pips">${[1,2,3,4,5].map(i=>`<i class="${i<=l?'on':''}"></i>`).join('')}</div><small>${l<5?`${f[0]}${f[2]} → <em>${f[1]}${f[2]}</em>`:`${f[0]}${f[2]} · MAX`}</small></div>`+
   (l>=5?`<button disabled>MAX</button>`:`<button class="${SAVE.coins>=c?'go':''}" data-up="${s}" ${SAVE.coins>=c?'':'disabled'}>Lv${l+1} · 🪙${c}</button>`)+`</div>`;}}
 h+=`</div><div class="row"><button data-go="title">◀ BACK</button><button class="${resetArm?'danger':''}" data-reset="1">${resetArm?'TAP AGAIN TO ERASE ALL':'Reset progress'}</button></div>`;return h;}
function renderMenu(){const Ms=CFG.mechs,Ws=CFG.weapons,Md=CFG.modes;let h='';const md=Md[settings.mode];
 const gq=`<div class="gq">Graphics: <button data-gfx="high" class="${settings.gfx==='high'?'on':''}">HIGH</button><button data-gfx="low" class="${settings.gfx==='low'?'on':''}">LOW</button></div>`;
 if(menuStep==='title'){h=`<h1>MECH ARENA</h1>${coinTag()}<p class="sub">Win matches to earn coins. Upgrade and unlock gear in the Garage.</p>
  <button class="big" data-go="mode">PLAY</button><button class="big alt" data-go="deploy">QUICK DEPLOY<br><small>${md.name}${settings.mode==='duel'?' ('+CFG.diff[settings.diff].name+')':''} · ${settings.map==='random'?'Random map':MAPS[settings.map].name} · ${Ms[loadout.mech].name} · ${slotsOf(loadout.mech).map(k=>Ws[k].name).join(' + ')}</small></button>
  <button class="big gar" data-go="garage">🔧 GARAGE</button>${gq}`;}
 else if(menuStep==='garage')h=garage();
 else if(menuStep==='mode'){h=`<h2>1 · SELECT MODE</h2><div class="cards">`+Object.entries(Md).map(([k,m])=>`<div class="card ${k===settings.mode?'sel':''}" data-mode="${k}"><div class="md">${m.sub}</div><b>${m.name}</b></div>`).join('')+`</div>
  <div class="det"><h3>${md.name} <small>— ${md.sub}</small></h3><p>${md.desc}</p>${settings.mode==='duel'?`<div class="dif">`+Object.entries(CFG.diff).map(([k,d])=>`<button data-diff="${k}" class="${k===settings.diff?'on':''}">${d.name.toUpperCase()}</button>`).join('')+`</div><p class="ab">Coin reward ×${CFG.econ.duelMul[settings.diff]}</p>`:''}<div class="mapsel"><b>MAP</b>`+['random',...MAP_KEYS].map(k=>`<button data-map="${k}" class="${k===settings.map?'on':''}">${k==='random'?'🎲 RANDOM':MAPS[k].name.toUpperCase()}</button>`).join('')+`</div></div>
  <div class="row"><button data-go="title">BACK</button><button class="go" data-go="mech">NEXT ▶</button></div>`;}
 else if(menuStep==='mech'){h=`<div class="gh"><h2>2 · SELECT MECH</h2>${coinTag()}</div><div class="cards">`+Object.entries(Ms).map(([k,m])=>`<div class="card ${k===loadout.mech?'sel':''}" data-mech="${k}"><div class="sw" style="background:#${m.color.toString(16).padStart(6,'0')}"></div><b>${m.name}</b><small>${m.ability}</small>${lockTag(k)}</div>`).join('')+`</div>`;
  const m=upMech(loadout.mech);
  h+=`<div class="det"><h3>${m.name} <small>— ${m.ability}</small></h3>${bar('ARMOR',m.hp/1500,m.hp)}${bar('SPEED',m.speed/11,m.speed)}<p>${m.desc}</p><p class="ab">Ability: ${abText(m)}</p>${buyBox(loadout.mech)}</div>
  <div class="row"><button data-go="mode">◀ BACK</button><button class="go" data-go="weapon" ${isLocked(loadout.mech)?'disabled':''}>LOADOUT ▶</button></div>`;}
 else{const t=loadout.mech,SL=CFG.slots[t],cur=slotsOf(t);if(slotSel>=SL.length)slotSel=0;const sl=SL[slotSel];if(!pickSel||!CFG.weapons[pickSel]||!fits(pickSel,sl))pickSel=cur[slotSel];
  const wm=weightMul(t,cur);h=`<div class="gh"><h2>3 · LOADOUT — ${Ms[t].name}</h2>${coinTag()}</div><div class="slots">`+SL.map((q,i)=>`<div class="slot ${i===slotSel?'sel':''}" data-slot="${i}"><small>${q.s<0?'◀ L':'R ▶'} · ${q.n} · <b class="z${q.z}">${SIZES[q.z].name.toUpperCase()}</b></small><div><span class="wi">${wIcon(cur[i])}</span>${szTag(cur[i])} ${Ws[cur[i]].name}</div></div>`).join('')+`</div>
  <p class="ab">Weight ${wtOf(cur)} · speed ${wm>=1?'+':''}${Math.round((wm-1)*100)}% · tap a slot, then a weapon (${SIZES[sl.z].name} slot fits ${sl.z==='L'?'S / M / L':sl.z==='M'?'S / M':'S only'})</p><div class="cards wl">`+
  Object.keys(Ws).filter(k=>fits(k,sl)).map(k=>`<div class="card ${k===pickSel?'sel':''} ${k===cur[slotSel]?'eq':''}" data-pick="${k}"><div class="wi">${wIcon(k)}</div>${szTag(k)}<b>${Ws[k].name}</b>${lockTag(k)}</div>`).join('')+`</div>`;
  const w=upWpn(pickSel);h+=`<div class="det"><h3>${w.name} ${pickSel===cur[slotSel]?'<small>— equipped</small>':''}</h3>${wStats(w)}<p>${w.desc}</p>${buyBox(pickSel)}</div>
  <div class="row"><button data-go="mech">◀ BACK</button><button class="go" data-go="deploy" ${cur.some(isLocked)?'disabled':''}>DEPLOY</button></div>`;}
 mc.innerHTML=h;}
function goMenu(){clearWorld();if(mapKey!=='arena')loadMap('arena',7);showBases(false);mode='menu';menuStep='title';preview();renderMenu();showUI();}
function showUI(){menu.style.display=mode==='menu'?'flex':'none';$('hud').style.display=mode==='play'?'block':'none';$('msg').style.display=mode==='over'?'flex':'none';
 const t=TOUCH&&mode==='play'?'':'none';for(const id of['joy','bMG','bAB','bRL','bFL','bFR'])$(id).style.display=t;$('hint').style.display=TOUCH||mode!=='play'?'none':'';
 if(mode==='play'){bAB.textContent=P.T.ability;bAB.classList.toggle('passive',!!P.T.regen);}}
function menuClick(e){const el=e.target.closest('[data-go],[data-mech],[data-wpn],[data-mode],[data-diff],[data-gfx],[data-gtab],[data-gsel],[data-up],[data-buy],[data-paint],[data-reset],[data-map],[data-slot],[data-pick]');if(!el||el.disabled)return;const d=el.dataset;
 if(!d.reset)resetArm=false;
 if(d.mech){loadout.mech=d.mech;slotSel=0;pickSel=null;saveLoadout();preview();}
 if(d.slot){slotSel=+d.slot;pickSel=null;}
 if(d.pick){pickSel=d.pick;if(!isLocked(d.pick)){slotsOf(loadout.mech)[slotSel]=d.pick;saveLoadout();preview();}}
 if(d.mode){settings.mode=d.mode;saveLoadout();}if(d.diff){settings.diff=d.diff;saveLoadout();}
 if(d.gfx){setGfx(d.gfx);}
 if(d.map){settings.map=d.map;saveLoadout();renderMenu();}
 if(d.gtab){gtab=d.gtab;gsel=null;}
 if(d.gsel){gsel=d.gsel;if(gtab!=='wpn'&&!isLocked(gsel)){loadout.mech=gsel;saveLoadout();preview();}}
 if(d.up){if(buyUp(gsel,d.up)){toast('Upgraded!');preview();}}
 if(d.buy){if(buyUnlock(d.buy)){toast(`${(CFG.mechs[d.buy]||CFG.weapons[d.buy]).name} unlocked!`);if(menuStep==='weapon'&&CFG.weapons[d.buy]){slotsOf(loadout.mech)[slotSel]=d.buy;saveLoadout();}preview();}}
 if(d.paint){const k=d.paint;if(SAVE.paints.includes(k)||buyPaint(k)){SAVE.paint[gsel]=k;persist();preview();}}
 if(d.reset){if(resetArm){resetArm=false;resetProgress();gsel=null;preview();toast('Progress reset');}else resetArm=true;}
 if(d.go){if(d.go==='garage'){gsel=null;}if(d.go==='deploy'){if(isLocked(loadout.mech)||slotsOf(loadout.mech).some(isLocked)){toast('Unlock your selected gear in the Garage first');menuStep='mech';renderMenu();return;}saveLoadout();newGame();return;}menuStep=d.go;}
 renderMenu();}
menu.addEventListener('click',menuClick);
$('again').addEventListener('click',()=>newGame());$('tomenu').addEventListener('click',()=>goMenu());
loadMap('arena',7);setGfx(settings.gfx);goMenu();requestAnimationFrame(loop);
window.__game={THREE_V:THREE.Vector3,hurt,STATS,C,cam,obst,obstMeshes,BASES,CFG,get U(){return U},get E(){return foes('b')},get P(){return P},get B(){return B},get mode(){return mode},get fps(){return fps},get SPEC(){return SPEC},get settings(){return settings},
 ability:()=>ability(P),newGame,goMenu,setGfx,get loadout(){return loadout},setLoadout:(m,w)=>{loadout.mech=m;loadout.slots[m]=CFG.slots[m].map(sl=>adapt(w,sl,false));},setSlots:(m,a)=>{loadout.mech=m;loadout.slots[m]=a.slice();},slotsOf:t=>slotsOf(t),SIZES,menu:st=>{menuStep=st;renderMenu();},slot:i=>{slotSel=i;pickSel=null;renderMenu();},
 startMatch:(md,df,mp)=>{settings.mode=md;if(df)settings.diff=df;if(mp)settings.map=mp;newGame();},MAPS,get mapKey(){return mapKey},loadMap,setBaseProg:(t,v)=>{BASES[t].prog=v;},
 killTeam:t=>{for(const u of U)if(u.team===t&&u.alive)hurt(u,1e6,null,null);},killUnit:u=>hurt(u,1e6,null,null),get SAVE(){return SAVE},buyUp,buyUnlock,buyPaint,resetProgress,upMech,upWpn,get reward(){return LAST_REWARD},lineup:(w)=>{if(P){S.remove(P.g);P=null;}if(LINEUP)LINEUP.forEach(u=>S.remove(u.g));LINEUP=['guardian','strider','mender','phantom'].map((k,i)=>{const u=makeUnit('b',k,w||CFG.defSlots[k],null);u.g.position.set(-10.5+i*7,0,48);u.tYaw=u.legYaw=u.yaw=Math.PI*0.82;initFeet(u);animMech(u,.016);return u;});},renderMenu,go:s=>{menuStep=s;renderMenu();}};
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

// ---------- map banner + minimap (v10) ----------
function mapBanner(){const el=$('mapban');el.innerHTML=`<small>${CFG.modes[settings.mode].name}</small>${MAP.name}`;el.style.animation='none';void el.offsetWidth;el.style.animation='ban 3s forwards';}
const mini=$('mini'),mctx=mini.getContext('2d'),mbase=document.createElement('canvas');mbase.width=mbase.height=mini.width;
function drawMiniBase(){const W=mini.width,k=W/(2*A),g=mbase.getContext('2d');g.clearRect(0,0,W,W);g.fillStyle='rgba(10,20,30,.55)';g.fillRect(0,0,W,W);g.fillStyle='rgba(200,200,190,.55)';
 for(const o of obst)if(o.h>1.5&&o.hx<A*.9&&o.hz<A*.9)g.fillRect((o.x-o.hx+A)*k,(o.z-o.hz+A)*k,Math.max(1,o.hx*2*k),Math.max(1,o.hz*2*k));
 if(settings.mode==='base')for(const b of Object.values(BASES)){g.strokeStyle=b.team==='b'?'#4bf':'#f54';g.lineWidth=2;g.beginPath();g.arc((b.x+A)*k,(b.z+A)*k,CFG.capture.radius*k,0,7);g.stroke();}
 g.strokeStyle='#fff8';g.lineWidth=2;g.strokeRect(1,1,W-2,W-2);}
function drawMini(){const W=mini.width,k=W/(2*A);mctx.clearRect(0,0,W,W);mctx.drawImage(mbase,0,0);
 for(const u of U){if(!u.alive)continue;const x=(u.g.position.x+A)*k,y=(u.g.position.z+A)*k;
  if(u===P){mctx.save();mctx.translate(x,y);mctx.rotate(-P.tYaw+Math.PI);mctx.fillStyle='#fff';mctx.beginPath();mctx.moveTo(0,-7);mctx.lineTo(5,5);mctx.lineTo(-5,5);mctx.fill();mctx.restore();}
  else{mctx.fillStyle=u.team==='b'?'#4bf':'#f54';mctx.beginPath();mctx.arc(x,y,4,0,7);mctx.fill();}}}
