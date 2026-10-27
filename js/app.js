// Interface : écrans, lecteur de séance, animations.

import { EXERCISES, PULL_PATH, PULL_SESSIONS_TO_LEVEL_UP, CHESTS, AVATARS, FREEZE_PRICE, MAX_FREEZES } from './data.js';
import {
  dateKey, addDays, newProfile, levelInfo, buildSession, tallySteps, reconcileStreak, streakDoneToday,
  questsFor, openChest, completeSession, buyFreeze, buyAvatar, leaderboard,
} from './game.js';
import { loadState, saveState, exportState, importState } from './store.js';

const app = document.getElementById('app');
let state = loadState();
let route = { name: 'home' };
let player = null; // séance en cours
let timer = null;
let wakeLock = null;
let pendingReward = null;

const today = () => dateKey();
const profile = () => state.profiles[state.activeProfileId];
const avatarEmoji = (id) => AVATARS.find((a) => a.id === id)?.emoji || '🙂';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const minutes = (secs) => Math.max(1, Math.round(secs / 60));

function persist() { saveState(state); }

function go(name, params = {}) {
  route = { name, ...params };
  render();
  window.scrollTo(0, 0);
}

// ---------- Rendu ----------

function render() {
  stopTimer();
  if (!profile()) {
    app.innerHTML = welcomeScreen();
    return;
  }
  const screens = { home: homeScreen, preview: previewScreen, workout: workoutScreen, reward: rewardScreen, chest: chestScreen, quests: questsScreen, path: pathScreen, ranking: rankingScreen, shop: shopScreen, profile: profileScreen, newProfile: welcomeScreen };
  app.innerHTML = (screens[route.name] || homeScreen)();
  if (route.name === 'workout') startStep();
}

function topBar() {
  const p = profile();
  const lvl = levelInfo(p.xp);
  const lit = streakDoneToday(p, today());
  return `
    <header class="topbar">
      <button class="chip" data-go="profile" aria-label="Profil">${avatarEmoji(p.avatar)}</button>
      <span class="chip ${lit ? 'fire' : 'dim'}" title="Streak">🔥 ${p.streak.count}</span>
      <span class="chip gem" title="Gems">💎 ${p.gems}</span>
      <span class="chip xp" title="Niveau">⚡ Niv. ${lvl.level}</span>
    </header>`;
}

function bottomNav(active) {
  const items = [['home', '🏠', 'Accueil'], ['quests', '🎯', 'Quêtes'], ['ranking', '🏆', 'Classement'], ['shop', '💎', 'Boutique'], ['profile', '👤', 'Profil']];
  return `<nav class="bottomnav">${items.map(([r, i, l]) => `<button data-go="${r}" class="${active === r ? 'active' : ''}"><span>${i}</span>${l}</button>`).join('')}</nav>`;
}

function welcomeScreen() {
  const first = !profile();
  return `
    <main class="screen welcome">
      ${first ? '<div class="hero">💪</div><h1>Muscu Kids</h1><p class="lead">Deviens plus fort chaque jour, gagne des gems et ouvre des coffres !</p>' : '<h1>Nouveau joueur</h1>'}
      <form id="profile-form" class="card">
        <label>Ton prénom<input name="name" maxlength="20" required autocomplete="off" placeholder="ex. Léo"></label>
        <fieldset><legend>Ton avatar</legend>
          <div class="avatar-grid">${AVATARS.filter((a) => a.price === 0).map((a, i) => `
            <label class="avatar-pick"><input type="radio" name="avatar" value="${a.id}" ${i === 0 ? 'checked' : ''}><span>${a.emoji}</span></label>`).join('')}
          </div>
        </fieldset>
        <fieldset><legend>Tu préfères t'entraîner…</legend>
          <div class="seg">
            <label><input type="radio" name="equipment" value="none" checked><span>🤸 Poids du corps</span></label>
            <label><input type="radio" name="equipment" value="db"><span>🏋️ Haltères</span></label>
          </div>
          <p class="hint">Tu pourras changer à chaque séance.</p>
        </fieldset>
        <button class="btn primary big" type="submit">C'est parti !</button>
        ${first ? '' : '<button class="btn ghost" type="button" data-go="profile">Annuler</button>'}
      </form>
    </main>`;
}

function weekStrip(p) {
  const days = new Set(state.sessions.filter((s) => s.profileId === p.id).map((s) => s.date));
  const t = today();
  const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  let html = '';
  for (let i = 6; i >= 0; i -= 1) {
    const d = addDays(t, -i);
    const wd = new Date(`${d}T12:00:00`).getDay();
    html += `<div class="day ${days.has(d) ? 'done' : ''} ${i === 0 ? 'today' : ''}"><span>${labels[wd]}</span><b>${days.has(d) ? '🔥' : ''}</b></div>`;
  }
  return `<div class="week">${html}</div>`;
}

function homeScreen() {
  const p = profile();
  const t = today();
  const stats = p.daily[t] || {};
  const lvl = levelInfo(p.xp);
  const quests = questsFor(p, t);
  const pull = PULL_PATH[p.pull.level];
  const hour = new Date().getHours();
  const suggested = hour < 12 ? 'morning' : 'evening';
  const sessionCard = (type) => {
    const s = buildSession(type, p, t);
    const done = stats[type] > 0;
    return `
      <button class="session-card ${type} ${type === suggested ? 'suggested' : ''}" data-preview="${type}">
        <div class="session-icon">${type === 'morning' ? '🌅' : '🌙'}</div>
        <div class="session-text">
          <strong>${s.title}</strong>
          <span>${s.subtitle}</span>
          <span class="meta">⏱️ ${minutes(s.estSecs)} min · ⚡ +${type === 'morning' ? 20 : 40} XP</span>
        </div>
        <div class="session-state">${done ? '✅' : '▶️'}</div>
      </button>`;
  };
  const streakMsg = streakDoneToday(p, t)
    ? 'Streak validée aujourd\'hui, bravo !'
    : p.streak.count > 0 ? 'Fais une séance aujourd\'hui pour garder ta flamme !' : 'Fais une séance pour allumer ta flamme !';

  return `
    ${topBar()}
    <main class="screen">
      <section class="card streak-card ${streakDoneToday(p, t) ? 'lit' : ''}">
        <div class="streak-big">🔥 <b>${p.streak.count}</b> <small>jour${p.streak.count > 1 ? 's' : ''}</small></div>
        <p>${streakMsg}${p.streak.freezes ? ` <span class="freeze">🧊 ×${p.streak.freezes}</span>` : ''}</p>
        ${weekStrip(p)}
      </section>

      ${p.chests.length ? `
      <section class="card chests">
        <h2>Coffres à ouvrir</h2>
        <div class="chest-row">${p.chests.map((c) => `<button class="chest-btn" data-chest="${c.id}">${chestSvg(c.type)}<span>${CHESTS[c.type].name.replace('Coffre en ', '')}</span></button>`).join('')}</div>
      </section>` : ''}

      <section class="sessions">
        ${sessionCard('morning')}
        ${sessionCard('evening')}
      </section>

      <section class="card level">
        <div class="row"><strong>Niveau ${lvl.level}</strong><span>${lvl.into} / ${lvl.needed} XP</span></div>
        <div class="bar"><i style="width:${(100 * lvl.into) / lvl.needed}%"></i></div>
      </section>

      <button class="card path-card" data-go="path">
        <div class="path-emoji">${pull.emoji}</div>
        <div>
          <h2>Objectif : 1re traction</h2>
          <p>Étape ${p.pull.level + 1}/${PULL_PATH.length} · ${pull.title}</p>
          <div class="bar small"><i style="width:${((p.pull.level * PULL_SESSIONS_TO_LEVEL_UP + p.pull.sessions) / ((PULL_PATH.length - 1) * PULL_SESSIONS_TO_LEVEL_UP)) * 100}%"></i></div>
        </div>
      </button>

      <section class="card quests-mini">
        <div class="row"><h2>Quêtes du jour</h2><button class="link" data-go="quests">Tout voir</button></div>
        ${quests.map((q) => questRow(q)).join('')}
      </section>
    </main>
    ${bottomNav('home')}`;
}

function questRow(q) {
  return `
    <div class="quest ${q.done ? 'done' : ''}">
      <div class="quest-label"><span>${q.done ? '✅' : '🎯'} ${q.label}</span><span class="quest-gems">💎 ${q.gems}</span></div>
      <div class="bar small"><i style="width:${(100 * q.progress) / q.target}%"></i></div>
      <div class="quest-count">${q.progress} / ${q.target}</div>
    </div>`;
}

function questsScreen() {
  const p = profile();
  const quests = questsFor(p, today());
  const allDone = quests.every((q) => q.done);
  return `
    ${topBar()}
    <main class="screen">
      <h1>Quêtes du jour</h1>
      <p class="lead">Finis les 3 quêtes pour gagner un <b>coffre en or</b> !</p>
      <section class="card">${quests.map(questRow).join('')}</section>
      <section class="card gold-goal ${allDone ? 'done' : ''}">
        ${chestSvg('gold')}
        <p>${allDone ? 'Coffre en or gagné aujourd\'hui ! 🎉' : `Encore ${quests.filter((q) => !q.done).length} quête(s) pour le coffre en or.`}</p>
      </section>
      <p class="hint center">De nouvelles quêtes arrivent chaque jour à minuit.</p>
    </main>
    ${bottomNav('quests')}`;
}

function pathScreen() {
  const p = profile();
  return `
    ${topBar()}
    <main class="screen">
      <button class="back" data-go="home">← Retour</button>
      <h1>Le chemin de la traction</h1>
      <p class="lead">Chaque séance du soir te fait avancer. ${PULL_SESSIONS_TO_LEVEL_UP} séances = étape suivante.</p>
      <ol class="path">
        ${PULL_PATH.map((step, i) => {
          const status = i < p.pull.level ? 'done' : i === p.pull.level ? 'current' : 'locked';
          return `
          <li class="path-step ${status}">
            <div class="node">${status === 'locked' ? '🔒' : step.emoji}</div>
            <div class="path-info">
              <strong>${i + 1}. ${step.title}</strong>
              <span>${step.goal}</span>
              ${status === 'current' && i < PULL_PATH.length - 1 ? `<span class="pips">${Array.from({ length: PULL_SESSIONS_TO_LEVEL_UP }, (_, k) => `<i class="${k < p.pull.sessions ? 'on' : ''}"></i>`).join('')}</span>` : ''}
            </div>
          </li>`;
        }).join('')}
      </ol>
      <section class="card tip">
        <strong>💡 Astuce</strong>
        <p>Le rowing avec haltère et les tractions négatives sont les meilleurs exercices pour réussir ta première traction. Utilise une chaise solide et demande à un adulte de vérifier qu'elle ne glisse pas.</p>
      </section>
    </main>
    ${bottomNav('home')}`;
}

function previewScreen() {
  const p = profile();
  const equipment = route.equipment || p.equipment;
  const s = buildSession(route.type, p, today(), equipment);
  const items = s.steps.filter((st) => !st.rest);
  return `
    <main class="screen">
      <button class="back" data-go="home">← Retour</button>
      <h1>${route.type === 'morning' ? '🌅' : '🌙'} ${s.title}</h1>
      <p class="lead">${s.subtitle} · environ ${minutes(s.estSecs)} min</p>
      <div class="seg">
        <label><input type="radio" name="eq" value="none" ${equipment === 'none' ? 'checked' : ''} data-equipment="none"><span>🤸 Poids du corps</span></label>
        <label><input type="radio" name="eq" value="db" ${equipment === 'db' ? 'checked' : ''} data-equipment="db"><span>🏋️ Haltères</span></label>
      </div>
      <ul class="ex-list card">
        ${items.map((st) => `<li><span class="ex-emoji">${EXERCISES[st.ex].emoji}</span><span>${EXERCISES[st.ex].name}</span><b>${st.reps ? `×${st.reps}` : `${st.secs}s`}</b></li>`).join('')}
      </ul>
      <p class="hint">Bois un peu d'eau. Si quelque chose fait mal (pas juste « dur »), arrête-toi.</p>
    </main>
    <div class="sticky-cta"><button class="btn primary big" data-start="${route.type}">Commencer</button></div>`;
}

// ---------- Lecteur de séance ----------

function startWorkout(type) {
  const p = profile();
  const equipment = route.equipment || p.equipment;
  const session = buildSession(type, p, today(), equipment);
  player = { session, index: 0, done: [], startedAt: Date.now(), remaining: null, running: false };
  requestWakeLock();
  go('workout');
}

function workoutScreen() {
  const { session, index } = player;
  const step = session.steps[index];
  const total = session.steps.length;
  const progress = `<div class="bar workout-bar"><i style="width:${(100 * index) / total}%"></i></div>`;
  const head = `<div class="workout-head"><button class="icon-btn" data-quit aria-label="Quitter">✕</button>${progress}</div>`;

  if (step.rest) {
    const next = session.steps.slice(index + 1).find((s) => !s.rest);
    return `
      <main class="screen workout rest">
        ${head}
        <p class="phase">${step.label ? esc(step.label) : 'Repos'}</p>
        <div class="countdown" id="count">${step.rest}</div>
        ${next ? `<p class="next">Ensuite : ${EXERCISES[next.ex].emoji} <b>${EXERCISES[next.ex].name}</b> ${next.reps ? `×${next.reps}` : `${next.secs}s`}</p>` : ''}
        <div class="sticky-cta"><button class="btn secondary big" data-next>Passer le repos</button></div>
      </main>`;
  }

  const ex = EXERCISES[step.ex];
  const n = session.steps.slice(0, index + 1).filter((s) => !s.rest).length;
  const count = session.steps.filter((s) => !s.rest).length;
  return `
    <main class="screen workout">
      ${head}
      <p class="phase">Exercice ${n} / ${count}</p>
      <div class="ex-emoji-big">${ex.emoji}</div>
      <h1>${ex.name}</h1>
      ${step.reps
        ? `<div class="target">×${step.reps}</div>`
        : `<div class="countdown" id="count">${step.secs}</div>`}
      <p class="tip-text">${ex.tip}</p>
      <div class="sticky-cta">
        ${step.reps
          ? '<button class="btn primary big" data-done>C\'est fait ✓</button>'
          : '<button class="btn primary big" data-go-timer id="timer-btn">Go !</button>'}
        <button class="btn ghost" data-skip>Trop dur, je passe</button>
      </div>
    </main>`;
}

function startStep() {
  const step = player.session.steps[player.index];
  if (step.rest) runCountdown(step.rest, () => nextStep(false));
}

function runCountdown(secs, onEnd) {
  stopTimer();
  let left = secs;
  const el = document.getElementById('count');
  const tick = () => {
    if (el) el.textContent = left;
    if (left <= 3 && left > 0) beep(600, 0.08);
    if (left <= 0) {
      stopTimer();
      beep(900, 0.25);
      navigator.vibrate?.(200);
      onEnd();
      return;
    }
    left -= 1;
  };
  tick();
  timer = setInterval(tick, 1000);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function nextStep(completedExercise) {
  const step = player.session.steps[player.index];
  if (completedExercise) player.done.push(step);
  player.index += 1;
  if (player.index >= player.session.steps.length) {
    finishWorkout();
    return;
  }
  render();
}

function finishWorkout() {
  stopTimer();
  releaseWakeLock();
  const { session, done, startedAt } = player;
  player = null;
  if (!done.length) { go('home'); return; }
  const results = { ...tallySteps(done), durationSecs: Math.round((Date.now() - startedAt) / 1000) };
  const summary = completeSession(state, state.activeProfileId, session, results, today());
  persist();
  pendingReward = { summary, results };
  go('reward');
  confetti();
}

function rewardScreen() {
  const { summary, results } = pendingReward;
  const p = profile();
  return `
    <main class="screen reward">
      <div class="hero bounce">🎉</div>
      <h1>Séance terminée !</h1>
      <div class="reward-grid">
        <div class="reward-tile xp"><span>⚡</span><b>+${summary.xp}</b><small>XP${summary.streakBonus ? ` (dont +${summary.streakBonus} streak)` : ''}</small></div>
        <div class="reward-tile fire"><span>🔥</span><b>${summary.streak}</b><small>jour${summary.streak > 1 ? 's' : ''} de streak</small></div>
        <div class="reward-tile gem"><span>💎</span><b>+${summary.gems}</b><small>gems</small></div>
        <div class="reward-tile"><span>⏱️</span><b>${minutes(results.durationSecs)}</b><small>min</small></div>
      </div>
      ${summary.levelUp ? `<div class="card banner level-up">⬆️ Niveau ${summary.levelUp.level} atteint ! +${summary.levelUp.gems} 💎</div>` : ''}
      ${summary.streakMilestone ? `<div class="card banner fire">🔥 ${summary.streakMilestone.days} jours d'affilée ! +${summary.streakMilestone.gems} 💎</div>` : ''}
      ${summary.pullLevelUp ? `<div class="card banner pull">${summary.pullLevelUp.emoji} Nouvelle étape débloquée : <b>${summary.pullLevelUp.title}</b></div>` : ''}
      ${summary.quests.map((q) => `<div class="card banner quest">✅ Quête : ${q.label} +${q.gems} 💎</div>`).join('')}
      ${summary.chests.length ? `<p class="lead center">Tu as gagné ${summary.chests.length > 1 ? 'des coffres' : 'un coffre'} !</p>
        <div class="chest-row center">${summary.chests.map((c) => `<button class="chest-btn wiggle" data-chest="${c.id}">${chestSvg(c.type)}</button>`).join('')}</div>` : ''}
      <div class="sticky-cta">
        ${p.chests.length ? `<button class="btn primary big" data-chest="${p.chests[0].id}">Ouvrir ${p.chests.length > 1 ? 'les coffres' : 'le coffre'}</button>` : ''}
        <button class="btn ${p.chests.length ? 'ghost' : 'primary big'}" data-go="home">Continuer</button>
      </div>
    </main>`;
}

// ---------- Coffres ----------

function chestSvg(type) {
  const colors = { bronze: ['#c97b3c', '#8f4f1d'], silver: ['#cfd8e3', '#8996a6'], gold: ['#ffd23f', '#d49b00'] }[type];
  return `
    <svg class="chest-svg ${type}" viewBox="0 0 64 56" aria-label="${CHESTS[type].name}">
      <rect x="6" y="24" width="52" height="28" rx="5" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="3"/>
      <path class="lid" d="M6 26 V18 a12 12 0 0 1 12 -12 h28 a12 12 0 0 1 12 12 V26 Z" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="3"/>
      <rect x="27" y="20" width="10" height="13" rx="2" fill="#3c3c3c"/>
      <circle cx="32" cy="27" r="2" fill="${colors[0]}"/>
    </svg>`;
}

function chestScreen() {
  const p = profile();
  const chest = p.chests.find((c) => c.id === route.id);
  if (!chest && !route.result) return homeScreen();
  if (route.result) {
    const r = route.result;
    const more = p.chests[0];
    return `
      <main class="screen chest-open">
        <div class="chest-stage opened">${chestSvg(r.type)}</div>
        <div class="loot pop">💎 <b>+${r.gems}</b></div>
        ${r.freeze ? '<div class="loot pop">🧊 Gel de streak !</div>' : ''}
        <p class="lead center">Tu as maintenant ${p.gems} gems.</p>
        <div class="sticky-cta">
          ${more ? `<button class="btn primary big" data-chest="${more.id}">Coffre suivant (${p.chests.length})</button>` : ''}
          <button class="btn ${more ? 'ghost' : 'primary big'}" data-go="home">Super !</button>
        </div>
      </main>`;
  }
  return `
    <main class="screen chest-open">
      <h1>${CHESTS[chest.type].name}</h1>
      <button class="chest-stage" data-tap-chest data-taps="0">${chestSvg(chest.type)}</button>
      <p class="lead center" id="chest-hint">Touche le coffre 3 fois pour l'ouvrir !</p>
    </main>`;
}

function tapChest(btn) {
  const taps = Number(btn.dataset.taps) + 1;
  btn.dataset.taps = taps;
  btn.classList.remove('shake');
  void btn.offsetWidth; // relance l'animation
  btn.classList.add('shake');
  beep(300 + taps * 150, 0.1);
  navigator.vibrate?.(40);
  const hint = document.getElementById('chest-hint');
  if (taps < 3) {
    hint.textContent = taps === 1 ? 'Encore 2 fois…' : 'Encore une fois !';
    return;
  }
  const result = openChest(profile(), route.id);
  persist();
  beep(1200, 0.3);
  confetti();
  go('chest', { result });
}

// ---------- Classement ----------

function rankingScreen() {
  const scope = route.scope || 'week';
  const rows = leaderboard(state, today(), scope);
  const medals = ['🥇', '🥈', '🥉'];
  return `
    ${topBar()}
    <main class="screen">
      <h1>Classement</h1>
      <div class="seg">
        <label><input type="radio" name="scope" ${scope === 'week' ? 'checked' : ''} data-scope="week"><span>Cette semaine</span></label>
        <label><input type="radio" name="scope" ${scope === 'all' ? 'checked' : ''} data-scope="all"><span>Depuis le début</span></label>
      </div>
      <ol class="ranking card">
        ${rows.map((r, i) => `
          <li class="${r.id === state.activeProfileId ? 'me' : ''}">
            <span class="rank">${medals[i] || i + 1}</span>
            <span class="rank-avatar">${avatarEmoji(r.avatar)}</span>
            <span class="rank-name">${esc(r.name)}</span>
            <span class="rank-streak">🔥 ${r.streak}</span>
            <b class="rank-xp">${r.xp} XP</b>
          </li>`).join('')}
      </ol>
      ${rows.length < 2 ? '<section class="card tip"><strong>👥 Défie quelqu\'un !</strong><p>Ajoute ta sœur ou un copain dans Profil → « Ajouter un joueur » pour vous affronter sur ce téléphone.</p></section>' : ''}
      <p class="hint center">Le classement de la semaine repart à zéro chaque lundi. Bientôt : affronter tes copains sur leur propre téléphone.</p>
    </main>
    ${bottomNav('ranking')}`;
}

// ---------- Boutique ----------

function shopScreen() {
  const p = profile();
  const canFreeze = p.gems >= FREEZE_PRICE && p.streak.freezes < MAX_FREEZES;
  return `
    ${topBar()}
    <main class="screen">
      <h1>Boutique</h1>
      <section class="card shop-item">
        <div class="shop-icon">🧊</div>
        <div><strong>Gel de streak</strong><p>Protège ta flamme si tu rates un jour. (${p.streak.freezes}/${MAX_FREEZES})</p></div>
        <button class="btn ${canFreeze ? 'primary' : 'disabled'}" data-buy-freeze ${canFreeze ? '' : 'disabled'}>💎 ${FREEZE_PRICE}</button>
      </section>
      <h2>Avatars</h2>
      <div class="avatar-shop">
        ${AVATARS.map((a) => {
          const owned = p.ownedAvatars.includes(a.id);
          const current = p.avatar === a.id;
          return `<button class="avatar-item ${current ? 'current' : ''} ${owned ? 'owned' : ''}" data-avatar="${a.id}" ${!owned && p.gems < a.price ? 'disabled' : ''}>
            <span>${a.emoji}</span><small>${current ? 'Équipé' : owned ? 'Choisir' : `💎 ${a.price}`}</small></button>`;
        }).join('')}
      </div>
    </main>
    ${bottomNav('shop')}`;
}

// ---------- Profil ----------

function profileScreen() {
  const p = profile();
  const others = Object.values(state.profiles).filter((x) => x.id !== p.id);
  const mySessions = state.sessions.filter((s) => s.profileId === p.id);
  const reps = mySessions.reduce((t, s) => t + (s.reps || 0), 0);
  return `
    ${topBar()}
    <main class="screen">
      <div class="profile-head"><span class="avatar-big">${avatarEmoji(p.avatar)}</span><h1>${esc(p.name)}</h1></div>
      <div class="reward-grid">
        <div class="reward-tile"><span>🏋️</span><b>${mySessions.length}</b><small>séances</small></div>
        <div class="reward-tile"><span>🔁</span><b>${reps}</b><small>répétitions</small></div>
        <div class="reward-tile fire"><span>🔥</span><b>${p.streak.best}</b><small>meilleure streak</small></div>
        <div class="reward-tile xp"><span>⚡</span><b>${p.xp}</b><small>XP total</small></div>
      </div>
      <section class="card">
        <h2>Matériel préféré</h2>
        <div class="seg">
          <label><input type="radio" name="pref" ${p.equipment === 'none' ? 'checked' : ''} data-pref="none"><span>🤸 Poids du corps</span></label>
          <label><input type="radio" name="pref" ${p.equipment === 'db' ? 'checked' : ''} data-pref="db"><span>🏋️ Haltères</span></label>
        </div>
      </section>
      <section class="card">
        <h2>Joueurs sur ce téléphone</h2>
        ${others.map((o) => `<button class="player-row" data-switch="${o.id}"><span>${avatarEmoji(o.avatar)}</span>${esc(o.name)}<small>Changer →</small></button>`).join('') || '<p class="hint">Personne d\'autre pour l\'instant.</p>'}
        <button class="btn secondary" data-go="newProfile">➕ Ajouter un joueur</button>
      </section>
      <details class="card">
        <summary><h2>Pour les parents</h2></summary>
        <p>Le programme est pensé pour un enfant de 10-14 ans : mouvements au poids du corps ou avec des haltères légers (1 à 2,5 kg par disque), séance courte le matin (≈5 min) et plus complète le soir (≈15 min). Les répétitions augmentent doucement avec le niveau. Le « chemin de la traction » suit une progression classique : suspension, omoplates, négatives, tractions assistées.</p>
        <p>Vérifiez que la barre est bien fixée et que la chaise utilisée pour les négatives est stable. La technique compte plus que le nombre de répétitions. En cas de douleur articulaire, on arrête et on en parle à un médecin.</p>
        <p>Les données restent sur ce téléphone. Pensez à faire une sauvegarde de temps en temps.</p>
        <div class="row-btns">
          <button class="btn secondary" data-export>💾 Sauvegarder</button>
          <label class="btn secondary">📂 Restaurer<input type="file" accept="application/json" data-import hidden></label>
        </div>
      </details>
    </main>
    ${bottomNav('profile')}`;
}

// ---------- Événements ----------

app.addEventListener('submit', (e) => {
  if (e.target.id !== 'profile-form') return;
  e.preventDefault();
  const data = new FormData(e.target);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const p = newProfile({ name, avatar: data.get('avatar'), equipment: data.get('equipment') }, today());
  state.profiles[p.id] = p;
  state.activeProfileId = p.id;
  persist();
  go('home');
});

app.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-equipment], [data-scope], [data-pref]');
  if (!t) return;
  const d = t.dataset;
  if (d.go) return go(d.go);
  if (d.preview) return go('preview', { type: d.preview });
  if (d.equipment) return go('preview', { type: route.type, equipment: d.equipment });
  if (d.start) return startWorkout(d.start);
  if (d.chest) return go('chest', { id: d.chest });
  if ('tapChest' in d) return tapChest(t);
  if ('done' in d) return nextStep(true);
  if ('next' in d) return nextStep(false);
  if ('skip' in d) return nextStep(false);
  if ('goTimer' in d) {
    t.disabled = true;
    t.textContent = 'Tiens bon !';
    const step = player.session.steps[player.index];
    return runCountdown(step.secs, () => nextStep(true));
  }
  if ('quit' in d) return quitWorkout();
  if (d.scope) return go('ranking', { scope: d.scope });
  if (d.pref) { profile().equipment = d.pref; persist(); return render(); }
  if (d.switch) { state.activeProfileId = d.switch; reconcileStreak(profile(), today()); persist(); return go('home'); }
  if ('buyFreeze' in d) { if (buyFreeze(profile())) { persist(); beep(1000, 0.15); } return render(); }
  if (d.avatar) {
    const p = profile();
    if (p.ownedAvatars.includes(d.avatar)) p.avatar = d.avatar;
    else if (buyAvatar(p, d.avatar)) confetti();
    persist();
    return render();
  }
  if ('export' in d) return downloadBackup();
});

app.addEventListener('change', async (e) => {
  if (!('import' in e.target.dataset)) return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    state = importState(await file.text());
    persist();
    go('home');
  } catch (err) {
    alertSheet(err.message);
  }
});

function quitWorkout() {
  stopTimer();
  const sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop';
  sheet.innerHTML = `
    <div class="sheet">
      <h2>Arrêter la séance ?</h2>
      <p>Si tu arrêtes maintenant, tu ne gagnes pas l'XP de cette séance.</p>
      <button class="btn primary big" data-resume>Continuer la séance</button>
      <button class="btn danger" data-abandon>Arrêter</button>
    </div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-resume]')) { sheet.remove(); render(); }
    if (ev.target.closest('[data-abandon]')) { sheet.remove(); player = null; releaseWakeLock(); go('home'); }
  });
}

function alertSheet(message) {
  const sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop';
  sheet.innerHTML = `<div class="sheet"><p>${esc(message)}</p><button class="btn primary">OK</button></div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', (ev) => { if (ev.target.closest('button')) sheet.remove(); });
}

function downloadBackup() {
  const blob = new Blob([exportState(state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `muscu-kids-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Effets ----------

let audio;
function beep(freq, dur) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  } catch { /* pas de son, tant pis */ }
}

function confetti() {
  const box = document.createElement('div');
  box.className = 'confetti';
  const bits = ['🎉', '⭐', '💎', '🔥', '✨', '💪'];
  for (let i = 0; i < 24; i += 1) {
    const s = document.createElement('span');
    s.textContent = bits[i % bits.length];
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 0.5}s`;
    s.style.fontSize = `${18 + Math.random() * 18}px`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2500);
}

async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { wakeLock = null; }
}

function releaseWakeLock() {
  wakeLock?.release?.();
  wakeLock = null;
}

// ---------- Démarrage ----------

for (const p of Object.values(state.profiles)) reconcileStreak(p, today());
persist();
render();

// Quand l'appli revient au premier plan un autre jour, on rafraîchit l'accueil.
let lastDay = today();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (player && (!wakeLock || wakeLock.released)) requestWakeLock();
  if (today() !== lastDay) {
    lastDay = today();
    for (const p of Object.values(state.profiles)) reconcileStreak(p, today());
    persist();
    if (!player) render();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
