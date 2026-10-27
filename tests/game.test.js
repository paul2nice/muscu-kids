import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState, newProfile, buildSession, tallySteps, completeSession, reconcileStreak,
  questsFor, openChest, levelInfo, weekKey, addDays, leaderboard, buyFreeze, buyAvatar,
} from '../js/game.js';
import { PULL_PATH, PULL_SESSIONS_TO_LEVEL_UP } from '../js/data.js';

const DAY = '2026-10-27'; // un mardi

function setup() {
  const state = emptyState();
  const p = newProfile({ name: 'Léo' }, DAY);
  state.profiles[p.id] = p;
  state.activeProfileId = p.id;
  return { state, p };
}

function play(state, p, type, day) {
  const session = buildSession(type, p, day);
  return completeSession(state, p.id, session, tallySteps(session.steps), day);
}

test('la séance du matin est courte, celle du soir plus longue', () => {
  const { p } = setup();
  for (const eq of ['none', 'db']) {
    for (let i = 0; i < 3; i += 1) {
      const day = addDays(DAY, i);
      const m = buildSession('morning', p, day, eq);
      const e = buildSession('evening', p, day, eq);
      assert.ok(m.estSecs <= 7 * 60, `matin ${m.estSecs}s`);
      assert.ok(e.estSecs >= 12 * 60 && e.estSecs <= 22 * 60, `soir ${e.estSecs}s`);
      assert.equal(e.includesPull, true);
    }
  }
});

test('le matériel choisi change les exercices', () => {
  const { p } = setup();
  const ids = (eq) => buildSession('evening', p, DAY, eq).steps.filter((s) => s.ex).map((s) => s.ex);
  assert.ok(ids('db').some((id) => ['rowing', 'goblet-squat', 'curl', 'developpe-epaules', 'souleve-roumain', 'floor-press', 'fentes-halteres'].includes(id)));
  assert.ok(!ids('none').some((id) => ['rowing', 'goblet-squat', 'curl'].includes(id)));
});

test('une séance donne XP, streak, coffre et quête', () => {
  const { state, p } = setup();
  const s = play(state, p, 'morning', DAY);
  assert.equal(s.streak, 1);
  assert.equal(s.xp, 22);
  assert.equal(p.xp, 22);
  assert.ok(s.quests.some((q) => q.id === 'one-session'));
  assert.equal(s.chests[0].type, 'bronze');
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].week, '2026-10-26');
});

test('la streak ne monte qu\'une fois par jour et se perd après un jour manqué', () => {
  const { state, p } = setup();
  play(state, p, 'morning', DAY);
  play(state, p, 'evening', DAY);
  assert.equal(p.streak.count, 1);
  play(state, p, 'morning', addDays(DAY, 1));
  assert.equal(p.streak.count, 2);
  const r = reconcileStreak(p, addDays(DAY, 3));
  assert.equal(r.lost, 2);
  assert.equal(p.streak.count, 0);
  assert.equal(p.streak.best, 2);
});

test('un gel de streak protège un jour manqué', () => {
  const { state, p } = setup();
  play(state, p, 'morning', DAY);
  p.streak.freezes = 1;
  const r = reconcileStreak(p, addDays(DAY, 2));
  assert.equal(r.frozen, 1);
  assert.equal(p.streak.freezes, 0);
  play(state, p, 'morning', addDays(DAY, 2));
  assert.equal(p.streak.count, 2);
});

test('les paliers de streak donnent des gems', () => {
  const { state, p } = setup();
  let milestone;
  for (let i = 0; i < 3; i += 1) milestone = play(state, p, 'morning', addDays(DAY, i)).streakMilestone;
  assert.deepEqual(milestone, { days: 3, gems: 15 });
});

test('3 quêtes du jour, stables dans la journée, la première toujours faisable', () => {
  const { p } = setup();
  const a = questsFor(p, DAY);
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((q) => q.id)).size, 3);
  assert.equal(a[0].id, 'one-session');
  assert.deepEqual(questsFor(p, DAY).map((q) => q.id), a.map((q) => q.id));
});

test('les quêtes ne rapportent qu\'une fois et toutes finies donnent un coffre en or', () => {
  const { state, p } = setup();
  let gold = 0;
  for (let i = 0; i < 4; i += 1) {
    const type = i % 2 ? 'evening' : 'morning';
    const s = play(state, p, type, DAY);
    gold += s.chests.filter((c) => c.type === 'gold').length;
    for (const q of s.quests) assert.equal(p.daily[DAY].claimed.filter((id) => id === q.id).length, 1);
  }
  const allDone = questsFor(p, DAY).every((q) => q.done);
  assert.equal(gold, allDone ? 1 : 0);
});

test('ouvrir un coffre donne des gems dans la fourchette', () => {
  const { state, p } = setup();
  play(state, p, 'evening', DAY);
  const chest = p.chests.find((c) => c.type === 'silver');
  const gemsBefore = p.gems;
  const r = openChest(p, chest.id, () => 0.999);
  assert.equal(r.gems, 25);
  assert.equal(p.gems, gemsBefore + 25);
  assert.ok(!p.chests.includes(chest));
  assert.equal(openChest(p, chest.id), null);
});

test('le chemin de la traction avance après plusieurs séances du soir', () => {
  const { state, p } = setup();
  let up;
  for (let i = 0; i < PULL_SESSIONS_TO_LEVEL_UP; i += 1) up = play(state, p, 'evening', addDays(DAY, i)).pullLevelUp;
  assert.equal(p.pull.level, 1);
  assert.equal(up.title, PULL_PATH[1].title);
  p.pull.level = PULL_PATH.length - 1;
  play(state, p, 'evening', addDays(DAY, 10));
  assert.equal(p.pull.level, PULL_PATH.length - 1);
});

test('niveaux et dates', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(49).level, 1);
  assert.equal(levelInfo(50).level, 2);
  assert.deepEqual(levelInfo(160), { level: 3, into: 10, needed: 150 });
  assert.equal(weekKey('2026-11-01'), '2026-10-26'); // dimanche
  assert.equal(weekKey('2026-10-26'), '2026-10-26'); // lundi
});

test('classement de la semaine entre joueurs du même téléphone', () => {
  const { state, p } = setup();
  const sis = newProfile({ name: 'Emma', avatar: 'cat' }, DAY);
  state.profiles[sis.id] = sis;
  play(state, p, 'morning', DAY);
  play(state, sis, 'evening', DAY);
  play(state, p, 'morning', addDays(DAY, -7)); // semaine précédente
  const week = leaderboard(state, DAY, 'week');
  assert.deepEqual(week.map((r) => r.name), ['Emma', 'Léo']);
  assert.equal(week[1].xp, 22);
  const all = leaderboard(state, DAY, 'all');
  assert.equal(all.find((r) => r.name === 'Léo').xp, p.xp);
});

test('boutique', () => {
  const { p } = setup();
  assert.equal(buyFreeze(p), false);
  p.gems = 500;
  assert.equal(buyFreeze(p), true);
  assert.equal(buyFreeze(p), true);
  assert.equal(buyFreeze(p), false); // max 2
  assert.equal(buyAvatar(p, 'monkey'), true);
  assert.equal(p.avatar, 'monkey');
  assert.equal(buyAvatar(p, 'monkey'), false);
});
