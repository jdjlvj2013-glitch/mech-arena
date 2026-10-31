/*v23 aegis rebalance*/
import * as THREE from './three.module.js';
/*v14 lasers+shield toggle*/ // ======================= CONFIG (tune here) =======================
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
   ability:'SHIELD',desc:'Heavy frame. Toggle: swing the shield arm into a guard that blocks all fire from the front until you lower it. Shield energy drains when hit and recharges while lowered. Moves at 50% speed while raised.',
   shield:{hp:900,cd:6,slow:0.5,unfold:0.5,regen:75,regenDelay:1.5,min:0.25}},
  strider:{name:'Strider',hp:950,speed:10,mass:0.9,color:0x1f9a9a,enemyColor:0xc0452a,
   ability:'JUMP',desc:'Agile frame. Jump-jets launch you over cover and onto containers and platforms.',
   jump:{vel:19.6,cd:4.5,airSpeed:1.3,airCtl:0.65}},
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
 modes:{team:{name:'Team Battle',sub:'6 v 6',desc:'You + 5 AI allies vs 6 AI mechs. Destroy the whole enemy team.'},
  duel:{name:'Duel',sub:'1 v 1',desc:'One enemy mech. Pick a difficulty: higher levels aim better, react faster, use cover and abilities.'},
  base:{name:'Capture the Base',sub:'6 v 6',desc:'Stand in the enemy base with no defenders to capture it. Win by capture or by destroying all enemies. Defend your own base!'}},
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
var PROFS=null;// v16 pilot profiles (set up in core.js)
// ======================= PROGRESSION: coins, upgrades, unlocks, paints =======================
CFG.mechs.phantom={name:'Phantom',hp:900,speed:9.5,mass:0.95,color:0x6b4fa8,enemyColor:0x9a2a50,ability:'DASH',
 desc:'Stealth raider. Fires a burst of thrusters for a lightning-fast dash in the direction you are moving.',dash:{speed:40,dur:0.32,cd:5}};
// v16: LOCKE — Grok Bot's signature sentinel (tripod walker, keyhole sensor eye)
CFG.mechs.locke={name:'Locke',hp:1100,speed:8.6,mass:1.1,color:0xc8962c,enemyColor:0xa8304e,ability:'LOCKDOWN',
 desc:'Sentinel tripod built around a keyhole sensor eye. Fires a Lockdown beacon that projects a magnetic field: every enemy inside is rooted in place (no walking, jumping or dashing) while you and your team pick them apart.',
 lockdown:{r:9,dur:3.5,cd:14,range:38}};
// v21: SKYHAWK (ducted-fan flyer) + AEGIS (force-dome generator)
CFG.mechs.skyhawk={name:'Skyhawk',hp:820,speed:9.4,mass:.8,color:0x3a8fd0,enemyColor:0xc8502a,ability:'DIVE STRIKE',
 desc:'Ducted-fan gunship. Hold FLY (Space) to lift off and hover up to 16 m; fuel drains in the air and refills on the ground. Ability: on the ground an afterburner LAUNCH, in the air a DIVE STRIKE that slams into your aim point for heavy splash damage. Light armor, and every weapon can still hit it in the air.',
 fly:{fuel:6,regen:1.2,climb:10,ceil:16,airSpeed:1.15,glide:.45,launch:15,lcd:3},dive:{cd:10,dmg:260,r:7,speed:46,dur:1.4}};
CFG.mechs.aegis={name:'Aegis',hp:1250,speed:7.4,mass:1.25,color:0x2fb8a8,enemyColor:0xb84a8a,ability:'FORCE DOME',
 desc:'Field-generator walker. Projects a translucent force DOME (7 m) for up to 5 seconds that stops bullets, rockets and beams fired from OUTSIDE it; allies inside are covered too and shots from inside pass out freely. The dome is fragile (650 HP) and does not regenerate while up, so focused fire can break it. Aegis heals for 10% of all damage the dome absorbs. EMP drains 250 dome HP and knocks it down; lockdown fields still root you.',
 dome:{hp:650,r:7,dur:5,cd:12,brokeCd:15,heal:.1,empDrain:250,slow:.8}};
CFG.weapons.shotgun={name:'Scattergun',desc:'Close-range shotgun: 9 heavy pellets per blast. Devastating up close, useless far away.',
 dmg:15,pellets:9,interval:0.8,range:28,mag:6,reload:3.2,spread:0.11,speed:150,aiBurst:1,kick:0.7,jolt:0.07};
CFG.econ={win:100,loss:25,kill:20,capture:60,duelMul:{easy:0.7,normal:1,hard:1.5},
 upCost:[0,150,300,550,900],// cost to go from level i to i+1 (index = current level)
 locked:{phantom:800,locke:1500,skyhawk:1300,aegis:1600,swarm_s:450,swarm:800,swarm_l:1250,pulse_s:450,pulse:800,pulse_l:1300,lockbolt_s:550,lockbolt:900,lockbolt_l:1400,shotgun:700,minigun_l:600,railgun_s:250,railgun_l:900,hornet_s:250,hornet_l:800,shotgun_s:400,shotgun_l:1000,laser_s:450,laser:750,laser_l:1200,emp_s:500,emp:800,emp_l:1250,nanite_s:450,nanite:750,nanite_l:1150},paintCost:250,enemyScale:0.15};
CFG.paints={default:{name:'Factory',col:null},desert:{name:'Desert Camo',col:0xb59a68,camo:[0x8a7048,0xd8c08a]},
 arctic:{name:'Arctic Camo',col:0xdfe6ea,camo:[0x9aa7b0,0xffffff]},jungle:{name:'Jungle Camo',col:0x4c6a34,camo:[0x2b3d1f,0x7a8a4a]},
 gold:{name:'Gold',col:0xd4a530,metal:0.9},skyace:{name:'Sky Ace',col:0x7fb6e0,camo:[0x4a7fae,0xe8f2fa]},aurora:{name:'Aurora',col:0x38c9b0,metal:.7},stealth:{name:'Stealth Black',col:0x26262c,rough:0.8}};
// ---- v12: weapon sizes. Each family has Small / Medium / Large variants; every mount fires its own weapon independently ----
const SIZES={S:{r:1,name:'Small',dmg:.55,int:.8,range:.85,reload:.8,mag:1.2,wt:1,sc:.72},M:{r:2,name:'Medium',dmg:1,int:1,range:1,reload:1,mag:1,wt:2,sc:1},L:{r:3,name:'Large',dmg:1.7,int:1.15,range:1.15,reload:1.25,mag:.8,wt:4,sc:1.38}};
// mediums are the v11 weapons; now each mount carries its own gun, so per-gun cadence is halved (a pair = the old single weapon) and mags trimmed
for(const [k,W] of Object.entries(CFG.weapons)){W.interval=+(W.interval*2).toFixed(3);W.mag=Math.ceil(W.mag*.6);W.fam=k;W.size='M';}
const VAR={minigun:{S:['Light SMG','Compact rapid-fire SMG. Light and quick to reload.'],L:['Heavy Rotary Cannon','Six-barrel cannon. Slow spin-up, shreds armor.']},
 railgun:{S:['Pistol Rail','Light rail sidearm. Quick precise shots, modest punch.'],L:['Heavy Railgun','Artillery-grade rail. Crushing long-range slugs, slow cycle.']},
 hornet:{S:['Light Rocket Pod','Small lock-on rocket pod.'],L:['Missile Battery','Heavy lock-on battery. Big warheads, wide splash.']},
 shotgun:{S:['Scatter Pistol','Short-range sidearm shotgun.'],L:['Heavy Scattergun','Massive close-range blast.']}};
CFG.weapons.laser={name:'Beam Laser',desc:'Continuous hitscan beam. Damage ticks while you hold fire; builds heat and locks out on overheat.',fam:'laser',size:'M',
 dmg:9,interval:0.1,range:62,mag:1,reload:3,spread:0,speed:999,hitscan:true,beam:true,heat:0.25,cool:0.4,color:0xff3050,kick:0.03,jolt:0.004,aiBurst:22};
CFG.weapons.emp={name:'EMP Cannon',desc:'Tesla coil. Tap to charge, then a lightning bolt: light damage, knocks out shields, jump, dash and regen, and slows the target.',fam:'emp',size:'M',
 dmg:60,interval:2.2,range:60,mag:4,reload:4.5,spread:0,speed:999,hitscan:true,emp:true,charge:.7,stun:3,slow:.6,blast:2.5,kick:.5,jolt:.05,aiBurst:1};
CFG.weapons.nanite={name:'Nanite Injector',desc:'Syringe launcher. Darts inject nanites that eat armor over time and feed a share back to you as repairs.',fam:'nanite',size:'M',
 dmg:10,interval:.35,range:50,mag:12,reload:3.2,spread:.012,speed:85,dot:60,dotT:3,leech:.35,kick:.12,jolt:.01,aiBurst:4};
CFG.weapons.lockbolt={name:'Lockbolt',desc:'Magnetic tether launcher. Each bolt latches a glowing tether onto the target: while tethered it takes extra damage from ALL sources and is slowed. Tether snaps if it stretches too far.',fam:'lockbolt',size:'M',
 dmg:52,interval:.9,range:72,mag:5,reload:3.4,spread:.006,speed:130,tether:3.5,amp:.2,tslow:.25,kick:.35,jolt:.03,aiBurst:2};
VAR.lockbolt={S:['Lockpick','Light tether pistol. Quick bolts, short tether.'],L:['Deadbolt','Heavy tether lance. Huge bolt, long tether, big damage amp.']};
VAR.emp={S:['Arc Zapper','Small Tesla coil. Quick charge, short stun.'],L:['Storm Coil','Huge Tesla tower. Long stun, wide EMP burst.']};
VAR.nanite={S:['Nanite Dart','Light syringe pistol. Fast darts, small dose.'],L:['Nanite Lance','Heavy syringe. Big dose, strong leech.']};
VAR.laser={S:['Pulse Laser','Light beam sidearm. Low heat, quick cool-down.'],L:['Heavy Lance','Searing heavy beam. Huge damage and reach, runs hot.']};
CFG.weapons.swarm={name:'Swarm Rack',desc:'Micro-missile rack. Rapid salvos of small missiles that seek the enemy nearest your aim. Fired from altitude they dive in for bonus damage (up to +50% at 10 m up), which makes it the flyer weapon.',fam:'swarm',size:'M',
 dmg:20,interval:.16,range:75,mag:12,reload:3.8,spread:.05,speed:62,splash:1.8,seek:.9,turnRate:3.2,altBonus:.5,kick:.15,jolt:.01,aiBurst:6};
VAR.swarm={S:['Swarm Pod','Light 6-cell micro-missile pod. Quick reload, small altitude bonus.'],L:['Swarm Battery','Heavy 12-cell battery. Big salvos and the biggest altitude bonus.']};
CFG.weapons.pulse={name:'Pulse Cannon',desc:'Kinetic energy cannon. Each orb hits hard and SHOVES the target back, which pushes enemies out of your dome. Pairs with Aegis: shove attackers off your dome while it heals you.',fam:'pulse',size:'M',
 dmg:46,interval:.75,range:55,mag:6,reload:3.4,spread:.01,speed:95,push:9,kick:.4,jolt:.04,aiBurst:2};
VAR.pulse={S:['Pulse Pistol','Light pulse emitter. Fast orbs, small shove.'],L:['Pulse Projector','Heavy pulse projector. Huge orb, massive shove that clears attackers off your dome.']};
for(const f of Object.keys(VAR))for(const z of['S','L']){const b=CFG.weapons[f],q=SIZES[z],W=Object.assign({},b,{name:VAR[f][z][0],desc:VAR[f][z][1],fam:f,size:z});
 W.dmg=+(b.dmg*q.dmg).toFixed(1);W.interval=+(b.interval*q.int).toFixed(3);W.range=Math.round(b.range*q.range);W.reload=+(b.reload*q.reload).toFixed(2);W.mag=Math.max(2,Math.round(b.mag*q.mag));
 if(W.splash)W.splash=+(b.splash*(z==='L'?1.4:.75)).toFixed(1);if(W.spin)W.spin=b.spin*(z==='L'?1.6:.6);W.kick=b.kick*q.sc;W.jolt=b.jolt*q.dmg;if(W.beam){W.mag=1;W.interval=0.1;W.dmg=+(b.dmg*(z==='S'?.68:1.5)).toFixed(1);W.heat=z==='S'?.22:.3;W.cool=z==='S'?.5:.33;W.color=z==='S'?0xff60a0:0xff5020;W.aiBurst=z==='S'?26:18;}
 if(W.emp){const S_=z==='S';W.dmg=S_?40:110;W.interval=S_?1.8:2.6;W.range=S_?50:70;W.mag=S_?4:3;W.reload=S_?4:5.2;W.charge=S_?.45:1;W.stun=S_?2:4;W.slow=S_?.7:.5;W.blast=S_?1.6:3.6;W.aiBurst=1;}
 if(W.tether){const S_=z==='S';W.dmg=S_?30:95;W.interval=S_?.65:1.25;W.range=S_?60:88;W.mag=S_?6:4;W.reload=S_?2.8:4.2;W.tether=S_?2.5:4.5;W.amp=S_?.15:.3;W.tslow=S_?.18:.35;W.speed=S_?140:120;W.aiBurst=S_?3:1;}
 if(W.dot!==undefined){const S_=z==='S';W.dmg=S_?6:16;W.interval=S_?.28:.45;W.range=S_?45:55;W.mag=S_?10:14;W.reload=S_?2.8:3.6;W.dot=S_?36:100;W.dotT=S_?2.5:3.5;W.leech=S_?.3:.4;W.speed=S_?95:75;W.aiBurst=S_?5:3;}
 if(W.seek){const S_=z==='S';W.mag=S_?6:12;W.dmg=S_?12:34;W.interval=S_?.14:.2;W.altBonus=S_?.35:.65;W.splash=S_?1.4:2.6;W.aiBurst=S_?6:8;}
 if(W.push){const S_=z==='S';W.push=S_?5:15;W.dmg=S_?26:82;W.interval=S_?.5:1.15;W.mag=S_?8:4;W.speed=S_?110:80;W.aiBurst=S_?3:1;}
 CFG.weapons[f+'_'+z.toLowerCase()]=W;}
// stable display order: family, then S/M/L
{const o={};for(const f of['minigun','railgun','hornet','shotgun','laser','emp','nanite','lockbolt','swarm','pulse'])for(const k of[f+'_s',f,f+'_l'])o[k]=CFG.weapons[k];CFG.weapons=o;}
// hardpoints per mech (s = side: -1 left group, +1 right group). A slot takes its size or smaller.
CFG.slots={guardian:[{z:'L',s:1,n:'Right arm'},{z:'L',s:-1,n:'Left arm'},{z:'S',s:1,n:'Right shoulder'},{z:'S',s:-1,n:'Left shoulder'}],
 strider:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'}],mender:[{z:'M',s:1,n:'Right arm'},{z:'S',s:-1,n:'Left arm'}],phantom:[{z:'M',s:1,n:'Right arm'},{z:'S',s:-1,n:'Left arm'}],
 locke:[{z:'M',s:1,n:'Right pod'},{z:'M',s:-1,n:'Left pod'},{z:'S',s:1,n:'Crown'}],
 skyhawk:[{z:'M',s:1,n:'Right wing'},{z:'M',s:-1,n:'Left wing'}],aegis:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'},{z:'S',s:1,n:'Emitter crown'}]};
CFG.defSlots={guardian:['minigun','minigun','minigun_s','minigun_s'],strider:['minigun','minigun'],mender:['minigun','minigun_s'],phantom:['minigun','minigun_s'],locke:['lockbolt','minigun','minigun_s'],skyhawk:['swarm','minigun'],aegis:['pulse','minigun','minigun_s']};
// firepower: per-mech damage factor (Guardian's 4 mounts share one reactor)
CFG.firepower={guardian:.62,strider:1,mender:1.1,phantom:1.1,locke:.85,skyhawk:1,aegis:.85};
const fits=(k,sl)=>SIZES[CFG.weapons[k].size].r<=SIZES[sl.z].r;
const wtOf=a=>a.reduce((t,k)=>t+SIZES[CFG.weapons[k].size].wt,0);
// heavier loadouts slow the mech a little (relative to its stock loadout)
const weightMul=(type,a)=>Math.max(.85,Math.min(1.08,1-.03*(wtOf(a)-wtOf(CFG.defSlots[type]))));
// upgrade stats per level (level 1 = base, max 5)
const UPS={mech:{armor:{name:'Armor',per:0.08},speed:{name:'Speed',per:0.04},ability:{name:'Ability',per:0.10}},
 wpn:{dmg:{name:'Damage',per:0.08},rate:{name:'Fire rate',per:0.06},reload:{name:'Reload',per:0.08},range:{name:'Range',per:0.08}}};
const SAVE_KEY='mechArena.save.v2',SAVE_KEY1='mechArena.save.v1';
function freshSave(){return {v:2,coins:0,earned:0,wins:0,lv:{},unlocked:[],paints:['default'],paint:{},life:null,ch:null,titles:[],title:''};}
let SAVE=freshSave();try{let s=JSON.parse(localStorage.getItem(SAVE_KEY));if(!s){const o=JSON.parse(localStorage.getItem(SAVE_KEY1));if(o&&o.v===1){s=Object.assign(o,{v:2,migrated:1});localStorage.setItem(SAVE_KEY,JSON.stringify(s));}}
 if(s&&s.v===2)SAVE=Object.assign(freshSave(),s);}catch(e){}
function persist(){if(PROFS&&PROFS.list[PROFS.cur]){if(PROFS.list[PROFS.cur].test)testFill();PROFS.list[PROFS.cur].save=SAVE;writeProfs();return;}try{localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE));}catch(e){}}
const lvl=(k,s)=>(SAVE.lv[k]&&SAVE.lv[k][s])||1;
const isLocked=k=>k in CFG.econ.locked&&!SAVE.unlocked.includes(k);
const upCost=(k,s)=>{const l=lvl(k,s);return l>=5?0:CFG.econ.upCost[l];};
function buyUp(k,s){const c=upCost(k,s);if(!c||SAVE.coins<c)return false;SAVE.coins-=c;(SAVE.lv[k]=SAVE.lv[k]||{})[s]=lvl(k,s)+1;persist();return true;}
function buyUnlock(k){const c=CFG.econ.locked[k];if(!isLocked(k)||SAVE.coins<c)return false;SAVE.coins-=c;SAVE.unlocked.push(k);if(k==='locke'&&!SAVE.unlocked.includes('lockbolt'))SAVE.unlocked.push('lockbolt');{const sig={skyhawk:'swarm',aegis:'pulse'}[k];if(sig&&!SAVE.unlocked.includes(sig))SAVE.unlocked.push(sig);}persist();return true;}
function buyPaint(k){if(CFG.paints[k]&&CFG.paints[k].excl)return false;if(SAVE.paints.includes(k)||SAVE.coins<CFG.econ.paintCost)return false;SAVE.coins-=CFG.econ.paintCost;SAVE.paints.push(k);persist();return true;}
function resetProgress(){SAVE=freshSave();persist();loadout=freshLoadout();if(PROFS){const p=PROFS.list[PROFS.cur];p.loadout=loadout;p.stats=freshStats();}saveLoadout();}
// derived (upgraded) stat blocks
function mechAt(k,L){const b=CFG.mechs[k],T=JSON.parse(JSON.stringify(b));T.color=b.color;T.enemyColor=b.enemyColor;const a=L.armor-1,s=L.speed-1,ab=L.ability-1,P=UPS.mech;
 T.hp=Math.round(b.hp*(1+P.armor.per*a));T.speed=+(b.speed*(1+P.speed.per*s)).toFixed(2);
 if(T.shield)T.shield.hp=Math.round(b.shield.hp*(1+P.ability.per*ab));
 if(T.jump)T.jump.cd=+(b.jump.cd*(1-0.08*ab)).toFixed(2);
 if(T.regen)T.regen.rate=Math.round(b.regen.rate*(1+0.12*ab));
 if(T.lockdown)T.lockdown.dur=+(b.lockdown.dur*(1+.1*ab)).toFixed(2);
 if(T.dash)T.dash.cd=+(b.dash.cd*(1-0.08*ab)).toFixed(2);
 if(T.dome){T.dome.hp=Math.round(b.dome.hp*(1+.1*ab));}
 if(T.fly)T.fly.fuel=+(b.fly.fuel*(1+.08*ab)).toFixed(2);if(T.dive)T.dive.cd=+(b.dive.cd*(1-.07*ab)).toFixed(2);return T;}
function wpnAt(k,L){const b=CFG.weapons[k],W=Object.assign({},b),P=UPS.wpn;
 W.dmg=+(b.dmg*(1+P.dmg.per*(L.dmg-1))).toFixed(1);W.interval=+(b.interval*(1-P.rate.per*(L.rate-1))).toFixed(4);
 W.reload=+(b.reload*(1-P.reload.per*(L.reload-1))).toFixed(2);
 if(b.homing)W.lockTime=+(b.lockTime*(1-0.10*(L.range-1))).toFixed(2);else W.range=Math.round(b.range*(1+P.range.per*(L.range-1)));if(b.tether)W.tether=+(b.tether*(1+.06*(L.range-1))).toFixed(2);if(b.dot)W.dot=+(b.dot*W.dmg/b.dmg).toFixed(1);return W;}
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
 chMatch(win,why);SAVE.coins+=tot;SAVE.earned+=tot;if(win)SAVE.wins++;profStat(win);persist();return {rows,tot};}
let A=60;// half size (per map)
let MAPSC=1.4;// v19: maps ~2x area (1.4x per side)
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
function free(x,z,r){if(Math.abs(x)>A-r-3||Math.abs(z)>A-r-3)return false;if(Math.abs(x)<26+r&&Math.abs(z)>A-24-r)return false;for(const o of obst)if(Math.abs(x-o.x)<o.hx+r+3&&Math.abs(z-o.z)<o.hz+r+3)return false;return true;}
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
// v19: fill the enlarged outer ring with mirrored, map-themed cover
const EXPAL={arena:[0x8a8478,0x5a554c],desert:[0xb06a3a,0xa86c40],city:[0x9a9490,0x6a6660],port:[0x2e6bb0,0x8a8a92],arctic:[0xe0e4e8,0xb8d8ec],canyon:[0x9a5430,0xa06038]};
function expand(key,A0){const [c1,c2]=EXPAL[key]||EXPAL.arena,cc=[0xb03a2e,0x2e6bb0,0x2e8a4a,0xc07a20];const n=Math.round((key==='city'?26:18)*(MAPSC*MAPSC-1));let placed=0;
 for(let t=0;t<n*30&&placed<n;t++){const x=R2(-A,A),z=R2(-A,A);if(Math.max(Math.abs(x),Math.abs(z))<A0*.8)continue;const big=rnd()<.4,r=big?6:3;if(!free(x,z,r)||!free(-x,-z,r))continue;placed++;const kind=rnd();
  mirror(s=>{const X=s*x,Z=s*z;
   if(key==='desert'||key==='canyon'){big?mesa(X,Z,R2(9,14),R2(8,12),R2(6,10),c1):rock(X,Z,R2(2,3.4),c2);}
   else if(key==='arctic'){big?dome(X,Z,R2(5,7),c1):rock(X,Z,R2(1.8,3),c2);}
   else if(key==='port'){big?building(X,Z,14,10,R2(8,12),c2):container(X,Z,kind<.5,cc[(kind*8|0)%4],1+(kind<.3));}
   else if(key==='city'){big?building(X,Z,R2(8,11),R2(8,11),R2(10,20),c1):(kind<.5?solid(X,Z,R2(3,6),1.2,R2(1,2.2),mat(0x77706a)):container(X,Z,kind<.75,0x8a3a2a));}
   else{big?building(X,Z,R2(7,10),R2(7,10),R2(8,12),c1):(kind<.4?crate(X,Z,2.4):kind<.7?container(X,Z,kind<.55,cc[(kind*8|0)%4]):ruin(X,Z,10,kind<.85));}});}}
const MAP_KEYS=Object.keys(MAPS);let MAP=null,mapKey=null;const HEMI=S.children.find(o=>o.isHemisphereLight);
function applyDraw(){const f=MAP.fog,k=(settings.gfx==='low'?.72:1)*1.2;S.fog.near=f[1]*k;S.fog.far=f[2]*k;C.far=S.fog.far+15;C.updateProjectionMatrix();skyDome.scale.setScalar(C.far*.9/200);}
function loadMap(key,seed){const m=MAPS[key];mapKey=key;MAP=m;A=Math.round(m.A*MAPSC);rnd=seeded(seed??(Math.random()*1e9|0));
 for(const c of [...MAPG.children]){MAPG.remove(c);if(c.isInstancedMesh)c.dispose();}obst.length=0;obstMeshes.length=0;
 paintSky(m.sky);S.background.setHex(m.bg);S.fog.color.setHex(m.fog[0]);HEMI.color.setHex(m.hemi[0]);HEMI.groundColor.setHex(m.hemi[1]);HEMI.intensity=m.hemi[2];dl.color.setHex(m.sun[0]);dl.intensity=m.sun[1];
 if(groundMat.map)groundMat.map.dispose();groundMat.map=groundTex(m.ground);groundMat.map.repeat.set(m.rep,m.rep);groundMat.needsUpdate=true;ground.scale.set(A*2,A*2,1);
 m.build();expand(key,m.A);detail(key);flushBatch();
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
  g.fillStyle=team==='b'?'#e8f4ff':'#ffe0d8';g.font='bold 40px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText({guardian:'G-01',strider:'S-27',mender:'M-09',phantom:'P-X',locke:'L-16',skyhawk:'SH-7',aegis:'AG-4'}[type],90,34);});
 return decalMats[k]=new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.6,metalness:.2,polygonOffset:true,polygonOffsetFactor:-2});}
const planeG=new THREE.PlaneGeometry(1,1),droneG=new THREE.OctahedronGeometry(.32,0),rotorG=new THREE.TorusGeometry(.38,.04,4,12),dishG=new THREE.CylinderGeometry(.45,.1,.18,10),clawG=new THREE.ConeGeometry(.12,.55,4);
// leg specs: x/z hip offset, hx/hz foot home offset (lower-local), l1/l2 bone lengths, rev = reverse (digitigrade) knee, grp = gait group (legs in a group step together), w = thickness
const FRAMES={
 guardian:{legs:[{x:-1.15,z:.95,hx:-1.75,hz:1.35,grp:0},{x:1.15,z:-.95,hx:1.75,hz:-1.35,grp:0,rev:1},{x:1.15,z:.95,hx:1.75,hz:1.35,grp:1},{x:-1.15,z:-.95,hx:-1.75,hz:-1.35,grp:1,rev:1}].map(l=>({...l,l1:1.05,l2:1.3,w:1.15})),
  tw:[3.0,1.35,2.5],hips:[2.5,.6,2.2]},
 strider:{legs:[-1,1].map((s,i)=>({x:s*.8,z:0,hx:s*.95,hz:.1,grp:i,l1:1.0,l2:1.55,rev:1,w:.8})),tw:[1.8,1.2,1.7],hips:[1.7,.45,.9]},
 mender:{legs:[-1,1].map((s,i)=>({x:s*.95,z:0,hx:s*1.05,hz:.15,grp:i,l1:1.2,l2:1.2,w:1.2})),tw:[2.0,1.9,1.7],hips:[2.1,.55,1.1]},
 locke:{legs:[{x:0,z:-1.0,hx:0,hz:-1.5,grp:0,rev:1},{x:-.9,z:.55,hx:-1.35,hz:.85,grp:1},{x:.9,z:.55,hx:1.35,hz:.85,grp:2}].map(l=>({...l,l1:1.15,l2:1.3,w:.72})),tw:[2.1,1.7,1.9],hips:[1.5,.5,1.5]},
 phantom:{legs:[-1,1].map((s,i)=>({x:s*.7,z:0,hx:s*.8,hz:.1,grp:i,l1:1.28,l2:1.22,w:.7})),tw:[1.7,1.05,2.1],hips:[1.5,.4,.8]},
 skyhawk:{legs:[-1,1].map((s,i)=>({x:s*.6,z:.1,hx:s*.75,hz:.2,grp:i,l1:1.05,l2:1.25,rev:1,w:.55})),tw:[1.5,1.0,2.6],hips:[1.2,.35,.8]},
 aegis:{legs:[[-1,1],[1,-1],[1,1],[-1,-1]].map(([sx,sz],i)=>({x:sx*1.0,z:sz*.9,hx:sx*1.8,hz:sz*1.5,grp:i%2,l1:1.0,l2:1.25,w:.85,rev:sz<0?1:0})),tw:[2.6,1.5,2.4],hips:[2.0,.55,1.8]}};
const hexG=new THREE.CylinderGeometry(1,1,1,6),icoG=new THREE.IcosahedronGeometry(1,2),fanG=new THREE.BoxGeometry(1,1,1);
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
  else if(type==='locke'){add(ank,cylG,dk,.32,.5,.32,0,-.3,0);for(let j=0;j<3;j++){const a=j*Math.PI*2/3;add(ank,clawG,dk,.7,.7,.7,Math.sin(a)*.3,-.42,Math.cos(a)*.3,Math.PI/2,a,0);}add(ank,torusG,M(0xc8962c,{metal:.8,rough:.3}),.9,.9,.9,0,-.1,0,Math.PI/2,0,0);}
  else if(type==='skyhawk'){add(ank,boxG,dk,.22,.14,1.5,0,-.2,.15);add(ank,cylG,MS.dark,.18,.12,.18,0,-.28,.75,0,0,Math.PI/2);add(ank,boxG,m,.26,.08,.4,0,-.1,-.45);}// landing skid
  else if(type==='aegis'){add(ank,hexG,dk,.62,.25,.62,0,-.25,0);add(ank,hexG,m,.7,.08,.7,0,-.08,0);}// hex anchor pad
  else if(type==='phantom'){add(ank,boxG,dk,.35,LEG.foot,1.5,0,-LEG.foot/2-.1,.25);add(ank,boxG,m,.38,.1,.5,0,-.05,.95,-.3,0,0);}
  else{add(ank,boxG,dk,.9,LEG.foot,1.4,0,-LEG.foot/2-.1,.2);add(ank,boxG,m,.92,.12,.4,0,-.05,.75);}
  lower.add(hipJ);legs.push({hip:hipJ,knee,ank,prod,pis2,thA,thV:0,thR:0,s,hx:d.hx,hz:d.hz,l1:d.l1,l2:d.l2,rev:!!d.rev,grp:d.grp,foot:new THREE.Vector3(),from:new THREE.Vector3(),to:new THREE.Vector3(),sw:-1,dur:.3});}
 const hp=F.hips;add(lower,boxG,dk,hp[0],hp[1],hp[2],0,LEG.hipY,0);if(hi)add(lower,boxG,ventMat,hp[0]*.5,.05,hp[2]*.5,0,LEG.hipY+hp[1]/2+.01,0);
 // ---- torso ----
 const top=new THREE.Group();top.position.y=2.6;g.add(top);const tw=F.tw,cy=.8,tY=cy+tw[1]/2;
 const pads=[],arms=[],drones=[];let shield=null,vent,antP,coreM=null,eye=null,halo=null,iris=null,rotors=null,domeM=null,fring=null;
 if(type==='guardian'){// heavy hull: slab torso, sloped glacis, side skirts, low turret head
  add(top,boxG,m,tw[0],tw[1],tw[2],0,cy,0);add(top,boxG,m,tw[0]*.9,.9,.7,0,cy+.15,tw[2]/2+.2,-.6,0,0);add(top,boxG,dk,tw[0]*.7,.5,.3,0,cy-.45,tw[2]/2+.1);
  add(top,boxG,tm.stripe,tw[0]+.05,.16,tw[2]+.05,0,tY-.15,0);for(const s of[-1,1])add(top,boxG,m,.25,1.0,tw[2]*.9,s*(tw[0]/2+.12),cy-.2,0,0,0,s*.12);
  add(top,boxG,dk,1.3,.5,1.0,0,tY+.25,.35);add(top,boxG,tm.visor,1.1,.14,.05,0,tY+.3,.86);vent=add(top,boxG,ventMat,1.6,.12,.8,0,tY+.01,-.7);
  for(const s of[-1,1]){const pv=grp(top,s*(tw[0]/2+.1),tY+.05,0);add(pv,boxG,m,1.2,.5,1.9,s*.15,.15,0,0,0,s*-.25);pads.push(pv);}
  // shield arm (left): shoulder joint + strut + heavy plate on a lag pivot
  const sa=grp(top,-tw[0]/2-.35,cy+.2,.2);add(sa,jointG,jm,1.3,1.3,1.3,0,0,0);add(sa,boxG,dk,.35,.35,1.2,-.25,0,.3);
  const se=grp(sa,-.25,0,.9);add(se,jointG,jm,.9,.9,.9,0,0,0);add(se,boxG,dk,.3,.3,.6,-.2,0,-.1);
  const sp=add(se,boxG,m,.25,2.3,2.4,-.37,-.35,-.45);add(se,boxG,tm.stripe,.27,.2,2.42,-.37,.6,-.45);if(hi){const dc=add(se,planeG,decalMat(team,type),1.6,.8,1,-.51,-.45,-.45,0,-Math.PI/2,0);}
  arms.push({pv:sa,el:se,kind:'shield'});
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
 else if(type==='locke'){// hovering sentinel: armored sphere hull on a tripod, giant keyhole sensor eye, orbiting lock-ring halo
  const hull=add(top,sphG,m,1.15,1.0,1.1,0,cy+.2,0);add(top,cylG,dk,1.3,.5,1.3,0,cy-.55,0);add(top,boxG,tm.stripe,2.42,.14,.5,0,cy+.2,-.2);
  for(const s of[-1,1]){add(top,boxG,m,.3,1.3,1.6,s*1.05,cy+.1,-.1,0,0,s*.18);add(top,boxG,dk,.12,.9,1.2,s*1.22,cy+.1,-.1,0,0,s*.18);}
  add(top,boxG,m,1.5,.35,1.2,0,cy+1.15,-.25,-.15,0,0);vent=add(top,boxG,ventMat,1.0,.08,.6,0,cy+1.34,-.35);
  const bz=M(0xd8b048,{metal:.95,rough:.2});add(top,torusG,bz,2.2,2.2,1.6,0,cy+.25,1.02);add(top,cylG,MS.dark,.62,.12,.62,0,cy+.25,1.0,Math.PI/2,0,0);
  eye=new THREE.MeshStandardMaterial({color:0x2a1040,emissive:0xb070ff,emissiveIntensity:1.4,roughness:.3});
  iris=grp(top,0,cy+.25,1.08);add(iris,cylG,eye,.2,.06,.2,0,.12,0,Math.PI/2,0,0);add(iris,keyG,eye,1,1,1,0,-.08,0);
  if(hi){for(let j=0;j<8;j++){const a=j*Math.PI/4;add(top,boxG,bz,.07,.18,.06,Math.cos(a)*.78,cy+.25+Math.sin(a)*.78,1.04,0,0,a+Math.PI/2);}
   for(const s of[-1,1])add(top,cableG,cableMat,1,.9,1,s*.6,cy+.9,-.8);add(top,boxG,lm,.5,.06,.04,0,cy-.3,1.0);}
  halo=grp(top,0,cy+.2,-.05);add(halo,torusG,bz,4.4,4.4,1.2,0,0,0,Math.PI/2,0,0);for(let j=0;j<3;j++){const a=j*Math.PI*2/3;add(halo,boxG,eye,.18,.12,.18,Math.cos(a)*1.35,0,Math.sin(a)*1.35);add(halo,boxG,dk,.3,.2,.3,Math.cos(a+.5)*1.35,0,Math.sin(a+.5)*1.35);}
  for(const s of[-1,1]){const pv=grp(top,s*1.0,cy+.85,-.1);add(pv,boxG,m,.7,.25,1.2,s*.15,.1,0,0,0,s*-.35);pads.push(pv);}}
 else if(type==='skyhawk'){// ducted-fan gunship: slim fuselage, bubble canopy, swept wings with fan nacelles, tail boom
  add(top,boxG,m,tw[0],tw[1],tw[2],0,cy,0);add(top,boxG,m,tw[0]*.7,.7,1.3,0,cy-.05,tw[2]/2+.5,.25,0,0);add(top,sphG,tm.visor,.5,.38,.8,0,tY,.55);
  add(top,boxG,tm.stripe,tw[0]+.04,.12,tw[2]+.04,0,cy-.15,0);add(top,boxG,dk,.35,.35,2.2,0,cy+.1,-tw[2]/2-1.0);add(top,boxG,m,.08,1.0,.8,0,cy+.6,-tw[2]/2-1.8,-.3,0,0);add(top,boxG,m,1.8,.06,.6,0,cy+.15,-tw[2]/2-1.85);
  vent=add(top,boxG,ventMat,.7,.08,.8,0,tY+.01,-.6);rotors=[];
  for(const s of[-1,1]){add(top,boxG,m,2.4,.12,1.2,s*(tw[0]/2+1.1),cy+.6,-.3,0,s*-.22,0);add(top,boxG,lm,.4,.05,.1,s*(tw[0]/2+2.15),cy+.62,.15);
   const nc=grp(top,s*(tw[0]/2+2.45),cy+.6,-.55);add(nc,torusG,dk,2.7,2.7,2.2,0,0,0,Math.PI/2,0,0);add(nc,cylG,MS.metal,.14,.5,.14,0,0,0);
   const r=grp(nc,0,.05,0);for(let j=0;j<3;j++)add(r,fanG,MS.metal,1.45,.03,.18,0,0,0,0,j*Math.PI/3,0);rotors.push(r);
   const j=add(nc,flashG,jetMat,1.1,1.6,1.1,0,-.9,0,Math.PI,0,0);j.visible=false;jets.push(j);pads.push(nc);}}
 else if(type==='aegis'){// field generator: hexagonal reactor hull, three emitter pylons around a glowing core, spinning field ring + translucent dome
  const fm=new THREE.MeshStandardMaterial({color:0x103030,emissive:team==='b'?0x40e0ff:0xff6090,emissiveIntensity:1.5,roughness:.3});
  add(top,hexG,m,tw[0]/2,tw[1],tw[2]/2,0,cy,0);add(top,hexG,dk,tw[0]/2*.75,.3,tw[2]/2*.75,0,tY+.15,0);add(top,hexG,tm.stripe,tw[0]/2+.03,.14,tw[2]/2+.03,0,cy-.3,0);
  add(top,boxG,tm.visor,1.0,.16,.05,0,cy+.35,tw[2]/2-.05);coreM=add(top,icoG,fm,.42,.42,.42,0,tY+.85,0);
  for(let j=0;j<3;j++){const a=j*Math.PI*2/3+Math.PI/2,px=Math.cos(a)*.85,pz=Math.sin(a)*.85;add(top,boxG,dk,.2,1.3,.2,px,tY+.75,pz,Math.sin(a)*.25,0,-Math.cos(a)*.25);add(top,sphG,fm,.13,.13,.13,px*.75,tY+1.4,pz*.75);}
  fring=grp(top,0,tY+.85,0);add(fring,torusG,fm,3.4,3.4,.6,0,0,0,Math.PI/2,0,0);
  vent=add(top,boxG,ventMat,.9,.08,.6,0,tY+.01,-.8);for(const s of[-1,1]){const pv=grp(top,s*(tw[0]/2),tY-.1,0);add(pv,boxG,m,.6,.3,1.3,s*.1,.1,0,0,0,s*-.3);pads.push(pv);}
  const dc=team==='b'?0x50c8ff:0xff6a8a;domeM=new THREE.Group();domeM.position.y=1;const sm1=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:dc,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  const sm2=new THREE.Mesh(icoG,new THREE.MeshBasicMaterial({color:dc,transparent:true,opacity:.22,wireframe:true,depthWrite:false}));domeM.add(sm1,sm2);domeM.visible=false;g.add(domeM);}
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
 antP=new THREE.Group();antP.position.set(type==='mender'?.55:type==='locke'?.45:.6,tY+(type==='mender'?.5:.1),-.5);top.add(antP);add(antP,antG,MS.metal,1,type==='mender'?1.8:1,1,0,type==='mender'?1.1:.65,0);
 add(antP,jointG,BLINK,.25,.25,.25,0,type==='mender'?2.25:1.3,0);if(type==='mender')add(antP,dishG,MS.metal,1,1,1,0,1.5,0,.5,0,0);
 // ---- weapon hardpoints (CFG.slots order); each mount builds its own weapon model, scaled by size ----
 const guns=[],flash=[],spinners=[],kickers=[];const MZ={minigun:2.0,railgun:3.0,hornet:.9,shotgun:1.7,laser:2.2,emp:.0,nanite:1.75,lockbolt:1.9,swarm:.75,pulse:1.75};let coil=null;
 if(typeof slots==='string')slots=CFG.slots[type].map(()=>slots);
 CFG.slots[type].forEach((sl,i)=>{const s=sl.s,k=slots[i]||CFG.defSlots[type][i],Wd=CFG.weapons[k],wpn=Wd.fam,z=Wd.size,sc=SIZES[z].sc,big=z==='L',sm=z==='S';let x,y,z0;
  if(type==='aegis'&&sl.z==='S'){x=0;y=tY+1.75;z0=.35;}
  else if(type==='locke'&&sl.z==='S'){x=0;y=cy+1.55;z0=-.1;add(top,cylG,dk,.4,.3,.4,0,cy+1.35,-.1);}
  else if(type==='guardian'&&sl.z==='S'){x=s*.95;y=tY+.85;z0=-.25;add(top,boxG,dk,.5,.6,.5,x,tY+.35,z0);}
  else{x=s*(tw[0]/2+(type==='guardian'?.75:.35)+(big?.12:0));y=type==='strider'?.55:.7;z0=type==='guardian'?.25:0;if(type==='guardian'&&s<0)x=-tw[0]/2-.35-(big?.1:0);
   add(top,jointG,jm,.9,.9,.9,s*(tw[0]/2+.05),y+.05,z0);if(type!=='guardian'||s>0)add(top,boxG,dk,.6,.3,.3,s*(tw[0]/2+.15),y+.05,z0);}
  const pv=new THREE.Group();pv.position.set(x,y,z0);const kb=new THREE.Group();kb.scale.setScalar(sc);pv.add(kb);kickers.push(kb);let spn=null,cm=null,arc=null,fluid=null,plg=null;
  if(wpn==='minigun'){add(kb,boxG,dk,.6,.6,big?1.3:.9,0,0,.1);spn=new THREE.Group();spn.position.z=1.2;kb.add(spn);spinners.push(spn);const nb=big?6:3;
   for(let j=0;j<nb;j++){const a=j*Math.PI*2/nb,r=big?.2:.15,bb=add(spn,barrelG,MS.metal,.6,sm?.8:1.1,.6,Math.cos(a)*r,Math.sin(a)*r,0);bb.rotation.x=Math.PI/2;}
   if(big)add(kb,cylG,dk,.32,.25,.32,0,0,.75,Math.PI/2,0,0);if(hi&&!sm)add(kb,boxG,M(0x5a5030),.25,.35,.5,s*.4,-.1,0);}
  else if(wpn==='railgun'){cm=new THREE.MeshStandardMaterial({color:0x2a5070,emissive:0x50c0ff,emissiveIntensity:.2,metalness:.5,roughness:.3});coil=coil||cm;
   add(kb,boxG,dk,.45,.6,1.3,0,0,.1);const bb=add(kb,barrelG,MS.metal,1.3,sm?1.4:2,1.3,0,0,sm?1.3:1.7);bb.rotation.x=Math.PI/2;for(const zz of(big?[1.0,1.5,2.0]:sm?[1.0]:[1.1,1.8]))add(kb,coilG,cm,1,1,1,0,0,zz);
   if(big){add(kb,boxG,dk,.7,.25,1.6,0,.42,.3);add(kb,boxG,lm,.08,.08,.5,0,.56,.3);}}
  else if(wpn==='laser'){cm=new THREE.MeshStandardMaterial({color:0x501018,emissive:0xff3050,emissiveIntensity:.5,metalness:.4,roughness:.3});
   add(kb,boxG,dk,.55,.55,1.2,0,0,.1);const bb=add(kb,barrelG,MS.metal,1.0,sm?1.2:1.6,1.0,0,0,sm?1.1:1.4);bb.rotation.x=Math.PI/2;
   for(const zz of(big?[.8,1.25,1.7]:sm?[.9]:[.9,1.5]))add(kb,boxG,cm,.42,.42,.1,0,0,zz);add(kb,cylG,cm,.22,.15,.22,0,0,(MZ.laser-.05),Math.PI/2,0,0);if(big)add(kb,boxG,dk,.7,.2,1.4,0,.38,.2);}
  else if(wpn==='emp'){cm=new THREE.MeshStandardMaterial({color:0x2a5070,emissive:0x60d8ff,emissiveIntensity:.3,metalness:.5,roughness:.3});const cu=M(0xb06a30),cer=M(0xe8e4d8);
   add(kb,boxG,dk,.8,.32,.9,0,-.05,.1);add(kb,boxG,MS.metal,.6,.1,.7,0,.15,.1);for(const yy of[.28,.42])add(kb,cylG,cer,.24,.1,.24,0,yy,.1);
   add(kb,cylG,cu,.15,.6,.15,0,.78,.1);for(let j=0;j<(sm?4:6);j++)add(kb,cylG,j%2?cu:cm,.19,.035,.19,0,.53+j*.09,.1);add(kb,cylG,cer,.2,.08,.2,0,1.1,.1);
   const tor=add(kb,torusG,cm,1,1,1,0,1.25,.1,Math.PI/2,0,0);arc=new THREE.Group();arc.position.set(0,.85,.1);kb.add(arc);
   for(let j=0;j<4;j++){const a=add(arc,boxG,arcMat,.03,.6,.03,0,0,0,0,0,(j-1.5)*.5);a.position.x=(j-1.5)*.1;}}
  else if(wpn==='nanite'){const gl=new THREE.MeshStandardMaterial({color:0xcfefff,transparent:true,opacity:.28,metalness:.1,roughness:.05,depthWrite:false}),fm=new THREE.MeshStandardMaterial({color:0x20c040,emissive:0x30ff60,emissiveIntensity:.9,roughness:.3});
   add(kb,boxG,dk,.42,.3,.6,0,-.32,0);add(kb,boxG,MS.metal,.2,.2,.2,0,-.12,0);
   add(kb,cylG,gl,.24,1.4,.24,0,0,.5,Math.PI/2,0,0);fluid=add(kb,cylG,fm,.19,1.3,.19,0,0,.5,Math.PI/2,0,0);
   for(const zz of[.0,.5,1.0])add(kb,cylG,MS.metal,.25,.02,.25,0,0,zz,Math.PI/2,0,0);add(kb,boxG,MS.metal,.8,.06,.12,0,0,-.2);
   add(kb,cylG,MS.metal,.25,.08,.25,0,0,1.22,Math.PI/2,0,0);add(kb,cylG,MS.metal,.08,.16,.08,0,0,1.33,Math.PI/2,0,0);add(kb,cylG,lm,.022,.5,.022,0,0,1.55,Math.PI/2,0,0);
   plg=new THREE.Group();kb.add(plg);add(plg,cylG,dk,.18,.06,.18,0,0,0,Math.PI/2,0,0);add(plg,boxG,MS.metal,.05,.05,1.1,0,0,-.55);add(plg,cylG,MS.metal,.24,.05,.24,0,0,-1.1,Math.PI/2,0,0);plg.position.z=-.15;}
  else if(wpn==='lockbolt'){// magnetic horseshoe rails + violet bolt head seated between them; ring capacitors
   cm=new THREE.MeshStandardMaterial({color:0x301050,emissive:0xb070ff,emissiveIntensity:.6,metalness:.4,roughness:.3});const rd=M(0xb02828,{metal:.6,rough:.35});
   add(kb,boxG,dk,.6,.5,1.0,0,0,0);add(kb,boxG,M(0xc8962c,{metal:.85,rough:.3}),.64,.12,.9,0,.27,0);
   for(const sx of[-1,1]){add(kb,boxG,MS.metal,.12,.42,1.6,sx*.22,0,1.0);add(kb,boxG,rd,.14,.44,.3,sx*.22,0,1.75);}
   add(kb,boxG,MS.metal,.56,.42,.14,0,0,.25);for(const zz of(big?[.55,.95,1.35]:sm?[.8]:[.6,1.15]))add(kb,torusG,cm,.9,.9,.9,0,0,zz);
   plg=new THREE.Group();plg.position.z=1.4;kb.add(plg);add(plg,boltG,cm,1,1,1,0,0,0);add(plg,boxG,MS.metal,.06,.06,.6,0,0,-.4);if(big)add(kb,boxG,dk,.7,.2,1.2,0,.38,.2);}
  else if(wpn==='shotgun'){add(kb,boxG,dk,.6,.55,1.1,0,0,.1);const bx=big?[-.2,0,.2]:sm?[0]:[-.14,.14];for(const xx of bx){const bb=add(kb,barrelG,MS.metal,1.5,sm?.8:1.2,1.5,xx,0,sm?.8:1.1);bb.rotation.x=Math.PI/2;}add(kb,boxG,MS.metal,.5,.12,.5,0,-.3,.9);}
  else if(wpn==='swarm'){// micro-missile cell block: grid of tubes with orange warhead tips, side rails
   const n=big?4:3,rows=sm?2:3,am=M(0xff8030,{metal:.3,rough:.4});add(kb,boxG,M(0x445a70,{metal:.6,rough:.4}),.3*n+.12,.3*rows+.12,.9,0,.05,.1);add(kb,boxG,dk,.3*n+.2,.1,1.0,0,.05+.15*rows+.06,.1);
   for(let r=0;r<rows;r++)for(let c=0;c<n;c++){const xx=(c-(n-1)/2)*.3,yy=.05+(r-(rows-1)/2)*.3;add(kb,cylG,MS.dark,.12,.1,.12,xx,yy,.56,Math.PI/2,0,0);add(kb,sphG,am,.07,.07,.07,xx,yy,.6);}
   for(const sx of[-1,1])add(kb,boxG,MS.metal,.05,.3*rows,.95,sx*(.15*n+.08),.05,.1);}
  else if(wpn==='pulse'){// pulse emitter: forked prongs around a floating energy orb, stacked capacitor rings
   cm=new THREE.MeshStandardMaterial({color:0x0a3040,emissive:0x50f0ff,emissiveIntensity:1.2,roughness:.3});add(kb,boxG,dk,.6,.55,.9,0,0,-.05);
   for(const zz of(big?[.45,.7,.95]:sm?[.55]:[.5,.8]))add(kb,torusG,MS.metal,1.2,1.2,1.2,0,0,zz);
   for(const a of[0,2.09,4.19])add(kb,boxG,MS.metal,.08,.08,.9,Math.cos(a)*.3,Math.sin(a)*.3,1.15,-Math.sin(a)*.2,Math.cos(a)*.2,0);
   add(kb,sphG,cm,.2,.2,.2,0,0,1.45);add(kb,cylG,cm,.08,.7,.08,0,0,.85,Math.PI/2,0,0);}
  else{const n=big?3:2,rows=sm?1:2;add(kb,boxG,M(0x665544),.45*n,.42*rows+.05,1.1,0,.1,.1);for(let r=0;r<rows;r++)for(let c=0;c<n;c++){const tb=add(kb,tubeG,MS.dark,1,1,1,(c-(n-1)/2)*.4,.1+(r-(rows-1)/2)*.4,.68);tb.rotation.x=Math.PI/2;}}
  const fl=add(pv,flashG,MS.flash,sc,sc,sc,0,0,(MZ[wpn]+.4)*sc);fl.rotation.x=-Math.PI/2;fl.visible=false;flash.push(fl);pv.userData={mz:MZ[wpn]*sc,my:wpn==='emp'?1.25*sc:0,spin:spn,coil:cm,arc,fluid,plg};top.add(pv);guns.push(pv);});
 const mz0=1;
 g.traverse(o=>{if(o.isMesh&&o.material!==shieldMat&&o.material!==jetMat&&o.material!==MS.flash&&o.material!==cableMat&&!(o.material.transparent))o.castShadow=hi||o.geometry===boxG;});
 S.add(g);return{g,lower,legs,top,guns,flash,spinners,kickers,shield,jets,pads,arms,drones,coreM,rotors,domeM,fring,antP,vent,coil,eye,halo,iris,mz:mz0,mats:[m,dk],flashT:0,smokeT:0,legYaw:0,tYaw:0,tYawV:0,gp:0};}
const sphG=new THREE.SphereGeometry(1,20,14),boltG=new THREE.OctahedronGeometry(.16,0).scale(1,1,2.6);
const keyG=(()=>{const sh=new THREE.Shape();sh.moveTo(-.07,0);sh.lineTo(.07,0);sh.lineTo(.13,-.32);sh.lineTo(-.13,-.32);sh.closePath();return new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:false});})();
const torusG=new THREE.TorusGeometry(.3,.1,6,14),arcMat=new THREE.MeshBasicMaterial({color:0xb0f0ff});let BLINK=new THREE.MeshBasicMaterial({color:0xff2020});
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
   if(sw.sw>=1){sw.sw=-1;sw.foot.y=p.y;u.dip=1;footstep(u,sw.foot);footMark(u,sw.foot);}}
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
 u.armT=(u.armT||0)+dt;for(const a of u.arms){if(a.kind==='shield'){const e=u.shA*u.shA*(3-2*u.shA);a.pv.rotation.set(u.jg.z*0.5-e*0.2,u.jg.x*0.4+e*1.2,u.jg.x*0.2-e*.05);a.el.rotation.set(0,e*0.45,0);continue;}
  const w=u.armT*1.6+a.s;a.sh.rotation.set(-.35+Math.sin(w)*.25+u.jg.z*.6,a.s*(.35+Math.sin(w*.7)*.2)+u.jg.x*.5,0);a.el.rotation.set(.7+Math.sin(w*1.3)*.35,-a.s*.4,0);a.tool.rotation.z+=dt*8;
  a.tl.visible=Math.sin(w*5)>0;}
 for(const d of u.drones){const t=u.armT*1.3+d.ph,dg=d.g;d.p.set(Math.cos(t)*2.4,4.6+Math.sin(t*2)*.35,Math.sin(t)*2.4);dg.position.x+=(d.p.x-dg.position.x)*Math.min(1,dt*4);dg.position.y+=(d.p.y-dg.position.y)*Math.min(1,dt*4);dg.position.z+=(d.p.z-dg.position.z)*Math.min(1,dt*4);
  dg.rotation.set(-u.vel.z*.03,t*3,u.vel.x*.03);}
 if(u.coreM)u.coreM.rotation.y+=dt*2;
 if(u.halo){const ld=u.ldT>0?1:0;u.halo.rotation.y+=dt*(.8+ld*5);u.halo.rotation.z=Math.sin(clock*.7)*.12+u.jg.x*.5;u.halo.position.y=1.0+Math.sin(clock*1.6)*.06;
  u.iris.rotation.z=Math.sin(clock*.9)*.25;u.iris.position.x=Math.sin(clock*.5)*.08;u.eye.emissiveIntensity=u.alive?1.2+Math.sin(clock*4)*.25+(u.ldT||0)*3:.1;u.ldT=Math.max(0,(u.ldT||0)-dt*1.5);}
 // weapons: barrel kick-back, spin, railgun charge glow, flash
 for(let i=0;i<u.kickers.length;i++){u.kick[i]=Math.max(0,u.kick[i]-dt*u.kick[i]*12-dt*.2);u.kickers[i].position.z=-u.kick[i];}
 for(const w of u.ws){if(w.spinner)w.spinner.rotation.z+=dt*35*w.spin;if(w.coil){const ch=w.reload?0:Math.max(0,1-w.fireCd/w.W.interval);w.coil.emissiveIntensity=0.15+3*ch*ch;}
  if(w.arc){const c=w.chg?Math.min(1,(clock-w.chg)/w.W.charge):0;w.arc.visible=Math.random()<.3+c*.7&&u.alive;w.arc.rotation.y=Math.random()*6.3;w.arc.scale.set(1+c,1+c*.6,1+c);if(w.coil)w.coil.emissiveIntensity=.3+c*3+(w.arc.visible?.4:0);}
  if(w.fluid){const f=Math.max(.04,w.reload?1-w.reload/w.W.reload:w.ammo/w.W.mag);w.fluid.scale.y=f;w.fluid.position.z=1.15-.65*f;w.plg.position.z=1.15-1.3*f-.02;}
  if(w.bolt){const r=w.reload?Math.max(0,1-w.reload/w.W.reload):Math.min(1,Math.max(0,1-w.fireCd/(w.W.interval*.6)));w.bolt.visible=r>.12&&u.alive;w.bolt.position.z=.7+.7*r;w.bolt.rotation.z+=dt*5;}}
 if(u.empT>0&&u.alive&&Math.random()<(gfxLow()?.15:.45)){const tp=u.g.position;const a=new THREE.Vector3(tp.x+Rn(-1.5,1.5),tp.y+Rn(1.5,4),tp.z+Rn(-1.5,1.5));bolt(a,a.clone().add(new THREE.Vector3(Rn(-1,1),Rn(-1,1),Rn(-1,1))),0x80e0ff);if(Math.random()<.4)sparks(a,0x80e0ff);}
 if(u.alive&&u.hp<u.max*.35&&Math.random()<dt*(gfxLow()?.5:2)){u.top.getWorldPosition(_w);sparks(_w.setY(_w.y+Rn(0,1)));}
 if(u.ventT>0){u.ventT-=dt;if(Math.random()<.5){u.vent.getWorldPosition(_w);fx(_w,.5,0xdde4ea,{vy:3.5,grow:2.5,life:.8,op:.45});}}
 if(u.flashT>0){u.flashT-=dt;if(u.flashT<=0)u.flash.forEach(f=>f.visible=false);}
 for(const j of u.jets){j.visible=!u.T.fly&&((u.air&&u.vy>-4)||u.dashT>0);j.scale.y=(u.dashT>0?2.2:1.2)+Math.random()*(u.dashT>0?1.4:.8);j.scale.x=j.scale.z=u.dashT>0?1.5:1;}
 if(u.air&&u.vy>-4&&u.jets.length&&Math.random()<.6){u.jets[0].getWorldPosition(_w);fx(_w,.5,0xffaa55,{vy:-6,grow:2,life:.35,op:.7});}
 // shield unfold/retract
 if(u.shield){const t=u.shieldOn?1:0,r=1/u.T.shield.unfold;u.shA+=Math.sign(t-u.shA)*Math.min(Math.abs(t-u.shA),r*dt);u.shUp=u.shieldOn&&u.shA>=1;u.shG=(u.shG||0)+((u.shUp?1:0)-(u.shG||0))*Math.min(1,dt*10);u.shield.visible=u.shG>0.03;u.shield.scale.set(Math.max(.05,u.shG),0.25+0.75*u.shG,Math.max(.05,u.shG));}
 if(u.hp<u.max*.35){u.smokeT-=dt;if(u.smokeT<=0){u.smokeT=.15;u.top.getWorldPosition(_w);_w.y+=1.5;fx(_w,.6,0x333333,{vy:3,grow:2.5,life:1.4,op:.6});}}
 if(u.plate)updPlate(u);}
function footstep(u,f){if(FX.length<CFG.fx.maxFx*.8)fx(_w.set(f.x,f.y+.2,f.z),.9*(u.T.mass||1),0x9a927e,{grow:2.2,life:.5,op:.45});
 if(u===P)shake(CFG.cam.shakeStep*(u.T.mass||1));sfx('step',{u});}
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
function saveLoadout(){try{loadout.weapon=slotsOf(loadout.mech)[0];if(PROFS&&PROFS.list[PROFS.cur]){PROFS.list[PROFS.cur].loadout=loadout;writeProfs();}else localStorage.setItem(LS,JSON.stringify(loadout));localStorage.setItem(LS2,JSON.stringify(settings));}catch(e){}}
// ---------- v16: pilot profiles (local, per device). Each pilot owns coins/unlocks/upgrades/paints/loadouts/stats ----------
const PROF_KEY='mechArena.profiles.v1';
function freshStats(){return {matches:0,wins:0,losses:0,kills:0,mechUse:{}};}
function writeProfs(){try{localStorage.setItem(PROF_KEY,JSON.stringify(PROFS));}catch(e){}}
function profInit(){try{PROFS=JSON.parse(localStorage.getItem(PROF_KEY));}catch(e){PROFS=null;}
 if(!PROFS||!PROFS.list||!Object.keys(PROFS.list).length){// first run on v16: migrate the existing v2 save + loadout into pilot #1
  const had=!!localStorage.getItem(SAVE_KEY)||!!localStorage.getItem(SAVE_KEY1);const id=newId();
  PROFS={v:1,cur:id,list:{[id]:{name:'',save:SAVE,loadout,stats:Object.assign(freshStats(),{wins:SAVE.wins||0}),created:Date.now(),migrated:had}}};writeProfs();}
 useProf(PROFS.list[PROFS.cur]?PROFS.cur:Object.keys(PROFS.list)[0]);}
function newId(){return 'p'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);}
function useProf(id){PROFS.cur=id;const p=PROFS.list[id];SAVE=Object.assign(freshSave(),p.save||{});p.save=SAVE;if(p.test)try{testFill();}catch(e){}
 loadout=Object.assign(freshLoadout(),p.loadout||{});loadout.slots=Object.assign(freshLoadout().slots,loadout.slots||{});p.loadout=loadout;p.stats=Object.assign(freshStats(),p.stats||{});writeProfs();}
const curProf=()=>PROFS.list[PROFS.cur];
function cleanName(n){return String(n||'').replace(/[<>&"']/g,'').trim().slice(0,16);}
function createProf(name){name=cleanName(name);if(!name)return null;const id=newId();PROFS.list[id]={name,save:freshSave(),loadout:freshLoadout(),stats:freshStats(),created:Date.now()};useProf(id);return id;}
function renameProf(id,name){name=cleanName(name);if(!name||!PROFS.list[id])return false;PROFS.list[id].name=name;writeProfs();return true;}
function deleteProf(id){if(!PROFS.list[id])return false;delete PROFS.list[id];const ks=Object.keys(PROFS.list);
 if(!ks.length){const n=newId();PROFS.list[n]={name:'',save:freshSave(),loadout:freshLoadout(),stats:freshStats(),created:Date.now()};ks.push(n);}
 if(PROFS.cur===id||!PROFS.list[PROFS.cur])useProf(ks[0]);else writeProfs();return true;}
function favMech(st){let b=null,n=0;for(const k in st.mechUse)if(st.mechUse[k]>n&&CFG.mechs[k]){n=st.mechUse[k];b=k;}return b?CFG.mechs[b].name:'—';}
function profStat(win){if(!PROFS)return;const st=curProf().stats;st.matches++;if(win)st.wins++;else st.losses++;st.kills+=STATS.kills||0;st.mechUse[loadout.mech]=(st.mechUse[loadout.mech]||0)+1;}
// save code: "MA1-" + base64(JSON) + "-" + checksum. Plain text, safe to paste in Notes/Messages.
function sum(t){let h=7;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))>>>0;return h.toString(36);}
function exportCode(id){const p=PROFS.list[id||PROFS.cur];const b=btoa(unescape(encodeURIComponent(JSON.stringify({n:p.name,s:p.save,l:p.loadout,st:p.stats}))));return 'MA1-'+b+'-'+sum(b);}
function importCode(code){try{const m=/^MA1-([A-Za-z0-9+/=]+)-([a-z0-9]+)$/.exec(String(code).replace(/\s+/g,''));if(!m||sum(m[1])!==m[2])return null;
 const o=JSON.parse(decodeURIComponent(escape(atob(m[1]))));if(!o||!o.s||o.s.v!==2)return null;let name=cleanName(o.n)||'Pilot';const names=Object.values(PROFS.list).map(p=>p.name);
 if(names.includes(name)){let i=2;while(names.includes(name.slice(0,13)+' '+i))i++;name=name.slice(0,13)+' '+i;}
 const id=newId();PROFS.list[id]={name,save:o.s,loadout:o.l||freshLoadout(),stats:o.st||freshStats(),created:Date.now(),imported:1};useProf(id);return id;}catch(e){return null;}}
profInit();
function makeUnit(team,type,slots,prof){if(typeof slots==='string')slots=CFG.slots[type].map(sl=>adapt(slots,sl,false));const me=team==='b'&&!prof,T=me?upMech(type):CFG.mechs[type];let pr=prof?Object.assign({},CFG.diff[prof]):null;
 if(pr&&team==='r'){const k=1+CFG.econ.enemyScale*progress();pr.hpMul*=k;pr.dmgMul*=k;pr.scale=k;}const u=mech(team,type,slots);
 u.ws=slots.map((k,i)=>{const W=me?upWpn(k):CFG.weapons[k],gd=u.guns[i].userData;return {k,W,gi:i,s:CFG.slots[type][i].s,heat:0,beamT:0,ammo:W.mag,reload:0,fireCd:0,spin:0,burst:0,cd:Math.random()*1.5,spinner:gd.spin,coil:gd.coil,arc:gd.arc,fluid:gd.fluid,plg:gd.plg,bolt:gd.bolt,chg:0};});
 const pw=u.ws.slice().sort((a,b)=>SIZES[b.W.size].r-SIZES[a.W.size].r||b.W.range-a.W.range)[0].W,wpn=slots[0];
 Object.assign(u,{team,type,wpn,T,W:pw,prof:pr,alive:true,hp:T.hp*(pr?pr.hpMul:1),speed:T.speed*(pr?pr.speedMul:1)*weightMul(type,slots),domeOn:false,domeA:0,domeHP:T.dome?T.dome.hp:0,fuel:T.fly?T.fly.fuel:0,cap:0,flyOn:false,aiFly:false,diving:false,diveT:0,lchCd:0,
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
function clearWorld(){for(const u of U)S.remove(u.g);if(P&&!U.includes(P))S.remove(P.g);B.forEach(b=>S.remove(b.m));FX.forEach(f=>{S.remove(f.m);f.m.material.dispose();});B=[];FX=[];U=[];P=null;SPEC=null;clearMarks();clearLock();}
const rk=o=>{const k=Object.keys(o);return k[Math.floor(Math.random()*k.length)];};
function spawn(u,x,z,yaw){u.g.position.set(x,0,z);u.tYaw=u.legYaw=u.yaw=yaw;initFeet(u);U.push(u);}
let lastMap=null;function pickMap(){if(settings.map!=='random'&&MAPS[settings.map])return settings.map;const k=MAP_KEYS.filter(k=>k!==lastMap);return k[Math.floor(Math.random()*k.length)];}
function newGame(){try{if(typeof lockAim==='function')lockAim();}catch(e){}clearWorld();lastMap=pickMap();loadMap(lastMap);const SZ=A-12;clock=0;endT=-1;result=null;STATS.shots=STATS.hits=STATS.kills=0;chStart();const md=settings.mode;
 P=makeUnit('b',loadout.mech,slotsOf(loadout.mech),null);P.isPlayer=true;applyPaint(P,paintOf(loadout.mech));spawn(P,0,SZ,Math.PI);P.pitch=.05;camYaw=Math.PI;
 const team=md!=='duel';
 const TS=CFG.teamSize||6;
 if(team){for(let i=0;i<TS-1;i++){const a=(t=>makeUnit('b',t,aiSlots(t),CFG.allyProfile))(window.__forceAI||rk(CFG.mechs));a.role=md==='base'?(i%2?'def':'att'):'esc';const k=(i>>1)+1,sd=i%2?1:-1;spawn(a,sd*k*7,SZ+2+(k>1?3:0),Math.PI);makePlate(a,true);}}
 const n=team?TS:1;
 for(let i=0;i<n;i++){const e=(t=>makeUnit('r',t,aiSlots(t),md==='duel'?settings.diff:CFG.enemyProfile))(window.__forceAI||rk(CFG.mechs));e.role=md==='base'?(i%3===0?'def':'att'):'hunt';const k=(i+1)>>1,sd=i%2?1:-1;spawn(e,i?sd*k*7:0,-SZ-(i?2:0)-(k>1?3:0),0);makePlate(e,false);}
 showBases(md==='base');mode='play';showUI();mapBanner();drawMiniBase();}
// ---------- projectiles & effects ----------
const PG={minigun:new THREE.BoxGeometry(.12,.12,1),railgun:new THREE.BoxGeometry(.18,.18,4),hornet:new THREE.BoxGeometry(.35,.35,1),shotgun:new THREE.BoxGeometry(.1,.1,.7)};
const PM={minigun:new THREE.MeshBasicMaterial({color:0xffee66}),railgun:new THREE.MeshBasicMaterial({color:0x80e8ff}),hornet:new THREE.MeshBasicMaterial({color:0xffaa22}),shotgun:new THREE.MeshBasicMaterial({color:0xffcc88})};
function shoot(from,dir,u,homing,W){W=W||u.W;if(W.seek&&!homing)homing=seekT(u,from,dir,W);const m=new THREE.Mesh(PG[W.fam],PM[W.fam]);m.scale.setScalar(SIZES[W.size].sc);m.position.copy(from);m.lookAt(from.clone().add(dir));S.add(m);
 B.push({m,v:dir.clone().multiplyScalar(W.speed),owner:u.team,src:u,W,dist:0,dmg:W.dmg*(u.prof?u.prof.dmgMul:1)*(CFG.firepower[u.type]||1)*(W.altBonus?shotMul(u,W):1),homing});}
PG.lockbolt=new THREE.OctahedronGeometry(.22,0).scale(1,1,3);PM.lockbolt=new THREE.MeshBasicMaterial({color:0xc090ff});
PG.nanite=new THREE.CylinderGeometry(.06,.02,.7,5).rotateX(Math.PI/2);PM.nanite=new THREE.MeshBasicMaterial({color:0x50ff80});
const fxG=new THREE.SphereGeometry(1,8,6),sparkG=new THREE.BoxGeometry(.12,.12,.12),debG=new THREE.BoxGeometry(.5,.35,.6);
function fx(p,s,c,o={}){if(FX.length>=CFG.fx.maxFx)return;const m=new THREE.Mesh(o.geo||(o.box?sparkG:fxG),o.mat||new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o.op||1,depthWrite:false}));m.position.copy(p);m.scale.setScalar(s*.2);S.add(m);
 FX.push({m,t:0,s,v:o.v||new THREE.Vector3(0,o.vy||0,0),grow:o.grow??1,life:o.life||.33,op:o.op||1,g:o.g??(o.box?-20:0),spin:o.spin,solid:!!o.mat});}
function boom(p,s,c=0xff8800){fx(p,s,c);}
function sparks(p,c=0xffe070){for(let i=0;i<4;i++)fx(p,1,c,{box:1,grow:0,life:.35,v:new THREE.Vector3((Math.random()-.5)*12,Math.random()*8,(Math.random()-.5)*12)});}
const debM=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.6,roughness:.6});
const FL=new THREE.PointLight(0xffb060,0,30,1.6);S.add(FL);let flI=0;
function flashLight(p,i){if(i>=flI){FL.position.copy(p);flI=i;}}
function explode(p,k=1){explodeX(p,k);fx(p,5*k,0xffcc66,{life:.25});fx(p,4*k,0xff6a00,{life:.5,grow:1.6});fx(p.clone().setY(p.y+1.5),4*k,0x3a3a3a,{life:1.6,grow:2.2,vy:3,op:.7});
 for(let i=0;i<CFG.fx.debris;i++)fx(p,2.5*k,0,{geo:debG,mat:debM,grow:0,life:1.6,g:-24,spin:rnd3().multiplyScalar(12),v:new THREE.Vector3((Math.random()-.5)*16,6+Math.random()*10,(Math.random()-.5)*16)});
 sparks(p,0xffa040);sparks(p);flashLight(p,6*k);if(P&&p.distanceTo(P.g.position)<40)shake(.5*k*(1-p.distanceTo(P.g.position)/40));sfx('boom',{p,k});}
function updFx(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt/f.life;f.v.y+=f.g*dt;f.m.position.addScaledVector(f.v,dt);
  if(f.spin){f.m.rotation.x+=f.spin.x*dt;f.m.rotation.y+=f.spin.y*dt;if(f.m.position.y<.2){f.m.position.y=.2;f.v.multiplyScalar(.4);f.v.y=Math.abs(f.v.y)*.3;f.spin.multiplyScalar(.5);}}
  if(f.keep){}else if(f.solid)f.m.scale.setScalar(f.s*.2*(f.t>.8?(1-f.t)*5:1));else if(f.grow)f.m.scale.setScalar(f.s*(.2+f.t*f.grow));else f.m.scale.setScalar(f.s*(1-f.t));
  if(!f.solid)f.m.material.opacity=f.op*(1-f.t);if(f.t>=1){S.remove(f.m);if(!f.solid)f.m.material.dispose();FX.splice(i,1);}}
 FL.intensity=flI*40;flI=Math.max(0,flI-dt*30);}
function shake(a){shakeA=Math.min(1,shakeA+a);}
// tiny WebAudio thuds (unlocked on first touch/click)
function muzzle(u,i){u.flash[i].visible=true;u.flash[i].rotation.z=Math.random()*3;u.flashT=.05;const p=new THREE.Vector3();u.guns[i].updateMatrixWorld(true);return u.guns[i].localToWorld(p.set(0,u.guns[i].userData.my||0,u.guns[i].userData.mz||u.mz));}
function fireWeapon(u,w,aimPt,homing){if(w.W.beam)return fireBeam(u,w,aimPt);if(w.W.emp)return chargeEmp(u,w,aimPt);if(u===P)STATS.shots++;const W=w.W,pr=u.prof;w.fireCd=W.interval*(pr?pr.fireMul:1)/(W.spin?Math.max(.3,w.spin):1);w.ammo--;
 const gi=w.gi,f=muzzle(u,gi);const d=aimPt.clone().sub(f).normalize();
 const s=(W.pellets?0:W.spread)+(pr?pr.spread:0);d.x+=(Math.random()-.5)*s;d.y+=(Math.random()-.5)*s*.6;d.z+=(Math.random()-.5)*s;d.normalize();
 u.kick[gi]=Math.min(1,u.kick[gi]+W.kick);u.jolt=Math.min(.12,u.jolt+W.jolt);sfx('shot',{u,fam:W.fam,size:W.size,gi});if(W.fam==='railgun')u.ventT=.7;
 if(u===P){flashLight(f,W.fam==='railgun'?4:1.5);shake(W.jolt*2);}
 for(let n=0;n<(W.pellets||1);n++){const dd=n?d.clone().add(new THREE.Vector3((Math.random()-.5)*W.spread,(Math.random()-.5)*W.spread*.5,(Math.random()-.5)*W.spread)).normalize():d;shoot(f,dd,u,homing,W);}if(w.ammo<=0)w.reload=W.reload;}
function frontal(u,pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,l=Math.hypot(dx,dz)||1;return (dx*Math.sin(u.tYaw)+dz*Math.cos(u.tYaw))/l>0.25;}
function dropShield(u,broken){if(!u.shieldOn)return;u.shieldOn=false;u.abCd=broken?u.T.shield.cd:Math.max(u.abCd,.4);}
function hurt(u,d,pos,src){if(u&&u.isDome)return domeHurt(u,d,pos,src);if(!u||!u.alive)return;if(u===P&&TF('god'))return;if(u.shieldOn&&u.shA>=1&&pos&&frontal(u,pos)){if(src===P)sfx('hitsh');else if(u!==P)sfx('shHit',{u});if(u===P)chEv('block',Math.min(d,Math.max(0,u.shieldHP)));u.shieldHP-=d;u.shHit=clock;if(Math.random()<.5||d>20)sparks(pos,0x80e0ff);if(u.shieldHP<=0){u.shieldHP=0;dropShield(u,true);if(u!==P)sfx('shBreak',{u});}return;}
 if(u.teth&&u.teth.t>0)d*=1+u.teth.amp;if(src===P&&u.team!==P.team)chDmg(Math.min(d,Math.max(0,u.hp)),HITF);u.hp-=d;u.lastHit=clock;if(u===P)sfx('hurt');else if(src===P)sfx('hit');if(src)u.lastAtt=src;const H=CFG.hitReact;
 if(pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,c=Math.cos(u.tYaw),s=Math.sin(u.tYaw),lz=dx*s+dz*c,lx=dx*c-dz*s,l=Math.hypot(lx,lz)||1,k=Math.min(H.maxFlinch,d*H.flinch);
  u.fl.x+=lz/l*k;u.fl.z+=-lx/l*k;}// torso tips away from the impact
 if(d>=H.staggerDmg){u.stagT=H.staggerT;u.fl.x*=1.5;}
 if(u===P)shake(CFG.cam.shakeHit*Math.min(2,d/40));
 if(u.hp<=0)killUnit(u,src);}
function killUnit(u,src){if(!u.alive)return;sfx('destroy',{u,foe:src===P&&u!==P});if(u.teth)dropTether(u);u.alive=false;u.hp=0;u.dying=0;if(u.plate)u.plate.visible=false;u.shieldOn=false;u.flash.forEach(f=>f.visible=false);
 if(src&&src!==u){src.kills++;if(src===P){STATS.kills++;chEv('kills',1);if(HITF)chEv('kill_'+HITF,1);}}for(const x of U)if(x.lockTgt===u)x.lockTgt=null;
 if(u===P&&mode==='play'){const a=mates('b')[0];if(a)SPEC=a;}}
function ability(u){if(!u||!u.alive||mode!=='play')return;if(u.empT>0||(u.rootT>0&&(u.T.jump||u.T.dash||u.T.dive))){if(u===P)sfx('denied');return;}const T=u.T;if(abilityAir(u))return;
 if(T.lockdown){if(u.abCd<=0){lockdown(u);if(u===P)chEv('abil',1);}return;}
 if(T.shield){if(u.shieldOn)dropShield(u);else if(u.abCd<=0&&u.shieldHP>=T.shield.hp*T.shield.min&&u.shA<=0.5){u.shieldOn=true;if(u===P)chEv('abil',1);else sfx('shUp',{u});}}
 else if(T.jump){if(!u.air&&u.abCd<=0&&u.jumpWind<=0){u.jumpWind=CFG.gait.crouchJump;u.abCd=T.jump.cd;if(u===P){chEv('abil',1);chEv('jumps',1);}}}
 else if(T.dash&&u.abCd<=0&&!u.air){let x=u.vel.x,z=u.vel.z,l=Math.hypot(x,z);if(l<.5){x=Math.sin(u.tYaw);z=Math.cos(u.tYaw);l=1;}u.dashD={x:x/l,z:z/l};u.dashT=T.dash.dur;u.abCd=T.dash.cd;if(u===P){chEv('abil',1);chEv('dashes',1);}u.crouch=Math.max(u.crouch,.5);
  fx(u.g.position.clone().setY(.4),2.2,0x9a927e,{grow:2.5,life:.5,op:.5});if(u===P)shake(.18);else sfx('dash',{u});}}
function tickUnit(u,dt){const T=u.T;tickAir(u,dt);u.abCd=Math.max(0,u.abCd-dt);for(const w of u.ws)w.fireCd-=dt;u.stagT=Math.max(0,u.stagT-dt);
 if(u.jumpWind>0){u.jumpWind-=dt;if(u.jumpWind<=0){u.vy=T.jump.vel;u.air=true;fx(u.g.position.clone().setY(u.g.position.y+.5),2,0xffaa44);fx(u.g.position.clone().setY(u.g.position.y+.3),2.5,0x9a927e,{grow:2,life:.6,op:.5});}}
 for(const w of u.ws)if(w.reload>0){w.reload-=dt;if(w.reload<=0){w.reload=0;w.ammo=w.W.mag;if(w.W.beam)w.heat=.35;}}
 if(u.rootT>0){u.rootT-=dt;u.dashT=0;u.jumpWind=0;}
 if(u.teth)tickTether(u,dt);
 if(u.empT>0){u.empT-=dt;if(u.shieldOn)dropShield(u);u.dashT=0;if(u.empT<=0)u.empT=0;}
 if(u.dot){const d=Math.min(u.dot.t,dt)*u.dot.dps;u.dot.t-=dt;const s_=u.dot.src;HITF='nanite';hurt(u,d,null,s_);if(s_&&s_.alive){const h0=s_.hp;s_.hp=Math.min(s_.max,s_.hp+d*u.dot.leech);if(s_===P)chEv('heal',s_.hp-h0);}if(Math.random()<(gfxLow()?.1:.35))fx(u.g.position.clone().setY(u.g.position.y+Rn(1,4)).add(new THREE.Vector3(Rn(-1,1),0,Rn(-1,1))),.6,0x40ff70,{vy:2,life:.5});if(u.dot.t<=0||!u.alive)u.dot=null;}
 for(const w of u.ws)if(w.chg&&clock-w.chg>=w.W.charge){w.chg=0;if(u.alive)empShot(u,w,u===P?playerAim():w.aimPt);}
 if(T.shield&&!(u.empT>0)&&!u.shieldOn&&clock-(u.shHit||-99)>T.shield.regenDelay)u.shieldHP=Math.min(T.shield.hp,u.shieldHP+T.shield.regen*dt);
 for(const w of u.ws)if(w.W.beam){w.beamT=(w.beamT||0)-dt;if(w.beamT<=0)w.heat=Math.max(0,(w.heat||0)-w.W.cool*dt);}
 if(!(u.empT>0)&&T.regen&&clock-u.lastHit>T.regen.delay&&u.hp<u.max&&u.hp>0)u.hp=Math.min(u.max,u.hp+T.regen.rate*(u.prof?u.prof.hpMul:1)*dt);
 const p=u.g.position,gy=groundAt(p.x,p.z,p.y);
 if(u.air||p.y>gy+.01){u.air=true;if(u.diving)diveMove(u,dt);else if(!u.flyOn){u.vy-=CFG.gravity*dt*(T.fly?T.fly.glide:1);if(T.fly&&u.vy<-12)u.vy=-12;}p.y+=u.vy*dt;if(p.y<=gy){if(u.diving){p.y=gy;diveImpact(u);}const iv=-u.vy;p.y=gy;u.vy=0;u.air=false;u.crouch=Math.min(1,Math.max(u.crouch,iv/16));u.dip=Math.min(.6,iv/40);unstick(u);
   fx(p.clone().setY(gy+.3),2.2,0x9a927e,{grow:2.5,life:.6,op:.55});if(u===P)shake(CFG.cam.shakeLand*Math.min(1,iv/15));sfx('land',{u,k:Math.min(1.3,iv/14)});}}}
// never end up inside a box or past the arena edge (after landing/dash): nudge to the nearest free spot
function unstick(u){const p=u.g.position;p.x=Math.max(-A+2,Math.min(A-2,p.x));p.z=Math.max(-A+2,Math.min(A-2,p.z));if(!blocked(p.x,p.z,1.2,p.y))return;
 for(let r=1;r<=12;r+=1)for(let a=0;a<16;a++){const x=p.x+Math.sin(a*Math.PI/8)*r,z=p.z+Math.cos(a*Math.PI/8)*r;if(Math.abs(x)<A-2&&Math.abs(z)<A-2&&!blocked(x,z,1.6,p.y)){p.x=x;p.z=z;p.y=Math.max(groundAt(x,z,p.y+.01),0);return;}}}
function speedOf(u){return (u.rootT>0?0:1)*(u.teth?1-u.teth.slow:1)*u.speed*(u.empT>0?u.empSlow||.6:1)*(u.shieldOn?u.T.shield.slow:1)*(u.air&&u.T.jump?u.T.jump.airSpeed:1)*(u.air&&u.T.fly?u.T.fly.airSpeed:1)*(u.domeOn?u.T.dome.slow:1)*(u.stagT>0?CFG.move.staggerSlow:1)*(u.jumpWind>0?0.3:1);}
// inertia: velocity ramps toward the wanted velocity, heavier mechs ramp slower
function drive(u,wx,wz,dt){if(u.diving)return;if(u.dashT>0){u.dashT-=dt;const s=u.T.dash.speed;wx=u.dashD.x;wz=u.dashD.z;u.vel.set(wx*s,0,wz*s);const p=u.g.position,n=Math.max(1,Math.ceil(s*dt/.4)),sx=u.vel.x*dt/n,sz=u.vel.z*dt/n;let hitW=false;
  for(let i=0;i<n;i++){const nx=p.x+sx,nz=p.z+sz;if(!blocked(nx,p.z,1.6,p.y))p.x=nx;else hitW=true;if(!blocked(p.x,nz,1.6,p.y))p.z=nz;else hitW=true;}// swept sub-steps: can't tunnel through walls
  p.x=Math.max(-A+2,Math.min(A-2,p.x));p.z=Math.max(-A+2,Math.min(A-2,p.z));
  if(Math.random()<.8)fx(p.clone().setY(p.y+2.2+Math.random()),1.1,0xb090ff,{life:.45,grow:1.8,op:.55});if(Math.random()<.5)fx(p.clone().setY(p.y+.3),1.4,0x9a927e,{life:.5,grow:2,op:.4});
  if(hitW&&u.dashT>.05){u.dashT=Math.min(u.dashT,.05);}
  if(u.dashT<=0)u.vel.multiplyScalar(.35);return;}
 const K=CFG.move,m=u.T.mass||1,sp=speedOf(u),tx=wx*sp,tz=wz*sp,v=u.vel;const ox=v.x,oz=v.z;
 const dx=tx-v.x,dz=tz-v.z,dl=Math.hypot(dx,dz),rate=(Math.hypot(tx,tz)>Math.hypot(v.x,v.z)?K.accel:K.decel)/m*(u.air?(u.T.jump?u.T.jump.airCtl:u.T.fly?1:.4):1)*dt;
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
addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;if(!inp.keys[e.code]&&ABKEYS.includes(e.code)&&!(e.code==='Space'&&P&&P.T.fly))ability(P);inp.keys[e.code]=true;if(e.code==='KeyR')manualReload();if(e.code==='Space')e.preventDefault();});addEventListener('keyup',e=>inp.keys[e.code]=false);
const cv=R.domElement;let plkErrT=-9;
// v19: pointer lock is requested from the DEPLOY/PLAY AGAIN click itself (a user gesture), and any click anywhere in the battle (not just on the canvas) re-acquires it
function lockAim(){if(!cv.requestPointerLock||document.pointerLockElement===cv)return;try{const r=cv.requestPointerLock();if(r&&r.catch)r.catch(()=>{plkErrT=performance.now();});}catch(e){plkErrT=performance.now();}}
document.addEventListener('pointerlockerror',()=>{plkErrT=performance.now();});
addEventListener('mousedown',e=>{if(mode!=='play'||PAUSED)return;if(e.target&&e.target.closest&&e.target.closest('.btn,#joy,button,input'))return;if(document.pointerLockElement!==cv){lockAim();}if(e.button===0)inp.mFire=true;if(e.button===2)ability(P);});
const DESK=!('ontouchstart' in window)||(matchMedia&&matchMedia('(pointer:fine)').matches&&!matchMedia('(pointer:coarse)').matches);
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
  if(u.T.lockdown&&u.abCd<=0&&t&&see&&dist<u.T.lockdown.range&&Math.random()<pr.ability*4)ability(u);
  if(Math.random()<pr.ability){if(u.T.jump&&t&&(!see||clock-u.lastHit<1))ability(u);if(u.T.dash&&t&&clock-u.lastHit<.6)ability(u);}
}
 if(u.T.shield){const S_=u.T.shield,threat=t&&see&&dist<70,hot=clock-Math.max(u.lastHit,u.shHit||-99)<1.2;
  if(!u.shieldOn&&u.shA<=0&&u.abCd<=0&&threat&&hot&&u.shieldHP>S_.hp*.5&&Math.random()<pr.ability*dt*20)ability(u);
  else if(u.shieldOn&&(!threat&&clock-(u.shHit||-99)>2.5||u.shieldHP<S_.hp*.2||(u.role==='att'&&!hot&&Math.random()<dt*.3)))ability(u);}
 aiAir(u,dt,t,dist,see);
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
  if(w.chg&&ap)w.aimPt=ap;w.cd-=dt;if(!w.reload&&!see&&w.ammo<X.mag*.3)w.reload=X.reload;
  if(ok&&facing&&w.cd<=0&&!w.reload&&w.fireCd<=0&&(!X.spin||w.spin>.5)){if(w.burst<=0)w.burst=X.aiBurst;
   if(X.emp&&t.empT>X.stun*.4&&!(t.shieldOn)){w.cd=.5;continue;}fireWeapon(u,w,ap,X.homing&&u.lockT>X.lockTime?t:null);w.burst--;if(w.burst<=0||w.reload){w.burst=0;const bp=pr.burstPause;w.cd=bp[0]+Math.random()*(bp[1]-bp[0]);}}}}

// ---------- lasers (v14): continuous hitscan beam, heat instead of a magazine ----------
const lbG=new THREE.CylinderGeometry(1,1,1,6,1,true);lbG.rotateX(Math.PI/2);const scG=new THREE.CircleGeometry(1,10);scG.rotateX(-Math.PI/2);const scM=new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.6,depthWrite:false});const SCORCH=[];
function fireBeam(u,w,aimPt){const W=w.W,pr=u.prof;w.fireCd=W.interval*(pr?pr.fireMul:1);if(u===P&&Math.random()<.1)STATS.shots++;
 const gi=w.gi,f=muzzle(u,gi),d=aimPt.clone().sub(f).normalize();const s=(pr?pr.spread*.4:0);d.x+=(Math.random()-.5)*s;d.y+=(Math.random()-.5)*s*.5;d.z+=(Math.random()-.5)*s;d.normalize();
 const sw=sweep(f,d,W.range,u.team),L=sw?sw.t:W.range,end=f.clone().addScaledVector(d,L);
 if(sw&&sw.u){HITF=W.fam;hurt(sw.u,W.dmg*(pr?pr.dmgMul:1)*(CFG.firepower[u.type]||1),end,u);if(u===P){STATS.hits+=.1;hitMarkT=.12;}}
 w.heat=Math.min(1,(w.heat||0)+W.heat*W.interval*(u===P?1:.9));w.beamT=.13;sfx('shot',{u,fam:'laser',size:W.size,gi});if(w.heat>=1){w.reload=W.reload;w.burst=0;if(u===P)toast('OVERHEAT');}
 u.kick[gi]=Math.min(.3,u.kick[gi]+W.kick);
 if(!w.bm){const z=SIZES[W.size].sc;w.bm=new THREE.Group();const core=new THREE.Mesh(lbG,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}));core.scale.set(.07*z,.07*z,1);
  const glow=new THREE.Mesh(lbG,new THREE.MeshBasicMaterial({color:W.color,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(.22*z,.22*z,1);w.bm.add(core,glow);w.bm.userData={glow};S.add(w.bm);u.beams=u.beams||[];u.beams.push(w.bm);}
 const bm=w.bm;bm.visible=true;bm.position.copy(f).lerp(end,.5);bm.scale.set(1+Math.random()*.25,1+Math.random()*.25,L);bm.lookAt(end);bm.userData.t=.13;
 if(sw&&Math.random()<(gfxLow()?.35:.8)){sparks(end,W.color===0xff3050?0xff8080:0xffb060);if(Math.random()<.4)fx(end,.6,0xff7050,{life:.2,grow:2,op:.8});}
 if(sw&&!sw.u&&Math.random()<.25)scorch(end,d);}
function gfxLow(){return settings.gfx==='low';}
function scorch(p,d){if(SCORCH.length>(gfxLow()?12:40)){const o=SCORCH.shift();S.remove(o);}const m=new THREE.Mesh(scG,scM);m.scale.setScalar(.35+Math.random()*.3);
 if(p.y<.2){m.position.set(p.x,.04,p.z);}else{m.position.copy(p).addScaledVector(d,-.05);m.lookAt(p.clone().sub(d));m.rotateX(Math.PI/2);}S.add(m);SCORCH.push(m);}
function tickBeams(dt){for(const u of U)if(u.beams)for(const b of u.beams){b.userData.t-=dt;if(b.userData.t<=0||!u.alive)b.visible=false;}}

// ---------- v15: EMP cannon (charged Tesla bolt) + nanite DoT ----------
function chargeEmp(u,w,aimPt){if(w.chg)return false;const W=w.W,pr=u.prof;w.chg=clock;w.aimPt=aimPt.clone();w.fireCd=W.charge+W.interval*(pr?pr.fireMul:1);sfx('charge',{u,d:W.charge});return true;}
function zap(a,b,c,n){const pts=[a.clone()];const d=b.clone().sub(a);for(let i=1;i<n;i++){const q=a.clone().addScaledVector(d,i/n);q.x+=Rn(-.6,.6);q.y+=Rn(-.6,.6);q.z+=Rn(-.6,.6);pts.push(q);}pts.push(b.clone());for(let i=0;i<pts.length-1;i++)bolt(pts[i],pts[i+1],c);}
function empHit(t,W,src){if(t.isDome){const h=t.host;domeHurt(t,W.dmg*1.5+h.T.dome.empDrain,null,src);t=h;if(!t.alive)return;}if(t.domeOn)domeDrop(t,false);if(src===P)chEv('emps',1);t.empT=Math.max(t.empT||0,W.stun);t.empSlow=W.slow;if(t.shieldOn)dropShield(t);t.dashT=0;if(t===P){shake(.25);toast&&toast('⚡ EMP — systems offline');}}
function empShot(u,w,aimPt){HITF='emp';if(u!==P)window.__empN=(window.__empN||0)+1;const W=w.W,pr=u.prof;if(u===P)STATS.shots++;w.ammo--;if(w.ammo<=0)w.reload=W.reload;
 const f=muzzle(u,w.gi);const d=aimPt.clone().sub(f).normalize();const sw=sweep(f,d,W.range,u.team);const L=sw?sw.t:W.range;const e=f.clone().addScaledVector(d,L);
 zap(f,e,0x80e0ff,Math.max(4,L/4|0));if(!gfxLow())zap(f,e,0xffffff,Math.max(3,L/6|0));fx(e,W.blast*1.2,0x80e0ff,{grow:2,life:.35,op:.8});sparks(e,0x80e0ff);sparks(e,0xffffff);flashLight(e,3);
 u.kick[w.gi]=Math.min(1,u.kick[w.gi]+W.kick);u.jolt=Math.min(.12,u.jolt+W.jolt);if(u===P)shake(.08);sfx('shot',{u,fam:W.fam,size:W.size,gi:w.gi});
 const dm=W.dmg*(pr?pr.dmgMul:1)*(CFG.firepower[u.type]||1);
 if(sw&&sw.u){hurt(sw.u,dm,e,u);empHit(sw.u,W,u);if(u===P){STATS.hits++;hitMarkT=.18;}}
 for(const t of foes(u.team)){if(!t.alive||(sw&&t===sw.u))continue;const tp=t.g.position;if(Math.hypot(tp.x-e.x,tp.z-e.z)<W.blast+1.5&&Math.abs(tp.y+2.5-e.y)<4){if(!domeSafe(t,e,u.team))hurt(t,dm*.4,null,u);empHit(t,W,u);}}}
function naniteHit(t,W,src,dmg){if(t.isDome)return;const fp=src&&src.prof?src.prof.dmgMul:1;const dps=W.dot*fp*(CFG.firepower[src.type]||1)/W.dotT;if(!t.dot||t.dot.dps<=dps)t.dot={dps,t:W.dotT,src,leech:W.leech};else t.dot.t=W.dotT;if(src&&src.alive){const h0=src.hp;src.hp=Math.min(src.max,src.hp+dmg*W.leech);if(src===P)chEv('heal',src.hp-h0);}}
// ---------- v20: procedural WebAudio (buses: master > sfx / ui / amb), per-pilot volumes ----------
let AC=null,BUS=null,NOISE=null,AMB_S=null;const SLAST={};
const AUD_DEF={master:.8,sfx:.9,ui:.7,amb:.5,mute:false};
function aud(){return Object.assign({},AUD_DEF,(typeof SAVE!=='undefined'&&SAVE&&SAVE.audio)||{});}
function audApply(){if(!BUS)return;const a=aud(),t=AC.currentTime;BUS.m.gain.setTargetAtTime(a.mute?0:a.master,t,.03);BUS.sfx.gain.setTargetAtTime(a.sfx,t,.03);BUS.ui.gain.setTargetAtTime(a.ui,t,.03);BUS.amb.gain.setTargetAtTime(a.amb,t,.03);}
function unlockAudio(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  const m=AC.createGain(),c=AC.createDynamicsCompressor();c.threshold.value=-14;c.ratio.value=4;m.connect(c);c.connect(AC.destination);
  BUS={m,sfx:AC.createGain(),ui:AC.createGain(),amb:AC.createGain()};BUS.sfx.connect(m);BUS.ui.connect(m);BUS.amb.connect(m);
  const n=AC.sampleRate*2,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;NOISE=b;audApply();}
 if(AC.state!=='running'&&AC.resume)AC.resume().then(()=>{if(mode==='play'&&!AMB_S)ambStart();}).catch(()=>{});
 if(!unlockAudio.ok){try{const s=AC.createBufferSource();s.buffer=AC.createBuffer(1,1,22050);s.connect(AC.destination);s.start(0);unlockAudio.ok=1;}catch(e){}}}// iOS: silent buffer inside the gesture
for(const ev of['touchstart','touchend','mousedown','keydown','click'])addEventListener(ev,unlockAudio,{passive:true,capture:true});
const live=()=>AC&&BUS&&AC.state==='running';
const rj=(x,p=.08)=>x*(1+(Math.random()*2-1)*p);
function aOut(g,bus,pan){if(pan&&AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(bus);}else g.connect(bus);}
function aEnv(g,T,a,v,d){g.gain.setValueAtTime(.0001,T);g.gain.linearRampToValueAtTime(Math.max(.0002,v),T+a);g.gain.exponentialRampToValueAtTime(.0001,T+a+d);}
function tone(o){const{bus=BUS.sfx,type='sine',f=440,f2,t=0,a=.004,d=.15,v=.2,pan=0,lp}=o;const T=AC.currentTime+t,s=AC.createOscillator(),g=AC.createGain();s.type=type;s.frequency.setValueAtTime(f,T);if(f2)s.frequency.exponentialRampToValueAtTime(Math.max(20,f2),T+a+d);
 let n=s;if(lp){const F=AC.createBiquadFilter();F.type='lowpass';F.frequency.value=lp;s.connect(F);n=F;}n.connect(g);aEnv(g,T,a,v,d);aOut(g,bus,pan);s.start(T);s.stop(T+a+d+.05);}
function nz(o){const{bus=BUS.sfx,type='bandpass',f=1000,f2,q=1,t=0,a=.002,d=.1,v=.2,pan=0,rate=1}=o;const T=AC.currentTime+t,s=AC.createBufferSource(),F=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NOISE;s.playbackRate.value=rate;
 F.type=type;F.frequency.setValueAtTime(f,T);if(f2)F.frequency.exponentialRampToValueAtTime(Math.max(20,f2),T+a+d);F.Q.value=q;s.connect(F);F.connect(g);aEnv(g,T,a,v,d);aOut(g,bus,pan);s.start(T,Math.random()*1.5);s.stop(T+a+d+.05);}
// distance attenuation + stereo pan relative to the camera
function spat(pos){if(!pos||typeof C==='undefined')return{v:1,pan:0};const dx=pos.x-C.position.x,dz=pos.z-C.position.z,d=Math.hypot(dx,dz);
 const v=1/(1+d*d/500);const rx=Math.cos(C.rotation.y),rz=-Math.sin(C.rotation.y);return{v,pan:d>1?(dx*rx+dz*rz)/d*.7:0};}
function gate(k,dt){const n=AC.currentTime;if(SLAST[k]&&n-SLAST[k]<dt)return false;SLAST[k]=n;return true;}
// per-mech step character: Guardian heavier (lower clank, slower servo) but not boomy, Phantom light and bright
const STEPC={guardian:{c:1700,s:120,th:.07,v:1},phantom:{c:3600,s:420,th:.015,v:.5},strider:{c:2800,s:300,th:.03,v:.7},mender:{c:2500,s:250,th:.035,v:.75},locke:{c:2200,s:200,th:.05,v:.85},skyhawk:{c:3300,s:380,th:.02,v:.55},aegis:{c:1900,s:160,th:.06,v:.9}};
function sfx(k,o){if(!live())return;try{sfx0(k,o||{});}catch(e){if(!sfx.err){sfx.err=1;console.warn('sfx',k,e);}}}
function sfx0(k,o){const u=o.u,sp=spat(o.p||(u&&u.g&&u.g.position)),mine=u&&u===P;let V=mine?1:sp.v;const pan=mine?0:sp.pan;
 switch(k){
 case'step':{if(V<.03)return;const c=STEPC[u&&u.type]||STEPC.strider,v=c.v*V*(mine?.75:.9);
  nz({type:'bandpass',f:rj(c.c,.1),q:7,d:rj(.05),v:.2*v,pan});                       // metallic clank
  tone({type:'triangle',f:rj(c.c*.47,.06),d:.09,v:.035*v,pan});                       // short ring
  tone({type:'sawtooth',f:rj(c.s),f2:c.s*.72,d:.08,v:.04*v,lp:1100,pan,t:.01});       // servo
  tone({f:rj(115,.1),f2:75,d:.06,v:c.th*v,pan});                                      // small low tick (no boom)
  nz({type:'highpass',f:4500,t:.05,a:.01,d:.08,v:.03*v,pan});break;}                   // hydraulic hiss
 case'land':{const c=STEPC[u&&u.type]||STEPC.strider,v=V*(o.k||1);nz({f:c.c*.8,q:4,d:.12,v:.3*v,pan});tone({f:140,f2:60,d:.12,v:.12*v,pan});nz({type:'highpass',f:3500,t:.06,a:.02,d:.25,v:.07*v,pan});break;}
 case'jump':nz({type:'lowpass',f:500,f2:2500,a:.05,d:.45,v:.25*V,q:2,pan});tone({type:'sawtooth',f:180,f2:420,d:.3,v:.05*V,lp:900,pan});break;
 case'dash':nz({f:600,f2:3200,q:3,a:.02,d:.28,v:.3*V,pan});tone({type:'square',f:300,f2:900,d:.15,v:.04*V,lp:2000,pan});break;
 case'shot':{if(!mine&&(V<.04||!gate('s'+(u?(u._sid||(u._sid=++SLAST.n||(SLAST.n=1))):0)+o.fam,.07)))return;if(mine&&!gate('ps'+o.gi,.035))return;const z=o.size==='S'?1.25:o.size==='L'?.78:1,v=V*(mine?1:.8);
  switch(o.fam){
   case'railgun':tone({type:'sawtooth',f:2000*z,f2:110,d:.35,v:.1*v,lp:5000,pan});nz({type:'highpass',f:3000,d:.15,v:.2*v,pan});break;
   case'hornet':case'rocket':nz({type:'lowpass',f:1200*z,f2:300,a:.01,d:.35,v:.25*v,pan});tone({f:200*z,f2:80,d:.12,v:.1*v,pan});break;
   case'shotgun':nz({type:'lowpass',f:2200*z,f2:400,d:.22,v:.45*v,pan});tone({f:110*z,f2:45,d:.1,v:.18*v,pan});break;
   case'emp':nz({type:'highpass',f:3500,d:.25,v:.25*v,pan});tone({type:'square',f:1300,f2:150,d:.25,v:.07*v,pan,lp:4000});break;
   case'nanite':nz({f:3000*z,q:2,d:.07,v:.15*v,pan});tone({type:'triangle',f:1400*z,f2:900,d:.06,v:.05*v,pan});break;
   case'lockbolt':tone({type:'square',f:300*z,f2:900,d:.12,v:.06*v,pan,lp:2500});nz({f:1500,d:.08,v:.1*v,pan});break;
   case'swarm':nz({type:'bandpass',f:rj(2600*z),q:1.2,a:.005,d:.16,v:.2*v,pan});tone({type:'sawtooth',f:520*z,f2:1300*z,d:.09,v:.035*v,lp:2600,pan});break;
   case'pulse':tone({f:150*z,f2:55,d:.22,v:.26*v,pan});tone({type:'triangle',f:900*z,f2:260,d:.18,v:.08*v,pan});nz({type:'lowpass',f:900,d:.12,v:.15*v,pan});break;
   case'laser':tone({type:'sawtooth',f:rj(900*z,.03),d:.07,v:.05*v,pan,lp:3000});break;
   default:nz({f:rj(2400*z),q:1.5,d:.05,v:.22*v,pan});tone({type:'square',f:170*z,f2:90,d:.04,v:.06*v,pan,lp:1500});}break;}
 case'boom':{const kk=o.k||1;if(V<.03)return;if(!gate('boom',.05))return;tone({f:90,f2:28,d:.6*kk,v:.45*V*Math.min(1.5,kk),pan});nz({type:'lowpass',f:1400,f2:150,d:.7*kk,v:.4*V,pan});break;}
 case'destroy':nz({f:1500,q:2,t:.05,d:.6,v:.25*V,pan});tone({type:'square',f:400,f2:60,t:.02,d:.5,v:.05*V,lp:1500,pan});if(o.foe)tone({bus:BUS.ui,type:'triangle',f:880,d:.08,v:.12,t:.1}),tone({bus:BUS.ui,type:'triangle',f:1320,d:.15,v:.12,t:.2});break;
 case'hit':if(!gate('hit',.05))return;tone({bus:BUS.ui,type:'triangle',f:rj(1900,.04),d:.04,v:.1});break;
 case'hitsh':if(!gate('hit',.05))return;tone({bus:BUS.ui,type:'sine',f:700,d:.05,v:.08});break;
 case'hurt':if(!gate('hurt',.08))return;nz({type:'lowpass',f:700,d:.14,v:.35});tone({type:'square',f:200,f2:90,d:.1,v:.07,lp:900});break;
 case'lowhp':tone({bus:BUS.ui,type:'square',f:660,d:.08,v:.05,lp:2000});tone({bus:BUS.ui,type:'square',f:660,d:.08,v:.05,lp:2000,t:.15});break;
 case'reload':nz({f:1500,q:5,d:.04,v:.15});tone({type:'square',f:520,d:.03,v:.03,t:.07,lp:2000});break;
 case'reloaded':nz({f:2400,q:6,d:.03,v:.15});nz({f:3200,q:6,d:.03,v:.15,t:.09});break;
 case'overheat':nz({type:'highpass',f:3000,f2:1200,a:.02,d:.8,v:.18});tone({type:'sawtooth',f:1200,f2:500,d:.4,v:.04,lp:3000});break;
 case'lowammo':tone({bus:BUS.ui,type:'square',f:1500,d:.04,v:.04});tone({bus:BUS.ui,type:'square',f:1500,d:.04,v:.04,t:.09});break;
 case'domeUp':tone({type:'sine',f:120,f2:480,a:.03,d:.55,v:.18*V,pan});tone({type:'triangle',f:660,f2:1320,t:.12,d:.4,v:.05*V,pan});nz({type:'highpass',f:4000,a:.1,d:.5,v:.05*V,pan});break;
 case'domeDown':tone({type:'sine',f:480,f2:110,d:.4,v:.12*V,pan});break;
 case'domeHit':if(!gate('dh'+(u&&u._sid),.06))return;tone({f:rj(420,.08),f2:300,d:.18,v:.1*V,pan});tone({type:'triangle',f:rj(1250,.05),d:.1,v:.04*V,pan});break;
 case'domeBreak':nz({type:'highpass',f:1800,d:.8,v:.32*V,pan});tone({type:'sawtooth',f:700,f2:70,d:.7,v:.1*V,lp:2500,pan});tone({f:90,f2:40,d:.5,v:.25*V,pan});break;
 case'dive':tone({type:'sawtooth',f:300,f2:1100,d:.6,v:.07*V,lp:2200,pan});nz({type:'bandpass',f:900,f2:3000,q:1.5,a:.05,d:.7,v:.2*V,pan});break;
 case'diveHit':tone({f:70,f2:25,d:.9,v:.55*V,pan});nz({type:'lowpass',f:2000,f2:120,d:.9,v:.5*V,pan});break;
 case'thrust':nz({type:'lowpass',f:rj(700),q:.7,a:.04,d:.3,v:.11*V,pan});break;
 case'shUp':tone({type:'sawtooth',f:180,f2:620,a:.02,d:.35,v:.08*V,lp:1600,pan});nz({f:2000,q:2,d:.25,v:.06*V,pan});break;
 case'shDown':tone({type:'sawtooth',f:600,f2:160,d:.3,v:.07*V,lp:1400,pan});break;
 case'shHit':if(!gate('shh'+(u&&u._sid),.07))return;tone({f:rj(900),d:.12,v:.08*V,pan});nz({f:2600,q:3,d:.07,v:.12*V,pan});break;
 case'shBreak':nz({type:'highpass',f:2500,d:.5,v:.3*V,pan});tone({type:'triangle',f:900,f2:120,d:.45,v:.1*V,pan});break;
 case'lockdown':tone({f:130,f2:55,a:.05,d:1.1,v:.25*V,pan});tone({type:'square',f:440,f2:880,d:.35,v:.05*V,lp:1800,pan});break;
 case'charge':tone({type:'sawtooth',f:200,f2:1400,a:.02,d:o.d||.4,v:.05*V,lp:3000,pan});break;
 case'stun':tone({type:'square',f:58,d:.7,v:.08,lp:600});nz({type:'highpass',f:4000,d:.4,v:.15});tone({type:'square',f:1800,f2:300,d:.3,v:.04});break;
 case'heal':if(!gate('heal',.6))return;tone({f:880,f2:1320,a:.02,d:.18,v:.05});tone({f:1320,f2:1760,t:.1,a:.02,d:.18,v:.04});break;
 case'drone':if(!gate('drone',.9))return;tone({type:'triangle',f:1500,f2:1700,a:.03,d:.15,v:.03*V,pan});break;
 case'denied':tone({bus:BUS.ui,type:'square',f:220,d:.07,v:.06,lp:1200});tone({bus:BUS.ui,type:'square',f:180,d:.09,v:.06,lp:1200,t:.1});break;
 case'click':if(!gate('click',.03))return;tone({bus:BUS.ui,type:'triangle',f:1300,f2:900,d:.04,v:.1});break;
 case'deploy':[0,.35,.7].forEach((t,i)=>tone({bus:BUS.ui,type:'square',f:i<2?440:880,d:i<2?.12:.35,v:.07,t,lp:2500}));nz({type:'lowpass',f:300,f2:1500,t:.7,a:.1,d:.8,v:.15});break;
 case'win':[523,659,784,1047].forEach((f,i)=>tone({bus:BUS.ui,type:'triangle',f,d:i<3?.2:.7,v:.12,t:i*.14}));break;
 case'lose':[392,349,311,262].forEach((f,i)=>tone({bus:BUS.ui,type:'sawtooth',f,d:i<3?.25:.8,v:.06,t:i*.22,lp:1200}));break;
 case'chal':[784,988,1175,1568].forEach((f,i)=>tone({bus:BUS.ui,type:'triangle',f,d:.18,v:.09,t:i*.08}));break;
 case'coins':for(let i=0;i<(o.n||6);i++){tone({bus:BUS.ui,type:'square',f:rj(1900,.05),d:.05,v:.035,t:i*.07,lp:5000});tone({bus:BUS.ui,type:'triangle',f:2800,d:.06,v:.03,t:i*.07+.02});}break;
 case'capT':tone({bus:BUS.ui,type:'triangle',f:500+(o.k||0)*900,d:.06,v:.06});break;
 case'capWarn':tone({bus:BUS.ui,type:'square',f:330,d:.15,v:.05,lp:1500});tone({bus:BUS.ui,type:'square',f:260,d:.15,v:.05,lp:1500,t:.18});break;
 }}
// ambient bed per map (looped filtered noise with a slow LFO)
const AMBC={arena:{t:'lowpass',f:380,v:.06,l:.07},desert:{t:'bandpass',f:700,q:.6,v:.09,l:.1},city:{t:'lowpass',f:220,v:.08,l:.04,hum:60},port:{t:'lowpass',f:520,v:.09,l:.13},arctic:{t:'bandpass',f:1300,q:1,v:.07,l:.09},canyon:{t:'bandpass',f:480,q:.7,v:.08,l:.06}};
function ambStart(){ambStop();if(!live())return;const c=AMBC[typeof mapKey!=='undefined'&&mapKey]||AMBC.arena,s=AC.createBufferSource(),F=AC.createBiquadFilter(),g=AC.createGain(),L=AC.createOscillator(),Lg=AC.createGain();
 s.buffer=NOISE;s.loop=true;F.type=c.t;F.frequency.value=c.f;F.Q.value=c.q||.7;g.gain.value=c.v*.7;L.frequency.value=c.l;Lg.gain.value=c.v*.4;L.connect(Lg);Lg.connect(g.gain);s.connect(F);F.connect(g);g.connect(BUS.amb);s.start();L.start();
 const parts=[s,L];if(c.hum){const h=AC.createOscillator(),hg=AC.createGain();h.frequency.value=c.hum;hg.gain.value=.015;h.connect(hg);hg.connect(BUS.amb);h.start();parts.push(h);}AMB_S={parts,g};}
function ambStop(){if(!AMB_S)return;const a=AMB_S;AMB_S=null;try{a.g.gain.setTargetAtTime(0,AC.currentTime,.3);setTimeout(()=>a.parts.forEach(p=>{try{p.stop();}catch(e){}}),1500);}catch(e){}}
// per-frame state watcher for the player (reload / heat / ammo / shield / stun / heal / capture)
const SW={};
function sndWatch(dt){if(!live()||!P)return;const s=SW;if(s.P!==P){for(const k in s)delete s[k];s.P=P;s.ws=P.ws.map(()=>({}));}
 P.ws.forEach((w,i)=>{const o=s.ws[i]||(s.ws[i]={}),W=w.W;const r=!!w.reload,ohN=!!(W.heat&&w.heat>=.999);if(r&&!o.r&&!ohN)sfx('reload');if(!r&&o.r)sfx('reloaded');o.r=r;
  const oh=ohN;if(oh&&!o.oh)sfx('overheat');o.oh=oh;
  const lo=W.mag>3&&w.ammo>0&&w.ammo<=Math.max(1,Math.ceil(W.mag*.2));if(lo&&!o.lo)sfx('lowammo');o.lo=lo;});
 const sh=!!P.shieldOn;if(sh&&!s.sh)sfx('shUp',{u:P});if(!sh&&s.sh)sfx(P.shieldHP<=0?'shBreak':'shDown',{u:P});s.sh=sh;
 if(P.shHit&&P.shHit!==s.shHit&&sh)sfx('shHit',{u:P});s.shHit=P.shHit;
 const st=(P.empT||0)>0;if(st&&!s.st)sfx('stun');s.st=st;
 const da=(P.dashT||0)>0;if(da&&!s.da)sfx('dash',{u:P});s.da=da;
 const jp=P.air&&P.vy>4;if(jp&&!s.jp)sfx('jump',{u:P});s.jp=jp;
 if(P.alive&&s.hp!==undefined&&P.hp>s.hp+.01)sfx('heal');s.hp=P.hp;
 s.lowT=(s.lowT||0)-dt;if(P.alive&&P.hp<P.T.hp*.25&&s.lowT<=0){sfx('lowhp');s.lowT=1.4;}
 if(typeof BASES!=='undefined'&&settings.mode==='base'){for(const b of Object.values(BASES)){const q=Math.floor(b.prog*10),kq='b'+b.team;if(b.state==='CAPTURING'&&q!==s[kq]){if(b.team==='b')sfx('capWarn');else sfx('capT',{k:b.prog});}s[kq]=q;}}}
// ---------- v15 detail pass: props, decals, ambient fx, birds, footprints ----------
const decalG=new THREE.PlaneGeometry(1,1);decalG.rotateX(-Math.PI/2);
const stainT=tex(64,64,(g)=>{const r=g.createRadialGradient(32,32,2,32,32,31);r.addColorStop(0,'rgba(10,8,6,.7)');r.addColorStop(.6,'rgba(10,8,6,.35)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);});
const crackT=tex(64,64,(g)=>{g.strokeStyle='rgba(15,15,15,.75)';g.lineWidth=2;for(let k=0;k<5;k++){g.beginPath();let x=32,y=32;g.moveTo(x,y);for(let i=0;i<5;i++){x+=(Math.random()-.5)*24;y+=(Math.random()-.5)*24;g.lineTo(x,y);}g.stroke();}});
const stripeT=tex(64,16,(g)=>{for(let i=-2;i<10;i++){g.fillStyle=i%2?'rgba(230,180,20,.8)':'rgba(20,20,20,.8)';g.beginPath();g.moveTo(i*8,0);g.lineTo(i*8+8,0);g.lineTo(i*8,16);g.lineTo(i*8-8,16);g.fill();}});
const footT=tex(32,32,(g)=>{g.fillStyle='rgba(0,0,0,.5)';g.fillRect(6,4,20,24);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(2,0,28,32);});
const dmat=t=>new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
const DM={stain:dmat(stainT),crack:dmat(crackT),stripe:dmat(stripeT)};
const torG2=new THREE.TorusGeometry(.5,.18,6,12),coneG2=new THREE.ConeGeometry(.3,.8,8),shardG=new THREE.ConeGeometry(.6,3,5),shockG=new THREE.RingGeometry(.7,1,24);shockG.rotateX(-Math.PI/2);
const FLK=new THREE.MeshBasicMaterial({color:0xffe0a0});let AMB=[],BIRDS=[];
const lowG=()=>typeof settings!=='undefined'&&settings.gfx==='low';
function barrel(x,z,c){deco(cylG,mat(c),x,.65,z,.5,1.3,.5);deco(cylG,mat(0x2a2a2a),x,1.31,z,.52,.04,.52);const o={x,z,hx:.55,hz:.55,h:1.3};obst.push(o);}
function detail(key){AMB=[];const low=lowG(),k=low?.5:1;
 // ground decals (all maps)
 scatter(Math.round(26*k),1,(x,z)=>deco(decalG,DM.stain,x,.04,z,R2(2,6),1,R2(2,6),R2(0,3)));
 scatter(Math.round(18*k),1,(x,z)=>deco(decalG,DM.crack,x,.05,z,R2(3,7),1,R2(3,7),R2(0,3)));
 // rubble chunks
 scatter(Math.round(30*k),1,(x,z)=>{for(let i=0;i<3;i++)deco(rockG,mat(0x5a554c),x+R2(-1.5,1.5),.15,z+R2(-1.5,1.5),R2(.15,.4),R2(.1,.3),R2(.15,.4),R2(0,3));});
 // barrel clusters, some burning
 const bc={arena:0x8a3020,desert:0x9a6a30,city:0x2a4a7a,port:0x2a6a3a,arctic:0xa03030,canyon:0x6a5030}[key]||0x666666;
 scatter(8,2,(x,z)=>{barrel(x,z,bc);barrel(x+1.2,z+.3,bc);if(rnd()<.5)deco(cylG,mat(bc),x+.5,.5,z+1.3,.5,1,.5,0);if(rnd()<.4)AMB.push({t:'fire',x,y:1.4,z});});
 // hazard stripes
 for(let i=0;i<6;i++){const a=i*Math.PI/3;deco(decalG,DM.stripe,Math.cos(a)*(A*.55),.06,Math.sin(a)*(A*.55),8,1,2,a);}
 if(key==='desert'){scatter(14,2,(x,z)=>{deco(cylG,mat(0x3f6a35),x,1.6,z,.35,3.2,.35);deco(cylG,mat(0x3f6a35),x+.6,2,z,.22,1.4,.22);deco(cylG,mat(0x3f6a35),x-.55,1.6,z,.2,1.1,.2);obst.push({x,z,hx:.4,hz:.4,h:3.2});});for(let i=0;i<4;i++)AMB.push({t:'dust'});}
 if(key==='canyon'){scatter(10,2,(x,z)=>{deco(cylG,mat(0x4a3a2a),x,2,z,.25,4,.25);deco(boxG,mat(0x4a3a2a),x+.6,3.3,z,1.3,.15,.15,R2(0,3));deco(boxG,mat(0x4a3a2a),x-.4,2.8,z,.15,.15,1.1,R2(0,3));obst.push({x,z,hx:.3,hz:.3,h:4});});for(let i=0;i<4;i++)AMB.push({t:'dust'});}
 if(key==='arctic'){scatter(16,2,(x,z)=>{for(let i=0;i<3;i++)deco(shardG,mat(0xbfe6ff),x+R2(-1,1),1.2,z+R2(-1,1),R2(.6,1.1),R2(.6,1.2),R2(.6,1.1),R2(0,3));obst.push({x,z,hx:1,hz:1,h:2.5});});for(let i=0;i<6;i++)AMB.push({t:'snow'});}
 if(key==='port'){scatter(14,2,(x,z)=>{deco(boxG,mat(0x8a6a40),x,.15,z,1.6,.3,1.6,R2(0,3));if(rnd()<.5)deco(boxG,mat(0x9a7a50),x,.75,z,1.2,.9,1.2,R2(0,3));});scatter(8,1,(x,z)=>{deco(torG2,mat(0x1a1a1a),x,.18,z,1,1,1,0);});}
 if(key==='city'||key==='arena'){scatter(16,1,(x,z)=>deco(coneG2,mat(0xff7020),x,.4,z,1));}
 if(key==='city'||key==='port'||key==='arctic')scatter(6,2,(x,z)=>{deco(cylG,mat(0x3a3a3a),x,.1,z,.9,.2,.9);AMB.push({t:'steam',x,y:.3,z});});
 // flickering work lights
 scatter(low?4:8,2,(x,z)=>{deco(poleG,mat(0x333333),x,3,z,1,1,1);deco(bulbG,FLK,x,6.1,z,1.2);if(key==='city'||key==='port')AMB.push({t:'spark',x,y:6,z});});
 // birds
 for(const b of BIRDS)S.remove(b.g);BIRDS=[];if(key!=='arctic'&&key!=='city'){const bm=new THREE.MeshBasicMaterial({color:0x222222,side:THREE.DoubleSide});for(let i=0;i<(low?2:6);i++){const g=new THREE.Group(),w1=new THREE.Mesh(boxG,bm),w2=new THREE.Mesh(boxG,bm);w1.scale.set(1,.05,.35);w2.scale.set(1,.05,.35);w1.position.x=.5;w2.position.x=-.5;g.add(w1,w2);S.add(g);BIRDS.push({g,w1,w2,r:R2(15,A*.8),h:R2(24,36),a:R2(0,6.3),s:R2(.15,.3)*(rnd()<.5?1:-1),ph:R2(0,6)});}}
}
const _av=new THREE.Vector3();
function updAmb(dt){updSeg(dt);const low=lowG(),rate=low?.3:1,t=clock||performance.now()/1000;FLK.color.setHex(Math.random()<.06?0x403020:(Math.random()<.5?0xffe0a0:0xfff0c0));
 if(BLINK)BLINK.color.setHex(((t*2)|0)%2?0xff2020:0x300000);
 for(const b of BIRDS){b.a+=b.s*dt;b.g.position.set(Math.cos(b.a)*b.r,b.h+Math.sin(t+b.ph)*1.5,Math.sin(b.a)*b.r);b.g.rotation.y=-b.a+(b.s>0?0:Math.PI);const f=Math.sin(t*9+b.ph)*.6;b.w1.rotation.z=f;b.w2.rotation.z=-f;}
 if(mode!=='play'||FX.length>CFG.fx.maxFx*.7)return;const cp=C.position;
 for(const a of AMB){if(a.x!==undefined&&Math.abs(a.x-cp.x)+Math.abs(a.z-cp.z)>90)continue;const r=Math.random();
  if(a.t==='steam'&&r<dt*6*rate)fx(_av.set(a.x+Rn(-.3,.3),a.y,a.z+Rn(-.3,.3)),1.2,0xdddddd,{grow:2.5,life:1.6,op:.35,vy:3});
  else if(a.t==='fire'&&r<dt*10*rate){fx(_av.set(a.x+Rn(-.3,.3),a.y,a.z+Rn(-.3,.3)),.9,Math.random()<.5?0xff8020:0xffc040,{grow:1,life:.5,op:.8,vy:3});if(Math.random()<.3)fx(_av.set(a.x,a.y+1,a.z),1.2,0x333333,{grow:2,life:1.4,op:.35,vy:2.5});}
  else if(a.t==='spark'&&r<dt*.8*rate){for(let i=0;i<5;i++)fx(_av.set(a.x,a.y,a.z),.8,0xffe070,{box:1,grow:0,life:.6,v:new THREE.Vector3(Rn(-3,3),Rn(0,3),Rn(-3,3))});}
  else if(a.t==='dust'&&r<dt*2*rate)fx(_av.set(cp.x+Rn(-30,30),.6,cp.z+Rn(-30,30)),2.5,0xc8b48a,{grow:2,life:2.2,op:.22,v:new THREE.Vector3(6,.5,2)});
  else if(a.t==='snow'&&r<dt*6*rate)fx(_av.set(cp.x+Rn(-25,25),Rn(8,16),cp.z+Rn(-25,25)),.5,0xffffff,{box:1,grow:0,life:2.5,g:0,v:new THREE.Vector3(Rn(-1,1),-4,Rn(-1,1)),op:.9});}}
function Rn(a,b){return a+Math.random()*(b-a);}
// footprints: recycled pool of flat decals
const FPM=new THREE.MeshBasicMaterial({map:footT,transparent:true,depthWrite:false,opacity:.55,polygonOffset:true,polygonOffsetFactor:-3});const FP=[];let fpI=0;
function footMark(u,f){if(f.y>.15)return;const n=lowG()?20:70;let m=FP[fpI%n];if(!m){m=new THREE.Mesh(decalG,FPM);FP[fpI%n]=m;S.add(m);}fpI++;const s=(u.T.mass||1);m.position.set(f.x,.03,f.z);m.scale.set(1.1*s,1,1.5*s);m.rotation.y=u.legYaw||u.tYaw||0;m.visible=mode==='play';}
function clearMarks(){for(const m of FP)if(m)m.visible=false;}
// bigger explosion: shockwave ring + scorch + dust skirt
function explodeX(p,k){const gp=new THREE.Vector3(p.x,0,p.z);scorch(gp);SCORCH[SCORCH.length-1].scale.setScalar(2.2*k);if(lowG())return;fx(_av.set(p.x,.3,p.z),5*k,0xffd090,{geo:shockG,grow:3,life:.45,op:.7});
 for(let i=0;i<6;i++){const a=i/6*6.28;fx(_av.set(p.x+Math.cos(a)*2*k,.5,p.z+Math.sin(a)*2*k),2*k,0x8a7a62,{grow:2,life:.9,op:.4,v:new THREE.Vector3(Math.cos(a)*5,1,Math.sin(a)*5)});}}
// lightning segments (shared additive materials, short life)
const SEGM={},SEG=[];const segG=new THREE.CylinderGeometry(1,1,1,4,1,true);segG.rotateX(Math.PI/2);
function bolt(a,b,c){if(SEG.length>(lowG()?60:160))return;const m=SEGM[c]||(SEGM[c]=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));
 const s=new THREE.Mesh(segG,m),L=a.distanceTo(b);s.position.copy(a).add(b).multiplyScalar(.5);s.lookAt(b);const w=c===0xffffff?.04:.1;s.scale.set(w,w,L);S.add(s);SEG.push({s,t:c===0xffffff?.1:.16});}
function updSeg(dt){for(let i=SEG.length-1;i>=0;i--){const g=SEG[i];g.t-=dt;if(g.t<=0){S.remove(g.s);SEG.splice(i,1);}}}
// ---------- v16: LOCKE — Lockdown root field + Lockbolt magnetic tether ----------
let FIELDS=[],TETHERS=[];const lockMat=new THREE.MeshBasicMaterial({color:0xb070ff,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}),
 lockRingMat=new THREE.MeshBasicMaterial({color:0xc898ff,transparent:true,opacity:.85,depthWrite:false}),lockWallG=new THREE.CylinderGeometry(1,1,1,36,1,true),lockRingG=new THREE.TorusGeometry(1,.035,6,48),
 rootRingG=new THREE.TorusGeometry(1.6,.08,6,24);
function lockdown(u){const L=u.T.lockdown;let tp;if(u===P){tp=playerAim();}else tp=u.tgt?u.tgt.g.position.clone():u.g.position.clone();
 const p=u.g.position,dx=tp.x-p.x,dz=tp.z-p.z,d=Math.hypot(dx,dz);if(d>L.range){tp.x=p.x+dx/d*L.range;tp.z=p.z+dz/d*L.range;}tp.y=groundAt(tp.x,tp.z,p.y+3);
 u.abCd=L.cd;u.ldT=1;if(u!==P)window.__ldN=(window.__ldN||0)+1;const g=new THREE.Group();g.position.copy(tp);S.add(g);
 const wall=new THREE.Mesh(lockWallG,lockMat);wall.scale.set(L.r,3.2,L.r);wall.position.y=1.6;g.add(wall);const rings=[];
 for(let i=0;i<3;i++){const r=new THREE.Mesh(lockRingG,lockRingMat);r.rotation.x=Math.PI/2;r.scale.setScalar(L.r);g.add(r);rings.push(r);}
 const key=new THREE.Mesh(keyG,lockRingMat);key.scale.set(14,14,1);key.rotation.x=-Math.PI/2;key.position.y=.08;g.add(key);const keyO=new THREE.Mesh(torusG,lockRingMat);keyO.scale.set(4.5,4.5,1);keyO.rotation.x=Math.PI/2;keyO.position.set(0,.08,-.9);g.add(keyO);
 const pyl=[];for(let i=0;i<3;i++){const a=i*Math.PI*2/3,m=new THREE.Mesh(boltG,lockRingMat);m.scale.set(2,2,1.6);m.rotation.x=-Math.PI/2;m.position.set(Math.cos(a)*L.r,.6,Math.sin(a)*L.r);g.add(m);pyl.push(m);}
 FIELDS.push({g,rings,pyl,wall,key,x:tp.x,z:tp.z,y:tp.y,r:L.r,t:L.dur,dur:L.dur,team:u.team,src:u});
 const ey=p.clone();ey.y+=3.6;bolt(ey,tp.clone().setY(tp.y+1),0xc090ff);boom(tp.clone().setY(tp.y+.5),2.2,0xb070ff);flashLight(tp,3);if(u===P)shake(.2);sfx('lockdown',{u});}
function tickFields(dt){for(let i=FIELDS.length-1;i>=0;i--){const f=FIELDS[i];f.t-=dt;const k=1-f.t/f.dur;
  f.rings.forEach((r,j)=>{const ph=(clock*.6+j/3)%1;r.position.y=ph*3.2;r.material.opacity=.85;});f.key.rotation.z+=dt*.6;f.pyl.forEach((m,j)=>m.position.y=.6+Math.sin(clock*4+j)*.15);
  f.wall.material.opacity=.14+.06*Math.sin(clock*8);if(f.t<.6)f.g.scale.setScalar(Math.max(.01,f.t/.6));
  for(const u of foes(f.team)){if(!u.alive)continue;const q=u.g.position;if(Math.hypot(q.x-f.x,q.z-f.z)<f.r&&Math.abs(q.y-f.y)<4){if(!(u.rootT>0)&&u===P)toast&&toast('🔒 LOCKDOWN — you are rooted');if(!(u.rootT>0)&&f.src===P)chEv('roots',1);u.rootT=.3;u.vel.multiplyScalar(.5);
    if(!u.rootFx){u.rootFx=new THREE.Mesh(rootRingG,lockRingMat);u.rootFx.rotation.x=Math.PI/2;u.g.add(u.rootFx);}u.rootFx.visible=true;u.rootFx.position.y=.3+Math.abs(Math.sin(clock*5))*.5;
    if(!gfxLow()&&Math.random()<dt*8){const a=q.clone();a.y+=Rn(.5,3);bolt(a,new THREE.Vector3(f.x,f.y+.3,f.z).lerp(a,.6),0xc090ff);}}}
  if(f.t<=0){S.remove(f.g);FIELDS.splice(i,1);}}
 for(const u of U)if(u.rootFx&&!(u.rootT>0))u.rootFx.visible=false;}
const tethMat=new THREE.LineBasicMaterial({color:0xd0a0ff,transparent:true,opacity:.9});
function tetherHit(t,W,src){if(!t||!t.alive||!src||t.isDome)return;const fp=1;if(t.teth&&t.teth.src===src){t.teth.t=W.tether;t.teth.amp=Math.max(t.teth.amp,W.amp);t.teth.slow=Math.max(t.teth.slow,W.tslow);return;}
 if(t.teth)dropTether(t);const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(10*3),3));const line=new THREE.Line(geo,tethMat);line.frustumCulled=false;S.add(line);
 t.teth={src,t:W.tether,amp:W.amp,slow:W.tslow,max:W.range*1.4,line};TETHERS.push(t);if(t===P)toast&&toast('🧲 Tethered — taking extra damage');}
function dropTether(u){if(!u.teth)return;S.remove(u.teth.line);u.teth.line.geometry.dispose();u.teth=null;const i=TETHERS.indexOf(u);if(i>=0)TETHERS.splice(i,1);}
function tickTether(u,dt){const T_=u.teth;T_.t-=dt;const s=T_.src,a=s.g.position,b=u.g.position;
 if(T_.t<=0||!u.alive||!s.alive||a.distanceTo(b)>T_.max){if(T_.t>0&&u.alive&&!gfxLow())sparks(b.clone().setY(b.y+3),0xc090ff);return dropTether(u);}
 const pa=T_.line.geometry.attributes.position,n=10;for(let i=0;i<n;i++){const k=i/(n-1),w=Math.sin(k*Math.PI)*(.35+.25*Math.sin(clock*20+i));
  pa.setXYZ(i,a.x+(b.x-a.x)*k+Math.sin(clock*13+i*1.7)*w,a.y+3.2+(b.y-a.y)*k-Math.sin(k*Math.PI)*.8+Math.cos(clock*11+i)*w,a.z+(b.z-a.z)*k+Math.cos(clock*15+i*1.3)*w);}
 pa.needsUpdate=true;T_.line.material.opacity=.5+.4*Math.min(1,T_.t);}
function clearLock(){FIELDS.forEach(f=>S.remove(f.g));FIELDS=[];TETHERS.slice().forEach(dropTether);TETHERS=[];}
// ---------- v21: SKYHAWK flight + dive strike, AEGIS force dome, swarm micro-missiles, pulse cannon ----------
const _q=new THREE.Vector3(),_q2=new THREE.Vector3();
function domeC(u,o){return o.set(u.g.position.x,u.g.position.y+1,u.g.position.z);}
function domeUp(u){return !!(u&&u.T&&u.T.dome&&u.domeOn&&u.alive&&u.domeA>.5);}
function domeR(u){return u.T.dome.r*Math.min(1,u.domeA);}
// ray vs sphere: entry distance when the origin is OUTSIDE the sphere, else -1 (shots from inside pass out)
function raySph(o,d,c,r){const ox=o.x-c.x,oy=o.y-c.y,oz=o.z-c.z,cc=ox*ox+oy*oy+oz*oz-r*r;if(cc<=0)return -1;const b=ox*d.x+oy*d.y+oz*d.z;if(b>0)return -1;const disc=b*b-cc;if(disc<0)return -1;return -b-Math.sqrt(disc);}
function domeSweep(o,d,L,owner,best){for(const u of U){if(u.team===owner||!domeUp(u))continue;const t=raySph(o,d,domeC(u,_q),domeR(u));if(t>=0&&t<=L&&(!best||t<best.t))best={t,u:u.domeX};}return best;}
// splash / bursts from outside a dome can't reach units sheltering inside it
function domeSafe(t,pos,owner){if(!pos)return false;for(const u of U){if(u.team===owner||u.team!==t.team||!domeUp(u))continue;const c=domeC(u,_q),r=domeR(u);if(t.g.position.distanceTo(c)<r+.5&&pos.distanceTo(c)>r-.2)return true;}return false;}
function domeHurt(D,d,pos,src){const u=D.host,T=u.T.dome;if(!domeUp(u))return;const a=Math.min(d,Math.max(0,u.domeHP));u.domeHP-=d;u.domeHit=clock;u.domeFl=1;if(a>0&&u.alive){const h=Math.min(u.max-u.hp,a*T.heal);if(h>0){u.hp+=h;healPop(u,h);}}
 if(u===P)chEv('block',a);if(src===P)sfx('hitsh');else sfx('domeHit',{u,p:pos});if(pos&&!gfxLow())fx(pos,1+Math.min(2,d/40),u.team==='b'?0x80e0ff:0xff90b0,{grow:3,life:.35,op:.6});
 if(u.domeHP<=0){u.domeHP=0;domeDrop(u,true);}}
function domeDrop(u,broken){if(!u.domeOn)return;u.domeOn=false;u.domeT=0;if(broken){u.abCd=u.T.dome.brokeCd;sfx('domeBreak',{u});const c=domeC(u,_q2).clone();fx(c,u.T.dome.r*1.2,u.team==='b'?0x80e0ff:0xff90b0,{grow:1.6,life:.45,op:.5});if(u===P){shake(.25);toast&&toast('DOME BROKEN — generator rebooting');}}else{u.abCd=u.T.dome.cd;sfx('domeDown',{u});}}
const _hp=new THREE.Vector3();function healPop(u,h){u.healAcc=(u.healAcc||0)+h;if(clock-(u.healPopT||-9)<.35)return;u.healPopT=clock;const n=Math.round(u.healAcc);u.healAcc=0;if(n<1)return;
 if(!gfxLow())fx(_hp.set(u.g.position.x,u.g.position.y+2.5,u.g.position.z).clone(),1.2,0x50ff80,{grow:2,life:.4,op:.5});
 _hp.set(u.g.position.x,u.g.position.y+6,u.g.position.z).project(C);if(_hp.z>1||Math.abs(_hp.x)>1.1||Math.abs(_hp.y)>1.1)return;const d=document.createElement('div');d.className='healN';d.textContent='+'+n;
 d.style.left=((_hp.x+1)/2*innerWidth+(Math.random()-.5)*30)+'px';d.style.top=((1-_hp.y)/2*innerHeight)+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),900);}
function seekT(u,from,dir,W){let best=null,bs=W.seek;for(const f of foes(u.team)){const q=_q.set(f.g.position.x,f.g.position.y+2.5,f.g.position.z).sub(from);const L=q.length();if(L>W.range*1.1)continue;const c=q.dot(dir)/L;if(c>bs){bs=c;best=f;}}return best;}
function altOf(u){const p=u.g.position;return p.y-groundAt(p.x,p.z,p.y);}
// called from shoot(): per-shot damage factor for the new families
function shotMul(u,W){let k=1;if(W.altBonus)k*=1+W.altBonus*Math.min(1,Math.max(0,(altOf(u)-1)/9));return k;}
function pushU(t,v,k){if(!t||t.isDome||!t.alive)return;const l=Math.hypot(v.x,v.z)||1,m=t.T.mass||1;t.vel.x+=v.x/l*k/m;t.vel.z+=v.z/l*k/m;t.stagT=Math.max(t.stagT,.15);}
function abilityAir(u){const T=u.T;
 if(T.dome){if(u.domeOn)domeDrop(u);else if(u.abCd<=0&&!(u.empT>0)){u.domeOn=true;u.domeHP=T.dome.hp;u.domeT=T.dome.dur;sfx('domeUp',{u});if(u===P)chEv('abil',1);}else if(u===P)sfx('denied');return true;}
 if(T.dive){if(u.air&&altOf(u)>2.5){if(u.abCd>0||u.diving){if(u===P)sfx('denied');return true;}
   const p=u.g.position,tp=u===P?playerAim():(u.tgt?u.tgt.g.position.clone():p.clone().add(new THREE.Vector3(Math.sin(u.tYaw)*15,-p.y,Math.cos(u.tYaw)*15)));
   const d=tp.clone().sub(p);d.normalize();if(d.y>-.4){d.y=-.4;const h=Math.hypot(d.x,d.z)||1;d.x*=Math.sqrt(1-.16)/h;d.z*=Math.sqrt(1-.16)/h;}
   u.diveV=d.multiplyScalar(T.dive.speed);u.diveT=T.dive.dur;u.diving=true;u.abCd=T.dive.cd;sfx('dive',{u});if(u===P)chEv('abil',1);}
  else if(!u.air&&(u.lchCd||0)<=0){u.vy=T.fly.launch;u.air=true;u.lchCd=T.fly.lcd;fx(u.g.position.clone().setY(u.g.position.y+.4),2.6,0x9a927e,{grow:2.5,life:.6,op:.5});sfx('jump',{u});if(u===P)chEv('abil',1);}
  else if(u===P)sfx('denied');return true;}
 return false;}
function diveMove(u,dt){u.diveT-=dt;const p=u.g.position,v=u.diveV;u.vy=v.y;const n=Math.max(1,Math.ceil(Math.hypot(v.x,v.z)*dt/.4)),sx=v.x*dt/n,sz=v.z*dt/n;let hw=false;
 for(let i=0;i<n;i++){const nx=p.x+sx,nz=p.z+sz;if(!blocked(nx,p.z,1.4,p.y))p.x=nx;else hw=true;if(!blocked(p.x,nz,1.4,p.y))p.z=nz;else hw=true;}
 p.x=Math.max(-A+2,Math.min(A-2,p.x));p.z=Math.max(-A+2,Math.min(A-2,p.z));u.vel.set(v.x,0,v.z);
 if(Math.random()<.8)fx(p.clone().setY(p.y+2),1.2,0xffb050,{life:.4,grow:2,op:.6});if(hw||u.diveT<=0)diveImpact(u);}
function diveImpact(u){if(!u.diving)return;u.diving=false;u.diveT=0;const D=u.T.dive,p=u.g.position.clone();p.y+=1;boom(p,4,0xffaa33);flashLight(p,4);try{explodeX(p,1.4);}catch(e){}sfx('diveHit',{u});
 HITF='dive';const dm=D.dmg*(u.prof?u.prof.dmgMul:1);let n=0;
 for(const t of foes(u.team)){if(domeUp(t)&&p.distanceTo(domeC(t,_q))<domeR(t)+D.r*.6)domeHurt(t.domeX,dm*.8,p,u);}
 for(const t of foes(u.team)){const q=t.g.position,dd=Math.hypot(q.x-p.x,q.z-p.z,(q.y+2)-p.y);if(dd<D.r&&!domeSafe(t,p,u.team)){hurt(t,dm*(1-.6*dd/D.r),p,u);n++;}}
 if(u===P){shake(.55);if(n)chEv('dives',n);}u.vel.multiplyScalar(.2);u.vy=Math.min(u.vy,0);}
// per-frame: fuel, thrust, dome energy + visuals (called at the top of tickUnit)
function tickAir(u,dt){const T=u.T;if(u.diving&&(!u.alive||(!u.air&&u.diveT<(T.dive?T.dive.dur-.2:0))))diveImpact(u);
 if(T.dome){const D=T.dome;if(!u.domeX)u.domeX={isDome:true,alive:true,team:u.team,host:u,g:u.g,T:u.T,vel:u.vel};
  u.dmgR=(u.dmgR||0)*Math.exp(-dt/1.5)+Math.max(0,(u.hpPrev??u.hp)-u.hp);u.hpPrev=u.hp;if(u.domeOn){u.domeT-=dt;if(!u.alive)domeDrop(u,false);else if(u.domeT<=0)domeDrop(u,false);}u.domeA+=((u.domeOn?1:0)-u.domeA)*Math.min(1,dt*(u.domeOn?5:8));
  if(!u.domeOn&&u.abCd<=0)u.domeHP=D.hp;
  if(u.domeM){u.domeM.visible=u.domeA>.03;u.domeFl=Math.max(0,(u.domeFl||0)-dt*4);u.domeM.scale.setScalar(D.r*Math.max(.03,u.domeA));const lo=u.domeOn&&(u.domeHP<D.hp*.3||u.domeT<1.5);
   u.domeM.children[0].material.opacity=.09+.3*u.domeFl+.04*Math.sin(clock*3)+(lo?.07*Math.sin(clock*24):0);u.domeM.children[1].material.opacity=lo&&Math.sin(clock*(u.domeT<.8?40:22))>.3?.04:.16+.3*u.domeFl;u.domeM.rotation.y+=dt*.25;}
  if(u.fring)u.fring.rotation.y+=dt*(u.domeOn?6:1.2);}
 if(T.fly){const F=T.fly,p=u.g.position;u.lchCd=Math.max(0,(u.lchCd||0)-dt);
  const want=u===P?!!(inp.fly||inp.keys.Space):!!u.aiFly;
  u.flyOn=!!(want&&u.alive&&u.fuel>0&&!(u.empT>0)&&!(u.rootT>0)&&!u.diving&&mode==='play');
  const gy=groundAt(p.x,p.z,p.y),ceil=Math.max(F.ceil,gy+4);
  if(u.flyOn){u.fuel=Math.max(0,u.fuel-dt);if(!u.air){u.air=true;u.vy=Math.max(u.vy,3);}const tv=p.y<ceil-.5?F.climb:0;u.vy+=(tv-u.vy)*Math.min(1,dt*3);
   if(u===P){u.flyAcc=(u.flyAcc||0)+dt;if(u.flyAcc>=1){u.flyAcc-=1;chEv('flyT',1);}}}
  else if(!u.air&&!(u.empT>0))u.fuel=Math.min(F.fuel,u.fuel+F.regen*dt);
  if(p.y>ceil){p.y=ceil;if(u.vy>0)u.vy=0;}}}
function animAir(u,dt){if(u.rotors)for(const r of u.rotors)r.rotation.y+=dt*(u.flyOn?45:u.air?25:u.alive?5:0);
 if(u.T.fly&&u.air){for(const L of u.legs){const rv=L.rev?-1:1;L.hip.rotation.set(-1.25*rv,0,L.s*.15);L.knee.rotation.x=2.2*rv;L.ank.rotation.set(-1.0*rv,0,0);}}
 if(u.T.fly)for(const j of u.jets){j.visible=u.flyOn||u.diving||(u.air&&u.vy>2);if(j.visible)j.scale.y=(u.diving?2.4:1.4)+Math.random()*.8;}
 if(u.flyOn&&Math.random()<(gfxLow()?.15:.5)&&u.jets[0]){u.jets[Math.random()<.5?0:1].getWorldPosition(_q);fx(_q,.5,0xbfe0ff,{vy:-7,grow:2.2,life:.35,op:.5});}}
// AI: flyers take off when engaging and land to refuel, dive on targets below; dome mechs cover themselves and hurt allies
function aiAir(u,dt,t,dist,see){const T=u.T;
 if(T.fly){const F=T.fly,f=u.fuel/F.fuel;if(u.aiFly){if(f<.12||(!t&&Math.random()<dt*.2))u.aiFly=false;}else if(!u.air&&f>.7&&((t&&dist<110)||Math.random()<dt*.15))u.aiFly=true;
  if(u.air&&!u.diving&&u.abCd<=0&&t&&see&&dist<40&&u.g.position.y-t.g.position.y>4&&Math.random()<dt*2.5)ability(u);
  else if(!u.air&&(u.lchCd||0)<=0&&t&&clock-u.lastHit<.5&&Math.random()<.5)ability(u);}
 if(T.dome){const D=T.dome,threat=t&&dist<80,hot=clock-Math.max(u.lastHit,u.domeHit||-99)<1.5;
  const allyHurt=mates(u.team).some(a=>a!==u&&clock-a.lastHit<1&&a.g.position.distanceTo(u.g.position)<D.r);
  const focus=u.dmgR>u.max*.06||foes(u.team).filter(f=>f.alive&&f.tgt===u&&f.g.position.distanceTo(u.g.position)<60).length>=2;
  if(!u.domeOn&&u.abCd<=0&&!(u.empT>0)&&(threat&&hot&&focus||allyHurt&&focus)&&Math.random()<dt*5)ability(u);
  else if(u.domeOn&&!threat&&clock-(u.domeHit||-99)>1.5)ability(u);}}
// HUD: vertical fuel gauge (flyer) / dome energy gauge (Aegis) beside the crosshair, FLY touch button
function hudAir(){let el=$('airG');if(!el){el=document.createElement('div');el.id='airG';el.innerHTML='<i></i><span></span>';document.body.appendChild(el);}
 const T=P&&P.T,on=mode==='play'&&P&&P.alive&&(T.fly||T.dome);el.style.display=on?'block':'none';if(!on)return;
 const f=T.fly?P.fuel/T.fly.fuel:P.domeOn?P.domeT/T.dome.dur:P.abCd>0?1-P.abCd/(P.domeHP<=0?T.dome.brokeCd:T.dome.cd):1;el.firstChild.style.height=Math.max(0,f*100)+'%';el.firstChild.style.background=T.fly?(f<.2?'#f64':'#fb5'):(P.domeOn?'#5ef':P.abCd>0?'#678':'#3ac');
 el.lastChild.textContent=T.fly?'FUEL':P.domeOn?P.domeT.toFixed(1)+'s':'DOME';el.classList.toggle('lowf',!!(T.fly&&f<.2||P.domeOn&&(P.domeT<1.5||P.domeHP<T.dome.hp*.3)));
 const b=$('bFLY');if(b)b.classList.toggle('on',!!P.flyOn);}
(function(){const b=$('bFLY');if(!b)return;b.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];inp.fly=true;inp.flyId=t.identifier;},{passive:false});
 const end=e=>{for(const t of e.changedTouches)if(t.identifier===inp.flyId){inp.fly=false;inp.flyId=null;}};addEventListener('touchend',end);addEventListener('touchcancel',end);})();
// wrap animMech so fold-up legs / fans / thrust jets apply after the normal gait pose
{const a0=animMech;animMech=function(u,dt){a0(u,dt);animAir(u,dt);if(u===P&&u.flyOn&&clock-(u.thrT||0)>.28){u.thrT=clock;sfx('thrust',{u});}};}
// ---------- v17: challenges (daily + career) ----------
let HITF='';const TIERS=['Bronze','Silver','Gold','Platinum'],TMED=['🥉','🥈','🥇','💎'];
Object.assign(CFG.paints,{chrome:{name:'Chrome',col:0xd8dde4,metal:1,rough:.15,excl:1},obsidian:{name:'Obsidian',col:0x16121e,metal:.6,rough:.3,excl:1},
 royal:{name:'Royal Violet',col:0x6a3cc8,metal:.5,excl:1},crimson:{name:'Champion Crimson',col:0x9c1c28,camo:[0x5a0c14,0xd4a530],excl:1}});
const FAMS=['minigun','railgun','hornet','shotgun','laser','emp','nanite','lockbolt','swarm','pulse'];
const FAMN={minigun:'Minigun',railgun:'Railgun',hornet:'Hornet',shotgun:'Shotgun',laser:'Laser',emp:'EMP',nanite:'Nanite',lockbolt:'Lockbolt',swarm:'Swarm',pulse:'Pulse'};
const ownFam=f=>Object.keys(CFG.weapons).some(k=>CFG.weapons[k].fam===f&&!isLocked(k));
const ownMech=m=>!isLocked(m);const ownAb=a=>Object.keys(CFG.mechs).some(k=>CFG.mechs[k][a]&&ownMech(k));
// daily pool: [key,target,label,coins,requirement]
const DPOOL=[['wins',2,'Win 2 matches',100],['kills',10,'Destroy 10 enemy mechs',100],['matches',3,'Play 3 matches',60],['dmg',3000,'Deal 3,000 damage',80],
 ['caps',1,'Capture an enemy base',100],['duelN',1,'Win a Duel on Normal or Hard',120],['abil',5,'Use your mech ability 5 times',60],
 ['wins_team',1,'Win a Team Battle',80],['wins_base',1,'Win a Capture the Base match',80],
 ...FAMS.map(f=>['dmg_'+f,1500,`Deal 1,500 damage with ${FAMN[f]} weapons`,80,()=>ownFam(f)]),
 ...FAMS.map(f=>['kill_'+f,3,`Destroy 3 mechs with ${FAMN[f]} weapons`,90,()=>ownFam(f)]),
 ['roots',3,'Root 3 enemies with Lockdown',100,()=>ownMech('locke')],['emps',4,'EMP 4 enemies',90,()=>ownFam('emp')],['heal',300,'Heal 300 HP with nanites',90,()=>ownFam('nanite')],
 ['block',800,'Block 800 damage with a shield',80,()=>ownAb('shield')],['jumps',5,'Jump 5 times',60,()=>ownAb('jump')],['dashes',5,'Dash 5 times',60,()=>ownAb('dash')],
 ['flyT',60,'Fly for 60 seconds',70,()=>ownAb('fly')],['dives',3,'Hit 3 enemies with Dive Strikes',100,()=>ownAb('fly')],['block',600,'Absorb 600 damage with a force dome',90,()=>ownAb('dome')]];
const DBONUS=150;
// career: id,name,desc(target),targets,coins,value fn,{tier:unique reward}
const lvOf=(k,kind)=>Object.values(levelsOf(k,kind));
function stepOf(kind){let b=0;for(const k of Object.keys(kind==='wpn'?CFG.weapons:CFG.mechs)){if(isLocked(k))continue;const v=lvOf(k,kind);const mx=Math.max(...v),mn=Math.min(...v);
 b=Math.max(b,mn>=5?4:mx>=5?3:mn>=3?2:mx>=3?1:0);}return b;}
const L_=k=>(SAVE.life&&SAVE.life[k])||0;
const CAREER=[
 ['gunsmith','Gunsmith',['Upgrade any weapon stat to Lv 3','Get all 4 stats of one weapon to Lv 3','Upgrade any weapon stat to Lv 5 (max)','Fully max one weapon (all stats Lv 5)'],[1,2,3,4],[100,200,400,800],()=>stepOf('wpn'),{3:{title:'Master Gunsmith',paint:'chrome'}}],
 ['engineer','Mech Engineer',['Upgrade any mech stat to Lv 3','Get all 3 stats of one mech to Lv 3','Upgrade any mech stat to Lv 5','Fully max one mech'],[1,2,3,4],[100,200,400,800],()=>stepOf('mech'),{3:{title:'Chief Engineer'}}],
 ['tinker','Tinkerer',n=>`Buy ${n} upgrades`,[5,20,50,100],[80,200,400,800],()=>{let s=0;for(const k in SAVE.lv)for(const x in SAVE.lv[k])s+=SAVE.lv[k][x]-1;return s;}],
 ['phantom','Unlock Phantom',['Unlock the Phantom mech'],[1],[200],()=>ownMech('phantom')?1:0],
 ['locke','Unlock Locke',['Unlock the Locke mech'],[1],[300],()=>ownMech('locke')?1:0,{0:{title:'Keymaster'}}],
 ['skyhawk','Unlock Skyhawk',['Unlock the Skyhawk flying mech'],[1],[300],()=>ownMech('skyhawk')?1:0,{0:{title:'Sky Ace'}}],
 ['aegis','Unlock Aegis',['Unlock the Aegis force-dome mech'],[1],[300],()=>ownMech('aegis')?1:0,{0:{title:'Bulwark'}}],
 ['aerotech','Aero & Field Arms',['Upgrade any Swarm or Pulse weapon stat to Lv 3','Upgrade any Swarm or Pulse weapon stat to Lv 5'],[1,2],[200,500],()=>{let b=0;for(const k of Object.keys(CFG.weapons)){const f=CFG.weapons[k].fam;if((f!=='swarm'&&f!=='pulse')||isLocked(k))continue;const m=Math.max(...lvOf(k,'wpn'));b=Math.max(b,m>=5?2:m>=3?1:0);}return b;}],
 ['arsenal','Arsenal',n=>`Unlock ${n} locked weapons`,[3,8,14,Object.keys(CFG.econ.locked).filter(k=>CFG.weapons[k]).length],[100,250,500,1000],()=>SAVE.unlocked.filter(k=>CFG.weapons[k]).length,{3:{title:'Quartermaster'}}],
 ['fullset','Full Set',n=>`Own all 3 sizes of ${n} weapon famil${n>1?'ies':'y'}`,[1,3,6,10],[100,250,500,1000],()=>FAMS.filter(f=>Object.keys(CFG.weapons).filter(k=>CFG.weapons[k].fam===f).every(k=>!isLocked(k))).length,{3:{paint:'royal'}}],
 ['painter','Painter',n=>`Buy ${n} paint job${n>1?'s':''}`,[1,3,5],[60,150,300],()=>SAVE.paints.filter(k=>k!=='default'&&!CFG.paints[k].excl).length,{2:{title:'Artist'}}],
 ['kills','Destroyer',n=>`Destroy ${n} enemy mechs`,[10,50,150,400],[100,250,500,1000],()=>L_('kills'),{3:{title:'Wrecker'}}],
 ['wins','Victor',n=>`Win ${n} matches`,[5,25,75,200],[100,250,500,1000],()=>L_('wins'),{3:{title:'Champion',paint:'crimson'}}],
 ['wins_team','Squad Leader',n=>`Win ${n} Team Battles`,[3,15,40,100],[80,200,400,800],()=>L_('wins_team')],
 ['wins_duel','Duelist',n=>`Win ${n} Duels`,[3,15,40,100],[80,200,400,800],()=>L_('wins_duel'),{3:{title:'Duelist'}}],
 ['wins_base','Conqueror',n=>`Win ${n} Capture the Base matches`,[2,10,25,60],[80,200,400,800],()=>L_('wins_base')],
 ['caps','Base Breaker',n=>`Capture ${n} enemy bases`,[1,5,15,40],[80,200,400,800],()=>L_('caps'),{3:{title:'Warlord'}}],
 ['duelH','Unbreakable',n=>`Win ${n} Duels on Hard`,[1,5,15,30],[150,300,600,1200],()=>L_('duelH'),{2:{paint:'obsidian'},3:{title:'Unbreakable'}}],
 ['block','Bulwark',n=>`Block ${n.toLocaleString()} damage with a shield`,[1000,5000,20000,60000],[80,200,400,800],()=>L_('block'),{3:{title:'Bulwark'}}],
 ['mobile','Acrobat',n=>`Jump or dash ${n} times`,[10,50,150,400],[60,150,300,600],()=>L_('jumps')+L_('dashes')],
 ...FAMS.map(f=>['k_'+f,FAMN[f]+' Ace',n=>`Destroy ${n} mechs with ${FAMN[f]} weapons`,[5,25,75,200],[60,150,300,600],()=>L_('kill_'+f),{3:{title:FAMN[f]+' Ace'}}])
].map(([id,name,desc,t,c,val,uniq])=>({id,name,desc,t,c,val,uniq:uniq||{}}));
function chEnsure(){if(!SAVE.life){const st=(PROFS&&curProf()&&curProf().stats)||{};SAVE.life={kills:st.kills||0,wins:st.wins||SAVE.wins||0,matches:st.matches||0};}
 if(!SAVE.ch)SAVE.ch={day:'',list:[],bonus:0,car:{}};if(!SAVE.titles)SAVE.titles=[];if(SAVE.title===undefined)SAVE.title='';}
const nowD=()=>window.__now?new Date(window.__now):new Date();
function dayKey(d){d=d||nowD();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function msToMidnight(){const d=nowD(),m=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);return m-d;}
function seedRng(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);return((h^=h>>>16)>>>0)/4294967296;};}
function chDaily(){chEnsure();const dk=dayKey(),C=SAVE.ch;if(C.day!==dk){const r=seedRng(dk+'|mech'),pool=DPOOL.filter(p=>!p[4]||p[4]()),pick=[],fams=new Set();
  const order=pool.map(p=>[r(),p]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  for(const p of order){const g=p[0].replace(/^(dmg|kill)_/,'');if(pick.length<3&&!fams.has(g)&&!pick.some(q=>q[0].split('_')[0]===p[0].split('_')[0]&&p[0].includes('_'))){pick.push(p);fams.add(g);}}
  C.day=dk;C.list=pick.map(p=>({k:p[0],base:L_(p[0])}));C.bonus=0;C.note={};persist();}return C;}
const dDef=k=>DPOOL.find(p=>p[0]===k);
function dProg(e){const p=dDef(e.k);return {p,cur:Math.min(p[1],L_(e.k)-e.base),n:p[1]};}
function cTier(c){const v=c.val();let t=0;while(t<c.t.length&&v>=c.t[t])t++;return {v,t};}// t = tiers reached
const cDesc=(c,i)=>Array.isArray(c.desc)?c.desc[Math.min(i,c.desc.length-1)]:c.desc(c.t[Math.min(i,c.t.length-1)]);
function chClaimable(){const C=chDaily();let n=C.list.filter(e=>!e.cl&&dProg(e).cur>=dProg(e).n).length;if(!C.bonus&&C.list.length&&C.list.every(e=>e.cl))n++;
 for(const c of CAREER){const cl=C.car[c.id]||0;if(cTier(c).t>cl)n++;}return n;}
function chClaim(id){const C=chDaily();let got=0,msg='';
 if(id==='bonus'){if(C.bonus||!C.list.every(e=>e.cl))return 0;C.bonus=1;got=DBONUS;msg='All dailies done';}
 else if(id.startsWith('d:')){const e=C.list[+id.slice(2)];if(!e||e.cl)return 0;const q=dProg(e);if(q.cur<q.n)return 0;e.cl=1;got=q.p[3];msg=q.p[2];}
 else{const c=CAREER.find(x=>x.id===id.slice(2));if(!c)return 0;const cl=C.car[c.id]||0;if(cTier(c).t<=cl)return 0;got=c.c[cl];const u=c.uniq[cl];C.car[c.id]=cl+1;msg=`${c.name} ${TIERS[cl]}`;
  if(u){if(u.title&&!SAVE.titles.includes(u.title)){SAVE.titles.push(u.title);if(!SAVE.title)SAVE.title=u.title;msg+=` · title “${u.title}”`;}if(u.paint&&!SAVE.paints.includes(u.paint)){SAVE.paints.push(u.paint);msg+=` · ${CFG.paints[u.paint].name} paint`;}}}
 SAVE.coins+=got;SAVE.earned+=got;persist();toast&&toast(`🏅 +${got} — ${msg}`);return got;}
// event tracking (in-match toasts on completion)
let chSnap=null;
const LK={kills:['kills'],wins:['wins'],wins_team:['wins_team'],wins_duel:['wins_duel'],wins_base:['wins_base'],caps:['caps'],duelH:['duelH'],block:['block'],mobile:['jumps','dashes']};FAMS.forEach(f=>LK['k_'+f]=['kill_'+f]);
function chEv(k,n){if(!n)return;const _cc=chClaimable();try{return chEv0(k,n);}finally{if(chClaimable()>_cc)sfx('chal');}}
function chEv0(k,n){chEnsure();chDaily();const before=chDoneSet(k);SAVE.life[k]=(SAVE.life[k]||0)+n;const after=chDoneSet(k);
 for(const x of after)if(!before.has(x)&&mode==='play')toast&&toast('✅ Challenge complete: '+x);}
function chDoneSet(k){const s=new Set(),C=SAVE.ch;for(const e of C.list){if(e.k!==k)continue;const q=dProg(e);if(q.cur>=q.n)s.add(q.p[2]);}
 for(const c of CAREER){if(!(LK[c.id]||[]).includes(k))continue;const t=cTier(c).t;if(t)s.add(`${c.name} ${TIERS[t-1]}`);}return s;}
function chDmg(d,f){chEv('dmg',d);if(f)chEv('dmg_'+f,d);}
function chMatch(win,why){chEnsure();const md=settings.mode;chEv('matches',1);if(win){chEv('wins',1);chEv('wins_'+md,1);if(md==='duel'&&settings.diff!=='easy')chEv('duelN',1);if(md==='duel'&&settings.diff==='hard')chEv('duelH',1);}
 if(win&&why==='Enemy base captured')chEv('caps',1);}
function chStart(){chEnsure();chDaily();chSnap=JSON.parse(JSON.stringify(SAVE.life));}
const pbar=(f)=>`<div class="cbar"><i style="width:${Math.round(Math.max(0,Math.min(1,f))*100)}%"></i></div>`;
function fmtLeft(ms){const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);return `${h}h ${m}m`;}
let chTab='daily';
function chalScreen(){const C=chDaily();let h=`<div class="gh"><h2>🏅 CHALLENGES${testTag(curProf())}</h2>${coinTag()}</div>${isTest()?'<p class="ab">🧪 Test pilot — challenges run here for testing only; nothing carries over to your real pilots.</p>':''}<div class="tabs"><button data-chtab="daily" class="${chTab==='daily'?'on':''}">DAILY</button><button data-chtab="career" class="${chTab==='career'?'on':''}">CAREER</button></div>`;
 if(chTab==='daily'){h+=`<p class="ab">New challenges every day at midnight · resets in <b id="chcd">${fmtLeft(msToMidnight())}</b></p>`;
  C.list.forEach((e,i)=>{const q=dProg(e),done=q.cur>=q.n;h+=`<div class="det chi"><div class="chh"><b>${q.p[2]}</b><span>🪙${q.p[3]}</span></div>${pbar(q.cur/q.n)}<div class="chh"><small>${Math.floor(q.cur).toLocaleString()} / ${q.n.toLocaleString()}</small>${e.cl?'<small class="ok">✔ CLAIMED</small>':done?`<button class="go" data-chc="d:${i}">CLAIM</button>`:''}</div></div>`;});
  const all=C.list.every(e=>e.cl);h+=`<div class="det chi"><div class="chh"><b>Daily bonus — claim all 3</b><span>🪙${DBONUS}</span></div><div class="chh"><small>${C.list.filter(e=>e.cl).length} / 3 claimed</small>${C.bonus?'<small class="ok">✔ CLAIMED</small>':all?'<button class="go" data-chc="bonus">CLAIM</button>':''}</div></div>`;}
 else{if(SAVE.titles.length)h+=`<div class="det"><b>Title</b> <small>(shown on your pilot card)</small><div class="dif">`+['',...SAVE.titles].map(t=>`<button data-ttl="${t||'-'}" class="${SAVE.title===t?'on':''}">${t||'NONE'}</button>`).join('')+`</div></div>`;
  const rows=CAREER.map(c=>{const cl=C.car[c.id]||0,{v,t}=cTier(c),max=cl>=c.t.length,i=Math.min(cl,c.t.length-1),lo=cl?c.t[cl-1]:0,tg=c.t[i];
   const u=c.uniq[i];return [t>cl?0:max?2:1,`<div class="det chi"><div class="chh"><b>${c.name} ${max?'<span class="ok">COMPLETE</span>':`<small>${c.t.length>1?TMED[i]+' '+TIERS[i]:''}</small>`}</b><span>${max?'':'🪙'+c.c[i]}${!max&&u?` + ${u.title?'🎖 “'+u.title+'”':''}${u.paint?' 🎨 '+CFG.paints[u.paint].name:''}`:''}</span></div>
   <small>${cDesc(c,i)}</small>${pbar(max?1:Array.isArray(c.desc)?v/tg:v/tg)}<div class="chh"><small>${c.t.map((x,j)=>`<span class="${j<cl?'ok':j<t?'rdy':'dim'}">${TMED[j]||'•'}</span>`).join(' ')} ${Array.isArray(c.desc)&&c.t.length>1?`step ${Math.min(v,c.t.length)}/${c.t.length}`:`${Math.floor(Math.min(v,tg)).toLocaleString()} / ${tg.toLocaleString()}`}</small>${t>cl?`<button class="go" data-chc="c:${c.id}">CLAIM</button>`:''}</div></div>`];});
  h+=rows.sort((a,b)=>a[0]-b[0]).map(r=>r[1]).join('');}
 return h+`<div class="row"><button data-go="title">◀ BACK</button></div>`;}
function chResults(){if(!SAVE.ch)return '';const C=SAVE.ch;let h='<div class="chr"><b>DAILY CHALLENGES</b>';
 for(const e of C.list){const q=dProg(e),d=Math.max(0,Math.min(q.n,L_(e.k)-e.base)-Math.min(q.n,(chSnap?chSnap[e.k]||0:L_(e.k))-e.base));h+=`<div class="chrr"><span>${q.cur>=q.n?'✅':'▫️'} ${q.p[2]}</span>${pbar(q.cur/q.n)}<small>${Math.floor(q.cur)}/${q.n}${d>0?` <i>+${Math.floor(d)}</i>`:''}</small></div>`;}
 const n=chClaimable();return h+(n?`<div class="chrn">🏅 ${n} reward${n>1?'s':''} ready to claim in Challenges</div>`:'')+'</div>';}
setInterval(()=>{const e=document.getElementById('chcd');if(e)e.textContent=fmtLeft(msToMidnight());if(mode==='menu'&&SAVE.ch&&SAVE.ch.day&&SAVE.ch.day!==dayKey()&&menuStep==='chal')renderMenu();},20000);
// ---------- v18: test pilot (everything unlocked, computed from item tables) ----------
const TEST_COINS=999999;const isTest=()=>!!(PROFS&&curProf()&&curProf().test);
function testFill(){const S=SAVE;S.unlocked=[...new Set([...(S.unlocked||[]),...Object.keys(CFG.econ.locked)])];
 S.paints=[...new Set([...(S.paints||[]),...Object.keys(CFG.paints)])];
 for(const [tab,kind] of [[CFG.mechs,'mech'],[CFG.weapons,'wpn']])for(const k of Object.keys(tab)){S.lv[k]=S.lv[k]||{};for(const s of Object.keys(UPS[kind]))S.lv[k][s]=5;}
 if(S.coins<TEST_COINS)S.coins=TEST_COINS;chEnsure();for(const c of CAREER)for(const t of Object.values(c.uniq))if(t.title&&!S.titles.includes(t.title))S.titles.push(t.title);}
function createTest(){const ex=Object.keys(PROFS.list).find(k=>PROFS.list[k].test);if(ex){useProf(ex);return ex;}
 const id=newId();PROFS.list[id]={name:'TEST PILOT',test:1,save:freshSave(),loadout:freshLoadout(),stats:freshStats(),created:Date.now()};useProf(id);return id;}
function resetTest(){const k=Object.keys(PROFS.list).find(k=>PROFS.list[k].test);if(!k)return null;const p=PROFS.list[k];p.save=freshSave();p.loadout=freshLoadout();p.stats=freshStats();useProf(k);return k;}
const testTag=q=>q&&q.test?' <span class="ttag">🧪 TEST</span>':'';
if(isTest()){testFill();persist();}
// ---------- loop ----------
const fwd=new THREE.Vector3(),rt=new THREE.Vector3();
function outcome(){const md=settings.mode,b=mates('b').length,r=mates('r').length;
 if(md==='base'){if(BASES.r.prog>=1)return[true,'Enemy base captured'];if(BASES.b.prog>=1)return[false,'Your base was captured'];}
 if(!r)return[true,md==='duel'?'Opponent destroyed':'All enemies destroyed'];if(!b)return[false,md==='duel'?'You were destroyed':'Your team was destroyed'];return null;}
function end(win,why){mode='over';PAUSED=false;ambStop();sfx(win?'win':'lose');setTimeout(()=>sfx('coins',{n:win?8:4}),900);showUI();const md=settings.mode;$('mt').textContent=win?'VICTORY':'DEFEAT';$('mt').style.color=win?'#6f9':'#f66';
 $('mm').textContent=`${CFG.modes[md].name} ${CFG.modes[md].sub}${md==='duel'?' · '+CFG.diff[settings.diff].name:''}`;$('ml').textContent=why;
 $('mk').textContent=`Kills: ${STATS.kills}  ·  Team kills: ${U.filter(u=>u.team==='b').reduce((a,u)=>a+u.kills,0)}  ·  Accuracy: ${STATS.shots?Math.round(STATS.hits/STATS.shots*100):0}%`;
 document.exitPointerLock&&document.exitPointerLock();inp.fire=false;inp.mFire=false;
 const rw=reward(win,why);LAST_REWARD=rw;const ce=$('coins');ce.innerHTML=rw.rows.map((r,i)=>`<div class="cr" style="animation-delay:${i*.25}s"><span>${r[0]}</span><b>${r[1]>=0?'+':''}${r[1]}</b></div>`).join('')+`<div class="ct"><span>TOTAL</span><b>🪙 +<i id="cup">0</i></b></div><div class="cb">Balance: 🪙 <i id="cbal">${SAVE.coins-rw.tot}</i></div>`+chResults();
 const t0=performance.now(),dur=1200+rw.rows.length*250,b0=SAVE.coins-rw.tot;cancelAnimationFrame(cupRAF);
 const step=n=>{const f=Math.min(1,(n-t0)/dur),e=1-Math.pow(1-f,3);$('cup').textContent=Math.round(rw.tot*e);$('cbal').textContent=Math.round(b0+rw.tot*e);if(f<1)cupRAF=requestAnimationFrame(step);};cupRAF=requestAnimationFrame(step);}
let LAST_REWARD=null,cupRAF=0;
let last=performance.now(),menuA=0,fpsT=0,fpsN=0,fps=60,lowT=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
 fpsT+=dt;fpsN++;if(fpsT>=.5){fps=fpsN/fpsT;fpsT=fpsN=0;if(mode==='play'&&settings.gfx==='high'&&!window.__noAuto){lowT=fps<CFG.gfx.autoFallbackFps?lowT+.5:0;if(lowT>=CFG.gfx.autoWindow){setGfx('low');toast('Low fps: graphics switched to LOW');}}}
 if(mode==='play'&&!PAUSED)update(dt);else if(mode==='menu')menuTick(dt);else if(mode==='over'){for(const u of U)animMech(u,dt);}
 updFx(dt);updAmb(dt);if(mode!=='menu')cam(dt);skyDome.position.copy(C.position);if(mode==='play'&&!PAUSED)drawMini();R.render(S,C);}
function update(dt){clock+=dt;const k=inp.keys;
 if(P.alive){let mx=inp.mx+((k.KeyD?1:0)-(k.KeyA?1:0)),mz=inp.mz+((k.KeyS?1:0)-(k.KeyW?1:0));
  if(k.ArrowLeft)P.yaw+=2*dt;if(k.ArrowRight)P.yaw-=2*dt;
  fwd.set(Math.sin(P.yaw),0,Math.cos(P.yaw));rt.set(-fwd.z,0,fwd.x);tickUnit(P,dt);tuneTick();
  const v=_t.set(0,0,0).addScaledVector(fwd,-mz).addScaledVector(rt,mx);const l=v.length();if(l>1)v.divideScalar(l);drive(P,v.x,v.z,dt);
  torso(P,P.yaw,dt,CFG.move.torsoK,CFG.move.torsoC);
  // FIRE = all mounts; L / R buttons (or 1 / 2 keys) fire one side's group. Each mount has its own cadence, ammo and reload.
  const fa=inp.fire||inp.mFire||k.KeyF,fL=fa||inp.fireL||k.Digit1||k.KeyQ,fR=fa||inp.fireR||k.Digit2||k.KeyC;
  updateLock(dt);cam(0);const AP=playerAim();aimGuns(P,AP,dt);let snapped=false;
  for(const w of P.ws){const W=w.W,on=w.s<0?fL:fR;if(W.spin)w.spin=on&&!w.reload?Math.min(1,w.spin+dt/W.spin):Math.max(0,w.spin-dt);
   if(on&&w.fireCd<=0&&w.ammo>0&&!w.reload&&(!W.spin||w.spin>.3)){if(!snapped){aimGuns(P,AP,1);snapped=true;}const locked=W.homing&&P.lockTgt&&P.lockT>=W.lockTime;fireWeapon(P,w,AP,locked?P.lockTgt:null);}}}
 else{P.vel.set(0,0,0);lockEl.style.display='none';}
 for(const u of U)if(u!==P&&u.alive){tickUnit(u,dt);if(!TF('aiOff'))aiTick(u,dt);}
 for(const u of U){if(!u.alive)u.vel.set(0,0,0);animMech(u,dt);}
 tickBeams(dt);
 // projectiles (friendly fire off: sweeps/splash only test the shooter's foes)
 for(let i=B.length-1;i>=0;i--){const b=B[i],p=b.m.position,W=b.W,sp=W.speed;let hit=false,hitU=null;
  if(b.homing&&b.homing.alive){const tp=b.homing.g.position.clone();tp.y+=3;const want=tp.sub(p).normalize();const cur=b.v.clone().normalize();cur.lerp(want,Math.min(1,W.turnRate*dt)).normalize();b.v.copy(cur).multiplyScalar(sp);b.m.lookAt(p.clone().add(b.v));}
  if((b.W.homing||b.W.seek)&&Math.random()<.6)fx(p.clone(),.45,0xb0b0b0,{life:.5,op:.45,grow:2.2});
  const p0=p.clone(),L=W.hitscan?W.range-b.dist:Math.min(sp*dt,W.range-b.dist+.01);const dir=b.v.clone().normalize();
  const sw=sweep(p0,dir,L,b.owner);if(sw){p.addScaledVector(dir,sw.t);b.dist+=sw.t;hit=true;hitU=sw.u;if(hitU&&b.src===P){STATS.hits++;hitMarkT=.18;}}else{p.addScaledVector(dir,L);b.dist+=L;}
  if(W.hitscan&&!b.beam){b.beam=1;beam(p0,p.clone(),b.owner==='b'?0x80e8ff:0xff6060);if(!hit)b.dist=W.range;}
  let mult=1;if(W.falloff&&b.dist>W.range*W.falloff)mult=1-.5*(b.dist-W.range*W.falloff)/(W.range*(1-W.falloff));
  if(hit||b.dist>=W.range){const pos=p.clone();
   HITF=W.fam;if(W.splash){boom(pos,hit?3:1.5,0xff7700);flashLight(pos,2);if(hitU)hurt(hitU,b.dmg,pos,b.src);for(const u of foes(b.owner)){if(u===hitU)continue;const dd=u.g.position.clone().setY(u.g.position.y+2.5).distanceTo(pos);if(dd<W.splash&&!domeSafe(u,pos,b.owner))hurt(u,b.dmg*.5*(1-dd/W.splash),pos,b.src);}}
   else if(hit){if(hitU){hurt(hitU,b.dmg*Math.max(.5,mult),pos,b.src);if(W.dot)naniteHit(hitU,W,b.src,b.dmg);if(W.tether)tetherHit(hitU,W,b.src);if(W.push)pushU(hitU,b.v,W.push);}if(W.push)fx(pos,1.6,0x60f0ff,{grow:3,life:.3,op:.7});if(W.tether)fx(pos,1.3,0xc090ff,{grow:2.5,life:.35});if(W.dot){fx(pos,1,0x50ff80,{grow:2,life:.3});}else if(!hitU&&!gfxLow())fx(pos,1.2,0x9a927e,{grow:2,life:.5,op:.45,vy:1.5});const rg=W===CFG.weapons.railgun;boom(pos,rg?1.2:.5,rg?0x80e8ff:0xffdd55);sparks(pos);}
   S.remove(b.m);B.splice(i,1);}}
 tickFields(dt);
 if(settings.mode==='base')tickBases(dt);
 if(!P.alive&&(!SPEC||!SPEC.alive))SPEC=mates('b')[0]||SPEC;
 if(endT<0){const o=outcome();if(o){result=o;endT=clock+1.6;}}else if(clock>=endT){end(result[0],result[1]);return;}
 sndWatch(dt);hud();}
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
let camAir=0;function cam(dt){if(!P)return;const K=CFG.cam,f=(P.alive||!SPEC)?P:SPEC,p=f.g.position;
 if(f===P)camYaw=P.yaw;else camYaw+=wrap(f.tYaw-camYaw)*Math.min(1,(dt||0)*3);
 const bx=-Math.sin(camYaw),bz=-Math.cos(camYaw),rx=-bz,rz=bx,pit=f===P?P.pitch:.05;
 const air=f.air?Math.min(1,Math.max(0,f.g.position.y-groundAt(p.x,p.z,p.y)-.5)/6):0;camAir+=(air-camAir)*Math.min(1,(dt||0)*4);cO.set(p.x,p.y+K.height-camAir*1.2,p.z);const ck=P&&P.type==='guardian'?1.35:P&&P.type==='aegis'?1.45:P&&P.type==='skyhawk'?1.3:P&&P.type==='strider'?1.12:1;want.set(p.x+bx*K.dist*ck-rx*K.side*ck,p.y+K.height*(ck>1.2?1.12:1)+pit*K.pitchLift,p.z+bz*K.dist*ck-rz*K.side*ck);
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
 const frac=w=>w.W.emp&&w.chg?'CHARGING '+Math.round(Math.min(1,(clock-w.chg)/w.W.charge)*100)+'%':w.W.beam?(w.reload?1-w.reload/w.W.reload:1-(w.heat||0)):w.reload?1-w.reload/w.W.reload:w.ammo/w.W.mag,grp=g=>{const a=P.ws.filter(w=>w.s===g);return a.length?a.reduce((t,w)=>t+frac(w),0)/a.length:0;};
 {let ei=$('empInd');if(!ei){ei=document.createElement('div');ei.id='empInd';ei.textContent='⚡ EMP — ABILITY OFFLINE';document.body.appendChild(ei);}ei.style.display=mode==='play'&&P&&P.empT>0?'block':'none';if(P&&P.empT>0)ei.textContent='⚡ EMP — ABILITY OFFLINE '+P.empT.toFixed(1)+'s';}
 if((hudN&3)===0){$('gunt').innerHTML=P.ws.map(w=>`<div class="wl${w.reload?' rl':''}${w.W.beam?' hb'+((w.heat||0)>.7?' hot':''):''}"><b>${w.s<0?'◀L':'R▶'}</b><span class="szb z${w.W.size}">${w.W.size}</span> ${w.W.name}<em>${w.W.beam?(w.reload?'OVERHEAT '+w.reload.toFixed(1)+'s':'HEAT '+Math.round((w.heat||0)*100)+'%'):w.reload?'RELOAD '+w.reload.toFixed(1)+'s':w.ammo+'/'+w.W.mag}</em><i style="width:${frac(w)*100}%"></i></div>`).join('');
  const all=P.ws.reduce((t,w)=>t+frac(w),0)/P.ws.length,rl=P.ws.every(w=>w.reload);gunBar.style.width=all*100+'%';gunBar.style.background=rl?'#fa4':'#ff6';ring(bMG,all,rl?'#fa48':'#f448');bMG.textContent=rl?'RELOAD':'FIRE';
  ring($('bFL'),grp(-1),'#fc48');ring($('bFR'),grp(1),'#fc48');}
 let af=1,at='',ac='#6cf';
 if(T.shield){af=P.shieldHP/T.shield.hp;if(P.shieldOn){at=P.shA>=1?`SHIELD RAISED ${Math.ceil(P.shieldHP)} HP — tap to lower`:'RAISING SHIELD…';ac='#3df';}else if(P.abCd>0){af=1-P.abCd/T.shield.cd;at=`SHIELD BROKEN ${P.abCd.toFixed(1)}s`;ac='#678';}else if(P.shieldHP<T.shield.hp*T.shield.min){at=`SHIELD RECHARGING ${Math.round(af*100)}%`;ac='#678';}else at=P.shA>0?'LOWERING…':`SHIELD READY ${Math.round(af*100)}%`;}
 else if(T.lockdown){if(P.abCd>0){af=1-P.abCd/T.lockdown.cd;at=`LOCKDOWN RECHARGING ${P.abCd.toFixed(1)}s`;ac='#678';}else{at='LOCKDOWN READY — aim & tap';ac='#b8f';}}
 else if(T.dash){if(P.abCd>0){af=1-P.abCd/T.dash.cd;at=`DASH COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='DASH READY';}
 else if(T.jump){if(P.abCd>0){af=1-P.abCd/T.jump.cd;at=`JUMP COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='JUMP READY';}
 else if(T.dome){const D=T.dome;if(P.domeOn){af=P.domeT/D.dur;at=`FORCE DOME ${Math.max(0,P.domeT).toFixed(1)}s · ${Math.ceil(P.domeHP)} HP — tap to lower`;ac=(P.domeT<1.5||P.domeHP<D.hp*.3)&&Math.sin(clock*20)>0?'#f86':'#5ef';}else if(P.abCd>0){const br=P.domeHP<=0;af=1-P.abCd/(br?D.brokeCd:D.cd);at=`${br?'DOME BROKEN':'DOME RECHARGING'} ${P.abCd.toFixed(1)}s`;ac='#678';}else at=`DOME READY · ${D.dur}s / ${D.hp} HP`;}
 else if(T.dive){if(P.diving){at='DIVE STRIKE!';ac='#fb5';}else if(P.air&&P.g.position.y-groundAt(P.g.position.x,P.g.position.z,P.g.position.y)>2.5){if(P.abCd>0){af=1-P.abCd/T.dive.cd;at=`DIVE COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else{at='DIVE READY — aim & tap';ac='#fb5';}}else{af=1-(P.lchCd||0)/T.fly.lcd;at=P.lchCd>0?`LAUNCH ${P.lchCd.toFixed(1)}s`:'LAUNCH READY · hold FLY to hover';ac=P.lchCd>0?'#678':'#6cf';}}
 else{const t=clock-P.lastHit;af=P.hp>=P.max?1:Math.min(1,t/T.regen.delay);at=P.hp>=P.max?'REGEN: FULL':(af>=1?`REGENERATING +${T.regen.rate}/s`:`REGEN IN ${(T.regen.delay-t).toFixed(1)}s`);ac=af>=1?'#6f9':'#678';}
 bAB.classList.toggle('on',!!((T.shield&&P.shieldOn)||(T.dome&&P.domeOn)||P.diving));bAB.textContent=T.shield?(P.shieldOn?'LOWER':'SHIELD'):T.dome?(P.domeOn?'LOWER':'DOME'):T.dive?(P.air&&P.g.position.y-groundAt(P.g.position.x,P.g.position.z,P.g.position.y)>2.5?'DIVE':'LAUNCH'):bAB.textContent;hudAir();abBar.style.width=af*100+'%';abBar.style.background=ac;$('abt').textContent=at;ring(bAB,af,ac+'8');
 if(DESK&&(hudN&3)===0)deskPanel(at,af,ac);
 if(DESK){const pl=$('plk');const need=P.alive&&document.pointerLockElement!==R.domElement;pl.style.display=need?'block':'none';if(need)pl.textContent=performance.now()-plkErrT<1500?'🖱 Click again to take aim control':'🖱 Click to aim — mouse controls the turret';}
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
const wIcon=k=>({minigun:'⁂',railgun:'━',hornet:'➹',shotgun:'⋰',laser:'≋',emp:'ϟ',nanite:'⚕',lockbolt:'⚷',swarm:'✈',pulse:'◉'})[CFG.weapons[k].fam];
const szTag=k=>{const z=CFG.weapons[k].size;return `<span class="szb z${z}">${z}</span>`;};let slotSel=0,pickSel=null;
function wStats(w){if(w.tether)return `${bar('DAMAGE',w.dmg/150,w.dmg+' /bolt')}${bar('TETHER',w.tether/5,w.tether+'s · +'+Math.round(w.amp*100)+'% dmg taken')}${bar('RANGE',w.range/130,w.range+' m')}${bar('RATE',.4/w.interval,(1/w.interval).toFixed(1)+' /s')}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · ${w.mag} bolts · reload ${w.reload}s · tethered target slowed ${Math.round(w.tslow*100)}% and takes +${Math.round(w.amp*100)}% damage from everyone</p>`;
 if(w.emp)return `${bar('DAMAGE',w.dmg/150,w.dmg+' + EMP')}${bar('STUN',w.stun/5,w.stun+'s disable · '+Math.round((1-w.slow)*100)+'% slow')}${bar('RANGE',w.range/130,w.range+' m')}${bar('CHARGE',1-w.charge/1.5,w.charge+'s')}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · ${w.mag} shots · ${w.interval}s between · reload ${w.reload}s · EMP burst ${w.blast} m · disables shield, jump, dash and regen</p>`;
 if(w.dot)return `${bar('DAMAGE',(w.dmg+w.dot)/150,w.dmg+' + '+w.dot+' over '+w.dotT+'s')}${bar('LEECH',w.leech/.5,Math.round(w.leech*100)+'% healed')}${bar('RANGE',w.range/130,w.range+' m')}${bar('DPS',(w.dmg/w.interval)/150,Math.round(w.dmg/w.interval+w.dot/w.dotT))}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · ${w.mag} doses · reload ${w.reload}s · damage over time heals you</p>`;if(w.beam){const dps=w.dmg/w.interval;return `${bar('DAMAGE',dps/230,Math.round(dps)+' /s beam')}${bar('HEAT',w.heat/.4,'full in '+(1/w.heat).toFixed(1)+'s')}${bar('RANGE',w.range/130,w.range+' m')}${bar('DPS',dps/150,Math.round(dps))}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · hitscan beam · cools ${Math.round(w.cool*100)}%/s · overheat lockout ${w.reload}s</p>`;}const rate=1/w.interval,dps=w.dmg*(w.pellets||1)*rate;return `${bar('DAMAGE',w.dmg*(w.pellets||1)/230,w.dmg+(w.pellets?' ×'+w.pellets:' / hit'))}${bar('FIRE RATE',Math.min(1,rate/14),rate.toFixed(1)+' /s')}${bar('RANGE',w.range/130,w.range+' m')}${bar('DPS',dps/150,Math.round(dps))}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · mag ${w.mag} · reload ${w.reload}s${w.homing?` · lock ${w.lockTime}s · splash ${w.splash}m`:''}</p>`;}
function abText(m){return m.lockdown?`${m.lockdown.r} m root field for ${m.lockdown.dur}s, ${m.lockdown.cd}s cooldown, ${m.lockdown.range} m throw`:m.shield?`${m.shield.hp} HP toggle shield, ${m.shield.cd}s break lockout`:m.jump?`${m.jump.cd}s cooldown`:m.dash?`${m.dash.cd}s cooldown`:m.dome?`${m.dome.hp} HP force dome (${m.dome.r} m) for ${m.dome.dur}s, heals ${Math.round(m.dome.heal*100)}% of absorbed damage, ${m.dome.cd}s cooldown (${m.dome.brokeCd}s if broken)`:m.dive?`${m.dive.dmg} dmg dive strike, ${m.dive.cd}s cd · ${m.fly.fuel}s fuel, ${m.fly.ceil} m ceiling`:`+${m.regen.rate} HP/s after ${m.regen.delay}s`;}
function buyBox(k){const c=CFG.econ.locked[k];return isLocked(k)?`<div class="buy"><span>🔒 Locked</span>${SAVE.coins>=c?`<button class="go" data-buy="${k}">UNLOCK 🪙${c}</button>`:`<button disabled>🪙${c} — need ${c-SAVE.coins} more</button>`}</div>`:'';}
// garage stat rows: label, current, next
function mechRows(k){const L=levelsOf(k,'mech'),T=mechAt(k,L),out=[];
 for(const s of Object.keys(UPS.mech)){const n=Object.assign({},L);n[s]=Math.min(5,L[s]+1);const N=mechAt(k,n);
  const f=s==='armor'?[T.hp,N.hp,' HP']:s==='speed'?[T.speed,N.speed,' m/s']:T.shield?[T.shield.hp,N.shield.hp,' shield HP']:T.jump?[T.jump.cd,N.jump.cd,'s jump cd']:T.dash?[T.dash.cd,N.dash.cd,'s dash cd']:T.lockdown?[T.lockdown.dur,N.lockdown.dur,'s lockdown']:T.dome?[T.dome.hp,N.dome.hp,' dome HP']:T.dive?[T.fly.fuel,N.fly.fuel,'s fuel']:[T.regen.rate,N.regen.rate,' HP/s regen'];
  out.push([s,s==='ability'?`Ability (${T.ability})`:UPS.mech[s].name,L[s],f]);}return out;}
function wpnRows(k){const L=levelsOf(k,'wpn'),W=wpnAt(k,L),out=[];
 for(const s of Object.keys(UPS.wpn)){const n=Object.assign({},L);n[s]=Math.min(5,L[s]+1);const N=wpnAt(k,n);
  const f=s==='dmg'?[W.dmg,N.dmg,W.pellets?' ×'+W.pellets:' /hit']:s==='rate'?[(1/W.interval).toFixed(1),(1/N.interval).toFixed(1),' /s']:s==='reload'?[W.reload,N.reload,W.beam?'s overheat':'s reload']:W.homing?[W.lockTime,N.lockTime,'s lock']:[W.range,N.range,' m'];
  out.push([s,s==='range'&&W.homing?'Lock time':UPS.wpn[s].name,L[s],f]);}return out;}
function garage(){const Ms=CFG.mechs,Ws=CFG.weapons;let h=`<div class="gh"><h2>GARAGE</h2>${coinTag()}</div><div class="tabs">`+[['mech','MECHS'],['wpn','WEAPONS'],['paint','PAINT']].map(([k,n])=>`<button data-gtab="${k}" class="${gtab===k?'on':''}">${n}</button>`).join('')+`</div>`;
 const list=gtab==='wpn'?Ws:Ms;if(!list[gsel])gsel=gtab==='wpn'?slotsOf(loadout.mech)[0]:loadout.mech;
 h+=`<div class="cards${gtab==='wpn'?' gw':''}">`+Object.entries(list).map(([k,m])=>`<div class="card ${k===gsel?'sel':''}" data-gsel="${k}">${gtab==='wpn'?`<div class="wi">${wIcon(k)}</div>${szTag(k)}`:`<div class="sw" style="background:#${m.color.toString(16).padStart(6,'0')}"></div>`}<b>${m.name}</b>${lockTag(k)}</div>`).join('')+`</div><div class="det">`;
 if(isLocked(gsel))h+=`<h3>${list[gsel].name}</h3><p>${list[gsel].desc}</p>${buyBox(gsel)}`;
 else if(gtab==='paint'){const cur=paintOf(gsel);h+=`<h3>${Ms[gsel].name} paint</h3><div class="paints">`+Object.entries(CFG.paints).map(([k,p])=>{const own=SAVE.paints.includes(k),c=p.col??Ms[gsel].color,bg=p.camo?`repeating-linear-gradient(45deg,#${c.toString(16).padStart(6,'0')} 0 8px,#${p.camo[0].toString(16).padStart(6,'0')} 8px 14px,#${p.camo[1].toString(16).padStart(6,'0')} 14px 18px)`:'#'+c.toString(16).padStart(6,'0');
  return `<div class="pt ${k===cur?'sel':''}" data-paint="${k}"><i style="background:${bg}"></i><span>${p.name}</span><small>${k===cur?'EQUIPPED':own?'tap to equip':p.excl?'🏅 challenge reward':'🔒 🪙'+CFG.econ.paintCost}</small></div>`;}).join('')+`</div>`;}
 else{const rows=gtab==='wpn'?wpnRows(gsel):mechRows(gsel),kind=gtab==='wpn'?'wpn':'mech';h+=`<h3>${list[gsel].name} upgrades</h3>`;
  for(const [s,name,l,f] of rows){const c=upCost(gsel,s);h+=`<div class="up"><div><b>${name}</b><div class="pips">${[1,2,3,4,5].map(i=>`<i class="${i<=l?'on':''}"></i>`).join('')}</div><small>${l<5?`${f[0]}${f[2]} → <em>${f[1]}${f[2]}</em>`:`${f[0]}${f[2]} · MAX`}</small></div>`+
   (l>=5?`<button disabled>MAX</button>`:`<button class="${SAVE.coins>=c?'go':''}" data-up="${s}" ${SAVE.coins>=c?'':'disabled'}>Lv${l+1} · 🪙${c}</button>`)+`</div>`;}}
 h+=`</div><div class="row"><button data-go="title">◀ BACK</button><button class="${resetArm?'danger':''}" data-reset="1">${resetArm?'TAP AGAIN TO ERASE ALL':'Reset progress'}</button></div>`;return h;}
let pren=null,pdelArm=null,pexp=false;
function nameScreen(){const p=curProf(),mig=p.migrated&&(SAVE.coins||SAVE.unlocked.length||SAVE.earned);
 return `<h1>MECH ARENA</h1><h2>NEW PILOT</h2><p class="sub">What's your call sign? It's saved on this device${Object.keys(PROFS.list).length>1?'':' — you can add more pilots later'}.</p>
 <input id="pnm" class="pin" maxlength="16" placeholder="Pilot name" autocomplete="off" autocapitalize="words">${mig?`<p class="ab">Your existing progress (🪙${SAVE.coins}, ${SAVE.unlocked.length} unlocks) will be kept on this pilot.</p>`:''}
 <button class="big" data-pnew="1">START ▶</button>${Object.values(PROFS.list).some(q=>q.name)?'<div class="row"><button data-go="pilot">Choose existing pilot</button></div>':''}`;}
function pilotScreen(){const id=PROFS.cur,p=curProf(),st=p.stats,wr=st.matches?Math.round(st.wins/st.matches*100):0;
 let h=`<div class="gh"><h2>PILOT</h2>${coinTag()}</div><div class="det pc"><h3>👤 ${p.name||'(unnamed)'}${testTag(p)} ${SAVE.title?`<span class="ttl">🎖 ${SAVE.title}</span>`:''}<small>— active</small></h3><div class="pst">
 <div><b>${st.matches}</b><small>matches</small></div><div><b>${st.wins}</b><small>wins</small></div><div><b>${wr}%</b><small>win rate</small></div><div><b>${st.kills}</b><small>kills</small></div>
 <div><b>${favMech(st)}</b><small>favorite mech</small></div><div><b>🪙${SAVE.earned}</b><small>earned</small></div><div><b>${SAVE.unlocked.length}</b><small>unlocks</small></div><div><b>${SAVE.paints.length-1}</b><small>paints</small></div></div></div>
 <h3>ALL PILOTS ON THIS DEVICE</h3><div class="plist">`;
 for(const [k,q] of Object.entries(PROFS.list)){h+=`<div class="pl ${k===id?'sel':''}"><div><b>${q.name||'(unnamed)'}${testTag(q)}</b><small>🪙${(q.save||{}).coins||0} · ${(q.stats||{}).matches||0} matches${k===id?' · ACTIVE':''}</small></div>`+
  (pren===k?`<input id="pren" class="pin" maxlength="16" value="${q.name||''}"><button class="go" data-prsave="${k}">SAVE</button>`:
  `${k===id?'':`<button class="go" data-psw="${k}">SWITCH</button>`}<button data-pren="${k}">RENAME</button><button class="${pdelArm===k?'danger':''}" data-pdel="${k}">${pdelArm===k?'CONFIRM DELETE':'DELETE'}</button>`)+`</div>`;}
 h+=`</div><div class="det"><h3>New pilot</h3><div class="prow"><input id="pnm" class="pin" maxlength="16" placeholder="Pilot name" autocomplete="off"><button class="go" data-pnew="1">CREATE</button></div></div>
 <div class="det"><h3>🧪 Test pilot</h3><p>A separate sandbox pilot with every mech, weapon, paint and title unlocked, all upgrades maxed and unlimited coins. New items are unlocked automatically. Nothing it does affects your other pilots.</p><div class="row"><button class="go" data-ptest="1">${Object.values(PROFS.list).some(q=>q.test)?'🧪 SWITCH TO TEST PILOT':'🧪 CREATE TEST PILOT'}</button>${Object.values(PROFS.list).some(q=>q.test)?`<button class="${pdelArm==='__rt'?'danger':''}" data-ptreset="1">${pdelArm==='__rt'?'CONFIRM RESET':'RESET TEST PILOT'}</button>`:''}</div></div>
 <div class="det"><h3>Save code</h3><p>Move this pilot to another device, or keep a backup. Copy the code, then paste it into Import on the other device.</p>
 ${pexp?`<textarea id="pcode" class="pin pcode" readonly>${exportCode()}</textarea><button class="go" data-pcopy="1">📋 COPY CODE</button>`:`<button data-pexp="1">⇪ EXPORT ${p.name||'pilot'}</button>`}
 <textarea id="pimp" class="pin pcode" placeholder="Paste a save code (MA1-…)"></textarea><button data-pimp="1">⇩ IMPORT AS NEW PILOT</button></div>
 <div class="row"><button data-go="title">◀ BACK</button></div>`;return h;}
function pilotClick(d){const v=id=>{const e=$(id);return e?e.value:'';};
 if(d.pnew){const n=v('pnm');if(!cleanName(n)){toast('Type a pilot name first');return;}if(!curProf().name)renameProf(PROFS.cur,n);else createProf(n);toast(`Welcome, ${curProf().name}!`);menuStep='title';pexp=false;preview();}
 if(d.psw){useProf(d.psw);pexp=false;toast(`Switched to ${curProf().name}`);gsel=null;slotSel=0;pickSel=null;preview();}
 if(d.pren){pren=d.pren;}
 if(d.prsave){if(renameProf(d.prsave,v('pren')))toast('Renamed');pren=null;}
 if(d.pdel){if(pdelArm===d.pdel){const nm=PROFS.list[d.pdel].name;deleteProf(d.pdel);pdelArm=null;toast(`Deleted ${nm||'pilot'}`);preview();}else pdelArm=d.pdel;}
 if(d.pexp)pexp=true;
 if(d.pcopy){const t=$('pcode');t.select();t.setSelectionRange(0,99999);let ok=false;try{ok=document.execCommand('copy');}catch(e){}if(navigator.clipboard)navigator.clipboard.writeText(t.value).then(()=>toast('Code copied')).catch(()=>{});else toast(ok?'Code copied':'Select the code and copy it');}
 if(d.pimp){const id=importCode(v('pimp'));if(id){toast(`Imported ${curProf().name}`);preview();}else toast('That save code is not valid');}}
function renderMenu(){const Ms=CFG.mechs,Ws=CFG.weapons,Md=CFG.modes;let h='';const md=Md[settings.mode];
 const gq=`<div class="gq">Graphics: <button data-gfx="high" class="${settings.gfx==='high'?'on':''}">HIGH</button><button data-gfx="low" class="${settings.gfx==='low'?'on':''}">LOW</button></div>`;
 if(menuStep==='title'&&!curProf().name)menuStep='name';
 if(menuStep==='name')h=nameScreen();else if(menuStep==='pilot')h=pilotScreen();else if(menuStep==='chal')h=chalScreen();
 else if(menuStep==='title'){h=`<h1>MECH ARENA</h1><div class="wb">Welcome back, <b>${curProf().name}</b>${testTag(curProf())}${SAVE.title?` <span class="ttl">🎖 ${SAVE.title}</span>`:''} <button data-go="pilot" class="sw2">👤 PILOT · SWITCH</button></div>${coinTag()}<p class="sub">Win matches to earn coins. Upgrade and unlock gear in the Garage.</p>
  <button class="big" data-go="mode">PLAY</button><button class="big alt" data-go="deploy">QUICK DEPLOY<br><small>${md.name}${settings.mode==='duel'?' ('+CFG.diff[settings.diff].name+')':''} · ${settings.map==='random'?'Random map':MAPS[settings.map].name} · ${Ms[loadout.mech].name} · ${slotsOf(loadout.mech).map(k=>Ws[k].name).join(' + ')}</small></button>
  <div class="trow"><button class="big gar" data-go="garage">🔧 GARAGE</button><button class="big gar chb" data-go="chal">🏅 CHALLENGES${chClaimable()?`<i class="badge">${chClaimable()}</i>`:''}</button></div>${tuneTitleBtns()}${gq}`;}
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
 mc.className=menuStep==='weapon'?'lo':'';mc.innerHTML=h;/*v13 sticky menu bar*/}
function goMenu(){clearWorld();if(mapKey!=='arena')loadMap('arena',7);showBases(false);mode='menu';menuStep='title';preview();renderMenu();showUI();}
function deskPanel(at,af,ac){const pct=v=>Math.max(0,Math.min(100,v*100)).toFixed(0)+'%';
 const rows=P.ws.map(w=>{const W=w.W;let st,f,col='#ff6';
  if(W.emp&&w.chg){f=Math.min(1,(clock-w.chg)/W.charge);st='CHARGING '+Math.round(f*100)+'%';col='#8cf';}
  else if(w.reload){f=1-w.reload/W.reload;st=(W.beam?'OVERHEAT ':'RELOAD ')+w.reload.toFixed(1)+'s';col='#fa4';}
  else if(W.beam){f=1-(w.heat||0);st='HEAT '+Math.round((w.heat||0)*100)+'%';col=(w.heat||0)>.7?'#f64':'#6cf';}
  else{f=w.ammo/W.mag;st=w.ammo+'/'+W.mag;}
  const cd=w.fireCd>0.25&&!w.reload?` <small>CD ${w.fireCd.toFixed(1)}s</small>`:'';
  return `<div class="dw"><span class="dk">${w.s<0?'Q/1':'C/2'}</span><b>${W.name}</b><em style="color:${col}">${st}${cd}</em><i style="width:${pct(f)};background:${col}"></i></div>`;}).join('');
 $('dpanel').innerHTML=`<div class="dh">WEAPONS</div>${rows}<div class="dw da"><span class="dk">E/⇧/␣</span><b>ABILITY</b><em style="color:${ac}">${at}</em><i style="width:${pct(af)};background:${ac}"></i></div><div class="dkeys">WASD move · Mouse aim · LMB/F fire all · Q/1 left · C/2 right · R reload · E/Shift/Space/RMB ability · Esc release mouse</div>`;}
function showUI(){menu.style.display=mode==='menu'?'flex':'none';$('hud').style.display=mode==='play'?'block':'none';$('msg').style.display=mode==='over'?'flex':'none';
 const t=TOUCH&&mode==='play'?'':'none';for(const id of['joy','bMG','bAB','bRL','bFL','bFR'])$(id).style.display=t;$('bFLY').style.display=t===''&&P&&P.T.fly?'':'none';$('hint').style.display=TOUCH||DESK||mode!=='play'?'none':'';document.body.classList.toggle('tch',TOUCH);$('dpanel').style.display=DESK&&mode==='play'?'block':'none';if(mode!=='play'){$('plk').style.display='none';if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();}document.body.classList.toggle('desk',DESK);
 if(mode==='play'){bAB.textContent=P.T.ability;bAB.classList.toggle('passive',!!P.T.regen);}}
function menuClick(e){const el=e.target.closest('[data-ptest],[data-ptreset],[data-chc],[data-chtab],[data-ttl],[data-pnew],[data-psw],[data-pren],[data-prsave],[data-pdel],[data-pexp],[data-pcopy],[data-pimp],[data-go],[data-mech],[data-wpn],[data-mode],[data-diff],[data-gfx],[data-gtab],[data-gsel],[data-up],[data-buy],[data-paint],[data-reset],[data-map],[data-slot],[data-pick]');if(!el||el.disabled)return;const d=el.dataset;
 if(!d.reset)resetArm=false;if(!d.pdel&&!d.ptreset)pdelArm=null;if(d.go)pren=null,pexp=false;
 if(d.chc){chClaim(d.chc);renderMenu();return;}if(d.chtab){chTab=d.chtab;renderMenu();mc.scrollTop=0;return;}if(d.ttl){SAVE.title=d.ttl==='-'?'':d.ttl;persist();renderMenu();return;}
 if(d.ptest){createTest();toast('🧪 Test pilot active — everything unlocked');gsel=null;slotSel=0;pickSel=null;preview();renderMenu();return;}
 if(d.ptreset){if(pdelArm==='__rt'){resetTest();pdelArm=null;toast('🧪 Test pilot reset');gsel=null;slotSel=0;pickSel=null;preview();}else pdelArm='__rt';renderMenu();return;}
 if(d.pnew||d.psw||d.pren||d.prsave||d.pdel||d.pexp||d.pcopy||d.pimp){pilotClick(d);renderMenu();return;}
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
window.__game={THREE_V:THREE.Vector3,R,S,get A(){return A},overview(){const c=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,1,800);c.position.set(0,A*1.55,A*1.05);c.lookAt(0,0,-A*.08);const f=S.fog;S.fog=null;R.render(S,c);S.fog=f;},hurt,STATS,C,cam,obst,obstMeshes,BASES,CFG,get U(){return U},get E(){return foes('b')},get P(){return P},get B(){return B},get mode(){return mode},get fps(){return fps},get SPEC(){return SPEC},get settings(){return settings},
 ability:()=>ability(P),abilityU:u=>ability(u),blocked:(x,z,r,y)=>blocked(x,z,r,y),groundAt:(x,z,y)=>groundAt(x,z,y),get A(){return A},newGame,goMenu,setGfx,get loadout(){return loadout},setLoadout:(m,w)=>{loadout.mech=m;loadout.slots[m]=CFG.slots[m].map(sl=>adapt(w,sl,false));},setSlots:(m,a)=>{loadout.mech=m;loadout.slots[m]=a.slice();},slotsOf:t=>slotsOf(t),SIZES,menu:st=>{menuStep=st;renderMenu();},slot:i=>{slotSel=i;pickSel=null;renderMenu();},
 startMatch:(md,df,mp)=>{settings.mode=md;if(df)settings.diff=df;if(mp)settings.map=mp;newGame();},MAPS,get mapKey(){return mapKey},loadMap,setBaseProg:(t,v)=>{BASES[t].prog=v;},
 killTeam:t=>{for(const u of U)if(u.team===t&&u.alive)hurt(u,1e6,null,null);},killUnit:u=>hurt(u,1e6,null,null),air:{shoot:(f,d,u,h,W)=>shoot(f,d,u,h,W),sweep:(o,d,L,ow)=>sweep(o,d,L,ow),hurt:(u,d,p,s)=>hurt(u,d,p,s),domeUp,domeSafe,fireWeapon:(u,w,a,h)=>fireWeapon(u,w,a,h),get B(){return B},inp},get SAVE(){return SAVE},get PROFS(){return PROFS},createTest,resetTest,testFill,isTest,chClaim,chDaily,chClaimable,CAREER,DPOOL,chEv,dayKey,cTier,get menuStep(){return menuStep},speedOf:u=>speedOf(u),createProf,renameProf,deleteProf,useProf,exportCode,importCode,buyUp,buyUnlock,buyPaint,resetProgress,upMech,upWpn,get reward(){return LAST_REWARD},lineup:(w)=>{if(P){S.remove(P.g);P=null;}if(LINEUP)LINEUP.forEach(u=>S.remove(u.g));LINEUP=['guardian','strider','mender','phantom'].map((k,i)=>{const u=makeUnit('b',k,w||CFG.defSlots[k],null);u.g.position.set(-10.5+i*7,0,48);u.tYaw=u.legYaw=u.yaw=Math.PI*0.82;initFeet(u);animMech(u,.016);return u;});},renderMenu,go:s=>{menuStep=s;renderMenu();}};
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
 for(const u of foes(owner)){const q=u.g.position,r=u.shieldOn&&u.shA>=1?H.shield:H.hx;_mn.set(q.x-r,q.y+H.y0,q.z-r);_mx.set(q.x+r,q.y+H.y1,q.z+r);const t=rayBox(o,d,_mn,_mx,L);if(t>=0&&(!best||t<best.t))best={t,u};}
 best=domeSweep(o,d,L,owner,best);
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
// ---------- v20: test-pilot tuning panel + pause menu + sound settings ----------
let PAUSED=false;
if(CFG.teamSize==null)CFG.teamSize=6;
const TUNE_KEYS=['mechs','weapons','gravity','legTurn','cam','move','gait','hitbox','hitReact','capture','fx','diff','teamSize','allyProfile','enemyProfile'];
const TDEF=JSON.parse(JSON.stringify(Object.fromEntries(TUNE_KEYS.map(k=>[k,CFG[k]]).filter(e=>e[1]!==undefined)),(k,v)=>k==='bases'?undefined:v));
const MAPSC0=MAPSC;
function tRestore(t,s){for(const k in s){const v=s[k];if(v&&typeof v==='object'&&!Array.isArray(v)){if(!t[k]||typeof t[k]!=='object')t[k]={};tRestore(t[k],v);}else t[k]=Array.isArray(v)?v.slice():v;}}
function tGet(o,p){for(const k of p.split('.')){if(o==null)return;o=o[k];}return o;}
function tSet(o,p,v){const a=p.split('.'),l=a.pop();for(const k of a){if(o[k]==null)return;o=o[k];}o[l]=v;}
const TF=k=>{try{return isTest()&&SAVE.tune&&!!SAVE.tune['flag.'+k];}catch(e){return false;}};
function applyTune(){tRestore(CFG,TDEF);for(const k of['gravity','legTurn','teamSize','allyProfile','enemyProfile'])if(k in TDEF)CFG[k]=TDEF[k];MAPSC=MAPSC0;
 let t=null;try{t=isTest()&&SAVE&&SAVE.tune;}catch(e){}
 if(!t)return;for(const p in t){const v=t[p];if(p.startsWith('flag.'))continue;if(p==='MAPSC')MAPSC=v;else if(p.indexOf('.')<0)CFG[p]=v;else tSet(CFG,p,v);}
 if(t['flag.botDiff'])CFG.enemyProfile=CFG.allyProfile=t['flag.botDiff'];}
function tuneTick(){if(!P||!isTest())return;if(TF('infAmmo'))for(const w of P.ws){w.ammo=w.W.mag;w.reload=0;w.heat=0;}if(TF('noCd'))P.abCd=0;if(TF('god'))P.hp=Math.max(P.hp,P.T.hp*(P.prof?1:1));}
// wrap profile switching + match start so overrides apply only to the test pilot
{const _u=useProf;useProf=function(id){const r=_u.apply(this,arguments);applyTune();audApply();return r;};}
{const _n=newGame;newGame=function(){applyTune();PAUSED=false;closeOvl();const r=_n.apply(this,arguments);sfx('deploy');ambStart();return r;};}
{const _g=goMenu;goMenu=function(){PAUSED=false;closeOvl();ambStop();applyTune();return _g.apply(this,arguments);};}
// ---------- overlay ----------
const OV=document.createElement('div');OV.id='ovl';OV.innerHTML='<div class="obar"><button id="oBack">◀ BACK</button><b id="oTitle"></b><span id="oAct"></span></div><div id="obody"></div>';document.body.appendChild(OV);
let ovBack=null;
function openOvl(title,html,back,act=''){OV.style.display='block';$('oTitle').textContent=title;$('obody').innerHTML=html;$('oAct').innerHTML=act;ovBack=back;OV.scrollTop=0;$('obody').scrollTop=0;document.exitPointerLock&&document.exitPointerLock();}
function closeOvl(){OV.style.display='none';ovBack=null;}
$('oBack').onclick=()=>{sfx('click');const b=ovBack;closeOvl();b&&b();};
function tuneTitleBtns(){return `<div class="trow"><button class="gar" data-snd="1">🔊 SOUND</button>${isTest()?'<button class="gar tunb" data-tune="1">🛠 TUNING</button>':''}</div>`;}
// pause (everyone): resume / sound / tuning (test only) / restart / quit
function openPause(){if(mode!=='play')return;PAUSED=true;inp.fire=inp.mFire=false;inp.mx=inp.mz=0;
 openOvl('PAUSED',`<div class="pz"><button class="big" data-pz="resume">▶ RESUME</button><button data-pz="snd">🔊 SOUND</button>${isTest()?'<button class="tunb" data-pz="tune">🛠 TUNING</button><button data-pz="restart">↻ RESTART WITH TUNING</button>':''}<button data-pz="quit">⏏ QUIT TO MENU</button></div>`,resumeGame);}
function resumeGame(){closeOvl();PAUSED=false;last=performance.now();}
// ---------- sound settings ----------
function openSound(back){const a=aud(),row=(k,l)=>`<div class="trw"><label>${l}</label><input type="range" min="0" max="1" step="0.05" value="${a[k]}" data-av="${k}"><output>${Math.round(a[k]*100)}%</output></div>`;
 openOvl('SOUND',`<div class="tsec open"><div class="tin">${row('master','Master')}${row('sfx','Effects')}${row('ui','UI / alerts')}${row('amb','Ambient')}
 <div class="trw"><label>Mute all</label><button data-amute="1" class="${a.mute?'on':''}">${a.mute?'MUTED':'ON'}</button></div>
 <p class="ab">Test: ${['click','step','shot','hit','hurt','boom','shUp','reload','win','coins'].map(k=>`<button data-atest="${k}">${k}</button>`).join(' ')}</p>
 <p class="ab">Saved per pilot. On iPad/iPhone sound starts after your first tap.</p></div></div>`,back);}
function audSet(k,v){SAVE.audio=Object.assign(aud(),{[k]:v});audApply();try{persist();}catch(e){}}
// ---------- tuning panel ----------
const TLBL={hp:'HP',speed:'Speed',dmg:'Damage',interval:'Fire interval (s)',range:'Range',mag:'Magazine',reload:'Reload (s)',heat:'Heat/s',cool:'Cool/s',stun:'EMP stun (s)',slow:'Slow',blast:'Blast radius',dot:'Nanite DoT',dotT:'DoT time',leech:'Leech',tether:'Tether',amp:'Tether amp',tslow:'Tether slow',charge:'Charge (s)',splash:'Splash',spread:'Spread',cd:'Cooldown',dur:'Duration',brokeCd:'Cooldown if broken (s)',heal:'Heal % of absorbed',empDrain:'EMP dome drain',r:'Radius',vel:'Jump velocity',regen:'Regen',rate:'Rate'};
const tOver=()=>SAVE.tune||(SAVE.tune={});
function tStep(d){d=Math.abs(d);return d>=100?1:d>=10?.1:d>=1?.01:.001;}
function tRow(path,label){const def=tGet(TDEF,path),cur=path in tOver()?tOver()[path]:def,mx=Math.max(Math.abs(def)*3,1),st=tStep(def||1),ch=path in tOver();
 return `<div class="trw${ch?' ch':''}"><label title="${path}">${label}</label><input type="range" min="0" max="${+mx.toFixed(3)}" step="${st}" value="${cur}" data-tp="${path}"><input type="number" step="${st}" value="${cur}" data-tn="${path}"><button class="tx" data-tr="${path}" title="reset">↺</button></div>`;}
function tFields(prefix,obj,lbl=''){let h='';for(const k in obj){const v=obj[k],p=prefix+'.'+k;if(/color|Color|^name$|^fam$|^size$/.test(k))continue;
  if(typeof v==='number')h+=tRow(p,(lbl?lbl+' · ':'')+(TLBL[k]||k));else if(v&&typeof v==='object'&&!Array.isArray(v))h+=tFields(p,v,(lbl?lbl+' · ':'')+k);}return h;}
function tFlag(k,l){return `<div class="trw"><label>${l}</label><button data-tf="${k}" class="${tOver()['flag.'+k]?'on':''}">${tOver()['flag.'+k]?'ON':'OFF'}</button></div>`;}
function tSel(k,l,opts,cur){return `<div class="trw"><label>${l}</label><select data-ts="${k}">${opts.map(([v,n])=>`<option value="${v}"${String(v)===String(cur)?' selected':''}>${n}</option>`).join('')}</select></div>`;}
function tSecBody(id){const t=tOver();
 if(id==='match')return tSel('teamSize','Team size (per side)',[1,2,3,4,5,6,7,8].map(n=>[n,n+' v '+n]),t.teamSize||TDEF.teamSize)+tSel('flag.botDiff','Bot difficulty',[['','Default'],...Object.keys(CFG.diff).map(k=>[k,CFG.diff[k].name])],t['flag.botDiff']||'')
  +`<div class="trw${'MAPSC' in t?' ch':''}"><label>Map size scale</label><input type="range" min="0.8" max="2.2" step="0.05" value="${t.MAPSC||MAPSC0}" data-tp="MAPSC"><input type="number" step="0.05" value="${t.MAPSC||MAPSC0}" data-tn="MAPSC"><button class="tx" data-tr="MAPSC">↺</button></div>`
  +tFlag('god','God mode (no damage)')+tFlag('infAmmo','Infinite ammo / no heat')+tFlag('noCd','No ability cooldowns')+tFlag('aiOff','AI off (bots idle)');
 if(id==='global'){let h=tRow('gravity','Gravity')+tRow('legTurn','Leg turn rate');for(const k of['move','gait','cam','hitbox','hitReact','capture','fx'])if(TDEF[k])h+=`<h4>${k}</h4>`+tFields(k,TDEF[k]);return h;}
 if(id.startsWith('m:')){const k=id.slice(2);return tFields('mechs.'+k,TDEF.mechs[k]);}
 if(id.startsWith('w:')){const k=id.slice(2);return tFields('weapons.'+k,TDEF.weapons[k]);}return '';}
function tSecs(){const s=[['match','⚙ Match settings'],['global','🌐 Global (physics, camera, movement)']];
 for(const k in TDEF.mechs)s.push(['m:'+k,'🤖 '+(TDEF.mechs[k].name||k)]);for(const k in TDEF.weapons)s.push(['w:'+k,'🔫 '+(TDEF.weapons[k].name||k)]);return s;}
function tCount(id){const t=tOver(),pre=id==='match'?null:id==='global'?null:id.startsWith('m:')?'mechs.'+id.slice(2)+'.':'weapons.'+id.slice(2)+'.';
 return Object.keys(t).filter(p=>pre?p.startsWith(pre):id==='match'?(p.startsWith('flag.')||p==='teamSize'||p==='MAPSC'):!/^(mechs|weapons|flag)\.|^(teamSize|MAPSC)$/.test(p)).length;}
function openTune(back){if(!isTest()){toast('Tuning is only available on the test pilot');return;}
 const h=`<p class="ab">🧪 Test pilot only — changes are saved to this pilot and never affect normal pilots. Stat changes apply on the next deploy (use ↻ Restart from the pause menu).</p>`+
  tSecs().map(([id,l])=>{const n=tCount(id);return `<details class="tsec" data-sec="${id}"><summary>${l}${n?` <i class="tchg">${n} changed</i>`:''}</summary><div class="tin"></div><div class="trs"><button data-treset="${id}">Reset section</button></div></details>`;}).join('');
 openOvl('TUNING',h,back,'<button data-treset="*" class="warn">Reset all</button>');}
function tPersist(){applyTune();try{persist();}catch(e){}}
function tSecReset(id){const t=tOver();for(const p of Object.keys(t)){const pre=id==='*'?'':id==='match'?null:id==='global'?null:id.startsWith('m:')?'mechs.'+id.slice(2)+'.':'weapons.'+id.slice(2)+'.';
  const hit=id==='*'||(pre?p.startsWith(pre):id==='match'?(p.startsWith('flag.')||p==='teamSize'||p==='MAPSC'):!/^(mechs|weapons|flag)\.|^(teamSize|MAPSC)$/.test(p));if(hit)delete t[p];}tPersist();}
function tSetVal(p,v){const def=p==='MAPSC'?MAPSC0:tGet(TDEF,p);if(!isFinite(v))return;if(Math.abs(v-def)<1e-9)delete tOver()[p];else tOver()[p]=v;tPersist();}
function tRefresh(d){const sum=d.querySelector('summary'),id=d.dataset.sec,n=tCount(id);sum.querySelector('.tchg')?.remove();if(n)sum.insertAdjacentHTML('beforeend',` <i class="tchg">${n} changed</i>`);}
OV.addEventListener('toggle',e=>{const d=e.target;if(d.tagName==='DETAILS'&&d.open){const b=d.querySelector('.tin');if(!b.innerHTML)b.innerHTML=tSecBody(d.dataset.sec);}},true);
OV.addEventListener('input',e=>{const el=e.target,ds=el.dataset;
 if(ds.av){audSet(ds.av,+el.value);el.nextElementSibling.textContent=Math.round(el.value*100)+'%';return;}
 const p=ds.tp||ds.tn;if(!p)return;const v=+el.value;const row=el.closest('.trw');row.querySelectorAll('input').forEach(i=>{if(i!==el)i.value=v;});tSetVal(p,v);row.classList.toggle('ch',p in tOver());const d=el.closest('details');d&&tRefresh(d);});
OV.addEventListener('change',e=>{const el=e.target,k=el.dataset.ts;if(!k)return;const t=tOver();if(k==='teamSize'){const v=+el.value;if(v===TDEF.teamSize)delete t.teamSize;else t.teamSize=v;}else{if(el.value)t[k]=el.value;else delete t[k];}tPersist();const d=el.closest('details');d&&tRefresh(d);});
OV.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ds=b.dataset;if(b.id!=='oBack')sfx('click');
 if(ds.pz){if(ds.pz==='resume')resumeGame();else if(ds.pz==='snd')openSound(openPause);else if(ds.pz==='tune')openTune(openPause);else if(ds.pz==='restart'){closeOvl();PAUSED=false;newGame();}else if(ds.pz==='quit'){closeOvl();PAUSED=false;goMenu();}return;}
 if(ds.amute){audSet('mute',!aud().mute);b.classList.toggle('on',aud().mute);b.textContent=aud().mute?'MUTED':'ON';return;}
 if(ds.atest){sfx(ds.atest,{u:P&&P.alive?P:null,fam:'minigun'});return;}
 if(ds.tf){const t=tOver(),k='flag.'+ds.tf;if(t[k])delete t[k];else t[k]=true;tPersist();b.classList.toggle('on',!!t[k]);b.textContent=t[k]?'ON':'OFF';const d=b.closest('details');d&&tRefresh(d);return;}
 if(ds.tr){const p=ds.tr;delete tOver()[p];tPersist();const row=b.closest('.trw'),v=p==='MAPSC'?MAPSC0:tGet(TDEF,p);row.querySelectorAll('input').forEach(i=>i.value=v);row.classList.remove('ch');const d=b.closest('details');d&&tRefresh(d);return;}
 if(ds.treset){if(ds.treset==='*'){if(!confirm('Reset ALL tuning for the test pilot?'))return;tSecReset('*');openTune(ovBack);return;}tSecReset(ds.treset);const d=b.closest('details');d.querySelector('.tin').innerHTML=tSecBody(ds.treset);tRefresh(d);}});
// title buttons + global UI click sound
document.addEventListener('click',e=>{const b=e.target.closest('[data-snd],[data-tune]');if(b){e.stopPropagation();sfx('click');if(b.dataset.snd)openSound(()=>{});else openTune(()=>{renderMenu();});return;}
 if(mode!=='play'&&e.target.closest('button,[data-go],.big')&&!OV.contains(e.target))sfx('click');},true);
// in-match pause / dev button (touch + desktop) and P key
{const pb=document.createElement('div');pb.id='bPause';pb.className='btn';pb.textContent='⏸';$('hud').appendChild(pb);
 const go=e=>{e.preventDefault();e.stopPropagation();sfx('click');openPause();};pb.addEventListener('touchend',go,{passive:false});pb.addEventListener('click',go);pb.addEventListener('mousedown',e=>e.stopPropagation());pb.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});}
addEventListener('keydown',e=>{if(mode!=='play'||(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)))return;if(e.code==='KeyP'){if(PAUSED)resumeGame();else openPause();}});
applyTune();
if(window.__game){if(window.__game.useProf)window.__game.useProf=useProf;if(window.__game.goMenu)window.__game.goMenu=goMenu;}
Object.assign(window.__game||{},{applyTune,sfx,openTune,openSound,openPause,TDEF,TF,aud,get PAUSED(){return PAUSED;}});
