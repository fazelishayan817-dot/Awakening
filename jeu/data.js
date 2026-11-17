'use strict';
/* ============================================================
   AWAKENING — données : types, capacités, créatures, objets
   ============================================================ */

// ---------- Aléatoire déterministe ----------
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

// ---------- Types ----------
const TYPES = ['normal', 'feu', 'eau', 'flore', 'foudre', 'roc', 'vent', 'givre', 'esprit', 'ombre', 'lumiere', 'toxine', 'acier', 'combat', 'dragon'];
const TN = { normal: 'Normal', feu: 'Feu', eau: 'Eau', flore: 'Flore', foudre: 'Foudre', roc: 'Roc', vent: 'Vent', givre: 'Givre', esprit: 'Esprit', ombre: 'Ombre', lumiere: 'Lumière', toxine: 'Toxine', acier: 'Acier', combat: 'Combat', dragon: 'Dragon', none: '???' };
const TC = { normal: '#b9ad8f', feu: '#ee7b3a', eau: '#4a8fe0', flore: '#58b35a', foudre: '#e9c43a', roc: '#a98557', vent: '#86b4e6', givre: '#8fd8ea', esprit: '#e46aa8', ombre: '#6c5b8e', lumiere: '#f1d77a', toxine: '#a35cc6', acier: '#94a3ad', combat: '#c4553e', dragon: '#6a63db', none: '#888888' };
const CHART = {
  normal: { h: [], r: ['roc', 'acier'], i: ['ombre'] },
  feu: { h: ['flore', 'givre', 'acier'], r: ['feu', 'eau', 'roc', 'dragon'], i: [] },
  eau: { h: ['feu', 'roc'], r: ['eau', 'flore', 'dragon'], i: [] },
  flore: { h: ['eau', 'roc'], r: ['feu', 'flore', 'vent', 'toxine', 'acier', 'dragon'], i: [] },
  foudre: { h: ['eau', 'vent'], r: ['foudre', 'flore', 'dragon'], i: ['roc'] },
  roc: { h: ['feu', 'foudre', 'givre', 'vent'], r: ['combat', 'acier'], i: [] },
  vent: { h: ['flore', 'combat'], r: ['foudre', 'roc', 'acier'], i: [] },
  givre: { h: ['flore', 'vent', 'dragon', 'roc'], r: ['feu', 'eau', 'givre', 'acier'], i: [] },
  esprit: { h: ['combat', 'toxine'], r: ['esprit', 'acier'], i: ['ombre'] },
  ombre: { h: ['esprit', 'ombre'], r: ['lumiere', 'combat'], i: ['normal'] },
  lumiere: { h: ['ombre', 'dragon', 'combat'], r: ['feu', 'toxine', 'acier'], i: [] },
  toxine: { h: ['flore', 'lumiere'], r: ['toxine', 'roc', 'ombre'], i: ['acier'] },
  acier: { h: ['givre', 'roc', 'lumiere'], r: ['feu', 'eau', 'foudre', 'acier'], i: [] },
  combat: { h: ['normal', 'givre', 'roc', 'acier', 'ombre'], r: ['vent', 'toxine', 'esprit', 'lumiere'], i: [] },
  dragon: { h: ['dragon'], r: ['acier'], i: ['lumiere'] },
};
function typeEff(atk, defTypes) {
  if (atk === 'none') return 1;
  let m = 1;
  const c = CHART[atk];
  for (const d of defTypes) {
    if (c.i.includes(d)) m *= 0;
    else if (c.h.includes(d)) m *= 2;
    else if (c.r.includes(d)) m *= 0.5;
  }
  return m;
}
function strongAgainst(def) { return TYPES.filter(t => typeEff(t, [def]) > 1); }

// ---------- Capacités ----------
// c: p = physique, s = spéciale, x = statut. ac 0 = ne rate jamais.
// fx: st/ch (statut + chance), foe/fch (stats adverses), self/sch (stats du lanceur), heal, drain, recoil, flinch, crit
const MOVES = {
  // Normal
  charge: { n: 'Charge', t: 'normal', c: 'p', pw: 40, ac: 100, pp: 35 },
  griffe: { n: 'Griffe', t: 'normal', c: 'p', pw: 40, ac: 100, pp: 35 },
  grondement: { n: 'Grondement', t: 'normal', c: 'x', ac: 100, pp: 40, fx: { foe: [['atk', -1]] } },
  regard: { n: 'Regard Dur', t: 'normal', c: 'x', ac: 100, pp: 30, fx: { foe: [['def', -1]] } },
  elan: { n: 'Élan', t: 'normal', c: 'p', pw: 40, ac: 100, pp: 30, pri: 1 },
  coupdetete: { n: 'Coup de Tête', t: 'normal', c: 'p', pw: 70, ac: 100, pp: 15, fx: { flinch: 30 } },
  ecrasement: { n: 'Écrasement', t: 'normal', c: 'p', pw: 85, ac: 100, pp: 15, fx: { st: 'par', ch: 30 } },
  assautfurieux: { n: 'Assaut Furieux', t: 'normal', c: 'p', pw: 100, ac: 100, pp: 15, fx: { recoil: 0.25 } },
  frappetotale: { n: 'Frappe Totale', t: 'normal', c: 's', pw: 130, ac: 85, pp: 5 },
  reposbref: { n: 'Repos Bref', t: 'normal', c: 'x', ac: 0, pp: 10, tgt: 'self', fx: { heal: 0.5 } },
  lutte: { n: 'Lutte', t: 'none', c: 'p', pw: 50, ac: 0, pp: 1, fx: { recoil: 0.25 } },
  // Feu
  braise: { n: 'Braise', t: 'feu', c: 's', pw: 40, ac: 100, pp: 25, fx: { st: 'brn', ch: 10 } },
  crocsbrulants: { n: 'Crocs Brûlants', t: 'feu', c: 'p', pw: 65, ac: 95, pp: 15, fx: { st: 'brn', ch: 10, flinch: 10 } },
  jetdebraise: { n: 'Jet de Braise', t: 'feu', c: 's', pw: 90, ac: 100, pp: 15, fx: { st: 'brn', ch: 10 } },
  fournaise: { n: 'Fournaise', t: 'feu', c: 's', pw: 110, ac: 85, pp: 5, fx: { st: 'brn', ch: 30 } },
  danseardente: { n: 'Danse Ardente', t: 'feu', c: 'x', ac: 0, pp: 20, tgt: 'self', fx: { self: [['spa', 1], ['spe', 1]] } },
  lueurbrulante: { n: 'Lueur Brûlante', t: 'feu', c: 'x', ac: 85, pp: 15, fx: { st: 'brn' } },
  // Eau
  bulles: { n: 'Bulles', t: 'eau', c: 's', pw: 40, ac: 100, pp: 30, fx: { foe: [['spe', -1]], fch: 10 } },
  jetdonde: { n: "Jet d'Onde", t: 'eau', c: 's', pw: 60, ac: 100, pp: 20 },
  vaguelourde: { n: 'Vague Lourde', t: 'eau', c: 'p', pw: 80, ac: 100, pp: 15, fx: { flinch: 20 } },
  torrent: { n: 'Torrent', t: 'eau', c: 's', pw: 110, ac: 80, pp: 5 },
  coquille: { n: 'Coquille', t: 'eau', c: 'x', ac: 0, pp: 40, tgt: 'self', fx: { self: [['def', 1]] } },
  sourcevive: { n: 'Source Vive', t: 'eau', c: 'x', ac: 0, pp: 10, tgt: 'self', fx: { heal: 0.5 } },
  // Flore
  fouetronce: { n: 'Fouet Ronce', t: 'flore', c: 'p', pw: 45, ac: 100, pp: 25 },
  sevedrain: { n: 'Sève Drain', t: 'flore', c: 's', pw: 50, ac: 100, pp: 15, fx: { drain: 0.5 } },
  feuillelame: { n: 'Feuille Lame', t: 'flore', c: 'p', pw: 60, ac: 95, pp: 25, fx: { crit: 1 } },
  grandsiphon: { n: 'Grand Siphon', t: 'flore', c: 's', pw: 75, ac: 100, pp: 10, fx: { drain: 0.5 } },
  rayonsylvestre: { n: 'Rayon Sylvestre', t: 'flore', c: 's', pw: 100, ac: 95, pp: 10 },
  poudresommeil: { n: 'Poudre Sommeil', t: 'flore', c: 'x', ac: 75, pp: 15, fx: { st: 'slp' } },
  sporesvenin: { n: 'Spores Vénéneuses', t: 'flore', c: 'x', ac: 90, pp: 20, fx: { st: 'psn' } },
  // Foudre
  etincelle: { n: 'Étincelle', t: 'foudre', c: 's', pw: 40, ac: 100, pp: 30, fx: { st: 'par', ch: 10 } },
  choc: { n: 'Choc', t: 'foudre', c: 'p', pw: 65, ac: 100, pp: 20, fx: { st: 'par', ch: 20 } },
  arcelectrique: { n: 'Arc Électrique', t: 'foudre', c: 's', pw: 90, ac: 100, pp: 15, fx: { st: 'par', ch: 10 } },
  foudreceleste: { n: 'Foudre Céleste', t: 'foudre', c: 's', pw: 110, ac: 70, pp: 10, fx: { st: 'par', ch: 30 } },
  ondestatique: { n: 'Onde Statique', t: 'foudre', c: 'x', ac: 90, pp: 20, fx: { st: 'par' } },
  recharge: { n: 'Recharge', t: 'foudre', c: 'x', ac: 0, pp: 20, tgt: 'self', fx: { self: [['spa', 1], ['spd', 1]] } },
  // Roc
  jetdepierres: { n: 'Jet de Pierres', t: 'roc', c: 'p', pw: 50, ac: 90, pp: 15 },
  avalanche: { n: 'Avalanche', t: 'roc', c: 'p', pw: 75, ac: 90, pp: 10, fx: { flinch: 30 } },
  fracas: { n: 'Fracas Tellurique', t: 'roc', c: 'p', pw: 100, ac: 100, pp: 10 },
  picrocheux: { n: 'Pic Rocheux', t: 'roc', c: 'p', pw: 100, ac: 80, pp: 5, fx: { crit: 1 } },
  durcissement: { n: 'Durcissement', t: 'roc', c: 'x', ac: 0, pp: 30, tgt: 'self', fx: { self: [['def', 1]] } },
  // Vent
  becvif: { n: 'Bec Vif', t: 'vent', c: 'p', pw: 35, ac: 100, pp: 35 },
  rafale: { n: 'Rafale', t: 'vent', c: 's', pw: 40, ac: 100, pp: 35 },
  ailetranchante: { n: 'Aile Tranchante', t: 'vent', c: 'p', pw: 60, ac: 100, pp: 35 },
  lamedevent: { n: 'Lame de Vent', t: 'vent', c: 's', pw: 75, ac: 95, pp: 15, fx: { flinch: 30 } },
  tornade: { n: 'Tornade', t: 'vent', c: 's', pw: 110, ac: 70, pp: 10 },
  ventarriere: { n: 'Vent Arrière', t: 'vent', c: 'x', ac: 0, pp: 30, tgt: 'self', fx: { self: [['spe', 2]] } },
  // Givre
  poudreuse: { n: 'Poudreuse', t: 'givre', c: 's', pw: 40, ac: 100, pp: 25, fx: { st: 'frz', ch: 10 } },
  crocsgivre: { n: 'Crocs Givre', t: 'givre', c: 'p', pw: 65, ac: 95, pp: 15, fx: { st: 'frz', ch: 10 } },
  rayongele: { n: 'Rayon Gelé', t: 'givre', c: 's', pw: 90, ac: 100, pp: 10, fx: { st: 'frz', ch: 10 } },
  tempeteblanche: { n: 'Tempête Blanche', t: 'givre', c: 's', pw: 110, ac: 70, pp: 5, fx: { st: 'frz', ch: 10 } },
  brumefroide: { n: 'Brume Froide', t: 'givre', c: 'x', ac: 95, pp: 20, fx: { foe: [['spe', -2]] } },
  // Esprit
  chocmental: { n: 'Choc Mental', t: 'esprit', c: 's', pw: 50, ac: 100, pp: 25 },
  ondepsy: { n: 'Onde Psychique', t: 'esprit', c: 's', pw: 65, ac: 100, pp: 20, fx: { foe: [['spd', -1]], fch: 10 } },
  espritpur: { n: 'Esprit Pur', t: 'esprit', c: 's', pw: 90, ac: 100, pp: 10, fx: { foe: [['spd', -1]], fch: 10 } },
  hypnose: { n: 'Hypnose', t: 'esprit', c: 'x', ac: 60, pp: 20, fx: { st: 'slp' } },
  meditation: { n: 'Méditation', t: 'esprit', c: 'x', ac: 0, pp: 20, tgt: 'self', fx: { self: [['spa', 1], ['spd', 1]] } },
  // Ombre
  morsure: { n: 'Morsure', t: 'ombre', c: 'p', pw: 60, ac: 100, pp: 25, fx: { flinch: 30 } },
  griffeombre: { n: 'Griffe Ombre', t: 'ombre', c: 'p', pw: 70, ac: 100, pp: 15, fx: { crit: 1 } },
  spheredombre: { n: "Sphère d'Ombre", t: 'ombre', c: 's', pw: 80, ac: 100, pp: 15, fx: { foe: [['spd', -1]], fch: 20 } },
  abimenoir: { n: 'Abîme Noir', t: 'ombre', c: 's', pw: 100, ac: 90, pp: 10 },
  regardsombre: { n: 'Regard Sombre', t: 'ombre', c: 'x', ac: 100, pp: 20, fx: { foe: [['spd', -2]] } },
  // Lumière
  eclat: { n: 'Éclat', t: 'lumiere', c: 's', pw: 40, ac: 100, pp: 30 },
  rayonaurore: { n: 'Rayon Aurore', t: 'lumiere', c: 's', pw: 65, ac: 100, pp: 20 },
  lamelumineuse: { n: 'Lame Lumineuse', t: 'lumiere', c: 'p', pw: 80, ac: 100, pp: 15, fx: { crit: 1 } },
  jugementsolaire: { n: 'Jugement Solaire', t: 'lumiere', c: 's', pw: 100, ac: 100, pp: 10 },
  lueurapaisante: { n: 'Lueur Apaisante', t: 'lumiere', c: 'x', ac: 0, pp: 10, tgt: 'self', fx: { heal: 0.5 } },
  eblouir: { n: 'Éblouir', t: 'lumiere', c: 'x', ac: 90, pp: 20, fx: { foe: [['atk', -1], ['spa', -1]] } },
  // Toxine
  dardvenin: { n: 'Dard Venin', t: 'toxine', c: 'p', pw: 40, ac: 100, pp: 35, fx: { st: 'psn', ch: 30 } },
  acide: { n: 'Acide', t: 'toxine', c: 's', pw: 50, ac: 100, pp: 30, fx: { foe: [['spd', -1]], fch: 10 } },
  bombeboue: { n: 'Bombe Boue', t: 'toxine', c: 's', pw: 90, ac: 100, pp: 10, fx: { st: 'psn', ch: 30 } },
  gaztoxique: { n: 'Gaz Toxique', t: 'toxine', c: 'x', ac: 90, pp: 40, fx: { st: 'psn' } },
  // Acier
  griffeacier: { n: 'Griffe Acier', t: 'acier', c: 'p', pw: 50, ac: 95, pp: 35, fx: { self: [['atk', 1]], sch: 10 } },
  tetedefer: { n: 'Tête de Fer', t: 'acier', c: 'p', pw: 80, ac: 100, pp: 15, fx: { flinch: 30 } },
  canonmetal: { n: 'Canon Métal', t: 'acier', c: 's', pw: 100, ac: 95, pp: 10, fx: { foe: [['spd', -1]], fch: 10 } },
  murdefer: { n: 'Mur de Fer', t: 'acier', c: 'x', ac: 0, pp: 15, tgt: 'self', fx: { self: [['def', 2]] } },
  // Combat
  poingrapide: { n: 'Poing Rapide', t: 'combat', c: 'p', pw: 40, ac: 100, pp: 30, pri: 1 },
  doublepied: { n: 'Double Pied', t: 'combat', c: 'p', pw: 60, ac: 100, pp: 30 },
  frappecroisee: { n: 'Frappe Croisée', t: 'combat', c: 'p', pw: 85, ac: 90, pp: 10, fx: { crit: 1 } },
  assauttotal: { n: 'Assaut Total', t: 'combat', c: 'p', pw: 120, ac: 100, pp: 5, fx: { self: [['def', -1], ['spd', -1]] } },
  concentration: { n: 'Concentration', t: 'combat', c: 'x', ac: 0, pp: 20, tgt: 'self', fx: { self: [['atk', 2]] } },
  // Dragon
  souffledraco: { n: 'Souffle Draco', t: 'dragon', c: 's', pw: 60, ac: 100, pp: 20, fx: { st: 'par', ch: 30 } },
  griffedraco: { n: 'Griffe Draco', t: 'dragon', c: 'p', pw: 80, ac: 100, pp: 15 },
  cometedraconique: { n: 'Comète Draconique', t: 'dragon', c: 's', pw: 120, ac: 90, pp: 5, fx: { self: [['spa', -2]] } },
  dansedraco: { n: 'Danse Draco', t: 'dragon', c: 'x', ac: 0, pp: 20, tgt: 'self', fx: { self: [['atk', 1], ['spe', 1]] } },
};
for (const k in MOVES) MOVES[k].id = k;
const CAT_NAME = { p: 'Physique', s: 'Spéciale', x: 'Statut' };

// ---------- Créatures ----------
// id, nom, types, stade (1/2/3/u=unique/P=pseudo/L=légende/M=mythe), rôle, niveau d'évolution vers la suivante, silhouette, description
const SPECIES_LIST = [
  ['feuillon', 'Feuillon', 'flore', '1', 'bal', 16, 'quad', "Une jeune pousse vit sur son dos. Elle grandit quand il dort au soleil."],
  ['sylvorn', 'Sylvorn', 'flore', '2', 'bal', 34, 'quad', "Ses racines sentent l'eau sous la terre à des kilomètres."],
  ['arbrasaure', 'Arbrasaure', 'flore/roc', '3', 'tank', 0, 'quad', "Une forêt entière pousse sur son dos de pierre."],
  ['brasille', 'Brasille', 'feu', '1', 'phys', 16, 'biped', "La braise de sa queue rougit quand il est content."],
  ['fournex', 'Fournex', 'feu', '2', 'phys', 36, 'biped', "Il s'entraîne en frappant des rochers jusqu'à les faire fondre."],
  ['volcanthe', 'Volcanthe', 'feu/combat', '3', 'phys', 0, 'biped', "Ses poings atteignent la chaleur d'une forge."],
  ['clapotin', 'Clapotin', 'eau', '1', 'spec', 16, 'blob', "Il chante sous la pluie. Sa voix calme les rivières."],
  ['marevor', 'Marévor', 'eau', '2', 'spec', 36, 'fish', "Il nage si vite que l'eau semble s'ouvrir devant lui."],
  ['abyssard', 'Abyssard', 'eau/ombre', '3', 'spec', 0, 'serpent', "Il vit là où la lumière ne descend jamais."],
  ['piouly', 'Piouly', 'normal/vent', '1', 'fast', 14, 'bird', "Il réveille tout le village à l'aube, sans exception."],
  ['ventrelle', 'Ventrelle', 'normal/vent', '2', 'fast', 32, 'bird', "Il plane des heures sans battre des ailes."],
  ['cieloraptor', 'Cieloraptor', 'normal/vent', '3', 'fast', 0, 'bird', "Il fond sur sa proie depuis les nuages."],
  ['rongeot', 'Rongeot', 'normal', '1', 'fast', 18, 'quad', "Il ronge tout ce qui traîne. Même les panneaux."],
  ['rongemaitre', 'Rongemaître', 'normal', '2', 'phys', 0, 'quad', "Ses incisives ne s'arrêtent jamais de pousser."],
  ['larvelin', 'Larvelin', 'flore', '1', 'bal', 7, 'bug', "Il mange trois fois son poids en feuilles chaque jour."],
  ['cocoride', 'Cocoride', 'flore/acier', '2', 'tank', 12, 'bug', "Sa coque est plus dure que l'acier. Il attend."],
  ['papiluxe', 'Papiluxe', 'vent/lumiere', '3', 'spec', 0, 'bug', "La poudre de ses ailes brille dans le noir."],
  ['mousseron', 'Mousseron', 'flore/toxine', '1', 'tank', 24, 'blob', "Il se cache parmi les champignons de la forêt."],
  ['champitox', 'Champitox', 'flore/toxine', '2', 'sptank', 0, 'blob', "Ses spores endorment ceux qui l'approchent."],
  ['etincelot', 'Étincelot', 'foudre', '1', 'fast', 22, 'quad', "Il charge sa fourrure en se frottant contre l'écorce des arbres."],
  ['voltigre', 'Voltigre', 'foudre', '2', 'fast', 0, 'quad', "Ses rayures s'illuminent avant chaque bond."],
  ['galet', 'Galet', 'roc', '1', 'tank', 25, 'blob', "On le confond souvent avec une pierre de rivière."],
  ['rochelourd', 'Rochelourd', 'roc', '2', 'tank', 40, 'biped', "Il roule le long des pentes pour se déplacer."],
  ['montagrok', 'Montagrok', 'roc/acier', '3', 'tank', 0, 'biped', "Sa carapace contient des veines de métal pur."],
  ['mareluche', 'Mareluche', 'eau', '1', 'bal', 20, 'blob', "Il saute de nénuphar en nénuphar toute la journée."],
  ['ranaqua', 'Ranaqua', 'eau/combat', '2', 'phys', 0, 'biped', "Il nage à contre-courant pour forger ses muscles."],
  ['lucibulle', 'Lucibulle', 'lumiere', '1', 'spec', 26, 'blob', "Il flotte la nuit comme une petite lanterne."],
  ['aurelys', 'Aurélys', 'lumiere/esprit', '2', 'spec', 0, 'biped', "Sa lumière apaise les esprits troublés."],
  ['ombrelin', 'Ombrelin', 'ombre', '1', 'spec', 27, 'blob', "Il se glisse dans l'ombre des passants."],
  ['spectrombre', 'Spectrombre', 'ombre/esprit', '2', 'spec', 0, 'serpent', "Il apparaît dans les miroirs à minuit."],
  ['boxillon', 'Boxillon', 'combat', '1', 'phys', 28, 'biped', "Il s'entraîne sans relâche contre les troncs."],
  ['pugilarque', 'Pugilarque', 'combat', '2', 'phys', 0, 'biped', "Un seul de ses coups peut fendre un rocher."],
  ['vipereau', 'Vipéreau', 'toxine', '1', 'phys', 22, 'serpent', "Il mord tout ce qui bouge, même son reflet."],
  ['cobracre', 'Cobrâcre', 'toxine/ombre', '2', 'phys', 0, 'serpent', "Son venin change de couleur selon sa colère."],
  ['taupiron', 'Taupiron', 'roc/acier', '1', 'phys', 26, 'quad', "Il creuse des galeries avec ses griffes de métal."],
  ['foretaupe', 'Forétaupe', 'roc/acier', '2', 'phys', 0, 'quad', "Il traverse une montagne en une seule nuit."],
  ['flocinel', 'Flocinel', 'givre', '1', 'spec', 30, 'blob', "Il naît des premiers flocons de l'hiver."],
  ['glaciarde', 'Glaciarde', 'givre/lumiere', '2', 'spec', 0, 'biped', "Elle danse sur la glace sous les aurores."],
  ['songeot', 'Songeot', 'esprit', '1', 'spec', 25, 'quad', "Il rêve éveillé et voit parfois l'avenir."],
  ['revemage', 'Rêvemage', 'esprit', '2', 'spec', 0, 'biped', "Il peut entrer dans les rêves des autres."],
  ['pincelot', 'Pincelot', 'eau/roc', '1', 'tank', 28, 'bug', "Ses pinces brisent les coquillages."],
  ['carapinc', 'Carapinc', 'eau/roc', '2', 'tank', 0, 'bug', "Sa carapace résiste aux vagues les plus fortes."],
  ['abeillon', 'Abeillon', 'vent/toxine', '1', 'fast', 20, 'bug', "Il butine en groupe et défend sa ruche."],
  ['reinapic', 'Reinapic', 'vent/toxine', '2', 'fast', 0, 'bug', "Elle commande un essaim de mille Abeillon."],
  ['laineclair', 'Laineclair', 'foudre', '1', 'bal', 15, 'quad', "Sa laine se charge d'électricité au moindre frottement."],
  ['ovinvolt', 'Ovinvolt', 'foudre', '2', 'bal', 30, 'quad', "Ses cornes crépitent par temps d'orage."],
  ['belitonnerre', 'Bélitonnerre', 'foudre/normal', '3', 'spec', 0, 'quad', "Il appelle la foudre d'un coup de corne."],
  ['dracolin', 'Dracolin', 'dragon', '1', 'bal', 30, 'serpent', "Il ne se montre qu'aux dresseurs patients."],
  ['draconelle', 'Draconelle', 'dragon', '2', 'bal', 55, 'serpent', "On dit qu'il contrôle la météo d'une vallée entière."],
  ['draconyx', 'Draconyx', 'dragon/vent', 'P', 'phys', 0, 'biped', "Il fait le tour de la région en une heure."],
  ['noctelle', 'Noctelle', 'ombre/vent', '1', 'fast', 24, 'bug', "Elle ne vole qu'à la lumière de la lune."],
  ['nyctaile', 'Nyctaile', 'ombre/vent', '2', 'fast', 0, 'bird', "Son vol silencieux surprend même les hiboux."],
  ['corailette', 'Corailette', 'eau/lumiere', 'u', 'sptank', 0, 'blob', "Elle brille au fond des lagons."],
  ['cliquetan', 'Cliquetan', 'acier', '1', 'tank', 30, 'blob', "Ses engrenages tournent en cliquetant."],
  ['engrenor', 'Engrenor', 'acier', '2', 'tank', 0, 'biped', "Il répare lui-même ses rouages usés."],
  ['felinuit', 'Félinuit', 'ombre', '1', 'fast', 28, 'quad', "Il chasse en silence, les yeux brillants."],
  ['pantharcane', 'Pantharcane', 'ombre/combat', '2', 'phys', 0, 'quad', "Il frappe depuis l'ombre sans un bruit."],
  ['gelapin', 'Gelapin', 'givre/normal', '1', 'fast', 26, 'quad', "Ses oreilles gèlent l'air autour de lui."],
  ['lievrigel', 'Lièvrigel', 'givre/combat', '2', 'phys', 0, 'biped', "Il bondit sur la neige sans laisser de traces."],
  ['taurignis', 'Taurignis', 'feu/normal', 'u', 'phys', 0, 'quad', "Il charge tête baissée, les cornes en flammes."],
  ['cendrelle', 'Cendrelle', 'feu/vent', '1', 'spec', 30, 'bird', "Ses plumes laissent une traînée de cendres."],
  ['phenixel', 'Phénixel', 'feu/vent', '2', 'spec', 0, 'bird', "On le dit capable de renaître de ses braises."],
  ['tortumousse', 'Tortumousse', 'flore/eau', '1', 'tank', 32, 'quad', "De la mousse pousse sur sa carapace humide."],
  ['archipelone', 'Archipélone', 'flore/eau', '2', 'tank', 0, 'quad', "On a déjà pris son dos pour une île."],
  ['meduvenin', 'Méduvenin', 'eau/toxine', '1', 'sptank', 30, 'blob', "Ses filaments piquent même hors de l'eau."],
  ['medusoraire', 'Médusoraire', 'eau/toxine', '2', 'sptank', 0, 'blob', "Des bancs entiers fuient à son passage."],
  ['statuon', 'Statuon', 'roc/esprit', 'u', 'sptank', 0, 'biped', "Il garde des ruines depuis mille ans."],
  ['arcfoudre', 'Arcfoudre', 'foudre/acier', 'u', 'spec', 0, 'bird', "Il se recharge sur les pylônes en altitude."],
  ['racinol', 'Racinol', 'flore/ombre', '1', 'bal', 30, 'blob', "Il chuchote la nuit sous les vieux arbres."],
  ['mandracine', 'Mandracine', 'flore/ombre', '2', 'spec', 0, 'biped', "Son cri fait faner les fleurs alentour."],
  ['louvaube', 'Louvaube', 'combat/lumiere', '1', 'phys', 32, 'quad', "Il hurle au lever du soleil, jamais à la lune."],
  ['lupaladin', 'Lupaladin', 'combat/lumiere', '2', 'phys', 0, 'biped', "Il protège les voyageurs perdus."],
  ['chouettine', 'Chouettine', 'esprit/vent', '1', 'spec', 20, 'bird', "Elle tourne la tête pour lire les pensées."],
  ['noctelys', 'Noctélys', 'esprit/vent', '2', 'spec', 0, 'bird', "Elle veille sur les forêts endormies."],
  ['banquiseau', 'Banquiseau', 'givre/eau', '1', 'bal', 32, 'bird', "Il glisse sur le ventre pour aller plus vite."],
  ['empereglace', 'Empereglace', 'givre/eau', '2', 'tank', 0, 'bird', "Il règne sur les banquises du nord."],
  ['scarabronze', 'Scarabronze', 'acier/flore', 'u', 'phys', 0, 'bug', "Sa carapace de bronze sonne comme une cloche."],
  ['brumelin', 'Brumelin', 'ombre/givre', 'u', 'spec', 0, 'blob', "Il apparaît dans la brume des matins d'hiver."],
  ['lavarelle', 'Lavarelle', 'feu/roc', '1', 'tank', 38, 'serpent', "Elle se baigne dans la lave tiède."],
  ['magmorne', 'Magmorne', 'feu/roc', '2', 'phys', 0, 'quad', "Son dos fume comme un volcan endormi."],
  ['dunelot', 'Dunelot', 'roc', '1', 'bal', 34, 'blob', "Il se cache sous le sable chaud."],
  ['sablarque', 'Sablarque', 'roc/dragon', '2', 'phys', 0, 'serpent', "Il soulève des tempêtes de sable en ondulant."],
  ['wyvernel', 'Wyvernel', 'dragon/feu', '1', 'phys', 35, 'bird', "Il s'exerce à cracher du feu sur les falaises."],
  ['ignivern', 'Ignivern', 'dragon/feu', '2', 'phys', 0, 'bird', "Ses ailes chauffent l'air au point de le faire trembler."],
  ['cervaube', 'Cervaube', 'lumiere/flore', 'u', 'sptank', 0, 'quad', "Des fleurs s'ouvrent sur son passage."],
  ['mimicoffre', 'Mimicoffre', 'acier/ombre', 'u', 'phys', 0, 'blob', "Il imite un coffre au trésor pour piéger les curieux."],
  ['baleinon', 'Baleinon', 'eau', 'u', 'tank', 0, 'fish', "Son chant porte à travers tout l'océan."],
  ['chimerion', 'Chimérion', 'normal', 'u', 'bal', 0, 'quad', "Il possède les traits de plusieurs créatures."],
  ['auberis', 'Aubéris', 'lumiere/dragon', 'L', 'spec', 0, 'bird', "Gardien de l'aube. Il réveille le monde chaque matin."],
  ['nocturnis', 'Nocturnis', 'ombre/dragon', 'L', 'phys', 0, 'serpent', "Gardien de la nuit. Il veille sur le sommeil du monde."],
  ['eveillon', 'Éveillon', 'esprit/lumiere', 'M', 'bal', 0, 'biped', "On dit qu'il n'apparaît qu'à ceux qui ont tout vu."],
];

const STATK = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const STAT_NAME = { hp: 'PV', atk: 'Attaque', def: 'Défense', spa: 'Atq. Spé.', spd: 'Déf. Spé.', spe: 'Vitesse' };
const ROLES = {
  bal: [1, 1, 1, 1, 1, 1],
  phys: [1, 1.45, 1, 0.6, 0.8, 1.1],
  spec: [0.9, 0.6, 0.8, 1.45, 1.1, 1.1],
  tank: [1.3, 0.95, 1.5, 0.6, 1.05, 0.5],
  fast: [0.85, 1.1, 0.75, 0.95, 0.75, 1.5],
  sptank: [1.2, 0.6, 0.95, 1, 1.5, 0.7],
};
const SP = {};
const DEX = [];
(function buildSpecies() {
  let prev = null;
  SPECIES_LIST.forEach((row, i) => {
    const [id, n, types, stage, role, evo, plan, desc] = row;
    const s = { id, n, types: types.split('/'), stage, role, evo, plan, desc, num: i + 1 };
    s.line = (prev && prev.evo > 0) ? prev.line : id;
    s.next = evo > 0 ? SPECIES_LIST[i + 1][0] : null;
    s.prev = (prev && prev.evo > 0) ? prev.id : null;
    s.slow = ['L', 'M', 'P'].includes(stage) || s.line === 'dracolin';
    let bst;
    if (stage === '1') bst = 300;
    else if (stage === '2') bst = s.next ? 405 : 475;
    else if (stage === '3') bst = 525;
    else if (stage === 'u') bst = 455;
    else if (stage === 'P') bst = 570;
    else if (stage === 'L') bst = 630;
    else bst = 610;
    const r = rng(hashStr(id + ':stats'));
    const w = ROLES[role].map(v => v * (0.9 + r() * 0.2));
    const sum = w.reduce((a, b) => a + b, 0);
    s.base = {};
    STATK.forEach((k, j) => { s.base[k] = Math.max(20, Math.round(bst * w[j] / sum)); });
    s.bst = bst;
    s.yield = Math.round(bst * bst / 1600);
    s.rate = { '1': 190, '2': s.next ? 120 : 75, '3': 45, 'u': 90, 'P': 45, 'L': 25, 'M': 15 }[stage];
    SP[id] = s; DEX.push(id);
    prev = s;
  });
})();

// ---------- Apprentissage des capacités ----------
const MOVES_BY_TYPE = {};
for (const id in MOVES) {
  const m = MOVES[id];
  if (m.t === 'none') continue;
  (MOVES_BY_TYPE[m.t] = MOVES_BY_TYPE[m.t] || []).push(id);
}
function tierOf(pw) { return pw <= 50 ? 1 : pw <= 70 ? 2 : pw <= 90 ? 3 : pw <= 110 ? 4 : 5; }
function typeAttacks(t, pref) {
  const list = (MOVES_BY_TYPE[t] || []).filter(id => MOVES[id].pw);
  const out = [];
  for (let tier = 1; tier <= 5; tier++) {
    const c = list.filter(id => tierOf(MOVES[id].pw) === tier);
    if (!c.length) continue;
    out.push(c.find(id => MOVES[id].c === pref) || c[0]);
  }
  return out;
}
function typeStatus(t) { return (MOVES_BY_TYPE[t] || []).filter(id => MOVES[id].c === 'x' && !(MOVES[id].fx && MOVES[id].fx.heal)); }
function typeHeal(t) { return (MOVES_BY_TYPE[t] || []).filter(id => MOVES[id].fx && MOVES[id].fx.heal); }
const LEARN_CACHE = {};
function learnset(sp) {
  if (LEARN_CACHE[sp]) return LEARN_CACHE[sp];
  const s = SP[sp];
  const r = rng(hashStr(s.line + ':moves'));
  const [t1, t2] = s.types;
  const pref = (s.role === 'phys' || s.role === 'tank' || (s.role === 'bal' && r() < 0.5) || (s.role === 'fast' && r() < 0.6)) ? 'p' : 's';
  const A1 = typeAttacks(t1, pref);
  const A2 = t2 ? typeAttacks(t2, pref) : [];
  const S1 = typeStatus(t1), S2 = t2 ? typeStatus(t2) : [];
  const H = [...typeHeal(t1), ...(t2 ? typeHeal(t2) : [])];
  const ls = [];
  const add = (l, id) => { if (id && !ls.some(e => e[1] === id)) ls.push([l, id]); };
  add(1, r() < 0.5 ? 'charge' : 'griffe');
  add(1, r() < 0.5 ? 'grondement' : 'regard');
  add(4, A1[0]);
  add(8, S1[0] || 'elan');
  add(12, A2[0] || 'elan');
  add(15, A1[1]);
  add(19, 'coupdetete');
  add(23, A2[1] || A1[1]);
  if (s.role === 'tank' || s.role === 'sptank') add(27, H[0] || 'reposbref');
  else add(27, S1[1] || S2[0] || H[0]);
  add(31, A1[2]);
  add(36, A2[2] || 'ecrasement');
  add(42, A1[3]);
  add(48, A2[3] || 'assautfurieux');
  add(55, A1[4] || (t1 === 'normal' ? null : 'frappetotale'));
  ls.sort((a, b) => a[0] - b[0]);
  return (LEARN_CACHE[sp] = ls);
}
function defaultMoves(sp, lvl) {
  const ids = learnset(sp).filter(e => e[0] <= lvl).map(e => e[1]);
  return ids.slice(-4);
}
function movesLearnedAt(sp, lvl) { return learnset(sp).filter(e => e[0] === lvl).map(e => e[1]); }

// ---------- Créatures individuelles ----------
function xpAt(sp, l) { const f = SP[sp].slow ? 1.25 : 1; return l <= 1 ? 0 : Math.floor(f * l * l * l); }
function calcStats(m) {
  const s = SP[m.sp], L = m.lvl, st = {};
  for (const k of STATK) {
    const b = s.base[k], iv = m.iv[k];
    st[k] = k === 'hp' ? Math.floor((2 * b + iv) * L / 100) + L + 10 : Math.floor((2 * b + iv) * L / 100) + 5;
  }
  return st;
}
function maxHp(m) { return calcStats(m).hp; }
function makeMon(sp, lvl, opt = {}) {
  const iv = {};
  for (const k of STATK) iv[k] = opt.goodIv ? rnd(16, 31) : rnd(0, 31);
  const m = { sp, lvl, xp: xpAt(sp, lvl), iv, moves: [], status: null, shiny: opt.shiny != null ? opt.shiny : Math.random() < 1 / 512 };
  m.moves = defaultMoves(sp, lvl).map(id => ({ id, pp: MOVES[id].pp }));
  m.hp = maxHp(m);
  return m;
}
function evolveForLevel(sp, lvl) {
  while (SP[sp].next && lvl >= SP[sp].evo) sp = SP[sp].next;
  return sp;
}
function monName(m) { return m.nick || SP[m.sp].n; }
function healMon(m) { m.hp = maxHp(m); m.status = null; m.slp = 0; m.moves.forEach(mv => mv.pp = MOVES[mv.id].pp); }

// ---------- Objets ----------
const ITEMS = {
  sphere: { n: 'Sphère', p: 200, k: 'ball', m: 1, d: 'Une sphère pour capturer une créature sauvage.' },
  supersphere: { n: 'Super Sphère', p: 600, k: 'ball', m: 1.5, d: 'Capture mieux qu\'une Sphère.' },
  hypersphere: { n: 'Hyper Sphère', p: 1200, k: 'ball', m: 2, d: 'Une sphère très efficace.' },
  spherenuit: { n: 'Sphère Nuit', p: 1000, k: 'ball', m: 'night', d: 'Très efficace la nuit et dans les grottes.' },
  baume: { n: 'Baume', p: 300, k: 'heal', hp: 20, d: 'Rend 20 PV.' },
  superbaume: { n: 'Super Baume', p: 700, k: 'heal', hp: 60, d: 'Rend 60 PV.' },
  hyperbaume: { n: 'Hyper Baume', p: 1200, k: 'heal', hp: 150, d: 'Rend 150 PV.' },
  maxibaume: { n: 'Maxi Baume', p: 2500, k: 'heal', hp: 9999, d: 'Rend tous les PV.' },
  antidote: { n: 'Antidote', p: 100, k: 'cure', st: ['psn'], d: 'Soigne le poison.' },
  antipara: { n: 'Anti-Para', p: 200, k: 'cure', st: ['par'], d: 'Soigne la paralysie.' },
  reveil: { n: 'Réveil', p: 250, k: 'cure', st: ['slp'], d: 'Réveille une créature endormie.' },
  antibrule: { n: 'Anti-Brûle', p: 250, k: 'cure', st: ['brn'], d: 'Soigne une brûlure.' },
  antigel: { n: 'Antigel', p: 250, k: 'cure', st: ['frz'], d: 'Dégèle une créature.' },
  totalsoin: { n: 'Total Soin', p: 600, k: 'cure', st: ['psn', 'par', 'slp', 'brn', 'frz'], d: 'Soigne tous les problèmes de statut.' },
  rappel: { n: 'Rappel', p: 1500, k: 'revive', d: 'Ranime une créature K.O. avec la moitié de ses PV.' },
  ether: { n: 'Éther', p: 1200, k: 'pp', d: 'Rend 10 PP à chaque capacité.' },
  repousse: { n: 'Repousse', p: 350, k: 'repel', steps: 100, d: 'Éloigne les créatures faibles pendant 100 pas.' },
  superrepousse: { n: 'Super Repousse', p: 500, k: 'repel', steps: 200, d: 'Éloigne les créatures faibles pendant 200 pas.' },
  bonbon: { n: 'Bonbon Éveil', p: 0, k: 'candy', d: 'Fait monter une créature d\'un niveau.' },
};
const ITEM_ORDER = Object.keys(ITEMS);
const SHOP_TIERS = [
  [0, ['sphere', 'baume', 'antidote', 'antipara', 'repousse']],
  [1, ['superbaume', 'reveil', 'antibrule', 'antigel']],
  [2, ['supersphere']],
  [3, ['totalsoin', 'rappel']],
  [4, ['hyperbaume', 'superrepousse']],
  [5, ['hypersphere']],
  [8, ['maxibaume', 'ether', 'spherenuit']],
];
const KEY_ITEMS = {
  codex: { n: 'Codex', d: 'Répertorie les créatures vues et capturées.' },
  partage: { n: 'Partage Exp', d: 'Les créatures restées en réserve gagnent la moitié de l\'expérience.' },
  ticket: { n: 'Billet Brume', d: 'Un billet pour le ferry de Port-Clair vers Brumaire.' },
};
const STATUS_NAME = { psn: 'PSN', par: 'PAR', slp: 'SOM', brn: 'BRÛ', frz: 'GEL' };
const STATUS_COLOR = { psn: '#a35cc6', par: '#d4a920', slp: '#8a8f9a', brn: '#e06a30', frz: '#5fb8d8' };

function fmtMoney(n) { return n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' écus'; }
