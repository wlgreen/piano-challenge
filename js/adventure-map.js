const AdventureMap = (() => {
  // Track current world being viewed
  let currentWorldIdx = 0;

  function isWorldUnlocked(worldIdx) {
    if (worldIdx === 0) return true;
    // Check if all levels in previous world are completed
    const prevWorld = Levels.getWorld(worldIdx - 1);
    if (!prevWorld) return false;
    for (let i = 0; i < prevWorld.levels.length; i++) {
      const result = Storage.getLevelResult(worldIdx - 1, i);
      if (!result || !result.completed) return false;
    }
    return true;
  }

  function isLevelUnlocked(worldIdx, levelIdx) {
    if (!isWorldUnlocked(worldIdx)) return false;
    if (levelIdx === 0) return true;
    const result = Storage.getLevelResult(worldIdx, levelIdx - 1);
    return result && result.completed;
  }

  function getNextLevel() {
    // Find the first incomplete level across all unlocked worlds
    for (let w = 0; w < Levels.getWorldCount(); w++) {
      if (!isWorldUnlocked(w)) break;
      const world = Levels.getWorld(w);
      for (let l = 0; l < world.levels.length; l++) {
        const result = Storage.getLevelResult(w, l);
        if (!result || !result.completed) {
          return { worldIdx: w, levelIdx: l };
        }
      }
    }
    return null; // all completed
  }

  function renderWorldTabs() {
    const container = document.getElementById('world-selector');
    container.innerHTML = '';
    const worldCount = Levels.getWorldCount();
    const progress = Storage.getProgress();

    for (let i = 0; i < worldCount; i++) {
      const world = Levels.getWorld(i);
      const tab = document.createElement('button');
      tab.className = 'world-tab';
      tab.textContent = world.emoji + ' ' + world.name;

      const unlocked = isWorldUnlocked(i);
      if (!unlocked) tab.classList.add('locked');
      if (i === currentWorldIdx) tab.classList.add('active');

      tab.onclick = () => {
        if (unlocked) render(i);
      };
      container.appendChild(tab);
    }
  }

  function renderWorldHeader(worldIdx) {
    const world = Levels.getWorld(worldIdx);
    const header = document.getElementById('world-header');
    header.querySelector('.world-emoji').textContent = world.emoji;
    header.querySelector('.world-name').textContent = world.name;
    header.querySelector('.world-desc').textContent = world.description;
    header.style.background = world.color + '22'; // light tint
  }

  function renderLevelGrid(worldIdx) {
    const container = document.getElementById('level-grid');
    container.innerHTML = '';
    const world = Levels.getWorld(worldIdx);

    world.levels.forEach((level, levelIdx) => {
      const node = document.createElement('div');
      node.className = 'level-node';

      const result = Storage.getLevelResult(worldIdx, levelIdx);
      const unlocked = isLevelUnlocked(worldIdx, levelIdx);

      if (result && result.completed) {
        node.classList.add('completed');
      } else if (unlocked) {
        node.classList.add('current');
      } else {
        node.classList.add('locked');
      }

      // Level number
      const numEl = document.createElement('div');
      numEl.className = 'level-num';
      numEl.textContent = unlocked ? (levelIdx + 1) : '\u{1F512}';

      // Level name
      const nameEl = document.createElement('div');
      nameEl.className = 'level-name';
      nameEl.textContent = level.name;

      // Stars
      const starsEl = document.createElement('div');
      starsEl.className = 'level-stars';
      if (result && result.stars) {
        starsEl.textContent = '\u2B50'.repeat(result.stars) + '\u2606'.repeat(3 - result.stars);
      } else if (unlocked) {
        starsEl.textContent = '\u2606\u2606\u2606';
      }

      node.appendChild(numEl);
      node.appendChild(nameEl);
      node.appendChild(starsEl);

      if (unlocked) {
        node.onclick = () => Game.startLevel(worldIdx, levelIdx);
      }

      container.appendChild(node);
    });
  }

  function render(worldIdx) {
    // Default to last viewed world, or find the current world from progress
    if (worldIdx === undefined || worldIdx === null) {
      const next = getNextLevel();
      if (next) {
        worldIdx = next.worldIdx;
      } else {
        worldIdx = currentWorldIdx;
      }
    }
    currentWorldIdx = worldIdx;

    renderWorldTabs();
    renderWorldHeader(worldIdx);
    renderLevelGrid(worldIdx);
  }

  return {
    render,
    isWorldUnlocked,
    isLevelUnlocked,
    getNextLevel,
    renderLevelGrid,
    get currentWorldIdx() {
      return currentWorldIdx;
    }
  };
})();
