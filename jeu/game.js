'use strict';
/* ============================================================
   AWAKENING — exploration, menus, scénario, sauvegarde
   ============================================================ */
const SAVE_KEY = 'awakening-save-1';
let G = null;
const RT = { mode: 'title', map: null, P: null, npcs: [], busy: 0, frame: 0, bubble: null, layers: null, lastTick: 0, acc: 0 };

function newState(name, rival, look) {
  return {
    v: 1, name, rival, look: look || 'player', money: 3000, badges: new Array(16).fill(false), party: [], box: [], bag: { baume: 1 },
    keys: {}, flags: {}, seen: {}, caught: {}, visited: {}, map: 't0~home', x: 4, y: 3, dir: 'down', surf: false,
    lastCenter: { map: 't0~home', x: 4, y: 4 }, repel: 0, time: 0, opts: { speed: 1, music: true, sfx: true, share: true },
  };
}
function saveGame(silent) {
  try {
    G.map = RT.map.id; G.x = RT.P.x; G.y = RT.P.y; G.dir = RT.P.dir; G.surf = RT.P.surf;
    localStorage.setItem(SAVE_KEY, JSON.stringify(G));
    if (!silent) sfx('save');
    return true;
  } catch (e) { return false; }
}
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 18) return 'day';
  if (h >= 18 && h < 20) return 'evening';
  return 'night';
}
const TOD_NAME = { morning: 'Matin', day: 'Jour', evening: 'Soir', night: 'Nuit' };
function run(fn) {
  RT.busy++;
  return Promise.resolve().then(fn).catch(e => console.error(e)).finally(() => { RT.busy--; });
}
function mapMusic(m) { SND.night = timeOfDay() === 'night'; return m.music; }
function healAll() { G.party.forEach(healMon); }
function hasType(t) { return G.party.some(m => SP[m.sp].types.includes(t)); }
function canCut() { return G.badges[0] && hasType('flore'); }
function canSurf() { return G.badges[2] && hasType('eau'); }
function canFly() { return G.badges[3] && hasType('vent'); }
function addItem(id, n = 1) { G.bag[id] = (G.bag[id] || 0) + n; }
function giveMon(m) {
  G.seen[m.sp] = 1; G.caught[m.sp] = 1;
  if (G.party.length < 6) { G.party.push(m); return false; }
  G.box.push(m); return true;
}

// ---------- Cartes : chargement et rendu ----------
function buildLayers(map) {
  if (map.tilesKey === undefined) {
    for (const k in G.flags) if (k.startsWith('cut:' + map.id + ':')) { const [x, y] = k.split(':')[2].split(',').map(Number); if (map.t[y]) map.t[y][x] = '.'; }
  }
  const hasWater = map.t.some(r => r.includes('~') || r.includes('='));
  const frames = hasWater ? 2 : 1;
  map.layers = [];
  for (let f = 0; f < frames; f++) {
    const c = mkCanvas(map.w * TS, map.h * TS), x = c.getContext('2d');
    for (let y = 0; y < map.h; y++) for (let xx = 0; xx < map.w; xx++) {
      const ch = map.t[y][xx];
      const v = (hashStr(xx + ',' + y) % 4);
      x.drawImage(tileCanvas(ch, map.pal, v, f), xx * TS, y * TS);
    }
    for (const b of map.buildings) drawBuilding(x, b);
    map.layers.push(c);
  }
  map.tilesKey = 1;
  const bc = tileCanvas(map.border, map.pal, 0, 0);
  map.pattern = mkCanvas(TS, TS).getContext('2d').createPattern(bc, 'repeat');
}
function visibleNpc(n) {
  if (n.cond && !n.cond()) return false;
  if (n.kind === 'item' && G.flags[n.flag]) return false;
  if (n.trainer && n.trainer.hideAfter && G.flags[n.trainer.flag]) return false;
  return true;
}
function buildNpcs() {
  RT.npcs = RT.map.npcs.map((n, i) => Object.assign({}, n, { src: i, hx: n.x, hy: n.y, px: n.x * TS, py: n.y * TS, mv: null, frame: 0, step: 0 })).filter(visibleNpc);
}
function refreshNpcs() {
  const keep = new Map(RT.npcs.map(n => [n.src, n]));
  const out = [];
  RT.map.npcs.forEach((n, i) => {
    if (!visibleNpc(n)) return;
    out.push(keep.get(i) || Object.assign({}, n, { src: i, hx: n.x, hy: n.y, px: n.x * TS, py: n.y * TS, mv: null, frame: 0, step: 0 }));
  });
  RT.npcs = out;
}
async function enterMap(id, x, y, dir, opts = {}) {
  const prevReg = RT.map ? RT.map.reg : null;
  const prevId = RT.map ? RT.map.id : null;
  const map = getMap(id);
  if (!map.layers) buildLayers(map);
  RT.map = map;
  RT.P = { x, y, px: x * TS, py: y * TS, dir: dir || 'down', moving: false, prog: 0, step: 0, turn: 0, surf: !!opts.surf };
  buildNpcs();
  if (map.kind === 'town') { G.visited[id] = 1; }
  playMusic(mapMusic(map));
  if (map.kind !== 'int' && (prevId !== id) && !opts.quiet) showLocation(map.name + (prevReg && prevReg !== map.reg ? ' · ' + REGIONS[map.reg].name : ''));
  if (prevId && prevId.endsWith('~league') && id !== prevId) for (const k of ['elite1', 'elite2', 'elite3', 'elite4', 'champion']) delete G.flags['st_' + k];
}
async function warp(id, x, y, dir, opts = {}) {
  sfx('door');
  await fade(true, 180);
  await enterMap(id, x, y, dir, opts);
  await fade(false, 180);
}
function npcAt(x, y) { return RT.npcs.find(n => (n.x === x && n.y === y) || (n.mv && n.mv.tx === x && n.mv.ty === y)); }
function tileAt(x, y) { const m = RT.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return m.border; return m.t[y][x]; }
function blockedFor(x, y, who) {
  const t = tileAt(x, y);
  if (x < 0 || y < 0 || x >= RT.map.w || y >= RT.map.h) return true;
  if (SOLID.has(t)) return true;
  if (t === '~') { if (who !== 'player' || !RT.P.surf) return true; }
  else if (who === 'player' && RT.P.surf && t !== '=' && t !== 's' && t !== ',' && t !== '.' && t !== 'f' && t !== '"' && t !== 'q') return true;
  if (npcAt(x, y)) return true;
  if (who !== 'player' && ((RT.P.x === x && RT.P.y === y) || (RT.P.moving && RT.P.tx === x && RT.P.ty === y))) return true;
  return false;
}

// ---------- Déplacements ----------
function npcStep(n, dir) {
  return new Promise(res => {
    n.dir = dir;
    const [dx, dy] = DXY[dir];
    const tx = n.x + dx, ty = n.y + dy;
    if (blockedFor(tx, ty, 'npc')) { res(false); return; }
    n.mv = { tx, ty, prog: 0, res };
  });
}
function updateNpcs() {
  for (const n of RT.npcs) {
    if (n.mv) {
      n.mv.prog += 2;
      const [dx, dy] = DXY[n.dir];
      n.px = n.x * TS + dx * n.mv.prog; n.py = n.y * TS + dy * n.mv.prog;
      n.frame = n.mv.prog >= 4 && n.mv.prog < 12 ? (n.step ? 1 : 2) : 0;
      if (n.mv.prog >= 16) { n.x = n.mv.tx; n.y = n.mv.ty; n.px = n.x * TS; n.py = n.y * TS; const r = n.mv.res; n.mv = null; n.step ^= 1; n.frame = 0; r(true); }
    } else if (n.wander && !RT.busy && !UI.stack.length && Math.random() < 0.008) {
      const d = pick(Math.random, ['up', 'down', 'left', 'right']);
      const [dx, dy] = DXY[d];
      if (Math.abs(n.x + dx - n.hx) <= n.wander && Math.abs(n.y + dy - n.hy) <= n.wander) npcStep(n, d);
      else n.dir = d;
    }
  }
}
function owTick() {
  updateNpcs();
  const P = RT.P;
  if (!P) return;
  if (P.moving) {
    const sp = P.surf ? 3 : (Input.held.b ? 4 : 2);
    P.prog = Math.min(16, P.prog + sp);
    const [dx, dy] = DXY[P.dir];
    P.px = P.x * TS + dx * P.prog; P.py = P.y * TS + dy * P.prog;
    if (P.prog >= 16) {
      P.x = P.tx; P.y = P.ty; P.px = P.x * TS; P.py = P.y * TS; P.moving = false; P.step ^= 1;
      onArrive();
    }
    return;
  }
  if (RT.busy || UI.stack.length || RT.mode !== 'overworld') return;
  const d = heldDir();
  if (!d) { P.turn = 0; return; }
  if (P.dir !== d) { P.dir = d; P.turn = 5; return; }
  if (P.turn > 0) { P.turn--; return; }
  tryStep(d);
}
function tryStep(d) {
  const P = RT.P, m = RT.map;
  const [dx, dy] = DXY[d];
  const tx = P.x + dx, ty = P.y + dy;
  // sortie de carte
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) {
    const side = tx < 0 ? 'w' : tx >= m.w ? 'e' : ty < 0 ? 'n' : 's';
    const g = m.gates[side];
    const along = side === 'n' || side === 's' ? P.x : P.y;
    if (g && along >= g.p && along <= g.p + 1) { run(() => gateExit(side, along - g.p)); return; }
    bump(); return;
  }
  for (const gd of m.guards) {
    if (gd.cells.some(([x, y]) => x === tx && y === ty) && !gd.cond()) { run(async () => { await say(gd.text); }); return; }
  }
  if (blockedFor(tx, ty, 'player')) {
    const t = tileAt(tx, ty);
    if (P.surf && !npcAt(tx, ty) && !SOLID.has(t) && t !== '~') { /* débarquer */ }
    else { bump(); return; }
  }
  if (P.surf && tileAt(tx, ty) !== '~' && tileAt(tx, ty) !== '=') P.surf = false;
  P.tx = tx; P.ty = ty; P.moving = true; P.prog = 0;
}
let bumpT = 0;
function bump() { if (RT.frame - bumpT > 20) { sfx('bump'); bumpT = RT.frame; } }
async function gateExit(side, k) {
  const g = RT.map.gates[side];
  const M2 = getMap(g.to);
  const g2 = M2.gates[OPP[side]];
  let x, y;
  if (side === 'n') { x = g2.p + k; y = M2.h - 1; }
  else if (side === 's') { x = g2.p + k; y = 0; }
  else if (side === 'e') { x = 0; y = g2.p + k; }
  else { x = M2.w - 1; y = g2.p + k; }
  await fade(true, 150);
  await enterMap(g.to, x, y, SIDE_DIR[side]);
  await fade(false, 150);
}
function onArrive() {
  const P = RT.P, m = RT.map;
  const w = m.warps.find(w => w.x === P.x && w.y === P.y);
  if (w) {
    run(async () => {
      if (w.enter) { const e = interiorEntry(w.to); await warp(w.to, e[0], e[1], 'up'); }
      else await warp(w.to, w.tx, w.ty, w.dir);
    });
    return;
  }
  for (const lt of (m.lineTriggers || [])) {
    if ((lt.y != null && P.y === lt.y) || (lt.x != null && P.x === lt.x)) {
      const n = RT.npcs.find(nn => nn.src === lt.npc);
      if (n && n.trainer && !G.flags[n.trainer.flag]) { run(() => trainerBattle(n, true)); return; }
    }
  }
  for (const n of RT.npcs) {
    if (!n.trainer || G.flags[n.trainer.flag] || !n.trainer.sight) continue;
    const [dx, dy] = DXY[n.dir];
    for (let s = 1; s <= n.trainer.sight; s++) {
      const cx = n.x + dx * s, cy = n.y + dy * s;
      if (cx === P.x && cy === P.y) { run(() => trainerBattle(n, true)); return; }
      if (SOLID.has(tileAt(cx, cy)) || npcAt(cx, cy)) break;
    }
  }
  if (G.repel > 0) { G.repel--; if (G.repel === 0) { run(() => say("L'effet de la Repousse est terminé.")); return; } }
  const t = tileAt(P.x, P.y);
  let table = null, rate = 0;
  if (t === '"' && m.enc.grass) { table = m.enc.grass; rate = 1 / 9; }
  else if (P.surf && t === '~' && m.enc.water) { table = m.enc.water; rate = 1 / 12; }
  else if (m.kind === 'cave' && t === 'm' && m.enc.cave) { table = m.enc.cave; rate = 1 / 13; }
  if (table && Math.random() < rate) {
    const tod = timeOfDay();
    const pool = table.filter(e => !e[4] || (e[4] === 'n' ? tod === 'night' : tod !== 'night'));
    const tot = pool.reduce((a, e) => a + (e[3] || 20), 0);
    let r = Math.random() * tot, e = pool[0];
    for (const p of pool) { r -= (p[3] || 20); if (r <= 0) { e = p; break; } }
    const lvl = rnd(e[1], e[2]);
    const lead = G.party.find(mm => mm.hp > 0);
    if (G.repel > 0 && lead && lvl < lead.lvl) return;
    run(() => wildBattle(e[0], lvl));
  }
}
function envHere() {
  const m = RT.map;
  if (m.env) return m.env;
  if (m.kind === 'cave') return 'cave';
  if (RT.P.surf) return 'water';
  if (m.pal === 'neige') return 'snow';
  return 'grass';
}
async function wildBattle(sp, lvl) {
  const foe = makeMon(sp, lvl);
  const res = await runBattle({ kind: 'wild', foes: [foe], env: envHere() });
  if (res === 'lose') await whiteout();
}
async function whiteout() {
  await fade(true, 400);
  for (const k of ['elite1', 'elite2', 'elite3', 'elite4', 'champion']) delete G.flags['st_' + k];
  healAll();
  const c = G.lastCenter;
  await enterMap(c.map, c.x, c.y, 'down', { quiet: true });
  await fade(false, 400);
  await say(c.map.endsWith('home') ? "Tu te réveilles à la maison. Tes créatures se sont bien reposées." : "Tu te réveilles au Centre de Soin. Tes créatures ont été soignées.");
}

// ---------- Rendu ----------
function drawOverworld(x) {
  const m = RT.map, P = RT.P;
  const camX = Math.round(P.px - 112), camY = Math.round(P.py - 72);
  if (m.kind === 'int') { x.fillStyle = '#0c0d12'; x.fillRect(0, 0, 240, 160); }
  else { x.save(); x.translate(-camX, -camY); x.fillStyle = m.pattern; x.fillRect(camX, camY, 240, 160); x.restore(); }
  const layer = m.layers[m.layers.length > 1 ? (Math.floor(RT.frame / 30) % 2) : 0];
  x.drawImage(layer, -camX, -camY);
  const ents = RT.npcs.slice().map(n => ({ n, y: n.py })); ents.push({ n: null, y: P.py });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (!e.n) {
      const fr = P.moving && P.prog >= 4 && P.prog < 12 ? (P.step ? 1 : 2) : 0;
      const sx = P.px - camX, sy = P.py - camY - 4;
      if (P.surf) { x.fillStyle = '#2a6aa8'; x.beginPath(); x.ellipse(sx + 8, sy + 14, 9, 5, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#8ac8f2'; x.fillRect(sx + 1, sy + 12, 14, 2); }
      x.drawImage(personSprite(PALS[G.look] || PALS.player, P.dir, P.surf ? 0 : fr), sx, sy);
      if (!P.surf && tileAt(P.x, P.y) === '"' && !P.moving) x.drawImage(tileCanvas('"', m.pal, 0, 0), 0, 10, 16, 6, sx, P.py - camY + 10, 16, 6);
      continue;
    }
    const n = e.n;
    const sx = n.px - camX, sy = n.py - camY;
    if (sx < -48 || sy < -48 || sx > 260 || sy > 180) continue;
    if (n.kind === 'item') { drawSphere(x, sx + 8, sy + 9, 4); continue; }
    if (n.kind === 'ball') { drawSphere(x, sx + 8, sy + 6, 4); continue; }
    if (n.kind === 'legend') {
      const img = monSprite(LEGENDS[n.legend].sp, false);
      const bob = Math.sin(RT.frame / 20) * 2;
      x.globalAlpha = 0.9; x.drawImage(img, sx - 12, sy - 24 + bob, 40, 40); x.globalAlpha = 1;
      continue;
    }
    x.drawImage(personSprite(n.pal || NPC_PALS[0], n.dir, n.frame), sx, sy - 4);
  }
  if (RT.bubble) {
    const n = RT.bubble.npc; const sx = n.px - camX, sy = n.py - camY - 18;
    x.fillStyle = '#ffffff'; x.fillRect(sx + 3, sy, 10, 11); x.strokeStyle = '#22202a'; x.strokeRect(sx + 3.5, sy + 0.5, 9, 10);
    x.fillStyle = '#d84a3a'; x.fillRect(sx + 7, sy + 2, 2, 5); x.fillRect(sx + 7, sy + 8, 2, 1);
  }
  if (m.outdoor && !m.env) {
    const tod = timeOfDay();
    const tint = { morning: 'rgba(255,214,170,0.12)', day: null, evening: 'rgba(255,140,80,0.22)', night: 'rgba(30,40,110,0.42)' }[tod];
    if (tint) { x.fillStyle = tint; x.fillRect(0, 0, 240, 160); }
  }
}
function drawTitle(x) {
  const t = RT.frame / 60;
  const g = x.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, '#1c2448'); g.addColorStop(0.55, '#e0806a'); g.addColorStop(1, '#f6d58a');
  x.fillStyle = g; x.fillRect(0, 0, 240, 160);
  x.fillStyle = '#fff3c4'; x.beginPath(); x.arc(120, 112 - Math.min(20, t * 3), 26, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#ffffff';
  const r = rng(3); for (let i = 0; i < 40; i++) { const sx = r() * 240, sy = r() * 70; if ((i + Math.floor(t * 2)) % 7) x.fillRect(sx, sy, 1, 1); }
  x.fillStyle = '#2a3a2e';
  for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(i * 24 + 6, 132, 18 + (i % 3) * 4, Math.PI, 0); x.fill(); }
  x.fillRect(0, 130, 240, 30);
  const a = monSprite('auberis', false), n = monSprite('nocturnis', false);
  x.globalAlpha = 0.95;
  x.drawImage(a, 22, 60 + Math.sin(t * 1.4) * 3, 64, 64);
  x.save(); x.translate(218, 0); x.scale(-1, 1); x.drawImage(n, 0, 64 + Math.cos(t * 1.2) * 3, 64, 64); x.restore();
  x.globalAlpha = 1;
}

// ---------- Interactions ----------
function facing() { const [dx, dy] = DXY[RT.P.dir]; return [RT.P.x + dx, RT.P.y + dy]; }
async function interact() {
  const [fx, fy] = facing();
  let n = RT.npcs.find(nn => nn.x === fx && nn.y === fy && !nn.mv);
  const t = tileAt(fx, fy);
  if (!n && t === 'c') { const [dx, dy] = DXY[RT.P.dir]; n = RT.npcs.find(nn => nn.x === fx + dx && nn.y === fy + dy); }
  if (n) return talk(n);
  if (t === 'S') { const s = RT.map.signs[fx + ',' + fy]; if (s) return say(s); return; }
  if (t === 'C') return pcScreen();
  if (t === 'B') return say(pick(Math.random, ["Des livres sur les créatures. « Le lien entre l'aube et le réveil », par L. Lierre.", "Un vieux livre : « Les gardiens partagent le ciel depuis mille ans. »", "Un manuel de combat. Les types se répondent comme un cercle."]));
  if (t === '~' && !RT.P.surf) {
    if (!canSurf()) return say(G.badges[2] ? "L'eau est calme. Une créature de type Eau pourrait te porter." : "L'eau est profonde et calme.");
    const r = await ask("L'eau est calme. Veux-tu nager ?");
    if (r === 0) { sfx('surf'); RT.P.surf = true; const P = RT.P; P.tx = fx; P.ty = fy; P.moving = true; P.prog = 0; }
    return;
  }
  if (t === 'b') {
    if (!canCut()) return say(G.badges[0] ? "Un arbuste épais. Une créature de type Flore pourrait le couper." : "Un arbuste épais bloque le passage.");
    const r = await ask("Cet arbuste peut être coupé. Le couper ?");
    if (r === 0) {
      sfx('cut'); RT.map.t[fy][fx] = '.'; G.flags['cut:' + RT.map.id + ':' + fx + ',' + fy] = 1; buildLayers(RT.map);
    }
  }
}
async function talk(n) {
  if (n.kind === 'item') {
    G.flags[n.flag] = 1; addItem(n.item); sfx('item');
    refreshNpcs();
    return say(`Tu trouves : ${ITEMS[n.item].n} !`);
  }
  if (n.kind === 'legend') return legendEvent(n);
  if (n.kind !== 'ball') {
    const opp = { up: 'down', down: 'up', left: 'right', right: 'left' }[RT.P.dir];
    n.dir = opp;
  }
  if (n.trainer && !G.flags[n.trainer.flag]) return trainerBattle(n, false);
  if (n.script) return SCRIPTS[n.script](n);
  if (n.trainer) return say(fmt(n.trainer.after || n.trainer.lose), { speaker: trLabel(n.trainer) });
  if (n.text) return say(typeof n.text === 'function' ? n.text() : n.text);
}
function trLabel(t) {
  if (t.cls === 'rival') return G.rival;
  if (t.cls === 'leader') return t.name;
  return (TCLS[t.cls].n ? TCLS[t.cls].n + ' ' : '') + fmt(t.name);
}
async function approach(n) {
  for (let i = 0; i < 40; i++) {
    const dx = RT.P.x - n.x, dy = RT.P.y - n.y;
    if (Math.abs(dx) + Math.abs(dy) <= 1) break;
    const prim = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const sec = Math.abs(dx) >= Math.abs(dy) ? (dy > 0 ? 'down' : dy < 0 ? 'up' : null) : (dx > 0 ? 'right' : dx < 0 ? 'left' : null);
    let ok = await npcStep(n, prim);
    if (!ok && sec) ok = await npcStep(n, sec);
    if (!ok) break;
  }
  const dx = RT.P.x - n.x, dy = RT.P.y - n.y;
  n.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  RT.P.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[n.dir];
}
function buildTeam(tr) {
  const strong = ['leader', 'elite', 'champion', 'ancien', 'boss', 'admin', 'rival'].includes(tr.cls);
  return tr.team.map(([sp, l]) => {
    const s = sp === '$S' ? evolveForLevel(RIVAL_COUNTER[G.flags.starter] || 'brasille', l) : sp;
    return makeMon(s, l, { shiny: false, goodIv: strong });
  });
}
async function trainerBattle(n, spotted) {
  const tr = n.trainer;
  if (spotted) {
    RT.bubble = { npc: n }; sfx('exclaim');
    await wait(650); RT.bubble = null;
    await approach(n);
  }
  const mus = tr.music || (tr.cls === 'somnis' || tr.cls === 'admin' ? 'somnis' : 'trainer');
  playMusic(mus);
  await say(fmt(tr.intro), { speaker: trLabel(tr) });
  const res = await runBattle({ kind: 'trainer', foes: buildTeam(tr), trainer: Object.assign({ pal: n.pal }, tr), env: envHere(), music: mus, noLoss: tr.noLoss });
  if (res === 'lose' && !tr.noLoss) { await whiteout(); return 'lose'; }
  if (res === 'lose') healAll();
  G.flags[tr.flag] = 1;
  await postTrainer(n, tr);
  return 'win';
}
async function postTrainer(n, tr) {
  if (tr.leader != null) {
    const gym = GYMS[tr.leader];
    G.badges[tr.leader] = true;
    sfx('badge'); await wait(200);
    await say(`Tu reçois le ${gym.badge} de la part de ${gym.leader} !`);
    if (gym.field) await say(gym.field);
    if (tr.leader === 7) await say("Aldric : Tu as les huit badges de Solvène. Traverse la Grotte de l'Aube. Le Plateau Aurore t'attend.", { speaker: 'Aldric' });
    if (tr.leader === 15) await say("Orane : Seize badges... Personne n'en avait réuni autant depuis l'Éveillé lui-même.", { speaker: 'Orane' });
  }
  if (n.story === 'champion') return championEnding();
  if (n.story === 'somnis_aube2') await say("Oniris s'enfuit. Derrière lui, sur l'autel, une forme lumineuse respire doucement...");
  if (n.story === 'somnis_nuit2') { await say("Oniris s'assoit dans l'herbe, épuisé. Pour la première fois, il regarde le ciel nocturne sans vouloir l'arrêter."); G.flags.somnisDone = 1; }
  if (n.story === 'elio') { await say("Elio s'écarte lentement. Le ciel au-dessus de l'autel se fend en deux : moitié jour, moitié nuit."); refreshNpcs(); }
  if (tr.after && !tr.hideAfter) await say(fmt(tr.after), { speaker: trLabel(tr) });
  else if (tr.after && tr.cls === 'rival') await say(fmt(tr.after), { speaker: trLabel(tr) });
  if (tr.hideAfter) {
    await fade(true, 150);
    refreshNpcs();
    await fade(false, 150);
  }
  if (RT.map) playMusic(mapMusic(RT.map));
}
async function legendEvent(n) {
  const L = LEGENDS[n.legend];
  sfx('exclaim');
  await say(L.text);
  const res = await runBattle({ kind: 'wild', foes: [makeMon(L.sp, L.lvl, { goodIv: true, shiny: false })], legend: n.legend, env: 'sacred', music: 'boss' });
  if (res === 'lose') { await whiteout(); return; }
  if (res === 'caught') { refreshNpcs(); }
  else if (res === 'win') await say("Le gardien se dissout dans la lumière... Il reviendra peut-être, si tu reviens le voir.");
  else await say("Le gardien te regarde partir. Il t'attendra.");
  if (n.legend === 'eveillon' && !G.flags.ending) await finalEnding();
}
async function championEnding() {
  playMusic('title');
  await say("Célestin : C'est fini. Tu es le nouveau Champion de Solvène.", { speaker: 'Célestin' });
  await hallOfFame("Ligue de Solvène");
  G.flags.champion1 = 1;
  await say("Célestin : Le Prof. Lierre m'a confié ceci pour toi. Brumaire, au-delà de la mer, garde le second gardien. L'Ordre Somnis y est parti.", { speaker: 'Célestin' });
  G.keys.ticket = 1; sfx('item');
  await say("Tu reçois le Billet Brume ! Le ferry de Port-Clair peut maintenant t'emmener à Brumaire.");
  healAll();
  const town = getMap('t9');
  const c = town.buildings.find(b => b.kind === 'center');
  G.lastCenter = { map: 't9~center', x: 5, y: 3 };
  await warp('t9', c.door[0], c.door[1] + 1, 'down');
  saveGame(true);
}
async function finalEnding() {
  G.flags.ending = 1;
  playMusic('title');
  await fade(true, 600);
  const lines = [
    "Le jour et la nuit se rejoignent au sommet du Mont Éveil.",
    "Aubéris appelle le matin. Nocturnis garde le sommeil. Et entre les deux, chaque jour, le monde s'éveille.",
    `${G.name} a traversé Solvène et Brumaire, réuni ${G.badges.filter(Boolean).length} badges et rencontré les trois gardiens.`,
    `${G.rival} est redescendu vers Rosée. Il dit qu'il reviendra. Il revient toujours.`,
    "L'Ordre Somnis n'existe plus. Oniris, paraît-il, se lève maintenant chaque matin pour voir le soleil.",
    "Merci d'avoir joué à Awakening.",
    "Le monde reste ouvert : complète le Codex, affronte de nouveau la Ligue, explore la nuit.",
  ];
  await fade(false, 600);
  for (const l of lines) await say(l);
  saveGame(true);
}
async function hallOfFame(title) {
  const p = el('panel hof', 0, 0, 240, 160);
  p.innerHTML = `<h2>${esc(title)}</h2><p>Temple de la Renommée</p><div class="hofg">${G.party.map(m => `<div><img src="${monURL(m.sp, m.shiny)}" alt=""><span>${esc(monName(m))}</span><small>N.${m.lvl}</small></div>`).join('')}</div><p class="hint">${esc(G.name)} · ${fmtTime(G.time)}</p>`;
  sfx('badge');
  await wait(600);
  await waitKey();
  p.remove();
}
function fmtTime(s) { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return `${h} h ${String(m).padStart(2, '0')}`; }

// ---------- Scripts ----------
const SCRIPTS = {
  async nurse() {
    const r = await ask("Bienvenue au Centre de Soin ! Je soigne tes créatures ?", ['Oui', 'Non'], { speaker: 'Infirmière' });
    if (r !== 0) return say("À bientôt !");
    await say("Je m'occupe d'elles. Un instant...", { speaker: 'Infirmière', auto: 700 });
    healAll(); sfx('heal'); await wait(900);
    G.lastCenter = { map: RT.map.id, x: 5, y: 3 };
    const ok = saveGame(true);
    await say(`Tes créatures sont en pleine forme ! ${ok ? '(Partie sauvegardée.)' : ''} À bientôt !`, { speaker: 'Infirmière' });
  },
  async shop() {
    while (true) {
      const r = await ask("Bienvenue ! Que puis-je faire pour toi ?", ['Acheter', 'Vendre', 'Quitter'], { speaker: 'Vendeur', w: 60 });
      if (r === 0) await shopBuy();
      else if (r === 1) await shopSell();
      else return say("Merci, et à bientôt !");
    }
  },
  async mom() {
    if (!G.flags.starter) return say("Le Prof. Lierre te cherchait ! Son labo est juste en face. Et n'oublie pas : ta maison, c'est ici.", { speaker: 'Maman' });
    healAll(); sfx('heal');
    G.lastCenter = { map: 't0~home', x: 4, y: 4 };
    return say(pick(Math.random, ["Tu as l'air fatigué. Repose-toi un peu. Voilà, tes créatures sont en forme !", "Je suis fière de toi. Tiens, tes créatures sont soignées.", "Tu as encore grandi ! Repose-toi avant de repartir."]), { speaker: 'Maman' });
  },
  async prof() {
    if (!G.flags.starter) {
      if (!G.flags.metProf) {
        G.flags.metProf = 1;
        await say(["Ah, te voilà ! J'ai trois créatures qui attendent un dresseur.", "Elles sont dans ces Sphères, sur la table. Feuillon, de type Flore. Brasille, de type Feu. Clapotin, de type Eau.", "Approche-toi de la table et choisis celle qui te ressemble."], { speaker: 'Prof. Lierre' });
      } else await say("Choisis une des trois Sphères sur la table.", { speaker: 'Prof. Lierre' });
      return;
    }
    const seen = Object.keys(G.seen).length, caught = Object.keys(G.caught).length;
    await say(`Voyons ton Codex... ${seen} créatures vues, ${caught} capturées sur ${DEX.length}.`, { speaker: 'Prof. Lierre' });
    await say(caught < 10 ? "C'est un bon début ! Les hautes herbes, l'eau et les grottes abritent des créatures différentes." : caught < 40 ? "Tu progresses bien ! N'oublie pas d'explorer la nuit." : caught < 80 ? "Impressionnant ! Il en reste encore quelques-unes, bien cachées." : "Tu as presque tout vu... Il ne te reste que les gardiens, peut-être ?", { speaker: 'Prof. Lierre' });
  },
  async starter(n) {
    const sp = n.data;
    const prev = el('panel preview', 70, 10, 100, 90);
    prev.innerHTML = `<img src="${monURL(sp)}" alt=""><div>${esc(SP[sp].n)}</div><div>${SP[sp].types.map(typePill).join('')}</div>`;
    const r = await ask(`${SP[sp].n}, de type ${SP[sp].types.map(t => TN[t]).join('/')}. Tu le choisis ?`);
    prev.remove();
    if (r !== 0) return;
    const m = makeMon(sp, 5, { goodIv: true, shiny: false });
    giveMon(m); G.flags.starter = sp; sfx('item');
    await say(`Tu reçois ${SP[sp].n} !`);
    G.flags.rivalPick = 1;
    refreshNpcs();
    const rv = RIVAL_COUNTER[sp];
    await say(`Moi, je prends ${SP[rv].n} ! Il est fort contre le tien, désolé !`, { speaker: G.rival });
    const rn = RT.npcs.find(nn => nn.pal === PALS.rival);
    if (rn) await approach(rn);
    const tr = Object.assign({ flag: 'st_rival1' }, STORY_TRAINERS.rival1);
    await say(fmt(tr.intro), { speaker: G.rival });
    const res = await runBattle({ kind: 'trainer', foes: buildTeam(tr), trainer: Object.assign({ pal: PALS.rival }, tr), env: 'indoor', music: 'trainer', noLoss: true });
    healAll();
    G.flags.st_rival1 = 1;
    await say(res === 'win' ? "Bon, bon. Je vais m'entraîner. La prochaine fois, je ne perdrai pas !" : "Ha ! J'ai gagné ! Allez, je file m'entraîner. À plus !", { speaker: G.rival });
    await fade(true, 200); refreshNpcs(); await fade(false, 200);
    await say(["Excellent combat ! Tes créatures sont soignées.", "Voici le Codex. Il enregistre chaque créature que tu vois et que tu captures.", "Et ce Partage Exp : il fait progresser toute ton équipe, même celles qui ne combattent pas.", "Prends aussi ces cinq Sphères pour capturer des créatures sauvages. Affaiblis-les d'abord !", "La première arène est à Verdelune, au nord. Bon voyage !"], { speaker: 'Prof. Lierre' });
    G.keys.codex = 1; G.keys.partage = 1; addItem('sphere', 5); addItem('baume', 3); sfx('item');
    await say("Tu reçois le Codex, le Partage Exp, 5 Sphères et 3 Baumes !");
  },
  async gift(n) {
    const { town, h } = n.data;
    const flag = 'gift_' + town;
    if (G.flags[flag]) return say(pick(Math.random, TOWNS[town].lines || ["Bonne route !"]));
    await say(h.text);
    if (h.gift) { addItem(h.gift[0], h.gift[1]); sfx('item'); await say(`Tu reçois ${h.gift[1] > 1 ? h.gift[1] + ' × ' : ''}${ITEMS[h.gift[0]].n} !`); }
    if (h.giftMon) {
      const m = makeMon(h.giftMon[0], h.giftMon[1], { goodIv: true });
      const boxed = giveMon(m); sfx('item');
      await say(`Tu reçois ${SP[m.sp].n} !${boxed ? ' Il est envoyé dans la boîte du PC.' : ''}`);
    }
    G.flags[flag] = 1;
  },
  async dock() {
    if (RT.map.id === 't3') {
      if (!G.keys.ticket) return say("Le ferry pour Brumaire part d'ici. Seuls les champions de la Ligue de Solvène peuvent embarquer.", { speaker: 'Marin' });
      const r = await ask("Tu as le Billet Brume ! On embarque pour Havre-Brume ?", ['Oui', 'Non'], { speaker: 'Marin' });
      if (r !== 0) return;
      await fade(true, 500); await say("Le ferry traverse la mer pendant toute une nuit...", { auto: 1400 });
      const m = getMap('u0'); const d = m.npcs.find(nn => nn.script === 'dock');
      await enterMap('u0', d.x, d.y - 1, 'up');
      await fade(false, 500);
      if (!G.flags.arrivedB) { G.flags.arrivedB = 1; await say("Bienvenue à Brumaire ! Huit arènes t'attendent. On dit qu'au bout se dresse le Mont Éveil.", { speaker: 'Marin' }); }
    } else {
      const r = await ask("Retourner à Port-Clair, en Solvène ?", ['Oui', 'Non'], { speaker: 'Marin' });
      if (r !== 0) return;
      await fade(true, 500);
      const m = getMap('t3'); const d = m.npcs.find(nn => nn.script === 'dock');
      await enterMap('t3', d.x, d.y - 1, 'up');
      await fade(false, 500);
    }
  },
};

// ---------- Objets ----------
function useItemOn(id, m, dry) {
  const it = ITEMS[id], mx = maxHp(m), n = monName(m);
  if (it.k === 'heal') { if (m.hp <= 0 || m.hp >= mx) return null; const h = Math.min(mx - m.hp, it.hp); if (!dry) m.hp += h; return `${n} récupère ${h} PV.`; }
  if (it.k === 'cure') { if (!m.status || !it.st.includes(m.status) || m.hp <= 0) return null; if (!dry) { m.status = null; m.slp = 0; } return `${n} est soigné !`; }
  if (it.k === 'revive') { if (m.hp > 0) return null; if (!dry) m.hp = Math.floor(mx / 2); return `${n} reprend des forces !`; }
  if (it.k === 'pp') { if (m.moves.every(mv => mv.pp >= MOVES[mv.id].pp)) return null; if (!dry) m.moves.forEach(mv => mv.pp = Math.min(MOVES[mv.id].pp, mv.pp + 10)); return `Les PP de ${n} sont restaurés.`; }
  if (it.k === 'candy') { if (m.lvl >= 100) return null; return 'ok'; }
  return null;
}
async function learnMove(m, id, inBattle) {
  const M = MOVES[id], n = monName(m);
  const sy = t => inBattle ? bsay(t, 1500) : say(t);
  if (m.moves.some(mv => mv.id === id)) return;
  if (m.moves.length < 4) { m.moves.push({ id, pp: M.pp }); sfx('item'); await sy(`${n} apprend ${M.n} !`); return; }
  await sy(`${n} veut apprendre ${M.n}, mais connaît déjà quatre capacités.`);
  const r = await ask(`Oublier une capacité pour apprendre ${M.n} ?`);
  if (r === 0) {
    const i = await menu(m.moves.map(mv => ({ label: MOVES[mv.id].n, right: TN[MOVES[mv.id].t] })).concat([{ label: M.n, right: 'Nouv.' }]), { x: 112, y: 20, w: 124, title: 'Oublier quelle capacité ?' });
    if (i >= 0 && i < 4) {
      const old = MOVES[m.moves[i].id].n;
      m.moves[i] = { id, pp: M.pp };
      await sy(`1, 2 et... hop ! ${n} oublie ${old} et apprend ${M.n} !`);
      return;
    }
  }
  await sy(`${n} n'a pas appris ${M.n}.`);
}
async function evolveCheck(list) {
  for (const m of new Set(list)) {
    const s = SP[m.sp];
    if (s.next && m.lvl >= s.evo && m.hp > 0) await evolveScene(m);
  }
}
async function evolveScene(m) {
  const from = m.sp, to = SP[m.sp].next;
  const p = el('panel evo', 0, 0, 240, 160);
  const name = monName(m);
  p.innerHTML = `<div class="evos"><img class="a" src="${monURL(from, m.shiny)}" alt=""><img class="b" src="${monURL(to, m.shiny)}" alt=""></div>`;
  const dl = el('dlg', 4, 112, 232, 44, `<div class="txt">Quoi ? ${esc(name)} évolue !</div>`);
  sfx('evolve');
  let cancelled = false;
  const h = { press(b) { if (b === 'b') cancelled = true; } };
  uiPush(h);
  const a = p.querySelector('.a'), b = p.querySelector('.b');
  for (let i = 0; i < 14 && !cancelled; i++) {
    const on = i % 2 === 1;
    a.style.opacity = on ? 0 : 1; b.style.opacity = on ? 1 : 0;
    await wait(Math.max(90, 380 - i * 22));
  }
  uiPop(h); dl.remove();
  if (cancelled) {
    a.style.opacity = 1; b.style.opacity = 0;
    await say(`Hein ? ${name} a arrêté d'évoluer.`);
    p.remove(); return;
  }
  a.style.opacity = 0; b.style.opacity = 1;
  const oldMax = maxHp(m);
  m.sp = to;
  m.hp = Math.min(maxHp(m), m.hp + maxHp(m) - oldMax);
  G.seen[to] = 1; G.caught[to] = 1;
  sfx('level');
  await say(`Félicitations ! ${name} a évolué en ${SP[to].n} !`);
  for (const mv of movesLearnedAt(to, m.lvl)) await learnMove(m, mv, false);
  p.remove();
}

// ---------- Écrans ----------
function monRow(m, i, sel) {
  const st = calcStats(m), f = m.hp / st.hp;
  return `<div class="pslot${sel ? ' sel' : ''}${m.hp <= 0 ? ' ko' : ''}"><img src="${monURL(m.sp, m.shiny)}" alt=""><div class="pn"><span>${esc(monName(m))}</span><small>N.${m.lvl} ${statusPill(m.status)}</small></div><div class="ph"><div class="bar"><i style="width:${f * 100}%;background:${hpColor(f)}"></i></div><small>${m.hp}/${st.hp}</small></div></div>`;
}
function partyScreen(o = {}) {
  return new Promise(res => {
    const p = el('panel party', 0, 0, 240, 160);
    let sel = o.force ? Math.max(0, G.party.findIndex(m => m.hp > 0)) : 0, swapFrom = -1;
    const render = () => {
      p.innerHTML = `<div class="ptitle">${esc(swapFrom >= 0 ? 'Échanger avec quelle créature ?' : (o.title || 'Équipe'))}</div><div class="plist">${G.party.map((m, i) => monRow(m, i, i === sel).replace('pslot', 'pslot' + (i === swapFrom ? ' swap' : ''))).join('')}</div>`;
    };
    render();
    const h = {
      async press(b) {
        if (h.lock) return;
        if (b === 'up') { sel = (sel - 1 + G.party.length) % G.party.length; sfx('move'); render(); }
        else if (b === 'down') { sel = (sel + 1) % G.party.length; sfx('move'); render(); }
        else if (b === 'b') {
          if (swapFrom >= 0) { swapFrom = -1; render(); return; }
          if (o.force) return;
          sfx('cancel'); close(-1);
        } else if (b === 'a') {
          sfx('select');
          if (swapFrom >= 0) { const t = G.party[swapFrom]; G.party[swapFrom] = G.party[sel]; G.party[sel] = t; swapFrom = -1; render(); return; }
          if (o.mode === 'pick') {
            if (o.force && G.party[sel].hp <= 0) { sfx('bump'); return; }
            close(sel); return;
          }
          h.lock = true;
          const r = await menu(['Résumé', 'Déplacer', 'Retour'], { x: 168, y: 96, w: 68 });
          h.lock = false;
          if (r === 0) { h.lock = true; await summaryScreen(sel); h.lock = false; render(); }
          if (r === 1) { swapFrom = sel; render(); }
        }
      },
    };
    function close(v) { uiPop(h); p.remove(); res(v); }
    uiPush(h);
  });
}
function summaryScreen(idx) {
  return new Promise(res => {
    const p = el('panel summ', 0, 0, 240, 160);
    let i = idx;
    const render = () => {
      const m = G.party[i], s = SP[m.sp], st = calcStats(m);
      const nx = m.lvl >= 100 ? 0 : xpAt(m.sp, m.lvl + 1) - m.xp;
      p.innerHTML = `<div class="sl"><img src="${monURL(m.sp, m.shiny)}" alt=""><div class="sn">${esc(monName(m))}${m.shiny ? ' <em>chromatique</em>' : ''}</div><div>N° ${String(s.num).padStart(3, '0')} · N.${m.lvl}</div><div>${s.types.map(typePill).join('')} ${statusPill(m.status)}</div><div class="sx">Exp. avant niveau suivant : ${nx}</div>${s.next ? `<div class="sx">Évolue au niveau ${s.evo}</div>` : ''}</div>
      <div class="sr"><table>${STATK.map(k => `<tr><td>${STAT_NAME[k]}</td><td>${k === 'hp' ? m.hp + '/' : ''}${st[k]}</td></tr>`).join('')}</table>
      <div class="smv">${m.moves.map(mv => { const M = MOVES[mv.id]; return `<div>${typePill(M.t)}<span>${esc(M.n)}</span><b>${mv.pp}/${M.pp}</b></div>`; }).join('')}</div></div>`;
    };
    render();
    const h = {
      press(b) {
        if (b === 'up' || b === 'left') { i = (i - 1 + G.party.length) % G.party.length; sfx('move'); render(); }
        else if (b === 'down' || b === 'right') { i = (i + 1) % G.party.length; sfx('move'); render(); }
        else if (b === 'a' || b === 'b') { sfx('cancel'); uiPop(h); p.remove(); res(); }
      },
    };
    uiPush(h);
  });
}
async function bagScreen(ctx) {
  const tabs = ctx === 'battle' ? ['Soins', 'Sphères'] : ['Soins', 'Sphères', 'Objets rares'];
  let tab = 0;
  const p = el('panel bag', 0, 0, 240, 160);
  try {
    while (true) {
      const list = tab === 2 ? Object.keys(KEY_ITEMS).filter(k => G.keys[k]) : ITEM_ORDER.filter(k => G.bag[k] > 0 && ((ITEMS[k].k === 'ball') === (tab === 1)));
      if (ctx === 'battle' && tab === 0) for (let k = list.length - 1; k >= 0; k--) if (['repel', 'candy'].includes(ITEMS[list[k]].k)) list.splice(k, 1);
      p.innerHTML = `<div class="btabs">${tabs.map((t, i) => `<span class="${i === tab ? 'on' : ''}">${t}</span>`).join('')}<small>Gauche / droite</small></div><div class="bdesc" id="bdesc"></div>`;
      const desc = p.querySelector('#bdesc');
      const items = list.length ? list.map(k => tab === 2 ? { label: KEY_ITEMS[k].n, right: k === 'partage' ? (G.opts.share !== false ? 'Actif' : 'Inactif') : '' } : { label: ITEMS[k].n, right: '× ' + G.bag[k] }) : [{ label: '(vide)', disabled: true }];
      const r = await new Promise(resolve => {
        let sel = 0, top = 0; const rows = 7;
        const box = el('menu bagl', 6, 18, 150, 104);
        const render = () => {
          if (sel < top) top = sel; if (sel >= top + rows) top = sel - rows + 1;
          box.innerHTML = items.slice(top, top + rows).map((it, j) => `<div class="mi${top + j === sel ? ' sel' : ''}${it.disabled ? ' dis' : ''}"><span>${esc(it.label)}</span><b>${esc(it.right || '')}</b></div>`).join('');
          const k = list[sel];
          desc.textContent = k ? (tab === 2 ? KEY_ITEMS[k].d : ITEMS[k].d) : '';
        };
        render();
        const h = {
          press(b) {
            if (b === 'up') { sel = (sel - 1 + items.length) % items.length; sfx('move'); render(); }
            else if (b === 'down') { sel = (sel + 1) % items.length; sfx('move'); render(); }
            else if (b === 'left' || b === 'right') { tab = (tab + (b === 'left' ? tabs.length - 1 : 1)) % tabs.length; sfx('move'); done('tab'); }
            else if (b === 'b') { sfx('cancel'); done(null); }
            else if (b === 'a') { if (!list.length) return; sfx('select'); done(list[sel]); }
          },
        };
        function done(v) { uiPop(h); box.remove(); resolve(v); }
        uiPush(h);
      });
      if (r === 'tab') continue;
      if (!r) return null;
      if (tab === 2) {
        if (r === 'partage') { G.opts.share = G.opts.share === false; toast(`Partage Exp ${G.opts.share ? 'activé' : 'désactivé'}`); }
        else if (r === 'codex') await codexScreen();
        continue;
      }
      const it = ITEMS[r];
      if (ctx === 'battle') {
        if (it.k === 'ball') return { item: r };
        const ti = await partyScreen({ mode: 'pick', title: `Utiliser ${it.n} sur quelle créature ?` });
        if (ti < 0) continue;
        if (!useItemOn(r, G.party[ti], true)) { await say("Ça n'aura aucun effet."); continue; }
        return { item: r, target: ti };
      }
      if (it.k === 'ball') { await say("Les Sphères s'utilisent pendant un combat contre une créature sauvage."); continue; }
      if (it.k === 'repel') { G.repel = it.steps; G.bag[r]--; if (!G.bag[r]) delete G.bag[r]; sfx('item'); await say(`Tu utilises ${it.n}. Les créatures faibles vont t'éviter.`); continue; }
      const ti = await partyScreen({ mode: 'pick', title: `Utiliser ${it.n} sur quelle créature ?` });
      if (ti < 0) continue;
      const m = G.party[ti];
      if (it.k === 'candy') {
        if (m.lvl >= 100) { await say("Ça n'aura aucun effet."); continue; }
        G.bag[r]--; if (!G.bag[r]) delete G.bag[r];
        p.hidden = true;
        RT.leveled = [];
        await gainXP(m, xpAt(m.sp, m.lvl + 1) - m.xp, false);
        await evolveCheck([m]);
        p.hidden = false;
        continue;
      }
      const msg = useItemOn(r, m, false);
      if (!msg) { await say("Ça n'aura aucun effet."); continue; }
      G.bag[r]--; if (!G.bag[r]) delete G.bag[r];
      sfx('heal'); await say(msg);
    }
  } finally { p.remove(); }
}
function shopList() {
  const reg = RT.map.reg;
  const total = G.badges.filter(Boolean).length;
  const out = [];
  for (const [n, items] of SHOP_TIERS) if (total >= n || (reg === 'brumaire' && n <= 8)) out.push(...items);
  return out;
}
async function shopBuy() {
  const list = shopList();
  while (true) {
    const mb = el('menu money', 4, 4, 90, 18, `<div class="mi"><span>Argent</span><b>${fmtMoney(G.money)}</b></div>`);
    const desc = el('menu sdesc', 4, 122, 232, 34);
    const i = await menu(list.map(k => ({ label: ITEMS[k].n, right: fmtMoney(ITEMS[k].p) })), { x: 100, y: 4, w: 136, rows: 8, onMove: j => desc.textContent = ITEMS[list[j]].d });
    if (i < 0) { mb.remove(); desc.remove(); return; }
    const it = ITEMS[list[i]];
    const max = Math.min(99, Math.floor(G.money / it.p));
    if (max < 1) { mb.remove(); desc.remove(); await say("Tu n'as pas assez d'argent."); continue; }
    const q = await pickQty(max, it.p);
    mb.remove(); desc.remove();
    if (!q) continue;
    G.money -= it.p * q; addItem(list[i], q); sfx('item');
    let bonus = '';
    if (list[i] === 'sphere' && q >= 10) { addItem('sphere', 1); bonus = ' Et voici une Sphère en cadeau !'; }
    await say(`Tu achètes ${q} × ${it.n}. Merci !${bonus}`);
  }
}
async function shopSell() {
  while (true) {
    const list = ITEM_ORDER.filter(k => G.bag[k] > 0 && ITEMS[k].p > 0);
    if (!list.length) return say("Tu n'as rien à vendre.");
    const i = await menu(list.map(k => ({ label: ITEMS[k].n + ' × ' + G.bag[k], right: fmtMoney(Math.floor(ITEMS[k].p / 2)) })), { x: 60, y: 4, w: 176, rows: 8 });
    if (i < 0) return;
    const k = list[i];
    const q = await pickQty(G.bag[k], Math.floor(ITEMS[k].p / 2));
    if (!q) continue;
    G.bag[k] -= q; if (!G.bag[k]) delete G.bag[k];
    G.money += Math.floor(ITEMS[k].p / 2) * q; sfx('item');
  }
}
async function pcScreen() {
  sfx('select');
  await say(`${G.name} allume le PC.`, { auto: 600 });
  while (true) {
    const r = await menu(['Retirer', 'Déposer', 'Quitter'], { x: 4, y: 4, w: 70, title: `Boîte : ${G.box.length}` });
    if (r === 0) {
      if (!G.box.length) { await say("La boîte est vide."); continue; }
      if (G.party.length >= 6) { await say("Ton équipe est complète."); continue; }
      const prev = el('panel pcprev', 4, 60, 70, 70);
      const i = await menu(G.box.map(m => ({ label: monName(m), right: 'N.' + m.lvl })), { x: 80, y: 4, w: 156, rows: 10, onMove: j => { const m = G.box[j]; prev.innerHTML = `<img src="${monURL(m.sp, m.shiny)}" alt="">`; } });
      prev.remove();
      if (i < 0) continue;
      const m = G.box.splice(i, 1)[0]; G.party.push(m);
      await say(`${monName(m)} rejoint l'équipe.`);
    } else if (r === 1) {
      if (G.party.length <= 1) { await say("Tu ne peux pas déposer ta dernière créature !"); continue; }
      const i = await partyScreen({ mode: 'pick', title: 'Déposer quelle créature ?' });
      if (i < 0) continue;
      if (G.party.filter((m, j) => j !== i && m.hp > 0).length === 0) { await say("Il te faut au moins une créature en forme dans l'équipe."); continue; }
      const m = G.party.splice(i, 1)[0]; healMon(m); G.box.push(m);
      await say(`${monName(m)} est déposé dans la boîte.`);
    } else return;
  }
}
function codexScreen() {
  return new Promise(res => {
    const p = el('panel codex', 0, 0, 240, 160);
    let sel = 0, top = 0; const rows = 11;
    const render = () => {
      if (sel < top) top = sel; if (sel >= top + rows) top = sel - rows + 1;
      const sp = DEX[sel], s = SP[sp], seen = G.seen[sp], caught = G.caught[sp];
      const nSeen = Object.keys(G.seen).length, nCaught = Object.keys(G.caught).length;
      p.innerHTML = `<div class="cl"><div class="ptitle">Codex · Vus ${nSeen} · Capturés ${nCaught} / ${DEX.length}</div>${DEX.slice(top, top + rows).map((id, j) => `<div class="mi${top + j === sel ? ' sel' : ''}"><span>${String(SP[id].num).padStart(3, '0')} ${G.seen[id] ? esc(SP[id].n) : '-----'}</span><b>${G.caught[id] ? '●' : G.seen[id] ? '○' : ''}</b></div>`).join('')}</div>
        <div class="cr">${seen ? `<img src="${monURL(sp)}" alt="">` : `<img class="sil" src="${silhouetteURL(sp)}" alt="">`}<div class="cn">${seen ? esc(s.n) : '???'}</div><div>${seen ? s.types.map(typePill).join('') : ''}</div><p>${caught ? esc(s.desc) : seen ? 'Capture-le pour en savoir plus.' : 'Aucune donnée.'}</p></div>`;
    };
    render();
    const h = {
      press(b) {
        if (b === 'up') sel = (sel - 1 + DEX.length) % DEX.length;
        else if (b === 'down') sel = (sel + 1) % DEX.length;
        else if (b === 'left') sel = Math.max(0, sel - rows);
        else if (b === 'right') sel = Math.min(DEX.length - 1, sel + rows);
        else if (b === 'a' || b === 'b') { sfx('cancel'); uiPop(h); p.remove(); res(); return; }
        sfx('move'); render();
      },
    };
    uiPush(h);
  });
}
function cardScreen() {
  const p = el('panel card', 0, 0, 240, 160);
  const badges = GYMS.map((g, i) => `<span class="bdg${G.badges[i] ? ' on' : ''}" style="--tc:${TC[g.type]}" title="${esc(g.badge)}"></span>`);
  p.innerHTML = `<div class="ctop"><img src="${personURL(PALS[G.look] || PALS.player)}" alt=""><div><div class="cn">${esc(G.name)}</div><div>Argent : ${fmtMoney(G.money)}</div><div>Codex : ${Object.keys(G.caught).length} capturées</div><div>Temps de jeu : ${fmtTime(G.time)}</div><div>Heure : ${TOD_NAME[timeOfDay()]}</div></div></div>
  <div class="cb"><small>Solvène</small><div>${badges.slice(0, 8).join('')}</div><small>Brumaire</small><div>${badges.slice(8).join('')}</div></div>`;
  return waitKey().then(() => p.remove());
}
function regionLayout(rk) {
  const R = REGIONS[rk];
  const pos = {}; let x = 0, y = 0;
  pos[R.chain[0]] = [0, 0];
  for (let k = 0; k < R.dirs.length; k++) {
    const d = R.dirs[k];
    const [dx, dy] = d === 'n' ? [0, -1] : [1, 0];
    pos[R.chain[2 * k + 1]] = [x + dx * 0.5, y + dy * 0.5];
    x += dx; y += dy;
    pos[R.chain[2 * k + 2]] = [x, y];
  }
  return pos;
}
async function mapScreen() {
  const rk = RT.map.reg;
  const R = REGIONS[rk];
  const pos = regionLayout(rk);
  const xs = Object.values(pos).map(p => p[0]), ys = Object.values(pos).map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const sx = 180 / Math.max(1, maxx - minx), sy = 104 / Math.max(1, maxy - miny);
  const s = Math.min(sx, sy);
  const P = id => [20 + (pos[id][0] - minx) * s, 34 + (pos[id][1] - miny) * s];
  const here = RT.map.parent || (RT.map.id.startsWith('sanct') ? SPECIAL_RET[RT.map.id].map : RT.map.id);
  const towns = R.chain.filter((id, i) => i % 2 === 0);
  const fly = canFly();
  const p = el('panel mapv', 0, 0, 240, 160);
  let svg = `<svg viewBox="0 0 240 160" preserveAspectRatio="none">`;
  for (let i = 0; i < R.chain.length - 1; i++) { const [x1, y1] = P(R.chain[i]), [x2, y2] = P(R.chain[i + 1]); svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ln"/>`; }
  for (const id of towns) { const [x, y] = P(id); svg += `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" class="tw${G.visited[id] ? ' v' : ''}"/>`; }
  const [hx, hy] = P(here) || [0, 0];
  svg += `<circle cx="${hx}" cy="${hy}" r="3.5" class="me"/></svg>`;
  p.innerHTML = `<div class="ptitle">${R.name} · ${esc(getMap(here).name)}</div>${svg}<div class="mhint">${fly ? 'A : choisir une ville où voler' : 'Envol : badge de Voltaïs et une créature Vent'}</div>`;
  if (!fly) { await waitKey(); p.remove(); return; }
  const dest = towns.filter(id => G.visited[id]);
  const i = await menu(dest.map(id => TOWNS[id].name), { x: 150, y: 20, w: 86, rows: 10, title: 'Envol vers' });
  p.remove();
  if (i < 0) return;
  const id = dest[i];
  const m = getMap(id);
  const b = m.buildings.find(bb => bb.kind === 'center') || m.buildings.find(bb => bb.kind === 'home') || m.buildings[0];
  await say(`${monName(G.party.find(mm => SP[mm.sp].types.includes('vent')))} s'envole vers ${TOWNS[id].name} !`, { auto: 900 });
  await warp(id, b.door[0], b.door[1] + 1, 'down');
}
async function optionsScreen() {
  while (true) {
    const items = [
      { label: 'Texte', right: ['Lent', 'Normal', 'Rapide'][G.opts.speed] },
      { label: 'Musique', right: G.opts.music ? 'Oui' : 'Non' },
      { label: 'Sons', right: G.opts.sfx ? 'Oui' : 'Non' },
      { label: 'Retour' },
    ];
    const r = await menu(items, { x: 120, y: 4, w: 116 });
    if (r === 0) G.opts.speed = (G.opts.speed + 1) % 3;
    else if (r === 1) { G.opts.music = !G.opts.music; setMusicOn(G.opts.music); }
    else if (r === 2) { G.opts.sfx = !G.opts.sfx; setSfxOn(G.opts.sfx); }
    else return;
  }
}
async function startMenu() {
  sfx('select');
  let sel = 0;
  while (true) {
    const items = [];
    if (G.keys.codex) items.push('Codex');
    items.push('Équipe', 'Sac', 'Carte', G.name, 'Sauver', 'Options', 'Fermer');
    const r = await menu(items, { x: 164, y: 4, w: 72, sel });
    if (r < 0) return;
    sel = r;
    const k = items[r];
    if (k === 'Codex') await codexScreen();
    else if (k === 'Équipe') await partyScreen({});
    else if (k === 'Sac') await bagScreen('field');
    else if (k === 'Carte') { await mapScreen(); if (!RT.map) return; return; }
    else if (k === G.name) await cardScreen();
    else if (k === 'Sauver') {
      const a = await ask('Sauvegarder la partie ?');
      if (a === 0) await say(saveGame() ? `${G.name} a sauvegardé la partie.` : "La sauvegarde a échoué : le stockage du navigateur n'est pas disponible ici.");
    } else if (k === 'Options') await optionsScreen();
    else return;
  }
}

// ---------- Titre et nouvelle partie ----------
async function titleScreen() {
  RT.mode = 'title';
  playMusic('title');
  const t = el('panel title', 0, 0, 240, 160);
  t.innerHTML = `<h1>Awakening</h1><p>Deux régions. Un éveil.</p><div class="press">Appuie sur A</div>`;
  await waitKey();
  audioInit(); playMusic('title');
  t.querySelector('.press').remove();
  const save = loadSave();
  const items = save ? ['Continuer', 'Nouvelle partie'] : ['Nouvelle partie'];
  if (save) el('menu saveinfo', 60, 70, 120, 34, `<div>${esc(save.name)} · ${save.badges.filter(Boolean).length} badges</div><div>Codex ${Object.keys(save.caught).length} · ${fmtTime(save.time)}</div>`);
  const r = await menu(items, { x: 80, y: 108, w: 80, cancel: false });
  document.querySelectorAll('.saveinfo').forEach(e => e.remove());
  t.remove();
  if (items[r] === 'Continuer') {
    G = Object.assign(newState(save.name, save.rival, save.look), save);
    G.opts = Object.assign({ speed: 1, music: true, sfx: true, share: true }, save.opts || {});
    setMusicOn(G.opts.music); setSfxOn(G.opts.sfx);
    RT.mode = 'overworld';
    await fade(true, 1);
    await enterMap(G.map, G.x, G.y, G.dir, { surf: G.surf });
    await fade(false, 400);
    return;
  }
  await newGame();
}
function nameScreen() {
  return new Promise(res => {
    const p = el('panel namep', 0, 0, 240, 160);
    p.innerHTML = `<div class="ptitle">Nouvelle partie</div>
      <label for="nm">Ton nom</label><input id="nm" maxlength="10" value="Aube" autocomplete="off">
      <label for="rv">Le nom de ton rival</label><input id="rv" maxlength="10" value="Kael" autocomplete="off">
      <div class="looks" role="radiogroup" aria-label="Apparence">${['player', 'player2', 'player3'].map((k, i) => `<button type="button" data-look="${k}" class="${i === 0 ? 'on' : ''}" aria-label="Apparence ${i + 1}"><img src="${personURL(PALS[k])}" alt=""></button>`).join('')}</div>
      <button type="button" id="go">Commencer l'aventure</button>`;
    let look = 'player';
    p.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => { look = b.dataset.look; p.querySelectorAll('[data-look]').forEach(x => x.classList.toggle('on', x === b)); }));
    const go = () => {
      const n = p.querySelector('#nm').value.trim() || 'Aube';
      const r = p.querySelector('#rv').value.trim() || 'Kael';
      uiPop(h); p.remove(); res({ name: n, rival: r, look });
    };
    p.querySelector('#go').addEventListener('click', go);
    p.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } }));
    const h = { press(b) { if (b === 'a' && document.activeElement && document.activeElement.tagName !== 'INPUT') go(); } };
    uiPush(h);
    setTimeout(() => { const i = p.querySelector('#nm'); i.focus(); i.select(); }, 50);
  });
}
async function newGame() {
  const { name, rival, look } = await nameScreen();
  G = newState(name, rival, look);
  setMusicOn(G.opts.music); setSfxOn(G.opts.sfx);
  RT.mode = 'intro';
  const prof = el('panel intro', 0, 0, 240, 160, `<img src="${personURL(PALS.prof)}" alt="">`);
  await say(LORE.intro, { speaker: 'Prof. Lierre' });
  await say(`${name}, c'est bien ça ? Et ton voisin, ${rival}, part lui aussi à l'aventure aujourd'hui.`, { speaker: 'Prof. Lierre' });
  await say(LORE.introEnd, { speaker: 'Prof. Lierre' });
  prof.remove();
  RT.mode = 'overworld';
  await fade(true, 1);
  await enterMap('t0~home', 4, 3, 'down');
  await fade(false, 500);
  await say(`Maman : ${name}, tu es enfin levé ! Le Prof. Lierre te cherchait. Son labo est juste en face.`);
}

// ---------- Boucle principale ----------
let CTX = null;
function frame(now) {
  const dt = Math.min(100, now - (RT.lastTick || now));
  RT.lastTick = now;
  RT.acc += dt;
  inputUpdate();
  while (Input.q.length) {
    const b = Input.q.shift();
    const top = uiTop();
    if (top) top.press(b === 'menu' ? 'b' : b);
    else if (RT.mode === 'overworld' && !RT.busy && RT.P && !RT.P.moving) {
      if (b === 'a') run(interact);
      else if (b === 'menu') run(startMenu);
    }
  }
  let steps = 0;
  while (RT.acc >= 1000 / 60 && steps < 4) {
    RT.acc -= 1000 / 60; steps++;
    RT.frame++;
    for (const t of UI.tickers) t();
    if (RT.mode === 'overworld' && RT.map) owTick();
  }
  if (G && RT.mode !== 'title') G.time += dt / 1000;
  const x = CTX;
  x.imageSmoothingEnabled = false;
  if (RT.mode === 'battle') drawBattle(x);
  else if (RT.mode === 'overworld' && RT.map) drawOverworld(x);
  else if (RT.mode === 'title' || RT.mode === 'intro') drawTitle(x);
  requestAnimationFrame(frame);
}
function boot() {
  const cv = document.getElementById('cv');
  CTX = cv.getContext('2d');
  UI.root = document.getElementById('ui');
  setupTouch();
  requestAnimationFrame(frame);
  run(titleScreen);
  if (window.claude && window.claude.hot) {
    try { window.claude.hot.snapshot(() => ({})); } catch (e) { }
  }
}
window.addEventListener('beforeunload', () => { });
document.addEventListener('visibilitychange', () => { if (document.hidden && SND.ctx) SND.ctx.suspend(); else if (SND.ctx) SND.ctx.resume(); });
window.addEventListener('DOMContentLoaded', boot);
