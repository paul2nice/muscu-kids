// Logique de jeu pure (pas de DOM) : séances, XP, streak, quêtes, coffres, classement.
// Les fonctions reçoivent la date du jour et le hasard en paramètre pour être testables.

import {
  EXERCISES, HANG_EXERCISES, MORNING_CIRCUITS, EVENING_CIRCUITS, WARMUP, COOLDOWN,
  PULL_PATH, PULL_SESSIONS_TO_LEVEL_UP, XP, LEVEL_UP_GEMS, STREAK_MILESTONES, MAX_FREEZES,
  CHESTS, FIRST_QUEST, QUEST_POOL, AVATARS, FREEZE_PRICE,
} from './data.js';

// ---------- Dates (clés locales AAAA-MM-JJ) ----------

export function dateKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toUtc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(a, b) {
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

export function addDays(key, n) {
  const d = new Date(toUtc(key) + n * 86400000);
  return d.toISOString().slice(0, 10);
}

// Lundi de la semaine de `key` : sert de clé pour le classement de la semaine.
export function weekKey(key) {
  const day = new Date(toUtc(key)).getUTCDay(); // 0 = dimanche
  return addDays(key, -((day + 6) % 7));
}

function dayNumber(key) {
  return Math.floor(toUtc(key) / 86400000);
}

// ---------- Profils ----------

let idCounter = 0;
export function makeId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${idCounter}`;
}

export function newProfile({ name, avatar = 'fox', equipment = 'none' }, today) {
  return {
    id: makeId('p'),
    name: name.trim(),
    avatar,
    equipment,
    createdAt: today,
    xp: 0,
    gems: 0,
    streak: { count: 0, best: 0, lastDate: null, freezes: 0 },
    pull: { level: 0, sessions: 0 },
    ownedAvatars: AVATARS.filter((a) => a.price === 0).map((a) => a.id),
    daily: {},
    chests: [],
  };
}

export function emptyState() {
  return { version: 1, activeProfileId: null, profiles: {}, sessions: [] };
}

// ---------- Niveaux ----------

// XP cumulée pour atteindre le niveau L : 0, 50, 150, 300, 500, 750…
export function xpForLevel(level) {
  return 25 * level * (level - 1);
}

export function levelInfo(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - start, needed: next - start };
}

// Le palier fait doucement monter les répétitions : niveaux 1-4, 5-8, 9+.
export function tierFor(level) {
  return Math.min(3, 1 + Math.floor((level - 1) / 4));
}

const TIER_FACTOR = [1, 1.25, 1.5];

export function scaleStep(step, tier) {
  if (step.rest) return step;
  const f = TIER_FACTOR[tier - 1];
  if (step.reps) return { ...step, reps: Math.round(step.reps * f) };
  return { ...step, secs: Math.round((step.secs * f) / 5) * 5 };
}

// ---------- Séances ----------

function withRests(steps, rest) {
  const out = [];
  steps.forEach((s, i) => {
    if (i > 0) out.push({ rest });
    out.push(s);
  });
  return out;
}

export function estimateSecs(steps) {
  return steps.reduce((t, s) => {
    if (s.rest) return t + s.rest;
    return t + 8 + (s.secs || s.reps * 3);
  }, 0);
}

export function buildSession(type, profile, today, equipment = profile.equipment) {
  const tier = tierFor(levelInfo(profile.xp).level);
  const day = dayNumber(today);
  const scale = (list) => list.map((s) => scaleStep(s, tier));

  if (type === 'morning') {
    const variants = MORNING_CIRCUITS[equipment];
    const circuit = variants[day % variants.length];
    const steps = [
      { ex: 'jumping-jacks', secs: 30 },
      { rest: 15 },
      ...withRests(scale(circuit), 20),
      { rest: 20 },
      { ex: 'suspension', secs: PULL_PATH[profile.pull.level].block[0].secs || 10 },
    ];
    return {
      type, equipment, steps, includesPull: false,
      title: 'Réveil express',
      subtitle: 'Court et efficace avant l\'école',
      estSecs: estimateSecs(steps),
    };
  }

  const variants = EVENING_CIRCUITS[equipment];
  const circuit = variants[day % variants.length];
  const pull = PULL_PATH[profile.pull.level];
  const rounds = [...scale(circuit.steps), ...scale(circuit.steps)];
  const steps = [
    ...withRests(WARMUP, 10),
    { rest: 30, label: 'Place-toi sous la barre' },
    ...pull.block,
    { rest: 60, label: `Circuit : ${circuit.name}` },
    ...withRests(rounds, 30),
    { rest: 20, label: 'Retour au calme' },
    ...withRests(COOLDOWN, 5),
  ];
  return {
    type, equipment, steps, includesPull: true,
    title: 'Séance du soir',
    subtitle: `${pull.emoji} Barre + ${circuit.name.toLowerCase()}`,
    estSecs: estimateSecs(steps),
  };
}

// Totaux d'une séance terminée, à partir des étapes réellement faites.
export function tallySteps(steps) {
  const r = { reps: 0, hangSecs: 0, exercises: 0 };
  for (const s of steps) {
    if (s.rest) continue;
    r.exercises += 1;
    if (s.reps) r.reps += s.reps;
    if (s.secs && HANG_EXERCISES.includes(s.ex)) r.hangSecs += s.secs;
  }
  return r;
}

// ---------- Streak ----------

// À appeler à l'ouverture de l'appli : consomme des gels pour les jours manqués,
// ou remet la streak à zéro.
export function reconcileStreak(profile, today) {
  const st = profile.streak;
  if (!st.lastDate || st.count === 0) return { lost: 0, frozen: 0 };
  const missed = daysBetween(st.lastDate, today) - 1;
  if (missed <= 0) return { lost: 0, frozen: 0 };
  if (st.freezes >= missed) {
    st.freezes -= missed;
    st.lastDate = addDays(today, -1);
    return { lost: 0, frozen: missed };
  }
  const lost = st.count;
  st.count = 0;
  return { lost, frozen: 0 };
}

export function streakDoneToday(profile, today) {
  return profile.streak.lastDate === today;
}

// ---------- Quêtes du jour ----------

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dayStats(profile, today) {
  if (!profile.daily[today]) {
    profile.daily[today] = { sessions: 0, morning: 0, evening: 0, xp: 0, reps: 0, hangSecs: 0, exercises: 0, claimed: [], goldGiven: false };
  }
  return profile.daily[today];
}

export function questsFor(profile, today) {
  const pool = [...QUEST_POOL];
  let h = hash(`${profile.id}:${today}`);
  const picked = [FIRST_QUEST];
  while (picked.length < 3) {
    const i = h % pool.length;
    picked.push(pool.splice(i, 1)[0]);
    h = Math.floor(h / 7) + 17;
  }
  const stats = profile.daily[today] || {};
  return picked.map((q) => {
    const progress = Math.min(q.target, stats[q.metric] || 0);
    return { ...q, progress, done: progress >= q.target, claimed: (stats.claimed || []).includes(q.id) };
  });
}

// ---------- Coffres ----------

function addChest(profile, type, today) {
  const chest = { id: makeId('c'), type, earnedAt: today };
  profile.chests.push(chest);
  return chest;
}

export function openChest(profile, chestId, rng = Math.random) {
  const idx = profile.chests.findIndex((c) => c.id === chestId);
  if (idx === -1) return null;
  const [chest] = profile.chests.splice(idx, 1);
  const def = CHESTS[chest.type];
  const [min, max] = def.gems;
  const gems = min + Math.floor(rng() * (max - min + 1));
  profile.gems += gems;
  let freeze = false;
  if (rng() < def.freezeChance && profile.streak.freezes < MAX_FREEZES) {
    profile.streak.freezes += 1;
    freeze = true;
  }
  return { type: chest.type, gems, freeze };
}

// ---------- Fin de séance ----------

export function completeSession(state, profileId, session, results, today, nowIso = new Date().toISOString()) {
  const profile = state.profiles[profileId];
  reconcileStreak(profile, today);

  const summary = { gems: 0, chests: [], quests: [], levelUp: null, streakMilestone: null, pullLevelUp: null };

  // Streak
  const st = profile.streak;
  const firstToday = st.lastDate !== today;
  if (firstToday) {
    st.count += 1;
    st.lastDate = today;
    st.best = Math.max(st.best, st.count);
    if (STREAK_MILESTONES[st.count]) {
      summary.streakMilestone = { days: st.count, gems: STREAK_MILESTONES[st.count] };
      profile.gems += STREAK_MILESTONES[st.count];
      summary.gems += STREAK_MILESTONES[st.count];
    }
  }
  summary.streak = st.count;
  summary.streakExtended = firstToday;

  // XP
  const streakBonus = Math.min(XP.maxStreakBonus, st.count * XP.perStreakDay);
  const xp = XP[session.type] + streakBonus;
  const before = levelInfo(profile.xp).level;
  profile.xp += xp;
  const after = levelInfo(profile.xp).level;
  summary.xp = xp;
  summary.streakBonus = streakBonus;
  if (after > before) {
    const gems = LEVEL_UP_GEMS * (after - before);
    profile.gems += gems;
    summary.gems += gems;
    summary.levelUp = { level: after, gems };
  }

  // Stats du jour et quêtes
  const day = dayStats(profile, today);
  day.sessions += 1;
  day[session.type] += 1;
  day.xp += xp;
  day.reps += results.reps;
  day.hangSecs += results.hangSecs;
  day.exercises += results.exercises;
  for (const q of questsFor(profile, today)) {
    if (q.done && !q.claimed) {
      day.claimed.push(q.id);
      profile.gems += q.gems;
      summary.gems += q.gems;
      summary.quests.push(q);
    }
  }

  // Coffres
  summary.chests.push(addChest(profile, session.type === 'evening' ? 'silver' : 'bronze', today));
  if (!day.goldGiven && questsFor(profile, today).every((q) => q.done)) {
    day.goldGiven = true;
    summary.chests.push(addChest(profile, 'gold', today));
  }

  // Chemin vers la traction
  if (session.includesPull && profile.pull.level < PULL_PATH.length - 1) {
    profile.pull.sessions += 1;
    if (profile.pull.sessions >= PULL_SESSIONS_TO_LEVEL_UP) {
      profile.pull.level += 1;
      profile.pull.sessions = 0;
      summary.pullLevelUp = PULL_PATH[profile.pull.level];
    }
  }

  // Journal des séances : c'est ce qui sera synchronisé plus tard pour le classement en ligne.
  state.sessions.push({
    id: makeId('s'),
    profileId,
    date: today,
    week: weekKey(today),
    type: session.type,
    equipment: session.equipment,
    xp,
    reps: results.reps,
    durationSecs: results.durationSecs || 0,
    at: nowIso,
  });

  pruneDaily(profile, today);
  return summary;
}

function pruneDaily(profile, today) {
  for (const key of Object.keys(profile.daily)) {
    if (daysBetween(key, today) > 14) delete profile.daily[key];
  }
}

// ---------- Boutique ----------

export function buyFreeze(profile) {
  if (profile.gems < FREEZE_PRICE || profile.streak.freezes >= MAX_FREEZES) return false;
  profile.gems -= FREEZE_PRICE;
  profile.streak.freezes += 1;
  return true;
}

export function buyAvatar(profile, avatarId) {
  const a = AVATARS.find((x) => x.id === avatarId);
  if (!a || profile.ownedAvatars.includes(a.id) || profile.gems < a.price) return false;
  profile.gems -= a.price;
  profile.ownedAvatars.push(a.id);
  profile.avatar = a.id;
  return true;
}

// ---------- Classement ----------

export function leaderboard(state, today, scope = 'week') {
  const week = weekKey(today);
  return Object.values(state.profiles)
    .map((p) => {
      const xp = scope === 'week'
        ? state.sessions.filter((s) => s.profileId === p.id && s.week === week).reduce((t, s) => t + s.xp, 0)
        : p.xp;
      const alive = p.streak.lastDate && daysBetween(p.streak.lastDate, today) <= 1;
      return { id: p.id, name: p.name, avatar: p.avatar, xp, streak: alive ? p.streak.count : 0 };
    })
    .sort((a, b) => b.xp - a.xp || b.streak - a.streak);
}

export function exerciseName(id) {
  return EXERCISES[id]?.name || id;
}
