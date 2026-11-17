'use strict';
/* ============================================================
   AWAKENING — le monde : régions, villes, routes, lore, dresseurs
   ============================================================ */
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const DXY = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SIDE_DIR = { n: 'up', s: 'down', e: 'right', w: 'left' };

const REGIONS = {
  solvene: {
    name: 'Solvène', pal: 'solvene',
    chain: ['t0', 'r1', 't1', 'r2', 't2', 'r3', 't3', 'r4', 't4', 'r5', 't5', 'r6', 't6', 'r7', 't7', 'r8', 't8', 'r9', 't9'],
    dirs: ['n', 'n', 'e', 'n', 'e', 'n', 'e', 'n', 'n'],
    gymBase: 0,
  },
  brumaire: {
    name: 'Brumaire', pal: 'brumaire',
    chain: ['u0', 's1', 'u1', 's2', 'u2', 's3', 'u3', 's4', 'u4', 's5', 'u5', 's6', 'u6', 's7', 'u7', 's8', 'u8', 's9', 'u9'],
    dirs: ['e', 'n', 'e', 'e', 'n', 'e', 'n', 'e', 'n'],
    gymBase: 8,
  },
};
const LINKS = {};      // id -> {entr:{side,to}, exit:{side,to}}
const REGION_OF = {};
for (const rk in REGIONS) {
  const R = REGIONS[rk];
  R.chain.forEach(id => { REGION_OF[id] = rk; LINKS[id] = LINKS[id] || {}; });
  for (let k = 0; k < R.dirs.length; k++) {
    const A = R.chain[2 * k], RT = R.chain[2 * k + 1], B = R.chain[2 * k + 2], d = R.dirs[k];
    LINKS[A].exit = { side: d, to: RT };
    LINKS[RT].entr = { side: OPP[d], to: A };
    LINKS[RT].exit = { side: d, to: B };
    LINKS[RT].dir = d;
    LINKS[B].entr = { side: OPP[d], to: RT };
  }
}

// ---------- Lore ----------
const LORE = {
  intro: [
    "Bonjour ! Bienvenue dans le monde d'Awakening.",
    "Je m'appelle Lierre. On m'appelle le Prof. Lierre.",
    "Ce monde est peuplé de créatures. Certaines vivent dans les herbes, d'autres dans les grottes, la mer ou le ciel.",
    "Les humains et les créatures vivent ensemble depuis toujours. Ensemble, ils voyagent, s'entraînent et se battent.",
    "Une vieille légende raconte que deux gardiens partagent le ciel : Aubéris, qui appelle le jour, et Nocturnis, qui veille sur la nuit.",
    "Entre les deux existerait Éveillon, le gardien de l'Éveil. C'est lui qui fait passer le monde du rêve au réel, chaque matin.",
    "Je consacre ma vie à comprendre ce lien. Mais il me faut quelqu'un sur le terrain...",
  ],
  introEnd: [
    "Ton aventure commence à Rosée, au sud de Solvène.",
    "Deux régions t'attendent : Solvène, la terre de l'aube, et Brumaire, la terre des brumes, au-delà de la mer.",
    "Seize badges, deux Ligues et une légende. Passe me voir au labo !",
  ],
};

// ---------- Arènes ----------
const GYMS = [
  { town: 't1', type: 'flore', leader: 'Mira', badge: 'Badge Sève', team: [['mousseron', 10], ['larvelin', 10], ['tortumousse', 12]], field: 'Tes créatures de type Flore peuvent maintenant couper les arbustes hors combat.', intro: "Je suis Mira. Mes créatures ont grandi à l'ombre de ces arbres. Elles ne plieront pas !", lose: "Tu as la force d'un vieux chêne. Ce badge est à toi." },
  { town: 't2', type: 'roc', leader: 'Bastien', badge: 'Badge Galet', team: [['galet', 14], ['taupiron', 14], ['rochelourd', 16]], intro: "La roche est patiente. Moi aussi. Voyons si tu peux m'ébranler.", lose: "Tu as fendu la pierre. Respect." },
  { town: 't3', type: 'eau', leader: 'Maëlle', badge: 'Badge Marée', team: [['mareluche', 18], ['pincelot', 19], ['ranaqua', 21]], field: 'Tes créatures de type Eau peuvent maintenant te porter sur l\'eau.', intro: "La marée monte. Tu vas te faire emporter !", lose: "Tu as su lire le courant. Bravo." },
  { town: 't4', type: 'foudre', leader: 'Ezra', badge: 'Badge Volt', team: [['etincelot', 22], ['ovinvolt', 23], ['laineclair', 22], ['voltigre', 25]], field: 'Tes créatures de type Vent peuvent maintenant t\'emmener dans les villes déjà visitées. Ouvre la Carte !', intro: "Ici, tout fonctionne à l'électricité. Même mon cœur ! Prêt pour la décharge ?", lose: "Court-circuit total ! Tu es une vraie centrale." },
  { town: 't5', type: 'feu', leader: 'Ignace', badge: 'Badge Braise', team: [['cendrelle', 26], ['taurignis', 27], ['fournex', 27], ['lavarelle', 29]], intro: "Merci d'avoir chassé l'Ordre Somnis. Maintenant, voyons si ta flamme brûle aussi fort que la mienne !", lose: "Une flamme pareille, je n'en avais pas vu depuis longtemps." },
  { town: 't6', type: 'esprit', leader: 'Ysée', badge: 'Badge Songe', team: [['songeot', 30], ['chouettine', 30], ['aurelys', 32], ['revemage', 34]], intro: "J'ai rêvé de ce combat la nuit dernière. Dans mon rêve... c'était moi qui gagnais.", lose: "Mon rêve s'est trompé. C'est la première fois." },
  { town: 't7', type: 'givre', leader: 'Solveig', badge: 'Badge Givre', team: [['flocinel', 34], ['gelapin', 35], ['banquiseau', 35], ['glaciarde', 38]], intro: "Le froid ralentit tout. Sauf mes créatures.", lose: "Tu as fait fondre ma glace. Je l'accepte." },
  { town: 't8', type: 'dragon', leader: 'Aldric', badge: 'Badge Écaille', team: [['draconelle', 39], ['wyvernel', 40], ['sablarque', 41], ['draconelle', 43]], intro: "Les dragons ne servent que les dresseurs dignes d'eux. Prouve que tu l'es !", lose: "Les dragons t'ont reconnu. Va. La Ligue t'attend." },
  { town: 'u1', type: 'acier', leader: 'Gaspard', badge: 'Badge Rouage', team: [['cliquetan', 51], ['scarabronze', 52], ['taupiron', 51], ['engrenor', 54]], intro: "Un champion de Solvène, hein ? Le métal de Brumaire ne plie pas aussi facilement.", lose: "Mes rouages ont sauté. Joli travail." },
  { town: 'u2', type: 'toxine', leader: 'Vesna', badge: 'Badge Venin', team: [['meduvenin', 53], ['champitox', 54], ['medusoraire', 55], ['cobracre', 57]], intro: "Les marais cachent leurs poisons. Moi, je les montre.", lose: "Tu as résisté à tout. Impressionnant." },
  { town: 'u3', type: 'vent', leader: 'Rafaël', badge: 'Badge Zéphyr', team: [['ventrelle', 55], ['nyctaile', 56], ['noctelys', 56], ['phenixel', 57], ['cieloraptor', 59]], intro: "Là-haut, le vent ne pardonne pas. Accroche-toi !", lose: "Tu as volé plus haut que moi." },
  { town: 'u4', type: 'combat', leader: 'Brune', badge: 'Badge Poing', team: [['ranaqua', 57], ['lievrigel', 58], ['lupaladin', 59], ['pantharcane', 59], ['pugilarque', 61]], intro: "Pas de discours. Juste le combat.", lose: "... Bien joué. Vraiment." },
  { town: 'u5', type: 'ombre', leader: 'Nox', badge: 'Badge Éclipse', team: [['spectrombre', 59], ['pantharcane', 60], ['mimicoffre', 60], ['brumelin', 61], ['cobracre', 63]], intro: "Merci d'avoir chassé ces fanatiques. L'ombre n'appartient à personne. Surtout pas à eux.", lose: "Même dans le noir, tu trouves ton chemin." },
  { town: 'u6', type: 'lumiere', leader: 'Clarisse', badge: 'Badge Halo', team: [['corailette', 61], ['cervaube', 62], ['aurelys', 62], ['glaciarde', 63], ['lupaladin', 65]], intro: "Chaque lanterne de Lucerne porte un vœu. Le mien : un beau combat.", lose: "Ton vœu à toi s'est réalisé." },
  { town: 'u7', type: 'normal', leader: 'Paulin', badge: 'Badge Équilibre', team: [['rongemaitre', 63], ['chimerion', 64], ['taurignis', 64], ['belitonnerre', 65], ['chimerion', 67]], intro: "Normal ne veut pas dire faible. Je vais te le montrer.", lose: "Ah. Tu as tout compris." },
  { town: 'u8', type: 'acier', leader: 'Orane', badge: 'Badge Prisme', prism: true, team: [['archipelone', 65], ['arcfoudre', 66], ['magmorne', 66], ['statuon', 66], ['papiluxe', 66], ['ignivern', 69]], intro: "Le cristal reflète toutes les couleurs. Mon équipe aussi. Montre-moi ta propre lumière.", lose: "Seize badges. Le Mont Éveil t'attend. Ce qui s'y trouve... je ne le sais pas moi-même." },
];

// ---------- Villes ----------
const TOWNS = {
  t0: { name: 'Rosée', layout: { NW: 'home', NE: 'lab', SW: 'house', SE: 'pond' }, desc: "Rosée : là où chaque matin commence.",
    lines: ["Le Prof. Lierre étudie le lien entre les créatures et l'aube.", "Chaque matin, un grand oiseau de lumière survolerait Solvène. Personne ne l'a jamais vu de près.", "Les hautes herbes sont dangereuses sans créature. Va voir le Prof. Lierre !"],
    house: { text: "Mon grand-père racontait qu'autrefois, le monde s'endormait pendant des semaines. Puis les gardiens sont arrivés.", gift: ['baume', 2] } },
  t1: { name: 'Verdelune', gym: 0, desc: "Verdelune : un village sous les feuillages.",
    lines: ["Mira, la championne d'arène, parle aux arbres. Et parfois, ils répondent.", "Les Larvelin évoluent très vite. Garde un œil sur eux !", "Les arbustes bloquent certains chemins. Avec le badge de Mira, une créature Flore peut les couper."],
    house: { text: "Tu pars pour un long voyage ? Tiens, ça te servira.", gift: ['baume', 3] } },
  t2: { name: 'Pierrefeu', gym: 1, desc: "Pierrefeu : la cité taillée dans la roche.",
    lines: ["Les mineurs ont trouvé des fresques dans la montagne. Elles montrent deux dragons : un clair et un sombre.", "Bastien a fondé son arène dans une ancienne carrière.", "Les types Roc craignent l'Eau et la Flore. Pense à ton équipe !"],
    house: { text: "Les Super Sphères capturent mieux. Prends-en quelques-unes.", gift: ['supersphere', 3] } },
  t3: { name: 'Port-Clair', gym: 2, layout: { NW: 'center', NE: 'shop', SW: 'gym', SE: 'dock' }, desc: "Port-Clair : la porte vers le large.",
    lines: ["Le ferry pour Brumaire n'accepte que les champions de la Ligue.", "Des gens habillés de violet rôdent sur le port. Ils parlent de « faire dormir le monde »...", "Avec le badge de Maëlle, une créature Eau peut te porter sur l'eau. Approche-toi d'un lac et appuie sur A."],
    house: { text: "Je ne peux plus m'occuper de cette créature. Elle sera mieux avec toi.", giftMon: ['tortumousse', 15] } },
  t4: { name: 'Voltaïs', gym: 3, desc: "Voltaïs : la ville qui ne s'éteint jamais.",
    lines: ["La centrale de Voltaïs éclaire tout Solvène.", "Avec le Badge Volt, une créature de type Vent peut te ramener dans les villes déjà visitées.", "L'Ordre Somnis ? Ils veulent capturer le gardien de l'aube. Pour quoi faire, je l'ignore."],
    house: { text: "Un Rappel peut sauver un combat. En voilà deux.", gift: ['rappel', 2] } },
  t5: { name: 'Brasimont', gym: 4, desc: "Brasimont : au pied du volcan endormi.",
    lines: ["L'Ordre Somnis bloque l'entrée de l'arène ! Quelqu'un doit les chasser.", "Le volcan dort depuis mille ans. Certains disent qu'il rêve.", "Les Somnis disent que le sommeil éternel mettrait fin à toutes les souffrances. Moi, j'aime mes matins."],
    house: { text: "Cette petite lumière me suit partout depuis des jours. Je crois qu'elle t'a choisi.", giftMon: ['lucibulle', 22] } },
  t6: { name: 'Sélénia', gym: 5, desc: "Sélénia : la cité des songes.",
    lines: ["Ici, on écrit ses rêves dans de grands registres. Les plus anciens parlent d'Éveillon.", "Ysée lit l'avenir dans le reflet de l'eau.", "Certaines créatures n'apparaissent que la nuit. Reviens après le coucher du soleil !"],
    house: { text: "J'ai trouvé ces bonbons dans un rêve. Enfin, je crois.", gift: ['bonbon', 2] } },
  t7: { name: 'Givreval', gym: 6, pal: 'neige', desc: "Givreval : où l'hiver ne finit jamais.",
    lines: ["Le long de la Route 8 se trouve le Sanctuaire de l'Aube. Personne n'ose y entrer.", "Solveig s'entraîne chaque nuit sur le lac gelé.", "Des Somnis sont passés ici hier. Ils cherchaient le chemin du sanctuaire."],
    house: { text: "Il fait froid dehors. Prends ces Hyper Baumes.", gift: ['hyperbaume', 3] } },
  t8: { name: 'Hautcieux', gym: 7, desc: "Hautcieux : le village des dragons.",
    lines: ["Aldric descend d'une lignée de dresseurs de dragons.", "Au-delà de la Grotte de l'Aube se trouve le Plateau Aurore, siège de la Ligue.", "Les dragons craignent la Glace, la Lumière et les autres dragons."],
    house: { text: "Ce Dracolin est né ici. Il a besoin d'un dresseur qui ira loin.", giftMon: ['dracolin', 30] } },
  t9: { name: 'Plateau Aurore', layout: { NW: 'center', NE: 'shop', SW: 'house', SE: 'league' }, desc: "Plateau Aurore : siège de la Ligue de Solvène.",
    lines: ["Seuls ceux qui ont réuni les huit badges de Solvène peuvent défier la Ligue.", "Il n'y a aucune pause entre les combats de la Ligue. Prépare bien ton sac.", "Le Champion Célestin n'a pas perdu depuis six ans."],
    house: { text: "Pour la Ligue, il faut être prêt. Tiens.", gift: ['rappel', 3] } },
  u0: { name: 'Havre-Brume', layout: { NW: 'center', NE: 'shop', SW: 'house', SE: 'dock' }, desc: "Havre-Brume : le port des brumes.",
    lines: ["Bienvenue à Brumaire ! Ici, la brume se lève rarement avant midi.", "À Brumaire, les nuits durent plus longtemps qu'ailleurs. On dit que c'est Nocturnis qui le veut.", "Huit arènes, puis le Mont Éveil. Peu de gens en reviennent."],
    house: { text: "Un champion de Solvène ! Les créatures d'ici sont coriaces. Prends ça.", gift: ['hypersphere', 5] } },
  u1: { name: 'Ferrance', gym: 8, desc: "Ferrance : la ville des forges.",
    lines: ["Gaspard forge lui-même les rouages de ses créatures. Enfin, c'est ce qu'il dit.", "Les types Acier craignent le Feu, le Combat et le Roc."],
    house: { text: "Un Éther rend des PP à toutes les capacités. Très utile en ligue.", gift: ['ether', 2] } },
  u2: { name: 'Toxalis', gym: 9, desc: "Toxalis : au bord des marais.",
    lines: ["Les marais de Toxalis sont pleins de créatures rares. Méfie-toi du poison.", "Vesna a grandi parmi les méduses."],
    house: { text: "Ce coffre bougeait tout seul dans ma cave. Je te le laisse !", giftMon: ['mimicoffre', 45] } },
  u3: { name: 'Ventaille', gym: 10, pal: 'automne', desc: "Ventaille : perchée sur les falaises.",
    lines: ["Ici, le vent souffle si fort qu'on attache les enfants aux arbres. Je plaisante. À moitié.", "Rafaël vole avec ses créatures chaque matin."],
    house: { text: "Les Bonbons Éveil viennent d'ici, tu le savais ?", gift: ['bonbon', 2] } },
  u4: { name: 'Combrecœur', gym: 11, pal: 'automne', desc: "Combrecœur : la cité des combattants.",
    lines: ["Brune ne parle presque jamais. Elle se bat.", "Le Combat craint le Vent, l'Esprit et la Lumière."],
    house: { text: "Les combats sont durs ici. Prends ces Maxi Baumes.", gift: ['maxibaume', 2] } },
  u5: { name: 'Ombreval', gym: 12, desc: "Ombreval : la vallée sans soleil.",
    lines: ["L'Ordre Somnis a pris l'arène ! Nox est retenu à l'intérieur.", "Ici, le soleil ne passe jamais les montagnes. Les créatures de la nuit sont chez elles.", "Oniris, le chef des Somnis, serait né à Ombreval."],
    house: { text: "Ces sphères capturent mieux la nuit. Ici, il fait toujours un peu nuit.", gift: ['spherenuit', 5] } },
  u6: { name: 'Lucerne', gym: 13, pal: 'automne', desc: "Lucerne : la ville aux mille lanternes.",
    lines: ["Chaque lanterne porte un vœu. La plus vieille aurait été allumée par Aubéris lui-même.", "Le Sanctuaire de la Nuit est le long de la Route 7 de Brumaire."],
    house: { text: "Ce cerf lumineux vient chaque soir à ma fenêtre. Il veut partir avec toi.", giftMon: ['cervaube', 55] } },
  u7: { name: 'Vallée-Commune', gym: 14, desc: "Vallée-Commune : simple et paisible.",
    lines: ["Rien d'extraordinaire ici. C'est ce qu'on aime.", "Paulin dit que les créatures les plus simples cachent les plus grandes forces."],
    house: { text: "Des Bonbons Éveil ! Pour aller plus vite vers le sommet.", gift: ['bonbon', 3] } },
  u8: { name: 'Prismont', gym: 15, desc: "Prismont : la cité de cristal.",
    lines: ["Le Mont Éveil se dresse au-delà du Gouffre du Sommeil.", "Celui qui atteint le sommet rencontrerait l'Éveillé, le premier dresseur de l'histoire."],
    house: { text: "Pour le Mont Éveil, il te faudra tout ça.", gift: ['maxibaume', 3] } },
  u9: { name: 'Mont Éveil', special: 'summit', desc: "Mont Éveil" },
};
for (const id in TOWNS) { TOWNS[id].reg = REGION_OF[id]; TOWNS[id].id = id; }
GYMS.forEach((g, i) => { TOWNS[g.town].gym = i; g.idx = i; });

// ---------- Routes ----------
// enc: [espèce, niv min, niv max, poids, 'd' (jour) | 'n' (nuit)]
const ROUTES = {
  r1: { name: 'Route 1', tr: 2, cls: ['gamin', 'fillette'], items: ['baume', 'sphere'], enc: { grass: [['rongeot', 2, 4, 35], ['piouly', 2, 4, 35], ['larvelin', 2, 3, 20], ['ombrelin', 3, 4, 15, 'n'], ['songeot', 3, 4, 8, 'n']] } },
  r2: { name: 'Route 2', tr: 4, cls: ['gamin', 'fillette', 'scout'], items: ['sphere', 'baume', 'antidote'], cut: 1, special: ['rival2'],
    enc: { grass: [['rongeot', 4, 6, 25], ['piouly', 4, 6, 25], ['larvelin', 4, 6, 15], ['mousseron', 4, 6, 15], ['laineclair', 5, 7, 12, 'd'], ['songeot', 5, 6, 12, 'n'], ['ombrelin', 5, 6, 10, 'n']] } },
  r3: { name: 'Route 3', tr: 5, cls: ['randonneur', 'scout', 'montagnard'], items: ['superbaume', 'antidote', 'sphere'],
    enc: { grass: [['galet', 7, 10, 25], ['taupiron', 7, 10, 20], ['rongeot', 8, 10, 15], ['piouly', 8, 10, 15], ['etincelot', 8, 11, 15], ['ombrelin', 8, 10, 12, 'n'], ['dunelot', 8, 10, 5]] } },
  r4: { name: 'Route 4', tr: 5, cls: ['pecheur', 'nageur', 'ornitho'], items: ['supersphere', 'reveil'], pond: 1, special: ['somnis_r4'],
    enc: { grass: [['mareluche', 11, 14, 25], ['pincelot', 11, 14, 20], ['abeillon', 11, 13, 25], ['piouly', 12, 14, 10], ['chouettine', 11, 13, 20, 'n']], water: [['mareluche', 11, 15, 50], ['meduvenin', 12, 15, 40], ['corailette', 14, 16, 5]] } },
  r5: { name: 'Route 5', tr: 6, cls: ['karateka', 'scout', 'savant'], items: ['bonbon', 'superbaume', 'reveil'], cut: 1, special: ['rival3'],
    enc: { grass: [['etincelot', 15, 18, 20], ['laineclair', 15, 17, 20], ['abeillon', 15, 18, 15], ['boxillon', 16, 18, 15], ['vipereau', 16, 19, 15], ['ombrelin', 16, 18, 15, 'n'], ['songeot', 16, 18, 12, 'n']] } },
  r6: { name: 'Route 6', tr: 6, cls: ['karateka', 'mystique', 'dresseur'], items: ['rappel', 'superbaume', 'supersphere'], pond: 1,
    enc: { grass: [['vipereau', 19, 22, 20], ['boxillon', 19, 22, 20], ['mousseron', 19, 21, 15], ['cendrelle', 20, 23, 15], ['taurignis', 21, 23, 5], ['songeot', 20, 22, 15, 'n'], ['lucibulle', 20, 22, 15, 'n']], water: [['mareluche', 19, 22, 50], ['ranaqua', 21, 23, 30], ['meduvenin', 20, 23, 20]] } },
  r7: { name: 'Route 7', tr: 7, cls: ['mystique', 'dresseur', 'dresseuse', 'veilleur'], items: ['supersphere', 'rappel', 'totalsoin'], pond: 1, cut: 1,
    enc: { grass: [['lucibulle', 23, 26, 20], ['songeot', 23, 26, 20], ['ventrelle', 24, 27, 15], ['rongemaitre', 24, 27, 15], ['flocinel', 23, 25, 10], ['ombrelin', 24, 26, 15, 'n'], ['spectrombre', 27, 28, 5, 'n'], ['chouettine', 24, 26, 10, 'n']], water: [['ranaqua', 23, 27, 50], ['meduvenin', 23, 27, 40], ['corailette', 25, 27, 10]] } },
  r8: { name: 'Route 8', pal: 'neige', tr: 7, cls: ['montagnard', 'dresseuse', 'dresseur', 'veilleur'], items: ['hyperbaume', 'bonbon', 'hypersphere'], special: ['rival4'], side: 'sanct_aube',
    enc: { grass: [['flocinel', 27, 31, 20], ['gelapin', 27, 31, 20], ['rochelourd', 28, 31, 15], ['banquiseau', 27, 30, 20], ['lievrigel', 30, 31, 5], ['brumelin', 29, 31, 8, 'n']] } },
  r9: { name: "Grotte de l'Aube", cave: 1, tr: 6, cls: ['montagnard', 'dresseur', 'dresseuse', 'savant'], items: ['rappel', 'hypersphere', 'bonbon', 'maxibaume'], special: ['rival5'],
    enc: { cave: [['rochelourd', 33, 37, 20], ['foretaupe', 34, 37, 15], ['spectrombre', 33, 36, 15], ['taupiron', 32, 35, 20], ['statuon', 34, 36, 8], ['dracolin', 31, 33, 4], ['galet', 32, 34, 15]] } },
  s1: { name: 'Route 1 de Brumaire', tr: 6, cls: ['dresseur', 'dresseuse', 'archiviste'], items: ['hyperbaume', 'hypersphere'],
    enc: { grass: [['noctelle', 41, 44, 20], ['cliquetan', 41, 44, 20], ['felinuit', 41, 44, 20], ['racinol', 41, 44, 20], ['chouettine', 42, 44, 15, 'n'], ['noctelle', 42, 45, 15, 'n']] } },
  s2: { name: 'Route 2 de Brumaire', tr: 6, cls: ['pecheur', 'nageur', 'dresseuse'], items: ['maxibaume', 'totalsoin'], pond: 1,
    enc: { grass: [['meduvenin', 44, 47, 20], ['cobracre', 44, 47, 20], ['racinol', 44, 47, 20], ['tortumousse', 44, 47, 20], ['mandracine', 46, 47, 5, 'n']], water: [['meduvenin', 44, 47, 40], ['corailette', 45, 48, 30], ['baleinon', 46, 48, 10], ['archipelone', 46, 48, 5]] } },
  s3: { name: 'Route 3 de Brumaire', pal: 'automne', tr: 7, cls: ['ornitho', 'dresseur', 'montagnard'], items: ['bonbon', 'hypersphere', 'rappel'], cut: 1,
    enc: { grass: [['cendrelle', 47, 50, 20], ['nyctaile', 47, 50, 20], ['noctelys', 48, 50, 15], ['reinapic', 47, 50, 20], ['chouettine', 47, 49, 15, 'n'], ['phenixel', 50, 50, 3]] } },
  s4: { name: 'Route 4 de Brumaire', pal: 'automne', tr: 7, cls: ['karateka', 'dresseuse', 'dresseur'], items: ['maxibaume', 'ether'],
    enc: { grass: [['felinuit', 50, 53, 20], ['louvaube', 50, 53, 20], ['pugilarque', 51, 53, 15], ['taurignis', 51, 53, 15], ['dunelot', 50, 53, 15], ['gelapin', 50, 52, 10]] } },
  s5: { name: 'Route 5 de Brumaire', tr: 7, cls: ['veilleur', 'mystique', 'somnis'], items: ['spherenuit', 'maxibaume', 'bonbon'], special: ['somnis_s5a', 'somnis_s5b'],
    enc: { grass: [['brumelin', 53, 56, 15], ['spectrombre', 53, 56, 20], ['felinuit', 53, 56, 20], ['mimicoffre', 54, 56, 5], ['noctelle', 53, 55, 15, 'n'], ['nyctaile', 54, 56, 15, 'n'], ['ombrelin', 53, 55, 15]] } },
  s6: { name: 'Route 6 de Brumaire', tr: 7, cls: ['pecheur', 'nageur', 'dresseuse', 'mystique'], items: ['hypersphere', 'totalsoin', 'rappel'], pond: 1,
    enc: { grass: [['louvaube', 56, 59, 25], ['cervaube', 57, 59, 5], ['aurelys', 56, 59, 20], ['corailette', 56, 59, 20], ['lucibulle', 56, 58, 15, 'n']], water: [['baleinon', 56, 60, 30], ['corailette', 56, 59, 30], ['empereglace', 57, 59, 15], ['medusoraire', 57, 60, 25]] } },
  s7: { name: 'Route 7 de Brumaire', tr: 7, cls: ['montagnard', 'dresseur', 'archiviste'], items: ['maxibaume', 'bonbon', 'ether'], side: 'sanct_nuit', cut: 1,
    enc: { grass: [['chimerion', 59, 62, 20], ['dunelot', 59, 61, 20], ['taurignis', 59, 62, 20], ['lavarelle', 59, 62, 20], ['sablarque', 61, 63, 10], ['felinuit', 59, 61, 10, 'n']] } },
  s8: { name: 'Route 8 de Brumaire', tr: 7, cls: ['dresseur', 'dresseuse', 'savant'], items: ['hypersphere', 'maxibaume', 'bonbon'],
    enc: { grass: [['arcfoudre', 62, 65, 15], ['wyvernel', 62, 65, 20], ['lavarelle', 62, 64, 20], ['scarabronze', 62, 65, 20], ['magmorne', 63, 65, 10], ['nyctaile', 62, 64, 15, 'n']] } },
  s9: { name: 'Gouffre du Sommeil', cave: 1, pal: 'abysse', tr: 7, cls: ['dresseur', 'dresseuse', 'montagnard', 'somnis'], items: ['bonbon', 'maxibaume', 'ether', 'bonbon'],
    enc: { cave: [['magmorne', 65, 68, 15], ['sablarque', 65, 68, 15], ['ignivern', 66, 68, 8], ['statuon', 65, 67, 15], ['foretaupe', 65, 68, 15], ['draconelle', 65, 67, 8], ['spectrombre', 65, 68, 15], ['brumelin', 65, 67, 9]] } },
};
for (const id in ROUTES) { ROUTES[id].reg = REGION_OF[id]; ROUTES[id].id = id; }

// ---------- Dresseurs ----------
const TCLS = {
  gamin: { n: 'Gamin', m: 16 }, fillette: { n: 'Fillette', m: 16 }, scout: { n: 'Scout', m: 20 },
  randonneur: { n: 'Randonneur', m: 24 }, montagnard: { n: 'Montagnard', m: 28 }, pecheur: { n: 'Pêcheur', m: 26 },
  nageur: { n: 'Nageuse', m: 24 }, ornitho: { n: 'Ornithologue', m: 28 }, karateka: { n: 'Karatéka', m: 30 },
  mystique: { n: 'Mystique', m: 32 }, dresseur: { n: 'Dresseur', m: 40 }, dresseuse: { n: 'Dresseuse', m: 40 },
  savant: { n: 'Savant', m: 40 }, veilleur: { n: 'Veilleur', m: 32 }, archiviste: { n: 'Archiviste', m: 40 },
  somnis: { n: 'Sbire Somnis', m: 24 }, admin: { n: 'Admin Somnis', m: 60 }, boss: { n: 'Chef Somnis', m: 100 },
  rival: { n: '', m: 40 }, leader: { n: 'Championne', m: 100 }, elite: { n: 'Élite', m: 120 }, champion: { n: 'Champion', m: 160 }, ancien: { n: 'L\'Éveillé', m: 200 },
};
const TCLS_PAL = { gamin: 0, fillette: 1, scout: 2, randonneur: 4, montagnard: 6, pecheur: 8, nageur: 9, ornitho: 5, karateka: 3, mystique: 7, dresseur: 2, dresseuse: 1, savant: 4, veilleur: 7, archiviste: 8 };
const TR_TYPES = { pecheur: ['eau'], nageur: ['eau'], ornitho: ['vent'], karateka: ['combat'], mystique: ['esprit', 'ombre', 'lumiere'], veilleur: ['ombre', 'esprit'], montagnard: ['roc', 'acier', 'givre'], savant: ['foudre', 'acier', 'toxine'], archiviste: ['esprit', 'roc', 'acier'] };
const NAMES = ['Léo', 'Inès', 'Hugo', 'Lina', 'Nolan', 'Jade', 'Malo', 'Rose', 'Sacha', 'Elsa', 'Timéo', 'Zoé', 'Louis', 'Anna', 'Gabin', 'Mila', 'Noé', 'Lou', 'Axel', 'Iris', 'Baptiste', 'Camille', 'Yanis', 'Margot', 'Théo', 'Lucie', 'Enzo', 'Chloé', 'Kenji', 'Amara', 'Soren', 'Nadia', 'Pablo', 'Yuna', 'Idris', 'Maëlys', 'Jules', 'Alma', 'Basile', 'Céleste', 'Eliott', 'Lisa', 'Nathan', 'Ambre', 'Robin', 'Salomé', 'Aaron', 'Capucine', 'Marius', 'Romy'];
const TR_INTRO = {
  _: ["Hé ! Nos regards se sont croisés. On se bat !", "Tu as l'air fort. Montre-moi ça !", "Personne ne passe sans un combat !", "Mes créatures s'ennuyaient. Merci de passer !", "On va voir si tu mérites tes badges !", "Je m'entraîne ici depuis des jours. À toi de jouer !"],
  gamin: ["J'ai attrapé ma créature tout seul ! Regarde !", "Mon grand frère m'a tout appris. Enfin, presque."],
  fillette: ["Ma créature est la plus mignonne. Et la plus forte !", "Tu veux voir mes créatures ? Elles mordent !"],
  pecheur: ["Ça ne mord pas... Alors c'est toi qui vas mordre la poussière !", "Le calme de l'eau cache des surprises."],
  karateka: ["Hah ! Mon poing et mes créatures ne font qu'un !", "L'entraînement ne s'arrête jamais !"],
  mystique: ["Les esprits m'ont annoncé ta venue.", "Je vois ton avenir... Il contient une défaite."],
  veilleur: ["La nuit est mon royaume. Tu y es entré.", "Je veille pendant que le monde dort."],
  somnis: ["L'Ordre Somnis offrira au monde un sommeil sans fin !", "Endors-toi, petit dresseur !"],
  archiviste: ["Les ruines de Brumaire ont encore beaucoup à révéler.", "J'étudie les anciens textes. Et les anciens combats."],
};
const TR_LOSE = ["Perdu... Tu es vraiment doué.", "Incroyable ! Je dois m'entraîner encore.", "Bien joué. Continue comme ça.", "Mes créatures ont tout donné...", "Je me souviendrai de ce combat.", "D'accord, d'accord, tu as gagné !"];
const TR_AFTER = ["Il y a encore beaucoup de dresseurs plus loin. Bonne chance !", "Soigne tes créatures avant d'aller plus loin.", "Un jour, je te battrai.", "Tu vas jusqu'à la Ligue ? Je crois en toi."];

const RIVAL_COUNTER = { feuillon: 'brasille', brasille: 'clapotin', clapotin: 'feuillon' };
const STORY_TRAINERS = {
  rival1: { cls: 'rival', name: '$R', team: [['$S', 5]], intro: "Je te prends celle-là ! Et puisqu'on a nos créatures, on se bat tout de suite !", lose: "Quoi ?! J'aurais dû choisir autre chose...", music: 'trainer', noLoss: true, money: 300 },
  rival2: { cls: 'rival', name: '$R', team: [['piouly', 9], ['$S', 11]], intro: "Hé ! Je t'attendais. Mon équipe a grandi depuis le labo. Pas la tienne, on dirait !", lose: "Encore perdu ? C'est pas possible... La prochaine fois, je serai prêt.", after: "On se reverra. Et je gagnerai.", music: 'trainer', hideAfter: 1, money: 600 },
  rival3: { cls: 'rival', name: '$R', team: [['ventrelle', 19], ['ombrelin', 18], ['$S', 21]], intro: "L'Ordre Somnis cherche le gardien de l'aube. Moi aussi, je veux le trouver. Mais d'abord : toi !", lose: "Tu deviens vraiment fort... Bon. Je file vers Brasimont.", music: 'trainer', hideAfter: 1, money: 1500 },
  rival4: { cls: 'rival', name: '$R', team: [['ventrelle', 29], ['spectrombre', 30], ['dracolin', 29], ['$S', 32]], intro: "Le sanctuaire est tout près. Les Somnis y sont déjà. Si tu veux passer, prouve que tu es à la hauteur !", lose: "D'accord. Vas-y. Moi, je reste ici pour couvrir tes arrières.", music: 'trainer', hideAfter: 1, money: 2500 },
  rival5: { cls: 'rival', name: '$R', team: [['cieloraptor', 39], ['spectrombre', 39], ['draconelle', 40], ['voltigre', 39], ['$S', 42]], intro: "La Ligue est juste derrière cette grotte. Un seul de nous deux y entrera le premier !", lose: "... Vas-y. Deviens champion. Moi, je trouverai mon propre chemin.", music: 'boss', hideAfter: 1, money: 4000 },
  rival6: { cls: 'rival', name: '$R', team: [['cieloraptor', 68], ['spectrombre', 67], ['draconyx', 69], ['pantharcane', 67], ['voltigre', 67], ['$S', 71]], intro: "Je savais que tu viendrais. J'ai traversé Brumaire moi aussi. Ce sommet, on l'atteindra... mais d'abord, un dernier combat. Le vrai.", lose: "Tu m'as toujours devancé. Et pour la première fois, ça me fait plaisir. Va. Il t'attend là-haut.", music: 'boss', hideAfter: 1, money: 8000 },
  somnis_r4: { cls: 'somnis', name: 'Vex', team: [['vipereau', 12], ['ombrelin', 12]], intro: "Hé ! L'Ordre Somnis cherche le gardien de l'aube. Tu n'as rien vu, compris ?", lose: "Grr... Ce n'est que partie remise. Le monde finira par s'endormir !", music: 'somnis', hideAfter: 1 },
  somnis_t5a: { cls: 'somnis', name: 'Gorm', team: [['vipereau', 24], ['ombrelin', 24]], intro: "L'arène est fermée. Ordre de l'Admin Létha !", lose: "L'Admin ne va pas être contente...", music: 'somnis', hideAfter: 1 },
  somnis_t5b: { cls: 'somnis', name: 'Pell', team: [['mousseron', 24], ['noctelle', 25]], intro: "Tu veux entrer ? Il faudra passer sur mon corps. Enfin, sur mes créatures.", lose: "Bon, bon, je m'écarte...", music: 'somnis', hideAfter: 1 },
  somnis_t5c: { cls: 'admin', name: 'Létha', team: [['cobracre', 27], ['spectrombre', 27], ['champitox', 28]], intro: "Je suis Létha, Admin de l'Ordre Somnis. Le volcan de Brasimont rêve depuis mille ans. Nous voulons que le monde entier fasse de même.", lose: "Intéressant. Oniris voudra entendre parler de toi. Nous partons... pour l'instant.", music: 'somnis', hideAfter: 1 },
  somnis_aube1: { cls: 'somnis', name: 'Kriss', team: [['cobracre', 36], ['spectrombre', 36], ['noctelle', 36]], intro: "Personne n'entre ! Le chef est en train de réveiller... euh, d'endormir le gardien !", lose: "Le chef va me tuer...", music: 'somnis', hideAfter: 1 },
  somnis_aube2: { cls: 'boss', name: 'Oniris', team: [['pantharcane', 39], ['cobracre', 39], ['spectrombre', 40], ['champitox', 40]], intro: "Je suis Oniris. As-tu déjà pensé à tout ce que le réveil nous coûte ? Les peurs, la douleur, le temps qui passe... Dans le sommeil, rien de tout ça n'existe. Aubéris réveille ce monde chaque matin. Je vais l'arrêter.", lose: "Tu protèges un monde qui souffre... Soit. Le gardien de la nuit, lui, ne m'échappera pas. Rendez-vous à Brumaire.", music: 'boss', hideAfter: 1, money: 5000 },
  somnis_s5a: { cls: 'somnis', name: 'Dorn', team: [['cobracre', 53], ['spectrombre', 53], ['nyctaile', 54]], intro: "Un champion de Solvène ? Ici ? Oniris avait raison, tu es tenace.", lose: "Tu ne pourras pas tous nous arrêter !", music: 'somnis', hideAfter: 1 },
  somnis_s5b: { cls: 'somnis', name: 'Sela', team: [['mandracine', 54], ['felinuit', 54], ['brumelin', 54]], intro: "Ombreval nous appartient maintenant. Rebrousse chemin.", lose: "Comment est-ce possible...", music: 'somnis', hideAfter: 1 },
  somnis_u5: { cls: 'admin', name: 'Létha', team: [['cobracre', 57], ['spectrombre', 57], ['mandracine', 58], ['pantharcane', 58]], intro: "Encore toi. Oniris est parti pour le Sanctuaire de la Nuit. Je ne te laisserai pas le suivre.", lose: "... Peut-être que le sommeil n'est pas la seule réponse. Va. Fais ce que tu as à faire.", music: 'somnis', hideAfter: 1, money: 6000 },
  somnis_nuit1: { cls: 'somnis', name: 'Vex', team: [['cobracre', 60], ['spectrombre', 60], ['nyctaile', 61]], intro: "Encore toi ?! Depuis la Route 4 de Solvène, je n'ai pensé qu'à cette revanche !", lose: "Toujours pas... Je vais peut-être changer de métier.", music: 'somnis', hideAfter: 1 },
  somnis_nuit2: { cls: 'boss', name: 'Oniris', team: [['pantharcane', 62], ['cobracre', 62], ['nyctaile', 62], ['mandracine', 63], ['spectrombre', 64]], intro: "Nocturnis dort ici depuis mille ans. Il suffit qu'il ne se réveille jamais pour que la nuit s'étende sur tout. Une nuit douce. Sans fin. Pourquoi t'y opposer ?", lose: "... Alors c'est ça, être éveillé. Se battre pour ce qui fait mal, parce que ça en vaut la peine. Je... je comprends. L'Ordre Somnis est dissous.", music: 'boss', hideAfter: 1, money: 10000 },
  elite1: { cls: 'elite', name: 'Corvin', team: [['cobracre', 44], ['spectrombre', 45], ['champitox', 44], ['nyctaile', 46], ['cobracre', 47]], intro: "Je suis Corvin, premier membre de la Ligue. Le poison et l'ombre... deux choses qu'on ne voit pas venir.", lose: "Tu as vu clair dans mon jeu. Passe.", music: 'boss', hideAfter: 1 },
  elite2: { cls: 'elite', name: 'Thalia', team: [['pugilarque', 46], ['ranaqua', 46], ['lievrigel', 47], ['pantharcane', 48], ['pugilarque', 49]], intro: "Thalia, deuxième membre. Mes créatures et moi, on s'entraîne depuis le lever du soleil. Chaque jour.", lose: "Ta force est réelle. Continue !", music: 'boss', hideAfter: 1 },
  elite3: { cls: 'elite', name: 'Orso', team: [['montagrok', 48], ['engrenor', 48], ['foretaupe', 49], ['carapinc', 49], ['montagrok', 50]], intro: "Orso. Troisième membre. Ma défense n'a jamais été percée.", lose: "Jusqu'à aujourd'hui. Bravo.", music: 'boss', hideAfter: 1 },
  elite4: { cls: 'elite', name: 'Séléné', team: [['revemage', 50], ['aurelys', 50], ['glaciarde', 51], ['noctelys', 51], ['revemage', 52]], intro: "Séléné, dernière des Élites. J'ai vu ce combat en rêve. Je n'ai pas vu sa fin.", lose: "Le Champion t'attend. Il a fait le même rêve que moi.", music: 'boss', hideAfter: 1 },
  champion: { cls: 'champion', name: 'Célestin', team: [['cieloraptor', 52], ['belitonnerre', 52], ['phenixel', 53], ['archipelone', 53], ['magmorne', 54], ['draconyx', 56]], intro: "Bienvenue. Je suis Célestin, Champion de Solvène. Tu as chassé l'Ordre Somnis du sanctuaire et rencontré le gardien de l'aube. Montre-moi maintenant ce que vaut un dresseur éveillé !", lose: "Magnifique. Solvène a un nouveau Champion.", music: 'boss', hideAfter: 1 },
  elio: { cls: 'ancien', name: 'Elio', team: [['draconyx', 72], ['statuon', 70], ['glaciarde', 70], ['phenixel', 71], ['abyssard', 71], ['archipelone', 72]], intro: "Mille ans que j'attends au sommet. On m'appelle l'Éveillé : je fus le premier dresseur. J'ai vu Aubéris naître et Nocturnis s'endormir. Montre-moi qui tu es devenu en chemin.", lose: "Je peux enfin me reposer. Écoute... Il arrive.", music: 'boss', hideAfter: 0 },
};
const LEGENDS = {
  auberis: { sp: 'auberis', lvl: 42, flag: 'leg_auberis', text: "Le gardien de l'aube ouvre les yeux. Une lumière dorée emplit le sanctuaire !" },
  nocturnis: { sp: 'nocturnis', lvl: 62, flag: 'leg_nocturnis', text: "Le gardien de la nuit se dresse. Le sanctuaire plonge dans une obscurité étoilée !" },
  eveillon: { sp: 'eveillon', lvl: 70, flag: 'leg_eveillon', text: "Le ciel se fend entre le jour et la nuit. Éveillon apparaît !" },
};

// ---------- Génération de cartes ----------
const MAPS = {};
const INT = {};
const SPECIAL_RET = {};
function newGrid(w, h, ch) { const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(ch)); return g; }
function getMap(id) {
  if (MAPS[id]) return MAPS[id];
  let m;
  if (id.includes('~')) {
    const parent = id.split('~')[0];
    if (!INT[id]) getMap(parent);
    m = genInterior(id, INT[id]);
  } else if (TOWNS[id]) m = TOWNS[id].special === 'summit' ? genSummit(id) : genTown(id);
  else if (ROUTES[id]) m = ROUTES[id].cave ? genCave(id) : genRoute(id);
  else if (id === 'sanct_aube' || id === 'sanct_nuit') m = genSanctuary(id);
  MAPS[id] = m;
  return m;
}
function badgeCount(reg) { const b = REGIONS[reg].gymBase; let n = 0; for (let i = b; i < b + 8; i++) if (G.badges[i]) n++; return n; }

function trainerNPC(R, cls, team, extra = {}) {
  const name = pick(R, NAMES);
  const intro = pick(R, (TR_INTRO[cls] || []).concat(TR_INTRO._));
  return Object.assign({ kind: 'trainer', pal: NPC_PALS[(TCLS_PAL[cls] != null ? TCLS_PAL[cls] : 0) + (R() < 0.3 ? 1 : 0)] || NPC_PALS[0], trainer: { cls, name, team, intro, lose: pick(R, TR_LOSE), after: pick(R, TR_AFTER), money: TCLS[cls].m } }, extra);
}
function encTeam(R, enc, cls, boost) {
  const pool = (enc.grass || enc.cave || []).filter(e => e[4] !== 'n');
  const water = enc.water || [];
  let src = pool;
  if ((cls === 'pecheur' || cls === 'nageur') && water.length) src = water;
  const pref = TR_TYPES[cls];
  const n = 1 + Math.floor(R() * 3);
  const team = [];
  for (let i = 0; i < n; i++) {
    let e = pick(R, src);
    if (pref && R() < 0.6) {
      const cands = DEX.filter(sp => SP[sp].stage !== 'L' && SP[sp].stage !== 'M' && SP[sp].stage !== 'P' && !SP[sp].prev && pref.some(t => SP[sp].types.includes(t)) && !['feuillon', 'brasille', 'clapotin', 'dracolin'].includes(sp));
      if (cands.length) e = [pick(R, cands), e[1], e[2]];
    }
    const lvl = e[2] + Math.floor(R() * 2) + boost;
    team.push([evolveForLevel(e[0], lvl), lvl]);
  }
  return team;
}

// ---- Ville ----
function genTown(id) {
  const def = TOWNS[id], reg = def.reg, R = rng(hashStr(id + ':town'));
  const W = 28, H = 22;
  const t = newGrid(W, H, '.');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) t[y][x] = 'T';
  const map = { id, name: def.name, kind: 'town', reg, pal: def.pal || REGIONS[reg].pal, w: W, h: H, t, border: 'T', buildings: [], warps: [], npcs: [], signs: {}, gates: {}, guards: [], enc: {}, music: reg === 'brumaire' ? 'town2' : 'town1', outdoor: true };
  // chemins
  for (let x = 2; x < W - 2; x++) { t[10][x] = ','; t[11][x] = ','; }
  for (let y = 2; y < H - 2; y++) { t[y][13] = ','; t[y][14] = ','; }
  const L = LINKS[id];
  const openGate = (side, to) => {
    if (side === 'n') { for (let y = 0; y < 2; y++) { t[y][13] = ','; t[y][14] = ','; } map.gates.n = { p: 13, to }; }
    if (side === 's') { for (let y = H - 2; y < H; y++) { t[y][13] = ','; t[y][14] = ','; } map.gates.s = { p: 13, to }; }
    if (side === 'w') { for (let x = 0; x < 2; x++) { t[10][x] = ','; t[11][x] = ','; } map.gates.w = { p: 10, to }; }
    if (side === 'e') { for (let x = W - 2; x < W; x++) { t[10][x] = ','; t[11][x] = ','; } map.gates.e = { p: 10, to }; }
  };
  if (L.entr) openGate(L.entr.side, L.entr.to);
  if (L.exit) {
    openGate(L.exit.side, L.exit.to);
    const s = L.exit.side;
    const cells = s === 'n' ? [[13, 1], [14, 1]] : s === 's' ? [[13, H - 2], [14, H - 2]] : s === 'w' ? [[1, 10], [1, 11]] : [[W - 2, 10], [W - 2, 11]];
    let cond, text;
    if (id === 't0') { cond = () => !!G.flags.starter; text = "Attends ! Sortir sans créature, c'est de la folie. Passe d'abord au labo du Prof. Lierre !"; }
    else if (def.gym != null) {
      const need = def.gym - REGIONS[reg].gymBase + 1;
      cond = () => badgeCount(reg) >= need;
      text = `La route suivante est dangereuse. Reviens quand tu auras le badge de l'arène de ${def.name}.`;
    }
    if (cond) map.guards.push({ cells, cond, text });
    if (cond) {
      const gx = s === 'n' || s === 's' ? 12 : (s === 'w' ? 2 : W - 3);
      const gy = s === 'n' ? 2 : s === 's' ? H - 3 : 9;
      if (t[gy][gx] === '.' || t[gy][gx] === ',') map.npcs.push({ kind: 'npc', x: gx, y: gy, dir: 'down', pal: PALS.guard, text: () => cond() ? "Bonne route, et prends soin de tes créatures !" : text });
    }
  }
  // bâtiments
  const lay = Object.assign({ NW: 'center', NE: 'shop', SW: 'house', SE: def.gym != null ? 'gym' : 'house2' }, def.layout || {});
  const Q = { NW: [2, 2], NE: [15, 2], SW: [2, 12], SE: [15, 12] };
  const SIZE = { center: [6, 4], shop: [5, 4], house: [5, 4], house2: [5, 4], home: [5, 4], gym: [7, 5], lab: [7, 5], league: [9, 5] };
  const doorFronts = [];
  let houseN = 0;
  const addBuilding = (kind, bx, by, bw, bh, roof) => {
    const dx = bx + Math.floor(bw / 2), dy = by + bh - 1;
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) t[y][x] = 'x';
    t[dy][dx] = 'D';
    const b = { kind: kind.startsWith('house') ? 'house' : kind, x: bx, y: by, w: bw, h: bh, door: [dx, dy], roof };
    if (kind === 'gym') { b.emblem = TC[GYMS[def.gym].type]; b.roof = dhex(TC[GYMS[def.gym].type], 0.15); }
    map.buildings.push(b);
    const intId = `${id}~${kind}`;
    INT[intId] = { kind: kind.startsWith('house') ? 'house' : kind, parent: id, door: [dx, dy], sub: kind };
    map.warps.push({ x: dx, y: dy, to: intId, enter: true });
    doorFronts.push([dx, dy + 1]);
    // relier au chemin
    if (dy + 1 < 10) { for (let y = dy + 1; y < 10; y++) if (t[y][dx] === '.') t[y][dx] = ','; }
    else { const y = dy + 1; const tx = dx < 13 ? 13 : 14; for (let x = Math.min(dx, tx); x <= Math.max(dx, tx); x++) if (t[y][x] === '.') t[y][x] = ','; }
    return b;
  };
  for (const q of ['NW', 'NE', 'SW', 'SE']) {
    const kind = lay[q];
    const [qx, qy] = Q[q];
    if (kind === 'pond') {
      for (let y = qy + 1; y < qy + 7; y++) for (let x = qx + 1; x < qx + 10; x++) t[y][x] = (y === qy + 1 || y === qy + 6 || x === qx + 1 || x === qx + 9) ? 's' : '~';
      continue;
    }
    if (kind === 'dock') {
      for (let y = qy + 1; y < H; y++) for (let x = qx; x < W; x++) t[y][x] = '~';
      for (let x = qx; x < W - 2; x++) t[qy + 1][x] = 's';
      for (let y = qy + 1; y < qy + 7; y++) { t[y][qx + 5] = '='; t[y][qx + 6] = '='; }
      map.npcs.push({ kind: 'npc', x: qx + 6, y: qy + 6, dir: 'up', pal: PALS.sailor, script: 'dock' });
      continue;
    }
    if (!kind || kind === 'none') continue;
    const [bw, bh] = SIZE[kind];
    const bx = qx + Math.floor((11 - bw) / 2), by = qy + 1;
    let roof = ROOF[kind];
    if (kind.startsWith('house')) roof = HOUSE_ROOFS[(hashStr(id) + houseN++) % HOUSE_ROOFS.length];
    addBuilding(kind, bx, by, bw, bh, roof);
  }
  // panneau
  t[12][12] = 'S'; map.signs['12,12'] = def.desc;
  // lampadaires et fleurs
  for (const [lx, ly] of [[12, 9], [15, 9], [12, 12 + 0], [15, 12]]) if (t[ly][lx] === '.') t[ly][lx] = 'L';
  const isFront = (x, y) => doorFronts.some(([a, b]) => a === x && (b === y || b + 1 === y));
  for (let i = 0; i < 26; i++) {
    const x = ri(R, 2, W - 3), y = ri(R, 2, H - 3);
    if (t[y][x] === '.' && !isFront(x, y)) t[y][x] = 'f';
  }
  // habitants
  const lines = (def.lines || []).slice();
  if (def.gym != null) {
    const gt = GYMS[def.gym].type;
    lines.push(`L'arène de ${def.name} est spécialisée dans le type ${TN[gt]}. Les types ${strongAgainst(gt).map(t => TN[t]).join(', ')} y sont efficaces.`);
  }
  const spots = [];
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if ((t[y][x] === '.' || t[y][x] === ',') && !isFront(x, y) && !map.npcs.some(n => n.x === x && n.y === y)) spots.push([x, y]);
  lines.forEach((line, i) => {
    const s = spots.splice(Math.floor(R() * spots.length), 1)[0]; if (!s) return;
    map.npcs.push({ kind: 'npc', x: s[0], y: s[1], dir: pick(R, ['down', 'left', 'right', 'up']), pal: NPC_PALS[(hashStr(id) + i * 3) % NPC_PALS.length], text: line, wander: 2 });
  });
  // événements de ville
  if (id === 't5') {
    const [dx, dy] = map.buildings.find(b => b.kind === 'gym').door;
    map.npcs.push(storyTrainer('somnis_t5c', dx, dy + 1, 'down', PALS.admin, 1));
    map.npcs.push(storyTrainer('somnis_t5a', dx - 1, dy + 2, 'down', PALS.grunt, 1));
    map.npcs.push(storyTrainer('somnis_t5b', dx + 1, dy + 2, 'down', PALS.grunt, 1));
  }
  if (id === 'u5') {
    const [dx, dy] = map.buildings.find(b => b.kind === 'gym').door;
    map.npcs.push(storyTrainer('somnis_u5', dx, dy + 1, 'down', PALS.admin, 1));
  }
  return map;
}
function storyTrainer(key, x, y, dir, pal, sight) {
  const d = STORY_TRAINERS[key];
  return { kind: 'trainer', x, y, dir, pal, story: key, trainer: Object.assign({ sight: sight != null ? sight : 4, flag: 'st_' + key }, d) };
}

// ---- Route ----
function genRoute(id) {
  const def = ROUTES[id], L = LINKS[id], dir = L.dir, R = rng(hashStr(id + ':route'));
  const A = def.len || 52, C = dir === 'n' ? 22 : 20;
  const Gd = newGrid(C, A, '.');            // Gd[a][c]
  for (let a = 0; a < A; a++) for (let c = 0; c < C; c++) if (c < 2 || c >= C - 2 || a === 0 || a === A - 1) Gd[a][c] = 'T';
  const ge = ri(R, 4, C - 6), gx = ri(R, 4, C - 6);
  const path = new Set();
  const carve = (a, c) => { Gd[a][c] = ','; path.add(a * 100 + c); };
  let c = ge;
  const pcol = [];
  for (let a = 0; a < A; a++) {
    if (a > 3 && a < A - 10 && R() < 0.2) {
      const nc = Math.max(3, Math.min(C - 5, c + (R() < 0.5 ? -1 : 1) * ri(R, 2, 5)));
      for (let k = Math.min(c, nc); k <= Math.max(c, nc) + 1; k++) carve(a, k);
      c = nc;
    }
    if (a >= A - 10 && c !== gx) {
      const nc = c + Math.sign(gx - c) * Math.min(Math.abs(gx - c), 2);
      for (let k = Math.min(c, nc); k <= Math.max(c, nc) + 1; k++) carve(a, k);
      c = nc;
    }
    carve(a, c); carve(a, c + 1);
    pcol[a] = c;
  }
  const isPath = (a, cc) => path.has(a * 100 + cc);
  const interior = (a, cc) => a > 0 && a < A - 1 && cc >= 2 && cc < C - 2;
  // bosquets
  const nTrees = def.cave ? 0 : 10 + Math.floor(R() * 6);
  for (let i = 0; i < nTrees; i++) {
    const a0 = ri(R, 2, A - 3), c0 = ri(R, 2, C - 3), ra = 1 + R() * 3, rc = 1 + R() * 2.5;
    for (let a = Math.floor(a0 - ra); a <= a0 + ra; a++) for (let cc = Math.floor(c0 - rc); cc <= c0 + rc; cc++) {
      if (!interior(a, cc) || isPath(a, cc)) continue;
      if (((a - a0) / ra) ** 2 + ((cc - c0) / rc) ** 2 <= 1 && !isPath(a, cc - 1) && !isPath(a, cc + 1)) Gd[a][cc] = 'T';
    }
  }
  // hautes herbes
  const nGrass = 6 + Math.floor(R() * 4);
  for (let i = 0; i < nGrass; i++) {
    const a0 = ri(R, 3, A - 6), c0 = ri(R, 2, C - 7), ha = ri(R, 3, 7), wc = ri(R, 3, 8);
    for (let a = a0; a < a0 + ha && a < A - 1; a++) for (let cc = c0; cc < c0 + wc && cc < C - 2; cc++) if (Gd[a][cc] === '.' || Gd[a][cc] === ',') Gd[a][cc] = '"';
  }
  // étang
  if (def.pond) {
    const a0 = ri(R, 12, A - 18);
    const pc = pcol[a0];
    const leftRoom = pc - 2, rightRoom = C - 2 - (pc + 2);
    const w = 6, h = 6;
    const c0 = leftRoom > rightRoom ? Math.max(2, pc - 1 - w) : pc + 3;
    let ok = true;
    for (let a = a0; a < a0 + h; a++) for (let cc = c0; cc < c0 + w; cc++) if (!interior(a, cc) || isPath(a, cc)) ok = false;
    if (ok) for (let a = a0; a < a0 + h; a++) for (let cc = c0; cc < c0 + w; cc++) Gd[a][cc] = '~';
  }
  // fleurs
  for (let a = 1; a < A - 1; a++) for (let cc = 2; cc < C - 2; cc++) if (Gd[a][cc] === '.' && R() < 0.035) Gd[a][cc] = 'f';
  const toXY = (a, cc) => dir === 'n' ? [cc, A - 1 - a] : [a, cc];
  const W = dir === 'n' ? C : A, H = dir === 'n' ? A : C;
  const faceC = s => dir === 'n' ? (s > 0 ? 'right' : 'left') : (s > 0 ? 'down' : 'up');
  const npcs = [];
  const used = new Set();
  const free = (a, cc) => interior(a, cc) && !used.has(a * 100 + cc) && Gd[a][cc] !== '~';
  const clear = (a, cc) => { if (Gd[a][cc] === 'T' || Gd[a][cc] === 'f') Gd[a][cc] = '.'; };
  // dresseurs
  const n = def.tr || 3;
  const reserved = new Set();
  for (let k = 0; k < n; k++) {
    const a = Math.floor(8 + (A - 18) * (k + 0.5) / n) + ri(R, -1, 1);
    const pc = pcol[a];
    let side = R() < 0.5 ? -1 : 1;
    let cc = side < 0 ? pc - 2 : pc + 3;
    if (!free(a, cc) || cc < 2 || cc >= C - 2) { side = -side; cc = side < 0 ? pc - 2 : pc + 3; }
    if (!free(a, cc) || cc < 2 || cc >= C - 2) continue;
    clear(a, cc); clear(a, side < 0 ? pc - 1 : pc + 2);
    used.add(a * 100 + cc); reserved.add(a);
    const cls = pick(R, def.cls);
    const team = encTeam(R, def.enc, cls, 1);
    const [x, y] = toXY(a, cc);
    npcs.push(trainerNPC(R, cls, team, { x, y, dir: faceC(-side), trainer: undefined }));
    const npc = npcs[npcs.length - 1];
    const tr = trainerNPC(R, cls, team).trainer; tr.sight = 4; tr.flag = `tr:${id}:${k}`;
    npc.trainer = tr;
  }
  // personnages scénarisés (déclenchés en traversant la route)
  const lineTriggers = [];
  (def.special || []).forEach((key, i) => {
    const a = Math.floor(A * (0.35 + 0.3 * i)) + (i ? 2 : 0);
    const pc = pcol[a];
    const [x, y] = toXY(a, pc);
    const isR = key.startsWith('rival');
    used.add(a * 100 + pc); reserved.add(a);
    npcs.push(storyTrainer(key, x, y, dir === 'n' ? 'down' : 'left', isR ? PALS.rival : PALS.grunt, 3));
    const [lx, ly] = toXY(a - 1, 0);
    lineTriggers.push(dir === 'n' ? { y: ly, npc: npcs.length - 1 } : { x: lx, npc: npcs.length - 1 });
  });
  // objets
  (def.items || []).forEach((it, i) => {
    for (let tries = 0; tries < 30; tries++) {
      const a = ri(R, 4, A - 5), pc = pcol[a];
      const cc = R() < 0.5 ? pc - 1 : pc + 2;
      if (!free(a, cc) || isPath(a, cc)) continue;
      clear(a, cc); used.add(a * 100 + cc);
      const [x, y] = toXY(a, cc);
      npcs.push({ kind: 'item', x, y, item: it, flag: `it:${id}:${i}` });
      break;
    }
  });
  // arbuste à couper avec trésor
  if (def.cut) {
    for (let tries = 0; tries < 40; tries++) {
      const a = ri(R, 8, A - 8), pc = pcol[a];
      const s = R() < 0.5 ? -1 : 1;
      const c1 = s < 0 ? pc - 1 : pc + 2, c2 = c1 + s, c3 = c2 + s;
      if (!interior(a, c3) || [c1, c2].some(k => !free(a, k) || isPath(a, k)) || reserved.has(a)) continue;
      if ([[a - 1, c1], [a + 1, c1], [a - 1, c2], [a + 1, c2], [a, c3]].some(([aa, kk]) => used.has(aa * 100 + kk))) continue;
      Gd[a][c1] = 'b'; Gd[a][c2] = '.';
      for (const [aa, kk] of [[a - 1, c1], [a + 1, c1], [a - 1, c2], [a + 1, c2], [a, c3]]) if (interior(aa, kk) && !isPath(aa, kk)) Gd[aa][kk] = 'T';
      used.add(a * 100 + c2);
      const [x, y] = toXY(a, c2);
      npcs.push({ kind: 'item', x, y, item: pick(R, ['bonbon', 'rappel', 'hyperbaume', 'supersphere']), flag: `it:${id}:cut` });
      break;
    }
  }
  // entrée de sanctuaire
  let sideWarp = null;
  if (def.side) {
    for (let tries = 0; tries < 40; tries++) {
      const a = Math.floor(A / 2) + ri(R, -6, 6), pc = pcol[a];
      const s = (pc - 2 > C - 4 - pc) ? -1 : 1;
      const c1 = s < 0 ? pc - 1 : pc + 2, c2 = c1 + s, c3 = c2 + s;
      if (!interior(a, c3) || reserved.has(a) || used.has(a * 100 + c1) || used.has(a * 100 + c2) || [[a - 1, c3], [a + 1, c3], [a, c3 + s]].some(([aa, kk]) => used.has(aa * 100 + kk))) continue;
      Gd[a][c1] = ','; Gd[a][c2] = ','; Gd[a][c3] = 'O';
      for (const [aa, kk] of [[a - 1, c3], [a + 1, c3], [a, c3 + s]]) if (interior(aa, kk) && !isPath(aa, kk)) Gd[aa][kk] = 'V';
      used.add(a * 100 + c2);
      const [ox, oy] = toXY(a, c3), [bx, by] = toXY(a, c2);
      sideWarp = { ox, oy, bx, by, back: faceC(-s) };
      break;
    }
  }
  // panneau
  {
    const a = 2, pc = pcol[a], cc = pc - 1 >= 2 ? pc - 1 : pc + 2;
    Gd[a][cc] = 'S';
    var signXY = toXY(a, cc);
  }
  // promeneur
  {
    const a = ri(R, 10, A - 10), pc = pcol[a], cc = pc + 2;
    if (free(a, cc) && !isPath(a, cc)) { clear(a, cc); const [x, y] = toXY(a, cc); npcs.push({ kind: 'npc', x, y, dir: 'down', pal: NPC_PALS[ri(R, 0, 9)], text: pick(R, HINTS[def.reg]) }); }
  }
  // conversion
  const t = newGrid(W, H, '.');
  for (let a = 0; a < A; a++) for (let cc = 0; cc < C; cc++) { const [x, y] = toXY(a, cc); t[y][x] = Gd[a][cc]; }
  const map = { id, name: def.name, kind: 'route', reg: def.reg, pal: def.pal || REGIONS[def.reg].pal, w: W, h: H, t, border: 'T', buildings: [], warps: [], npcs, signs: {}, gates: {}, guards: [], enc: def.enc, music: def.reg === 'brumaire' ? 'route2' : 'route', outdoor: true, lineTriggers };
  map.signs[signXY.join(',')] = `${def.name}. ${def.reg === 'solvene' ? 'Région de Solvène' : 'Région de Brumaire'}.`;
  const entrSide = L.entr.side, exitSide = L.exit.side;
  map.gates[entrSide] = { p: ge, to: L.entr.to };
  map.gates[exitSide] = { p: gx, to: L.exit.to };
  if (sideWarp) {
    map.warps.push({ x: sideWarp.ox, y: sideWarp.oy, to: def.side, tx: 7, ty: 16, dir: 'up' });
    SPECIAL_RET[def.side] = { map: id, x: sideWarp.bx, y: sideWarp.by, dir: sideWarp.back };
  }
  return map;
}
const HINTS = {
  solvene: ["Les créatures sauvages changent selon l'heure. Certaines ne sortent que la nuit.", "Garde toujours des Baumes sur toi. On ne sait jamais.", "Courir ? Maintiens le bouton B en marchant.", "Les créatures endormies ou paralysées sont plus faciles à capturer.", "Les Sphères marchent mieux quand la créature a peu de PV.", "Un Partage Exp fait progresser toute ton équipe en même temps.", "Les types se répondent : l'Eau éteint le Feu, la Flore boit l'Eau, le Feu brûle la Flore.", "Tu as vu ces gens en violet ? L'Ordre Somnis. Ils me donnent des frissons."],
  brumaire: ["À Brumaire, la nuit tombe tôt. Les créatures nocturnes sont nombreuses.", "Les Sphères Nuit sont redoutables dans le noir.", "Les anciens disent que l'Éveillé attend toujours au sommet du Mont Éveil.", "Certaines créatures n'apparaissent que dans l'eau. Nage un peu !", "Les ruines de Brumaire ont été construites avant Solvène.", "Ici, même les dresseurs les plus jeunes ont des créatures puissantes."],
};

// ---- Grotte ----
function genCave(id) {
  const def = ROUTES[id], L = LINKS[id], dir = L.dir, R = rng(hashStr(id + ':cave'));
  const A = 56, C = 24;
  const Gd = newGrid(C, A, 'R');
  const ge = ri(R, 5, C - 8), gx = ri(R, 5, C - 8);
  const path = new Set();
  const carve = (a, cc) => { if (a >= 0 && a < A && cc >= 1 && cc < C - 1) { Gd[a][cc] = 'm'; path.add(a * 100 + cc); } };
  let c = ge; const pcol = [];
  for (let a = 0; a < A; a++) {
    if (a > 3 && a < A - 10 && R() < 0.22) {
      const nc = Math.max(3, Math.min(C - 6, c + (R() < 0.5 ? -1 : 1) * ri(R, 2, 6)));
      for (let k = Math.min(c, nc); k <= Math.max(c, nc) + 2; k++) carve(a, k);
      c = nc;
    }
    if (a >= A - 10 && c !== gx) { const nc = c + Math.sign(gx - c) * Math.min(Math.abs(gx - c), 2); for (let k = Math.min(c, nc); k <= Math.max(c, nc) + 2; k++) carve(a, k); c = nc; }
    carve(a, c); carve(a, c + 1); if (a > 0 && a < A - 1) carve(a, c + 2);
    pcol[a] = c;
  }
  // salles
  const rooms = [];
  for (let i = 0; i < 8; i++) {
    const a0 = ri(R, 4, A - 10), pc = pcol[a0];
    const s = R() < 0.5 ? -1 : 1;
    const w = ri(R, 4, 7), h = ri(R, 4, 7);
    const c0 = s < 0 ? pc - w : pc + 3;
    if (c0 < 2 || c0 + w > C - 2) continue;
    for (let a = a0; a < a0 + h && a < A - 1; a++) for (let cc = c0; cc < c0 + w; cc++) Gd[a][cc] = 'm';
    rooms.push([a0, c0, w, h]);
  }
  for (let a = 1; a < A - 1; a++) for (let cc = 2; cc < C - 2; cc++) if (Gd[a][cc] === 'm' && !path.has(a * 100 + cc) && R() < 0.08) Gd[a][cc] = 'r';
  const toXY = (a, cc) => dir === 'n' ? [cc, A - 1 - a] : [a, cc];
  const W = dir === 'n' ? C : A, H = dir === 'n' ? A : C;
  const faceC = s => dir === 'n' ? (s > 0 ? 'right' : 'left') : (s > 0 ? 'down' : 'up');
  const npcs = []; const used = new Set();
  const n = def.tr || 4;
  for (let k = 0; k < n; k++) {
    const a = Math.floor(8 + (A - 18) * (k + 0.5) / n);
    const pc = pcol[a];
    const s = R() < 0.5 ? -1 : 1;
    const cc = s < 0 ? pc - 2 : pc + 4;
    if (cc < 2 || cc >= C - 2) continue;
    Gd[a][cc] = 'm'; Gd[a][s < 0 ? pc - 1 : pc + 3] = 'm';
    used.add(a * 100 + cc);
    const cls = pick(R, def.cls);
    const team = encTeam(R, def.enc, cls, 2);
    const [x, y] = toXY(a, cc);
    const tr = trainerNPC(R, cls, team);
    tr.x = x; tr.y = y; tr.dir = faceC(-s); tr.trainer.sight = 4; tr.trainer.flag = `tr:${id}:${k}`;
    if (cls === 'somnis') tr.pal = PALS.grunt;
    npcs.push(tr);
  }
  const lineTriggers = [];
  (def.special || []).forEach(key => {
    const a = Math.floor(A * 0.7), pc = pcol[a];
    const [x, y] = toXY(a, pc + 1);
    npcs.push(storyTrainer(key, x, y, dir === 'n' ? 'down' : 'left', PALS.rival, 3));
    const [lx, ly] = toXY(a - 1, 0);
    lineTriggers.push(dir === 'n' ? { y: ly, npc: npcs.length - 1 } : { x: lx, npc: npcs.length - 1 });
  });
  (def.items || []).forEach((it, i) => {
    const room = rooms[i % Math.max(1, rooms.length)];
    if (!room) return;
    const [a0, c0, w, h] = room;
    const a = a0 + Math.floor(h / 2), cc = c0 + Math.floor(w / 2);
    if (a >= A - 1) return;
    Gd[a][cc] = 'm';
    const [x, y] = toXY(a, cc);
    npcs.push({ kind: 'item', x, y, item: it, flag: `it:${id}:${i}` });
  });
  const t = newGrid(W, H, 'R');
  for (let a = 0; a < A; a++) for (let cc = 0; cc < C; cc++) { const [x, y] = toXY(a, cc); t[y][x] = Gd[a][cc]; }
  const map = { id, name: def.name, kind: 'cave', reg: def.reg, pal: def.pal || 'grotte', w: W, h: H, t, border: 'R', buildings: [], warps: [], npcs, signs: {}, gates: {}, guards: [], enc: def.enc, music: 'cave', outdoor: false, lineTriggers };
  map.gates[L.entr.side] = { p: ge, to: L.entr.to };
  map.gates[L.exit.side] = { p: gx, to: L.exit.to };
  return map;
}

// ---- Sanctuaires ----
function genSanctuary(id) {
  const ret = SPECIAL_RET[id] || null;
  if (!ret) { getMap(id === 'sanct_aube' ? 'r8' : 's7'); }
  const back = SPECIAL_RET[id];
  const isAube = id === 'sanct_aube';
  const W = 15, H = 18;
  const t = newGrid(W, H, 'T');
  for (let y = 1; y < H - 1; y++) for (let x = 3; x < W - 3; x++) t[y][x] = '.';
  for (let y = 1; y < H; y++) t[y][7] = 'q';
  for (let y = 1; y < 6; y++) for (let x = 4; x < 11; x++) t[y][x] = 'q';
  for (let y = 2; y < 5; y++) for (let x = 6; x < 9; x++) t[y][x] = 'a';
  for (let y = 7; y < H - 1; y++) { t[y][6] = 'T'; t[y][8] = 'T'; }
  for (const [x, y] of [[4, 2], [10, 2], [4, 5], [10, 5]]) t[y][x] = 'L';
  for (let y = 7; y < H - 1; y += 2) { t[y][4] = 'f'; t[y][10] = 'f'; }
  t[H - 1][7] = 'O';
  const map = { id, name: isAube ? "Sanctuaire de l'Aube" : 'Sanctuaire de la Nuit', kind: 'special', reg: isAube ? 'solvene' : 'brumaire', pal: isAube ? 'neige' : 'brumaire', w: W, h: H, t, border: 'T', buildings: [], warps: [], npcs: [], signs: {}, gates: {}, guards: [], enc: {}, music: 'sacred', outdoor: true, env: 'sacred' };
  map.warps.push({ x: 7, y: H - 1, to: back.map, tx: back.x, ty: back.y, dir: back.dir });
  if (isAube) {
    map.npcs.push(storyTrainer('somnis_aube1', 7, 11, 'down', PALS.grunt, 4));
    map.npcs.push(storyTrainer('somnis_aube2', 7, 7, 'down', PALS.boss, 3));
    map.npcs.push({ kind: 'legend', x: 7, y: 3, legend: 'auberis', cond: () => !G.flags.leg_auberis });
  } else {
    map.npcs.push(storyTrainer('somnis_nuit1', 7, 11, 'down', PALS.grunt, 4));
    map.npcs.push(storyTrainer('somnis_nuit2', 7, 7, 'down', PALS.boss, 3));
    map.npcs.push({ kind: 'legend', x: 7, y: 3, legend: 'nocturnis', cond: () => !G.flags.leg_nocturnis });
  }
  return map;
}

// ---- Sommet ----
function genSummit(id) {
  const W = 17, H = 26;
  const t = newGrid(W, H, 'V');
  for (let y = 0; y < H; y++) t[y][8] = 'q';
  t[H - 1][7] = 'q'; t[H - 2][7] = 'q'; t[H - 1][9] = 'q';
  for (let y = 1; y < 7; y++) for (let x = 4; x < 13; x++) t[y][x] = '.';
  for (let y = 2; y < 5; y++) for (let x = 7; x < 10; x++) t[y][x] = 'a';
  for (let y = 9; y < 13; y++) for (let x = 6; x < 11; x++) t[y][x] = '.';
  for (let y = 17; y < 22; y++) for (let x = 5; x < 12; x++) t[y][x] = '.';
  for (let y = 0; y < H; y++) t[y][8] = 'q';
  t[0][8] = 'V';
  for (const [x, y] of [[5, 2], [11, 2], [6, 18], [10, 18]]) t[y][x] = 'L';
  const map = { id, name: 'Mont Éveil', kind: 'special', reg: 'brumaire', pal: 'neige', w: W, h: H, t, border: 'V', buildings: [], warps: [], npcs: [], signs: {}, gates: { s: { p: 7, to: LINKS[id].entr.to } }, guards: [], enc: {}, music: 'sacred', outdoor: true, env: 'snow' };
  t[H - 1][7] = 'q'; t[H - 1][8] = 'q';
  map.npcs.push(storyTrainer('rival6', 8, 15, 'down', PALS.rival, 3));
  map.npcs.push(storyTrainer('elio', 8, 8, 'down', PALS.elio, 2));
  map.npcs.push({ kind: 'npc', x: 10, y: 10, dir: 'left', pal: PALS.elio, cond: () => !!G.flags.st_elio, text: "Le dernier gardien t'attend devant l'autel. Il est rare qu'il se montre deux fois." });
  map.npcs.push({ kind: 'legend', x: 8, y: 3, legend: 'eveillon', cond: () => !!G.flags.st_elio && !G.flags.leg_eveillon });
  return map;
}

// ---- Intérieurs ----
const INT_TPL = {
  center: { w: 11, h: 8, rows: ['wwwwwwwwwww', 'wwwwwwwwwww', 'ooocccccoCo', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', 'poooooooooo', 'ooooookoooo'], mat: [5, 7] },
  shop: { w: 11, h: 8, rows: ['wwwwwwwwwww', 'wwwwwwwwwww', 'cccoooBBBBo', 'ooooooooooo', 'ooBBooooBBo', 'ooooooooooo', 'ooooooooooo', 'ooooookoooo'], mat: [5, 7] },
  house: { w: 9, h: 7, rows: ['wwwwwwwww', 'wwwwwwwww', 'oBBoooopo', 'ooooooooo', 'ooottoooo', 'ooooooooo', 'ooookoooo'], mat: [4, 6] },
  home: { w: 9, h: 7, rows: ['wwwwwwwww', 'wwwwwwwww', 'oBBoooCpo', 'ooooooooo', 'ooottoooo', 'ooooooooo', 'ooookoooo'], mat: [4, 6] },
  lab: { w: 11, h: 10, rows: ['wwwwwwwwwww', 'wwwwwwwwwww', 'BBBoooooBBB', 'ooooooooooo', 'oooooottttoo'.slice(0, 11), 'ooooooooooo', 'oCooooooooC', 'ooooooooooo', 'poooooooooo', 'ooooookoooo'], mat: [5, 9] },
};
function genInterior(id, def) {
  const town = TOWNS[def.parent];
  const reg = town.reg;
  const kind = def.kind;
  let t, W, H, mat, pal = 'int', npcs = [], music = 'center', name = town.name;
  if (INT_TPL[kind]) {
    const tp = INT_TPL[kind]; W = tp.w; H = tp.h; t = tp.rows.map(r => r.split('')); mat = tp.mat;
  }
  if (kind === 'center') {
    name = 'Centre de Soin';
    npcs.push({ kind: 'npc', x: 5, y: 1, dir: 'down', pal: PALS.nurse, script: 'nurse' });
    npcs.push({ kind: 'npc', x: 2, y: 4, dir: 'right', pal: NPC_PALS[hashStr(id) % 10], text: pick(rng(hashStr(id)), HINTS[reg]), wander: 1 });
  } else if (kind === 'shop') {
    name = 'Boutique'; music = 'town1';
    npcs.push({ kind: 'npc', x: 1, y: 1, dir: 'down', pal: PALS.clerk, script: 'shop' });
    npcs.push({ kind: 'npc', x: 7, y: 5, dir: 'up', pal: NPC_PALS[(hashStr(id) + 3) % 10], text: pick(rng(hashStr(id) + 1), ["Je fais toujours le plein de Baumes avant de partir.", "Les Repousses éloignent les créatures plus faibles que ta première créature.", "Plus tu as de badges, plus la boutique propose d'articles !"]) });
  } else if (kind === 'house') {
    name = town.name; music = reg === 'brumaire' ? 'town2' : 'town1';
    const h = town.house || { text: "Bienvenue chez nous !" };
    npcs.push({ kind: 'npc', x: 6, y: 4, dir: 'left', pal: NPC_PALS[(hashStr(id) + 5) % 10], script: 'gift', data: { town: def.parent, h } });
    npcs.push({ kind: 'npc', x: 2, y: 5, dir: 'right', pal: NPC_PALS[(hashStr(id) + 7) % 10], text: pick(rng(hashStr(id) + 9), town.lines || ["Il fait bon vivre ici."]), wander: 1 });
  } else if (kind === 'home') {
    name = 'Maison'; music = 'town1';
    npcs.push({ kind: 'npc', x: 2, y: 4, dir: 'right', pal: PALS.mom, script: 'mom' });
  } else if (kind === 'lab') {
    name = 'Labo du Prof. Lierre'; music = 'town1';
    npcs.push({ kind: 'npc', x: 5, y: 2, dir: 'down', pal: PALS.prof, script: 'prof' });
    ['feuillon', 'brasille', 'clapotin'].forEach((sp, i) => npcs.push({ kind: 'ball', x: 6 + i, y: 4, script: 'starter', data: sp, cond: () => !G.flags.starter && !G.flags.rivalPick }));
    npcs.push({ kind: 'npc', x: 3, y: 5, dir: 'right', pal: PALS.rival, cond: () => !G.flags.st_rival1, text: () => `${G.rival} : Le prof m'a dit d'attendre que tu choisisses en premier. Allez, dépêche-toi !` });
    npcs.push({ kind: 'npc', x: 9, y: 7, dir: 'left', pal: NPC_PALS[8], text: "Je suis l'assistant du prof. Il étudie depuis des années pourquoi les créatures se réveillent toutes au même moment chaque matin." });
  } else if (kind === 'gym') {
    const gym = GYMS[town.gym];
    W = 11; H = 17; pal = 'gym:' + gym.type; music = 'route'; name = 'Arène de ' + town.name;
    t = newGrid(W, H, 'g');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (y < 2 || x === 0 || x === W - 1) t[y][x] = 'w';
    mat = [5, H - 1]; t[H - 1][5] = 'k';
    for (const [x, y] of [[3, 15], [7, 15], [3, 3], [7, 3]]) t[y][x] = 'G';
    const R = rng(hashStr(id));
    const leader = { kind: 'trainer', x: 5, y: 2, dir: 'down', pal: { h: dhex(TC[gym.type], 0.4), s: '#f2c9a0', c: TC[gym.type], p: '#2a2a3a' }, gym: town.gym,
      trainer: { cls: 'leader', name: gym.leader, team: gym.team, intro: gym.intro, lose: gym.lose, sight: 0, flag: 'gym' + town.gym, money: 100, music: 'boss', leader: town.gym } };
    npcs.push(leader);
    const nTr = town.gym < 2 ? 2 : town.gym < 8 ? 3 : 4;
    const pos = [[2, 13, 'right'], [8, 10, 'left'], [2, 7, 'right'], [8, 5, 'left']];
    const pool = gym.team.map(e => e[0]);
    for (let k = 0; k < nTr; k++) {
      const [x, y, d] = pos[k];
      const lv = gym.team[0][1] - 3 + k;
      const team = [];
      const cnt = 1 + (k % 2) + (town.gym >= 8 ? 1 : 0);
      for (let j = 0; j < cnt; j++) { const sp = SP[pick(R, pool)]; let root = sp.id; while (SP[root].prev) root = SP[root].prev; team.push([evolveForLevel(root, lv), lv]); }
      const cls = k % 2 ? 'dresseuse' : 'dresseur';
      const tr = trainerNPC(R, cls, team);
      tr.x = x; tr.y = y; tr.dir = d; tr.trainer.sight = 6; tr.trainer.flag = `tr:${id}:${k}`;
      tr.trainer.intro = pick(R, [`Tu veux défier ${gym.leader} ? Passe d'abord par moi !`, `Le type ${TN[gym.type]}, c'est toute ma vie !`, `Ici, on s'entraîne au type ${TN[gym.type]} jour et nuit.`]);
      npcs.push(tr);
    }
    npcs.push({ kind: 'npc', x: 6, y: 14, dir: 'left', pal: NPC_PALS[4], text: () => G.badges[town.gym] ? `Bravo pour le ${gym.badge} ! Tu iras loin.` : `Conseil d'ami : ${gym.leader} utilise le type ${TN[gym.type]}${gym.prism ? ', mais pas seulement. Son équipe couvre toutes les faiblesses' : ''}. Les types ${strongAgainst(gym.type).map(x => TN[x]).join(', ')} sont efficaces.` });
  } else if (kind === 'league') {
    W = 11; H = 34; pal = 'gym:lumiere'; music = 'sacred'; name = 'Ligue de Solvène';
    t = newGrid(W, H, 'w');
    for (let y = 2; y < H; y++) for (let x = 4; x <= 6; x++) t[y][x] = 'g';
    mat = [5, H - 1]; t[H - 1][5] = 'k';
    const rows = [28, 22, 16, 10];
    ['elite1', 'elite2', 'elite3', 'elite4'].forEach((k, i) => {
      const y = rows[i]; t[y][4] = 'G'; t[y][6] = 'G';
      npcs.push(storyTrainer(k, 5, y, 'down', NPC_PALS[(i * 3 + 1) % 10], 3));
    });
    t[4][4] = 'G'; t[4][6] = 'G';
    npcs.push(storyTrainer('champion', 5, 4, 'down', { h: '#e9c43a', s: '#f2c9a0', c: '#ffffff', p: '#2a3a8a', hat: '#2a3a8a' }, 2));
    npcs.push({ kind: 'npc', x: 4, y: 31, dir: 'right', pal: PALS.guard, text: "Une fois entré, tu ne pourras plus te soigner au Centre. Si tu perds, il faudra tout recommencer." });
  }
  const map = { id, name, kind: 'int', reg, pal, w: W, h: H, t, border: 'w', buildings: [], warps: [], npcs, signs: {}, gates: {}, guards: [], enc: {}, music, outdoor: false, env: 'indoor', parent: def.parent, sub: kind };
  const [dx, dy] = def.door;
  map.warps.push({ x: mat[0], y: mat[1], to: def.parent, tx: dx, ty: dy + 1, dir: 'down', exit: true });
  map.entry = [mat[0], mat[1] - 1];
  return map;
}
function interiorEntry(id) { const m = getMap(id); return m.entry; }
