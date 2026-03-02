// piano-ui.js — DOM piano keyboard rendering & interaction
'use strict';

const PianoUI = (() => {
  // Note definitions for two octaves C4–B5
  const KEYS = [
    { note: 'C4', name: 'C', black: false },
    { note: 'C#4', name: 'C#', black: true },
    { note: 'D4', name: 'D', black: false },
    { note: 'D#4', name: 'D#', black: true },
    { note: 'E4', name: 'E', black: false },
    { note: 'F4', name: 'F', black: false },
    { note: 'F#4', name: 'F#', black: true },
    { note: 'G4', name: 'G', black: false },
    { note: 'G#4', name: 'G#', black: true },
    { note: 'A4', name: 'A', black: false },
    { note: 'A#4', name: 'A#', black: true },
    { note: 'B4', name: 'B', black: false },
    { note: 'C5', name: 'C', black: false },
    { note: 'C#5', name: 'C#', black: true },
    { note: 'D5', name: 'D', black: false },
    { note: 'D#5', name: 'D#', black: true },
    { note: 'E5', name: 'E', black: false },
    { note: 'F5', name: 'F', black: false },
    { note: 'F#5', name: 'F#', black: true },
    { note: 'G5', name: 'G', black: false },
    { note: 'G#5', name: 'G#', black: true },
    { note: 'A5', name: 'A', black: false },
    { note: 'A#5', name: 'A#', black: true },
    { note: 'B5', name: 'B', black: false },
  ];

  let containerEl = null;
  let keyElements = {};
  let onKeyPress = null;
  let onKeyRelease = null;
  let activePointers = new Map();
  let enabledKeys = null; // null = all enabled
  let colorMode = true;

  function render(containerId, options) {
    options = options || {};
    containerEl = document.getElementById(containerId);
    if (!containerEl) return;

    const range = options.range || KEYS;
    onKeyPress = options.onKeyPress || null;
    onKeyRelease = options.onKeyRelease || null;
    colorMode = options.colorMode !== false;

    containerEl.innerHTML = '';
    containerEl.classList.add('piano-container');

    const keyboard = document.createElement('div');
    keyboard.className = 'piano-keyboard' + (colorMode ? ' color-mode' : '');
    keyboard.setAttribute('role', 'group');
    keyboard.setAttribute('aria-label', '钢琴键盘');

    keyElements = {};
    range.forEach(keyDef => {
      const key = document.createElement('div');
      key.className = 'piano-key' + (keyDef.black ? ' black' : '');
      key.dataset.note = keyDef.note;
      key.dataset.noteName = keyDef.name.replace('#', '');
      key.setAttribute('role', 'button');
      key.setAttribute('aria-label', keyDef.note);

      const label = document.createElement('span');
      label.className = 'key-label';
      label.textContent = keyDef.name;
      key.appendChild(label);

      keyboard.appendChild(key);
      keyElements[keyDef.note] = key;
    });

    containerEl.appendChild(keyboard);

    // Pointer event handling (works for touch + mouse)
    keyboard.addEventListener('pointerdown', _onPointerDown, { passive: false });
    keyboard.addEventListener('pointermove', _onPointerMove, { passive: false });
    keyboard.addEventListener('pointerup', _onPointerUp);
    keyboard.addEventListener('pointercancel', _onPointerUp);
    keyboard.addEventListener('pointerleave', _onPointerUp);

    // Prevent context menu on long press
    keyboard.addEventListener('contextmenu', e => e.preventDefault());
  }

  function _onPointerDown(e) {
    e.preventDefault();
    Audio.handleFirstTouch();
    const key = _findKey(e.target);
    if (!key) return;
    key.setPointerCapture(e.pointerId);
    _activateKey(key, e.pointerId);
  }

  function _onPointerMove(e) {
    // Allow sliding between keys
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const key = _findKey(el);
    const prevNote = activePointers.get(e.pointerId);
    if (key) {
      const note = key.dataset.note;
      if (prevNote !== note) {
        if (prevNote) _deactivateKey(prevNote, e.pointerId);
        _activateKey(key, e.pointerId);
      }
    }
  }

  function _onPointerUp(e) {
    const note = activePointers.get(e.pointerId);
    if (note) _deactivateKey(note, e.pointerId);
  }

  function _findKey(el) {
    while (el && !el.classList?.contains('piano-key')) {
      el = el.parentElement;
    }
    return el;
  }

  function _activateKey(keyEl, pointerId) {
    const note = keyEl.dataset.note;
    if (enabledKeys && !enabledKeys.includes(note)) return;
    if (keyEl.classList.contains('disabled')) return;

    keyEl.classList.add('active');
    activePointers.set(pointerId, note);
    Audio.playNote(note);
    if (onKeyPress) onKeyPress(note);
  }

  function _deactivateKey(note, pointerId) {
    activePointers.delete(pointerId);
    const el = keyElements[note];
    if (el) el.classList.remove('active');
    if (onKeyRelease) onKeyRelease(note);
  }

  // ─── Public API ─────────────────────────────────────────

  function highlightKey(note) {
    const el = keyElements[note];
    if (el) el.classList.add('highlight');
  }

  function clearHighlight(note) {
    if (note) {
      const el = keyElements[note];
      if (el) el.classList.remove('highlight');
    } else {
      Object.values(keyElements).forEach(el => el.classList.remove('highlight'));
    }
  }

  function showCorrect(note) {
    const el = keyElements[note];
    if (el) {
      el.classList.add('correct');
      setTimeout(() => el.classList.remove('correct'), 500);
    }
  }

  function showWrong(note) {
    const el = keyElements[note];
    if (el) {
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 400);
    }
  }

  function setEnabledKeys(keys) {
    enabledKeys = keys; // null = all, or array of note strings
    Object.entries(keyElements).forEach(([note, el]) => {
      if (keys && !keys.includes(note)) {
        el.classList.add('disabled');
      } else {
        el.classList.remove('disabled');
      }
    });
  }

  function setOnKeyPress(fn) { onKeyPress = fn; }
  function setOnKeyRelease(fn) { onKeyRelease = fn; }

  function getKeyElement(note) { return keyElements[note]; }

  function getAllNotes() { return KEYS.map(k => k.note); }

  function getWhiteNotes() { return KEYS.filter(k => !k.black).map(k => k.note); }

  function getRange(startNote, endNote) {
    const startIdx = KEYS.findIndex(k => k.note === startNote);
    const endIdx = KEYS.findIndex(k => k.note === endNote);
    if (startIdx < 0 || endIdx < 0) return KEYS;
    return KEYS.slice(startIdx, endIdx + 1);
  }

  function destroy() {
    if (containerEl) containerEl.innerHTML = '';
    keyElements = {};
    activePointers.clear();
    onKeyPress = null;
    onKeyRelease = null;
    enabledKeys = null;
  }

  return {
    KEYS,
    render,
    highlightKey,
    clearHighlight,
    showCorrect,
    showWrong,
    setEnabledKeys,
    setOnKeyPress,
    setOnKeyRelease,
    getKeyElement,
    getAllNotes,
    getWhiteNotes,
    getRange,
    destroy,
  };
})();
