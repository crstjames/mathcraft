// Save system: all players live in localStorage under a single versioned key.
window.BQ = window.BQ || {};

BQ.Storage = (() => {
  const SAVE_KEY = 'blockquest.saves.v1';
  const SETTINGS_KEY = 'blockquest.settings.v1';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Could not save', e);
      return false;
    }
  }

  function readSaves() {
    const data = read(SAVE_KEY, null);
    return data && Array.isArray(data.players) ? data : { version: 1, players: [] };
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Fill in fields added after a save was first created.
  function normalize(p) {
    p.recipes = p.recipes || [];
    // Grant Recipe Book pages for stations cleared before the book existed.
    for (const [levelId, st] of Object.entries(p.levels)) {
      const level = BQ.Levels && BQ.Levels[levelId];
      if (!level) continue;
      for (const s of level.stations) {
        const id = `${levelId}/${s.id}`;
        if (s.page && (st.completed || st.stationsDone.includes(s.id)) && !p.recipes.includes(id)) p.recipes.push(id);
      }
    }
    return p;
  }

  function listPlayers() {
    return readSaves().players.map(normalize).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function getPlayer(id) {
    const p = readSaves().players.find(p => p.id === id);
    return p ? normalize(p) : null;
  }

  function createPlayer({ name, look }) {
    const now = Date.now();
    const player = {
      id: uid(),
      name,
      look,
      createdAt: now,
      updatedAt: now,
      emeralds: 0,
      xp: 0,
      stats: { correct: 0, wrong: 0 },
      levels: {},
      recipes: [], // Recipe Book page ids the player has unlocked
    };
    const data = readSaves();
    data.players.push(player);
    write(SAVE_KEY, data);
    return player;
  }

  function savePlayer(player) {
    player.updatedAt = Date.now();
    const data = readSaves();
    const i = data.players.findIndex(p => p.id === player.id);
    if (i >= 0) data.players[i] = player;
    else data.players.push(player);
    return write(SAVE_KEY, data);
  }

  function deletePlayer(id) {
    const data = readSaves();
    data.players = data.players.filter(p => p.id !== id);
    write(SAVE_KEY, data);
  }

  // Per-level progress, created on first access.
  function levelState(player, levelId) {
    if (!player.levels[levelId]) {
      player.levels[levelId] = { completed: false, bestStars: 0, plays: 0, stationsDone: [], mistakes: 0 };
    }
    return player.levels[levelId];
  }

  function getSettings() {
    return Object.assign({ muted: false }, read(SETTINGS_KEY, {}));
  }

  function saveSettings(settings) {
    write(SETTINGS_KEY, settings);
  }

  return { listPlayers, getPlayer, createPlayer, savePlayer, deletePlayer, levelState, getSettings, saveSettings };
})();
