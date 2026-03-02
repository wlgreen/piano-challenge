// practice.js — Practice timer, task checklist, parent confirmation
'use strict';

const Practice = (() => {
  let timerInterval = null;
  let totalSeconds = 0;     // total practice duration in seconds
  let remainingSeconds = 0;
  let isPaused = false;
  let pauseCount = 0;
  let totalPauseSeconds = 0;
  let pauseStartTime = null;
  let practiceStartTime = null;
  let encouragementTimer = null;
  let catBubbleTimer = null;
  let restShown = false;
  let selectedRating = null;

  // Melody cat encouragement messages
  const ENCOURAGEMENTS = [
    { emoji: '😺', text: '你弹得真好听！' },
    { emoji: '😻', text: 'Melody 最喜欢听你弹琴了！' },
    { emoji: '😸', text: '这个地方好难，但你在进步！💪' },
    { emoji: '😺', text: '继续加油，你做得很棒！' },
    { emoji: '😻', text: '好好听！Melody 都想跳舞了！💃' },
    { emoji: '😸', text: '每天练琴，每天都会更棒哦！' },
    { emoji: '😺', text: '你的手指越来越灵活了！' },
    { emoji: '😻', text: 'Melody 为你感到骄傲！' },
    { emoji: '😸', text: '音乐是最美的礼物！🎁' },
    { emoji: '😺', text: '听到你弹琴，Melody 好开心！' },
  ];

  const NEAR_END_MESSAGES = [
    { emoji: '😺', text: '还有一点点就练完啦！' },
    { emoji: '😻', text: '马上就可以去冒险地图啦！🗺️' },
    { emoji: '😸', text: '最后冲刺！你是最棒的！' },
  ];

  // ─── Start Practice ─────────────────────────────────────
  function start() {
    const settings = Storage.getSettings();
    totalSeconds = settings.practiceDuration * 60;
    remainingSeconds = totalSeconds;
    isPaused = false;
    pauseCount = 0;
    totalPauseSeconds = 0;
    pauseStartTime = null;
    practiceStartTime = Date.now();
    restShown = false;
    selectedRating = null;

    _updateTimerDisplay();
    _renderTasks();
    _startTimer();
    _startEncouragements();
    _updatePauseButton();

    // Init cat
    const catFace = document.getElementById('cat-face');
    if (catFace) catFace.textContent = '😺';
    _showCatBubble('开始练琴啦！加油！💪');
  }

  // ─── Timer ──────────────────────────────────────────────
  function _startTimer() {
    _stopTimer();
    timerInterval = setInterval(() => {
      if (isPaused) return;
      remainingSeconds--;
      _updateTimerDisplay();

      // Rest reminder at 15 minutes (half of 30)
      const elapsed = totalSeconds - remainingSeconds;
      if (!restShown && elapsed >= 15 * 60) {
        restShown = true;
        _showRestReminder();
      }

      if (remainingSeconds <= 0) {
        _stopTimer();
        endPractice();
      }
    }, 1000);
  }

  function _stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function _updateTimerDisplay() {
    const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
    const secs = Math.max(0, remainingSeconds) % 60;
    const display = document.getElementById('timer-display');
    if (display) {
      display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    // Update ring progress
    const ring = document.getElementById('timer-ring-progress');
    if (ring) {
      const circumference = 2 * Math.PI * 90; // r=90
      const progress = 1 - (remainingSeconds / totalSeconds);
      ring.style.strokeDashoffset = circumference * (1 - progress);
    }
  }

  // ─── Pause / Resume ─────────────────────────────────────
  function togglePause() {
    if (isPaused) {
      // Resume
      isPaused = false;
      if (pauseStartTime) {
        totalPauseSeconds += Math.floor((Date.now() - pauseStartTime) / 1000);
        pauseStartTime = null;
      }
      _showCatBubble('继续练琴！你可以的！💪');
    } else {
      // Pause
      isPaused = true;
      pauseCount++;
      pauseStartTime = Date.now();
      _showCatBubble('休息一下也好～😊');
    }
    _updatePauseButton();
  }

  function _updatePauseButton() {
    const btn = document.getElementById('btn-pause');
    if (btn) {
      btn.textContent = isPaused ? '▶️ 继续' : '⏸️ 暂停';
    }
  }

  // ─── End Practice ───────────────────────────────────────
  function endPractice() {
    _stopTimer();
    _stopEncouragements();

    const elapsed = totalSeconds - remainingSeconds;
    const practiceMinutes = Math.round(elapsed / 60);

    // Save practice log
    Storage.addPracticeLog({
      duration: practiceMinutes,
      pauseCount: pauseCount,
      totalPauseSeconds: totalPauseSeconds,
    });

    // Update daily state
    const ds = Storage.getDailyState();
    ds.practiceDone = true;
    ds.practiceMinutes = practiceMinutes;
    Storage.saveDailyState(ds);

    // Update profile
    const profile = Storage.getProfile();
    profile.totalPracticeMinutes += practiceMinutes;
    profile.totalSessions += 1;
    Storage.saveProfile(profile);

    // Show practice complete screen
    _showPracticeComplete(practiceMinutes);
  }

  // ─── Practice Complete Screen ───────────────────────────
  function _showPracticeComplete(minutes) {
    const summary = document.getElementById('practice-summary');
    if (summary) summary.textContent = '今天练了 ' + minutes + ' 分钟！';

    // Reset parent gate
    const parentGate = document.getElementById('parent-gate');
    const parentConfirm = document.getElementById('parent-confirm');
    const mathGate = document.getElementById('math-gate');
    if (parentGate) parentGate.classList.remove('hidden');
    if (parentConfirm) parentConfirm.classList.add('hidden');
    if (mathGate) mathGate.classList.remove('hidden');

    // Generate math question
    _generateMathQuestion();

    // Render task checklist for confirmation
    _renderConfirmTasks();

    // Reset rating
    selectedRating = null;
    document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));

    Animations.screenTransition('screen-practice', 'screen-practice-complete');
  }

  // ─── Math Gate ──────────────────────────────────────────
  function _generateMathQuestion() {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 15) + 3;
    const correct = a + b;

    const qEl = document.getElementById('math-question');
    if (qEl) qEl.textContent = '📐 请问 ' + a + ' + ' + b + ' = ?';

    // Generate 4 options: 1 correct + 3 wrong
    const options = [correct];
    while (options.length < 4) {
      const wrong = correct + Math.floor(Math.random() * 7) - 3;
      if (wrong !== correct && wrong > 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }
    // Shuffle
    options.sort(() => Math.random() - 0.5);

    const container = document.getElementById('math-options');
    if (container) {
      container.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'math-option';
        btn.textContent = opt;
        btn.onclick = () => _checkMathAnswer(opt, correct);
        container.appendChild(btn);
      });
    }
  }

  function _checkMathAnswer(answer, correct) {
    if (answer === correct) {
      // Unlock parent confirm area
      const mathGate = document.getElementById('math-gate');
      const parentConfirm = document.getElementById('parent-confirm');
      if (mathGate) mathGate.classList.add('hidden');
      if (parentConfirm) parentConfirm.classList.remove('hidden');
      Audio.playSFX('success');
    } else {
      Audio.playSFX('error');
      // Regenerate
      _generateMathQuestion();
    }
  }

  // ─── Rating ─────────────────────────────────────────────
  function setRating(rating) {
    selectedRating = rating;
    document.querySelectorAll('.rating-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.rating === rating);
    });
    Audio.playSFX('click');
  }

  // ─── Confirm Complete ───────────────────────────────────
  function confirmComplete() {
    if (!selectedRating) {
      // Flash rating buttons to prompt selection
      document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.style.animation = 'none';
        btn.offsetHeight; // reflow
        btn.style.animation = 'shake 0.3s ease';
      });
      return;
    }

    // Gather completed tasks
    const completedTaskIds = [];
    document.querySelectorAll('.confirm-task-check:checked').forEach(cb => {
      completedTaskIds.push(cb.dataset.taskId);
    });

    // Update daily state
    const ds = Storage.getDailyState();
    ds.practiceConfirmed = true;
    ds.practiceRating = selectedRating;
    ds.tasksCompleted = completedTaskIds;
    Storage.saveDailyState(ds);

    // Record practice for streak
    Storage.recordPracticeDay();

    // Award coins
    const coins = Rewards.awardPracticeCoins(selectedRating);
    const streakBonus = Rewards.checkStreakBonus();

    // Check achievements
    Rewards.tryUnlock('first_practice');
    if (Storage.getProfile().totalPracticeMinutes >= 600) {
      Rewards.tryUnlock('practice_10h');
    }

    // Check streak achievements
    const streaks = Storage.getStreaks();
    if (streaks.current >= 3) Rewards.tryUnlock('streak_3');
    if (streaks.current >= 7) Rewards.tryUnlock('streak_7');
    if (streaks.current >= 14) Rewards.tryUnlock('streak_14');
    if (streaks.current >= 30) Rewards.tryUnlock('streak_30');

    Rewards.checkAutoAchievements();

    // Show reward overlay
    const totalCoins = coins + streakBonus;
    _showRewardCelebration(totalCoins, streakBonus);
  }

  function _showRewardCelebration(coins, streakBonus) {
    const overlay = document.getElementById('reward-overlay');
    const emoji = document.getElementById('reward-emoji');
    const title = document.getElementById('reward-title');
    const detail = document.getElementById('reward-detail');
    const coinsEl = document.getElementById('reward-coins');

    if (emoji) emoji.textContent = '🎉';
    if (title) title.textContent = '练琴完成！';
    let detailText = '太棒了，Melody 为你骄傲！';
    if (streakBonus > 0) {
      detailText += '\n🔥 连续打卡奖励 +' + streakBonus + ' 🪙';
    }
    if (detail) detail.textContent = detailText;
    if (coinsEl) coinsEl.textContent = '+' + coins + ' 🪙';

    if (overlay) overlay.classList.remove('hidden');

    // Celebration animation
    Animations.confetti(document.body, 40);
    Audio.playSFX('fanfare');

    // Update stats
    Rewards.updateStatsDisplay();
  }

  // ─── Tasks Rendering ───────────────────────────────────
  function _renderTasks() {
    const tasks = Storage.getTodayTasks();
    const list = document.getElementById('practice-task-list');
    if (!list) return;

    if (tasks.length === 0) {
      list.innerHTML = '<div class="task-item"><span class="task-check">📝</span><span>今天还没配置任务，自由练习吧！</span></div>';
      return;
    }

    list.innerHTML = '';
    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = '<span class="task-check">☐</span>' +
        '<span>' + task.name + (task.notes ? ' <small style="color:#999">(' + task.notes + ')</small>' : '') + '</span>' +
        '<span class="task-duration">' + (task.duration || '?') + '分钟</span>';
      list.appendChild(item);
    });
  }

  function _renderConfirmTasks() {
    const tasks = Storage.getTodayTasks();
    const list = document.getElementById('confirm-task-list');
    if (!list) return;

    if (tasks.length === 0) {
      list.innerHTML = '<p style="color:#888;">没有配置的任务</p>';
      return;
    }

    list.innerHTML = '';
    tasks.forEach((task, i) => {
      const item = document.createElement('label');
      item.className = 'task-item';
      item.style.cursor = 'pointer';
      item.innerHTML = '<input type="checkbox" class="confirm-task-check" data-task-id="' + (task.id || i) + '" style="width:20px;height:20px;">' +
        '<span>' + task.name + '</span>' +
        '<span class="task-duration">' + (task.duration || '?') + '分钟</span>';
      list.appendChild(item);
    });
  }

  // ─── Encouragement System ──────────────────────────────
  function _startEncouragements() {
    _stopEncouragements();

    // Show encouragement every 3-5 minutes (random interval)
    function scheduleNext() {
      const delay = (180 + Math.floor(Math.random() * 120)) * 1000; // 3-5 min
      encouragementTimer = setTimeout(() => {
        if (isPaused) {
          scheduleNext();
          return;
        }
        _showEncouragement();
        scheduleNext();
      }, delay);
    }
    scheduleNext();
  }

  function _stopEncouragements() {
    if (encouragementTimer) {
      clearTimeout(encouragementTimer);
      encouragementTimer = null;
    }
    if (catBubbleTimer) {
      clearTimeout(catBubbleTimer);
      catBubbleTimer = null;
    }
  }

  function _showEncouragement() {
    const elapsed = totalSeconds - remainingSeconds;
    const remaining = remainingSeconds;

    let pool;
    if (remaining < 300) { // last 5 minutes
      pool = NEAR_END_MESSAGES;
    } else {
      pool = ENCOURAGEMENTS;
    }

    const msg = pool[Math.floor(Math.random() * pool.length)];
    const catFace = document.getElementById('cat-face');
    if (catFace) catFace.textContent = msg.emoji;
    _showCatBubble(msg.text);

    // Cat sleeping animation after long practice
    if (elapsed > 20 * 60) {
      setTimeout(() => {
        if (catFace) catFace.textContent = '😴';
        _showCatBubble('Zzz... 你弹得真好听...');
        setTimeout(() => {
          if (catFace) catFace.textContent = '😺';
          _showCatBubble('啊！被好听的琴声叫醒了！');
        }, 5000);
      }, 2000);
    }
  }

  function _showCatBubble(text) {
    const bubble = document.getElementById('cat-bubble');
    const bubbleText = document.getElementById('cat-bubble-text');
    if (!bubble || !bubbleText) return;

    bubbleText.textContent = text;
    bubble.classList.remove('hidden');

    if (catBubbleTimer) clearTimeout(catBubbleTimer);
    catBubbleTimer = setTimeout(() => {
      bubble.classList.add('hidden');
    }, 4000);
  }

  // ─── Rest Reminder ─────────────────────────────────────
  function _showRestReminder() {
    const overlay = document.createElement('div');
    overlay.className = 'rest-overlay';
    overlay.id = 'rest-overlay';

    const card = document.createElement('div');
    card.className = 'rest-card';

    let restSeconds = 30;
    card.innerHTML = '<div class="rest-emoji">🖐️</div>' +
      '<div class="rest-title">休息一下手指！</div>' +
      '<p style="color:#888;">甩甩手，做做手指操！</p>' +
      '<div class="rest-timer" id="rest-countdown">30</div>' +
      '<button class="btn btn-primary mt-12" id="btn-skip-rest" onclick="Practice._skipRest()">跳过休息</button>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Pause practice during rest
    if (!isPaused) {
      isPaused = true;
      _updatePauseButton();
    }

    const restInterval = setInterval(() => {
      restSeconds--;
      const cd = document.getElementById('rest-countdown');
      if (cd) cd.textContent = restSeconds;
      if (restSeconds <= 0) {
        clearInterval(restInterval);
        _dismissRest();
      }
    }, 1000);

    overlay._restInterval = restInterval;
  }

  function _skipRest() {
    _dismissRest();
  }

  function _dismissRest() {
    const overlay = document.getElementById('rest-overlay');
    if (overlay) {
      if (overlay._restInterval) clearInterval(overlay._restInterval);
      overlay.remove();
    }
    // Resume
    isPaused = false;
    _updatePauseButton();
    _showCatBubble('手指休息好了！继续弹吧！🎹');
  }

  // ─── Public API ─────────────────────────────────────────
  return {
    start,
    togglePause,
    endPractice,
    setRating,
    confirmComplete,
    _skipRest, // needed for inline onclick
  };
})();
