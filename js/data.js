// Contenu de l'appli : exercices, programmes, quêtes, boutique.
// Tout est en données pour pouvoir ajuster le programme sans toucher à la logique.

export const EXERCISES = {
  // Échauffement / cardio
  'jumping-jacks': { name: 'Jumping jacks', emoji: '🤸', tip: 'Saute en écartant bras et jambes, puis reviens. Reste léger sur la pointe des pieds.' },
  'montees-genoux': { name: 'Montées de genoux', emoji: '🏃', tip: 'Cours sur place en montant les genoux à hauteur des hanches.' },
  'rotations-bras': { name: 'Moulinets de bras', emoji: '🌀', tip: 'Grands cercles avec les bras tendus, vers l\'avant puis vers l\'arrière.' },
  'mountain-climbers': { name: 'Mountain climbers', emoji: '⛰️', tip: 'En position de pompe, ramène un genou après l\'autre vers la poitrine. Pas trop vite, garde le dos plat.' },

  // Poids du corps
  'squat': { name: 'Squats', emoji: '🦵', tip: 'Pieds largeur d\'épaules, pousse les fesses en arrière comme pour t\'asseoir. Dos droit, talons au sol.' },
  'pompes-inclinees': { name: 'Pompes inclinées', emoji: '💪', tip: 'Mains sur le canapé ou une table solide. Corps bien droit, la poitrine descend vers le support.' },
  'pompes-genoux': { name: 'Pompes sur les genoux', emoji: '💪', tip: 'Genoux au sol, corps droit des genoux à la tête. Descends doucement, pousse fort.' },
  'planche': { name: 'Planche', emoji: '🧱', tip: 'Sur les avant-bras, corps droit comme une planche. Trop dur ? Pose les genoux.' },
  'pont-fessier': { name: 'Pont fessier', emoji: '🌉', tip: 'Allongé sur le dos, genoux pliés. Monte les hanches en serrant les fesses, redescends lentement.' },
  'fentes': { name: 'Fentes alternées', emoji: '🚶', tip: 'Un grand pas en avant, le genou arrière descend vers le sol. Alterne les jambes (compte le total).' },
  'superman': { name: 'Superman', emoji: '🦸', tip: 'Allongé sur le ventre, décolle bras et jambes du sol et tiens. Regarde le sol.' },
  'chaise': { name: 'Chaise contre le mur', emoji: '🪑', tip: 'Dos contre le mur, descends comme assis sur une chaise invisible. Tiens bon !' },

  // Haltères (disques de 1 à 2,5 kg)
  'goblet-squat': { name: 'Squat gobelet', emoji: '🏋️', tip: 'Tiens un haltère contre ta poitrine à deux mains, puis fais un squat. Coudes vers le bas.' },
  'rowing': { name: 'Rowing haltère', emoji: '🚣', tip: 'Une main et un genou sur une chaise, tire l\'haltère vers la hanche. Le meilleur ami de la traction ! (compte les deux bras)' },
  'developpe-epaules': { name: 'Développé épaules', emoji: '🙌', tip: 'Debout, pousse les haltères au-dessus de la tête, puis redescends à hauteur des oreilles.' },
  'curl': { name: 'Curl biceps', emoji: '💪', tip: 'Coudes collés au corps, monte les haltères vers les épaules sans balancer.' },
  'souleve-roumain': { name: 'Soulevé de terre roumain', emoji: '🙇', tip: 'Jambes presque tendues, descends les haltères le long des jambes en gardant le dos bien plat.' },
  'floor-press': { name: 'Développé au sol', emoji: '🛏️', tip: 'Allongé sur le dos, pousse les haltères vers le plafond. Les coudes touchent le sol en bas.' },
  'fentes-halteres': { name: 'Fentes avec haltères', emoji: '🚶', tip: 'Comme les fentes, avec un haltère dans chaque main, bras le long du corps.' },

  // Barre de traction
  'suspension': { name: 'Suspension à la barre', emoji: '🐒', tip: 'Accroche-toi, bras tendus, épaules actives (pas collées aux oreilles). Respire.' },
  'omoplates': { name: 'Haussements d\'omoplates', emoji: '🦅', tip: 'Suspendu bras tendus, tire les épaules vers le bas sans plier les coudes. Petit mouvement, gros effet.' },
  'negatives': { name: 'Tractions négatives', emoji: '⬇️', tip: 'Monte menton au-dessus de la barre avec une chaise, puis descends le plus lentement possible (compte jusqu\'à 4).' },
  'traction-assistee': { name: 'Tractions assistées', emoji: '🪜', tip: 'Un pied sur la chaise pour t\'aider, tire jusqu\'au menton au-dessus de la barre. Aide-toi le moins possible.' },
  'traction': { name: 'Tractions', emoji: '🏆', tip: 'Bras tendus, tire jusqu\'au menton au-dessus de la barre. Fais-en autant que possible proprement !' },

  // Retour au calme
  'etirement-jambes': { name: 'Étirement des jambes', emoji: '🧘', tip: 'Assis jambes tendues, attrape doucement tes pieds ou tes tibias. Ne force pas.' },
  'etirement-epaules': { name: 'Étirement des épaules', emoji: '🙆', tip: 'Passe un bras devant la poitrine et tire-le doucement avec l\'autre. Change de bras à la moitié.' },
};

// Exercices où l'on compte le temps de suspension (pour les quêtes).
export const HANG_EXERCISES = ['suspension', 'omoplates'];

// Une étape = { ex, reps } ou { ex, secs } ou { rest }.
// Les répétitions et durées de base sont multipliées par le palier du joueur (voir game.scaleStep).

// Matin : ~5 minutes. Une variante par jour pour ne pas s'ennuyer.
export const MORNING_CIRCUITS = {
  none: [
    [{ ex: 'squat', reps: 10 }, { ex: 'pompes-inclinees', reps: 6 }, { ex: 'planche', secs: 20 }],
    [{ ex: 'fentes', reps: 10 }, { ex: 'pont-fessier', reps: 10 }, { ex: 'superman', secs: 20 }],
    [{ ex: 'chaise', secs: 20 }, { ex: 'pompes-genoux', reps: 6 }, { ex: 'mountain-climbers', secs: 20 }],
  ],
  db: [
    [{ ex: 'goblet-squat', reps: 10 }, { ex: 'developpe-epaules', reps: 8 }, { ex: 'planche', secs: 20 }],
    [{ ex: 'souleve-roumain', reps: 10 }, { ex: 'floor-press', reps: 8 }, { ex: 'superman', secs: 20 }],
    [{ ex: 'fentes-halteres', reps: 10 }, { ex: 'curl', reps: 10 }, { ex: 'mountain-climbers', secs: 20 }],
  ],
};

// Soir : ~15 minutes. Haut du corps, bas du corps, puis corps complet.
export const EVENING_CIRCUITS = {
  none: [
    { name: 'Haut du corps', steps: [{ ex: 'pompes-inclinees', reps: 8 }, { ex: 'superman', secs: 20 }, { ex: 'planche', secs: 20 }, { ex: 'pompes-genoux', reps: 6 }] },
    { name: 'Bas du corps', steps: [{ ex: 'squat', reps: 12 }, { ex: 'fentes', reps: 10 }, { ex: 'pont-fessier', reps: 12 }, { ex: 'chaise', secs: 25 }] },
    { name: 'Corps complet', steps: [{ ex: 'squat', reps: 10 }, { ex: 'pompes-inclinees', reps: 8 }, { ex: 'mountain-climbers', secs: 20 }, { ex: 'pont-fessier', reps: 10 }] },
  ],
  db: [
    { name: 'Haut du corps', steps: [{ ex: 'rowing', reps: 12 }, { ex: 'developpe-epaules', reps: 8 }, { ex: 'curl', reps: 10 }, { ex: 'floor-press', reps: 10 }] },
    { name: 'Bas du corps', steps: [{ ex: 'goblet-squat', reps: 12 }, { ex: 'fentes-halteres', reps: 10 }, { ex: 'souleve-roumain', reps: 10 }, { ex: 'chaise', secs: 25 }] },
    { name: 'Corps complet', steps: [{ ex: 'goblet-squat', reps: 10 }, { ex: 'rowing', reps: 10 }, { ex: 'developpe-epaules', reps: 8 }, { ex: 'mountain-climbers', secs: 20 }] },
  ],
};

export const WARMUP = [{ ex: 'jumping-jacks', secs: 30 }, { ex: 'rotations-bras', secs: 20 }, { ex: 'montees-genoux', secs: 20 }];
export const COOLDOWN = [{ ex: 'etirement-jambes', secs: 30 }, { ex: 'etirement-epaules', secs: 30 }];

// Le chemin vers la première traction. Chaque palier se débloque après
// PULL_SESSIONS_TO_LEVEL_UP séances du soir faites au palier précédent.
// Ces valeurs ne sont pas multipliées par le palier du joueur : c'est le chemin qui fait progresser.
export const PULL_SESSIONS_TO_LEVEL_UP = 4;
export const PULL_PATH = [
  { title: 'Bébé singe', emoji: '🐒', goal: 'Tenir suspendu à la barre', block: [{ ex: 'suspension', secs: 10 }, { rest: 45 }, { ex: 'suspension', secs: 10 }, { rest: 45 }, { ex: 'suspension', secs: 10 }] },
  { title: 'Singe costaud', emoji: '🦍', goal: 'Tenir plus longtemps et activer les épaules', block: [{ ex: 'suspension', secs: 20 }, { rest: 45 }, { ex: 'omoplates', reps: 5 }, { rest: 45 }, { ex: 'suspension', secs: 20 }] },
  { title: 'Descente contrôlée', emoji: '⬇️', goal: 'Apprendre à descendre lentement', block: [{ ex: 'omoplates', reps: 6 }, { rest: 45 }, { ex: 'negatives', reps: 2 }, { rest: 60 }, { ex: 'negatives', reps: 2 }, { rest: 60 }, { ex: 'negatives', reps: 2 }] },
  { title: 'Descente de pro', emoji: '🧗', goal: 'Des descentes plus longues et plus nombreuses', block: [{ ex: 'suspension', secs: 25 }, { rest: 45 }, { ex: 'negatives', reps: 3 }, { rest: 60 }, { ex: 'negatives', reps: 3 }, { rest: 60 }, { ex: 'negatives', reps: 3 }] },
  { title: 'Presque là', emoji: '🪜', goal: 'Tirer avec un peu d\'aide', block: [{ ex: 'traction-assistee', reps: 4 }, { rest: 60 }, { ex: 'traction-assistee', reps: 4 }, { rest: 60 }, { ex: 'negatives', reps: 3 }] },
  { title: 'Roi de la barre', emoji: '👑', goal: 'Faire ta première traction, puis plus !', block: [{ ex: 'traction', reps: 1 }, { rest: 90 }, { ex: 'traction-assistee', reps: 5 }, { rest: 60 }, { ex: 'negatives', reps: 3 }] },
];

// Récompenses
export const XP = { morning: 20, evening: 40, perStreakDay: 2, maxStreakBonus: 14 };
export const LEVEL_UP_GEMS = 20;
export const STREAK_MILESTONES = { 3: 15, 7: 50, 14: 75, 30: 150, 50: 200, 100: 500 };
export const MAX_FREEZES = 2;

export const CHESTS = {
  bronze: { name: 'Coffre en bronze', emoji: '🟫', gems: [5, 15], freezeChance: 0 },
  silver: { name: 'Coffre en argent', emoji: '⬜', gems: [10, 25], freezeChance: 0.05 },
  gold: { name: 'Coffre en or', emoji: '🟨', gems: [25, 50], freezeChance: 0.2 },
};

// Quêtes du jour. La première est toujours « faire une séance » pour qu'un matin suffise à progresser.
export const FIRST_QUEST = { id: 'one-session', label: 'Termine une séance', metric: 'sessions', target: 1, gems: 10 };
export const QUEST_POOL = [
  { id: 'morning', label: 'Fais la séance du matin', metric: 'morning', target: 1, gems: 15 },
  { id: 'evening', label: 'Fais la séance du soir', metric: 'evening', target: 1, gems: 15 },
  { id: 'two-sessions', label: 'Fais 2 séances aujourd\'hui', metric: 'sessions', target: 2, gems: 25 },
  { id: 'xp-40', label: 'Gagne 40 XP', metric: 'xp', target: 40, gems: 15 },
  { id: 'reps-40', label: 'Fais 40 répétitions', metric: 'reps', target: 40, gems: 15 },
  { id: 'reps-80', label: 'Fais 80 répétitions', metric: 'reps', target: 80, gems: 25 },
  { id: 'hang-30', label: 'Tiens 30 secondes à la barre au total', metric: 'hangSecs', target: 30, gems: 15 },
  { id: 'exercises-8', label: 'Termine 8 exercices', metric: 'exercises', target: 8, gems: 15 },
];

export const AVATARS = [
  { id: 'fox', emoji: '🦊', price: 0 },
  { id: 'cat', emoji: '🐱', price: 0 },
  { id: 'panda', emoji: '🐼', price: 0 },
  { id: 'frog', emoji: '🐸', price: 0 },
  { id: 'monkey', emoji: '🐵', price: 50 },
  { id: 'tiger', emoji: '🐯', price: 80 },
  { id: 'robot', emoji: '🤖', price: 100 },
  { id: 'ninja', emoji: '🥷', price: 150 },
  { id: 'dragon', emoji: '🐲', price: 200 },
  { id: 'unicorn', emoji: '🦄', price: 200 },
  { id: 'lion', emoji: '🦁', price: 300 },
  { id: 'trex', emoji: '🦖', price: 400 },
];

export const FREEZE_PRICE = 100;
