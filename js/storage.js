// storage.js — LocalStorage data persistence layer
'use strict';

const Storage = (() => {
  const PREFIX = 'piano_adventure_';

  // ─── Low-level helpers ──────────────────────────────────
  function _get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Storage read error', key, e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write error', key, e);
    }
  }

  function _remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  // ─── Date helpers ───────────────────────────────────────
  function todayStr() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  function weekStartStr(dateStr) {
    const d = new Date(dateStr || todayStr());
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day); // back to Sunday
    return d.toISOString().slice(0, 10);
  }

  // ─── Player Profile ─────────────────────────────────────
  const DEFAULT_PROFILE = {
    name: '小音乐家',
    createdAt: null,
    totalPracticeMinutes: 0,
    totalSessions: 0,
  };

  function getProfile() {
    return _get('player_profile') || { ...DEFAULT_PROFILE, createdAt: todayStr() };
  }

  function saveProfile(profile) {
    _set('player_profile', profile);
  }

  // ─── Progress (worlds & levels) ─────────────────────────
  // { currentWorld: 0, levels: { "0-0": {stars:3, completed:true}, ... } }
  const DEFAULT_PROGRESS = {
    currentWorld: 0,
    levels: {},
  };

  function getProgress() {
    return _get('progress') || { ...DEFAULT_PROGRESS };
  }

  function saveProgress(progress) {
    _set('progress', progress);
  }

  function getLevelResult(worldIdx, levelIdx) {
    const p = getProgress();
    return p.levels[`${worldIdx}-${levelIdx}`] || null;
  }

  function saveLevelResult(worldIdx, levelIdx, stars) {
    const p = getProgress();
    const key = `${worldIdx}-${levelIdx}`;
    const existing = p.levels[key];
    if (!existing || stars > existing.stars) {
      p.levels[key] = { stars, completed: true };
    }
    saveProgress(p);
  }

  // ─── Coins ──────────────────────────────────────────────
  function getCoins() {
    return _get('coins') || 0;
  }

  function addCoins(amount) {
    const c = getCoins() + amount;
    _set('coins', c);
    return c;
  }

  function spendCoins(amount) {
    const c = getCoins();
    if (c < amount) return false;
    _set('coins', c - amount);
    return true;
  }

  // ─── Streaks ────────────────────────────────────────────
  // { current: 5, longest: 12, lastPracticeDate: "2026-02-28" }
  const DEFAULT_STREAKS = { current: 0, longest: 0, lastPracticeDate: null };

  function getStreaks() {
    return _get('streaks') || { ...DEFAULT_STREAKS };
  }

  function recordPracticeDay() {
    const s = getStreaks();
    const today = todayStr();
    if (s.lastPracticeDate === today) return s; // already recorded

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    if (s.lastPracticeDate === yStr) {
      s.current += 1;
    } else {
      s.current = 1;
    }
    s.lastPracticeDate = today;
    if (s.current > s.longest) s.longest = s.current;
    _set('streaks', s);
    return s;
  }

  // ─── Achievements ───────────────────────────────────────
  // { "first_note": { unlockedAt: "...", seen: true }, ... }
  function getAchievements() {
    return _get('achievements') || {};
  }

  function unlockAchievement(id) {
    const a = getAchievements();
    if (a[id]) return false; // already unlocked
    a[id] = { unlockedAt: todayStr(), seen: false };
    _set('achievements', a);
    return true;
  }

  function markAchievementSeen(id) {
    const a = getAchievements();
    if (a[id]) {
      a[id].seen = true;
      _set('achievements', a);
    }
  }

  // ─── Rewards Config (parent-managed) ────────────────────
  const DEFAULT_REWARDS = [
    { id: 'sticker', name: '贴纸', emoji: '⭐', cost: 50, enabled: true },
    { id: 'toy', name: '小玩具', emoji: '🧸', cost: 200, enabled: true },
    { id: 'icecream', name: '冰淇淋', emoji: '🍦', cost: 100, enabled: true },
    { id: 'screentime', name: '额外屏幕时间', emoji: '📱', cost: 150, enabled: true },
  ];

  function getRewardsConfig() {
    return _get('rewards_config') || DEFAULT_REWARDS.map(r => ({ ...r }));
  }

  function saveRewardsConfig(config) {
    _set('rewards_config', config);
  }

  // ─── Milestones (parent-managed) ────────────────────────
  const DEFAULT_MILESTONES = [
    { id: 'park', name: '去公园', emoji: '🎢', streakDays: 7, claimed: false },
    { id: 'movie', name: '看电影', emoji: '🎬', streakDays: 14, claimed: false },
    { id: 'newtoy', name: '选一个新玩具', emoji: '🎁', streakDays: 30, claimed: false },
  ];

  function getMilestones() {
    return _get('milestones') || DEFAULT_MILESTONES.map(m => ({ ...m }));
  }

  function saveMilestones(milestones) {
    _set('milestones', milestones);
  }

  // ─── Pending Rewards (child redeemed, waiting for parent) ──
  // [ { rewardId, rewardName, emoji, cost, requestedAt, status: "pending"|"approved"|"denied" } ]
  function getPendingRewards() {
    return _get('pending_rewards') || [];
  }

  function addPendingReward(reward) {
    const list = getPendingRewards();
    list.push({ ...reward, requestedAt: todayStr(), status: 'pending' });
    _set('pending_rewards', list);
  }

  function updatePendingReward(index, status) {
    const list = getPendingRewards();
    if (list[index]) {
      list[index].status = status;
      _set('pending_rewards', list);
    }
  }

  // ─── Parent PIN ─────────────────────────────────────────
  function getParentPIN() {
    return _get('parent_pin') || '1234';
  }

  function setParentPIN(pin) {
    _set('parent_pin', pin);
  }

  // ─── Settings ───────────────────────────────────────────
  const DEFAULT_SETTINGS = {
    practiceDuration: 30, // minutes
    dailyLevelCap: 3,
    coinMultiplier: 1.0,
  };

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ..._get('settings') };
  }

  function saveSettings(settings) {
    _set('settings', settings);
  }

  // ─── Weekly Tasks (parent-configured) ───────────────────
  // { weekStart: "2026-02-23", tasks: [ {id, name, frequency:"daily"|"mon,wed", duration:10, notes:"", linkedLevel:null} ] }
  function getWeeklyTasks(weekStart) {
    const ws = weekStart || weekStartStr();
    const data = _get('weekly_tasks');
    if (data && data.weekStart === ws) return data;
    return { weekStart: ws, tasks: [] };
  }

  function saveWeeklyTasks(weeklyTasks) {
    _set('weekly_tasks', weeklyTasks);
  }

  function getTodayTasks() {
    const wt = getWeeklyTasks();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = dayNames[new Date().getDay()];
    return wt.tasks.filter(t => {
      if (t.frequency === 'daily') return true;
      return t.frequency && t.frequency.split(',').map(s => s.trim().toLowerCase()).includes(today);
    });
  }

  // ─── Daily State ────────────────────────────────────────
  // { date: "2026-03-01", warmupDone: false, practiceDone: false, practiceConfirmed: false,
  //   levelsPlayedToday: 0, practiceMinutes: 0, practiceRating: null, tasksCompleted: [] }
  function getDailyState() {
    const ds = _get('daily_state');
    const today = todayStr();
    if (ds && ds.date === today) return ds;
    // New day: reset
    return {
      date: today,
      warmupDone: false,
      practiceDone: false,
      practiceConfirmed: false,
      levelsPlayedToday: 0,
      practiceMinutes: 0,
      practiceRating: null,
      tasksCompleted: [],
      coinsEarnedToday: 0,
    };
  }

  function saveDailyState(state) {
    _set('daily_state', state);
  }

  // ─── Practice Logs ──────────────────────────────────────
  // [ { date, duration, pauseCount, totalPauseSeconds, rating, tasksCompleted } ]
  function getPracticeLogs() {
    return _get('practice_logs') || [];
  }

  function addPracticeLog(log) {
    const logs = getPracticeLogs();
    logs.push({ ...log, date: todayStr() });
    _set('practice_logs', logs);
  }

  // ─── Stars total count ─────────────────────────────────
  function getTotalStars() {
    const p = getProgress();
    let total = 0;
    for (const key in p.levels) {
      if (p.levels[key].stars) total += p.levels[key].stars;
    }
    return total;
  }

  // ─── Reset / Export ─────────────────────────────────────
  function exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) {
        data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
      }
    }
    return data;
  }

  function importAll(data) {
    for (const key in data) {
      _set(key, data[key]);
    }
  }

  function resetAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }

  // ─── Public API ─────────────────────────────────────────
  return {
    todayStr,
    weekStartStr,
    getProfile, saveProfile,
    getProgress, saveProgress, getLevelResult, saveLevelResult,
    getCoins, addCoins, spendCoins,
    getStreaks, recordPracticeDay,
    getAchievements, unlockAchievement, markAchievementSeen,
    getRewardsConfig, saveRewardsConfig,
    getMilestones, saveMilestones,
    getPendingRewards, addPendingReward, updatePendingReward,
    getParentPIN, setParentPIN,
    getSettings, saveSettings,
    getWeeklyTasks, saveWeeklyTasks, getTodayTasks,
    getDailyState, saveDailyState,
    getPracticeLogs, addPracticeLog,
    getTotalStars,
    exportAll, importAll, resetAll,
  };
})();
