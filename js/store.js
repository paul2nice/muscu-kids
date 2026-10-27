// Sauvegarde locale. Toutes les données restent sur le téléphone pour l'instant ;
// le journal `sessions` est prévu pour être synchronisé avec un serveur de classement plus tard.

import { emptyState } from './game.js';

const KEY = 'muscu-kids:v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const state = JSON.parse(raw);
    if (state.version !== 1) return emptyState();
    return state;
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Stockage plein ou bloqué : l'appli continue, sans sauvegarde.
  }
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(text) {
  const state = JSON.parse(text);
  if (state.version !== 1 || typeof state.profiles !== 'object' || !Array.isArray(state.sessions)) {
    throw new Error('Fichier de sauvegarde invalide');
  }
  return state;
}
