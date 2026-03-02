// rewards.js — Coins, streaks, achievements, reward shop
'use strict';

const Rewards = (() => {

  // ─── Achievement Definitions ─────────────────────────────────────
  const ACHIEVEMENT_LIST = [
    { id: 'first_note',     name: '弹出第一个音',     emoji: '🎵', coins: 10 },
    { id: 'first_practice', name: '第一次练琴！',     emoji: '🎹', coins: 15 },
    { id: 'streak_3',       name: '3天连续练琴',      emoji: '🔥', coins: 20 },
    { id: 'streak_7',       name: '7天连续练琴',      emoji: '⭐', coins: 20 },
    { id: 'streak_14',      name: '14天连续练琴',     emoji: '👑', coins: 25 },
    { id: 'streak_30',      name: '30天连续练琴',     emoji: '🏆', coins: 30 },
    { id: 'practice_10h',   name: '累计练琴10小时',   emoji: '⏱️', coins: 30 },
    { id: 'week_complete',  name: '完成一整周任务',   emoji: '📚', coins: 25 },
    { id: 'find_c',         name: '找到C！',          emoji: '🦀', coins: 10 },
    { id: 'all_notes',      name: '集齐所有7个音名',  emoji: '🌈', coins: 20 },
    { id: 'first_melody',   name: '第一首完整曲子',   emoji: '🎶', coins: 15 },
    { id: 'coins_100',      name: '收集100金币',      emoji: '💰', coins: 10 },
    { id: 'coins_500',      name: '收集500金币',      emoji: '💎', coins: 15 },
    { id: 'world1_clear',   name: '世界1通关',        emoji: '🏠', coins: 20 },
    { id: 'world1_3star',   name: '世界1全三星',      emoji: '⭐', coins: 30 },
    { id: 'world2_clear',   name: '世界2通关',        emoji: '🌲', coins: 20 },
    { id: 'world3_clear',   name: '世界3通关',        emoji: '🏝️', coins: 20 },
    { id: 'world4_clear',   name: '世界4通关',        emoji: '⛰️', coins: 20 },
    { id: 'world5_clear',   name: '世界5通关',        emoji: '🎵', coins: 20 },
    { id: 'world6_clear',   name: '世界6通关',        emoji: '🥁', coins: 20 },
    { id: 'levels_10',      name: '完成10个关卡',     emoji: '🎮', coins: 15 },
    { id: 'levels_20',      name: '完成20个关卡',     emoji: '🌟', coins: 20 },
    { id: 'levels_38',      name: '全部关卡通关',     emoji: '👑', coins: 30 },
    { id: 'melody_master',  name: '旋律大师',         emoji: '🎼', coins: 25 },
    { id: 'rhythm_king',    name: '节奏之王',         emoji: '🥁', coins: 25 },
  ];

  // ─── Streak Milestone Definitions ────────────────────────────────
  const STREAK_MILESTONES = [
    { days: 3,  bonus: 20  },
    { days: 7,  bonus: 60  },
    { days: 14, bonus: 150 },
    { days: 30, bonus: 500 },
  ];

  // ─── Coin System ──────────────────────────────────────────────────

  function awardWarmupCoins() {
    const amount = 5;
    Storage.addCoins(amount);
    try { Audio.playSFX('coin'); } catch(e) {}
    updateStatsDisplay();
    return amount;
  }

  function awardPracticeCoins(rating) {
    const ratingMultipliers = { good: 1.5, ok: 1.0, needwork: 0.8 };
    const ratingMult = ratingMultipliers[rating] || 1.0;
    const settings = Storage.getSettings();
    const coinMultiplier = settings.coinMultiplier || 1;
    const total = Math.round(30 * ratingMult * coinMultiplier);
    Storage.addCoins(total);
    try { Audio.playSFX('coin'); } catch(e) {}
    updateStatsDisplay();
    return total;
  }

  function awardLevelCoins(stars) {
    const starCoins = { 1: 10, 2: 15, 3: 20 };
    const amount = starCoins[stars] || 10;
    Storage.addCoins(amount);
    try { Audio.playSFX('coin'); } catch(e) {}
    updateStatsDisplay();
    return amount;
  }

  function awardLoginBonus() {
    const ds = Storage.getDailyState();
    if (ds.loginBonusAwarded) return 0;
    ds.loginBonusAwarded = true;
    Storage.saveDailyState(ds);
    Storage.addCoins(5);
    updateStatsDisplay();
    return 5;
  }

  function checkStreakBonus() {
    const streaks = Storage.getStreaks();
    const current = streaks.current || 0;
    const achievements = Storage.getAchievements();
    let totalBonus = 0;

    for (const milestone of STREAK_MILESTONES) {
      const key = 'streak_bonus_' + milestone.days;
      if (current >= milestone.days && !achievements[key]) {
        Storage.unlockAchievement(key);
        Storage.addCoins(milestone.bonus);
        totalBonus += milestone.bonus;
      }
    }

    if (totalBonus > 0) updateStatsDisplay();
    return totalBonus;
  }

  function awardWeeklyBonus() {
    const wt = Storage.getWeeklyTasks();
    if (!wt || !wt.tasks || wt.tasks.length === 0) return 0;
    // Check daily state for completed tasks
    const ds = Storage.getDailyState();
    // Simple check: award if not already awarded this week
    const achievements = Storage.getAchievements();
    const weekKey = 'weekly_bonus_' + wt.weekStart;
    if (achievements[weekKey]) return 0;
    Storage.unlockAchievement(weekKey);
    Storage.addCoins(50);
    updateStatsDisplay();
    return 50;
  }

  function awardAchievement(id) {
    const result = tryUnlock(id);
    return result.coins;
  }

  // ─── Streak Tracking ─────────────────────────────────────────────

  function recordPractice() {
    Storage.recordPracticeDay();
    checkStreakBonus();
  }

  function getStreakInfo() {
    const streaks = Storage.getStreaks();
    return {
      current: streaks.current || 0,
      longest: streaks.longest || 0,
      lastPracticeDate: streaks.lastPracticeDate || null,
    };
  }

  // ─── Achievements ────────────────────────────────────────────────

  function checkAutoAchievements() {
    const coins = Storage.getCoins();
    const streaks = Storage.getStreaks();
    const current = streaks.current || 0;

    // Auto-check coins achievements
    if (coins >= 100) tryUnlock('coins_100');
    if (coins >= 500) tryUnlock('coins_500');

    // Auto-check streak achievements
    if (current >= 3)  tryUnlock('streak_3');
    if (current >= 7)  tryUnlock('streak_7');
    if (current >= 14) tryUnlock('streak_14');
    if (current >= 30) tryUnlock('streak_30');
  }

  function tryUnlock(id) {
    const wasNew = Storage.unlockAchievement(id);
    if (!wasNew) return { unlocked: false, coins: 0 };

    const ach = ACHIEVEMENT_LIST.find(a => a.id === id);
    if (!ach) return { unlocked: true, coins: 0 };

    Storage.addCoins(ach.coins);
    try {
      Animations.showAchievement(ach.name, ach.emoji);
      Audio.playSFX('star');
    } catch(e) {}
    updateStatsDisplay();
    return { unlocked: true, coins: ach.coins };
  }

  function getAchievements() {
    const unlocked = Storage.getAchievements();
    return ACHIEVEMENT_LIST.map(ach => ({
      ...ach,
      unlocked: !!unlocked[ach.id],
    }));
  }

  function getUnlockedCount() {
    const unlocked = Storage.getAchievements();
    return ACHIEVEMENT_LIST.filter(a => !!unlocked[a.id]).length;
  }

  // ─── Reward Shop ─────────────────────────────────────────────────

  function renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;

    const coins = Storage.getCoins();
    const rewards = Storage.getRewardsConfig();
    grid.innerHTML = '';

    rewards.forEach(reward => {
      if (!reward.enabled) return;
      const canAfford = coins >= reward.cost;

      const card = document.createElement('div');
      card.className = 'shop-item' + (canAfford ? ' affordable' : ' too-expensive');

      card.innerHTML =
        '<div class="shop-emoji">' + reward.emoji + '</div>' +
        '<div class="shop-name">' + reward.name + '</div>' +
        '<div class="shop-cost">🪙 ' + reward.cost + '</div>';

      if (canAfford) {
        card.onclick = () => redeemReward(reward.id);
      }

      grid.appendChild(card);
    });
  }

  function redeemReward(rewardId) {
    const rewards = Storage.getRewardsConfig();
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (!Storage.spendCoins(reward.cost)) return;

    Storage.addPendingReward({
      rewardId: reward.id,
      rewardName: reward.name,
      emoji: reward.emoji,
      cost: reward.cost,
    });

    try { Audio.playSFX('success'); } catch(e) {}
    renderShop();
    updateStatsDisplay();

    // Show confirmation
    const msg = document.createElement('div');
    msg.className = 'encouragement-popup';
    msg.innerHTML = '<div class="enc-emoji">' + reward.emoji + '</div>' +
      '<div class="enc-text">已兑换 ' + reward.name + '！\n等爸爸/妈妈确认哦～</div>';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2500);
  }

  function showTab(tabName) {
    const tabs = ['shop', 'milestones', 'achievements'];
    tabs.forEach(tab => {
      const panel = document.getElementById('tab-' + tab);
      if (panel) panel.classList.toggle('hidden', tab !== tabName);
    });

    // Update tab buttons
    document.querySelectorAll('#screen-shop .tab-btn').forEach((btn, i) => {
      btn.classList.toggle('active', tabs[i] === tabName);
    });

    if (tabName === 'shop') renderShop();
    else if (tabName === 'milestones') renderMilestones();
    else if (tabName === 'achievements') renderAchievements();
  }

  // ─── Milestones ──────────────────────────────────────────────────

  function renderMilestones() {
    const list = document.getElementById('milestones-list');
    if (!list) return;

    const milestones = Storage.getMilestones();
    const streaks = Storage.getStreaks();
    const current = streaks.current || 0;

    list.innerHTML = '';

    milestones.forEach(m => {
      const progress = Math.min(100, Math.round(current / m.streakDays * 100));
      const achieved = current >= m.streakDays;

      const card = document.createElement('div');
      card.className = 'milestone-card';
      card.innerHTML =
        '<div class="milestone-header">' +
        '<span class="milestone-emoji">' + m.emoji + '</span>' +
        '<div>' +
        '<div class="milestone-name">' + m.name + (achieved ? ' ✅' : '') + '</div>' +
        '<div class="milestone-detail">连续练琴 ' + m.streakDays + ' 天' +
        (achieved ? '' : ' | 还差 ' + Math.max(0, m.streakDays - current) + ' 天') + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="level-progress" style="margin-top:8px;">' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
        '<span class="progress-text">' + Math.min(current, m.streakDays) + '/' + m.streakDays + '</span>' +
        '</div>';

      list.appendChild(card);
    });
  }

  function checkMilestones() {
    const milestones = Storage.getMilestones();
    const streaks = Storage.getStreaks();
    const current = streaks.current || 0;
    return milestones.filter(m => current >= m.streakDays && !m.claimed);
  }

  // ─── Render Achievements ─────────────────────────────────────────

  function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;

    const achievements = getAchievements();
    grid.innerHTML = '';

    achievements.forEach(ach => {
      const badge = document.createElement('div');
      badge.className = 'achievement-badge' + (ach.unlocked ? '' : ' locked');
      badge.innerHTML =
        '<div class="badge-emoji">' + (ach.unlocked ? ach.emoji : '🔒') + '</div>' +
        '<div class="badge-name">' + ach.name + '</div>';
      grid.appendChild(badge);
    });
  }

  // ─── UI Updates ──────────────────────────────────────────────────

  function updateStatsDisplay() {
    const coins = Storage.getCoins();
    const streaks = Storage.getStreaks();
    const stars = Storage.getTotalStars();

    const coinsEl = document.getElementById('coins-display');
    if (coinsEl) coinsEl.textContent = coins;

    const streakEl = document.getElementById('streak-display');
    if (streakEl) streakEl.textContent = streaks.current || 0;

    const starsEl = document.getElementById('stars-display');
    if (starsEl) starsEl.textContent = stars;

    const shopCoinsEl = document.getElementById('shop-coins');
    if (shopCoinsEl) shopCoinsEl.textContent = coins;
  }

  // ─── Public API ──────────────────────────────────────────────────

  return {
    awardWarmupCoins,
    awardPracticeCoins,
    awardLevelCoins,
    awardLoginBonus,
    checkStreakBonus,
    awardWeeklyBonus,
    awardAchievement,
    recordPractice,
    getStreakInfo,
    checkAutoAchievements,
    tryUnlock,
    getAchievements,
    getUnlockedCount,
    renderShop,
    redeemReward,
    showTab,
    renderMilestones,
    checkMilestones,
    renderAchievements,
    updateStatsDisplay,
  };
})();
