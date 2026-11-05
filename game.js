/*v37 4-player lobby + secondary abilities*/
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
   ability:'REGEN',desc:'Repair frame. After 3s without taking damage, auto-repairs 60 HP per second. Two Medium arm mounts (a Small also fits either one).',
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
CFG.mechs.phantom={name:'Phantom',hp:900,speed:9.3,mass:0.95,color:0x6b4fa8,enemyColor:0x9a2a50,ability:'DASH',
 desc:'Stealth raider. Fires a burst of thrusters for a lightning-fast dash in the direction you are moving. Two Medium arm mounts (a Small also fits either one).',dash:{speed:40,dur:0.32,cd:4}};
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
// v28: WRAITH (stealth cloak frame)
CFG.mechs.wraith={name:'Wraith',hp:820,speed:8.9,mass:.85,color:0x46505e,enemyColor:0x5c3a52,ability:'CLOAK',
 desc:'Stealth infiltrator. CLOAK bends light around the frame for up to 7 s: near-invisible shimmer, gone from enemy minimaps, lock-ons and name plates, and bots lose track of you. Firing or taking hits makes the cloak flicker visible for a moment, and you can be spotted up close (6 m). EMP knocks the cloak down. Pairs with the Jammer. Two Medium arm mounts (a Small also fits either one).',
 cloak:{dur:7,cd:14,near:6,fireReveal:.8,hitReveal:.5,fireCost:.4,speedMul:1.1}};
CFG.weapons.shotgun={name:'Scattergun',desc:'Close-range shotgun: 9 heavy pellets per blast. Devastating up close, useless far away.',
 dmg:15,pellets:9,interval:0.8,range:28,mag:6,reload:3.2,spread:0.11,speed:150,aiBurst:1,kick:0.7,jolt:0.07};
CFG.econ={win:100,loss:25,kill:20,capture:60,duelMul:{easy:0.7,normal:1,hard:1.5},
 upCost:[0,150,300,550,900],// cost to go from level i to i+1 (index = current level)
 locked:{phantom:800,locke:1500,skyhawk:1300,aegis:1600,wraith:1700,jammer_s:400,jammer:750,jammer_l:1150,swarm_s:450,swarm:800,swarm_l:1250,pulse_s:450,pulse:800,pulse_l:1300,lockbolt_s:550,lockbolt:900,lockbolt_l:1400,shotgun:700,minigun_l:600,railgun_s:250,railgun_l:900,hornet_s:250,hornet_l:800,shotgun_s:400,shotgun_l:1000,laser_s:450,laser:750,laser_l:1200,emp_s:500,emp:800,emp_l:1250,nanite_s:450,nanite:750,nanite_l:1150},paintCost:250,enemyScale:0.15};
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
CFG.weapons.emp={name:'EMP Cannon',desc:'Tesla coil. CHARGE WEAPON: builds charge while ready (1.6 s to full). Listed damage is at FULL charge (100%); no charge deals 40%, partial charge scales between. Range grows 45→60 m with charge. Holds at max, resets after each shot. Only a FULLY CHARGED shot unleashes CHAIN LIGHTNING: it arcs to up to 2 more enemies within 14 m, each taking half the damage of the previous one. Every enemy it touches loses shields, jump, dash and regen and is slowed. Arcs need line of sight and can\'t find cloaked Wraiths.',fam:'emp',size:'M',
 dmg:120,interval:2.2,range:45,rMin:45,rMax:60,chT:1.6,chMin:.4,mag:4,reload:4.5,spread:0,speed:999,hitscan:true,emp:true,charge:.7,stun:3,slow:.6,jumps:2,chainR:14,chainFall:.5,kick:.5,jolt:.05,aiBurst:1};
CFG.weapons.nanite={name:'Nanite Injector',desc:'Syringe launcher. Darts inject nanites that eat armor over time and feed a share back to you as repairs.',fam:'nanite',size:'M',
 dmg:10,interval:.35,range:50,mag:12,reload:3.2,spread:.012,speed:85,dot:60,dotT:3,leech:.35,kick:.12,jolt:.01,aiBurst:4};
CFG.weapons.lockbolt={name:'Lockbolt',desc:'Magnetic tether launcher. Each bolt latches a glowing tether onto the target: while tethered it takes extra damage from ALL sources and is slowed. Tether snaps if it stretches too far.',fam:'lockbolt',size:'M',
 dmg:52,interval:.9,range:72,mag:5,reload:3.4,spread:.006,speed:130,tether:3.5,amp:.2,tslow:.25,kick:.35,jolt:.03,aiBurst:2};
VAR.lockbolt={S:['Lockpick','Light tether pistol. Quick bolts, short tether.'],L:['Deadbolt','Heavy tether lance. Huge bolt, long tether, big damage amp.']};
VAR.emp={S:['Arc Zapper','Small Tesla coil. Fast charge (1.2 s), 45→60 m. Short stun. Full charge chains to 2 more enemies within 12 m (half damage per jump).'],L:['Storm Coil','Huge Tesla tower. Slow charge (2 s), 45→60 m. Long stun. Full charge chains to 3 more enemies within 16 m (half damage per jump).']};
VAR.nanite={S:['Nanite Dart','Light syringe pistol. Fast darts, small dose.'],L:['Nanite Lance','Heavy syringe. Big dose, strong leech.']};
VAR.laser={S:['Pulse Laser','Light beam sidearm. Low heat, quick cool-down.'],L:['Heavy Lance','Searing heavy beam. Huge damage and reach, runs hot.']};
CFG.weapons.swarm={name:'Swarm Rack',desc:'Micro-missile rack. Rapid salvos of small missiles that seek the enemy nearest your aim. Fired from altitude they dive in for bonus damage (up to +50% at 10 m up), which makes it the flyer weapon.',fam:'swarm',size:'M',
 dmg:20,interval:.16,range:75,mag:12,reload:3.8,spread:.05,speed:62,splash:1.8,seek:.9,turnRate:3.2,altBonus:.5,kick:.15,jolt:.01,aiBurst:6};
VAR.swarm={S:['Swarm Pod','Light 6-cell micro-missile pod. Quick reload, small altitude bonus.'],L:['Swarm Battery','Heavy 12-cell battery. Big salvos and the biggest altitude bonus.']};
CFG.weapons.pulse={name:'Pulse Cannon',desc:'Kinetic energy cannon. Each orb hits hard and SHOVES the target back, which pushes enemies out of your dome. Pairs with Aegis: shove attackers off your dome while it heals you. CHARGES while ready: listed damage is at FULL charge (100%); an uncharged orb deals 40% and it builds to 100% over 1.6 s, then holds at MAX (orb glows blue→white with sparks and a segmented charge meter, harder shove).',fam:'pulse',size:'M',
 dmg:115,interval:.75,range:55,mag:6,reload:3.4,spread:.01,speed:95,push:9,chT:1.6,chMin:.4,kick:.4,jolt:.04,aiBurst:2};
CFG.weapons.jammer={name:'Jammer',desc:'Signal-scrambler cannon. Each hit has a chance to JAM the target: it forces weapons into a full reload (laser / heat weapons are forced into overheat). Medium jams 2 weapons per proc. Targets get a few seconds of jam resistance after it wears off.',fam:'jammer',size:'M',
 dmg:24,interval:.6,range:62,mag:8,reload:3.2,spread:.008,speed:120,jam:.5,jamN:2,jamMul:.8,kick:.2,jolt:.02,aiBurst:3};
VAR.jammer={S:['Jam Pistol','Light scrambler. Fast shots, small chance to jam ONE weapon.'],L:['Blackout Array','Heavy scrambler dish. Slow, but most hits jam ALL of the target\'s weapons.']};
VAR.pulse={S:['Pulse Pistol','Light pulse emitter. Fast orbs, small shove. Charges from 40% to 100% damage in 1.2 s.'],L:['Pulse Projector','Heavy pulse projector. Huge orb, massive shove that clears attackers off your dome. Charges from 40% to 100% damage in 2 s.']};
for(const f of Object.keys(VAR))for(const z of['S','L']){const b=CFG.weapons[f],q=SIZES[z],W=Object.assign({},b,{name:VAR[f][z][0],desc:VAR[f][z][1],fam:f,size:z});
 W.dmg=+(b.dmg*q.dmg).toFixed(1);W.interval=+(b.interval*q.int).toFixed(3);W.range=Math.round(b.range*q.range);W.reload=+(b.reload*q.reload).toFixed(2);W.mag=Math.max(2,Math.round(b.mag*q.mag));
 if(W.splash)W.splash=+(b.splash*(z==='L'?1.4:.75)).toFixed(1);if(W.spin)W.spin=b.spin*(z==='L'?1.6:.6);W.kick=b.kick*q.sc;W.jolt=b.jolt*q.dmg;if(W.beam){W.mag=1;W.interval=0.1;W.dmg=+(b.dmg*(z==='S'?.68:1.5)).toFixed(1);W.heat=z==='S'?.22:.3;W.cool=z==='S'?.5:.33;W.color=z==='S'?0xff60a0:0xff5020;W.aiBurst=z==='S'?26:18;}
 if(W.emp){const S_=z==='S';W.dmg=S_?80:220;W.interval=S_?1.8:2.6;W.range=45;W.rMin=45;W.rMax=60;W.chT=S_?1.2:2;W.chMin=.4;W.mag=S_?4:3;W.reload=S_?4:5.2;W.charge=S_?.45:1;W.stun=S_?2:4;W.slow=S_?.7:.5;W.jumps=S_?2:3;W.chainR=S_?12:16;W.chainFall=.5;W.aiBurst=1;}
 if(W.tether){const S_=z==='S';W.dmg=S_?30:95;W.interval=S_?.65:1.25;W.range=S_?60:88;W.mag=S_?6:4;W.reload=S_?2.8:4.2;W.tether=S_?2.5:4.5;W.amp=S_?.15:.3;W.tslow=S_?.18:.35;W.speed=S_?140:120;W.aiBurst=S_?3:1;}
 if(W.dot!==undefined){const S_=z==='S';W.dmg=S_?6:16;W.interval=S_?.28:.45;W.range=S_?45:55;W.mag=S_?10:14;W.reload=S_?2.8:3.6;W.dot=S_?36:100;W.dotT=S_?2.5:3.5;W.leech=S_?.3:.4;W.speed=S_?95:75;W.aiBurst=S_?5:3;}
 if(W.seek){const S_=z==='S';W.mag=S_?6:12;W.dmg=S_?12:34;W.interval=S_?.14:.2;W.altBonus=S_?.35:.65;W.splash=S_?1.4:2.6;W.aiBurst=S_?6:8;}
 if(W.jam){const S_=z==='S';W.jam=S_?.3:.75;W.jamN=S_?1:99;W.jamMul=S_?.55:1;W.dmg=S_?10:60;W.interval=S_?.32:1.2;W.mag=S_?12:4;W.speed=S_?135:105;W.aiBurst=S_?5:1;}
 if(W.push){const S_=z==='S';W.push=S_?5:15;W.chT=S_?1.2:2;W.chMin=.4;W.dmg=S_?65:205;W.interval=S_?.5:1.15;W.mag=S_?8:4;W.speed=S_?110:80;W.aiBurst=S_?3:1;}
 CFG.weapons[f+'_'+z.toLowerCase()]=W;}
// stable display order: family, then S/M/L
{const o={};for(const f of['minigun','railgun','hornet','shotgun','laser','emp','nanite','lockbolt','swarm','pulse','jammer'])for(const k of[f+'_s',f,f+'_l'])o[k]=CFG.weapons[k];CFG.weapons=o;}
// hardpoints per mech (s = side: -1 left group, +1 right group). A slot takes its size or smaller.
CFG.slots={guardian:[{z:'L',s:1,n:'Right arm'},{z:'L',s:-1,n:'Left arm'},{z:'S',s:1,n:'Right shoulder'},{z:'S',s:-1,n:'Left shoulder'}],
 strider:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'}],mender:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'}],phantom:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'}],
 locke:[{z:'M',s:1,n:'Right pod'},{z:'M',s:-1,n:'Left pod'},{z:'S',s:1,n:'Crown'}],
 skyhawk:[{z:'M',s:1,n:'Right wing'},{z:'M',s:-1,n:'Left wing'}],aegis:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'},{z:'S',s:1,n:'Emitter crown'}],wraith:[{z:'M',s:1,n:'Right arm'},{z:'M',s:-1,n:'Left arm'}]};
CFG.defSlots={guardian:['minigun','minigun','minigun_s','minigun_s'],strider:['minigun','minigun'],mender:['minigun','minigun'],phantom:['minigun','minigun'],locke:['lockbolt','minigun','minigun_s'],skyhawk:['swarm','minigun'],aegis:['pulse','minigun','minigun_s'],wraith:['jammer','railgun']};
// firepower: per-mech damage factor (Guardian's 4 mounts share one reactor)
CFG.firepower={guardian:.62,strider:1,mender:1,phantom:1,locke:.85,skyhawk:1,aegis:.85,wraith:.95};
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
function buyUnlock(k){const c=CFG.econ.locked[k];if(!isLocked(k)||SAVE.coins<c)return false;SAVE.coins-=c;SAVE.unlocked.push(k);if(k==='locke'&&!SAVE.unlocked.includes('lockbolt'))SAVE.unlocked.push('lockbolt');{const sig={skyhawk:'swarm',aegis:'pulse',wraith:'jammer'}[k];if(sig&&!SAVE.unlocked.includes(sig))SAVE.unlocked.push(sig);}persist();return true;}
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
 if(T.cloak)T.cloak.dur=+(b.cloak.dur*(1+.08*ab)).toFixed(2);
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
 m.build();expand(key,m.A);detail(key);flushBatch();if(typeof gfx33Map==='function')gfx33Map(m);
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
// ---------- v24: realistic weapon detailing (hi-gfx only) + per-weapon animation ----------
const wAdd=(par,geo,mt,sx,sy,sz,x,y,z,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geo,mt);o.scale.set(sx,sy,sz);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);par.add(o);return o;};
const _wdM={};function wdM(k,c,o){return _wdM[k]||(_wdM[k]=M(c,o));}
const _cas=new THREE.Vector3(),_casV=new THREE.Vector3();
function wDet(kb,wpn,big,sm,hi,dk,lm){const mt=MS.metal,bl=wdM('blk',0x18181a,{metal:.6,rough:.6}),br=wdM('brass',0xc89a3a,{metal:.9,rough:.3}),yl=wdM('yel',0xe8c020,{metal:.2,rough:.6}),hs=wdM('hose',0x202224,{metal:.1,rough:.9}),rv=wdM('rivet',0x9a9a9a,{metal:.9,rough:.25});
 const ud={};if(!hi)return ud;
 const stripes=(x,y,z,w,n=4)=>{for(let i=0;i<n;i++)wAdd(kb,boxG,i%2?bl:yl,w/n,.05,.02,x-w/2+w/n*(i+.5),y,z);};
 const rivets=(x,y,z0,z1,n=3)=>{for(let i=0;i<n;i++)wAdd(kb,boxG,rv,.04,.04,.04,x,y,z0+(z1-z0)*i/(n-1||1));};
 const rail=(y,z,l)=>{wAdd(kb,boxG,bl,.12,.04,l,0,y,z);for(let i=0;i<Math.round(l/.12);i++)wAdd(kb,boxG,bl,.16,.03,.04,0,y+.035,z-l/2+i*.12+.06);};
 const sight=(y,z,lit)=>{wAdd(kb,cylG,bl,.11,.4,.11,0,y,z,Math.PI/2,0,0);wAdd(kb,cylG,lit||lm,.09,.02,.09,0,y,z+.2,Math.PI/2,0,0);wAdd(kb,boxG,bl,.05,.06,.05,0,y-.07,z-.1);wAdd(kb,boxG,bl,.05,.06,.05,0,y-.07,z+.1);};
 const vents=(x,y,z,n,ax)=>{for(let i=0;i<n;i++)wAdd(kb,boxG,bl,ax?.02:.3,.22,ax?.3:.02,x,y,z+(i-(n-1)/2)*.07);};
 const _hy=new THREE.Vector3(0,1,0),hose=(x0,y0,z0,x1,y1,z1)=>{const d=new THREE.Vector3(x1-x0,y1-y0,z1-z0),l=d.length(),h=wAdd(kb,cylG,hs,.05,l,.05,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2);h.quaternion.setFromUnitVectors(_hy,d.normalize());};
 if(wpn==='minigun'){rail(.36,.0,.6);sight(.45,.05);// ammo drum + feed belt chute
  const dr=wAdd(kb,cylG,dk,.32,.32,.32,-.48,-.15,-.05,0,0,Math.PI/2);for(let i=0;i<(big?7:5);i++)wAdd(kb,boxG,br,.06,.05,.11,-.3+i*.0,-.05-i*.05,.15+i*.08*0,0,0,0).position.set(-.3,-.1+i*.0,-.0+i*.08);
  wAdd(kb,cylG,mt,.36,.06,.36,0,0,1.0,Math.PI/2,0,0);wAdd(kb,cylG,mt,.34,.05,.34,0,0,1.5+(big?.4:0)*.5,Math.PI/2,0,0);vents(.31,0,.15,5,1);stripes(0,-.31,.5,.5);rivets(.31,.2,-.2,.4);
  ud.casing={c:0xd0a040,dir:-1};}
 else if(wpn==='railgun'){rail(.33,.1,.9);sight(.47,.1,wdM('rsc',0x60d0ff,{emissive:0x60d0ff,ei:1}));
  for(const sx of[-1,1]){wAdd(kb,boxG,mt,.06,.1,big?2.2:1.6,sx*.17,.18,1.2);wAdd(kb,boxG,mt,.06,.1,big?2.2:1.6,sx*.17,-.18,1.2);}// twin conductor rails
  const cap=[];for(let i=0;i<(big?4:3);i++){const c=wAdd(kb,boxG,M(0x103040,{emissive:0x40c0ff,ei:.1}),.12,.12,.18,.3,.0,-.25+i*.2);cap.push(c);}
  vents(-.25,0,.1,6,1);hose(.3,.1,-.3,.2,.15,.7);stripes(0,-.32,.6,.4);rivets(-.24,.2,-.3,.5);wAdd(kb,boxG,bl,.3,.3,.08,0,0,(big?2.6:sm?1.9:2.5)*0+(sm?2.0:2.6),0,0,0);
  ud.anim=(w,dt,u)=>{const ch=w.reload?0:Math.max(0,1-w.fireCd/w.W.interval);cap.forEach((c,i)=>{c.material.emissiveIntensity=ch>(i+1)/(cap.length+1)?2.2:.1;});};}
 else if(wpn==='laser'){sight(.38,.1,wdM('lsc',0xff4060,{emissive:0xff4060,ei:1}));const lens=wAdd(kb,cylG,M(0x400810,{emissive:0xff2040,ei:.4}),.2,.03,.2,0,0,(sm?1.75:2.2)+.0,Math.PI/2,0,0);
  const finM=M(0x3a3a3c,{metal:.8,rough:.35,emissive:0xff3010,ei:.001}),fins=[];for(let i=0;i<(big?7:5);i++)fins.push(wAdd(kb,boxG,finM,.62,.04,.04,0,.33,-.2+i*.11));
  hose(-.28,-.1,-.2,-.15,-.15,.8);hose(.28,-.1,-.2,.15,-.15,.8);stripes(0,-.29,.4,.4);
  ud.anim=(w,dt,u)=>{const h=Math.min(1,(w.heat||0)/((w.W.heat||1)*1.0)),f=w.beamT>0?1:0;lens.material.emissiveIntensity=.4+2.5*Math.max(f,h);finM.emissiveIntensity=h*1.6;};}
 else if(wpn==='emp'){for(const a of[0,1.57,3.14,4.71])wAdd(kb,boxG,wdM('ins',0xe8e4d8,{}),.05,.25,.05,Math.cos(a)*.38,.15,.1+Math.sin(a)*.38);hose(-.4,-.05,-.3,-.1,.6,.1);stripes(0,-.22,.56,.6);rivets(.4,0,-.2,.4);}
 else if(wpn==='nanite'){wAdd(kb,boxG,yl,.3,.02,.3,0,-.16,.0);wAdd(kb,boxG,bl,.06,.32,.06,.2,-.2,-.1);hose(-.2,-.32,-.1,-.12,-.05,.9);sight(.22,.2);
  for(let i=0;i<5;i++)wAdd(kb,boxG,bl,.02,.02,.06,.13,0,.15+i*.15);}// graduation ticks
 else if(wpn==='lockbolt'){sight(.42,-.1);stripes(0,-.27,.3,.5);rivets(.31,.15,-.4,.4);hose(.3,-.1,-.4,.24,-.2,.6);}
 else if(wpn==='shotgun'){const pump=wAdd(kb,boxG,bl,.36,.18,.5,0,-.3,.7);ud.keep=[pump];rail(.3,.0,.6);wAdd(kb,boxG,mt,.04,.08,.04,0,.32,.6);wAdd(kb,boxG,mt,.04,.08,.04,0,.32,-.35);
  const mb=sm?.8:1.1;for(const z of[mb+.55,mb+.62])wAdd(kb,boxG,bl,big?.75:.45,.26,.04,0,0,z*.0+(sm?1.25:1.7)+(z-mb-.55));// muzzle brake slots
  for(let i=0;i<(big?6:4);i++)wAdd(kb,cylG,wdM('shell',0xb02020,{}),.07,.18,.07,.33,-.12+i*.0,-.2+i*.13,Math.PI/2,0,0);
  ud.casing={c:0xb02020,dir:1};ud.anim=(w,dt,u)=>{const r=Math.max(0,1-w.fireCd/(w.W.interval*.5));pump.position.z=.7-.25*(1-r)*(w.fireCd>0?1:0);};}
 else if(wpn==='swarm'){const doors=[];const n=big?4:3,rows=sm?2:3;for(const sx of[-1,1]){const d=new THREE.Group();d.position.set(sx*(.15*n+.06),0,.58);kb.add(d);wAdd(d,boxG,wdM('door',0x3a4c60,{metal:.6,rough:.4}),.15*n,.3*rows+.1,.04,-sx*.075*n,.05,0);doors.push([d,sx]);}
  stripes(0,.05+.15*rows+.14,-.2,.3*n);hose(-.15*n,-.1,-.3,-.25,-.4,-.4);wAdd(kb,boxG,lm,.06,.06,.06,.15*n-.05,.15*rows,-.32);
  ud.anim=(w,dt,u)=>{const o=(w.reload?0:1)*(clock-(w.lastF||-9)<1.2||w.burst>0?1:0);for(const [d,sx]of doors){d.rotation.y+=(sx*o*1.4-d.rotation.y)*Math.min(1,dt*10);}};}
 else if(wpn==='pulse'){const orb=kb.children.find(c=>c.geometry===sphG);ud.keep=[orb];hose(-.3,-.2,-.4,-.25,-.1,.5);hose(.3,-.2,-.4,.25,-.1,.5);vents(.31,0,-.05,5,1);stripes(0,-.28,.2,.5);
  ud.anim=(w,dt,u)=>{if(orb){const ch=w.reload?.4:Math.max(0,1-w.fireCd/w.W.interval),pc=w.pc||0,mx=pc>=1;orb.scale.setScalar(.2*(.85+.15*ch+(mx?.05:.03)*Math.sin(clock*(6+24*pc))));const m=orb.material;if(m&&m.color){if(!orb.userData.own){orb.material=m.clone();orb.userData.own=1;}const M=orb.material;M.color.setRGB(.25+.75*pc,.75+.25*pc,1);if(M.emissive){M.emissive.setRGB(.15+.85*pc,.5+.5*pc,1);M.emissiveIntensity=.6+2.4*pc+(mx?1.2*(.5+.5*Math.sin(clock*30)):0);}}if(pc>.3&&!gfxLow()&&Math.random()<pc*dt*(mx?14:5)){const p=new THREE.Vector3();orb.getWorldPosition(p);sparks(p,mx?0xffffff:0x9ff8ff);}}};}
 else{// hornet missile pod: hinged armoured door, side rails, warning stripes
  const n=big?3:2,rows=sm?1:2,d=new THREE.Group();d.position.set(0,.1+.21*rows+.05,.65);kb.add(d);wAdd(d,boxG,wdM('hdoor',0x554433,{metal:.5,rough:.5}),.45*n,.04,.42*rows,0,0,-.21*rows*0);
  for(const sx of[-1,1])wAdd(kb,boxG,bl,.04,.42*rows,1.0,sx*(.225*n+.03),.1,.1);stripes(0,.1-.21*rows-.04,.66,.45*n,6);rivets(.225*n+.06,.1,-.3,.5);
  ud.anim=(w,dt,u)=>{const o=(w.reload?0:1)*(clock-(w.lastF||-9)<1.5?1:0);d.rotation.x+=(-o*1.9-d.rotation.x)*Math.min(1,dt*9);};}
 return ud;}
// per-frame weapon anims, casing ejection, muzzle smoke
function wAnim(u,w,dt){if(w.ammo<(w._la??w.ammo)){w.lastF=clock;const pv=u.guns[w.gi];if(pv&&w.cas&&!gfxLow()&&FX.length<CFG.fx.maxFx-20){pv.getWorldPosition(_cas);_cas.y+=.2;const yw=u.g.rotation.y+(u.top?u.top.rotation.y:0);
   _casV.set(Math.cos(yw)*w.s*5*(w.cas.dir)+(Math.random()-.5)*2,4+Math.random()*3,-Math.sin(yw)*w.s*5*w.cas.dir);fx(_cas.clone(),.35,w.cas.c,{box:1,grow:0,life:.7,v:_casV.clone(),g:-22});}
  if(!gfxLow()&&Math.random()<.35&&FX.length<CFG.fx.maxFx-30){const pv=u.guns[w.gi];if(pv){pv.getWorldPosition(_cas);_cas.y+=.3;fx(_cas.clone(),.9,0x888888,{life:.8,grow:2.5,op:.25,vy:1.5});}}}
 w._la=w.ammo;if(w.anim)w.anim(w,dt,u);}
// ---------- mech builder v11: per-frame structure (legs/arms/hardpoints/detail). team 'b'|'r', type key, weapon key ----------
const TMK={b:'p',r:'e'};
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const cableG=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0,0,0),V3(.12,-.3,-.12),V3(.05,-.65,-.1),V3(0,-.85,0)]),8,.045,4);
const ventGT=tex(64,32,(g,w,h)=>{g.fillStyle='#222';g.fillRect(0,0,w,h);g.fillStyle='#555';for(let y=3;y<h;y+=6)g.fillRect(3,y,w-6,2);});
const ventMat=new THREE.MeshStandardMaterial({map:ventGT,metalness:.7,roughness:.5});
const cableMat=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.6,metalness:.2});
const decalMats={};function decalMat(team,type){const k=team+type;if(decalMats[k])return decalMats[k];
 const t=tex(128,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.save();g.beginPath();g.rect(0,0,52,h);g.clip();for(let i=-4;i<10;i++){g.fillStyle=i%2?'#111':'#f0c020';g.beginPath();g.moveTo(i*14,0);g.lineTo(i*14+14,0);g.lineTo(i*14-18,h);g.lineTo(i*14-32,h);g.fill();}g.restore();
  g.fillStyle=team==='b'?'#e8f4ff':'#ffe0d8';g.font='bold 40px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText({guardian:'G-01',strider:'S-27',mender:'M-09',phantom:'P-X',locke:'L-16',skyhawk:'SH-7',aegis:'AG-4',wraith:'WR-0'}[type],90,34);});
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
 wraith:{legs:[-1,1].map((s,i)=>({x:s*.62,z:-.05,hx:s*.72,hz:.05,grp:i,l1:1.3,l2:1.38,rev:1,w:.6})),tw:[1.55,.95,2.2],hips:[1.3,.38,.75]},
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
  else if(type==='wraith'){add(ank,boxG,dk,.26,LEG.foot,1.25,0,-LEG.foot/2-.1,.3);for(const sx of[-1,1])add(ank,clawG,dk,.55,.8,.55,sx*.12,-.2,.95,Math.PI/2,0,0);add(ank,clawG,dk,.5,.6,.5,0,-.2,-.38,-Math.PI/2,0,0);}
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
 else if(type==='mender'){// v27 field medic: hunched forward cabin with glowing cross visor, nanite-tank backpack, drone dock, twin crane repair arms
  const HQ=_hq();const hb=grp(top,0,cy-.05,.25);hb.rotation.x=.28;
  add(hb,boxG,m,1.8,1.25,1.4,0,0,0);add(hb,boxG,dk,1.35,.45,.7,0,-.6,.45);add(hb,boxG,dk,1.25,.55,.3,0,.2,.78);add(hb,boxG,tm.stripe,1.84,.14,1.0,0,.5,-.1);
  add(hb,boxG,coreMat,.52,.14,.05,0,.22,.95);add(hb,boxG,coreMat,.14,.44,.05,0,.22,.95);for(const s of[-1,1])add(hb,boxG,tm.visor,.28,.1,.05,s*.47,.22,.94);
  add(top,boxG,dk,1.7,1.5,.55,0,cy+.35,-.75);add(top,boxG,m,1.9,.3,.8,0,cy-.45,-.7);
  for(let i=-1;i<=1;i++){const x=i*.55,z=-1.18;add(top,tankG,tankMat,1,1.15,1,x,cy+.4,z);add(top,capG,dk,1,.6,1,x,cy+.97,z);add(top,capG,dk,1,.6,1,x,cy-.17,z,Math.PI,0,0);
   if(HQ)for(const y of[.05,.75])add(top,tankG,dk,1.08,.05,1.08,x,cy+y,z);}
  add(top,boxG,coreMat,.42,.12,.04,0,cy+.45,-1.46);add(top,boxG,coreMat,.12,.42,.04,0,cy+.45,-1.46);
  add(top,hexG,dk,.62,.14,.62,0,tY+.25,-.75);add(top,ringG,coreMat,.9,.9,.9,0,tY+.34,-.75,Math.PI/2,0,0);coreM=add(top,coreG,coreMat,.7,.7,.7,0,tY+.48,-.75);
  vent=add(top,boxG,ventMat,1.0,.08,.4,0,cy-.29,-.7);
  for(const s of[-1,1]){const pv=grp(top,s*(tw[0]/2+.05),tY-.05,.1);add(pv,boxG,m,.6,.3,1.0,s*.1,.1,0,0,0,s*-.3);pads.push(pv);
   const sh=grp(top,s*.95,tY+.15,-.45);add(sh,hexG,dk,.32,.3,.32,0,0,0);add(sh,jointG,jm,.75,.75,.75,0,0,0);add(sh,boxG,m,.26,.3,1.35,0,.05,.65);add(sh,pistonG,rod,.8,1.0,.8,0,-.18,.6,Math.PI/2,0,0);
   const el=grp(sh,0,0,1.3);add(el,jointG,jm,.6,.6,.6,0,0,0);add(el,boxG,dk,.18,.2,.95,0,0,.47);add(el,boxG,tm.stripe,.2,.06,.4,0,.12,.55);
   const tool=grp(el,0,0,.95);add(tool,cylG,MS.metal,.25,.12,.25,0,0,0,Math.PI/2,0,0);for(let j=0;j<3;j++){const a=j*Math.PI*2/3;add(tool,clawG,MS.metal,.7,.7,.7,Math.sin(a)*.1,Math.cos(a)*.1,.22,Math.PI/2+Math.cos(a)*.3,0,-Math.sin(a)*.3);}
   const tl=add(tool,boxG,coreMat,.12,.12,.12,0,0,.38);arms.push({sh,el,tool,tl,s,kind:'tool'});}
  for(let i=0;i<2;i++){const dr=grp(g,0,4.5,0);add(dr,droneG,m,1,.6,1,0,0,0);add(dr,rotorG,MS.metal,1,1,1,0,.15,0,Math.PI/2,0,0);add(dr,coreG,coreMat,.35,.35,.35,0,-.15,0);add(dr,boxG,coreMat,.3,.05,.08,0,.21,0);add(dr,boxG,coreMat,.08,.05,.3,0,.21,0);drones.push({g:dr,ph:i*Math.PI,p:new THREE.Vector3()});}}
 else if(type==='locke'){// hovering sentinel: armored sphere hull on a tripod, giant keyhole sensor eye, orbiting lock-ring halo
  const hull=add(top,sphG,m,1.15,1.0,1.1,0,cy+.2,0);add(top,cylG,dk,1.3,.5,1.3,0,cy-.55,0);add(top,boxG,tm.stripe,2.42,.14,.5,0,cy+.2,-.2);
  for(const s of[-1,1]){add(top,boxG,m,.3,1.3,1.6,s*1.05,cy+.1,-.1,0,0,s*.18);add(top,boxG,dk,.12,.9,1.2,s*1.22,cy+.1,-.1,0,0,s*.18);}
  add(top,boxG,m,1.5,.35,1.2,0,cy+1.15,-.25,-.15,0,0);vent=add(top,boxG,ventMat,1.0,.08,.6,0,cy+1.34,-.35);
  const bz=M(0xd8b048,{metal:.95,rough:.2});eye=new THREE.MeshStandardMaterial({color:0x2a1040,emissive:0xb070ff,emissiveIntensity:1.4,roughness:.3});const LR=lockBezG();add(top,LR.bez,bz,1,1,1,0,cy+.25,1.02);add(top,LR.glow,eye,1,1,1,0,cy+.25,1.12);
  for(let j=0;j<8;j++){const a=j*Math.PI/4+Math.PI/8,c=Math.cos(a),sn=Math.sin(a);add(top,boxG,dk,.36,.1,.12,c*.66,cy+.25+sn*.66,1.1,0,0,a+Math.PI/2);if(LR.hi)add(top,rivG,rivM,1,1,1,c*.66,cy+.25+sn*.66,1.17,Math.PI/2,0,0);}
  for(const a of[Math.PI*.5,Math.PI*1.17,Math.PI*1.83]){const c=Math.cos(a),sn=Math.sin(a);add(top,boxG,dk,.16,.16,.5,c*.72,cy+.25+sn*.72,.78);add(top,boxG,m,.26,.12,.2,c*.8,cy+.25+sn*.8,1.0,0,0,a+Math.PI/2);}add(top,cylG,MS.dark,.62,.12,.62,0,cy+.25,1.0,Math.PI/2,0,0);
  
  iris=grp(top,0,cy+.25,1.08);add(iris,cylG,eye,.2,.06,.2,0,.12,0,Math.PI/2,0,0);add(iris,keyG,eye,1,1,1,0,-.08,0);
  if(hi){
   for(const s of[-1,1])add(top,cableG,cableMat,1,.9,1,s*.6,cy+.9,-.8);add(top,boxG,lm,.5,.06,.04,0,cy-.3,1.0);}
  halo=grp(top,0,cy+.2,-.05);add(halo,lockBezG().halo,bz,1,1,1,0,0,0,Math.PI/2,0,0);for(let j=0;j<6;j++){const a=j*Math.PI/3+.26;add(halo,boxG,dk,.2,.17,.2,Math.cos(a)*1.32,0,Math.sin(a)*1.32,0,-a,0);}for(let j=0;j<3;j++){const a=j*Math.PI*2/3;add(halo,boxG,eye,.18,.12,.18,Math.cos(a)*1.35,0,Math.sin(a)*1.35);add(halo,boxG,dk,.3,.2,.3,Math.cos(a+.5)*1.35,0,Math.sin(a+.5)*1.35);}
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
  const HQ=_hq(),HR=1.25,HH=tw[1],ap=HR*Math.cos(Math.PI/6);add(top,bevHex(HR,HH,HQ?2:1),m,1,1,1,0,cy,0);
  for(let k=0;k<6;k++){const f=Math.PI/6+k*Math.PI/3,sf=Math.sin(f),cf=Math.cos(f),pg=k%2?'A':'B',P=(geo,mt,sx,sy,sz,d,y,lx=0,rx=0)=>{const o=add(top,geo,mt,sx,sy,sz,sf*d+cf*lx,y,cf*d-sf*lx,rx,f,0);o.rotation.order='YXZ';return o;};
   const pl=P(boxG,m,HR*.78,HH*.62,.08,ap+.04,cy+.12);pl.userData.pg=pg;pl.userData.noArm=1;
   const em=P(hexG,fm,.16,.05,.16,ap+.1,cy+.12,0,Math.PI/2);em.userData.pg=pg;
   if(HQ)for(const i of[-1,1])for(const j of[-1,1]){const bt=P(rivG,rivM,1,1,1,ap+.09,cy+.12+j*HH*.25,i*HR*.32,Math.PI/2);bt.userData.pg=pg;}
   const c=f+Math.PI/6;add(top,boxG,dk,.1,HH*.92,.1,Math.sin(c)*(HR-.03),cy,Math.cos(c)*(HR-.03),0,c,0);}add(top,hexG,dk,tw[0]/2*.75,.3,tw[2]/2*.75,0,tY+.15,0);add(top,hexG,tm.stripe,tw[0]/2+.03,.14,tw[2]/2+.03,0,cy-.3,0);
  add(top,boxG,tm.visor,1.0,.16,.05,0,cy+.35,tw[2]/2-.05);coreM=add(top,icoG,fm,.42,.42,.42,0,tY+.85,0);
  for(let j=0;j<3;j++){const a=j*Math.PI*2/3+Math.PI/2,px=Math.cos(a)*.85,pz=Math.sin(a)*.85;add(top,boxG,dk,.2,1.3,.2,px,tY+.75,pz,Math.sin(a)*.25,0,-Math.cos(a)*.25);add(top,sphG,fm,.13,.13,.13,px*.75,tY+1.4,pz*.75);}
  fring=grp(top,0,tY+.85,0);add(fring,torusG,fm,3.4,3.4,.6,0,0,0,Math.PI/2,0,0);
  vent=add(top,boxG,ventMat,.9,.08,.6,0,tY+.01,-.8);for(const s of[-1,1]){const pv=grp(top,s*(tw[0]/2),tY-.1,0);add(pv,boxG,m,.6,.3,1.3,s*.1,.1,0,0,0,s*-.3);pads.push(pv);}
  const dc=team==='b'?0x50c8ff:0xff6a8a;domeM=new THREE.Group();domeM.position.y=1;const sm1=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:dc,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  const sm2=new THREE.Mesh(icoG,new THREE.MeshBasicMaterial({color:dc,transparent:true,opacity:.22,wireframe:true,depthWrite:false}));domeM.add(sm1,sm2);domeM.visible=false;g.add(domeM);}
 else if(type==='wraith'){// v28 stealth frame: faceted low wedge, hooded sensor cowl with violet slit, dorsal cloak-emitter vanes, blade shoulders
  const wg=wraithGlow();add(top,boxG,m,tw[0],tw[1]*.8,tw[2],0,cy-.08,0);add(top,boxG,dk,tw[0]*.82,tw[1]*.45,tw[2]*.92,0,cy-tw[1]*.5,0);
  for(const s of[-1,1]){const f=add(top,boxG,m,.5,tw[1]*.7,tw[2]*.9,s*(tw[0]/2+.08),cy-.05,-.05,0,0,s*.38);f.userData.noArm=1;}// faceted chines
  add(top,boxG,m,tw[0]*.6,.45,1.25,0,cy+.02,tw[2]/2+.38,.45,0,0);add(top,boxG,dk,tw[0]*.36,.2,.9,0,cy-.28,tw[2]/2+.55,.2,0,0);
  const cw=grp(top,0,tY+.12,.5);cw.rotation.x=.22;add(cw,boxG,dk,.9,.4,.95,0,0,0);add(cw,boxG,m,1.02,.12,1.1,0,.24,-.04);add(cw,boxG,wg,.66,.07,.05,0,-.02,.5);
  for(const s of[-1,1])add(cw,boxG,m,.1,.42,.95,s*.52,.02,-.02,0,0,s*.25);
  for(const s of[-1,1])for(let i=0;i<3;i++){const z=-.25-i*.42,h=.85-i*.17;add(top,boxG,dk,.07,h,.55,s*(.28+i*.07),tY+h*.35,z,-.55,0,s*.32);add(top,boxG,wg,.03,h*.75,.05,s*(.31+i*.07),tY+h*.4,z+.25,-.55,0,s*.32);}
  add(top,boxG,wg,.05,.05,tw[2]*.7,0,tY+.02,-.2);
  for(const s of[-1,1]){add(top,boxG,m,.1,.42,1.5,s*(tw[0]/2+.25),tY-.02,-.15,0,0,s*.5);
   add(top,thrG,MS.metal,.6,.6,.6,s*.42,.5,-1.15,Math.PI/2,0,0);const j=add(top,flashG,jetMat,.8,1.3,.8,s*.42,.5,-1.65,-Math.PI/2,0,0);j.visible=false;jets.push(j);
   const pv=grp(top,s*(tw[0]/2+.05),tY-.15,.15);add(pv,boxG,dk,.42,.2,.95,s*.05,.05,0,0,0,s*-.45);pads.push(pv);}}
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
 const guns=[],flash=[],spinners=[],kickers=[];const MZ={minigun:2.0,railgun:3.0,hornet:.9,shotgun:1.7,laser:2.2,emp:.0,nanite:1.75,lockbolt:1.9,swarm:.75,pulse:1.75,jammer:1.55};let coil=null;
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
  else if(wpn==='jammer'){// v28 jammer: scrambler dish on a boom, amber interference coils, hazard-striped housing
   cm=new THREE.MeshStandardMaterial({color:0x2a2008,emissive:0xffb820,emissiveIntensity:1.15,roughness:.35});add(kb,boxG,dk,.55,.5,.95,0,0,-.05);
   add(kb,boxG,MS.metal,.6,.1,.5,0,.3,-.15);add(kb,boxG,cm,.57,.06,.2,0,-.05,.38);
   add(kb,cylG,MS.metal,.12,.95,.12,0,0,.8,Math.PI/2,0,0);for(const zz of(big?[.55,.75,.95]:[.6,.85]))add(kb,torusG,cm,.85,.85,.85,0,0,zz);
   add(kb,dishG,MS.metal,1.05,1,1.05,0,0,1.3,-Math.PI/2,0,0);add(kb,sphG,cm,.12,.12,.12,0,0,1.42);
   for(const a of[0,1.57,3.14,4.71])add(kb,boxG,cm,.04,.04,.3,Math.cos(a)*.3,Math.sin(a)*.3,1.38);}
  else if(wpn==='pulse'){// pulse emitter: forked prongs around a floating energy orb, stacked capacitor rings
   cm=new THREE.MeshStandardMaterial({color:0x0a3040,emissive:0x50f0ff,emissiveIntensity:1.2,roughness:.3});add(kb,boxG,dk,.6,.55,.9,0,0,-.05);
   for(const zz of(big?[.45,.7,.95]:sm?[.55]:[.5,.8]))add(kb,torusG,MS.metal,1.2,1.2,1.2,0,0,zz);
   for(const a of[0,2.09,4.19])add(kb,boxG,MS.metal,.08,.08,.9,Math.cos(a)*.3,Math.sin(a)*.3,1.15,-Math.sin(a)*.2,Math.cos(a)*.2,0);
   add(kb,sphG,cm,.2,.2,.2,0,0,1.45);add(kb,cylG,cm,.08,.7,.08,0,0,.85,Math.PI/2,0,0);}
  else{const n=big?3:2,rows=sm?1:2;add(kb,boxG,M(0x665544),.45*n,.42*rows+.05,1.1,0,.1,.1);for(let r=0;r<rows;r++)for(let c=0;c<n;c++){const tb=add(kb,tubeG,MS.dark,1,1,1,(c-(n-1)/2)*.4,.1+(r-(rows-1)/2)*.4,.68);tb.rotation.x=Math.PI/2;}}
  const wd=wDet(kb,wpn,big,sm,hi,dk,lm);
  const fl=add(pv,flashG,MS.flash,sc,sc,sc,0,0,(MZ[wpn]+.4)*sc);fl.rotation.x=-Math.PI/2;fl.visible=false;flash.push(fl);pv.userData={wd,mz:MZ[wpn]*sc,my:wpn==='emp'?1.25*sc:0,spin:spn,coil:cm,arc,fluid,plg};top.add(pv);guns.push(pv);});
 const mz0=1;
 g.traverse(o=>{if(o.isMesh&&o.material!==shieldMat&&o.material!==jetMat&&o.material!==MS.flash&&o.material!==cableMat&&!(o.material.transparent))o.castShadow=hi||o.geometry===boxG;});
 S.add(g);return{g,lower,legs,top,guns,flash,spinners,kickers,shield,jets,pads,arms,drones,coreM,rotors,domeM,fring,antP,vent,coil,eye,halo,iris,mz:mz0,mats:[m,dk],flashT:0,smokeT:0,legYaw:0,tYaw:0,tYawV:0,gp:0};}
const sphG=new THREE.SphereGeometry(1,20,14),boltG=new THREE.OctahedronGeometry(.16,0).scale(1,1,2.6);
const keyG=(()=>{const sh=new THREE.Shape();sh.moveTo(-.07,0);sh.lineTo(.07,0);sh.lineTo(.13,-.32);sh.lineTo(-.13,-.32);sh.closePath();return new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:false});})();
const torusG=new THREE.TorusGeometry(.3,.1,6,14),arcMat=new THREE.MeshBasicMaterial({color:0xb0f0ff});let BLINK=new THREE.MeshBasicMaterial({color:0xff2020});
const LIGHT_B=new THREE.MeshBasicMaterial({color:0x60d0ff}),LIGHT_R=new THREE.MeshBasicMaterial({color:0xff5040});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function turn(cur,tgt,rate,dt){const d=wrap(tgt-cur);return cur+Math.sign(d)*Math.min(Math.abs(d),rate*dt);}
// ---------- v24: solid collisions — per-frame mech radii, mech-vs-mech push-out, muzzle/barrel vs walls, spawn clearance ----------
const COLR={guardian:1.9,locke:1.8,aegis:1.8,mender:1.6,strider:1.5,phantom:1.45,skyhawk:1.7};
function colR(u){return (u&&u.T&&(u.T.col||COLR[u.type]))||1.6;}
function inObst(p,pad=0){for(const o of obst)if(p.y<o.h-.05&&p.y>-1&&Math.abs(p.x-o.x)<o.hx+pad&&Math.abs(p.z-o.z)<o.hz+pad)return o;return null;}
// pairwise separation of overlapping mechs (cylinders, vertical overlap check so a flyer can pass overhead)
function sepUnits(){const L=U.filter(u=>u.alive&&!u.isDome);for(let it=0;it<2;it++)for(let i=0;i<L.length;i++){const a=L[i],pa=a.g.position;for(let j=i+1;j<L.length;j++){const b=L[j],pb=b.g.position;
  if(Math.abs(pa.y-pb.y)>4.2)continue;let dx=pb.x-pa.x,dz=pb.z-pa.z,d=Math.hypot(dx,dz);const R=colR(a)+colR(b);if(d>=R)continue;if(d<1e-3){dx=Math.random()-.5;dz=Math.random()-.5;d=Math.hypot(dx,dz);}
  const ov=R-d,ma=(a.T.mass||1)*(a===P?1.2:1),mb=(b.T.mass||1)*(b===P?1.2:1),ka=ov*mb/(ma+mb),kb=ov*ma/(ma+mb),nx=dx/d,nz=dz/d;
  const ax=pa.x-nx*ka,az=pa.z-nz*ka,bx=pb.x+nx*kb,bz=pb.z+nz*kb;const fa=!blocked(ax,az,colR(a),pa.y),fb=!blocked(bx,bz,colR(b),pb.y);
  if(fa&&fb){pa.x=ax;pa.z=az;pb.x=bx;pb.z=bz;}else if(fa){const x2=pa.x-nx*ov,z2=pa.z-nz*ov;if(!blocked(x2,z2,colR(a),pa.y)){pa.x=x2;pa.z=z2;}}else if(fb){const x2=pb.x+nx*ov,z2=pb.z+nz*ov;if(!blocked(x2,z2,colR(b),pb.y)){pb.x=x2;pb.z=z2;}}
  // kill closing velocity along the normal
  const rv=(b.vel.x-a.vel.x)*nx+(b.vel.z-a.vel.z)*nz;if(rv<0){a.vel.x+=nx*rv*.5;a.vel.z+=nz*rv*.5;b.vel.x-=nx*rv*.5;b.vel.z-=nz*rv*.5;}
  if(a.dashT>0)a.dashT=Math.min(a.dashT,.05);if(b.dashT>0)b.dashT=Math.min(b.dashT,.05);}}}
// clear spawn: move anyone inside geometry or another mech to free ground
function clearSpawns(){for(const u of U)if(u.alive){unstick(u);}for(let k=0;k<6;k++)sepUnits();for(const u of U)if(u.alive)unstick(u);}
// barrels: raise guns that would poke into a wall; muzzle point never ends up past cover
const _gp=new THREE.Vector3(),_gt=new THREE.Vector3();
function gunBlocked(g,ex=.6){g.updateMatrixWorld(true);g.localToWorld(_gt.set(0,0,(g.userData.mz||1)+ex));return !!inObst(_gt,.05);}
function safeMuzzle(u,i,p){const g=u.guns[i];g.getWorldPosition(_gp);if(!inObst(p,.02)&&!segHitsObst(_gp,p))return p;
 // pull back toward the pivot, then to the hull centre
 if(!inObst(_gp,.02))return p.copy(_gp);return p.set(u.g.position.x,u.g.position.y+2.5,u.g.position.z);}
const _sd=new THREE.Vector3(),_smn=new THREE.Vector3(),_smx=new THREE.Vector3();
function segHitsObst(a,b){_sd.subVectors(b,a);const L=_sd.length();if(L<1e-4)return false;_sd.divideScalar(L);for(const o of obst){if(o.h<Math.min(a.y,b.y))continue;_smn.set(o.x-o.hx,-1,o.z-o.hz);_smx.set(o.x+o.hx,o.h,o.z+o.hz);if(rayBox(a,_sd,_smn,_smx,L)>=0)return true;}return false;}
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
   if(sw.sw>=1){sw.sw=-1;sw.gy=footGround(u,sw.foot)-p.y;sw.foot.y=p.y+sw.gy;u.dip=1;footstep(u,sw.foot);footMark(u,sw.foot);}}
  for(const L of u.legs)if(L.sw<0)L.foot.y=p.y+(L.gy||0);}
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
 for(const w of u.ws){wAnim(u,w,dt);if(w.spinner)w.spinner.rotation.z+=dt*35*w.spin;if(w.coil){const ch=w.reload?0:Math.max(0,1-w.fireCd/w.W.interval);w.coil.emissiveIntensity=0.15+3*ch*ch;}
  if(w.arc){const c=w.chg?Math.min(1,(clock-w.chg)/w.W.charge):0;w.arc.visible=Math.random()<.3+c*.7&&u.alive;w.arc.rotation.y=Math.random()*6.3;w.arc.scale.set(1+c,1+c*.6,1+c);if(w.coil)w.coil.emissiveIntensity=.3+c*3+(w.arc.visible?.4:0);}
  if(w.fluid){const f=Math.max(.04,w.reload?1-w.reload/w.W.reload:w.ammo/w.W.mag);w.fluid.scale.y=f;w.fluid.position.z=1.15-.65*f;w.plg.position.z=1.15-1.3*f-.02;}
  if(w.bolt){const r=w.reload?Math.max(0,1-w.reload/w.W.reload):Math.min(1,Math.max(0,1-w.fireCd/(w.W.interval*.6)));w.bolt.visible=r>.12&&u.alive;w.bolt.position.z=.7+.7*r;w.bolt.rotation.z+=dt*5;}}
 if(u.empT>0&&u.alive&&Math.random()<(gfxLow()?.15:.45)){const tp=u.g.position;const a=new THREE.Vector3(tp.x+Rn(-1.5,1.5),tp.y+Rn(1.5,4),tp.z+Rn(-1.5,1.5));bolt(a,a.clone().add(new THREE.Vector3(Rn(-1,1),Rn(-1,1),Rn(-1,1))),0x80e0ff);if(Math.random()<.4)sparks(a,0x80e0ff);}
 if(u.alive&&u.hp<u.max*.35&&Math.random()<dt*(gfxLow()?.5:2)){u.top.getWorldPosition(_w);sparks(_w.setY(_w.y+Rn(0,1)));}
 if(u.ventT>0){u.ventT-=dt;if(u.vent&&Math.random()<.5){u.vent.getWorldPosition(_w);fx(_w,.5,0xdde4ea,{vy:3.5,grow:2.5,life:.8,op:.45});}}
 if(u.flashT>0){u.flashT-=dt;if(u.flashT<=0)u.flash.forEach(f=>f.visible=false);}
 for(const j of u.jets){j.visible=!u.T.fly&&((u.air&&u.vy>-4)||u.dashT>0);j.scale.y=(u.dashT>0?2.2:1.2)+Math.random()*(u.dashT>0?1.4:.8);j.scale.x=j.scale.z=u.dashT>0?1.5:1;}
 if(u.air&&u.vy>-4&&u.jets.length&&Math.random()<.6){u.jets[0].getWorldPosition(_w);fx(_w,.5,0xffaa55,{vy:-6,grow:2,life:.35,op:.7});}
 // shield unfold/retract
 if(u.shield){const t=u.shieldOn?1:0,r=1/u.T.shield.unfold;u.shA+=Math.sign(t-u.shA)*Math.min(Math.abs(t-u.shA),r*dt);u.shUp=u.shieldOn&&u.shA>=1;u.shG=(u.shG||0)+((u.shUp?1:0)-(u.shG||0))*Math.min(1,dt*10);u.shield.visible=u.shG>0.03;u.shield.scale.set(Math.max(.05,u.shG),0.25+0.75*u.shG,Math.max(.05,u.shG));}
 dmgTick(u,dt);
 if(u.plate)updPlate(u);}
function footstep(u,f){if(!gfxLow()||Math.random()<.3)pDust({x:f.x,y:f.y+.25,z:f.z},.7*(u.T.mass||1),gfxHi()?2:1,1.2);
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
 u.ws=slots.map((k,i)=>{const W=me?upWpn(k):CFG.weapons[k],gd=u.guns[i].userData;return {k,W,gi:i,s:CFG.slots[type][i].s,heat:0,beamT:0,ammo:W.mag,reload:0,fireCd:0,spin:0,burst:0,cd:Math.random()*1.5,spinner:gd.spin,anim:gd.wd&&gd.wd.anim,cas:gd.wd&&gd.wd.casing,coil:gd.coil,arc:gd.arc,fluid:gd.fluid,plg:gd.plg,bolt:gd.bolt,chg:0};});
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
function clearWorld(){for(const u of U)S.remove(u.g);if(P&&!U.includes(P))S.remove(P.g);B.forEach(b=>S.remove(b.m));FX.forEach(f=>{S.remove(f.m);if(!f.solid&&!fxGive(f))f.m.material.dispose();});for(const u of U)disposeMerged(u.g);B=[];FX=[];U=[];P=null;SPEC=null;clearMarks();clearLock();}
const rk=o=>{const k=Object.keys(o);return k[Math.floor(Math.random()*k.length)];};
function spawn(u,x,z,yaw){mergeUnit(u);u.g.position.set(x,0,z);u.tYaw=u.legYaw=u.yaw=yaw;initFeet(u);U.push(u);}
let lastMap=null;function pickMap(){if(settings.map!=='random'&&MAPS[settings.map])return settings.map;const k=MAP_KEYS.filter(k=>k!==lastMap);return k[Math.floor(Math.random()*k.length)];}
function newGame(){try{if(typeof lockAim==='function')lockAim();}catch(e){}clearWorld();lastMap=(NET.role==="host"&&NET.map&&MAPS[NET.map])?NET.map:pickMap();netRand(1,0);loadMap(lastMap,NET.role==="host"?NET.seed:undefined);netRand(0);const SZ=A-12;clock=0;endT=-1;result=null;STATS.shots=STATS.hits=STATS.kills=0;chStart();const md=settings.mode;
 P=makeUnit('b',loadout.mech,slotsOf(loadout.mech),null);P.isPlayer=true;applyPaint(P,paintOf(loadout.mech));spawn(P,0,SZ,Math.PI);P.pitch=.05;camYaw=Math.PI;
 const team=md!=='duel';
 const TS=(NET.role&&NET.ts)||CFG.teamSize||6;
 if(team){for(let i=0;i<TS-1;i++){const a=(t=>makeUnit('b',t,aiSlots(t),CFG.allyProfile))(window.__forceAI||rk(CFG.mechs));a.role=md==='base'?(i%2?'def':'att'):'esc';const k=(i>>1)+1,sd=i%2?1:-1;spawn(a,sd*k*7,SZ+2+(k>1?3:0),Math.PI);makePlate(a,true);}}
 const n=team?TS:1;
 for(let i=0;i<n;i++){const e=(t=>makeUnit('r',t,aiSlots(t),md==='duel'?settings.diff:CFG.enemyProfile))(window.__forceAI||rk(CFG.mechs));e.role=md==='base'?(i%3===0?'def':'att'):'hunt';const k=(i+1)>>1,sd=i%2?1:-1;spawn(e,i?sd*k*7:0,-SZ-(i?2:0)-(k>1?3:0),0);makePlate(e,false);}
 if(NET.role==="host")netSetup();clearSpawns();netRand(1,1);buildEnvDetail();netRand(0);
 showBases(md==='base');mode='play';showUI();mapBanner();drawMiniBase();}
// ---------- projectiles & effects ----------
const PG={minigun:new THREE.BoxGeometry(.12,.12,1),railgun:new THREE.BoxGeometry(.18,.18,4),hornet:new THREE.BoxGeometry(.35,.35,1),shotgun:new THREE.BoxGeometry(.1,.1,.7)};
const PM={minigun:new THREE.MeshBasicMaterial({color:0xffee66}),railgun:new THREE.MeshBasicMaterial({color:0x80e8ff}),hornet:new THREE.MeshBasicMaterial({color:0xffaa22}),shotgun:new THREE.MeshBasicMaterial({color:0xffcc88})};
function shoot(from,dir,u,homing,W){W=W||u.W;if(W.seek&&!homing)homing=seekT(u,from,dir,W);const m=new THREE.Mesh(PG[W.fam],PM[W.fam]);m.scale.setScalar(SIZES[W.size].sc*(W.chMin?1+.12*Math.max(0,(SHOTCM-W.chMin)/(1-W.chMin)):1));m.position.copy(from);m.lookAt(from.clone().add(dir));S.add(m);
 B.push({m,v:dir.clone().multiplyScalar(W.speed),owner:u.team,src:u,W,dist:0,dmg:W.dmg*(u.prof?u.prof.dmgMul:1)*(CFG.firepower[u.type]||1)*(W.altBonus?shotMul(u,W):1)*SHOTCM,cm:SHOTCM,homing});}
PG.lockbolt=new THREE.OctahedronGeometry(.22,0).scale(1,1,3);PM.lockbolt=new THREE.MeshBasicMaterial({color:0xc090ff});
PG.nanite=new THREE.CylinderGeometry(.06,.02,.7,5).rotateX(Math.PI/2);PM.nanite=new THREE.MeshBasicMaterial({color:0x50ff80});
const fxG=new THREE.SphereGeometry(1,8,6),sparkG=new THREE.BoxGeometry(.12,.12,.12),debG=new THREE.BoxGeometry(.5,.35,.6);
function fx(p,s,c,o={}){if(FX.length>=CFG.fx.maxFx)return;const geo=o.geo||(o.box?sparkG:fxG);let m=o.mat?null:fxTake(geo);if(m){m.material.color.set(c);m.material.opacity=o.op||1;m.rotation.set(0,0,0);}else m=new THREE.Mesh(geo,o.mat||new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o.op||1,depthWrite:false}));m.position.copy(p);m.scale.setScalar(s*.2);S.add(m);
 FX.push({m,t:0,s,v:o.v||new THREE.Vector3(0,o.vy||0,0),grow:o.grow??1,life:o.life||.33,op:o.op||1,g:o.g??(o.box?-20:0),spin:o.spin,solid:!!o.mat,pool:!o.mat});}
function boom(p,s,c=0xff8800){fx(p,s,c);}
function sparks(p,c=0xffe070){for(let i=0;i<4;i++)fx(p,1,c,{box:1,grow:0,life:.35,v:new THREE.Vector3((Math.random()-.5)*12,Math.random()*8,(Math.random()-.5)*12)});}
const debM=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.6,roughness:.6});
const FL=new THREE.PointLight(0xffb060,0,30,1.6);S.add(FL);let flI=0;
function flashLight(p,i){if(i>=flI){FL.position.copy(p);flI=i;}}
function explode(p,k=1){explodeX(p,k);fx(p,3.5*k,0xffe0a0,{life:.18,op:.8});pExplode(p,k);
 for(let i=0;i<CFG.fx.debris;i++)fx(p,2.5*k,0,{geo:debG,mat:debM,grow:0,life:1.6,g:-24,spin:rnd3().multiplyScalar(12),v:new THREE.Vector3((Math.random()-.5)*16,6+Math.random()*10,(Math.random()-.5)*16)});
 sparks(p,0xffa040);sparks(p);shockwave(p,k);flashLight(p,6*k);if(P&&p.distanceTo(P.g.position)<40)shake(.5*k*(1-p.distanceTo(P.g.position)/40));sfx('boom',{p,k});}
function updFx(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt/f.life;f.v.y+=f.g*dt;const _py=f.m.position.y;f.m.position.addScaledVector(f.v,dt);if(f.g<0&&!f.keep){const o=inObst(f.m.position);if(o){const mp=f.m.position;if(_py>=o.h-.05){mp.y=o.h+.05;f.v.y=Math.abs(f.v.y)*.3;f.v.x*=.5;f.v.z*=.5;}else{mp.x-=f.v.x*dt;mp.z-=f.v.z*dt;if(Math.abs(mp.x-o.x)>=o.hx)f.v.x*=-.4;else f.v.z*=-.4;}}if(!f.spin&&f.m.position.y<.05){f.m.position.y=.05;f.v.set(f.v.x*.3,0,f.v.z*.3);}}
  if(f.spin){f.m.rotation.x+=f.spin.x*dt;f.m.rotation.y+=f.spin.y*dt;if(f.m.position.y<.2){f.m.position.y=.2;f.v.multiplyScalar(.4);f.v.y=Math.abs(f.v.y)*.3;f.spin.multiplyScalar(.5);}}
  if(f.keep){}else if(f.solid)f.m.scale.setScalar(f.s*.2*(f.t>.8?(1-f.t)*5:1));else if(f.grow)f.m.scale.setScalar(f.s*(.2+f.t*f.grow));else f.m.scale.setScalar(f.s*(1-f.t));
  if(!f.solid)f.m.material.opacity=f.op*(1-f.t);if(f.t>=1){S.remove(f.m);if(!f.solid&&!fxGive(f))f.m.material.dispose();FX.splice(i,1);}}
 FL.intensity=flI*40;flI=Math.max(0,flI-dt*30);}
function shake(a){shakeA=Math.min(1,shakeA+a);}
// tiny WebAudio thuds (unlocked on first touch/click)
function muzzle(u,i){u.flash[i].visible=true;u.flash[i].rotation.z=Math.random()*3;u.flashT=.05;const p=new THREE.Vector3();u.guns[i].updateMatrixWorld(true);return safeMuzzle(u,i,u.guns[i].localToWorld(p.set(0,u.guns[i].userData.my||0,u.guns[i].userData.mz||u.mz)));}
let SHOTCM=1;
function effR(w){const W=w.W;return W.rMax?W.rMin+(W.rMax-W.rMin)*Math.min(1,w.pc||0):W.range;}
function pulseMul(w){const m=w.W.chMin??1;return m+(1-m)*Math.min(1,w.pc||0);}
function chgPct(w){return Math.round(pulseMul(w)*100);}
function pulseTick(u,dt){for(const w of u.ws){if(!w.W.chT)continue;const rdy=!w.reload&&w.fireCd<=0&&w.ammo>0&&u.alive;if(!rdy){if(w.reload)w.pc=0;w.pcF=0;continue;}
 w.pc=Math.min(1,(w.pc||0)+dt/(w.W.chT||1.6));if(w.pc>=1&&!w.pcF){w.pcF=1;if(u===P){sfx('pulseFull',{u});const mp=muzzle(u,w.gi);fx(mp,w.W.emp?1:.9,w.W.emp?0x80e0ff:0xdff8ff,{grow:3,life:.35,op:.9});}}}}
function fireWeapon(u,w,aimPt,homing){if(NET.role==="host")netFire(u,w,aimPt,homing);return fireWeapon0(u,w,aimPt,homing);}
function fireWeapon0(u,w,aimPt,homing){if(w.W.beam)return fireBeam(u,w,aimPt);if(w.W.emp)return chargeEmp(u,w,aimPt);if(u===P)STATS.shots++;const W=w.W,pr=u.prof;w.fireCd=W.interval*(pr?pr.fireMul:1)/(W.spin?Math.max(.3,w.spin):1);w.ammo--;
 if(W.push)SHOTCM=pulseMul(w);const gi=w.gi,f=muzzle(u,gi);const d=aimPt.clone().sub(f).normalize();
 const s=(W.pellets?0:W.spread)+(pr?pr.spread:0);d.x+=(Math.random()-.5)*s;d.y+=(Math.random()-.5)*s*.6;d.z+=(Math.random()-.5)*s;d.normalize();
 u.kick[gi]=Math.min(1,u.kick[gi]+W.kick);u.jolt=Math.min(.12,u.jolt+W.jolt);sfx('shot',{u,fam:W.fam,size:W.size,gi});if(W.fam==='railgun')u.ventT=.7;
 if(u===P){flashLight(f,W.fam==='railgun'?4:1.5);shake(W.jolt*2);}
 for(let n=0;n<(W.pellets||1);n++){const dd=n?d.clone().add(new THREE.Vector3((Math.random()-.5)*W.spread,(Math.random()-.5)*W.spread*.5,(Math.random()-.5)*W.spread)).normalize():d;shoot(f,dd,u,homing,W);}SHOTCM=1;if(W.push)w.pc=0;if(w.ammo<=0)w.reload=W.reload;}
function frontal(u,pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,l=Math.hypot(dx,dz)||1;return (dx*Math.sin(u.tYaw)+dz*Math.cos(u.tYaw))/l>0.25;}
function dropShield(u,broken){if(!u.shieldOn)return;u.shieldOn=false;u.abCd=broken?u.T.shield.cd:Math.max(u.abCd,.4);}
function hurt(u,d,pos,src){if(NET.role==="client")return;if(u&&u.isDome)return domeHurt(u,d,pos,src);if(!u||!u.alive)return;if(u===P&&TF('god'))return;if(u.shieldOn&&u.shA>=1&&pos&&frontal(u,pos)){if(src===P)sfx('hitsh');else if(u!==P)sfx('shHit',{u});if(u===P)chEv('block',Math.min(d,Math.max(0,u.shieldHP)));u.shieldHP-=d;u.shHit=clock;if(Math.random()<.5||d>20)sparks(pos,0x80e0ff);if(u.shieldHP<=0){u.shieldHP=0;dropShield(u,true);if(u!==P)sfx('shBreak',{u});}return;}
 if(u.teth&&u.teth.t>0)d*=1+u.teth.amp;if(src===P&&u.team!==P.team)chDmg(Math.min(d,Math.max(0,u.hp)),HITF);u.hp-=d;u.lastHit=clock;if(u===P)sfx('hurt');else if(src===P)sfx('hit');if(src)u.lastAtt=src;const H=CFG.hitReact;
 if(pos){const p=u.g.position,dx=pos.x-p.x,dz=pos.z-p.z,c=Math.cos(u.tYaw),s=Math.sin(u.tYaw),lz=dx*s+dz*c,lx=dx*c-dz*s,l=Math.hypot(lx,lz)||1,k=Math.min(H.maxFlinch,d*H.flinch);
  u.fl.x+=lz/l*k;u.fl.z+=-lx/l*k;}// torso tips away from the impact
 if(d>=H.staggerDmg){u.stagT=H.staggerT;u.fl.x*=1.5;}
 if(u===P)shake(CFG.cam.shakeHit*Math.min(2,d/40));
 if(u.hp<=0)killUnit(u,src);}
function killUnit(u,src){if(!u.alive)return;sfx('destroy',{u,foe:src===P&&u!==P});if(u.teth)dropTether(u);u.alive=false;u.hp=0;u.dying=0;if(u.plate)u.plate.visible=false;u.shieldOn=false;u.flash.forEach(f=>f.visible=false);
 if(src&&src!==u){src.kills++;if(src===P){STATS.kills++;chEv('kills',1);if(HITF)chEv('kill_'+HITF,1);}}for(const x of U)if(x.lockTgt===u)x.lockTgt=null;
 if(u===P&&mode==='play'){const a=mates('b')[0];if(a)SPEC=a;}}
function ability(u){if(!u||!u.alive||mode!=='play')return;if(NET.role==='client'&&u===P)netSend({t:'ab'});if(u.empT>0||(u.rootT>0&&(u.T.jump||u.T.dash||u.T.dive))){if(u===P)sfx('denied');return;}const T=u.T;if(abilityAir(u))return;
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
   pDust({x:p.x,y:gy+.3,z:p.z},1.1,gfxLow()?2:6,4+iv*.2);if(u===P)shake(CFG.cam.shakeLand*Math.min(1,iv/15));sfx('land',{u,k:Math.min(1.3,iv/14)});}}}
// never end up inside a box or past the arena edge (after landing/dash): nudge to the nearest free spot
function unstick(u){const p=u.g.position;p.x=Math.max(-A+2,Math.min(A-2,p.x));p.z=Math.max(-A+2,Math.min(A-2,p.z));if(!blocked(p.x,p.z,1.2,p.y))return;
 for(let r=1;r<=12;r+=1)for(let a=0;a<16;a++){const x=p.x+Math.sin(a*Math.PI/8)*r,z=p.z+Math.cos(a*Math.PI/8)*r;if(Math.abs(x)<A-2&&Math.abs(z)<A-2&&!blocked(x,z,1.6,p.y)){p.x=x;p.z=z;p.y=Math.max(groundAt(x,z,p.y+.01),0);return;}}}
function speedOf(u){return (u.rootT>0?0:1)*(u.teth?1-u.teth.slow:1)*u.speed*(u.empT>0?u.empSlow||.6:1)*(u.shieldOn?u.T.shield.slow:1)*(u.cloakT>0&&u.T.cloak?u.T.cloak.speedMul:1)*(u.air&&u.T.jump?u.T.jump.airSpeed:1)*(u.air&&u.T.fly?u.T.fly.airSpeed:1)*(u.domeOn?u.T.dome.slow:1)*(u.stagT>0?CFG.move.staggerSlow:1)*(u.jumpWind>0?0.3:1);}
// inertia: velocity ramps toward the wanted velocity, heavier mechs ramp slower
function drive(u,wx,wz,dt){if(u.diving)return;if(u.dashT>0){u.dashT-=dt;const s=u.T.dash.speed;wx=u.dashD.x;wz=u.dashD.z;u.vel.set(wx*s,0,wz*s);const p=u.g.position,n=Math.max(1,Math.ceil(s*dt/.4)),sx=u.vel.x*dt/n,sz=u.vel.z*dt/n;let hitW=false;
  for(let i=0;i<n;i++){const nx=p.x+sx,nz=p.z+sz;if(!blocked(nx,p.z,colR(u),p.y))p.x=nx;else hitW=true;if(!blocked(p.x,nz,colR(u),p.y))p.z=nz;else hitW=true;}// swept sub-steps: can't tunnel through walls
  p.x=Math.max(-A+2,Math.min(A-2,p.x));p.z=Math.max(-A+2,Math.min(A-2,p.z));
  if(Math.random()<.8)fx(p.clone().setY(p.y+2.2+Math.random()),1.1,0xb090ff,{life:.45,grow:1.8,op:.55});if(Math.random()<.5)fx(p.clone().setY(p.y+.3),1.4,0x9a927e,{life:.5,grow:2,op:.4});
  if(hitW&&u.dashT>.05){u.dashT=Math.min(u.dashT,.05);}
  if(u.dashT<=0)u.vel.multiplyScalar(.35);return;}
 const K=CFG.move,m=u.T.mass||1,sp=speedOf(u),tx=wx*sp,tz=wz*sp,v=u.vel;const ox=v.x,oz=v.z;
 const dx=tx-v.x,dz=tz-v.z,dl=Math.hypot(dx,dz),rate=(Math.hypot(tx,tz)>Math.hypot(v.x,v.z)?K.accel:K.decel)/m*(u.air?(u.T.jump?u.T.jump.airCtl:u.T.fly?1:.4):1)*dt;
 if(dl>rate){v.x+=dx/dl*rate;v.z+=dz/dl*rate;}else{v.x=tx;v.z=tz;}
 const p=u.g.position,r=colR(u),nx=p.x+v.x*dt,nz=p.z+v.z*dt;if(!blocked(nx,p.z,r,p.y))p.x=nx;else v.x=0;if(!blocked(p.x,nz,r,p.y))p.z=nz;else v.z=0;
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
 u.scanT-=dt;if(u.tgt&&cloakHid(u.tgt,p)){u.tgt=null;u.goal=null;}if(u.scanT<=0||!u.tgt||!u.tgt.alive){u.scanT=.3;let best=null,bd=1e9;u.see=false;
  for(const f of foes(u.team)){if(cloakHid(f,p))continue;const d=f.g.position.distanceTo(p);if(d>400)continue;const vis=los(eye,eyeOf(f,_e));const sc=d*(vis?1:2.5)*(f===u.lastAtt?.7:1);if(sc<bd){bd=sc;best=f;u.see=vis;}}u.tgt=best;}
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
 for(const w of u.ws){const X=w.W,ok=want&&dist<(X.rMax?effR(w):X.range)*.95;if(X.spin)w.spin=ok&&!w.reload?Math.min(1,w.spin+dt/X.spin):Math.max(0,w.spin-dt);
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
function empShot(u,w,aimPt){HITF='emp';if(u!==P)window.__empN=(window.__empN||0)+1;const W=w.W,pr=u.prof;if(u===P)STATS.shots++;w.ammo--;if(w.ammo<=0)w.reload=W.reload;const cm=pulseMul(w),R=effR(w),full=(w.pc||0)>=1;w.pc=0;w.pcF=0;w.lastCm=cm;w.lastR=R;
 const f=muzzle(u,w.gi);const d=aimPt.clone().sub(f).normalize();const sw=sweep(f,d,R,u.team);const L=sw?sw.t:R;const e=f.clone().addScaledVector(d,L);
 zap(f,e,0x80e0ff,Math.max(4,L/4|0));if(!gfxLow())zap(f,e,0xffffff,Math.max(3,L/6|0));fx(e,2.4,0x80e0ff,{grow:2,life:.35,op:.8});sparks(e,0x80e0ff);sparks(e,0xffffff);flashLight(e,3);
 u.kick[w.gi]=Math.min(1,u.kick[w.gi]+W.kick);u.jolt=Math.min(.12,u.jolt+W.jolt);if(u===P)shake(.08);sfx('shot',{u,fam:W.fam,size:W.size,gi:w.gi});
 const dm=W.dmg*(pr?pr.dmgMul:1)*(CFG.firepower[u.type]||1)*cm;
 if(sw&&sw.u){hurt(sw.u,dm,e,u);empHit(sw.u,W,u);if(u===P){STATS.hits++;hitMarkT=.18;}if(full)chainArc(u,W,sw.u.isDome?sw.u.host:sw.u,dm);else if(window.__chainDbg)window.__chainDbg.notFull++;}}
const _ca=new THREE.Vector3(),_cb=new THREE.Vector3();
function chainArc(u,W,t0,dm){if(!t0||!t0.g)return 0;const hit=new Set([t0]);let cur=t0,m=1,n=0;const D=window.__chainDbg;if(D)D.full++;
 for(let j=0;j<(W.jumps||0);j++){_ca.copy(cur.g.position);_ca.y+=3;let best=null,bd=W.chainR||0;
  for(const t of foes(u.team)){if(!t.alive||t.isDome||hit.has(t)||cloakHid(t,null))continue;const d=t.g.position.distanceTo(cur.g.position);if(d>bd)continue;_cb.copy(t.g.position);_cb.y+=3;
   if(!los(_ca,_cb)){_ca.y+=3;_cb.y+=3;const ok=los(_ca,_cb);_ca.y-=3;_cb.y-=3;if(!ok){if(D)D.los++;continue;}}bd=d;best=t;}
  if(!best)break;m*=W.chainFall||.5;_cb.copy(best.g.position);_cb.y+=3;chainBolt(_ca,_cb);
  if(!domeSafe(best,_ca,u.team)){hurt(best,dm*m,_cb.clone(),u);empHit(best,Object.assign({},W,{stun:W.stun*Math.max(.5,m),dmg:W.dmg*m}),u);}
  hit.add(best);cur=best;n++;}
 if(D)D.jumps+=n;window.__chainN=(window.__chainN||0)+n;return n;}
// v33: bright, thick, long-lived chain bolts (bypass the shared tracer cap) + crackle sound + flash
const CHB=[];const chM1=new THREE.MeshBasicMaterial({color:0x7fe8ff,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}),chM2=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
const chG=new THREE.BoxGeometry(1,1,1);
function chainBolt(a,b){const lo=gfxLow(),L=a.distanceTo(b),n=Math.max(4,L/1.6|0);for(let s=0;s<(lo?1:2);s++){let p=a.clone();const d=b.clone().sub(a);for(let i=1;i<=n;i++){const q=i===n?b.clone():a.clone().addScaledVector(d,i/n);if(i<n){q.x+=Rn(-.9,.9);q.y+=Rn(-.9,.9);q.z+=Rn(-.9,.9);}
  for(const [mat,w] of [[chM1,.32],[chM2,.12]]){const sg=new THREE.Mesh(chG,mat);sg.position.copy(p).add(q).multiplyScalar(.5);sg.lookAt(q);sg.scale.set(w,w,p.distanceTo(q)+.05);S.add(sg);CHB.push({s:sg,t:.45});}p=q;}}
 fx(b.clone(),2.6,0x9ff4ff,{grow:2.5,life:.4,op:.9});fx(a.clone(),1.6,0xffffff,{grow:2,life:.25,op:.8});sparks(b.clone(),0xffffff);sparks(b.clone(),0x80e0ff);flashLight(b,5);sfx('chain',{p:b.clone()});}
function updChain(dt){for(let i=CHB.length-1;i>=0;i--){const g=CHB[i];g.t-=dt;g.s.visible=g.t>.12||Math.random()<.6;if(g.t<=0){S.remove(g.s);CHB.splice(i,1);}}}
function naniteHit(t,W,src,dmg){if(t.isDome)return;const fp=src&&src.prof?src.prof.dmgMul:1;const dps=W.dot*fp*(CFG.firepower[src.type]||1)/W.dotT;if(!t.dot||t.dot.dps<=dps)t.dot={dps,t:W.dotT,src,leech:W.leech};else t.dot.t=W.dotT;if(src&&src.alive){const h0=src.hp;src.hp=Math.min(src.max,src.hp+dmg*W.leech);if(src===P)chEv('heal',src.hp-h0);}}
// ---------- v25: detail pass with a perf budget — static-mesh merging, quality levels + Auto, pooled particles, damage states, shockwaves, clouds, ground decals, steam vents ----------
// ---- merge static leaf meshes per (parent, material) so detail costs geometry, not draw calls ----
function _refWalk(o,keep,d,seen){if(!o||typeof o!=='object'||d>6||seen.has(o))return;seen.add(o);
 if(o.isObject3D){keep.add(o);if(o.userData)_refWalk(o.userData,keep,d+1,seen);return;}
 if(o.isMaterial||o.isBufferGeometry||o.isTexture||o.isVector3||o.isColor||o.isQuaternion||o.isEuler||o instanceof HTMLElement||o instanceof CanvasRenderingContext2D)return;
 if(o.ws&&o.g&&d>0)return; // another unit
 for(const k in o){const v=o[k];if(v&&typeof v==='object')_refWalk(v,keep,d+1,seen);}}
const _mm=new THREE.Matrix4(),_nm=new THREE.Matrix3(),_mv=new THREE.Vector3();
function _mergeGeos(list){const parts=[];let nv=0,ni=0;for(const m of list){m.updateMatrix();const g=m.geometry,pos=g.attributes.position,n=pos.count;const idx=g.index?g.index.array:null;parts.push({m,g,n,idx});nv+=n;ni+=idx?idx.length:n;}
 const P=new Float32Array(nv*3),N=new Float32Array(nv*3),UV=new Float32Array(nv*2),I=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let vo=0,io=0;
 for(const {m,g,n,idx} of parts){_mm.copy(m.matrix);_nm.getNormalMatrix(_mm);const pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv;
  for(let i=0;i<n;i++){_mv.fromBufferAttribute(pa,i).applyMatrix4(_mm);P[(vo+i)*3]=_mv.x;P[(vo+i)*3+1]=_mv.y;P[(vo+i)*3+2]=_mv.z;
   if(na){_mv.fromBufferAttribute(na,i).applyMatrix3(_nm).normalize();N[(vo+i)*3]=_mv.x;N[(vo+i)*3+1]=_mv.y;N[(vo+i)*3+2]=_mv.z;}
   if(ua){UV[(vo+i)*2]=ua.getX(i);UV[(vo+i)*2+1]=ua.getY(i);}}
  if(_mm.determinant()<0){if(idx)for(let i=0;i<idx.length;i+=3){I[io+i]=idx[i]+vo;I[io+i+1]=idx[i+2]+vo;I[io+i+2]=idx[i+1]+vo;}else for(let i=0;i<n;i+=3){I[io+i]=vo+i;I[io+i+1]=vo+i+2;I[io+i+2]=vo+i+1;}}
  else if(idx)for(let i=0;i<idx.length;i++)I[io+i]=idx[i]+vo;else for(let i=0;i<n;i++)I[io+i]=vo+i;
  io+=idx?idx.length:n;vo+=n;}
 const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setAttribute('normal',new THREE.BufferAttribute(N,3));G.setAttribute('uv',new THREE.BufferAttribute(UV,2));G.setIndex(new THREE.BufferAttribute(I,1));G.computeBoundingSphere();G.computeBoundingBox();G.userData.merged=1;return G;}
function mergeUnit(u){if(u._merged||window.__noMerge)return;u._merged=1;const keep=new Set();_refWalk(u,keep,0,new Set());let before=0,after=0;
 armorUnit(u,keep);const buckets=new Map();u.g.traverse(o=>{if(!o.isMesh)return;before++;if(keep.has(o)||o.children.length||o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(o.material)||!o.visible||!o.parent||o.renderOrder||o.material.transparent)return;
  const g=o.geometry;if(!g.attributes.position||!g.attributes.normal||g.morphAttributes&&Object.keys(g.morphAttributes).length)return;
  const k=o.parent.uuid+'|'+o.material.uuid+'|'+(o.castShadow?1:0)+(o.receiveShadow?1:0)+'|'+(o.userData.pg||0);let b=buckets.get(k);if(!b)buckets.set(k,b=[]);b.push(o);});
 for(const b of buckets.values()){if(b.length<2)continue;const par=b[0].parent,G=_mergeGeos(b);const m=new THREE.Mesh(G,b[0].material);m.castShadow=b[0].castShadow;m.receiveShadow=b[0].receiveShadow;m.userData.pg=b[0].userData.pg;
  for(const o of b)par.remove(o);par.add(m);}
 u.g.traverse(o=>{if(o.isMesh)after++;});u.meshN=[before,after];}
function disposeMerged(root){root.traverse(o=>{if(o.isMesh&&o.geometry.userData.merged&&!o.geometry.userData.shared)o.geometry.dispose();});}
// ---- graphics quality: low / med / high, Auto steps between them by measured fps ----
CFG.gfx.med={pixelRatio:1,shadows:true,shadowMap:1024};
if(!settings.gfxSel)settings.gfxSel=(settings.gfx==='low'?'auto':'auto');
if(settings.gfxSel==='auto'&&!['low','med','high'].includes(settings.gfx))settings.gfx='med';
if(settings.gfxSel==='auto'&&settings.gfx==='high'&&/iPad|iPhone|Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)settings.gfx='med';
const gfxHi=()=>settings.gfx==='high';
function pickGfx(sel){settings.gfxSel=sel;if(sel==='auto'){autoQ.lock=0;setGfx(settings.gfx==='low'?'med':settings.gfx);}else setGfx(sel);}
const autoQ={lo:0,hi:0,lock:0};
function autoTick(dt){if(settings.gfxSel!=='auto'||mode!=='play'||window.__noAuto)return;autoQ.lock-=dt;const L=['low','med','high'],i=L.indexOf(settings.gfx);
 autoQ.lo=fps<CFG.gfx.autoDown?autoQ.lo+dt:0;autoQ.hi=fps>CFG.gfx.autoUp?autoQ.hi+dt:0;
 if(autoQ.lo>3&&i>0){setGfx(L[i-1]);autoQ.lo=0;autoQ.lock=30;toast('Auto graphics: '+L[i-1].toUpperCase());}
 else if(autoQ.hi>8&&i<2&&autoQ.lock<=0){setGfx(L[i+1]);autoQ.hi=0;autoQ.lock=12;}}
CFG.gfx.autoDown=42;CFG.gfx.autoUp=58;
// ---- pooled particles (no per-puff material allocation) ----
const FXPOOL=new Map();
function fxTake(geo){const p=FXPOOL.get(geo);return p&&p.length?p.pop():null;}
function fxGive(f){if(!f.pool)return false;let p=FXPOOL.get(f.m.geometry);if(!p)FXPOOL.set(f.m.geometry,p=[]);if(p.length<200){p.push(f.m);return true;}return false;}
// ---- explosion shockwave ring + ground dust ----
const swRingG=new THREE.RingGeometry(.8,1,40).rotateX(-Math.PI/2);
function shockwave(p,k=1){if(gfxLow()||FX.length>CFG.fx.maxFx-10)return;const q=p.clone();q.y=Math.max(.15,groundAt(p.x,p.z,p.y)+.15);
 fx(q,2*k,0xfff0d0,{geo:swRingG,grow:9,life:.45,op:.7,flat:1});}
// ---- damage states: char, ejected armor plates, fire ----
const plateG=new THREE.BoxGeometry(1,.14,.8);
function dmgTick(u,dt){if(!u.alive||!u.mats)return;const f=u.hp/u.max,b=Math.max(0,Math.min(10,Math.floor((1-f)*10)));
 if(b!==u.dmgB){if(!u.matBase)u.matBase=u.mats.map(m=>m.color.clone());const c=Math.max(0,(1-f)-.25)*.55;u.mats.forEach((m,i)=>m.color.copy(u.matBase[i]).multiplyScalar(1-c));
  if(u.dmgB!==undefined&&b>u.dmgB&&(b===4||b===7)&&!gfxLow()){u.top.getWorldPosition(_w);_w.y+=1.2;const sx=Math.random()<.5?-1:1;
   fx(_w.clone(),2.2,0,{geo:plateG,mat:u.mats[0],solid:1,grow:0,life:2.4,g:-24,spin:new THREE.Vector3(Rn(-8,8),Rn(-8,8),Rn(-8,8)),v:new THREE.Vector3(sx*Rn(4,8),Rn(6,10),Rn(-4,4))});sparks(_w);}
  plateTick(u,b);u.dmgB=b;}
 if(f<.6&&!gfxLow()&&Math.random()<dt*(f<.35?6:1.5)){u.top.getWorldPosition(_w);_w.x+=Rn(-.8,.8);_w.y+=Rn(.6,1.6);_w.z+=Rn(-.8,.8);pSmoke(_w,f<.35?1:.7,f<.35?.45:.3);}
 if(f<.2&&Math.random()<dt*(gfxLow()?4:40)){for(let _i=0;_i<(gfxLow()?1:2);_i++){u.top.getWorldPosition(_w);_w.x+=Rn(-.6,.6);_w.y+=Rn(1.2,1.9);_w.z+=Rn(-.6,.6);pFire(_w,1.3);}}
 if(u.dashT>0&&!u.air&&Math.random()<dt*(gfxLow()?6:25)){const gp=u.g.position;pDust({x:gp.x,y:groundAt(gp.x,gp.z,gp.y)+.3,z:gp.z},.8,1,2);}}
// ---- environment detail: clouds (1 instanced draw), ground decals (1 instanced draw), steam vents ----
const cloudT=tex(128,64,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<14;i++){const x=20+Math.random()*88,y=26+Math.random()*16,r=12+Math.random()*16,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.85)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}});
const cloudM=new THREE.MeshBasicMaterial({map:cloudT,transparent:true,depthWrite:false,fog:false,opacity:.8});
let clouds=null;function buildClouds(){if(clouds){skyDome.remove(clouds);clouds=null;}if(gfxLow())return;const n=gfxHi()?18:10;clouds=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),cloudM,n);const o=new THREE.Object3D();
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,el=.12+Math.random()*.3,R_=180;o.position.set(Math.cos(a)*Math.cos(el)*R_,Math.sin(el)*R_,Math.sin(a)*Math.cos(el)*R_);o.lookAt(0,0,0);o.scale.set(60+Math.random()*50,22+Math.random()*12,1);o.updateMatrix();clouds.setMatrixAt(i,o.matrix);}
 clouds.renderOrder=-1;clouds.frustumCulled=false;const fc=(MAP&&MAP.fog&&MAP.fog[0])||0xffffff;cloudM.color.set(fc).lerp(new THREE.Color(0xffffff),.6);skyDome.add(clouds);}
const decalT=tex(256,64,(g,w,h)=>{g.clearRect(0,0,w,h);
 for(let k=0;k<4;k++){const cx=k*64+32;if(k<2){const gr=g.createRadialGradient(cx,32,2,cx,32,30);gr.addColorStop(0,k?'rgba(20,18,15,.55)':'rgba(30,30,35,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(k*64,0,64,64);}
  else{g.strokeStyle='rgba(15,15,15,.6)';g.lineWidth=1.5;for(let j=0;j<5;j++){g.beginPath();let x=cx,y=32;g.moveTo(x,y);for(let s=0;s<5;s++){x+=Rn(-9,9);y+=Rn(-9,9);g.lineTo(Math.max(k*64+2,Math.min(k*64+62,x)),Math.max(2,Math.min(62,y)));}g.stroke();}}}});
decalT.colorSpace=THREE.SRGBColorSpace;
const decalM=new THREE.MeshStandardMaterial({map:decalT,transparent:true,depthWrite:false,roughness:.9,polygonOffset:true,polygonOffsetFactor:-1});
let gDec=null,vents=[];
function buildEnvDetail(){if(gDec){S.remove(gDec);gDec.geometry.dispose();gDec=null;}for(const v of vents)S.remove(v.m);vents=[];buildClouds();if(gfxLow())return;
 const n=gfxHi()?90:50,geo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);const uvs=geo.attributes.uv;for(let i=0;i<uvs.count;i++)uvs.setX(i,uvs.getX(i)*.25);
 const off=new Float32Array(n);gDec=new THREE.InstancedMesh(geo,decalM,n);const o=new THREE.Object3D();let k=0;
 for(let t=0;t<n*4&&k<n;t++){const x=Rn(-A+4,A-4),z=Rn(-A+4,A-4);if(blocked(x,z,1.5,0))continue;o.position.set(x,.03,z);o.rotation.set(0,Math.random()*6.28,0);const s=Rn(2,6);o.scale.set(s,1,s*Rn(.6,1));o.updateMatrix();gDec.setMatrixAt(k,o.matrix);off[k]=(Math.random()*4|0)*.25;k++;}
 gDec.count=k;geo.setAttribute('uOff',new THREE.InstancedBufferAttribute(off,1));gDec.receiveShadow=true;
 decalM.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float uOff;').replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x+=uOff;\n#endif');};decalM.customProgramCacheKey=()=>'dec25';
 S.add(gDec);
 for(let t=0;t<60&&vents.length<(gfxHi()?4:2);t++){const x=Rn(-A+10,A-10),z=Rn(-A+10,A-10);if(blocked(x,z,2.5,0))continue;const m=new THREE.Mesh(boxG,ventMat);m.scale.set(1.6,.08,1.6);m.position.set(x,.04,z);m.receiveShadow=true;S.add(m);vents.push({m,t:Math.random()*3});}}
function envTick(dt){shadowLOD(dt);if(clouds)clouds.rotation.y+=dt*.004;if(gfxLow()||!P)return;for(const v of vents){v.t-=dt;if(v.t<=0){v.t=.18;const pp=v.m.position;if(Math.abs(pp.x-P.g.position.x)+Math.abs(pp.z-P.g.position.z)<90)fx(_w.set(pp.x+Rn(-.4,.4),.3,pp.z+Rn(-.4,.4)).clone(),.9,0xe8eef0,{vy:2.8,grow:3.2,life:1.8,op:.22});}}}
// ---- per-foot ground height so feet plant on curbs/crates/roof edges instead of floating or sinking ----
function footGround(u,f){const p=u.g.position;const g=groundAt(f.x,f.z,p.y+.9);return Math.max(p.y-1.1,Math.min(p.y+.9,g>=p.y-1.1?g:p.y));}
// ---- shadow LOD: only mechs near the camera cast shadows (shadow pass draw calls scale with casters) ----
let shT=0;function shadowLOD(dt){if((shT-=dt)>0)return;shT=.4;const lim=gfxHi()?55:35,cp=C.position;
 for(const u of U){const on=u.g.position.distanceTo(cp)<lim||u===P;if(u.shOn===on)continue;u.shOn=on;if(!u.shM){u.shM=[];u.g.traverse(o=>{if(o.isMesh&&o.castShadow)u.shM.push(o);});}for(const m of u.shM)m.castShadow=on;}}
// ---------- v30: soft-sprite particle system (2 draw calls: additive fire/embers, alpha smoke/dust), pooled, quality-scaled ----------
const PFX_T=tex(64,64,(g,w,h)=>{g.clearRect(0,0,w,h);const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.65)');gr.addColorStop(.7,'rgba(255,255,255,.18)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const PFX_VS='attribute float sz;attribute vec4 col;varying vec4 vC;uniform float sc;void main(){vC=col;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(512.,sz*sc/max(.1,-mv.z));gl_Position=projectionMatrix*mv;}';
const PFX_FS='uniform sampler2D map;varying vec4 vC;void main(){vec4 t=texture2D(map,gl_PointCoord);gl_FragColor=vec4(vC.rgb*t.rgb,vC.a*t.a);if(gl_FragColor.a<.004)discard;}';
function pfxSys(n,add){const geo=new THREE.BufferGeometry(),pos=new Float32Array(n*3),sz=new Float32Array(n),col=new Float32Array(n*4);
 geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('sz',new THREE.BufferAttribute(sz,1).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('col',new THREE.BufferAttribute(col,4).setUsage(THREE.DynamicDrawUsage));
 const mat=new THREE.ShaderMaterial({uniforms:{map:{value:PFX_T},sc:{value:600}},vertexShader:PFX_VS,fragmentShader:PFX_FS,transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
 const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;pts.renderOrder=add?3:2;S.add(pts);geo.setDrawRange(0,0);return{n,pos,sz,col,geo,mat,pts,P:[]};}
const PX={a:pfxSys(700,true),b:pfxSys(700,false),f:pfxSys(500,false)};PX.f.pts.renderOrder=4;
function pCap(){return settings.gfx==='low'?120:gfxHi()?700:350;}
const FIRE_R=[[0,1,1,.85],[.15,1,.85,.35],[.45,1,.45,.08],[.75,.6,.12,.03],[1,.15,.05,.02]];
function ramp(R,t,o){for(let i=1;i<R.length;i++)if(t<=R[i][0]){const a=R[i-1],b=R[i],f=(t-a[0])/(b[0]-a[0]);o[0]=a[1]+(b[1]-a[1])*f;o[1]=a[2]+(b[2]-a[2])*f;o[2]=a[3]+(b[3]-a[3])*f;return o;}o[0]=R[R.length-1][1];o[1]=R[R.length-1][2];o[2]=R[R.length-1][3];return o;}
let groundCol=[.62,.56,.45];
function pfxMap(){try{const m=MAPS[mapKey];const c=new THREE.Color(m.hemi[1]).lerp(new THREE.Color(0xc8b8a0),.55);groundCol=[c.r,c.g,c.b];if(mapKey==='arctic')groundCol=[.92,.95,1];}catch(e){}}
// kinds: fire, ember (additive) / smoke, dust (alpha)
function pEmit(k,p,o={}){const sys=k==='ember'?PX.a:k==='fire'?PX.f:PX.b;if(sys.P.length>=Math.min(sys.n,pCap()))return;
 const r=(a)=>(Math.random()*2-1)*a,q={k,x:p.x+r(o.j||0),y:p.y+r((o.j||0)*.5),z:p.z+r(o.j||0),vx:(o.vx||0)+r(o.sp||0),vy:(o.vy||0)+r((o.sp||0)*.3),vz:(o.vz||0)+r(o.sp||0),t:-(o.dl||0)/(o.life||1),
  life:(o.life||1)*(.8+Math.random()*.4),s0:o.s0||1,s1:o.s1||1,a:o.a??1,c:o.c,fl:Math.random()*6.28,g:o.g||0,drag:o.drag||0,smk:o.smk||0};sys.P.push(q);}
const _rc=[0,0,0];
let pfxMK=null;
function pfxUpd(dt){if(pfxMK!==mapKey){pfxMK=mapKey;pfxMap();}for(const sys of[PX.a,PX.b,PX.f]){const L=sys.P;let w=0;
 for(let i=0;i<L.length;i++){const q=L[i];q.t+=dt/q.life;if(q.t>=1){if(q.smk&&Math.random()<q.smk)pEmit('smoke',q,{vy:1.6,sp:.6,life:2.2,s0:1*q.s0,s1:3.4*q.s0,a:.28});continue;}
  const d=Math.max(0,1-q.drag*dt);q.vx*=d;q.vz*=d;q.vy=q.vy*d+q.g*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;
  if(q.k==='dust'){const gy=groundAt(q.x,q.z,q.y);if(q.y<gy+.25){q.y=gy+.25;q.vy=Math.abs(q.vy)*.2;}}else if(q.k==='ember'&&q.y<.05){q.y=.05;q.vy*=-.3;}
  let s=q.s0+(q.s1-q.s0)*Math.sqrt(Math.max(0,q.t)),a,c;
  if(q.k==='fire'){c=ramp(FIRE_R,q.t,_rc);s*=1+Math.sin(q.fl+q.t*40)*.18;a=q.a*(q.t<.08?q.t*12.5:1-q.t*q.t);if(q.t<.5&&PX.a.P.length<pCap()&&Math.random()<.25)pEmit('ember',q,{life:.12,s0:q.s0*1.3,s1:q.s0,a:.35});}
  else if(q.k==='ember'){c=ramp(FIRE_R,.15+q.t*.6,_rc);a=q.a*(1-q.t)*(Math.sin(q.fl+q.t*60)>-.3?1:.3);}
  else if(q.k==='smoke'){const v=.16+q.t*.14;c=q.c||(_rc[0]=v,_rc[1]=v,_rc[2]=v*1.05,_rc);a=q.a*(q.t<.15?q.t/.15:1)*(1-q.t)*(1-q.t)*1.3;}
  else{c=q.c||groundCol;a=q.a*(q.t<.1?q.t*10:1)*(1-q.t)*(1-q.t);}
  sys.pos[w*3]=q.x;sys.pos[w*3+1]=q.y;sys.pos[w*3+2]=q.z;sys.sz[w]=s;sys.col[w*4]=c[0];sys.col[w*4+1]=c[1];sys.col[w*4+2]=c[2];sys.col[w*4+3]=q.t<0?0:Math.max(0,a);L[w++]=q;}
 L.length=w;sys.geo.setDrawRange(0,w);sys.geo.attributes.position.needsUpdate=true;sys.geo.attributes.sz.needsUpdate=true;sys.geo.attributes.col.needsUpdate=true;
 sys.mat.uniforms.sc.value=(R.domElement.height||600)*.9;}
 // heat glow (HIGH only): one flickering light at the hottest recent fire
 if(FIREL.intensity>0||fireHot>0){FIREL.intensity=gfxHi()&&fireHot>0?(6+Math.random()*4)*Math.min(1,fireHot):0;fireHot=Math.max(0,fireHot-dt*2);}}
const FIREL=new THREE.PointLight(0xff7a30,0,14,2);S.add(FIREL);let fireHot=0;
// presets
function pFire(p,k=1){pEmit('fire',p,{j:.35*k,vy:2.6*k,sp:.6,life:.7,s0:1.8*k,s1:.6*k,a:1,smk:gfxLow()?0:.35});if(Math.random()<.3)pEmit('ember',p,{j:.3,vy:4,sp:1.5,life:1.1,s0:.18,s1:.1,g:-1.5,drag:.6});if(gfxHi()){FIREL.position.set(p.x,p.y+.5,p.z);fireHot=1;}}
function pSmoke(p,k=1,a=.3){pEmit('smoke',p,{j:.3*k,vy:1.8,sp:.5,life:2.2,s0:1*k,s1:3.6*k,a});}
function pDust(p,k=1,n=4,out=3){for(let i=0;i<n;i++){const an=Math.random()*6.28,v=out*(.6+Math.random()*.6);pEmit('dust',p,{j:.4*k,vx:Math.cos(an)*v,vz:Math.sin(an)*v,vy:.6,sp:.3,life:2.2,s0:1.2*k,s1:4.2*k,a:.55,drag:1.4,g:-.2});}}
function pExplode(p,k=1){const lo=gfxLow(),hi=gfxHi();
 for(let i=0;i<(lo?4:hi?14:8);i++)pEmit('fire',p,{j:1*k,vy:3,sp:6*k,drag:2.5,life:.85,s0:3.6*k,s1:1.6*k,a:1,smk:lo?0:.5});
 for(let i=0;i<(lo?3:hi?10:6);i++)pEmit('smoke',p,{j:1.2*k,vy:2.4,sp:3*k,drag:1.2,life:2.8,s0:2*k,s1:6*k,a:.38,dl:.25+Math.random()*.25});
 for(let i=0;i<(lo?3:hi?16:8);i++)pEmit('ember',p,{vy:7,sp:9*k,g:-14,drag:.4,life:1.2,s0:.25,s1:.12});
 const q={x:p.x,y:groundAt(p.x,p.z,p.y)+.3,z:p.z};if(q.y>p.y-3)pDust(q,1.4*k,lo?3:hi?10:6,7*k);
 if(hi){FIREL.position.set(p.x,p.y+1,p.z);fireHot=1.5;}}
// ---- v26 armor: rounded/beveled boxes, raised plates with seams, bolt heads, frame ribs revealed when plates blow off ----
const _rbC=new Map();
function rbox(w,h,d,b){w=Math.round(w*100)/100;h=Math.round(h*100)/100;d=Math.round(d*100)/100;const k=w+','+h+','+d+','+b;let g=_rbC.get(k);if(g)return g;
 const r=Math.min(.1,Math.min(w,h,d)*.2),N=2*b+1;g=new THREE.BoxGeometry(1,1,1,N,N,N);const P_=g.attributes.position,Nn=g.attributes.normal,hs=[w/2,h/2,d/2];
 const mp=(u,hh)=>{const i=Math.round((u+.5)*N);return i<=b?-hh+r*i/b:hh-r*(N-i)/b;};const q=[0,0,0],c=[0,0,0];
 for(let i=0;i<P_.count;i++){q[0]=mp(P_.getX(i),hs[0]);q[1]=mp(P_.getY(i),hs[1]);q[2]=mp(P_.getZ(i),hs[2]);let l=0;
  for(let a=0;a<3;a++){const e=hs[a]-r;c[a]=Math.max(-e,Math.min(e,q[a]));const v=q[a]-c[a];l+=v*v;}l=Math.sqrt(l)||1;
  const nx=(q[0]-c[0])/l,ny=(q[1]-c[1])/l,nz=(q[2]-c[2])/l;P_.setXYZ(i,c[0]+nx*r,c[1]+ny*r,c[2]+nz*r);Nn.setXYZ(i,nx,ny,nz);}
 g.userData.shared=1;_rbC.set(k,g);return g;}
const rivG=new THREE.CylinderGeometry(.045,.05,.04,6,1,true),rivM=M(0x9a9da0,{metal:.95,rough:.3});
const _ax=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]];
function armorUnit(u,keep){if(!u.mats||gfxLow()||window.__noArmor)return;const hiQ=gfxHi(),m=u.mats[0],dk=u.mats[1];const list=[];let pgN=0;
 u.g.traverse(o=>{if(o.isMesh&&o.geometry===boxG&&!keep.has(o)&&!o.children.length&&o.visible&&!o.material.transparent)list.push(o);});
 const inTop=o=>{for(let p=o.parent;p;p=p.parent){if(p===u.top)return true;if(p===u.g)return false;}return false;};
 for(const o of list){const s=o.scale,W=Math.abs(s.x),H=Math.abs(s.y),D=Math.abs(s.z);if(Math.min(W,H,D)<.06)continue;
  const mn=Math.min(W,H,D);if(!hiQ&&mn<.25)continue;o.geometry=rbox(W,H,D,hiQ&&mn>=.6?2:1);o.scale.set(Math.sign(s.x)||1,Math.sign(s.y)||1,Math.sign(s.z)||1);if(o.material!==m||o.userData.noArm)continue;
  const par=o.parent,top=inTop(o);if(top&&par.userData.pgS===undefined)par.userData.pgS=(pgN++%2?'A':'B');o.updateMatrix();const hd=[W/2,H/2,D/2],dm=[W,H,D];
  for(const ax of _ax){const a=ax[0]?0:ax[1]?1:2,u1=a===0?2:0,u2=a===1?2:1,fa=dm[u1],fb=dm[u2];if(fa<.35||fb<.35||fa*fb<.3)continue;
   const ins=Math.min(.09,Math.min(fa,fb)*.1),pa=fa-ins*2,pb=fb-ins*2,t=.07,sg=ax[0]+ax[1]+ax[2],pg=top?par.userData.pgS:0;
   const pd=[0,0,0];pd[a]=t;pd[u1]=pa;pd[u2]=pb;const pl=new THREE.Mesh(rbox(pd[0],pd[1],pd[2],1),m);pl.position.set(ax[0],ax[1],ax[2]).multiplyScalar(hd[a]+t/2);pl.userData.pg=pg;pl.castShadow=o.castShadow;
   const add=c=>{c.applyMatrix4(o.matrix);par.add(c);};add(pl);
   if(top){for(const f of [-.22,.22]){const rd=[0,0,0];rd[a]=.02;rd[u1]=pa*.9;rd[u2]=.06;const r_=new THREE.Mesh(boxG,dk);r_.scale.set(rd[0],rd[1],rd[2]);const v=[0,0,0];v[a]=sg*(hd[a]+.01);v[u2]=f*pb;r_.position.set(v[0],v[1],v[2]);r_.castShadow=o.castShadow;add(r_);}}
   if(hiQ)for(const i of [-1,1])for(const j of [-1,1]){const bt=new THREE.Mesh(rivG,dk);const v=[0,0,0];v[a]=sg*(hd[a]+t+.02);v[u1]=i*(pa/2-.07);v[u2]=j*(pb/2-.07);bt.position.set(v[0],v[1],v[2]);
    if(a===0)bt.rotation.z=Math.PI/2;else if(a===2)bt.rotation.x=Math.PI/2;bt.userData.pg=pg;bt.castShadow=o.castShadow;add(bt);}}}}
function plateTick(u,b){if(!u.plateSets){u.plateSets=[];u.g.traverse(o=>{if(o.isMesh&&o.userData.pg)u.plateSets.push(o);});}
 for(const o of u.plateSets)o.visible=b<(o.userData.pg==='A'?4:7);}
// ---- v27 mech detail helpers: bevelled hex hull, lock ring, medic parts ----
const _bhC=new Map();
function bevHex(R,H,bs){const k=R+','+H+','+bs;let g=_bhC.get(k);if(g)return g;const bv=.07,r=R-bv,sh=new THREE.Shape();
 for(let i=0;i<6;i++){const t=i*Math.PI/3,x=r*Math.sin(t),y=-r*Math.cos(t);i?sh.lineTo(x,y):sh.moveTo(x,y);}sh.closePath();
 g=new THREE.ExtrudeGeometry(sh,{depth:H-2*bv,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:bs,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(0,-(H-2*bv)/2,0);g.computeVertexNormals();g.userData.shared=1;_bhC.set(k,g);return g;}
const _hq=()=>typeof settings!=='undefined'&&settings.gfx==='high';
const _lrG={};function lockBezG(){const h=_hq();if(!_lrG[h]){_lrG[h]={bez:new THREE.TorusGeometry(.66,.12,h?10:6,h?48:24),glow:new THREE.TorusGeometry(.53,.025,4,h?40:24),halo:new THREE.TorusGeometry(1.32,.075,h?8:5,h?64:32),hi:h};}return _lrG[h];}
const tankG=new THREE.CylinderGeometry(.24,.24,1,12),capG=new THREE.SphereGeometry(.245,12,6,0,Math.PI*2,0,Math.PI/2),tankMat=new THREE.MeshStandardMaterial({color:0x1c5a34,emissive:0x30e080,emissiveIntensity:.55,roughness:.15,metalness:.2});
// ---------- v28: WRAITH cloak, JAMMER weapons, buff/debuff status bar, debuff resistance ----------
CFG.status={resist:4};
PG.jammer=new THREE.TorusGeometry(.26,.08,4,10);PM.jammer=new THREE.MeshBasicMaterial({color:0xffc020});
let _wg=null;function wraithGlow(){return _wg||(_wg=new THREE.MeshStandardMaterial({color:0x140c24,emissive:0x9a6aff,emissiveIntensity:1.5,roughness:.3}));}
// --- cloak visibility: hidden from targeting / minimap / plates unless revealed (fired, hit) or the observer is within `near` m
function cloakHid(f,obs){if(!f||!(f.cloakT>0)||f.revT>0)return false;const C_=f.T&&f.T.cloak;if(obs&&f.g.position.distanceTo(obs)<(C_?C_.near:6))return false;return true;}
// --- debuff resistance: after a debuff ends the unit is immune to that same debuff for CFG.status.resist seconds
const DEBUFFS=['emp','root','teth','dot','jam'],DB_ON={emp:u=>u.empT>0,root:u=>u.rootT>0,teth:u=>!!u.teth,dot:u=>!!u.dot,jam:u=>u.jamT>0};
function resd(u,k){return !!(u&&u.res&&u.res[k]>clock);}
function clearDb(u,k){if(k==='emp')u.empT=0;else if(k==='root')u.rootT=0;else if(k==='teth')dropTether(u);else if(k==='dot')u.dot=null;else if(k==='jam')u.jamT=0;}
function resFx(t){if(clock-(t.resFxT||-9)<.4)return;t.resFxT=clock;const p=t.g.position.clone();p.y+=3;fx(p,1.6,0xa0b0c0,{grow:2,life:.3,op:.6});}
function statTick(u,dt){if(!u.res)u.res={};if(!u.dbOn)u.dbOn={};const R=CFG.status.resist;
 for(const k of DEBUFFS){const on=DB_ON[k](u);if(on&&!u.dbOn[k]&&resd(u,k)){clearDb(u,k);u.dbOn[k]=false;resFx(u);continue;}if(!on&&u.dbOn[k]&&u.alive&&R>0)u.res[k]=clock+R;u.dbOn[k]=on;}
 if(u.jamT>0)u.jamT=Math.max(0,u.jamT-dt);}
{const e0=empHit;empHit=function(t,W,src){if(t&&!t.isDome&&resd(t,'emp')){resFx(t);return;}return e0(t,W,src);};}
{const n0=naniteHit;naniteHit=function(t,W,src,dmg){if(t&&resd(t,'dot')){resFx(t);return;}return n0(t,W,src,dmg);};}
{const t0=tetherHit;tetherHit=function(t,W,src){if(t&&!t.teth&&resd(t,'teth')){resFx(t);return;}return t0(t,W,src);};}
// --- jammer: chance per hit to force weapons into a reload (beams/heat weapons into overheat)
function jamHit(t,W,src){if(!t||!t.alive||t.isDome||!t.ws)return false;if(resd(t,'jam')){resFx(t);return false;}if(Math.random()>W.jam)return false;
 const ws=t.ws.filter(w=>!(w.reload>0)).sort(()=>Math.random()-.5).slice(0,W.jamN||1);if(!ws.length)return false;let mx=0;
 for(const w of ws){if(w.W.beam){w.heat=1;w.beamT=0;w.reload=Math.max(w.reload||0,w.W.reload);}else{w.ammo=0;w.reload=Math.max(w.reload||0,w.W.reload*(W.jamMul||1));}w.chg=0;mx=Math.max(mx,w.reload);}
 t.jamT=Math.max(t.jamT||0,mx);t.jamK=ws.length;if(t.cloakT>0)t.revT=Math.max(t.revT||0,.6);
 sfx('jam',{u:t});const p=t.g.position.clone();p.y+=3;fx(p,2.2,0xffc020,{grow:2.6,life:.4,op:.8});if(!gfxLow())for(let i=0;i<5;i++)fx(p,.6,0xffe070,{box:1,grow:0,life:.3,v:new THREE.Vector3((Math.random()-.5)*10,Math.random()*6,(Math.random()-.5)*10)});
 if(t===P)toast&&toast(ws.length>1?`⌁ JAMMED — ${ws.length} weapons forced to ${ws.some(w=>w.W.beam)?'reload / overheat':'reload'}`:ws[0].W.beam?'⌁ JAMMED — laser forced into overheat':'⌁ JAMMED — weapon forced to reload');return true;}
// --- cloak ability
function cloakSkin(u,on){if(!!u.cskin===on)return;u.cskin=on;
 if(on){if(!u.cmat)u.cmat=new THREE.MeshStandardMaterial({color:0xb8d4ff,metalness:1,roughness:.08,transparent:true,opacity:.1,depthWrite:false,emissive:0x5a70b0,emissiveIntensity:.2});
  u.cList=[];u.g.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){u.cList.push([o,o.material,o.castShadow]);o.material=u.cmat;o.castShadow=false;}});}
 else{for(const [o,m,c] of u.cList||[]){o.material=m;o.castShadow=c;}u.cList=null;}}
function cloakOn(u){const C_=u.T.cloak;u.cloakT=C_.dur;u.revT=0;sfx('cloak',{u});const p=u.g.position.clone();p.y+=2.5;fx(p,3,0xa080ff,{grow:2,life:.45,op:.5});cloakSkin(u,true);if(u===P)chEv('abil',1);}
function cloakOff(u,quiet){if(!(u.cloakT>0)&&!u.cskin)return;u.cloakT=0;u.revT=0;u.abCd=Math.max(u.abCd,u.T.cloak.cd);cloakSkin(u,false);if(u.plate&&u.alive)u.plate.visible=true;
 if(!quiet){sfx('decloak',{u});const p=u.g.position.clone();p.y+=2.5;fx(p,2.6,0xa080ff,{grow:2.2,life:.35,op:.5});}}
{const a0=abilityAir;abilityAir=function(u){const C_=u.T.cloak;if(C_){if(u.cloakT>0)cloakOff(u);else if(u.abCd<=0&&!(u.empT>0))cloakOn(u);else if(u===P)sfx('denied');return true;}return a0(u);};}
function tickStealth(u,dt){statTick(u,dt);const C_=u.T.cloak;if(!C_||!(u.cloakT>0||u.cskin))return;
 if(!u.alive||u.empT>0){cloakOff(u,!u.alive);return;}
 u.cloakT-=dt;u.revT=Math.max(0,(u.revT||0)-dt);if(u.cloakT<=0){cloakOff(u);return;}cloakSkin(u,true);
 const ally=P&&u.team===P.team,near=P&&u.g.position.distanceTo(P.g.position)<C_.near;
 let op=ally?.3:near?.2:.045;if(u.revT>0)op=Math.max(op,.15+.4*Math.random()*Math.min(1,u.revT/.3));
 const sh=.5+.5*Math.sin(clock*9+u.g.position.x*.7);u.cmat.opacity=op*(.75+.5*sh);u.cmat.emissiveIntensity=.12+.3*sh;
 if(u.plate)u.plate.visible=!(P&&!ally&&cloakHid(u,P.g.position));}
{const t0=tickAir;tickAir=function(u,dt){t0(u,dt);tickStealth(u,dt);};}
{const f0=fireWeapon;fireWeapon=function(u){const C_=u&&u.T&&u.T.cloak;if(C_&&u.cloakT>0){u.revT=Math.max(u.revT||0,C_.fireReveal);if(clock-(u.cfT||-9)>.3){u.cfT=clock;u.cloakT=Math.max(.05,u.cloakT-C_.fireCost);}}return f0.apply(this,arguments);};}
{const h0=hurt;hurt=function(u,d,pos,src){if(u&&u.cloakT>0&&d>0&&u.T&&u.T.cloak)u.revT=Math.max(u.revT||0,u.T.cloak.hitReveal);return h0(u,d,pos,src);};}
// bots: cloak to close in on a target or to escape when hurt; drop it when there's nothing to hunt
{const a0=aiAir;aiAir=function(u,dt,t,dist,see){a0(u,dt,t,dist,see);const C_=u.T.cloak;if(!C_)return;
 if(!(u.cloakT>0)){if(u.abCd<=0&&!(u.empT>0)&&((t&&dist<95&&Math.random()<dt*1.2)||(clock-u.lastHit<.5&&u.hp<u.max*.5)))ability(u);}
 else if(!t&&u.cloakT<C_.dur-3&&Math.random()<dt*.3)ability(u);}}
// --- status icons on enemy/ally name plates (cheap: redraw only when the set changes)
function stKey(u){let s='';if(u.empT>0)s+='ϟ';if(u.rootT>0)s+='⊗';if(u.teth)s+='⚷';if(u.dot)s+='☣';if(u.jamT>0)s+='⌁';if(u.shieldOn)s+='⛉';if(u.domeOn)s+='◠';return s.slice(0,3);}
{const u0=updPlate;updPlate=function(u){const k=stKey(u);if(k!==u.plSt){u.plSt=k;u.plHp=-1;}const b=u.plHp;u0(u);
 if(u.plHp!==b&&k){const g=u.pc.getContext('2d');g.font='bold 19px system-ui,sans-serif';g.textAlign='right';g.textBaseline='alphabetic';g.lineWidth=4;g.strokeStyle='#000c';g.fillStyle='#ffd04a';g.strokeText(k,254,24);g.fillText(k,254,24);u.pt.needsUpdate=true;}};}
// --- HUD buff/debuff bar with timers (player)
const STB=document.createElement('div');STB.id='stbar';(document.getElementById('hud')||document.body).appendChild(STB);
{const st=document.createElement('style');st.textContent=`#stbar{position:absolute;top:46px;left:50%;transform:translateX(-50%);display:flex;gap:7px;pointer-events:none;z-index:4}
#stbar .st{position:relative;width:36px;height:36px;border-radius:8px;background:#000b;border:2px solid #4f8;display:flex;align-items:center;justify-content:center;font:bold 20px system-ui,sans-serif;color:#7fa}
#stbar .st.deb{border-color:#f54;color:#f86}#stbar .st.res{border:2px dashed #9ab;color:#9ab;filter:grayscale(1);opacity:.65;border-radius:12px 12px 18px 18px}
#stbar .st b{position:absolute;bottom:-15px;left:-6px;right:-6px;text-align:center;font:bold 11px system-ui,sans-serif;color:#fff;text-shadow:0 0 3px #000,0 0 2px #000}
#stbar .st i{position:absolute;top:-8px;right:-8px;font-style:normal;font-size:12px;color:#cde;text-shadow:0 0 3px #000}
#stbar .st u{position:absolute;left:0;bottom:0;height:3px;background:currentColor;text-decoration:none;border-radius:2px}
@media (max-width:820px),(max-height:520px){#stbar{top:40px;gap:5px}#stbar .st{width:27px;height:27px;font-size:15px;border-radius:6px}#stbar .st b{font-size:9px;bottom:-12px}}`;document.head.appendChild(st);}
const DBI={emp:['ϟ','EMP'],root:['⊗','ROOT'],teth:['⚷','TETHER'],dot:['☣','NANITE'],jam:['⌁','JAM'],slow:['≈','SLOW']};
function stList(u){const L=[],T=u.T,f=x=>x.toFixed(1);
 if(u.shieldOn)L.push(['b','⛉',Math.round(Math.max(0,u.shieldHP)),'Shield']);
 if(u.domeOn)L.push(['b','◠',f(u.domeT||0),'Dome',(u.domeT||0)/T.dome.dur]);
 if(u.cloakT>0)L.push(['b','◌',f(u.cloakT),'Cloak',u.cloakT/T.cloak.dur]);
 let lt=0;for(const x of U)if(x.dot&&x.dot.src===u)lt=Math.max(lt,x.dot.t);if(lt>0)L.push(['b','✚',f(lt),'Nanite heal']);
 if(T.regen&&u.alive&&u.hp<u.max&&clock-u.lastHit>T.regen.delay&&!(u.empT>0))L.push(['b','⟳','+'+T.regen.rate,'Repair']);
 if(u.dashT>0)L.push(['b','»',f(u.dashT),'Speed']);else if(u.cloakT>0&&T.cloak.speedMul>1)L.push(['b','»','+'+Math.round((T.cloak.speedMul-1)*100)+'%','Speed']);
 if(u.empT>0)L.push(['d','ϟ',f(u.empT),'EMP']);
 const sl=Math.max(u.empT>0?u.empT:0,u.teth?u.teth.t:0);if(sl>0)L.push(['d','≈',f(sl),'Slow']);
 if(u.dot)L.push(['d','☣',f(u.dot.t),'Nanite DoT']);if(u.teth)L.push(['d','⚷',f(u.teth.t),'Tether']);
 if(u.rootT>0)L.push(['d','⊗','ROOT','Lockdown']);if(u.jamT>0)L.push(['d','⌁',f(u.jamT),'Jammed']);
 for(const k of DEBUFFS)if(resd(u,k)&&!DB_ON[k](u))L.push(['r',DBI[k][0],f(u.res[k]-clock),DBI[k][1]+' resist']);return L;}
let stbT=0,stbK='';
function hudStatus(){const on=mode==='play'&&P&&P.alive;if(!on){if(stbK){STB.innerHTML='';stbK='';}return;}if(clock-stbT<.1)return;stbT=clock;
 const L=stList(P),k=L.map(x=>x.join()).join('|');if(k===stbK)return;stbK=k;
 STB.innerHTML=L.map(([t,ic,v,n,fr])=>`<div class="st ${t==='d'?'deb':t==='r'?'res':''}" title="${n}">${ic}${t==='r'?'<i>⛉</i>':''}<b>${v}</b>${fr!=null?`<u style="width:${Math.max(0,Math.min(1,fr))*100}%"></u>`:''}</div>`).join('');}
{const h0=hudAir;hudAir=function(){h0();hudStatus();};}
window.__v28={jamHit:(t,W,s)=>jamHit(t,W,s),cloakHid:(f,o)=>cloakHid(f,o),resd:(u,k)=>resd(u,k),empHit:(t,W,s)=>empHit(t,W,s),tetherHit:(t,W,s)=>tetherHit(t,W,s),naniteHit:(t,W,s,d)=>naniteHit(t,W,s,d),ability:u=>ability(u),stList:u=>stList(u),get clock(){return clock;}};
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
const STEPC={guardian:{c:1700,s:120,th:.07,v:1},phantom:{c:3600,s:420,th:.015,v:.5},strider:{c:2800,s:300,th:.03,v:.7},mender:{c:2500,s:250,th:.035,v:.75},locke:{c:2200,s:200,th:.05,v:.85},skyhawk:{c:3300,s:380,th:.02,v:.55},aegis:{c:1900,s:160,th:.06,v:.9},wraith:{c:4200,s:520,th:.008,v:.32}};
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
   case'jammer':tone({type:'square',f:560*z,f2:170,d:.15,v:.06*v,pan,lp:2600});tone({type:'sawtooth',f:1400*z,f2:700,d:.1,v:.035*v,pan,lp:3200});nz({f:3200,q:5,d:.09,v:.08*v,pan});break;
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
 case'chain':tone({type:'sawtooth',f:2200,f2:300,a:.005,d:.22,v:.11*V,lp:5000,pan});tone({type:'square',f:90,f2:60,a:.005,d:.25,v:.08*V,pan});tone({type:'sawtooth',f:3400,f2:900,a:.002,d:.08,v:.06*V,pan});break;
 case'pulseFull':tone({type:'triangle',f:520,f2:1560,a:.01,d:.18,v:.12*V,pan});tone({f:1560,d:.12,v:.06*V,pan});break;
 case'charge':tone({type:'sawtooth',f:200,f2:1400,a:.02,d:o.d||.4,v:.05*V,lp:3000,pan});break;
 case'stun':tone({type:'square',f:58,d:.7,v:.08,lp:600});nz({type:'highpass',f:4000,d:.4,v:.15});tone({type:'square',f:1800,f2:300,d:.3,v:.04});break;
 case'heal':if(!gate('heal',.6))return;tone({f:880,f2:1320,a:.02,d:.18,v:.05});tone({f:1320,f2:1760,t:.1,a:.02,d:.18,v:.04});break;
 case'drone':if(!gate('drone',.9))return;tone({type:'triangle',f:1500,f2:1700,a:.03,d:.15,v:.03*V,pan});break;
 case'cloak':nz({f:5000,f2:400,q:2,a:.05,d:.6,v:.12*V,pan});tone({type:'sine',f:900,f2:120,a:.03,d:.55,v:.07*V,pan});tone({type:'triangle',f:1800,f2:2600,d:.25,v:.03*V,pan,t:.12});break;
 case'decloak':nz({f:300,f2:4500,q:2,a:.02,d:.35,v:.1*V,pan});tone({type:'sine',f:160,f2:1100,d:.3,v:.06*V,pan});break;
 case'jam':for(let i=0;i<4;i++)tone({type:'square',f:300+Math.random()*900,d:.04,v:.05*V,pan,lp:2400,t:i*.045});nz({f:2400,q:6,d:.22,v:.1*V,pan});break;
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
// ---------- v30: recorded CC0 samples (Kenney.nl, see CREDITS.md) layered over / replacing beepy procedural sfx ----------
const SMPN='boom1 boom2 crunch1 crunch2 rail laser thrust dash shotgun pulse emp shup shdown dome gun1 gun2 hit1 hit2 hurt land step1 step2 clank reload reloaded click denied win lose chal coin tick warn alert deploy overheat jam'.split(' ');
const SB={};let SBload=0;
function smpLoad(){if(SBload||!AC)return;SBload=1;for(const n of SMPN)fetch('audio/'+n+'.mp3?v=30').then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(a=>new Promise((res,rej)=>AC.decodeAudioData(a,res,rej))).then(b=>{SB[n]=b;}).catch(()=>{});}
// play sample n: v volume, pan, rate (pitch), bus, t delay, lp lowpass. Returns false if not decoded yet (caller falls back to procedural)
function smp(n,o={}){const b=SB[n];if(!b)return false;const{v=.5,pan=0,rate=1,bus=BUS.sfx,t=0,lp,off=0,dur}=o;const T=AC.currentTime+t,s=AC.createBufferSource(),g=AC.createGain();s.buffer=b;s.playbackRate.value=rj(rate,.05);g.gain.value=v;
 let x=s;if(lp){const F=AC.createBiquadFilter();F.type='lowpass';F.frequency.value=lp;s.connect(F);x=F;}x.connect(g);aOut(g,bus,pan);if(dur){g.gain.setValueAtTime(v,T+dur*.7);g.gain.linearRampToValueAtTime(.0001,T+dur);s.start(T,off,dur+.02);}else s.start(T,off);return true;}
const pick=(...a)=>a[Math.random()*a.length|0];
const sfx0p=sfx0;
sfx0=function(k,o){smpLoad();const u=o.u,sp=spat(o.p||(u&&u.g&&u.g.position)),mine=u&&u===P,V=mine?1:sp.v,pan=mine?0:sp.pan,U={bus:BUS.ui};let ok=false;
 switch(k){
 case'step':if(V>.03&&SB.step1){const c=STEPC[u&&u.type]||STEPC.strider;smp(pick('step1','step2'),{v:.22*c.v*V*(mine?.7:.9),pan,rate:2600/c.c+.25,lp:2600});}break;// layer, procedural stays
 case'land':ok=smp('land',{v:.55*V*(o.k||1),pan,rate:.8});if(ok)smp('clank',{v:.2*V,pan,rate:.7,t:.03});break;
 case'jump':ok=smp('thrust',{v:.4*V,pan,rate:.9,dur:.6});break;
 case'pulseFull':ok=smp('shup',{v:.5*V,pan,rate:1.5,dur:.35})&&smp('reloaded',{v:.45*V,pan,rate:1.2});break;
 case'dash':ok=smp('dash',{v:.5*V,pan,rate:1.15,dur:.5});break;
 case'shot':{if(!mine&&(V<.04||!gate('s2'+(u&&u._sid)+o.fam,.07)))return;if(mine&&!gate('ps2'+o.gi,.035))return;const z=o.size==='S'?1.2:o.size==='L'?.8:1,v=V*(mine?1:.8);
  switch(o.fam){
   case'railgun':ok=smp('rail',{v:.5*v,pan,rate:.75*z})&&smp('crunch1',{v:.25*v,pan,rate:1.4,dur:.25});break;
   case'hornet':case'rocket':case'swarm':ok=smp('thrust',{v:(o.fam==='swarm'?.25:.4)*v,pan,rate:1.3*z,dur:.35});break;
   case'shotgun':ok=smp('shotgun',{v:.6*v,pan,rate:.9*z,lp:5000});break;
   case'pulse':ok=smp('pulse',{v:.45*v,pan,rate:.8*z,dur:.4})&&smp('gun2',{v:.4*v,pan,rate:.6});break;
   case'emp':ok=smp('emp',{v:.4*v,pan,rate:1.2,dur:.45});break;
   case'laser':ok=smp('laser',{v:.12*v,pan,rate:1.6*z,dur:.12});break;
   case'jammer':ok=smp('jam',{v:.25*v,pan,rate:1.3*z,dur:.2});break;
   case'nanite':case'lockbolt':ok=false;break;
   default:ok=smp(pick('gun1','gun2'),{v:.5*v,pan,rate:1.3*z,lp:6000,dur:.18});if(ok)nz({f:rj(2400*z),q:1.5,d:.04,v:.12*v,pan});}
  if(ok)return;break;}
 case'boom':{const kk=o.k||1;if(V<.03||!gate('boom2',.05))return;ok=smp(pick('boom1','boom2'),{v:Math.min(1,.7*V*kk),pan,rate:rj(.9/Math.sqrt(kk),.05)});if(ok)smp(pick('crunch1','crunch2'),{v:.35*V,pan,rate:.8});if(ok)return;break;}
 case'destroy':ok=smp('crunch2',{v:.5*V,pan,rate:.7});if(ok&&o.foe)smp('confirm'in SB?'confirm':'chal',{...U,v:.25,t:.1,rate:1.1});break;
 case'hit':if(!gate('hit',.05))return;ok=smp(pick('hit1','hit2'),{...U,v:.28,rate:1.4});break;
 case'hitsh':if(!gate('hit',.05))return;ok=smp('hit2',{...U,v:.2,rate:.8,lp:2500});break;
 case'hurt':if(!gate('hurt',.08))return;ok=smp('hurt',{v:.55,rate:.8});break;
 case'lowhp':ok=smp('alert',{...U,v:.3,rate:.7})&&smp('alert',{...U,v:.3,rate:.7,t:.18});break;
 case'reload':ok=smp('reload',{v:.4,rate:.8});break;
 case'reloaded':ok=smp('reloaded',{v:.4,rate:.9})&&smp('clank',{v:.15,rate:1.5});break;
 case'overheat':ok=smp('overheat',{v:.35,rate:1.4,dur:.8});break;
 case'lowammo':ok=smp('tick',{...U,v:.3,rate:.9})&&smp('tick',{...U,v:.3,rate:.9,t:.1});break;
 case'domeUp':ok=smp('dome',{v:.45*V,pan,rate:.8});break;
 case'domeDown':ok=smp('shdown',{v:.35*V,pan,rate:.7});break;
 case'shUp':ok=smp('shup',{v:.4*V,pan});break;
 case'shDown':case'shBreak':ok=smp('shdown',{v:(k==='shBreak'?.55:.35)*V,pan,rate:k==='shBreak'?.8:1});if(ok&&k==='shBreak')smp('crunch1',{v:.25*V,pan,rate:1.3});break;
 case'diveHit':ok=smp('boom2',{v:.8*V,pan,rate:.7});break;
 case'thrust':ok=smp('thrust',{v:.15*V,pan,rate:rj(1),dur:.35});break;
 case'lockdown':ok=smp('land',{v:.5*V,pan,rate:.6})&&smp('deploy',{v:.3*V,pan,rate:.8,t:.1});break;
 case'stun':ok=smp('emp',{v:.4,rate:.7});break;
 case'jam':ok=smp('jam',{v:.35*V,pan,dur:.4});break;
 case'denied':ok=smp('denied',{...U,v:.35});break;
 case'click':if(!gate('click',.03))return;ok=smp('click',{...U,v:.35});break;
 case'deploy':ok=smp('deploy',{...U,v:.5,rate:.85})&&smp('thrust',{...U,v:.3,rate:.7,t:.5,dur:.8});break;
 case'win':ok=smp('win',{...U,v:.5});break;
 case'lose':ok=smp('lose',{...U,v:.45,rate:.8});break;
 case'chal':ok=smp('chal',{...U,v:.45});break;
 case'coins':ok=smp('coin',{...U,v:.35})&&smp('coin',{...U,v:.3,t:.12,rate:1.15});break;
 case'capT':ok=smp('tick',{...U,v:.25,rate:.9+(o.k||0)*.6});break;
 case'capWarn':ok=smp('warn',{...U,v:.35,rate:.8});break;
 }
 if(!ok)sfx0p(k,o);};
window.__v30={SB,PX,pEmit,pExplode,pFire,pDust,get fireHot(){return fireHot}};
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
function updAmb(dt){updSeg(dt);updChain(dt);if(typeof gfx33Tick==='function')gfx33Tick(dt);const low=lowG(),rate=low?.3:1,t=clock||performance.now()/1000;FLK.color.setHex(Math.random()<.06?0x403020:(Math.random()<.5?0xffe0a0:0xfff0c0));
 if(BLINK)BLINK.color.setHex(((t*2)|0)%2?0xff2020:0x300000);
 for(const b of BIRDS){b.a+=b.s*dt;b.g.position.set(Math.cos(b.a)*b.r,b.h+Math.sin(t+b.ph)*1.5,Math.sin(b.a)*b.r);b.g.rotation.y=-b.a+(b.s>0?0:Math.PI);const f=Math.sin(t*9+b.ph)*.6;b.w1.rotation.z=f;b.w2.rotation.z=-f;}
 if(mode!=='play'||FX.length>CFG.fx.maxFx*.7)return;const cp=C.position;
 for(const a of AMB){if(a.x!==undefined&&Math.abs(a.x-cp.x)+Math.abs(a.z-cp.z)>90)continue;const r=Math.random();
  if(a.t==='steam'&&r<dt*6*rate)fx(_av.set(a.x+Rn(-.3,.3),a.y,a.z+Rn(-.3,.3)),1.2,0xdddddd,{grow:2.5,life:1.6,op:.35,vy:3});
  else if(a.t==='fire'&&r<dt*10*rate){fx(_av.set(a.x+Rn(-.3,.3),a.y,a.z+Rn(-.3,.3)),.9,Math.random()<.5?0xff8020:0xffc040,{grow:1,life:.5,op:.8,vy:3});if(Math.random()<.3)fx(_av.set(a.x,a.y+1,a.z),1.2,0x333333,{grow:2,life:1.4,op:.35,vy:2.5});}
  else if(a.t==='spark'&&r<dt*.8*rate){for(let i=0;i<5;i++)fx(_av.set(a.x,a.y,a.z),.8,0xffe070,{box:1,grow:0,life:.6,v:new THREE.Vector3(Rn(-3,3),Rn(0,3),Rn(-3,3))});}
  else if(a.t==='dust'&&r<dt*2*rate)pEmit('dust',_av.set(cp.x+Rn(-30,30),.8,cp.z+Rn(-30,30)),{vx:5,vz:1.6,vy:.3,sp:.6,life:4,s0:2.5,s1:7,a:.22});
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
  for(const u of foes(f.team)){if(!u.alive||resd(u,'root'))continue;const q=u.g.position;if(Math.hypot(q.x-f.x,q.z-f.z)<f.r&&Math.abs(q.y-f.y)<4){if(!(u.rootT>0)&&u===P)toast&&toast('🔒 LOCKDOWN — you are rooted');if(!(u.rootT>0)&&f.src===P)chEv('roots',1);u.rootT=.3;u.vel.multiplyScalar(.5);
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
function seekT(u,from,dir,W){let best=null,bs=W.seek;for(const f of foes(u.team)){if(cloakHid(f,from))continue;const q=_q.set(f.g.position.x,f.g.position.y+2.5,f.g.position.z).sub(from);const L=q.length();if(L>W.range*1.1)continue;const c=q.dot(dir)/L;if(c>bs){bs=c;best=f;}}return best;}
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
 for(let i=0;i<n;i++){const nx=p.x+sx,nz=p.z+sz;if(!blocked(nx,p.z,colR(u),p.y))p.x=nx;else hw=true;if(!blocked(p.x,nz,colR(u),p.y))p.z=nz;else hw=true;}
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
Object.assign(CFG.paints,{phantasm:{name:'Phantasm',col:0x3a3550,metal:.85,rough:.22,camo:[0x23202f,0x6a5f8a],excl:1},chrome:{name:'Chrome',col:0xd8dde4,metal:1,rough:.15,excl:1},obsidian:{name:'Obsidian',col:0x16121e,metal:.6,rough:.3,excl:1},
 royal:{name:'Royal Violet',col:0x6a3cc8,metal:.5,excl:1},crimson:{name:'Champion Crimson',col:0x9c1c28,camo:[0x5a0c14,0xd4a530],excl:1}});
const FAMS=['minigun','railgun','hornet','shotgun','laser','emp','nanite','lockbolt','swarm','pulse','jammer'];
const FAMN={minigun:'Minigun',railgun:'Railgun',hornet:'Hornet',shotgun:'Shotgun',laser:'Laser',emp:'EMP',nanite:'Nanite',lockbolt:'Lockbolt',swarm:'Swarm',pulse:'Pulse',jammer:'Jammer'};
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
 ['wraith','Unlock Wraith',['Unlock the Wraith stealth mech'],[1],[350],()=>ownMech('wraith')?1:0,{0:{title:'Ghost',paint:'phantasm'}}],
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
// ===== v33 graphics polish: sun glare + HIGH-only vignette, ground scatter (pebbles + tufts), soft scorch decals. Tiered: LOW none, MED reduced, HIGH full =====
function g33Tier(){return settings.gfx==='low'?0:settings.gfx==='high'?2:1;}
function g33Tex(draw,w=128,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const glareT=g33Tex((g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'rgba(255,250,230,1)');gr.addColorStop(.12,'rgba(255,240,200,.7)');gr.addColorStop(.4,'rgba(255,220,160,.15)');gr.addColorStop(1,'rgba(255,200,150,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
let glare=null,vig=null;
function g33Clouds(m){const T=g33Tier();
 if(!glare){glare=new THREE.Sprite(new THREE.SpriteMaterial({map:glareT,transparent:true,depthWrite:false,depthTest:true,fog:false,blending:THREE.AdditiveBlending,opacity:.75}));glare.scale.setScalar(70);S.add(glare);}
 if(!vig){vig=document.createElement('div');vig.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(10,8,20,.38) 100%);mix-blend-mode:multiply';document.body.appendChild(vig);}vig.style.display=T===2?'block':'none';}
function g33Scatter(m){const T=g33Tier();if(!T)return;const pal={desert:[0xb08a58,0x8a7a3a],arena:[0x6b6352,0x5a6a3a],city:[0x5a5650,0x4a5a3a],port:[0x505860,0x3c5040],arctic:[0xc8d4dc,0x9aa8b0],canyon:[0x8a5a3c,0x7a6a3a]}[mapKey]||[0x777060,0x5a6a3a];
 const N=T===2?1400:600,pg=new THREE.DodecahedronGeometry(.22,0),tg=new THREE.ConeGeometry(.12,.55,4);tg.translate(0,.27,0);
 const pm=new THREE.MeshStandardMaterial({color:pal[0],roughness:.95,flatShading:true}),tm=new THREE.MeshStandardMaterial({color:pal[1],roughness:1,flatShading:true});
 const ip=new THREE.InstancedMesh(pg,pm,N),it=new THREE.InstancedMesh(tg,tm,mapKey==='arctic'?1:N>>1);const o=new THREE.Object3D(),col=new THREE.Color();let a=0,b=0;
 for(let i=0;i<N*3&&(a<N||b<it.count);i++){const x=(Math.random()*2-1)*(A-2),z=(Math.random()*2-1)*(A-2);if(blocked(x,z,.6))continue;
  if(a<N){o.position.set(x,.03,z);o.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);const s=.4+Math.random()*1.4;o.scale.set(s,s*.55,s);o.updateMatrix();ip.setMatrixAt(a,o.matrix);col.setHex(pal[0]).multiplyScalar(.75+Math.random()*.4);ip.setColorAt(a,col);a++;}
  else if(b<it.count){for(let k=0;k<3&&b<it.count;k++){o.position.set(x+Math.random()*.6,0,z+Math.random()*.6);o.rotation.set((Math.random()-.5)*.5,Math.random()*3,(Math.random()-.5)*.5);const s=.7+Math.random()*.8;o.scale.set(s,s,s);o.updateMatrix();it.setMatrixAt(b,o.matrix);b++;}}}
 ip.count=a;it.count=b;ip.receiveShadow=it.receiveShadow=true;ip.castShadow=T===2;ip.computeBoundingSphere();it.computeBoundingSphere();MAPG.add(ip);if(b)MAPG.add(it);}
function gfx33Map(m){try{g33Clouds(m);g33Scatter(m);}catch(e){console.warn('gfx33',e);}}
function gfx33Tick(dt){if(vig)vig.style.display=g33Tier()===2&&mode!=='menu'?'block':'none';
 if(glare&&typeof sunM!=='undefined'){sunM.getWorldPosition(glare.position);glare.position.multiplyScalar(.9);glare.visible=g33Tier()>0;}}
// soft radial scorch texture instead of a flat disc
{const st=g33Tex((g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,'rgba(10,8,6,.95)');gr.addColorStop(.45,'rgba(25,20,15,.7)');gr.addColorStop(.8,'rgba(40,30,20,.25)');gr.addColorStop(1,'rgba(40,30,20,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);for(let i=0;i<40;i++){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(w/2+(Math.random()-.5)*w*.8,h/2+(Math.random()-.5)*h*.8,2+Math.random()*5,0,7);g.fill();}});
 scM.map=st;scM.color.setHex(0xffffff);scM.opacity=.85;scM.polygonOffset=true;scM.polygonOffsetFactor=-2;scM.needsUpdate=true;}
// ---------- v37 online up to 4 players (PeerJS WebRTC, host-authoritative) ----------
const NET={G:[],tm:{},free:false,vc:{},evR:[],rT:0,mid:0,ffa:false,role:null,conn:null,peer:null,mode:'coop',code:'',ping:0,last:0,units:[],my:-1,R:null,ev:[],inp:null,keep:false,sT:0,iT:0,pT:0,seed:0,hi:null,fL:false,fR:false,stat:''};
const NETPFX='mecharena-jdj35-';let _mr=null;
function netRand(on,salt){if(!NET.role)return;if(on){if(!_mr)_mr=Math.random;Math.random=seeded((NET.seed|0)+salt*7919);}else if(_mr){Math.random=_mr;_mr=null;}}
function loadJs(src,ok){return ok()?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('load '+src));document.head.appendChild(s);});}
function netLib(){return loadJs('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',()=>window.Peer).catch(()=>loadJs('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',()=>window.Peer));}
function sbLib(){return loadJs('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',()=>window.supabase).catch(()=>loadJs('https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',()=>window.supabase));}
const SB_URL='https://yclljgjukzefvwmlufyk.supabase.co',SB_KEY='sb_publishable_oVMsizrxjpt3LgjWl17C_Q_2AXgO1gb';
const ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},{urls:['stun:stun3.l.google.com:19302','stun:stun4.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:global.stun.twilio.com:3478'}]};
const QS=new URLSearchParams(location.search),NOP2P=QS.has('nop2p'),NORELAY=QS.has('norelay');
let SBC=null;
// relay transport: Supabase Realtime broadcast channel, same API as a PeerJS DataConnection (on/send/close/open)
async function relayOpen(code,me){await sbLib();if(!SBC)SBC=window.supabase.createClient(SB_URL,SB_KEY,{realtime:{params:{eventsPerSecond:60}}});
 const H={},c={open:false,relay:true,on(e,f){(H[e]=H[e]||[]).push(f);return c;},emit(e,x,y){(H[e]||[]).forEach(f=>{try{f(x,y)}catch(er){console.warn(er)}});},
  send(m,to){if(c.open)ch.send({type:'broadcast',event:'m',payload:{f:me,to:to||(me==='h'?'*':'h'),m}});},close(){if(c.dead)return;c.dead=1;c.open=false;try{SBC.removeChannel(ch);}catch(e){}}};
 const ch=SBC.channel('mecharena35-'+code,{config:{broadcast:{self:false,ack:false}}});c.ch=ch;
 ch.on('broadcast',{event:'m'},({payload:q})=>{if(!q||q.f===me||c.dead)return;if(q.to&&q.to!=='*'&&q.to!==me)return;if(me!=='h'&&q.f!=='h')return;c.emit('data',q.m,q.f);});
 await new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('relay timeout')),10000);ch.subscribe(st=>{if(st==='SUBSCRIBED'){clearTimeout(t);c.open=true;res();}else if((st==='CHANNEL_ERROR'||st==='TIMED_OUT')&&!c.open){clearTimeout(t);rej(new Error('relay '+st));}else if(st==='CLOSED'&&c.open&&!c.dead){c.open=false;c.emit('close');}});});
 return c;}
function netSend(m){if(NET.role==='host')return netSendAll(m);try{if(NET.conn&&NET.conn.open)NET.conn.send(m);}catch(e){}}
function gSend(g,m){try{if(g&&g.c&&g.c.open)g.c.send(m);}catch(e){}}
function netSendAll(m,only){let rl=false;for(const g of NET.G){if(only&&!only(g))continue;if(g.c&&g.c.relay)rl=true;else gSend(g,m);}if(rl&&NET.relay)try{NET.relay.send(m,'*');}catch(e){}}
// --- v37 modes / persistence ---
const NMODES={coop:{n:'🤝 CO-OP',d:'All players on one team + bots vs 6 bots',sm:'team',ts:6},vs:{n:'⚔ VERSUS',d:'Team A vs Team B — bots fill each side to 6',sm:'team',ts:6,tm:1},duo:{n:'👥 2v2',d:'Team A vs Team B, 2 per side — bots fill empty spots',sm:'team',ts:2,tm:1},ffa:{n:'💥 FREE-FOR-ALL',d:'Every player for themselves (2–4 players) — no bots',sm:'duel',ts:1},duel:{n:'🥊 1v1 DUEL',d:'Exactly 2 players — no bots',sm:'duel',ts:1}};
const LSK='mecharena_net';let GID='';try{GID=sessionStorage.getItem('mecharena_gid')||localStorage.getItem('mecharena_gid')||'';if(!GID)GID=Math.random().toString(36).slice(2,10);sessionStorage.setItem('mecharena_gid',GID);try{localStorage.setItem('mecharena_gid',GID);}catch(e){}}catch(e){GID=Math.random().toString(36).slice(2,10);}
NET.map='random';NET.myReady=false;NET.rm=false;let AUTO_UNTIL=0,AUTO_N=0;
function netSave(){if(!NET.role||!NET.code)return;try{localStorage.setItem(LSK,JSON.stringify({code:NET.code,role:NET.role,mode:NET.mode,map:NET.map,t:Date.now()}));}catch(e){}}
function netForget(){AUTO_UNTIL=0;try{localStorage.removeItem(LSK);}catch(e){}}
function netSaved(){try{const r=JSON.parse(localStorage.getItem(LSK)||'null');if(r&&r.code&&Date.now()-r.t<15*60e3)return r;}catch(e){}return null;}
const esc=s=>String(s==null?'':s).replace(/[<>&"]/g,'');
const myName=()=>(curProf()||{}).name||'Pilot';
const mechN=k=>CFG.mechs[k]?CFG.mechs[k].name:'?';
// --- UI ---
const netP=document.createElement('div');netP.id='netP';netP.style.cssText='position:fixed;inset:0;z-index:60;display:none;align-items:flex-start;justify-content:center;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:calc(6px + env(safe-area-inset-top)) env(safe-area-inset-right) calc(6px + env(safe-area-inset-bottom)) env(safe-area-inset-left);background:#000b;font-family:system-ui,sans-serif;color:#fff';
const BTN='padding:8px 14px;border-radius:8px;border:0;color:#fff;font-weight:bold;font-size:1em;margin:3px';
netP.innerHTML=`<div id="netBox" style="background:#14202b;border:2px solid #2a8;border-radius:14px;padding:18px 22px;width:min(520px,94vw);text-align:center;box-shadow:0 10px 40px #000;margin:auto">
<h2 style="margin:0 0 6px">🌐 ONLINE (up to 4 players)</h2>
<div id="netPre"><div style="opacity:.75;font-size:.9em;margin-bottom:10px">Host + up to 3 friends. Each player uses their own mech, loadout &amp; secondary ability. Change mode, teams, map and mechs in the lobby.</div>
<div id="netHostBox"><button id="netHost" style="${BTN};font-size:1.1em;padding:10px 22px;background:#1b6">HOST GAME</button></div>
<div style="margin:10px 0 6px;opacity:.6">— or —</div>
<div id="netJoinBox"><input id="netCode" maxlength="5" placeholder="CODE" autocomplete="off" autocapitalize="characters" style="font-size:1.3em;width:7em;text-align:center;letter-spacing:.2em;text-transform:uppercase;padding:8px;border-radius:8px;border:2px solid #2a8;background:#0a1218;color:#fff">
<button id="netJoin" style="${BTN};font-size:1.1em;padding:10px 22px;background:#26a">JOIN</button></div></div>
<div id="netLob" style="display:none"></div>
<div id="netMsg" style="margin:10px 0;min-height:1.4em;font-size:1em"></div>
<button id="netX" style="padding:8px 18px;border-radius:8px;border:1px solid #888;background:#333;color:#fff">CANCEL</button></div>`;
document.body.appendChild(netP);
const netS=document.createElement('div');netS.id='netS';netS.style.cssText='position:fixed;top:44px;left:50%;transform:translateX(-50%);z-index:30;display:none;font:bold 12px system-ui;background:#000a;color:#8f8;padding:3px 10px;border-radius:10px;pointer-events:none';document.body.appendChild(netS);
const netBack=document.createElement('button');netBack.id='netBack';netBack.style.cssText='position:fixed;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:59;display:none;padding:8px 16px;border-radius:10px;border:2px solid #2a8;background:#14202bee;color:#6f9;font:bold 14px system-ui';netBack.textContent='🌐 BACK TO ONLINE LOBBY';document.body.appendChild(netBack);
const netRe=document.createElement('div');netRe.id='netRe';netRe.style.cssText='position:fixed;bottom:calc(10px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:59;display:none;font:bold 14px system-ui';document.body.appendChild(netRe);
const nq=id=>document.getElementById(id);
function netMsgSet(h){nq('netMsg').innerHTML=h;}
nq('netHost').onclick=()=>netHost();nq('netJoin').onclick=()=>{AUTO_UNTIL=0;netJoin(nq('netCode').value);};nq('netCode').onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')netJoin(nq('netCode').value);};
nq('netX').onclick=()=>{netForget();netClose();netP.style.display='none';netUi();};
netBack.onclick=()=>{saveLoadout();netShowLobby();netLobChanged();};
netP.addEventListener('click',e=>{const b=e.target.closest('[data-nm],[data-nact],[data-nsw]');if(!b||b.disabled)return;const d=b.dataset;
 if(d.nm){if(NET.role==='client')return;NET.mode=d.nm;return netLobChanged();}
 if(d.nsw){if(NET.role!=='host')return;NET.tm[d.nsw]=NET.tm[d.nsw]==='A'?'B':'A';return netLobChanged();}
 const a=d.nact;if(a==='ready'){NET.myReady=!NET.myReady;netLobChanged();}else if(a==='mech')netEditMech();else if(a==='start')netTryStart(true);
 else if(a==='free'){if(NET.role==='host'){NET.free=!NET.free;netLobChanged();}}
 else if(a==='swap'){netSend({t:'swap'});}
 else if(a==='leave'){netSend({t:'bye',x:1});netForget();netClose();netP.style.display='none';netUi();}else if(a==='recon'){const r=netSaved();if(r)netReconnect(r);}});
netP.addEventListener('change',e=>{if(e.target.id==='netMap'&&NET.role==='host'){NET.map=e.target.value;netLobChanged();}});
function netOpen(msg){if(NET.role)return netShowLobby();nq('netPre').style.display='';nq('netLob').style.display='none';nq('netX').style.display='';nq('netHostBox').style.display=nq('netJoinBox').style.display='';netMsgSet(msg||'');netP.style.display='flex';netUi();}
function netHide(){netP.style.display='none';netUi();}
function netShowLobby(){NET.editing=false;nq('netPre').style.display='none';nq('netLob').style.display='';nq('netX').style.display='none';netP.style.display='flex';NET.lobH='';netLobRender();netUi();}
function netEditMech(){NET.editing=true;netP.style.display='none';if(mode!=='menu')goMenu();menuStep='mech';renderMenu();netUi();}
function netUi(){const inMenu=mode==='menu',hid=netP.style.display!=='flex';netBack.style.display=NET.role&&inMenu&&hid?'block':'none';
 const r=!NET.role&&inMenu&&hid&&netSaved();netRe.style.display=r?'block':'none';
 if(r&&netRe.dataset.k!==r.code){netRe.dataset.k=r.code;netRe.innerHTML=`<button data-re="1" style="padding:8px 14px;border-radius:10px;border:2px solid #2a8;background:#14202bee;color:#6f9;font:bold 14px system-ui">🔁 Reconnect to room ${esc(r.code)}</button><button data-re="x" style="margin-left:6px;padding:8px 10px;border-radius:10px;border:1px solid #888;background:#222c;color:#ccc">✕</button>`;}}
netRe.addEventListener('click',e=>{const b=e.target.closest('[data-re]');if(!b)return;if(b.dataset.re==='x'){netForget();netUi();return;}const r=netSaved();if(r)netReconnect(r);});
function netReconnect(r){NET.mode=NMODES[r.mode]?r.mode:'coop';NET.map=r.map||'random';if(r.role==='host')netHost(r.code);else{AUTO_UNTIL=Date.now()+120e3;AUTO_N=0;netJoin(r.code,true);}}
function netLobChanged(){if(NET.role==='host')netBcast();else netSendMe();netLobRender();netSave();if(NET.role==='host')netTryStart(false);}
const liveG=()=>NET.G.filter(g=>g.c&&g.c.open);
function netPl(){if(NET.role==='host')return[{id:'h',n:myName(),m:loadout.mech,sa:saOf(loadout.mech),r:!!NET.myReady,tm:'A',host:1},...NET.G.map(g=>({id:g.gid,n:g.info.name||'Pilot',m:g.info.mech,sa:g.info.sa||'',r:!!g.info.ready,tm:NET.tm[g.gid]||'B',ping:g.ping|0,via:g.via||'',wait:!!(NET.inMatch&&!g.inMatch)}))];
 const L=NET.lob||{};return(L.pl||[]).map(p=>p.id===GID?Object.assign({},p,{n:myName(),m:loadout.mech,sa:saOf(loadout.mech),r:!!NET.myReady,you:1}):p);}
function netBcast(){if(NET.role!=='host')return;NET.inMatch=mode==='play'||mode==='over';netSendAll({t:'lob',mode:NET.mode,map:NET.map,free:NET.free,inMatch:NET.inMatch,pl:netPl()});}
function netMeMsg(t){return {t,mech:loadout.mech,slots:slotsOf(loadout.mech),paint:paintOf(loadout.mech),sa:saOf(loadout.mech),name:myName(),ready:!!NET.myReady,gid:GID};}
function netSendMe(){if(NET.role==='client'&&NET.conn)netSend(netMeMsg('me'));}
let _sig='';
function teamFor(){const pl=netPl();const a=pl.filter(p=>p.tm==='A').length,b=pl.filter(p=>p.tm==='B').length;return b<a?'B':'A';}
function netModeErr(n){const m=NET.mode;if(m==='duel'&&n!==2)return '🥊 1v1 DUEL needs exactly 2 players — pick another mode.';if(m==='duo'){const pl=netPl();if(pl.filter(p=>p.tm==='A').length>2||pl.filter(p=>p.tm==='B').length>2)return '👥 2v2 allows 2 players per team — swap someone to the other team.';}return '';}
function netLobRender(){if(!NET.role||nq('netLob').style.display==='none'||netP.style.display!=='flex')return;const host=NET.role==='host',L=NET.lob||{};
 const pl=netPl(),md=NMODES[NET.mode]||NMODES.coop,teamed=!!md.tm,conn=host?liveG().length>0:!!NET.conn,free=host?NET.free:!!L.free;
 const row=p=>`<div class="nrow" style="display:flex;align-items:center;gap:6px;background:#0a1218;border-radius:8px;padding:4px 8px;margin:3px 0;font-size:.92em;text-align:left">${p.host?'👑':'🎮'} <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${esc(p.n)}</b>${p.you||(host&&p.host)?' <span style="opacity:.6">(you)</span>':''} <span style="opacity:.8;font-size:.9em">· 🤖 ${esc(mechN(p.m))}${p.sa&&CFG.sec[p.sa]?' · '+CFG.sec[p.sa].ic:''}${p.wait?' · ⏳ next round':''}</span></span>${teamed?`<b style="padding:1px 7px;border-radius:6px;background:${p.tm==='A'?'#1a5fa0':'#a02a20'}">${p.tm}</b>`:''}${host&&teamed&&!p.host?`<button data-nsw="${esc(p.id)}" title="swap team" style="padding:2px 8px;border-radius:6px;border:1px solid #888;background:#234;color:#fff">⇄</button>`:''}<span style="font-weight:bold;color:${p.r?'#6f9':'#fc6'}">${p.r?'✅':'⏳'}</span></div>`;
 const open=4-pl.length;
 const mb=Object.entries(NMODES).map(([k,v])=>`<button data-nm="${k}" id="nm_${k}" ${host?'':'disabled'} style="padding:5px 9px;margin:2px;border-radius:6px;border:2px solid ${NET.mode===k?'#6f9':'#555'};background:${NET.mode===k?'#164':'#222'};color:#fff;font-size:.85em;opacity:${host||NET.mode===k?1:.55}">${v.n}</button>`).join('');
 const mapSel=host?`<select id="netMap" style="padding:4px;border-radius:6px;background:#0a1218;color:#fff;border:1px solid #2a8">${['random',...MAP_KEYS].map(k=>`<option value="${k}" ${NET.map===k?'selected':''}>${k==='random'?'🎲 Random':esc(MAPS[k].name)}</option>`).join('')}</select>`:`<b>${NET.map==='random'||!MAPS[NET.map]?'🎲 Random':esc(MAPS[NET.map].name)}</b>`;
 const all=conn&&pl.length>1&&pl.every(p=>p.r||p.wait),err=host?netModeErr(liveG().length+1):'',ok=all&&!err;
 const h=`<div style="font-size:.9em;opacity:.85">Room <b id="netCodeShow" style="letter-spacing:.2em;color:#6f9;font-size:1.4em">${esc(NET.code)}</b> · ${pl.length}/4 · ${conn?(NET.via==='relay'?'📡 relay':NET.via==='p2p'?'⚡ direct':'')+(host?'':' · '+NET.ping+' ms'):'not connected'}</div>
<div style="margin:4px 0 2px">${mb}</div><div style="font-size:.8em;opacity:.7">${md.d}${host?'':' (host picks)'}</div>
<div style="margin:4px 0;font-size:.9em">Map: ${mapSel}</div>
${!host&&L.inMatch?'<div style="color:#fc6;font-size:.85em">⚔ A match is in progress — you will join the next round.</div>':''}
<div id="netRows">${pl.map(row).join('')}${open>0?`<div style="background:#0a1218;border-radius:8px;padding:4px 8px;margin:3px 0;opacity:.7;font-size:.85em">⏳ ${open} open slot${open>1?'s':''} — friends open this page → 🌐 ONLINE → code → JOIN</div>`:''}</div>
<div style="margin-top:4px"><button data-nact="mech" style="${BTN};background:#456">🔧 MECH</button><button data-nact="ready" id="netReady" style="${BTN};background:${NET.myReady?'#1b6':'#a70'}">${NET.myReady?'✅ READY':'☐ READY'}</button>${host?`<button data-nact="start" id="netStart" ${ok?'':'disabled'} style="${BTN};background:${ok?'#1b6':'#344'};opacity:${ok?1:.6}">▶ START</button>`:''}${teamed&&host?`<button data-nact="free" id="netFree" style="${BTN};background:${free?'#357':'#333'};font-size:.85em">${free?'🔓 Team swaps ON':'🔒 Team swaps OFF'}</button>`:''}${teamed&&!host&&free?`<button data-nact="swap" id="netSwap" style="${BTN};background:#357">⇄ SWITCH TEAM</button>`:''}<button data-nact="leave" style="${BTN};background:#622">🚪 LEAVE</button></div>
${host&&conn&&!ok?`<div style="font-size:.8em;opacity:.75;margin-top:3px">${err||'Start unlocks when everyone is READY.'}</div>`:''}`;
 if(h!==NET.lobH){NET.lobH=h;nq('netLob').innerHTML=h;}}
// --- connection ---
function genCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=A[Math.random()*A.length|0];return s;}
function relayVc(from){return NET.vc[from]||(NET.vc[from]={relay:true,rid:from,get open(){return !!(NET.relay&&NET.relay.open);},send(m){if(NET.relay)NET.relay.send(m,from);},close(){}});}
function botify(R){if(!R)return;R.remote=false;R.ninp=null;if(!R.prof)R.prof=Object.assign({},CFG.diff[R.team==='b'?CFG.allyProfile:CFG.enemyProfile]||CFG.diff[Object.keys(CFG.diff)[0]]);R.role=R.role||'hunt';R.saBot=1;if(R.netName&&!/\(bot\)$/.test(R.netName))R.netName+=' (bot)';}
function hostDrop(g,why){if(!NET.G.includes(g))return;NET.G=NET.G.filter(x=>x!==g);if(g.c&&!g.c.relay)try{g.c.close();}catch(e){}if(g.R&&(mode==='play'||mode==='over'))botify(g.R);g.R=null;toast(why);netMsgSet('⚠ '+esc(why)+' They can rejoin with the same code.');netBcast();netLobRender();}
function hostRx(c,how,m){if(!m||!m.t||NET.role!=='host')return;let g=NET.G.find(x=>x.c===c);
 if(m.t==='hello'){const gid=String(m.gid||'').slice(0,16)||('x'+Math.random().toString(36).slice(2,8));let k=NET.G.find(x=>x.gid===gid);
  if(!k){if(NET.G.length>=3){try{c.send({t:'full'});}catch(e){}return;}k={gid,info:{},ping:0};if(!NET.tm[gid])NET.tm[gid]=teamFor();NET.G.push(k);}
  if(g&&g!==k)NET.G=NET.G.filter(x=>x!==g);
  if(k.c&&k.c!==c&&!k.c.relay)try{k.c.close();}catch(e){}k.c=c;k.via=how;g=k;}
 if(!g){if(c.relay&&m.t!=='bye'&&(!c.rhT||performance.now()-c.rhT>2000)){c.rhT=performance.now();try{c.send({t:'rehello'});}catch(e){}}return;}
 g.last=performance.now();hostMsg(g,m);}
function hostMsg(g,m){const nm=g.info.name||'A player';
 if(m.t==='hello'||m.t==='me'){const fresh=m.t==='hello';g.info=Object.assign(fresh?{}:g.info,m);if(!CFG.mechs[g.info.mech])g.info.mech=Object.keys(CFG.mechs)[0];if(!CFG.sec[g.info.sa])g.info.sa='';
  if(fresh&&!m.re){netMsgSet(`✅ <b>${esc(m.name)}</b> joined! (${NET.G.length+1}/4)`);if(g.R&&(mode==='play'||mode==='over')){botify(g.R);g.R=null;}g.inMatch=false;if(mode==='menu'&&!NET.editing)netShowLobby();}
  netBcast();netLobRender();netSave();netTryStart(false);return;}
 if(m.t==='bye'){hostDrop(g,nm+' left.');return;}
 if(m.t==='p'){gSend(g,{t:'q',ts:m.ts});return;}if(m.t==='q'){g.ping=Math.round(performance.now()-m.ts);return;}
 if(m.t==='quit'){if(g.R&&mode==='play'){botify(g.R);toast(nm+' left the match — a bot takes over');}g.R=null;g.inMatch=false;netBcast();return;}
 if(m.t==='i'){if(g.R)g.R.ninp=m;return;}
 if(m.t==='ab'){if(g.R)ability(g.R);return;}
 if(m.t==='sa'){hostSa(g,m);return;}
 if(m.t==='swap'){if(NET.free&&mode==='menu'){NET.tm[g.gid]=NET.tm[g.gid]==='A'?'B':'A';netLobChanged();}return;}}
function netHost(reuse){netClose();netMsgSet('Opening room…');const code=reuse||genCode();NET.code=code;NET.role='host';NET.via='';NET.myReady=false;NET.G=[];NET.vc={};let ready=0,tries=0;
 const shown=()=>{if(NET.code!==code)return;if(!ready++){netSave();netShowLobby();netMsgSet(reuse?'🔁 Room re-opened — waiting for friends to reconnect…':'');}};
 netShowLobby();
 let fails=0;const fail=w=>{if(++fails>=2&&NET.code===code)netErr('Could not open a room ('+w+'). Check your internet.',()=>netHost(reuse));};
 const openRelay=()=>relayOpen(code,'h').then(r=>{if(NET.code!==code)return r.close();NET.relay=r;r.on('data',(m,from)=>{if(NET.code===code&&from)hostRx(relayVc(from),'relay',m);});r.on('close',()=>{if(NET.code!==code)return;if(NET.relay===r){NET.relay=null;setTimeout(()=>{if(NET.code===code&&NET.role==='host')openRelay().catch(()=>{});},2000);}});shown();});
 if(!NORELAY)openRelay().catch(e=>{console.warn(e);fail('relay');});else fails++;
 const mkPeer=()=>{if(NET.code!==code)return;const pr=new Peer(NETPFX+code,{debug:0,config:ICE});NET.peer=pr;
  pr.on('open',shown);pr.on('disconnected',()=>{setTimeout(()=>{try{if(NET.peer===pr&&!pr.destroyed)pr.reconnect();}catch(e){}},1500);});
  pr.on('error',e=>{console.warn('peer',e.type);if(e.type==='unavailable-id'){try{pr.destroy();}catch(er){}if(NET.peer===pr)NET.peer=null;if(reuse&&++tries<20){setTimeout(mkPeer,3000);return;}if(!reuse&&!NET.G.length&&!ready){netHost();return;}}if(!ready&&e.type!=='unavailable-id')fail('p2p '+e.type);});
  pr.on('connection',c=>{c.on('data',m=>{if(NET.code===code)hostRx(c,'p2p',m);});const gone=w=>()=>{const g=NET.G.find(x=>x.c===c);if(g)hostDrop(g,(g.info.name||'A player')+w);};c.on('close',gone(' disconnected.'));c.on('error',gone(' — connection error.'));});};
 if(!NOP2P)netLib().then(mkPeer).catch(e=>fail('p2p lib'));else fails++;}
function netErr(msg,retry){const auto=NET.role==='client'&&AUTO_UNTIL>Date.now(),code=NET.code;netClose();
 if(auto){AUTO_N++;netOpen(`🔁 Reconnecting to room <b>${esc(code)}</b>… (try ${AUTO_N+1})<br><span style="opacity:.7;font-size:.85em">${msg}</span>`);nq('netHostBox').style.display='none';setTimeout(()=>{if(AUTO_UNTIL>Date.now()&&!NET.role&&netP.style.display==='flex')netJoin(code,true);},3000);return;}
 netOpen('❌ '+msg+'<br><button id="netRetry" style="margin-top:8px;padding:8px 18px;border-radius:8px;border:0;background:#c80;color:#fff;font-weight:bold">↻ RETRY</button>');const b=nq('netRetry');if(b)b.onclick=retry;}
async function netJoin(code,auto){code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==5)return netMsgSet('Enter the 5-character room code.');if(!auto)AUTO_UNTIL=0;netClose();
 NET.code=code;NET.role='client';NET.via='';NET.myReady=false;NET.lob=null;nq('netHostBox').style.display='none';netP.style.display='flex';if(!auto)netMsgSet('Connecting (direct)…');let done=false,relay=null,peerC=null;
 const pick=(c,how)=>{if(done||NET.code!==code)return;done=true;NET.conn=c;NET.via=how;NET.last=performance.now();c.on('data',m=>{if(NET.conn===c){if(!NET.heard){NET.heard=1;AUTO_UNTIL=0;AUTO_N=0;netSave();netMsgSet('');}netOnMsg(m);}});c.on('close',()=>{if(NET.conn===c)netLost('Lost connection to the host.');});
  if(c!==relay&&relay)relay.close();if(c!==peerC){try{peerC&&peerC.close();NET.peer&&NET.peer.destroy();}catch(e){}NET.peer=null;}
  netShowLobby();netMsgSet(`✅ Connected via ${how==='p2p'?'direct (P2P)':'relay'} — waiting for host…`);c.send(netMeMsg('hello'));};
 const relayP=NORELAY?Promise.reject(new Error('off')):relayOpen(code,'g'+GID).then(r=>{if(done||NET.code!==code){r.close();throw new Error('stale');}relay=r;NET.relay=r;return r;});relayP.catch(()=>{});
 const goRelay=why=>{relayP.then(r=>{if(done)return;pick(r,'relay');setTimeout(()=>{if(NET.code===code&&NET.conn===r&&!NET.heard)netErr(`Room <b>${code}</b> didn't answer. Check the code, and make sure the host's game tab is open and in front.`,()=>netJoin(code));},7000);}).catch(()=>{if(!done&&NET.code===code)netErr('Could not connect (direct '+why+', relay unavailable). Check your internet.',()=>netJoin(code));});};
 setTimeout(()=>{if(!done&&NET.code===code)goRelay('timed out');},5000);
 if(NOP2P)return goRelay('disabled');
 netLib().then(()=>{if(done||NET.code!==code)return;const pr=new Peer({debug:0,config:ICE});NET.peer=pr;
  pr.on('open',()=>{if(done)return;const c=pr.connect(NETPFX+code,{reliable:true,serialization:'json'});peerC=c;c.on('open',()=>pick(c,'p2p'));c.on('error',()=>goRelay('failed'));});
  pr.on('error',e=>{console.warn('peer',e.type);if(!done)goRelay(e.type==='peer-unavailable'?'not found':'failed');});}).catch(()=>goRelay('unavailable'));}
function netRestoreMode(){if(NET.spMode!=null){settings.mode=NET.spMode;NET.spMode=null;}}
function netClose(){const p=NET.peer,c=NET.conn,r=NET.relay,gs=NET.G.slice();try{netSend({t:'bye'});}catch(e){}NET.conn=null;NET.peer=null;NET.relay=null;NET.role=null;NET.G=[];NET.vc={};NET.lob=null;NET.units=[];NET.ev=[];NET.evR=[];NET.heard=0;NET.via='';NET.code='';NET.last=0;NET.myReady=false;NET.rm=false;NET.editing=false;NET.ffa=false;netRestoreMode();netS.style.display='none';setTimeout(()=>{for(const g of gs)if(g.c&&!g.c.relay)try{g.c.close();}catch(e){}try{c&&c.close();}catch(e){}try{r&&r.close();}catch(e){}try{p&&p.destroy();}catch(e){}},150);if(_mr){Math.random=_mr;_mr=null;}netUi();}
function netLost(why,final){if(!NET.role||NET.role==='host')return;const code=NET.code,inMatch=mode==='play'||mode==='over';netClose();if(inMatch)goMenu();toast(why);
 if(!final){AUTO_UNTIL=Date.now()+120e3;AUTO_N=0;netOpen(`⚠ ${esc(why)}<br>🔁 Reconnecting to room <b>${esc(code)}</b>…`);nq('netHostBox').style.display='none';setTimeout(()=>{if(AUTO_UNTIL>Date.now()&&!NET.role&&netP.style.display==='flex')netJoin(code,true);},2500);}
 else netOpen('⚠ '+esc(why));}
function netQuitMatch(){netSend({t:'quit'});goMenu();}
function netRematch(){NET.myReady=true;if(NET.role==='host')NET.rm=true;goMenu();netLobChanged();netMsgSet('↻ Rematch requested — starts when everyone is READY'+(NET.role==='host'?'.':' and the host starts.'));}
function netAfterMenu(){netRestoreMode();netS.style.display='none';if(!NET.editing)netShowLobby();if(NET.role==='host')netBcast();netUi();}
function netOver(){const on=!!NET.role;$('again').textContent=on?'↻ REMATCH':'PLAY AGAIN';$('tomenu').textContent=on?'🌐 BACK TO LOBBY':'MAIN MENU';}
function netTryStart(manual){if(NET.role!=='host')return;const G=liveG();const say=t=>{if(manual)netMsgSet(t);};
 if(!G.length)return say('Waiting for friends to join.');const er=netModeErr(G.length+1);if(er)return say(er);
 if(!(NET.myReady&&G.every(g=>g.info.ready)))return say('Everyone must be READY.');if(!manual&&!NET.rm)return;
 if(mode!=='menu')return;NET.rm=false;NET.myReady=false;G.forEach(g=>g.info.ready=false);netMsgSet('');netStartHost();}
// --- messages (guest side; host side is hostMsg) ---
function netOnMsg(m){NET.last=performance.now();if(!m||!m.t)return;
 if(m.t==='bye'){netLost(mode==='play'?'The host left the match.':'The host left.',!!m.x);return;}if(m.t==='p'){netSend({t:'q',ts:m.ts});return;}if(m.t==='q'){NET.ping=Math.round(performance.now()-m.ts);return;}
 if(m.t==='quit'){if(mode==='play'||mode==='over'){toast('The host ended the match');goMenu();}netMsgSet('⚠ The host ended the match — everyone is back in the lobby.');return;}
 if(m.t==='rehello'){netSend(Object.assign(netMeMsg('hello'),{re:1}));return;}
 if(m.t==='lob'){NET.lob=m;NET.mode=NMODES[m.mode]?m.mode:'coop';NET.map=m.map||'random';netLobRender();netSave();}
 else if(m.t==='full'){netMsgSet('❌ That room is full (4 players).');}
 else if(m.t==='start'){NET.myReady=false;netStartClient(m);}else if(m.t==='s')netSnap(m);
 else if(m.t==='sar')secReply(m);
 else if(m.t==='end'){if(mode==='play'&&m.mid===NET.mid)end(!!m.win,m.why);}}
function netStartHost(){const G=liveG();if(!G.length)return;for(const g of G)if(!CFG.mechs[g.info.mech])g.info.mech=Object.keys(CFG.mechs)[0];const md=NMODES[NET.mode]||NMODES.coop;
 if(NET.mode==='duo'){for(const s of['A','B']){const o=s==='A'?'B':'A';let n=(s==='A'?1:0)+G.filter(g=>NET.tm[g.gid]===s).length;for(const g of G){if(n<=2)break;if(NET.tm[g.gid]===s){NET.tm[g.gid]=o;n--;}}}}
 NET.seed=(Math.random()*1e9)|0;NET.mid=(NET.mid|0)+1;if(NET.spMode==null)NET.spMode=settings.mode;settings.mode=md.sm;NET.ts=md.ts;NET.editing=false;netHide();NET.keep=true;newGame();NET.keep=false;netBcast();netUi();}
function netSetup(){const md=NET.mode,ffa=md==='ffa',G=liveG();NET.ffa=ffa;const SZ=A-12,xs=[[SZ,0,-Math.PI/2],[-SZ,0,Math.PI/2],[0,-SZ,0]];let xi=0;
 G.forEach((g,gi)=>{const hi=g.info,it=md==='coop'?'b':(md==='duel'||ffa)?'r':(NET.tm[g.gid]==='B'?'r':'b');
  const bots=U.filter(u=>u!==P&&!u.remote&&u.team===it&&!u.isDome);const old=bots[bots.length-1];
  let slots=hi.slots;try{if(!Array.isArray(slots)||slots.length!==CFG.slots[hi.mech].length||slots.some(k=>!CFG.weapons[k]))slots=aiSlots(hi.mech);}catch(e){slots=aiSlots(hi.mech);}
  const R=makeUnit(it,hi.mech,slots,null);try{applyPaint(R,hi.paint||'default');}catch(e){}
  if(old){const idx=U.indexOf(old);spawn(R,old.g.position.x,old.g.position.z,old.yaw);U.pop();S.remove(old.g);U[idx]=R;}else{const q=xs[xi++%3];spawn(R,q[0],q[1],q[2]);}
  if(ffa)R.team='f'+(gi+1);makePlate(R,R.team===P.team);R.remote=true;R.netName=hi.name||'Pilot';R.gid=g.gid;R.sa=CFG.sec[hi.sa]?hi.sa:'';R.saBot=0;R.saCd=0;R.sx={};g.R=R;g.inMatch=true;g.paint=hi.paint;});
 NET.units=U.filter(u=>!u.isDome);NET.units.forEach((u,i)=>u.nid=i);NET.my=-1;
 const units=NET.units.map(u=>{const g=u.remote&&G.find(x=>x.R===u);return {team:u.team,type:u.type,slots:u.ws.map(w=>w.k),max:Math.round(u.max),p:[+u.g.position.x.toFixed(2),+u.g.position.z.toFixed(2),+u.yaw.toFixed(3)],paint:u===P?paintOf(loadout.mech):g?g.paint||null:null,nm:u===P?myName():g?u.netName:null};});
 for(const g of G)gSend(g,{t:'start',mid:NET.mid,map:lastMap,seed:NET.seed,mode:NET.mode,smode:settings.mode,you:g.R.nid,myT:g.R.team,host:P.nid,units});
 netS.style.display='block';}
function netEndAll(win,why){const alive=U.filter(u=>u.alive&&!u.isDome),w0=alive[0];const wn=w0?(w0===P?myName():w0.netName||'A bot'):'';
 for(const g of NET.G){if(!g.inMatch||!g.R)continue;let w,y;if(NET.ffa){w=g.R.alive&&alive.length<=1;y=w?'Last mech standing!':(wn?esc(wn)+' won the free-for-all':'Everyone was destroyed');}else{w=(g.R.team==='b')===!!win;y=w===!!win?why:(w?'All enemies destroyed':'Your team was destroyed');}gSend(g,{t:'end',mid:NET.mid,win:w,why:y});g.inMatch=false;}}
{const o0=outcome;outcome=function(){if(NET.role==='host'&&NET.ffa){const al=U.filter(u=>u.alive&&!u.isDome);if(al.length<=1)return[P.alive,P.alive?'Last mech standing!':((al[0]&&al[0].netName?al[0].netName:'Nobody')+' won the free-for-all')];return null;}return o0();};}
function netStartClient(m){NET.editing=false;netHide();if(NET.spMode==null)NET.spMode=settings.mode;NET.keep=true;clearWorld();NET.keep=false;NET.mode=m.mode;NET.mid=m.mid;NET.ffa=m.mode==='ffa';NET.seed=m.seed;settings.mode=m.smode||'team';lastMap=m.map;netRand(1,0);loadMap(m.map,m.seed);netRand(0);clock=0;endT=-1;result=null;STATS.shots=STATS.hits=STATS.kills=0;try{chStart();}catch(e){}
 const tm=t=>t===m.myT?'b':'r';NET.my=m.you;NET.myT=m.myT;
 NET.units=m.units.map((d,i)=>{const me=i===m.you;const u=makeUnit(tm(d.team),d.type,d.slots,null);if(me)applyPaint(u,paintOf(loadout.mech));else if(d.paint){try{applyPaint(u,d.paint);}catch(e){}}spawn(u,d.p[0],d.p[1],d.p[2]);u.nid=i;u.sx={};u.saCd=0;if(!me){u.max=d.max;u.hp=d.max;makePlate(u,u.team==='b');}if(d.nm&&!me)u.netName=d.nm;return u;});
 P=NET.units[m.you];P.isPlayer=true;P.pitch=.05;camYaw=P.yaw;P.sa=saOf(loadout.mech);
 clearSpawns();netRand(1,1);buildEnvDetail();netRand(0);showBases(false);mode='play';showUI();mapBanner();drawMiniBase();try{lockAim();}catch(e){}netS.style.display='block';netUi();}
const _nv=new THREE.Vector3(),_na=new THREE.Vector3();
function netSnap(m){if((mode!=='play'&&mode!=='over')||(m.mid!=null&&m.mid!==NET.mid))return;const us=NET.units;m.u.forEach((d,i)=>{const u=us[i];if(!u)return;
 if(d[16]!==undefined)secUnpack(u,d[16]);
 if(i===NET.my){u.hp=Math.min(u.max,d[6]*u.max/Math.max(1,d[12]||u.max));if(d[17]!=null&&Math.abs((u.saCd||0)-d[17])>.75)u.saCd=d[17];if(!d[7]&&u.alive)killUnit(u,null);return;}
 u.net=d;u.hp=d[6];if(u.plate)updPlate(u);u.shieldOn=!!d[8];u.cloakT=d[9];if(!d[7]&&u.alive)killUnit(u,null);});
 secFieldsSync(m.f||[]);
 for(const e of m.e||[]){if(e[0]===NET.my)continue;const u=us[e[0]];if(!u||!u.alive)continue;const w=u.ws[e[1]];if(!w)continue;w.fireCd=0;w.reload=0;w.ammo=Math.max(w.ammo,1);w.chg=0;_na.set(e[2],e[3],e[4]);aimGuns(u,_na,1);try{fireWeapon0(u,w,_na.clone(),e[5]>=0?us[e[5]]:null);}catch(er){}}}
const aDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d;};
function netInterp(u,dt){const d=u.net;if(!d)return;const k=1-Math.exp(-12*dt);_nv.set(d[0],d[1],d[2]);const p=u.g.position;
 u.vel.set((_nv.x-p.x)*k/Math.max(dt,1e-3),0,(_nv.z-p.z)*k/Math.max(dt,1e-3));p.lerp(_nv,k);u.yaw+=aDiff(u.yaw,d[3])*k;u.legYaw+=aDiff(u.legYaw,d[4])*k;u.tYaw+=aDiff(u.tYaw,d[11])*k;u.pitch+=(d[5]-u.pitch)*k;u.air=d[1]>.3;
 if(d[10]!=null){_na.set(d[13],d[14],d[15]);aimGuns(u,_na,dt);}}
function netRemote(u,dt){const I=u.ninp;if(!I)return;const k=1-Math.exp(-15*dt);_nv.set(I.p[0],I.p[1],I.p[2]);u.g.position.lerp(_nv,k);u.vel.set(I.v[0],I.v[1],I.v[2]);
 u.yaw=I.yaw;u.tYaw=I.ty;u.legYaw=I.ly;u.pitch=I.pi;const AP=_na.set(I.a[0],I.a[1],I.a[2]);aimGuns(u,AP,dt);u.netAim=I.a;
 for(const w of u.ws){const W=w.W,on=w.s<0?I.fL:I.fR;if(W.spin)w.spin=on&&!w.reload?Math.min(1,w.spin+dt/W.spin):Math.max(0,w.spin-dt);
  if(on&&w.fireCd<=0&&w.ammo>0&&!w.reload&&(!W.spin||w.spin>.3)){aimGuns(u,AP,1);fireWeapon(u,w,AP.clone(),I.lk>=0?NET.units[I.lk]:null);}}}
function netFire(u,w,a,h){if(u.nid==null||!a||NET.ev.length>80)return;NET.ev.push([u.nid,u.ws.indexOf(w),+a.x.toFixed(2),+a.y.toFixed(2),+a.z.toFixed(2),h&&h.nid!=null?h.nid:-1]);}
const r2=v=>Math.round(v*100)/100;
function netSnapUnits(AP){return NET.units.map(u=>{const p=u.g.position,a=u===P?(AP||p):(u.netAim?{x:u.netAim[0],y:u.netAim[1],z:u.netAim[2]}:(u.tgt&&u.tgt.g?u.tgt.g.position:null));return [r2(p.x),r2(p.y),r2(p.z),r2(u.yaw),r2(u.legYaw||0),r2(u.pitch||0),Math.round(u.hp),u.alive?1:0,u.shieldOn?1:0,r2(u.cloakT||0),a?1:null,r2(u.tYaw||0),Math.round(u.max),a?r2(a.x):0,a?r2(a.y+(a===p||u.tgt&&a===u.tgt.g.position?3:0)):0,a?r2(a.z):0,secPack(u),Math.round((u.saCd||0)*10)/10];});}
function netTick(dt,AP){if(!NET.role)return;const now=performance.now();
 if(NET.role==='host'){const MG=NET.G.filter(g=>g.inMatch&&g.R&&g.c&&g.c.open);
  if(MG.length){const per=MG.length>=3?80:66;if(now-NET.sT>=per){NET.sT=now;const u=netSnapUnits(AP),f=secFieldsPack(),ev=NET.ev;NET.ev=[];
   for(const g of MG)if(!g.c.relay)gSend(g,{t:'s',mid:NET.mid,u,e:ev,f});
   if(MG.some(g=>g.c.relay)){NET.evR.push(...ev);if(NET.evR.length>150)NET.evR.splice(0,NET.evR.length-150);if(now-NET.rT>=100&&NET.relay){NET.rT=now;try{NET.relay.send({t:'s',mid:NET.mid,u,e:NET.evR,f},'*');}catch(e){}NET.evR=[];}}else NET.evR=[];}}else NET.ev=[];}
 else if(NET.conn){if(now-NET.pT>1000){NET.pT=now;netSend({t:'p',ts:now});}
  if(now-NET.iT>=(NET.via==='relay'?83:50)&&P){NET.iT=now;const p=P.g.position,a=AP||p;netSend({t:'i',p:[r2(p.x),r2(p.y),r2(p.z)],v:[r2(P.vel.x),r2(P.vel.y||0),r2(P.vel.z)],yaw:r2(P.yaw),ty:r2(P.tYaw||0),ly:r2(P.legYaw||0),pi:r2(P.pitch||0),a:[r2(a.x),r2(a.y),r2(a.z)],fL:P.alive&&!!NET.fL,fR:P.alive&&!!NET.fR,lk:P.lockTgt&&P.lockTgt.nid!=null&&P.lockT>=(P.W.lockTime||9)?P.lockTgt.nid:-1});}}
 if((NET.stT=(NET.stT||0)+dt)>.25){NET.stT=0;const host=NET.role==='host',G=NET.G;const pg=host?Math.max(0,...G.map(g=>g.ping|0)):NET.ping;netS.textContent=`🟢 ONLINE ${(NMODES[NET.mode]||{n:''}).n} · ${host?'HOST · '+(G.length+1)+' players':'GUEST'} · ${host?(G.some(g=>g.via==='relay')?'📡':'')+(G.some(g=>g.via==='p2p')?'⚡':''):(NET.via==='relay'?'📡 RELAY':'⚡ P2P')} · room ${NET.code} · ping ${pg} ms`;netS.style.color=pg>200?'#fd4':'#8f8';}}
window.__net={fire:b=>{inp.fire=b;},face:u=>{const d=u.g.position.clone().sub(P.g.position);P.yaw=P.tYaw=Math.atan2(d.x,d.z);camYaw=P.yaw;},open:netOpen,host:netHost,join:netJoin,close:netClose,lobby:netShowLobby,edit:netEditMech,rematch:netRematch,quit:netQuitMatch,saved:netSaved,ui:netUi,pl:netPl,get NET(){return NET;}};
setInterval(()=>{if(!NET.role)return;const now=performance.now();
 if(NET.role==='host'){for(const g of NET.G.slice()){if(g.last&&now-g.last>10000)hostDrop(g,(g.info.name||'A player')+' timed out.');else gSend(g,{t:'p',ts:now});}}
 else if(NET.conn&&NET.conn.open&&NET.last&&now-NET.last>10000){netLost('Connection lost (no data for 10 s).');return;}
 netLobRender();netUi();if((NET.sT2=(NET.sT2||0)+1)%3===0){netSave();if(NET.role==='host')netBcast();else if(NET.conn&&mode==='menu'){const sg=JSON.stringify(netMeMsg('me'));if(sg!==_sig){_sig=sg;netSendMe();}}}
 if(NET.role==='client'&&NET.conn&&NET.conn.open&&mode!=='play'&&now-NET.pT>1000){NET.pT=now;netSend({t:'p',ts:now});}},1000);
addEventListener('pagehide',()=>{try{netSend({t:'bye'});}catch(e){}});
// remembered room: auto-rejoin shortly after a reload, otherwise offer a button
setTimeout(()=>{const r=netSaved();if(!r||NET.role)return;if(curProf()&&mode==='menu'&&Date.now()-r.t<180e3)netReconnect(r);else netUi();},1200);
// ---------- loop ----------
const fwd=new THREE.Vector3(),rt=new THREE.Vector3();
function outcome(){const md=settings.mode,b=mates('b').length,r=mates('r').length;
 if(md==='base'){if(BASES.r.prog>=1)return[true,'Enemy base captured'];if(BASES.b.prog>=1)return[false,'Your base was captured'];}
 if(!r)return[true,md==='duel'?'Opponent destroyed':'All enemies destroyed'];if(!b)return[false,md==='duel'?'You were destroyed':'Your team was destroyed'];return null;}
function end(win,why){if(NET.role==='host')netEndAll(win,why);mode='over';PAUSED=false;ambStop();sfx(win?'win':'lose');setTimeout(()=>sfx('coins',{n:win?8:4}),900);showUI();const md=settings.mode;$('mt').textContent=win?'VICTORY':'DEFEAT';$('mt').style.color=win?'#6f9':'#f66';
 $('mm').textContent=`${CFG.modes[md].name} ${CFG.modes[md].sub}${md==='duel'?' · '+CFG.diff[settings.diff].name:''}`;$('ml').textContent=why;
 $('mk').textContent=`Kills: ${STATS.kills}  ·  Team kills: ${U.filter(u=>u.team==='b').reduce((a,u)=>a+u.kills,0)}  ·  Accuracy: ${STATS.shots?Math.round(STATS.hits/STATS.shots*100):0}%`;
 document.exitPointerLock&&document.exitPointerLock();inp.fire=false;inp.mFire=false;
 const rw=reward(win,why);LAST_REWARD=rw;const ce=$('coins');ce.innerHTML=rw.rows.map((r,i)=>`<div class="cr" style="animation-delay:${i*.25}s"><span>${r[0]}</span><b>${r[1]>=0?'+':''}${r[1]}</b></div>`).join('')+`<div class="ct"><span>TOTAL</span><b>🪙 +<i id="cup">0</i></b></div><div class="cb">Balance: 🪙 <i id="cbal">${SAVE.coins-rw.tot}</i></div>`+chResults();
 const t0=performance.now(),dur=1200+rw.rows.length*250,b0=SAVE.coins-rw.tot;cancelAnimationFrame(cupRAF);
 const step=n=>{const f=Math.min(1,(n-t0)/dur),e=1-Math.pow(1-f,3);$('cup').textContent=Math.round(rw.tot*e);$('cbal').textContent=Math.round(b0+rw.tot*e);if(f<1)cupRAF=requestAnimationFrame(step);};cupRAF=requestAnimationFrame(step);netOver();}
let LAST_REWARD=null,cupRAF=0;
let last=performance.now(),menuA=0,fpsT=0,fpsN=0,fps=60,lowT=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
 fpsT+=dt;fpsN++;if(fpsT>=.5){fps=fpsN/fpsT;fpsT=fpsN=0;autoTick(.5);if(mode==='play'&&settings.gfx==='high'&&settings.gfxSel!=='auto'&&!window.__noAuto){lowT=fps<CFG.gfx.autoFallbackFps?lowT+.5:0;if(lowT>=CFG.gfx.autoWindow){setGfx('low');toast('Low fps: graphics switched to LOW');}}}
 if(mode==='play'&&!PAUSED)update(dt);else if(mode==='menu')menuTick(dt);else if(mode==='over'){for(const u of U){animMech(u,dt);}}
 updFx(dt);pfxUpd(dt);updAmb(dt);if(mode!=='menu')cam(dt);skyDome.position.copy(C.position);if(mode==='play'&&!PAUSED)drawMini();R.render(S,C);}
let AP0=null;function update(dt){clock+=dt;const k=inp.keys;
 if(P.alive){let mx=inp.mx+((k.KeyD?1:0)-(k.KeyA?1:0)),mz=inp.mz+((k.KeyS?1:0)-(k.KeyW?1:0));
  if(k.ArrowLeft)P.yaw+=2*dt;if(k.ArrowRight)P.yaw-=2*dt;
  fwd.set(Math.sin(P.yaw),0,Math.cos(P.yaw));rt.set(-fwd.z,0,fwd.x);tickUnit(P,dt);tuneTick();
  const v=_t.set(0,0,0).addScaledVector(fwd,-mz).addScaledVector(rt,mx);const l=v.length();if(l>1)v.divideScalar(l);drive(P,v.x,v.z,dt);
  torso(P,P.yaw,dt,CFG.move.torsoK,CFG.move.torsoC);
  // FIRE = all mounts; L / R buttons (or 1 / 2 keys) fire one side's group. Each mount has its own cadence, ammo and reload.
  const fa=inp.fire||inp.mFire||k.KeyF,fL=fa||inp.fireL||k.Digit1||k.KeyQ,fR=fa||inp.fireR||k.Digit2||k.KeyC;
  updateLock(dt);cam(0);const AP=playerAim();AP0=AP;NET.fL=fL;NET.fR=fR;aimGuns(P,AP,dt);let snapped=false;
  for(const w of P.ws){const W=w.W,on=w.s<0?fL:fR;if(W.spin)w.spin=on&&!w.reload?Math.min(1,w.spin+dt/W.spin):Math.max(0,w.spin-dt);
   if(on&&w.fireCd<=0&&w.ammo>0&&!w.reload&&(!W.spin||w.spin>.3)){if(!snapped){aimGuns(P,AP,1);snapped=true;}const locked=W.homing&&P.lockTgt&&P.lockT>=W.lockTime;fireWeapon(P,w,AP,locked?P.lockTgt:null);}}}
 else{P.vel.set(0,0,0);lockEl.style.display='none';}
 const NC=NET.role==='client';for(const u of U)if(u!==P&&u.alive){if(NC){if(!u.isDome)netInterp(u,dt);continue;}tickUnit(u,dt);if(u.remote)netRemote(u,dt);else if(!TF('aiOff'))aiTick(u,dt);}
 if(!NC)sepUnits();envTick(dt);
 for(const u of U){if(!u.alive)u.vel.set(0,0,0);animMech(u,dt);pulseTick(u,dt);}
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
   else if(hit){if(hitU){hurt(hitU,b.dmg*Math.max(.5,mult)*(hitU.isDome&&b.cm>.6?.6/b.cm:1),pos,b.src);if(W.dot)naniteHit(hitU,W,b.src,b.dmg);if(W.tether)tetherHit(hitU,W,b.src);if(W.push)pushU(hitU,b.v,W.push*(.6+.8*(b.cm||1)));if(W.jam)jamHit(hitU,W,b.src);}if(W.jam)fx(pos,1.3,0xffc020,{grow:2.4,life:.3,op:.8});if(W.push)fx(pos,1.6*(1+((b.cm||1)-1)*.25),0x60f0ff,{grow:3,life:.3,op:.7});if(W.tether)fx(pos,1.3,0xc090ff,{grow:2.5,life:.35});if(W.dot){fx(pos,1,0x50ff80,{grow:2,life:.3});}else if(!hitU&&!gfxLow())fx(pos,1.2,0x9a927e,{grow:2,life:.5,op:.45,vy:1.5});const rg=W===CFG.weapons.railgun;boom(pos,rg?1.2:.5,rg?0x80e8ff:0xffdd55);sparks(pos);}
   S.remove(b.m);B.splice(i,1);}}
 tickFields(dt);
 if(settings.mode==='base')tickBases(dt);
 if(!P.alive&&(!SPEC||!SPEC.alive))SPEC=mates('b')[0]||SPEC;
 if(NC){}else if(endT<0){const o=outcome();if(o){result=o;endT=clock+1.6;}}else if(clock>=endT){end(result[0],result[1]);return;}
 netTick(dt,AP0);sndWatch(dt);hud();}
// lock-on: enemy nearest the crosshair, within cone, range and line of sight
const lockEl=$('lock'),scr=new THREE.Vector3();
function updateLock(dt){const hw=P.ws.find(w=>w.W.homing),W=hw?hw.W:P.W;if(!W.homing){lockEl.style.display='none';return;}
 let best=null,bd=W.lockCone;const eye=P.g.position.clone();eye.y+=3.3;
 for(const e of foes('b')){if(cloakHid(e,eye))continue;scr.copy(e.g.position);scr.y+=3;const dist=scr.distanceTo(eye);if(dist>W.range)continue;scr.project(C);if(scr.z>1)continue;const d=Math.hypot(scr.x-AIMNDC.x,(scr.y-AIMNDC.y)*.7);if(d<bd&&los(eye,e.g.position.clone().setY(e.g.position.y+3.3))){bd=d;best=e;}}
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
 if(mode==='play')buildEnvDetail();S.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);}});if(mode==='menu')renderMenu();}
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
 const frac=w=>w.W.chT&&!w.reload&&!w.chg&&w.pc>0?w.pc:w.W.emp&&w.chg?'FIRING '+Math.round(Math.min(1,(clock-w.chg)/w.W.charge)*100)+'%':w.W.beam?(w.reload?1-w.reload/w.W.reload:1-(w.heat||0)):w.reload?1-w.reload/w.W.reload:w.ammo/w.W.mag,grp=g=>{const a=P.ws.filter(w=>w.s===g);return a.length?a.reduce((t,w)=>t+frac(w),0)/a.length:0;};
 {let pi=$('pulInd');if(!pi){pi=document.createElement('div');pi.id='pulInd';pi.innerHTML='<b></b><i><s></s></i>';pi.style.cssText='position:fixed;left:50%;top:calc(50% + 38px);transform:translateX(-50%);z-index:20;pointer-events:none;font:700 12px system-ui;color:#9ff;text-align:center;text-shadow:0 0 4px #000;display:none';pi.querySelector('i').style.cssText='display:block;width:90px;height:6px;margin:3px auto 0;background:#0008;border:1px solid #6dd;border-radius:3px;overflow:hidden';pi.querySelector('s').style.cssText='display:block;height:100%;width:0;background:#4bd';document.body.appendChild(pi);}
  const pw=mode==='play'&&P&&P.alive?P.ws.filter(w=>w.W.chT):[];pi.style.display=pw.length?'block':'none';if(pw.length){const rows=[];for(const nm of['push','emp']){const g=pw.filter(w=>w.W[nm]);if(!g.length)continue;const w=g.reduce((a,b)=>(b.reload?0:b.pc||0)>(a.reload?0:a.pc||0)?b:a),pc=w.reload?0:Math.min(1,w.pc||0),mx=pc>=1,W=w.W,lab=nm==='push'?'PULSE':'EMP',x=chgPct(w)+'%';const col=`rgb(${Math.round(80+175*pc)},${Math.round(200+55*pc)},255)`;let seg='';for(let k=0;k<10;k++)seg+=`<span style="display:inline-block;width:8px;height:6px;margin:0 1px;border-radius:2px;background:${(k+1)/10<=pc+.001?col:'#0007'};box-shadow:${mx?'0 0 6px '+col:'none'}"></span>`;rows.push(`<div style="color:${mx?'#fff':'#9ff'};${mx?'animation:none;text-shadow:0 0 8px #7ff,0 0 3px #000':''}">${mx?'⚡ ':''}${lab} ${mx?'MAX ':''}${x}${W.rMax?' · '+Math.round(effR(w))+' m':''}</div><div style="margin:2px 0 4px">${seg}</div>`);}pi.innerHTML=rows.join('');}}

 {let ei=$('empInd');if(!ei){ei=document.createElement('div');ei.id='empInd';ei.textContent='⚡ EMP — ABILITY OFFLINE';document.body.appendChild(ei);}ei.style.display=mode==='play'&&P&&P.empT>0?'block':'none';if(P&&P.empT>0)ei.textContent='⚡ EMP — ABILITY OFFLINE '+P.empT.toFixed(1)+'s';}
 if((hudN&3)===0){$('gunt').innerHTML=P.ws.map(w=>`<div class="wl${w.reload?' rl':''}${w.W.beam?' hb'+((w.heat||0)>.7?' hot':''):''}"><b>${w.s<0?'◀L':'R▶'}</b><span class="szb z${w.W.size}">${w.W.size}</span> ${w.W.name}<em>${w.W.beam?(w.reload?'OVERHEAT '+w.reload.toFixed(1)+'s':'HEAT '+Math.round((w.heat||0)*100)+'%'):w.reload?'RELOAD '+w.reload.toFixed(1)+'s':w.W.chT&&!w.reload&&w.pc>0?(w.pc>=1?'MAX 100%':'CHG '+chgPct(w)+'%')+(w.W.rMax?' '+Math.round(effR(w))+'m':'')+' '+w.ammo+'/'+w.W.mag:w.ammo+'/'+w.W.mag}</em><i style="width:${frac(w)*100}%"></i></div>`).join('');
  const all=P.ws.reduce((t,w)=>t+frac(w),0)/P.ws.length,rl=P.ws.every(w=>w.reload);gunBar.style.width=all*100+'%';gunBar.style.background=rl?'#fa4':'#ff6';ring(bMG,all,rl?'#fa48':'#f448');bMG.textContent=rl?'RELOAD':'FIRE';
  ring($('bFL'),grp(-1),'#fc48');ring($('bFR'),grp(1),'#fc48');}
 let af=1,at='',ac='#6cf';
 if(T.shield){af=P.shieldHP/T.shield.hp;if(P.shieldOn){at=P.shA>=1?`SHIELD RAISED ${Math.ceil(P.shieldHP)} HP — tap to lower`:'RAISING SHIELD…';ac='#3df';}else if(P.abCd>0){af=1-P.abCd/T.shield.cd;at=`SHIELD BROKEN ${P.abCd.toFixed(1)}s`;ac='#678';}else if(P.shieldHP<T.shield.hp*T.shield.min){at=`SHIELD RECHARGING ${Math.round(af*100)}%`;ac='#678';}else at=P.shA>0?'LOWERING…':`SHIELD READY ${Math.round(af*100)}%`;}
 else if(T.lockdown){if(P.abCd>0){af=1-P.abCd/T.lockdown.cd;at=`LOCKDOWN RECHARGING ${P.abCd.toFixed(1)}s`;ac='#678';}else{at='LOCKDOWN READY — aim & tap';ac='#b8f';}}
 else if(T.dash){if(P.abCd>0){af=1-P.abCd/T.dash.cd;at=`DASH COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='DASH READY';}
 else if(T.jump){if(P.abCd>0){af=1-P.abCd/T.jump.cd;at=`JUMP COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else at='JUMP READY';}
 else if(T.dome){const D=T.dome;if(P.domeOn){af=P.domeT/D.dur;at=`FORCE DOME ${Math.max(0,P.domeT).toFixed(1)}s · ${Math.ceil(P.domeHP)} HP — tap to lower`;ac=(P.domeT<1.5||P.domeHP<D.hp*.3)&&Math.sin(clock*20)>0?'#f86':'#5ef';}else if(P.abCd>0){const br=P.domeHP<=0;af=1-P.abCd/(br?D.brokeCd:D.cd);at=`${br?'DOME BROKEN':'DOME RECHARGING'} ${P.abCd.toFixed(1)}s`;ac='#678';}else at=`DOME READY · ${D.dur}s / ${D.hp} HP`;}
 else if(T.dive){if(P.diving){at='DIVE STRIKE!';ac='#fb5';}else if(P.air&&P.g.position.y-groundAt(P.g.position.x,P.g.position.z,P.g.position.y)>2.5){if(P.abCd>0){af=1-P.abCd/T.dive.cd;at=`DIVE COOLDOWN ${P.abCd.toFixed(1)}s`;ac='#678';}else{at='DIVE READY — aim & tap';ac='#fb5';}}else{af=1-(P.lchCd||0)/T.fly.lcd;at=P.lchCd>0?`LAUNCH ${P.lchCd.toFixed(1)}s`:'LAUNCH READY · hold FLY to hover';ac=P.lchCd>0?'#678':'#6cf';}}
 else if(T.cloak){const K=T.cloak;if(P.cloakT>0){af=P.cloakT/K.dur;at=P.revT>0?`CLOAK FLICKER ${P.cloakT.toFixed(1)}s — revealed!`:`CLOAKED ${P.cloakT.toFixed(1)}s — tap to drop`;ac=P.revT>0&&Math.sin(clock*20)>0?'#f86':'#b9f';}else if(P.abCd>0){af=1-P.abCd/K.cd;at=`CLOAK RECHARGING ${P.abCd.toFixed(1)}s`;ac='#678';}else{at='CLOAK READY';ac='#b9f';}}
 else if(T.regen){const t=clock-P.lastHit;af=P.hp>=P.max?1:Math.min(1,t/T.regen.delay);at=P.hp>=P.max?'REGEN: FULL':(af>=1?`REGENERATING +${T.regen.rate}/s`:`REGEN IN ${(T.regen.delay-t).toFixed(1)}s`);ac=af>=1?'#6f9':'#678';}
 bAB.classList.toggle('on',!!((T.shield&&P.shieldOn)||(T.dome&&P.domeOn)||P.diving));bAB.textContent=T.shield?(P.shieldOn?'LOWER':'SHIELD'):T.dome?(P.domeOn?'LOWER':'DOME'):T.dive?(P.air&&P.g.position.y-groundAt(P.g.position.x,P.g.position.z,P.g.position.y)>2.5?'DIVE':'LAUNCH'):bAB.textContent;hudAir();abBar.style.width=af*100+'%';abBar.style.background=ac;$('abt').textContent=at;ring(bAB,af,ac+'8');
 if(DESK&&(hudN&3)===0)deskPanel(at,af,ac);
 if(DESK){const pl=$('plk');const need=P.alive&&document.pointerLockElement!==R.domElement;pl.style.display=need?'block':'none';if(need)pl.textContent=performance.now()-plkErrT<1500?'🖱 Click again to take aim control':'🖱 Click to aim — mouse controls the turret';}
 if((hudN&3)===0&&P.alive){const ap=playerAim(),d=ap.distanceTo(P.g.position);const mr=Math.round(Math.max(...P.ws.map(w=>effR(w)))),nIn=P.ws.filter(w=>d<=effR(w)).length,inR=nIn>0;rng.textContent=`${Math.round(d)}m · ${nIn}/${P.ws.length} in range (max ${mr}m)${inR?'':' OUT OF RANGE'}`;rng.style.color=inR?'#8f8':'#f66';$('xh').style.borderColor=aimOnEnemy?(inR?'#f33':'#f668'):(inR?'#fffa':'#fff6');}
 $('xh').classList.toggle('hit',hitMarkT>0);hitMarkT-=1/60;}
// ---------- MENU ----------
const menu=$('menu'),mc=$('mc');let menuStep='title';
const statMax={hp:1300,speed:10};const bar=(l,v,t)=>`<div class="st"><span>${l}</span><div class="sb"><i style="width:${Math.max(4,v*100)}%"></i></div><em>${t}</em></div>`;
function preview(){if(P)S.remove(P.g);P=makeUnit('b',loadout.mech,slotsOf(loadout.mech),null);applyPaint(P,paintOf(loadout.mech));mergeUnit(P);P.g.position.set(0,0,48);P.tYaw=P.legYaw=Math.PI;P.yaw=Math.PI;P.pitch=.05;initFeet(P);animMech(P,.016);}
let LINEUP=null;
function menuTick(dt){menuA+=dt*.35;if(LINEUP){for(const u of LINEUP){for(const w of u.ws)w.spin=1;animMech(u,dt);}C.position.set(9,7.5,28);C.lookAt(-1,2.4,48);return;}if(!P)return;const p=P.g.position;P.tYaw=Math.PI+Math.sin(menuA*.8)*.6;P.legYaw=Math.PI;for(const w of P.ws)w.spin=w.W.spin?1:0;animMech(P,dt);
 const a=Math.PI*0.75+menuA*0.3;const cx=p.x+Math.sin(a)*9,cz=p.z+Math.cos(a)*9;C.position.set(cx,4.5,cz);
 const lx=-Math.cos(a),lz=Math.sin(a);const side=innerWidth>700?2.8:0;C.lookAt(p.x+lx*side,3,p.z+lz*side);dl.position.set(p.x+SUN.x*60,SUN.y*60,p.z+SUN.z*60);dl.target.position.set(p.x,0,p.z);}
let gtab='mech',gsel=null,resetArm=false;
const coinTag=()=>`<div class="coinbal">🪙 <b id="bal">${SAVE.coins}</b></div>`;
const lockTag=k=>isLocked(k)?`<small class="lk">🔒 🪙${CFG.econ.locked[k]}</small>`:'';
const wIcon=k=>({minigun:'⁂',railgun:'━',hornet:'➹',shotgun:'⋰',laser:'≋',emp:'ϟ',nanite:'⚕',lockbolt:'⚷',swarm:'✈',pulse:'◉',jammer:'⌁'})[CFG.weapons[k].fam];
const szTag=k=>{const z=CFG.weapons[k].size;return `<span class="szb z${z}">${z}</span>`;};let slotSel=0,pickSel=null;
function wStats(w){if(w.tether)return `${bar('DAMAGE',w.dmg/150,w.dmg+' /bolt')}${bar('TETHER',w.tether/5,w.tether+'s · +'+Math.round(w.amp*100)+'% dmg taken')}${bar('RANGE',w.range/130,w.range+' m')}${bar('RATE',.4/w.interval,(1/w.interval).toFixed(1)+' /s')}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · ${w.mag} bolts · reload ${w.reload}s · tethered target slowed ${Math.round(w.tslow*100)}% and takes +${Math.round(w.amp*100)}% damage from everyone</p>`;
 if(w.emp)return `${bar('DAMAGE',w.dmg/250,w.dmg+' max + EMP · '+Math.round(w.dmg*w.chMin)+' uncharged')}${bar('CHAIN',w.jumps/4,'FULL CHARGE ONLY · +'+w.jumps+' jumps · '+w.chainR+' m · '+Math.round(w.chainFall*100)+'%/jump')}${bar('STUN',w.stun/5,w.stun+'s disable · '+Math.round((1-w.slow)*100)+'% slow')}${bar('RANGE',w.rMax/130,w.rMin+' → '+w.rMax+' m charged')}${bar('CHARGE',1-w.chT/2.5,Math.round(w.chMin*100)+'% → 100% dmg & max range in '+w.chT+'s')}${bar('WIND-UP',1-w.charge/1.5,w.charge+'s trigger delay')}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · ${w.mag} shots · ${w.interval}s between · reload ${w.reload}s · chain lightning arcs to nearby enemies in line of sight (not cloaked) · disables shield, jump, dash and regen</p>`;
 if(w.push)return `${bar('DAMAGE',w.dmg/250,w.dmg+' max (full charge) · '+Math.round(w.dmg*w.chMin)+' uncharged')}${bar('CHARGE',1-w.chT/2.5,Math.round(w.chMin*100)+'% → 100% in '+w.chT+'s, holds at max')}${bar('SHOVE',w.push/16,(w.push*(.6+.8*w.chMin)).toFixed(1)+' → '+(w.push*1.4).toFixed(1))}${bar('RANGE',w.range/130,w.range+' m')}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · ${w.mag} orbs · ${w.interval}s between · reload ${w.reload}s · charges while ready (don't fire); charged damage to Aegis domes capped at 60%</p>`;
 if(w.dot)return `${bar('DAMAGE',(w.dmg+w.dot)/150,w.dmg+' + '+w.dot+' over '+w.dotT+'s')}${bar('LEECH',w.leech/.5,Math.round(w.leech*100)+'% healed')}${bar('RANGE',w.range/130,w.range+' m')}${bar('DPS',(w.dmg/w.interval)/150,Math.round(w.dmg/w.interval+w.dot/w.dotT))}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · ${w.mag} doses · reload ${w.reload}s · damage over time heals you</p>`;if(w.beam){const dps=w.dmg/w.interval;return `${bar('DAMAGE',dps/230,Math.round(dps)+' /s beam')}${bar('HEAT',w.heat/.4,'full in '+(1/w.heat).toFixed(1)+'s')}${bar('RANGE',w.range/130,w.range+' m')}${bar('DPS',dps/150,Math.round(dps))}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · hitscan beam · cools ${Math.round(w.cool*100)}%/s · overheat lockout ${w.reload}s</p>`;}const rate=1/w.interval,dps=w.dmg*(w.pellets||1)*rate;return `${bar('DAMAGE',w.dmg*(w.pellets||1)/230,w.dmg+(w.pellets?' ×'+w.pellets:' / hit'))}${bar('FIRE RATE',Math.min(1,rate/14),rate.toFixed(1)+' /s')}${bar('RANGE',w.range/130,w.range+' m')}${bar('DPS',dps/150,Math.round(dps))}<p class="ab">${SIZES[w.size].name} · weight ${SIZES[w.size].wt} · mag ${w.mag} · reload ${w.reload}s${w.homing?` · lock ${w.lockTime}s · splash ${w.splash}m`:''}</p>`;}
function abText(m){return m.lockdown?`${m.lockdown.r} m root field for ${m.lockdown.dur}s, ${m.lockdown.cd}s cooldown, ${m.lockdown.range} m throw`:m.shield?`${m.shield.hp} HP toggle shield, ${m.shield.cd}s break lockout`:m.jump?`${m.jump.cd}s cooldown`:m.dash?`${m.dash.cd}s cooldown`:m.dome?`${m.dome.hp} HP force dome (${m.dome.r} m) for ${m.dome.dur}s, heals ${Math.round(m.dome.heal*100)}% of absorbed damage, ${m.dome.cd}s cooldown (${m.dome.brokeCd}s if broken)`:m.dive?`${m.dive.dmg} dmg dive strike, ${m.dive.cd}s cd · ${m.fly.fuel}s fuel, ${m.fly.ceil} m ceiling`:m.cloak?`${m.cloak.dur}s cloak (untargetable, hidden beyond ${m.cloak.near} m), ${m.cloak.cd}s cooldown`:m.regen?`+${m.regen.rate} HP/s after ${m.regen.delay}s`:'';}
function buyBox(k){const c=CFG.econ.locked[k];return isLocked(k)?`<div class="buy"><span>🔒 Locked</span>${SAVE.coins>=c?`<button class="go" data-buy="${k}">UNLOCK 🪙${c}</button>`:`<button disabled>🪙${c} — need ${c-SAVE.coins} more</button>`}</div>`:'';}
// garage stat rows: label, current, next
function mechRows(k){const L=levelsOf(k,'mech'),T=mechAt(k,L),out=[];
 for(const s of Object.keys(UPS.mech)){const n=Object.assign({},L);n[s]=Math.min(5,L[s]+1);const N=mechAt(k,n);
  const f=s==='armor'?[T.hp,N.hp,' HP']:s==='speed'?[T.speed,N.speed,' m/s']:T.shield?[T.shield.hp,N.shield.hp,' shield HP']:T.jump?[T.jump.cd,N.jump.cd,'s jump cd']:T.dash?[T.dash.cd,N.dash.cd,'s dash cd']:T.lockdown?[T.lockdown.dur,N.lockdown.dur,'s lockdown']:T.cloak?[T.cloak.dur,N.cloak.dur,'s cloak']:T.dome?[T.dome.hp,N.dome.hp,' dome HP']:T.dive?[T.fly.fuel,N.fly.fuel,'s fuel']:[T.regen.rate,N.regen.rate,' HP/s regen'];
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
 const gq=`<div class="gq">Graphics: ${[['auto','AUTO'],['high','HIGH'],['med','MED'],['low','LOW']].map(([k,l])=>`<button data-gfx="${k}" class="${settings.gfxSel===k?'on':''}">${l}</button>`).join('')}${settings.gfxSel==='auto'?`<span style="opacity:.7;font-size:.8em"> now ${settings.gfx.toUpperCase()}</span>`:''}</div>`;
 if(menuStep==='title'&&!curProf().name)menuStep='name';
 if(menuStep==='name')h=nameScreen();else if(menuStep==='pilot')h=pilotScreen();else if(menuStep==='chal')h=chalScreen();
 else if(menuStep==='title'){h=`<h1>MECH ARENA</h1><div class="wb">Welcome back, <b>${curProf().name}</b>${testTag(curProf())}${SAVE.title?` <span class="ttl">🎖 ${SAVE.title}</span>`:''} <button data-go="pilot" class="sw2">👤 PILOT · SWITCH</button></div>${coinTag()}<p class="sub">Win matches to earn coins. Upgrade and unlock gear in the Garage.</p>
  <button class="big" data-go="mode">PLAY</button><button class="big alt" onclick="__net.open()" style="background:linear-gradient(#1b6,#085)">🌐 ONLINE 2-PLAYER<br><small>Co-op or Versus with a friend · room code</small></button><button class="big alt" data-go="deploy">QUICK DEPLOY<br><small>${md.name}${settings.mode==='duel'?' ('+CFG.diff[settings.diff].name+')':''} · ${settings.map==='random'?'Random map':MAPS[settings.map].name} · ${Ms[loadout.mech].name} · ${slotsOf(loadout.mech).map(k=>Ws[k].name).join(' + ')}</small></button>
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
function goMenu(){clearWorld();if(mapKey!=='arena')loadMap('arena',7);showBases(false);mode='menu';menuStep='title';preview();renderMenu();showUI();if(NET.role)netAfterMenu();else netUi();}
function deskPanel(at,af,ac){const pct=v=>Math.max(0,Math.min(100,v*100)).toFixed(0)+'%';
 const rows=P.ws.map(w=>{const W=w.W;let st,f,col='#ff6';
  if(W.emp&&w.chg){f=Math.min(1,(clock-w.chg)/W.charge);st='DISCHARGING…';col='#8cf';}
  else if(W.chT&&!w.reload&&w.pc>0){f=w.pc;st=(w.pc>=1?'⚡ MAX 100%':'CHARGING '+chgPct(w)+'%')+(W.rMax?' · '+Math.round(effR(w))+'m':'')+' · '+w.ammo+'/'+W.mag;col=w.pc>=1?'#7ff':'#4bd';}
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
 if(d.gfx){pickGfx(d.gfx);if(mode==='menu')renderMenu();}
 if(d.map){settings.map=d.map;saveLoadout();renderMenu();}
 if(d.gtab){gtab=d.gtab;gsel=null;}
 if(d.gsel){gsel=d.gsel;if(gtab!=='wpn'&&!isLocked(gsel)){loadout.mech=gsel;saveLoadout();preview();}}
 if(d.up){if(buyUp(gsel,d.up)){toast('Upgraded!');preview();}}
 if(d.buy){if(buyUnlock(d.buy)){toast(`${(CFG.mechs[d.buy]||CFG.weapons[d.buy]).name} unlocked!`);if(menuStep==='weapon'&&CFG.weapons[d.buy]){slotsOf(loadout.mech)[slotSel]=d.buy;saveLoadout();}preview();}}
 if(d.paint){const k=d.paint;if(SAVE.paints.includes(k)||buyPaint(k)){SAVE.paint[gsel]=k;persist();preview();}}
 if(d.reset){if(resetArm){resetArm=false;resetProgress();gsel=null;preview();toast('Progress reset');}else resetArm=true;}
 if(d.go){if(d.go==='garage'){gsel=null;}if(d.go==='deploy'){if(isLocked(loadout.mech)||slotsOf(loadout.mech).some(isLocked)){toast('Unlock your selected gear in the Garage first');menuStep='mech';renderMenu();return;}saveLoadout();if(NET.role){netShowLobby();netLobChanged();return;}newGame();return;}menuStep=d.go;}
 renderMenu();}
menu.addEventListener('click',menuClick);
$('again').addEventListener('click',()=>NET.role?netRematch():newGame());$('tomenu').addEventListener('click',()=>goMenu());
loadMap('arena',7);setGfx(settings.gfx);goMenu();requestAnimationFrame(loop);
window.__game={end,THREE_V:THREE.Vector3,mergeUnit,makeUnit,explode,pickGfx,setGfx,get gfxSel(){return settings.gfxSel},colR,sepUnits,inObst,gunBlocked,muzzle,R,S,get A(){return A},overview(){const c=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,1,800);c.position.set(0,A*1.55,A*1.05);c.lookAt(0,0,-A*.08);const f=S.fog;S.fog=null;R.render(S,c);S.fog=f;},hurt,STATS,C,cam,obst,obstMeshes,BASES,CFG,get U(){return U},get E(){return foes('b')},get P(){return P},get B(){return B},get mode(){return mode},get fps(){return fps},get SPEC(){return SPEC},get settings(){return settings},
 ability:()=>ability(P),abilityU:u=>ability(u),blocked:(x,z,r,y)=>blocked(x,z,r,y),groundAt:(x,z,y)=>groundAt(x,z,y),get A(){return A},newGame,goMenu,setGfx,get loadout(){return loadout},setLoadout:(m,w)=>{loadout.mech=m;loadout.slots[m]=CFG.slots[m].map(sl=>adapt(w,sl,false));},setSlots:(m,a)=>{loadout.mech=m;loadout.slots[m]=a.slice();},slotsOf:t=>slotsOf(t),SIZES,menu:st=>{menuStep=st;renderMenu();},slot:i=>{slotSel=i;pickSel=null;renderMenu();},
 startMatch:(md,df,mp)=>{settings.mode=md;if(df)settings.diff=df;if(mp)settings.map=mp;newGame();},MAPS,get mapKey(){return mapKey},loadMap,setBaseProg:(t,v)=>{BASES[t].prog=v;},
 killTeam:t=>{for(const u of U)if(u.team===t&&u.alive)hurt(u,1e6,null,null);},killUnit:u=>hurt(u,1e6,null,null),air:{shoot:(f,d,u,h,W)=>shoot(f,d,u,h,W),sweep:(o,d,L,ow)=>sweep(o,d,L,ow),hurt:(u,d,p,s)=>hurt(u,d,p,s),domeUp,domeSafe,fireWeapon:(u,w,a,h)=>fireWeapon(u,w,a,h),get B(){return B},inp},get SAVE(){return SAVE},get PROFS(){return PROFS},createTest,resetTest,testFill,isTest,chClaim,chDaily,chClaimable,CAREER,DPOOL,chEv,dayKey,cTier,get menuStep(){return menuStep},speedOf:u=>speedOf(u),createProf,renameProf,deleteProf,useProf,exportCode,importCode,buyUp,buyUnlock,buyPaint,resetProgress,upMech,upWpn,get reward(){return LAST_REWARD},lineup:(w)=>{if(P){S.remove(P.g);P=null;}if(LINEUP)LINEUP.forEach(u=>S.remove(u.g));LINEUP=['guardian','strider','mender','phantom'].map((k,i)=>{const u=makeUnit('b',k,w||CFG.defSlots[k],null);u.g.position.set(-10.5+i*7,0,48);u.tYaw=u.legYaw=u.yaw=Math.PI*0.82;initFeet(u);animMech(u,.016);return u;});},renderMenu,go:s=>{menuStep=s;renderMenu();}};
// barrel convergence: rotate each gun pivot so its +Z points at the aim point
const _l=new THREE.Vector3();
function aimGuns(u,pt,dt){const K=CFG.cam;u.top.updateMatrixWorld(true);for(const g of u.guns){g.rotation.order='YXZ';
 _l.copy(pt);g.parent.worldToLocal(_l);_l.sub(g.position);const yaw=Math.max(-K.aimMaxYaw,Math.min(K.aimMaxYaw,Math.atan2(_l.x,_l.z)));
 const pit=Math.max(-K.aimMaxPitch,Math.min(K.aimMaxPitch,Math.atan2(-_l.y,Math.hypot(_l.x,_l.z))));const k=Math.min(1,dt*K.aimTurn);
 const up=g.userData.raise=Math.max(0,Math.min(1,(g.userData.raise||0)+(gunBlocked(g)?dt*6:-dt*3)));g.rotation.y+=(yaw*(1-up*.6)-g.rotation.y)*k;g.rotation.x+=((pit*(1-up)-1.1*up)-g.rotation.x)*k;}}
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
 for(const u of U){if(!u.alive||(P&&u.team!==P.team&&cloakHid(u,P.g.position)))continue;const x=(u.g.position.x+A)*k,y=(u.g.position.z+A)*k;
  if(u===P){mctx.save();mctx.translate(x,y);mctx.rotate(-P.tYaw+Math.PI);mctx.fillStyle='#fff';mctx.beginPath();mctx.moveTo(0,-7);mctx.lineTo(5,5);mctx.lineTo(-5,5);mctx.fill();mctx.restore();}
  else{mctx.fillStyle=u.team==='b'?'#4bf':'#f54';mctx.beginPath();mctx.arc(x,y,4,0,7);mctx.fill();}}}
/* ===== v37 secondary abilities: config ===== */
CFG.sec={
 regen:{name:'Nano Regen',ic:'✚',desc:'Repairs your mech over time.',cost:15,cd:20,dur:6,hps:60},
 mark:{name:'Expose Mark',ic:'◎',desc:'Marks the enemy you aim at: it takes extra damage from everyone.',cost:20,cd:18,dur:6,amp:.30,range:80},
 oc:{name:'Overcharge',ic:'⚡',desc:'Your weapons deal more damage and fire faster.',cost:20,cd:24,dur:5,dmg:.35,rate:.30},
 drone:{name:'Repair Drone',ic:'🛸',desc:'A drone orbits you and repairs you and nearby allies.',cost:25,cd:28,dur:8,hps:35,r:14},
 mine:{name:'Slow Mine Field',ic:'✳',desc:'Drops a field where you aim that slows and burns enemies inside.',cost:15,cd:20,dur:8,r:8,slow:.45,dps:12,range:30},
 boost:{name:'Thruster Boost',ic:'»',desc:'Big burst of movement speed.',cost:10,cd:15,dur:4,spd:.6},
 aiChance:.45};
const SACOL={regen:'#4f8',mark:'#f44',oc:'#fa3',drone:'#4ef',mine:'#b6f',boost:'#5af',mslow:'#b6f'};
const SAKEYS=['regen','mark','oc','drone','mine','boost'];
// ---------- v20: test-pilot tuning panel + pause menu + sound settings ----------
let PAUSED=false;
if(CFG.teamSize==null)CFG.teamSize=6;
const TUNE_KEYS=['mechs','weapons','gravity','legTurn','cam','move','gait','hitbox','hitReact','capture','fx','diff','teamSize','allyProfile','enemyProfile','status','sec'];
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
function openPause(){if(mode!=='play')return;PAUSED=!NET.role;inp.fire=inp.mFire=false;inp.mx=inp.mz=0;
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
const TLBL={hp:'HP',speed:'Speed',dmg:'Damage',interval:'Fire interval (s)',range:'Range',mag:'Magazine',reload:'Reload (s)',heat:'Heat/s',cool:'Cool/s',stun:'EMP stun (s)',resist:'Debuff resistance (s)',jam:'Jam chance',jamN:'Weapons jammed',jamMul:'Jam reload ×',near:'Visible within (m)',fireReveal:'Fire reveal (s)',hitReveal:'Hit reveal (s)',fireCost:'Cloak cost per shot (s)',speedMul:'Cloaked speed ×',slow:'Slow',blast:'Blast radius',dot:'Nanite DoT',dotT:'DoT time',leech:'Leech',tether:'Tether',amp:'Tether amp',tslow:'Tether slow',charge:'Charge (s)',jumps:'Chain jumps',chainR:'Chain radius (m)',chainFall:'Chain dmg per jump ×',rMin:'Min range (no charge)',rMax:'Max range (full charge)',chT:'Charge time (s)',chMin:'Uncharged damage fraction',splash:'Splash',spread:'Spread',cd:'Cooldown',dur:'Duration',brokeCd:'Cooldown if broken (s)',heal:'Heal % of absorbed',empDrain:'EMP dome drain',r:'Radius',vel:'Jump velocity',regen:'Regen',rate:'Rate'};
const tOver=()=>SAVE.tune||(SAVE.tune={});
function tStep(d){d=Math.abs(d);return d>=100?1:d>=10?.1:d>=1?.01:.001;}
function tRow(path,label){const def=tGet(TDEF,path),cur=path in tOver()?tOver()[path]:def,mx=Math.max(Math.abs(def)*3,1),st=tStep(def||1),ch=path in tOver();
 return `<div class="trw${ch?' ch':''}"><label title="${path}">${label}</label><input type="range" min="0" max="${+mx.toFixed(3)}" step="${st}" value="${cur}" data-tp="${path}"><input type="number" step="${st}" value="${cur}" data-tn="${path}"><button class="tx" data-tr="${path}" title="reset">↺</button></div>`;}
function tFields(prefix,obj,lbl=''){let h='';for(const k in obj){const v=obj[k],p=prefix+'.'+k;if(/color|Color|^name$|^fam$|^size$/.test(k))continue;
  if(typeof v==='number')h+=tRow(p,(lbl?lbl+' · ':'')+(TLBL[k]||k));else if(v&&typeof v==='object'&&!Array.isArray(v))h+=tFields(p,v,(lbl?lbl+' · ':'')+k);}return h;}
function tFlag(k,l){return `<div class="trw"><label>${l}</label><button data-tf="${k}" class="${tOver()['flag.'+k]?'on':''}">${tOver()['flag.'+k]?'ON':'OFF'}</button></div>`;}
function tSel(k,l,opts,cur){return `<div class="trw"><label>${l}</label><select data-ts="${k}">${opts.map(([v,n])=>`<option value="${v}"${String(v)===String(cur)?' selected':''}>${n}</option>`).join('')}</select></div>`;}
function tSecBody(id){const t=tOver();
 if(id==='sec')return tFields('sec',TDEF.sec);
 if(id==='match')return tSel('teamSize','Team size (per side)',[1,2,3,4,5,6,7,8].map(n=>[n,n+' v '+n]),t.teamSize||TDEF.teamSize)+tSel('flag.botDiff','Bot difficulty',[['','Default'],...Object.keys(CFG.diff).map(k=>[k,CFG.diff[k].name])],t['flag.botDiff']||'')
  +`<div class="trw${'MAPSC' in t?' ch':''}"><label>Map size scale</label><input type="range" min="0.8" max="2.2" step="0.05" value="${t.MAPSC||MAPSC0}" data-tp="MAPSC"><input type="number" step="0.05" value="${t.MAPSC||MAPSC0}" data-tn="MAPSC"><button class="tx" data-tr="MAPSC">↺</button></div>`
  +tFlag('god','God mode (no damage)')+tFlag('infAmmo','Infinite ammo / no heat')+tFlag('noCd','No ability cooldowns')+tFlag('aiOff','AI off (bots idle)');
 if(id==='global'){let h=tRow('gravity','Gravity')+tRow('legTurn','Leg turn rate');for(const k of['move','gait','cam','hitbox','hitReact','capture','fx','status'])if(TDEF[k])h+=`<h4>${k}</h4>`+tFields(k,TDEF[k]);return h;}
 if(id.startsWith('m:')){const k=id.slice(2);return tFields('mechs.'+k,TDEF.mechs[k]);}
 if(id.startsWith('w:')){const k=id.slice(2);return tFields('weapons.'+k,TDEF.weapons[k]);}return '';}
function tSecs(){const s=[['match','⚙ Match settings'],['global','🌐 Global (physics, camera, movement)'],['sec','✨ Secondary abilities']];
 for(const k in TDEF.mechs)s.push(['m:'+k,'🤖 '+(TDEF.mechs[k].name||k)]);for(const k in TDEF.weapons)s.push(['w:'+k,'🔫 '+(TDEF.weapons[k].name||k)]);return s;}
function tCount(id){const t=tOver(),pre=id==='match'?null:id==='global'?null:id==='sec'?'sec.':id.startsWith('m:')?'mechs.'+id.slice(2)+'.':'weapons.'+id.slice(2)+'.';
 return Object.keys(t).filter(p=>pre?p.startsWith(pre):id==='match'?(p.startsWith('flag.')||p==='teamSize'||p==='MAPSC'):!/^(mechs|weapons|flag|sec)\.|^(teamSize|MAPSC)$/.test(p)).length;}
function openTune(back){if(!isTest()){toast('Tuning is only available on the test pilot');return;}
 const h=`<p class="ab">🧪 Test pilot only — changes are saved to this pilot and never affect normal pilots. Stat changes apply on the next deploy (use ↻ Restart from the pause menu).</p>`+
  tSecs().map(([id,l])=>{const n=tCount(id);return `<details class="tsec" data-sec="${id}"><summary>${l}${n?` <i class="tchg">${n} changed</i>`:''}</summary><div class="tin"></div><div class="trs"><button data-treset="${id}">Reset section</button></div></details>`;}).join('');
 openOvl('TUNING',h,back,'<button data-treset="*" class="warn">Reset all</button>');}
function tPersist(){applyTune();try{persist();}catch(e){}}
function tSecReset(id){const t=tOver();for(const p of Object.keys(t)){const pre=id==='*'?'':id==='match'?null:id==='global'?null:id==='sec'?'sec.':id.startsWith('m:')?'mechs.'+id.slice(2)+'.':'weapons.'+id.slice(2)+'.';
  const hit=id==='*'||(pre?p.startsWith(pre):id==='match'?(p.startsWith('flag.')||p==='teamSize'||p==='MAPSC'):!/^(mechs|weapons|flag|sec)\.|^(teamSize|MAPSC)$/.test(p));if(hit)delete t[p];}tPersist();}
function tSetVal(p,v){const def=p==='MAPSC'?MAPSC0:tGet(TDEF,p);if(!isFinite(v))return;if(Math.abs(v-def)<1e-9)delete tOver()[p];else tOver()[p]=v;tPersist();}
function tRefresh(d){const sum=d.querySelector('summary'),id=d.dataset.sec,n=tCount(id);sum.querySelector('.tchg')?.remove();if(n)sum.insertAdjacentHTML('beforeend',` <i class="tchg">${n} changed</i>`);}
OV.addEventListener('toggle',e=>{const d=e.target;if(d.tagName==='DETAILS'&&d.open){const b=d.querySelector('.tin');if(!b.innerHTML)b.innerHTML=tSecBody(d.dataset.sec);}},true);
OV.addEventListener('input',e=>{const el=e.target,ds=el.dataset;
 if(ds.av){audSet(ds.av,+el.value);el.nextElementSibling.textContent=Math.round(el.value*100)+'%';return;}
 const p=ds.tp||ds.tn;if(!p)return;const v=+el.value;const row=el.closest('.trw');row.querySelectorAll('input').forEach(i=>{if(i!==el)i.value=v;});tSetVal(p,v);row.classList.toggle('ch',p in tOver());const d=el.closest('details');d&&tRefresh(d);});
OV.addEventListener('change',e=>{const el=e.target,k=el.dataset.ts;if(!k)return;const t=tOver();if(k==='teamSize'){const v=+el.value;if(v===TDEF.teamSize)delete t.teamSize;else t.teamSize=v;}else{if(el.value)t[k]=el.value;else delete t[k];}tPersist();const d=el.closest('details');d&&tRefresh(d);});
OV.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ds=b.dataset;if(b.id!=='oBack')sfx('click');
 if(ds.pz){if(ds.pz==='resume')resumeGame();else if(ds.pz==='snd')openSound(openPause);else if(ds.pz==='tune')openTune(openPause);else if(ds.pz==='restart'){closeOvl();PAUSED=false;NET.role?netQuitMatch():newGame();}else if(ds.pz==='quit'){closeOvl();PAUSED=false;NET.role?netQuitMatch():goMenu();}return;}
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
window.__v31={chainArc:(u,W,t,d)=>chainArc(u,W,t,d),empShot:(u,w,a)=>empShot(u,w,a),pulseMul:w=>pulseMul(w),effR:w=>effR(w),chgPct:w=>chgPct(w),fireWeapon:(u,w,a)=>fireWeapon(u,w,a),get B(){return B;},get U(){return U;}};
/* ===== v37 secondary abilities ===== */
const SXK=['regen','mark','oc','drone','boost','mslow'];let SAF=[],SAFID=0,saHudN=0,saPend=[];
function saOf(t){const s=loadout&&loadout.sa,k=s&&s[t];return k&&CFG.sec[k]?k:'';}
function saCost(k){return isTest()?0:(CFG.sec[k]?CFG.sec[k].cost:0);}
function sxOf(u){return u.sx||(u.sx={});}
function saAimYaw(u){return u===P?camYaw:(u.tYaw!=null?u.tYaw:u.yaw);}
function secTarget(u){const R=CFG.sec.mark.range,p=u.g.position,yaw=saAimYaw(u);
 if(u===P&&P.lockTgt&&P.lockTgt.alive&&P.lockTgt.team!==u.team&&!P.lockTgt.isDome&&P.lockTgt.g.position.distanceTo(p)<=R)return P.lockTgt;
 let best=null,bs=1e9;for(const f of U){if(!f.alive||f.team===u.team||f.isDome||f===u)continue;if(cloakHid(f,p))continue;
  const dx=f.g.position.x-p.x,dz=f.g.position.z-p.z,d=Math.hypot(dx,dz);if(d>R)continue;
  let a=Math.abs(Math.atan2(dx,dz)-yaw);a=Math.min(a,Math.PI*2-a);if(a>.35&&d>25)continue;
  const sc=a+d/400;if(sc<bs){bs=sc;best=f;}}return best;}
function secMinePt(u,pt){const p=u.g.position,R=CFG.sec.mine.range;let x,z;
 if(pt){x=pt.x;z=pt.z;}else{const y=saAimYaw(u);x=p.x+Math.sin(y)*16;z=p.z+Math.cos(y)*16;}
 const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d>R){x=p.x+dx/d*R;z=p.z+dz/d*R;}
 const L=(typeof A==='number'?A:200)-2;return{x:Math.max(-L,Math.min(L,x)),z:Math.max(-L,Math.min(L,z))};}
function secApply(u,k,tg,pt){const C=CFG.sec[k];if(!C||!u||!u.alive)return false;const sx=sxOf(u);
 if(k==='mark'){if(!tg||!tg.alive)return false;sxOf(tg).mark=C.dur;tg.markBy=u;}
 else if(k==='mine'){const q=secMinePt(u,pt);SAF.push({id:++SAFID,x:q.x,z:q.z,r:C.r,t:C.dur,team:u.team,src:u,tk:0});}
 else sx[k]=C.dur;
 u.saCd=TF('noCd')?.5:C.cd;sfx('sa_'+k,{u});
 const p=(k==='mark'?tg:u).g.position;fx(new THREE.Vector3(p.x,2.5,p.z),2.5,SACOL[k],{grow:5,life:.5,op:.8});return true;}
function secTry(){if(mode!=='play'||!P||!P.alive||(typeof PAUSED!=='undefined'&&PAUSED))return false;const k=P.sa,C=CFG.sec[k];
 if(!C){toast('No secondary ability equipped — pick one in the Garage');return false;}
 if((P.saCd||0)>0){sfx('denied');return false;}
 const cost=saCost(k);if((SAVE.coins||0)<cost){sfx('denied');toast(`Need 🪙${cost} for ${C.name} (you have 🪙${SAVE.coins||0})`);return false;}
 let tg=null,pt=null;
 if(k==='mark'){tg=secTarget(P);if(!tg){sfx('denied');toast('◎ No enemy in sight to mark');return false;}if(resd(tg,'mark')){resFx(tg);sfx('denied');toast('Target is resistant to Mark');return false;}}
 if(k==='mine')pt=AP0?{x:AP0.x,z:AP0.z}:null;
 if(cost){SAVE.coins-=cost;persist();}
 if(NET.role==='client'){P.saCd=C.cd;saPend.push(cost);const ti=tg?NET.units.indexOf(tg):-1;netSend({t:'sa',k,tg:ti,p:pt?[+pt.x.toFixed(1),+pt.z.toFixed(1)]:null});sfx('sa_'+k,{u:P});}
 else secApply(P,k,tg,pt);
 if(cost)sfx('coins');secHud(1);return true;}
function hostSa(g,m){const R=g.R,k=R&&R.sa,C=CFG.sec[k];let ok=false,why='';
 if(!R||!R.alive||mode!=='play'||!C||m.k!==k)why='not available';else if((R.saCd||0)>.6)why='cooling down';
 else{const tg=m.tg>=0?NET.units[m.tg]:null;
  if(k==='mark'){if(!tg||!tg.alive||tg.team===R.team)why='no target';else if(resd(tg,'mark')){resFx(tg);why='target resists Mark';}}
  if(!why)ok=secApply(R,k,tg,m.p?{x:m.p[0],z:m.p[1]}:null);if(!ok&&!why)why='failed';}
 gSend(g,{t:'sar',ok,why});}
function secReply(m){const c=saPend.shift()||0;if(!m.ok){if(c){SAVE.coins+=c;persist();}if(P)P.saCd=0;toast('Secondary refused: '+(m.why||'')+(c?` (🪙${c} refunded)`:''));}}
function secPack(u){const s=u.sx;if(!s)return 0;let b=0;SXK.forEach((k,i)=>{if(s[k]>0)b|=1<<i;});return b;}
function secUnpack(u,b){const s=sxOf(u);SXK.forEach((k,i)=>{if(b&(1<<i))s[k]=Math.max(s[k]||0,.25);else s[k]=0;});}
function secFieldsPack(){return SAF.map(f=>[f.id,+f.x.toFixed(1),+f.z.toFixed(1),f.r,+f.t.toFixed(1),f.team]);}
function secFieldsSync(a){if(!a)return;const ids=new Set(a.map(q=>q[0]));
 SAF=SAF.filter(f=>{if(ids.has(f.id))return true;secFieldDrop(f);return false;});
 for(const q of a){let f=SAF.find(z=>z.id===q[0]);if(!f){f={id:q[0],x:q[1],z:q[2],r:q[3],t:q[4],team:q[5]==='b'||q[5]===NET.myT?P.team:'_'+q[5],tk:0};SAF.push(f);}else f.t=q[4];}}
function secFieldDrop(f){if(f.m){S.remove(f.m);f.m=null;}}
/* visuals */
const saG={ring:new THREE.TorusGeometry(2.4,.13,6,32),mk:new THREE.TorusGeometry(1.2,.16,6,24),cone:new THREE.ConeGeometry(.55,1.1,4),drone:new THREE.OctahedronGeometry(.55,0),disc:new THREE.CircleGeometry(1,40),edge:new THREE.TorusGeometry(1,.035,4,48)};
function saMat(c,o){return new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false});}
function saMake(k){const g=new THREE.Group(),c=SACOL[k];
 if(k==='mark'){const r=new THREE.Mesh(saG.mk,saMat(c,.9));const n=new THREE.Mesh(saG.cone,saMat(c,.9));n.rotation.x=Math.PI;n.position.y=-1.3;g.add(r,n);r.material.depthTest=false;n.material.depthTest=false;g.renderOrder=9;}
 else if(k==='drone'){const d=new THREE.Mesh(saG.drone,new THREE.MeshBasicMaterial({color:c}));const h=new THREE.Mesh(saG.mk,saMat(c,.5));h.scale.setScalar(.6);h.rotation.x=Math.PI/2;d.add(h);g.add(d);g.userData.d=d;const a=new THREE.Mesh(saG.ring,saMat(c,.25));a.rotation.x=Math.PI/2;a.scale.setScalar(CFG.sec.drone.r/2.4);a.position.y=.2;g.add(a);}
 else{const r=new THREE.Mesh(saG.ring,saMat(c,k==='mslow'?.55:.7));r.rotation.x=Math.PI/2;if(k==='mslow')r.scale.setScalar(.75);g.add(r);}
 return g;}
function secVis(u,dt){const s=u.sx;if(!u.saV)u.saV={};const p=u.g.position,t=clock;
 for(const k of SXK){const on=u.alive&&s&&s[k]>0;let m=u.saV[k];
  if(on&&!m){m=u.saV[k]=saMake(k);S.add(m);}else if(!on&&m){S.remove(m);u.saV[k]=null;continue;}if(!on)continue;
  m.position.set(p.x,p.y,p.z);
  if(k==='regen'){m.position.y=p.y+.4+((t*1.6)%1)*5;m.children[0].material.opacity=.8*(1-((t*1.6)%1));if(Math.random()<dt*8)fx(new THREE.Vector3(p.x+(Math.random()-.5)*3,p.y+2+Math.random()*3,p.z+(Math.random()-.5)*3),.35,'#6f9',{vy:3,life:.6});}
  else if(k==='mark'){m.position.y=p.y+8+Math.sin(t*5)*.3;m.rotation.y=t*3;}
  else if(k==='oc'){m.position.y=p.y+3;m.scale.setScalar(1+.15*Math.sin(t*18));m.rotation.y=t*4;if(Math.random()<dt*14)fx(new THREE.Vector3(p.x+(Math.random()-.5)*3,p.y+2+Math.random()*3,p.z+(Math.random()-.5)*3),.3,'#ffb030',{box:1,life:.25});}
  else if(k==='drone'){const d=m.userData.d;d.position.set(Math.sin(t*2.2)*3,6+Math.sin(t*4)*.4,Math.cos(t*2.2)*3);d.rotation.y=t*5;}
  else if(k==='boost'){m.position.y=p.y+.3;m.scale.setScalar(1+.2*Math.sin(t*25));if(Math.random()<dt*25)fx(new THREE.Vector3(p.x+(Math.random()-.5)*2,p.y+1,p.z+(Math.random()-.5)*2),.5,'#7cf',{life:.35,op:.6});}
  else if(k==='mslow'){m.position.y=p.y+.3;m.rotation.z=t*2;}}}
function secVisClear(){for(const u of U)if(u.saV)for(const k in u.saV){if(u.saV[k])S.remove(u.saV[k]);u.saV[k]=null;}if(P&&P.saV&&!U.includes(P))for(const k in P.saV){if(P.saV[k])S.remove(P.saV[k]);P.saV[k]=null;}for(const f of SAF)secFieldDrop(f);SAF=[];}
function secFieldVis(f){const own=P&&f.team===P.team;
 if(!f.m){const g=new THREE.Group();const d=new THREE.Mesh(saG.disc,saMat(SACOL.mine,.2));d.rotation.x=-Math.PI/2;const e=new THREE.Mesh(saG.edge,saMat(own?'#7af':'#f4a',.9));e.rotation.x=Math.PI/2;g.add(d,e);g.scale.setScalar(f.r);g.position.set(f.x,.18,f.z);S.add(g);f.m=g;}
 const fade=Math.min(1,f.t/1.2);f.m.children[0].material.opacity=(.14+.08*Math.sin(clock*6))*fade;f.m.children[1].material.opacity=.9*fade;
 if(Math.random()<.25)fx(new THREE.Vector3(f.x+(Math.random()-.5)*f.r*1.4,.6,f.z+(Math.random()-.5)*f.r*1.4),.35,'#c9f',{vy:2,life:.5});}
/* per-frame */
function secTick(dt){if(!P)return;const auth=NET.role!=='client';
 for(const u of U){const s=u.sx;if((u.saCd||0)>0&&(auth||u===P))u.saCd=Math.max(0,u.saCd-dt);
  if(s){if(!u.alive){for(const k of SXK)s[k]=0;}else if(auth)for(const k of SXK)if(s[k]>0)s[k]=Math.max(0,s[k]-dt);
   if(u.alive&&auth){if(s.regen>0)u.hp=Math.min(u.max,u.hp+CFG.sec.regen.hps*dt);
    if(s.drone>0){const C=CFG.sec.drone,p=u.g.position;for(const x of U)if(x.alive&&x.team===u.team&&!x.isDome&&x.g.position.distanceTo(p)<=C.r)x.hp=Math.min(x.max,x.hp+C.hps*dt);}}
   if(u.alive&&s.oc>0&&(auth||u===P)&&u.ws)for(const w of u.ws)if(w.fireCd>0)w.fireCd-=dt*CFG.sec.oc.rate;}
  secVis(u,dt);}
 for(const f of SAF){f.t-=dt;if(auth){f.tk-=dt;if(f.tk<=0){f.tk=.5;const C=CFG.sec.mine;
   for(const x of U){if(!x.alive||x.team===f.team||x.isDome)continue;const p=x.g.position;if(Math.hypot(p.x-f.x,p.z-f.z)>f.r)continue;
    if(resd(x,'mslow')){resFx(x);continue;}sxOf(x).mslow=Math.max(sxOf(x).mslow||0,.8);if(C.dps>0)hurt(x,C.dps*.5,p.clone(),f.src);}}}
  secFieldVis(f);}
 if(auth)SAF=SAF.filter(f=>{if(f.t>0)return true;secFieldDrop(f);return false;});
 if(auth&&mode==='play')for(const u of U)if(u!==P&&u.alive&&!u.remote&&!u.isDome&&u.sa)secAi(u,dt);
 if(++saHudN%6===0)secHud();}
function secAi(u,dt){u.saAiT=(u.saAiT==null?1+Math.random()*2:u.saAiT)-dt;if(u.saAiT>0||(u.saCd||0)>0)return;u.saAiT=1+Math.random()*.6;
 if(Math.random()>CFG.sec.aiChance)return;const k=u.sa,hpf=u.hp/u.max;let tg=u.tgt&&u.tgt.alive?u.tgt:null;
 const near=U.some(f=>f.alive&&f.team!==u.team&&!f.isDome&&f.g.position.distanceTo(u.g.position)<60);
 if(k==='regen'&&hpf<.55)secApply(u,k);
 else if(k==='drone'&&(hpf<.7||U.some(x=>x.alive&&x.team===u.team&&x!==u&&x.hp<x.max*.6&&x.g.position.distanceTo(u.g.position)<CFG.sec.drone.r)))secApply(u,k);
 else if(k==='oc'&&near)secApply(u,k);
 else if(k==='boost'&&(hpf<.35||!near))secApply(u,k);
 else if(k==='mark'){if(!tg||tg.team===u.team||tg.isDome)tg=secTarget(u);if(tg&&!tg.isDome&&tg.g.position.distanceTo(u.g.position)<=CFG.sec.mark.range&&!resd(tg,'mark'))secApply(u,k,tg);}
 else if(k==='mine'&&tg&&!tg.isDome&&tg.g.position.distanceTo(u.g.position)<CFG.sec.mine.range+4)secApply(u,k,null,{x:tg.g.position.x,z:tg.g.position.z});}
/* HUD */
const bSA=(()=>{const st=document.createElement('style');st.textContent=`#bSA{right:282px;bottom:150px;width:72px;height:72px;border-color:#c8f;color:#e8d0ff;font-size:22px;flex-direction:column;line-height:1;text-align:center}#bSA small{font-size:11px;font-weight:bold;color:#ffd75e;margin-top:2px}#bSA.no{opacity:.45;filter:grayscale(1)}#bSA.none{display:none!important}
@media (max-height:450px){#bSA{width:56px;height:56px;right:calc(196px + env(safe-area-inset-right));bottom:calc(94px + env(safe-area-inset-bottom));font-size:17px}#bSA small{font-size:9px}}
.sapick{margin:6px 0;padding:6px 8px;border:1px solid #6a4a9a;border-radius:8px;background:rgba(60,30,90,.35);text-align:left}.sapick h3{margin:0 0 4px;font-size:14px}.sapick h3 small{font-weight:normal;opacity:.8;font-size:11px}#saPick button{display:inline-block!important;width:auto!important;min-width:0!important;min-height:0!important;height:auto!important;margin:2px!important;padding:4px 7px!important;border:2px solid #555!important;border-radius:7px!important;background:#1b1b26!important;color:#eee!important;font-size:12px!important;font-weight:bold;line-height:1.2!important;box-shadow:none!important;cursor:pointer}#saPick button.on{border-color:#c8f!important;background:#3a2458!important}.sapick button.on{border-color:#c8f;background:#3a2458}.sapick button i{font-style:normal;color:#ffd75e;font-size:11px}.sapick p{margin:4px 0 0;font-size:12px;opacity:.9}`;document.head.appendChild(st);
 const b=document.createElement('div');b.id='bSA';b.className='btn';b.style.display='none';const ab=$('bAB');ab.parentNode.insertBefore(b,ab.nextSibling);
 b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();secTry();});return b;})();
function secHud(force){if(!P||mode!=='play')return;const k=P.sa,C=CFG.sec[k];if(!C){bSA.classList.add('none');return;}bSA.classList.remove('none');
 const cd=P.saCd||0,cost=saCost(k),poor=(SAVE.coins||0)<cost;const h=cd>0?`${C.ic}<small>${Math.ceil(cd)}s</small>`:`${C.ic}<small>${cost?'🪙'+cost:'FREE'}</small>`;
 if(bSA.dataset.h!==h){bSA.innerHTML=h;bSA.dataset.h=h;}bSA.classList.toggle('no',poor&&cd<=0);ring(bSA,cd>0?1-cd/C.cd:1,cd>0?'#86a':SACOL[k]);}
document.addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||''))return;if((e.code==='KeyG'||e.code==='KeyX')&&!e.repeat&&mode==='play'){e.preventDefault();secTry();}});
/* wrappers */
{const h0=hurt;hurt=function(u,d,pos,src){if(u&&u.sx&&u.sx.mark>0)d*=1+CFG.sec.mark.amp;if(src&&src.sx&&src.sx.oc>0)d*=1+CFG.sec.oc.dmg;return h0(u,d,pos,src);};}
{const s0=speedOf;speedOf=function(u){let v=s0(u);const x=u&&u.sx;if(x){if(x.boost>0)v*=1+CFG.sec.boost.spd;if(x.mslow>0)v*=1-CFG.sec.mine.slow;}return v;};}
DEBUFFS.push('mark','mslow');DB_ON.mark=u=>!!(u.sx&&u.sx.mark>0);DB_ON.mslow=u=>!!(u.sx&&u.sx.mslow>0);
DBI.mark=['◎','MARKED'];DBI.mslow=['≋','MINE SLOW'];
{const c0=clearDb;clearDb=function(u,k){if((k==='mark'||k==='mslow')&&u.sx){u.sx[k]=0;return;}return c0(u,k);};}
{const l0=stList;stList=function(u){const L=l0(u)||[],s=u&&u.sx;if(s){const C=CFG.sec;
 if(s.mark>0)L.unshift(['d','◎',Math.round(C.mark.amp*100)+'%','MARKED +'+Math.round(C.mark.amp*100)+'% dmg taken',s.mark/C.mark.dur]);
 if(s.mslow>0)L.unshift(['d','≋',Math.round(C.mine.slow*100)+'%','SLOWED by mine',Math.min(1,s.mslow)]);
 if(s.regen>0)L.push(['b','✚',C.regen.hps+'/s','NANO REGEN',s.regen/C.regen.dur]);
 if(s.drone>0)L.push(['b','🛸',C.drone.hps+'/s','REPAIR DRONE',s.drone/C.drone.dur]);
 if(s.oc>0)L.push(['b','⚡','+'+Math.round(C.oc.dmg*100)+'%','OVERCHARGE',s.oc/C.oc.dur]);
 if(s.boost>0)L.push(['b','»','+'+Math.round(C.boost.spd*100)+'%','THRUSTER BOOST',s.boost/C.boost.dur]);}return L;};}
{const k0=stKey;stKey=function(u){let s=k0(u)||'';const x=u&&u.sx;if(x){if(x.mark>0)s='◎'+s;if(x.mslow>0)s='≋'+s;}return [...s].slice(0,3).join('');};}
{const f0=sfx0;sfx0=function(k,o){if(typeof k==='string'&&k.startsWith('sa_'))return saSnd(k.slice(3),o||{});return f0(k,o);};}
function saSnd(k,o){const u=o.u;let v=1,pan=0;if(u&&u!==P&&u.g){const sp=spat(u.g.position);v=sp.v;pan=sp.pan||0;}if(v<.03)return;const b=BUS.sfx;
 if(k==='regen'){tone({bus:b,type:'sine',f:520,f2:1040,d:.35,v:.12*v,pan});tone({bus:b,type:'sine',f:780,f2:1560,t:.08,d:.3,v:.08*v,pan});}
 else if(k==='mark'){for(const t of[0,.09,.18])tone({bus:b,type:'square',f:1600,t,d:.06,v:.05*v,pan,lp:4000});tone({bus:b,type:'sine',f:420,f2:200,d:.3,v:.08*v,pan});}
 else if(k==='oc'){tone({bus:b,type:'sawtooth',f:120,f2:900,d:.45,v:.1*v,pan,lp:2500});nz({type:'bandpass',f:3000,d:.3,v:.06*v,pan});}
 else if(k==='drone'){tone({bus:b,type:'triangle',f:300,f2:600,d:.5,v:.09*v,pan});tone({bus:b,type:'triangle',f:305,f2:612,t:.05,d:.45,v:.05*v,pan});}
 else if(k==='mine'){nz({type:'lowpass',f:600,d:.15,v:.25*v,pan});for(const t of[.12,.24])tone({bus:b,type:'square',f:900,t,d:.05,v:.05*v,pan});}
 else if(k==='boost'){nz({type:'bandpass',f:400,f2:3000,q:1.5,d:.5,v:.2*v,pan});tone({bus:b,type:'sine',f:200,f2:500,d:.4,v:.08*v,pan});}}
{const t0=netTick;netTick=function(dt,ap){secTick(dt);return t0(dt,ap);};}
{const c0=clearWorld;clearWorld=function(){secVisClear();return c0.apply(this,arguments);};}
{const s0=showUI;showUI=function(){s0();bSA.style.display=TOUCH&&mode==='play'?'':'none';if(mode==='play')secHud(1);};}
{const d0=deskPanel;deskPanel=function(at,af,ac){d0(at,af,ac);const k=P&&P.sa,C=CFG.sec[k];if(!C)return;const el=$('dpanel'),dk=el.querySelector('.dkeys');if(!dk)return;
 const cd=P.saCd||0,cost=saCost(k),poor=(SAVE.coins||0)<cost,col=cd>0?'#a8c':poor?'#f66':SACOL[k];
 const st=cd>0?'COOLDOWN '+cd.toFixed(1)+'s':(poor?'NEED 🪙'+cost:'READY · '+(cost?'🪙'+cost:'FREE'));const f=cd>0?1-cd/C.cd:1;
 dk.insertAdjacentHTML('beforebegin',`<div class="dw da"><span class="dk">G/X</span><b>${C.ic} ${C.name}</b><em style="color:${col}">${st} <small>· 🪙${SAVE.coins||0}</small></em><i style="width:${(f*100).toFixed(0)}%;background:${col}"></i></div>`);
 dk.textContent+=' · G/X secondary';};}
{const n0=newGame;newGame=function(){const r=n0.apply(this,arguments);try{if(P){P.sa=saOf(P.type);P.saCd=0;P.sx={};}
 for(const u of U)if(u!==P&&!u.remote&&!u.isDome){u.sx={};u.saCd=0;if(Math.random()<.7){u.sa=SAKEYS[Math.floor(Math.random()*SAKEYS.length)];u.saBot=1;}else u.sa='';}saPend=[];}catch(e){console.warn(e);}return r;};}
function secPickHtml(){const cur=saOf(loadout.mech),C=CFG.sec;
 return `<div class="sapick" id="saPick"><h3>✨ SECONDARY ABILITY <small>— free to equip · costs coins per use · G / X key or the ability button · you have 🪙${SAVE.coins||0}</small></h3>`+
 ['',...SAKEYS].map(k=>`<button data-sa="${k||'none'}" class="${cur===k?'on':''}">${k?C[k].ic+' '+C[k].name+` <i>🪙${C[k].cost} · ${C[k].cd}s</i>`:'— None'}</button>`).join('')+
 `<p>${cur?`<b>${C[cur].name}:</b> ${C[cur].desc} ${secStats(cur)}`:'No secondary equipped.'}</p></div>`;}
function secStats(k){const C=CFG.sec[k];return `<small>(${({regen:`${C.hps} HP/s for ${C.dur}s`,mark:`+${Math.round(C.amp*100)}% damage taken for ${C.dur}s, ${C.range}m`,oc:`+${Math.round(C.dmg*100)}% damage, +${Math.round(C.rate*100)}% fire rate for ${C.dur}s`,drone:`${C.hps} HP/s to you and allies within ${C.r}m for ${C.dur}s`,mine:`${C.r}m field, −${Math.round(C.slow*100)}% speed, ${C.dps} dmg/s for ${C.dur}s`,boost:`+${Math.round(C.spd*100)}% speed for ${C.dur}s`})[k]} · cooldown ${C.cd}s · 🪙${C.cost}/use)</small>`;}
{const r0=renderMenu;renderMenu=function(){const r=r0.apply(this,arguments);try{if(mode==='menu'&&(menuStep==='weapon'||menuStep==='mech')&&!document.getElementById('saPick')){const rows=mc.querySelectorAll('.row');const last=rows[rows.length-1];if(last)last.insertAdjacentHTML('beforebegin',secPickHtml());else mc.insertAdjacentHTML('beforeend',secPickHtml());}}catch(e){console.warn(e);}return r;};}
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-sa]');if(!b)return;e.stopPropagation();const k=b.dataset.sa==='none'?'':b.dataset.sa;if(!loadout.sa)loadout.sa={};loadout.sa[loadout.mech]=k;saveLoadout();try{sfx('click');}catch(_){}renderMenu();},true);
window.__secHurt=(u,d,p,s)=>hurt(u,d,p,s);window.__sec={use:secTry,apply:(k,tg)=>secApply(P,k,tg),get P(){return P},get U(){return U},get F(){return SAF},set(k){if(!loadout.sa)loadout.sa={};loadout.sa[loadout.mech]=k;saveLoadout();if(P)P.sa=k;},coins:()=>SAVE.coins};
