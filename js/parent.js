// parent.js — Parent dashboard logic
'use strict';

const Parent = (() => {
  let pinBuffer = '';
  let editingTaskIndex = -1;
  let editingRewardIndex = -1;

  // ─── Init ───────────────────────────────────────────────
  function init() {
    // Show PIN screen
    pinBuffer = '';
    _updatePinDots();
  }

  // ─── PIN Entry ──────────────────────────────────────────
  function pinInput(digit) {
    if (pinBuffer.length >= 4) return;
    pinBuffer += String(digit);
    _updatePinDots();

    if (pinBuffer.length === 4) {
      setTimeout(_checkPIN, 200);
    }
  }

  function pinDelete() {
    pinBuffer = pinBuffer.slice(0, -1);
    _updatePinDots();
  }

  function _updatePinDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('pin-dot-' + i);
      if (dot) {
        dot.classList.toggle('filled', i < pinBuffer.length);
        dot.textContent = i < pinBuffer.length ? '●' : '';
      }
    }
  }

  function _checkPIN() {
    const stored = Storage.getParentPIN();
    if (pinBuffer === stored) {
      document.getElementById('pin-screen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      _loadDashboard();
    } else {
      document.getElementById('pin-error').textContent = 'PIN码错误，请重试';
      pinBuffer = '';
      _updatePinDots();
      // Shake animation
      const dots = document.getElementById('pin-dots');
      dots.style.animation = 'none';
      dots.offsetHeight;
      dots.style.animation = 'shake 0.3s ease';
    }
  }

  // ─── Load Dashboard ─────────────────────────────────────
  function _loadDashboard() {
    _loadOverview();
    _loadTasks();
    _loadRewards();
    _loadSettings();
  }

  // ─── Tab Navigation ─────────────────────────────────────
  function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.parent-tab').forEach(t => t.classList.remove('active'));

    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');

    // Find and activate the correct tab button
    const tabs = document.querySelectorAll('.parent-tab');
    const tabMap = { overview: 0, tasks: 1, rewards: 2, settings: 3 };
    if (tabs[tabMap[tabName]]) tabs[tabMap[tabName]].classList.add('active');

    // Refresh data
    if (tabName === 'overview') _loadOverview();
    if (tabName === 'tasks') _loadTasks();
    if (tabName === 'rewards') _loadRewards();
    if (tabName === 'settings') _loadSettings();
  }

  // ─── Tab 1: Overview ───────────────────────────────────
  function _loadOverview() {
    const streaks = Storage.getStreaks();
    const profile = Storage.getProfile();

    document.getElementById('p-streak').textContent = streaks.current;
    document.getElementById('p-longest').textContent = streaks.longest;
    document.getElementById('p-total-mins').textContent = profile.totalPracticeMinutes || 0;
    document.getElementById('p-total-sessions').textContent = profile.totalSessions || 0;
    document.getElementById('p-coins').textContent = Storage.getCoins();
    document.getElementById('p-stars').textContent = Storage.getTotalStars();

    _renderCalendar();
    _renderWeekStats();
    _renderPracticeLogs();
  }

  function _renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Headers
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    grid.innerHTML = days.map(d => '<div class="cal-header">' + d + '</div>').join('');

    // First day of month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Practice logs for this month
    const logs = Storage.getPracticeLogs();
    const practicedDates = new Set(logs.map(l => l.date));

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      grid.innerHTML += '<div class="cal-day empty">.</div>';
    }

    const todayStr = Storage.todayStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      let classes = 'cal-day';
      if (practicedDates.has(dateStr)) classes += ' practiced';
      if (dateStr === todayStr) classes += ' today';
      grid.innerHTML += '<div class="' + classes + '">' + d + '</div>';
    }
  }

  function _renderWeekStats() {
    const container = document.getElementById('week-stats');
    if (!container) return;

    const logs = Storage.getPracticeLogs();
    const weekStart = Storage.weekStartStr();

    // Filter logs for this week
    const weekLogs = logs.filter(l => l.date >= weekStart);
    const totalMins = weekLogs.reduce((s, l) => s + (l.duration || 0), 0);
    const daysThisWeek = new Set(weekLogs.map(l => l.date)).size;

    container.innerHTML = '<div style="display:flex;gap:20px;flex-wrap:wrap;">' +
      '<div><strong>' + daysThisWeek + '</strong> 天练琴</div>' +
      '<div><strong>' + totalMins + '</strong> 分钟总时长</div>' +
      '<div><strong>' + (daysThisWeek > 0 ? Math.round(totalMins / daysThisWeek) : 0) + '</strong> 分钟/天均</div>' +
      '</div>';
  }

  function _renderPracticeLogs() {
    const tbody = document.getElementById('log-table-body');
    if (!tbody) return;

    const logs = Storage.getPracticeLogs().slice(-10).reverse();
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">还没有练琴记录</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const ratingMap = { good: '😀很好', ok: '😊还行', needwork: '😐需加油' };
      return '<tr>' +
        '<td>' + (log.date || '-') + '</td>' +
        '<td>' + (log.duration || 0) + '分钟</td>' +
        '<td>' + (log.pauseCount || 0) + '次</td>' +
        '<td>' + (ratingMap[log.rating] || '-') + '</td>' +
        '</tr>';
    }).join('');
  }

  // ─── Tab 2: Weekly Tasks ───────────────────────────────
  function _loadTasks() {
    const weekStart = Storage.weekStartStr();
    const wt = Storage.getWeeklyTasks(weekStart);

    const rangeEl = document.getElementById('week-range');
    if (rangeEl) rangeEl.textContent = '(' + weekStart + ')';

    const list = document.getElementById('task-list');
    if (!list) return;

    const settings = Storage.getSettings();
    const durInput = document.getElementById('practice-duration-setting');
    if (durInput) durInput.value = settings.practiceDuration;

    if (wt.tasks.length === 0) {
      list.innerHTML = '<p style="color:#94a3b8;text-align:center;">还没有添加任务，点击下方按钮添加</p>';
      return;
    }

    list.innerHTML = '';
    wt.tasks.forEach((task, i) => {
      const freqMap = { daily: '每天' };
      const freqText = freqMap[task.frequency] || task.frequency;

      const row = document.createElement('div');
      row.className = 'task-row';
      row.innerHTML = '<div style="font-size:1.3rem;">🎵</div>' +
        '<div class="task-info">' +
        '<div class="task-name">' + task.name + '</div>' +
        '<div class="task-meta">' + freqText + ' | ' + (task.duration || '?') + '分钟' +
        (task.notes ? ' | ' + task.notes : '') + '</div>' +
        '</div>' +
        '<div class="task-actions">' +
        '<button onclick="Parent.editTask(' + i + ')">编辑</button>' +
        '<button class="delete" onclick="Parent.deleteTask(' + i + ')">删除</button>' +
        '</div>';
      list.appendChild(row);
    });
  }

  function showAddTaskForm() {
    editingTaskIndex = -1;
    document.getElementById('add-task-form').style.display = 'block';
    document.getElementById('task-name').value = '';
    document.getElementById('task-frequency').value = 'daily';
    document.getElementById('task-duration').value = '10';
    document.getElementById('task-notes').value = '';
    document.getElementById('task-name').focus();
  }

  function cancelAddTask() {
    document.getElementById('add-task-form').style.display = 'none';
    editingTaskIndex = -1;
  }

  function saveTask() {
    const name = document.getElementById('task-name').value.trim();
    if (!name) return;

    const task = {
      id: 'task_' + Date.now(),
      name: name,
      frequency: document.getElementById('task-frequency').value,
      duration: parseInt(document.getElementById('task-duration').value) || 10,
      notes: document.getElementById('task-notes').value.trim(),
      linkedLevel: null,
    };

    const weekStart = Storage.weekStartStr();
    const wt = Storage.getWeeklyTasks(weekStart);

    if (editingTaskIndex >= 0) {
      task.id = wt.tasks[editingTaskIndex].id;
      wt.tasks[editingTaskIndex] = task;
    } else {
      wt.tasks.push(task);
    }

    wt.weekStart = weekStart;
    Storage.saveWeeklyTasks(wt);
    cancelAddTask();
    _loadTasks();
  }

  function editTask(index) {
    const weekStart = Storage.weekStartStr();
    const wt = Storage.getWeeklyTasks(weekStart);
    const task = wt.tasks[index];
    if (!task) return;

    editingTaskIndex = index;
    document.getElementById('add-task-form').style.display = 'block';
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-frequency').value = task.frequency || 'daily';
    document.getElementById('task-duration').value = task.duration || 10;
    document.getElementById('task-notes').value = task.notes || '';
  }

  function deleteTask(index) {
    if (!confirm('确定删除这个任务吗？')) return;
    const weekStart = Storage.weekStartStr();
    const wt = Storage.getWeeklyTasks(weekStart);
    wt.tasks.splice(index, 1);
    Storage.saveWeeklyTasks(wt);
    _loadTasks();
  }

  function copyLastWeek() {
    const now = new Date();
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekStart = Storage.weekStartStr(lastWeekDate.toISOString().slice(0, 10));
    const lastWt = Storage.getWeeklyTasks(lastWeekStart);

    if (lastWt.tasks.length === 0) {
      alert('上周没有配置任务');
      return;
    }

    const weekStart = Storage.weekStartStr();
    const wt = Storage.getWeeklyTasks(weekStart);
    wt.weekStart = weekStart;
    wt.tasks = lastWt.tasks.map(t => ({ ...t, id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) }));
    Storage.saveWeeklyTasks(wt);
    _loadTasks();
  }

  function updatePracticeDuration(value) {
    const settings = Storage.getSettings();
    settings.practiceDuration = parseInt(value) || 30;
    Storage.saveSettings(settings);
  }

  // ─── Tab 3: Rewards ────────────────────────────────────
  function _loadRewards() {
    _renderPending();
    _renderRewardCatalog();
    _renderMilestoneCatalog();
  }

  function _renderPending() {
    const container = document.getElementById('pending-list');
    if (!container) return;

    const pending = Storage.getPendingRewards().filter(r => r.status === 'pending');
    if (pending.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;text-align:center;">没有待审批的兑换</p>';
      return;
    }

    container.innerHTML = '';
    pending.forEach((reward, i) => {
      const allPending = Storage.getPendingRewards();
      const actualIndex = allPending.indexOf(reward);

      const card = document.createElement('div');
      card.className = 'approval-card';
      card.innerHTML = '<span class="approval-emoji">' + (reward.emoji || '🎁') + '</span>' +
        '<div class="approval-info">' +
        '<div class="approval-name">' + reward.rewardName + '</div>' +
        '<div class="approval-date">' + reward.requestedAt + ' | ' + reward.cost + '🪙</div>' +
        '</div>' +
        '<div class="approval-actions">' +
        '<button class="approve-btn" onclick="Parent.approveReward(' + actualIndex + ')">✅ 批准</button>' +
        '<button class="deny-btn" onclick="Parent.denyReward(' + actualIndex + ')">❌ 拒绝</button>' +
        '</div>';
      container.appendChild(card);
    });
  }

  function approveReward(index) {
    Storage.updatePendingReward(index, 'approved');
    _renderPending();
  }

  function denyReward(index) {
    // Refund coins
    const pending = Storage.getPendingRewards();
    if (pending[index]) {
      const coins = pending[index].cost || 0;
      Storage.addCoins(coins);
    }
    Storage.updatePendingReward(index, 'denied');
    _renderPending();
  }

  function _renderRewardCatalog() {
    const container = document.getElementById('reward-catalog');
    if (!container) return;

    const rewards = Storage.getRewardsConfig();
    if (rewards.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;">没有配置奖励</p>';
      return;
    }

    container.innerHTML = '';
    rewards.forEach((reward, i) => {
      const row = document.createElement('div');
      row.className = 'reward-row';
      row.innerHTML = '<span class="reward-emoji">' + reward.emoji + '</span>' +
        '<div class="reward-info">' +
        '<div class="reward-name">' + reward.name + '</div>' +
        '<div class="reward-cost">🪙 ' + reward.cost + '</div>' +
        '</div>' +
        '<div class="task-actions">' +
        '<button onclick="Parent.editReward(' + i + ')">编辑</button>' +
        '<button class="delete" onclick="Parent.deleteReward(' + i + ')">删除</button>' +
        '</div>';
      container.appendChild(row);
    });
  }

  function showAddRewardForm() {
    editingRewardIndex = -1;
    document.getElementById('add-reward-form').style.display = 'block';
    document.getElementById('reward-name-input').value = '';
    document.getElementById('reward-emoji-input').value = '';
    document.getElementById('reward-cost-input').value = '50';
  }

  function cancelAddReward() {
    document.getElementById('add-reward-form').style.display = 'none';
  }

  function saveReward() {
    const name = document.getElementById('reward-name-input').value.trim();
    const emoji = document.getElementById('reward-emoji-input').value.trim() || '🎁';
    const cost = parseInt(document.getElementById('reward-cost-input').value) || 50;
    if (!name) return;

    const rewards = Storage.getRewardsConfig();

    if (editingRewardIndex >= 0) {
      rewards[editingRewardIndex].name = name;
      rewards[editingRewardIndex].emoji = emoji;
      rewards[editingRewardIndex].cost = cost;
    } else {
      rewards.push({ id: 'reward_' + Date.now(), name, emoji, cost, enabled: true });
    }

    Storage.saveRewardsConfig(rewards);
    cancelAddReward();
    _renderRewardCatalog();
  }

  function editReward(index) {
    const rewards = Storage.getRewardsConfig();
    const r = rewards[index];
    if (!r) return;

    editingRewardIndex = index;
    document.getElementById('add-reward-form').style.display = 'block';
    document.getElementById('reward-name-input').value = r.name;
    document.getElementById('reward-emoji-input').value = r.emoji;
    document.getElementById('reward-cost-input').value = r.cost;
  }

  function deleteReward(index) {
    if (!confirm('确定删除这个奖励吗？')) return;
    const rewards = Storage.getRewardsConfig();
    rewards.splice(index, 1);
    Storage.saveRewardsConfig(rewards);
    _renderRewardCatalog();
  }

  // ─── Milestones ─────────────────────────────────────────
  function _renderMilestoneCatalog() {
    const container = document.getElementById('milestone-catalog');
    if (!container) return;

    const milestones = Storage.getMilestones();
    if (milestones.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;">没有配置里程碑</p>';
      return;
    }

    const streaks = Storage.getStreaks();
    container.innerHTML = '';
    milestones.forEach((m, i) => {
      const progress = Math.min(100, Math.round(streaks.current / m.streakDays * 100));
      const row = document.createElement('div');
      row.className = 'reward-row';
      row.innerHTML = '<span class="reward-emoji">' + m.emoji + '</span>' +
        '<div class="reward-info">' +
        '<div class="reward-name">' + m.name + (m.claimed ? ' ✅' : '') + '</div>' +
        '<div class="reward-cost">连续 ' + m.streakDays + ' 天 | 进度 ' + progress + '%</div>' +
        '</div>' +
        '<div class="task-actions">' +
        '<button class="delete" onclick="Parent.deleteMilestone(' + i + ')">删除</button>' +
        '</div>';
      container.appendChild(row);
    });
  }

  function showAddMilestoneForm() {
    document.getElementById('add-milestone-form').style.display = 'block';
    document.getElementById('milestone-name-input').value = '';
    document.getElementById('milestone-emoji-input').value = '';
    document.getElementById('milestone-days-input').value = '7';
  }

  function cancelAddMilestone() {
    document.getElementById('add-milestone-form').style.display = 'none';
  }

  function saveMilestone() {
    const name = document.getElementById('milestone-name-input').value.trim();
    const emoji = document.getElementById('milestone-emoji-input').value.trim() || '🎯';
    const days = parseInt(document.getElementById('milestone-days-input').value) || 7;
    if (!name) return;

    const milestones = Storage.getMilestones();
    milestones.push({ id: 'ms_' + Date.now(), name, emoji, streakDays: days, claimed: false });
    Storage.saveMilestones(milestones);
    cancelAddMilestone();
    _renderMilestoneCatalog();
  }

  function deleteMilestone(index) {
    if (!confirm('确定删除这个里程碑吗？')) return;
    const milestones = Storage.getMilestones();
    milestones.splice(index, 1);
    Storage.saveMilestones(milestones);
    _renderMilestoneCatalog();
  }

  // ─── Tab 4: Settings ───────────────────────────────────
  function _loadSettings() {
    const settings = Storage.getSettings();
    const coinMul = document.getElementById('coin-multiplier');
    const levelCap = document.getElementById('daily-level-cap');
    const pracDur = document.getElementById('practice-duration-input');

    if (coinMul) coinMul.value = settings.coinMultiplier;
    if (levelCap) levelCap.value = settings.dailyLevelCap;
    if (pracDur) pracDur.value = settings.practiceDuration;
  }

  function updateSetting(key, value) {
    const settings = Storage.getSettings();
    settings[key] = value;
    Storage.saveSettings(settings);
  }

  function changePIN() {
    const newPin = document.getElementById('new-pin').value;
    if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
      alert('请输入4位数字');
      return;
    }
    Storage.setParentPIN(newPin);
    alert('PIN码已更新！');
    document.getElementById('new-pin').value = '';
  }

  function exportData() {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'piano_adventure_data_' + Storage.todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    document.getElementById('import-file').click();
  }

  function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Storage.importAll(data);
        alert('数据导入成功！');
        _loadDashboard();
      } catch (err) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm('确定要重置所有进度吗？此操作不可撤销！')) return;
    if (!confirm('真的确定吗？所有进度和金币都会丢失！')) return;
    Storage.resetAll();
    alert('已重置所有数据');
    _loadDashboard();
  }

  // ─── Public API ─────────────────────────────────────────
  return {
    init,
    pinInput,
    pinDelete,
    showTab,
    showAddTaskForm,
    cancelAddTask,
    saveTask,
    editTask,
    deleteTask,
    copyLastWeek,
    updatePracticeDuration,
    approveReward,
    denyReward,
    showAddRewardForm,
    cancelAddReward,
    saveReward,
    editReward,
    deleteReward,
    showAddMilestoneForm,
    cancelAddMilestone,
    saveMilestone,
    deleteMilestone,
    changePIN,
    exportData,
    importData,
    handleImport,
    resetAll,
    updateSetting,
  };
})();
