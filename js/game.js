// game.js — Main game controller, state machine, warmup games, level gameplay handlers
'use strict';

const Game = (() => {
  // ─── State Machine ──────────────────────────────────────
  const SCREENS = {
    DAILY_HUB: 'screen-daily-hub',
    WARMUP: 'screen-warmup',
    PRACTICE: 'screen-practice',
    PRACTICE_COMPLETE: 'screen-practice-complete',
    ADVENTURE: 'screen-adventure',
    LEVEL: 'screen-level',
    LEVEL_COMPLETE: 'screen-level-complete',
    SHOP: 'screen-shop',
    WARMUP_COMPLETE: 'screen-warmup-complete',
  };

  let currentScreen = SCREENS.DAILY_HUB;
  let currentLevel = null; // { worldIdx, levelIdx, data }
  let levelState = {};     // gameplay state for current level
  let warmupGames = [];
  let warmupIndex = 0;

  // ─── Init ───────────────────────────────────────────────
  function init() {
    // Ensure profile exists
    const profile = Storage.getProfile();
    if (!profile.createdAt) {
      profile.createdAt = Storage.todayStr();
      Storage.saveProfile(profile);
    }

    // Login bonus
    Rewards.awardLoginBonus();

    // Update UI
    Rewards.updateStatsDisplay();
    _updateDailyHub();
    _showScreen(SCREENS.DAILY_HUB);
  }

  // ─── Screen Management ──────────────────────────────────
  function _showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(screenId);
    if (el) el.classList.add('active');
    currentScreen = screenId;
  }

  function goHome() {
    _updateDailyHub();
    Rewards.updateStatsDisplay();
    _showScreen(SCREENS.DAILY_HUB);
  }

  // ─── Daily Hub ──────────────────────────────────────────
  function _updateDailyHub() {
    const ds = Storage.getDailyState();
    const settings = Storage.getSettings();

    // Update practice duration label
    const durLabel = document.getElementById('practice-duration-label');
    if (durLabel) durLabel.textContent = '真实练琴 (' + settings.practiceDuration + '分钟)';

    // Warmup card
    const warmupCard = document.getElementById('card-warmup');
    const warmupStatus = document.getElementById('warmup-status');
    if (ds.warmupDone) {
      warmupCard.classList.add('done');
      warmupCard.classList.remove('current');
      warmupStatus.textContent = '✅';
    } else {
      warmupCard.classList.remove('done');
      warmupCard.classList.add('current');
      warmupStatus.textContent = '▶️';
    }

    // Practice card
    const practiceCard = document.getElementById('card-practice');
    const practiceStatus = document.getElementById('practice-status');
    if (ds.practiceConfirmed) {
      practiceCard.classList.add('done');
      practiceCard.classList.remove('current', 'locked');
      practiceStatus.textContent = '✅';
    } else if (ds.practiceDone) {
      practiceCard.classList.remove('locked', 'done');
      practiceCard.classList.add('current');
      practiceStatus.textContent = '⏳';
    } else {
      practiceCard.classList.remove('done', 'locked');
      practiceCard.classList.add('current');
      practiceStatus.textContent = '▶️';
    }

    // Adventure card
    const adventureCard = document.getElementById('card-adventure');
    const adventureStatus = document.getElementById('adventure-status');
    if (ds.practiceConfirmed) {
      adventureCard.classList.remove('locked');
      adventureCard.classList.add('current');
      const remaining = settings.dailyLevelCap - ds.levelsPlayedToday;
      adventureStatus.textContent = remaining > 0 ? '▶️' : '✅';
    } else {
      adventureCard.classList.add('locked');
      adventureCard.classList.remove('current');
      adventureStatus.textContent = '🔒';
    }

    // Streak
    const streaks = Storage.getStreaks();
    const streakNum = document.getElementById('streak-num');
    if (streakNum) streakNum.textContent = '🔥 ' + streaks.current;

    // Levels remaining
    const levelsRemaining = document.getElementById('levels-remaining');
    if (levelsRemaining) {
      levelsRemaining.textContent = Math.max(0, settings.dailyLevelCap - ds.levelsPlayedToday);
    }

    // Welcome back message
    const welcomeMsg = document.getElementById('welcome-msg');
    const welcomeText = document.getElementById('welcome-text');
    if (streaks.current === 0 && streaks.lastPracticeDate && welcomeMsg && welcomeText) {
      welcomeMsg.classList.remove('hidden');
      welcomeText.textContent = '欢迎回来！Melody 想你了！😻';
    } else if (welcomeMsg) {
      welcomeMsg.classList.add('hidden');
    }

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('daily-greeting-text');
    if (greetingEl) {
      if (hour < 12) greetingEl.textContent = '🌅 早上好！今天的冒险';
      else if (hour < 18) greetingEl.textContent = '☀️ 下午好！今天的冒险';
      else greetingEl.textContent = '🌙 晚上好！今天的冒险';
    }
  }

  // ─── Warmup Games ───────────────────────────────────────
  function startWarmup() {
    // Pick 2 random warmup games
    warmupGames = _selectWarmupGames(2);
    warmupIndex = 0;

    _showScreen(SCREENS.WARMUP);
    _runWarmupGame();
  }

  function _selectWarmupGames(count) {
    const progress = Storage.getProgress();
    const types = ['ear_training', 'flashcard', 'rhythm_clap', 'melody_memory'];

    // If there are today tasks with new pieces, add 'preview'
    const tasks = Storage.getTodayTasks();
    if (tasks.length > 0) {
      types.push('preview');
    }

    // Shuffle and pick
    const shuffled = types.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  function _runWarmupGame() {
    const progressText = document.getElementById('warmup-progress-text');
    if (progressText) progressText.textContent = (warmupIndex + 1) + '/' + warmupGames.length;

    const type = warmupGames[warmupIndex];
    const area = document.getElementById('warmup-area');
    const pianoContainer = document.getElementById('warmup-piano');

    switch (type) {
      case 'ear_training': _warmupEarTraining(area, pianoContainer); break;
      case 'flashcard': _warmupFlashcard(area, pianoContainer); break;
      case 'rhythm_clap': _warmupRhythmClap(area, pianoContainer); break;
      case 'melody_memory': _warmupMelodyMemory(area, pianoContainer); break;
      case 'preview': _warmupPreview(area, pianoContainer); break;
      default: _warmupFlashcard(area, pianoContainer);
    }
  }

  function _warmupComplete() {
    warmupIndex++;
    if (warmupIndex < warmupGames.length) {
      _runWarmupGame();
    } else {
      // All warmup games done
      const ds = Storage.getDailyState();
      ds.warmupDone = true;
      Storage.saveDailyState(ds);

      const coins = Rewards.awardWarmupCoins();
      const coinsEl = document.getElementById('warmup-coins-earned');
      if (coinsEl) coinsEl.textContent = '+' + coins + ' 🪙';

      Rewards.updateStatsDisplay();
      Audio.playSFX('success');
      _showScreen(SCREENS.WARMUP_COMPLETE);
    }
  }

  // ─── Warmup: Ear Training ──────────────────────────────
  function _warmupEarTraining(area, pianoContainer) {
    const availableNotes = _getAvailableNotes();
    let targetNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
    let score = 0;
    const goal = 3;

    area.innerHTML = '<div class="warmup-title">👂 听音找键</div>' +
      '<div class="warmup-instruction">听到声音后，按下对应的键！</div>' +
      '<button class="btn btn-primary mt-12" id="btn-play-ear">🔊 播放声音</button>' +
      '<div class="level-progress mt-12"><div class="progress-bar"><div class="progress-fill" id="warmup-progress" style="width:0%"></div></div><span class="progress-text" id="warmup-score">0/' + goal + '</span></div>';

    PianoUI.render('warmup-piano', {
      range: PianoUI.getRange('C4', 'B4'),
      onKeyPress: (note) => {
        if (note === targetNote) {
          PianoUI.showCorrect(note);
          Audio.playSFX('coin');
          score++;
          document.getElementById('warmup-score').textContent = score + '/' + goal;
          document.getElementById('warmup-progress').style.width = (score / goal * 100) + '%';
          if (score >= goal) {
            setTimeout(() => _warmupComplete(), 500);
          } else {
            targetNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
            setTimeout(() => Audio.playNote(targetNote, 0.6), 600);
          }
        } else {
          PianoUI.showWrong(note);
        }
      }
    });

    document.getElementById('btn-play-ear').onclick = () => Audio.playNote(targetNote, 0.6);
    setTimeout(() => Audio.playNote(targetNote, 0.6), 500);
  }

  // ─── Warmup: Flashcard ─────────────────────────────────
  function _warmupFlashcard(area, pianoContainer) {
    const notes = _getAvailableNotes().filter(n => !n.includes('#'));
    let current = notes[Math.floor(Math.random() * notes.length)];
    let score = 0;
    const goal = 4;

    function showCard() {
      const noteName = current.replace(/[0-9]/g, '');
      area.innerHTML = '<div class="warmup-title">🎴 音符闪卡</div>' +
        '<div class="warmup-instruction">按下显示的音！</div>' +
        '<div class="flashcard">' + noteName + '</div>' +
        '<div class="level-progress mt-12"><div class="progress-bar"><div class="progress-fill" id="warmup-progress" style="width:' + (score / goal * 100) + '%"></div></div><span class="progress-text" id="warmup-score">' + score + '/' + goal + '</span></div>';
    }

    showCard();

    PianoUI.render('warmup-piano', {
      range: PianoUI.getRange('C4', 'B4'),
      onKeyPress: (note) => {
        if (note === current) {
          PianoUI.showCorrect(note);
          Audio.playSFX('coin');
          score++;
          if (score >= goal) {
            setTimeout(() => _warmupComplete(), 500);
          } else {
            current = notes[Math.floor(Math.random() * notes.length)];
            setTimeout(showCard, 400);
          }
        } else {
          PianoUI.showWrong(note);
          // Highlight the correct key briefly
          PianoUI.highlightKey(current);
          setTimeout(() => PianoUI.clearHighlight(current), 1000);
        }
      }
    });
  }

  // ─── Warmup: Rhythm Clap ───────────────────────────────
  function _warmupRhythmClap(area, pianoContainer) {
    pianoContainer.innerHTML = ''; // No piano for this
    let score = 0;
    const goal = 8;
    const bpm = 90;
    const beatInterval = 60000 / bpm;
    let beatIndex = 0;
    let rhythmTimer = null;
    let listening = false;
    let lastTapTime = 0;

    area.innerHTML = '<div class="warmup-title">👏 节奏跟拍</div>' +
      '<div class="warmup-instruction">跟着节拍拍手！</div>' +
      '<div class="rhythm-indicator" id="warmup-beats"></div>' +
      '<div class="tap-pad" id="warmup-tap" style="margin:20px auto;">👏</div>' +
      '<div class="level-progress mt-12"><div class="progress-bar"><div class="progress-fill" id="warmup-progress" style="width:0%"></div></div><span class="progress-text" id="warmup-score">0/' + goal + '</span></div>' +
      '<button class="btn btn-primary mt-12" id="btn-start-clap">▶️ 开始</button>';

    // Create beat dots
    const beatsContainer = document.getElementById('warmup-beats');
    for (let i = 0; i < goal; i++) {
      const dot = document.createElement('div');
      dot.className = 'beat-dot';
      dot.id = 'wbeat-' + i;
      beatsContainer.appendChild(dot);
    }

    document.getElementById('btn-start-clap').onclick = startClap;

    function startClap() {
      document.getElementById('btn-start-clap').classList.add('hidden');
      beatIndex = 0;
      listening = true;

      rhythmTimer = setInterval(() => {
        // Flash current beat
        const dot = document.getElementById('wbeat-' + beatIndex);
        if (dot) dot.classList.add('active');
        setTimeout(() => { if (dot) dot.classList.remove('active'); }, 200);
        Audio.playSFX('click');
        beatIndex++;
        if (beatIndex >= goal) {
          clearInterval(rhythmTimer);
          setTimeout(() => {
            listening = false;
            _warmupComplete();
          }, 500);
        }
      }, beatInterval);
    }

    document.getElementById('warmup-tap').onclick = () => {
      if (!listening) return;
      const now = Date.now();
      const dot = document.getElementById('wbeat-' + Math.max(0, beatIndex - 1));
      if (dot) dot.classList.add('hit');
      score++;
      document.getElementById('warmup-score').textContent = score + '/' + goal;
      document.getElementById('warmup-progress').style.width = (score / goal * 100) + '%';
      lastTapTime = now;
    };
  }

  // ─── Warmup: Melody Memory ─────────────────────────────
  function _warmupMelodyMemory(area, pianoContainer) {
    const notes = _getAvailableNotes().filter(n => !n.includes('#'));
    const seqLength = 3;
    const sequence = [];
    for (let i = 0; i < seqLength; i++) {
      sequence.push(notes[Math.floor(Math.random() * notes.length)]);
    }
    let playerIndex = 0;

    area.innerHTML = '<div class="warmup-title">🧠 旋律记忆</div>' +
      '<div class="warmup-instruction">Melody 弹了一段旋律，你来模仿！</div>' +
      '<button class="btn btn-primary mt-12" id="btn-replay-melody">🔊 再听一次</button>' +
      '<div class="level-progress mt-12"><div class="progress-bar"><div class="progress-fill" id="warmup-progress" style="width:0%"></div></div><span class="progress-text" id="warmup-score">0/' + seqLength + '</span></div>';

    PianoUI.render('warmup-piano', {
      range: PianoUI.getRange('C4', 'B4'),
      onKeyPress: (note) => {
        if (note === sequence[playerIndex]) {
          PianoUI.showCorrect(note);
          Audio.playSFX('coin');
          playerIndex++;
          document.getElementById('warmup-score').textContent = playerIndex + '/' + seqLength;
          document.getElementById('warmup-progress').style.width = (playerIndex / seqLength * 100) + '%';
          if (playerIndex >= seqLength) {
            setTimeout(() => _warmupComplete(), 500);
          } else {
            PianoUI.highlightKey(sequence[playerIndex]);
          }
        } else {
          PianoUI.showWrong(note);
        }
      }
    });

    function playSequence() {
      PianoUI.clearHighlight();
      Audio.playMelody(sequence, 500);
      sequence.forEach((n, i) => {
        setTimeout(() => {
          PianoUI.highlightKey(n);
          setTimeout(() => PianoUI.clearHighlight(n), 400);
        }, i * 500);
      });
      // After playing, highlight first key to press
      setTimeout(() => {
        if (playerIndex < seqLength) PianoUI.highlightKey(sequence[playerIndex]);
      }, seqLength * 500 + 200);
    }

    document.getElementById('btn-replay-melody').onclick = playSequence;
    setTimeout(playSequence, 500);
  }

  // ─── Warmup: Preview ───────────────────────────────────
  function _warmupPreview(area, pianoContainer) {
    const tasks = Storage.getTodayTasks();
    area.innerHTML = '<div class="warmup-title">📖 今日预习</div>' +
      '<div class="warmup-instruction">看看今天要练习的内容！</div>' +
      '<div style="text-align:left;margin:16px 0;">';

    tasks.forEach(task => {
      area.innerHTML += '<div class="task-item"><span class="task-check">🎵</span><span>' + task.name +
        (task.notes ? ' <small style="color:#999">(' + task.notes + ')</small>' : '') + '</span></div>';
    });

    area.innerHTML += '</div>' +
      '<button class="btn btn-success btn-large mt-16" onclick="Game._warmupComplete()">✅ 我知道了！</button>';

    pianoContainer.innerHTML = '';
  }

  // ─── Helper: Available notes based on progress ─────────
  function _getAvailableNotes() {
    const progress = Storage.getProgress();
    let completedLevels = 0;
    for (const key in progress.levels) {
      if (progress.levels[key].completed) completedLevels++;
    }

    // Gradually unlock more notes based on progress
    if (completedLevels < 6) return ['C4', 'D4', 'E4'];
    if (completedLevels < 13) return ['C4', 'D4', 'E4', 'F4', 'G4'];
    return ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
  }

  // ─── Practice ───────────────────────────────────────────
  function startPractice() {
    _showScreen(SCREENS.PRACTICE);
    Practice.start();
  }

  // ─── Adventure Map ──────────────────────────────────────
  function openAdventure() {
    const ds = Storage.getDailyState();
    if (!ds.practiceConfirmed) return; // Locked until practice confirmed

    const settings = Storage.getSettings();
    if (ds.levelsPlayedToday >= settings.dailyLevelCap) {
      _showMessage('今天的关卡玩完啦！明天再来！😊');
      return;
    }

    _showScreen(SCREENS.ADVENTURE);
    AdventureMap.render();
  }

  function backToMap() {
    _showScreen(SCREENS.ADVENTURE);
    AdventureMap.render();
    Rewards.updateStatsDisplay();
  }

  // ─── Level System ───────────────────────────────────────
  function startLevel(worldIdx, levelIdx) {
    const ds = Storage.getDailyState();
    const settings = Storage.getSettings();

    if (ds.levelsPlayedToday >= settings.dailyLevelCap) {
      _showMessage('今天的关卡玩完啦！明天再来！😊');
      return;
    }

    const levelData = Levels.getLevel(worldIdx, levelIdx);
    if (!levelData) return;

    currentLevel = { worldIdx, levelIdx, data: levelData };
    levelState = { score: 0, total: 0, mistakes: 0, startTime: Date.now() };

    // Setup level UI
    const title = document.getElementById('level-title');
    if (title) title.textContent = levelData.name;

    const instruction = document.getElementById('level-instruction');
    if (instruction) instruction.textContent = levelData.instruction;

    _updateLevelProgress(0, 1);

    _showScreen(SCREENS.LEVEL);

    // Launch gameplay based on type
    switch (levelData.type) {
      case 'FREE_PLAY': _playFreePlay(); break;
      case 'HIGH_LOW': _playHighLow(); break;
      case 'KEY_COLOR_MATCH': _playKeyColorMatch(); break;
      case 'FIND_THE_KEY': _playFindTheKey(); break;
      case 'SEQUENCE_COPY': _playSequenceCopy(); break;
      case 'MELODY_PLAY': _playMelodyPlay(); break;
      case 'RHYTHM_TAP': _playRhythmTap(); break;
    }
  }

  function _updateLevelProgress(current, total) {
    const fill = document.getElementById('level-progress-fill');
    const text = document.getElementById('level-progress-text');
    const scoreDisp = document.getElementById('level-score-display');
    if (fill) fill.style.width = (total > 0 ? current / total * 100 : 0) + '%';
    if (text) text.textContent = current + '/' + total;
    if (scoreDisp) scoreDisp.textContent = '⭐ ' + levelState.score;
  }

  function _completeLevel() {
    if (!currentLevel) return;

    // Calculate stars
    const data = currentLevel.data;
    let stars = 0;
    if (data.starThresholds) {
      if (levelState.score >= data.starThresholds[0]) stars = 1;
      if (levelState.score >= data.starThresholds[1]) stars = 2;
      if (levelState.score >= data.starThresholds[2]) stars = 3;
    } else {
      stars = levelState.mistakes === 0 ? 3 : levelState.mistakes <= 2 ? 2 : 1;
    }
    stars = Math.max(1, stars); // At least 1 star for completing

    // Save progress
    Storage.saveLevelResult(currentLevel.worldIdx, currentLevel.levelIdx, stars);

    // Award coins
    const coins = Rewards.awardLevelCoins(stars);

    // Update daily state
    const ds = Storage.getDailyState();
    ds.levelsPlayedToday++;
    Storage.saveDailyState(ds);

    // Check achievements
    _checkLevelAchievements();

    // Show level complete screen
    const starsDisplay = document.getElementById('level-stars-display');
    if (starsDisplay) starsDisplay.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

    const coinsEarned = document.getElementById('level-coins-earned');
    if (coinsEarned) coinsEarned.textContent = '+' + coins + ' 🪙';

    const completeTitle = document.getElementById('level-complete-title');
    if (completeTitle) {
      if (stars === 3) completeTitle.textContent = '完美！太厉害了！';
      else if (stars === 2) completeTitle.textContent = '很棒！继续加油！';
      else completeTitle.textContent = '过关啦！';
    }

    // Check if next level exists
    const nextBtn = document.getElementById('btn-next-level');
    const world = Levels.getWorld(currentLevel.worldIdx);
    const hasNext = currentLevel.levelIdx + 1 < world.levels.length ||
      currentLevel.worldIdx + 1 < Levels.getWorldCount();
    if (nextBtn) nextBtn.classList.toggle('hidden', !hasNext);

    _showScreen(SCREENS.LEVEL_COMPLETE);
    Animations.celebrateLevel(stars);
    Rewards.updateStatsDisplay();
  }

  function nextLevel() {
    if (!currentLevel) return backToMap();

    const world = Levels.getWorld(currentLevel.worldIdx);
    if (currentLevel.levelIdx + 1 < world.levels.length) {
      startLevel(currentLevel.worldIdx, currentLevel.levelIdx + 1);
    } else if (currentLevel.worldIdx + 1 < Levels.getWorldCount()) {
      startLevel(currentLevel.worldIdx + 1, 0);
    } else {
      backToMap();
    }
  }

  function _checkLevelAchievements() {
    const progress = Storage.getProgress();
    let totalCompleted = 0;
    let totalStars = 0;

    for (const key in progress.levels) {
      if (progress.levels[key].completed) {
        totalCompleted++;
        totalStars += progress.levels[key].stars || 0;
      }
    }

    // First note
    Rewards.tryUnlock('first_note');

    // Level count achievements
    if (totalCompleted >= 10) Rewards.tryUnlock('levels_10');
    if (totalCompleted >= 20) Rewards.tryUnlock('levels_20');
    if (totalCompleted >= 38) Rewards.tryUnlock('levels_38');

    // World clear checks
    for (let w = 0; w < Levels.getWorldCount(); w++) {
      const world = Levels.getWorld(w);
      let allDone = true;
      let allThreeStars = true;
      for (let l = 0; l < world.levels.length; l++) {
        const r = Storage.getLevelResult(w, l);
        if (!r || !r.completed) { allDone = false; allThreeStars = false; break; }
        if (r.stars < 3) allThreeStars = false;
      }
      if (allDone) {
        const ids = ['world1_clear', 'world2_clear', 'world3_clear', 'world4_clear', 'world5_clear', 'world6_clear'];
        Rewards.tryUnlock(ids[w]);
      }
      if (allThreeStars && w === 0) Rewards.tryUnlock('world1_3star');
    }

    // Find C
    if (Storage.getLevelResult(1, 0)) Rewards.tryUnlock('find_c');

    // All 7 note names
    if (totalCompleted >= 19) Rewards.tryUnlock('all_notes');

    // First melody
    if (currentLevel && currentLevel.data.type === 'MELODY_PLAY') Rewards.tryUnlock('first_melody');

    // Melody master (complete all melody levels)
    // Rhythm king (complete all rhythm levels)
    const world5 = Levels.getWorld(4);
    const world6 = Levels.getWorld(5);
    if (world5) {
      let allMelody = true;
      for (let l = 0; l < world5.levels.length; l++) {
        const r = Storage.getLevelResult(4, l);
        if (!r || !r.completed) { allMelody = false; break; }
      }
      if (allMelody) Rewards.tryUnlock('melody_master');
    }
    if (world6) {
      let allRhythm = true;
      for (let l = 0; l < world6.levels.length; l++) {
        const r = Storage.getLevelResult(5, l);
        if (!r || !r.completed) { allRhythm = false; break; }
      }
      if (allRhythm) Rewards.tryUnlock('rhythm_king');
    }

    Rewards.checkAutoAchievements();
  }

  // ═══════════════════════════════════════════════════════
  // GAMEPLAY HANDLERS
  // ═══════════════════════════════════════════════════════

  // ─── FREE_PLAY ──────────────────────────────────────────
  function _playFreePlay() {
    const data = currentLevel.data;
    const goal = data.passScore || 10;
    levelState.total = goal;
    levelState.score = 0;

    _hideGameplayAreas();
    _updateLevelProgress(0, goal);

    const range = data.keyRange ? PianoUI.getRange(data.keyRange[0], data.keyRange[1]) : PianoUI.KEYS;
    PianoUI.render('level-piano', {
      range: range,
      onKeyPress: (note) => {
        levelState.score++;
        _updateLevelProgress(levelState.score, goal);
        if (levelState.score >= goal) {
          setTimeout(() => _completeLevel(), 300);
        }
      }
    });
  }

  // ─── HIGH_LOW ───────────────────────────────────────────
  function _playHighLow() {
    const data = currentLevel.data;
    const pairs = data.pairs || [
      { low: 'C4', high: 'G4' }, { low: 'D4', high: 'A4' },
      { low: 'E4', high: 'C5' }, { low: 'F4', high: 'B4' },
      { low: 'G4', high: 'E5' },
    ];
    levelState.pairIndex = 0;
    levelState.pairs = pairs;
    levelState.total = pairs.length;
    levelState.score = 0;
    levelState.currentAnswer = null;

    _hideGameplayAreas();
    document.getElementById('highlow-area').classList.remove('hidden');
    document.getElementById('level-piano').innerHTML = '';

    _updateLevelProgress(0, pairs.length);
    _playHighLowPairInternal();
  }

  function _playHighLowPairInternal() {
    const pair = levelState.pairs[levelState.pairIndex];
    // Randomly decide which to play first
    const playFirst = Math.random() > 0.5 ? 'low' : 'high';
    levelState.currentAnswer = playFirst === 'low' ? 'high' : 'low'; // second is...

    const first = pair[playFirst];
    const second = pair[playFirst === 'low' ? 'high' : 'low'];

    // Play the pair
    Audio.playNote(first, 0.6);
    setTimeout(() => Audio.playNote(second, 0.6), 700);

    // The question: which was higher, the first or second?
    // Actually, simpler: play both, ask "哪个高？"
    // Let's play low then high, and ask which is second
    Audio.playNote(pair.low, 0.6);
    setTimeout(() => Audio.playNote(pair.high, 0.6), 700);
    levelState.currentAnswer = 'high'; // second note is higher
  }

  function playHighLowPair() {
    if (!levelState.pairs) return;
    const pair = levelState.pairs[levelState.pairIndex];
    Audio.playNote(pair.low, 0.6);
    setTimeout(() => Audio.playNote(pair.high, 0.6), 700);
  }

  function answerHighLow(answer) {
    // answer is 'high' or 'low' — which note was SECOND?
    // We always play low first, high second, so correct answer is always 'high'
    if (answer === 'high') {
      levelState.score++;
      Audio.playSFX('coin');
    } else {
      levelState.mistakes++;
      Audio.playSFX('error');
    }

    levelState.pairIndex++;
    _updateLevelProgress(levelState.pairIndex, levelState.total);

    if (levelState.pairIndex >= levelState.pairs.length) {
      setTimeout(() => _completeLevel(), 500);
    } else {
      setTimeout(() => _playHighLowPairInternal(), 800);
    }
  }

  // ─── KEY_COLOR_MATCH ────────────────────────────────────
  function _playKeyColorMatch() {
    const data = currentLevel.data;
    const pool = data.targetNotes || ['C4', 'D4', 'E4'];
    const goal = data.starThresholds ? data.starThresholds[2] : 5;
    levelState.score = 0;
    levelState.total = goal;
    levelState.targetNote = null;

    _hideGameplayAreas();
    _updateLevelProgress(0, goal);

    const range = data.keyRange ? PianoUI.getRange(data.keyRange[0], data.keyRange[1]) : PianoUI.getRange('C4', 'B4');
    PianoUI.render('level-piano', {
      range: range,
      onKeyPress: (note) => {
        if (note === levelState.targetNote) {
          PianoUI.showCorrect(note);
          PianoUI.clearHighlight();
          Audio.playSFX('coin');
          levelState.score++;
          _updateLevelProgress(levelState.score, goal);
          if (levelState.score >= goal) {
            setTimeout(() => _completeLevel(), 500);
          } else {
            setTimeout(() => _highlightRandomKey(pool), 400);
          }
        } else {
          PianoUI.showWrong(note);
          levelState.mistakes++;
        }
      }
    });

    setTimeout(() => _highlightRandomKey(pool), 500);
  }

  function _highlightRandomKey(pool) {
    PianoUI.clearHighlight();
    const note = pool[Math.floor(Math.random() * pool.length)];
    levelState.targetNote = note;
    PianoUI.highlightKey(note);
  }

  // ─── FIND_THE_KEY ───────────────────────────────────────
  function _playFindTheKey() {
    const data = currentLevel.data;
    const targets = data.targetNotes || ['C4'];
    let targetIndex = 0;
    levelState.score = 0;
    levelState.total = targets.length;

    _hideGameplayAreas();
    _updateLevelProgress(0, targets.length);

    // Show instruction for current target
    const instruction = document.getElementById('level-instruction');
    const noteName = targets[0].replace(/[0-9]/g, '');
    instruction.textContent = '找到 ' + noteName + ' ！按下它！';

    const range = data.keyRange ? PianoUI.getRange(data.keyRange[0], data.keyRange[1]) : PianoUI.getRange('C4', 'B5');
    PianoUI.render('level-piano', {
      range: range,
      onKeyPress: (note) => {
        if (note === targets[targetIndex]) {
          PianoUI.showCorrect(note);
          Audio.playSFX('coin');
          levelState.score++;
          targetIndex++;
          _updateLevelProgress(targetIndex, targets.length);

          if (targetIndex >= targets.length) {
            setTimeout(() => _completeLevel(), 500);
          } else {
            const nextName = targets[targetIndex].replace(/[0-9]/g, '');
            instruction.textContent = '找到 ' + nextName + ' ！按下它！';
          }
        } else {
          PianoUI.showWrong(note);
          levelState.mistakes++;
          // Give hint: play the target note
          setTimeout(() => Audio.playNote(targets[targetIndex], 0.5), 300);
        }
      }
    });
  }

  // ─── SEQUENCE_COPY ──────────────────────────────────────
  function _playSequenceCopy() {
    const data = currentLevel.data;
    const sequence = data.sequence || ['C4', 'E4', 'G4'];
    let playerIndex = 0;
    levelState.score = 0;
    levelState.total = sequence.length;

    _hideGameplayAreas();
    _updateLevelProgress(0, sequence.length);

    const range = data.keyRange ? PianoUI.getRange(data.keyRange[0], data.keyRange[1]) : PianoUI.getRange('C4', 'B4');
    PianoUI.render('level-piano', {
      range: range,
      onKeyPress: (note) => {
        if (note === sequence[playerIndex]) {
          PianoUI.showCorrect(note);
          Audio.playSFX('coin');
          levelState.score++;
          playerIndex++;
          _updateLevelProgress(playerIndex, sequence.length);

          if (playerIndex >= sequence.length) {
            PianoUI.clearHighlight();
            setTimeout(() => _completeLevel(), 500);
          } else {
            PianoUI.clearHighlight();
            PianoUI.highlightKey(sequence[playerIndex]);
          }
        } else {
          PianoUI.showWrong(note);
          levelState.mistakes++;
        }
      }
    });

    // Play the sequence first
    function playSequence() {
      PianoUI.clearHighlight();
      Audio.playMelody(sequence, 500);
      sequence.forEach((n, i) => {
        setTimeout(() => {
          PianoUI.highlightKey(n);
          setTimeout(() => PianoUI.clearHighlight(n), 400);
        }, i * 500);
      });
      // After playing, show first key
      setTimeout(() => {
        PianoUI.highlightKey(sequence[0]);
      }, sequence.length * 500 + 200);
    }

    playSequence();
  }

  // ─── MELODY_PLAY ────────────────────────────────────────
  function _playMelodyPlay() {
    const data = currentLevel.data;
    const melody = data.melody || [];
    let noteIndex = 0;
    levelState.score = 0;
    levelState.total = melody.length;

    _hideGameplayAreas();
    _updateLevelProgress(0, melody.length);

    const range = data.keyRange ? PianoUI.getRange(data.keyRange[0], data.keyRange[1]) : PianoUI.getRange('C4', 'B5');
    PianoUI.render('level-piano', {
      range: range,
      onKeyPress: (note) => {
        if (noteIndex >= melody.length) return;

        const expected = melody[noteIndex].note;
        if (note === expected) {
          PianoUI.showCorrect(note);
          PianoUI.clearHighlight();
          levelState.score++;
          noteIndex++;
          _updateLevelProgress(noteIndex, melody.length);

          if (noteIndex >= melody.length) {
            setTimeout(() => _completeLevel(), 500);
          } else {
            PianoUI.highlightKey(melody[noteIndex].note);
          }
        } else {
          PianoUI.showWrong(note);
          levelState.mistakes++;
        }
      }
    });

    // Highlight first note
    if (melody.length > 0) {
      PianoUI.highlightKey(melody[0].note);
    }
  }

  // ─── RHYTHM_TAP ─────────────────────────────────────────
  function _playRhythmTap() {
    const data = currentLevel.data;
    const rhythm = data.rhythm || [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];
    levelState.score = 0;
    levelState.total = rhythm.length;
    levelState.rhythmPlaying = false;
    levelState.beatIndex = 0;
    levelState.rhythm = rhythm;
    levelState.rhythmStartTime = 0;

    _hideGameplayAreas();
    document.getElementById('rhythm-area').classList.remove('hidden');
    document.getElementById('level-piano').innerHTML = '';

    _updateLevelProgress(0, rhythm.length);

    // Create beat dots
    const indicator = document.getElementById('rhythm-indicator');
    indicator.innerHTML = '';
    rhythm.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'beat-dot';
      dot.id = 'beat-' + i;
      indicator.appendChild(dot);
    });

    document.getElementById('btn-start-rhythm').classList.remove('hidden');
  }

  function startRhythm() {
    document.getElementById('btn-start-rhythm').classList.add('hidden');
    const rhythm = levelState.rhythm;
    levelState.rhythmPlaying = true;
    levelState.rhythmStartTime = Date.now();
    levelState.beatIndex = 0;

    // First: demonstrate the rhythm
    rhythm.forEach((time, i) => {
      setTimeout(() => {
        const dot = document.getElementById('beat-' + i);
        if (dot) dot.classList.add('active');
        Audio.playSFX('click');
        setTimeout(() => { if (dot) dot.classList.remove('active'); }, 200);
      }, time);
    });

    // After demonstration, wait a bit, then let player tap
    const totalDuration = rhythm[rhythm.length - 1] + 500;
    setTimeout(() => {
      levelState.rhythmStartTime = Date.now();
      levelState.beatIndex = 0;
      // Reset dots
      rhythm.forEach((_, i) => {
        const dot = document.getElementById('beat-' + i);
        if (dot) dot.classList.remove('active', 'hit', 'missed');
      });
    }, totalDuration + 500);
  }

  function rhythmTap() {
    if (!levelState.rhythmPlaying) return;
    const rhythm = levelState.rhythm;
    const elapsed = Date.now() - levelState.rhythmStartTime;

    // Find closest beat
    let closest = 0;
    let minDiff = Infinity;
    rhythm.forEach((time, i) => {
      const diff = Math.abs(elapsed - time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    });

    const tolerance = 300; // ms
    const dot = document.getElementById('beat-' + closest);
    if (minDiff <= tolerance) {
      if (dot) dot.classList.add('hit');
      levelState.score++;
      Audio.playSFX('click');
    } else {
      if (dot) dot.classList.add('missed');
      levelState.mistakes++;
    }

    levelState.beatIndex++;
    _updateLevelProgress(levelState.beatIndex, rhythm.length);

    if (levelState.beatIndex >= rhythm.length) {
      levelState.rhythmPlaying = false;
      setTimeout(() => _completeLevel(), 800);
    }
  }

  // ─── Utility ────────────────────────────────────────────
  function _hideGameplayAreas() {
    document.getElementById('highlow-area').classList.add('hidden');
    document.getElementById('rhythm-area').classList.add('hidden');
    document.getElementById('btn-start-rhythm').classList.add('hidden');
  }

  function _showMessage(text) {
    const overlay = document.createElement('div');
    overlay.className = 'encouragement-popup';
    overlay.innerHTML = '<div class="enc-emoji">😊</div><div class="enc-text">' + text + '</div>';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2500);
  }

  // ─── Shop & Achievements shortcuts ─────────────────────
  function openShop() {
    _showScreen(SCREENS.SHOP);
    Rewards.renderShop();
    Rewards.renderMilestones();
    Rewards.renderAchievements();
    Rewards.showTab('shop');
    const shopCoins = document.getElementById('shop-coins');
    if (shopCoins) shopCoins.textContent = Storage.getCoins();
  }

  function openAchievements() {
    _showScreen(SCREENS.SHOP);
    Rewards.renderShop();
    Rewards.renderMilestones();
    Rewards.renderAchievements();
    Rewards.showTab('achievements');
  }

  function closeRewardOverlay() {
    const overlay = document.getElementById('reward-overlay');
    if (overlay) overlay.classList.add('hidden');
    goHome();
  }

  // ─── Public API ─────────────────────────────────────────
  return {
    init,
    goHome,
    startWarmup,
    startPractice,
    openAdventure,
    startLevel,
    nextLevel,
    backToMap,
    openShop,
    openAchievements,
    closeRewardOverlay,
    answerHighLow,
    playHighLowPair,
    startRhythm,
    rhythmTap,
    _warmupComplete, // needed for inline onclick
  };
})();
