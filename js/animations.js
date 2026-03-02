/* ============================================================
   Piano Adventure Game - Animation Module
   Provides visual effects for a cheerful children's piano game
   ============================================================ */

const Animations = (() => {
  // Cheerful rainbow palette for confetti and particles
  const COLORS = [
    '#ff6b6b', // coral red
    '#feca57', // sunny yellow
    '#48dbfb', // sky blue
    '#ff9ff3', // pink
    '#54a0ff', // bright blue
    '#5f27cd', // purple
    '#01a3a4', // teal
    '#ff9f43', // orange
    '#ee5a24', // tangerine
    '#2ecc71', // green
  ];

  // Cat emoji map for different states
  const CAT_EMOJIS = {
    idle: '\u{1F63A}',        // smiling cat
    listening: '\u{1F63B}',   // heart-eyes cat
    sleeping: '\u{1F634}',    // sleeping face (using 1F4A4 zzz nearby)
    excited: '\u{1F638}',     // grinning cat
    encouraging: '\u{1F431}', // cat face
  };

  /**
   * Helper: get a random item from an array
   */
  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Helper: random number between min and max
   */
  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Helper: remove a DOM element safely
   */
  function removeEl(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  // -------------------------------------------------------
  // 1. confetti(container, count)
  //    Create colorful confetti pieces that fall and auto-cleanup.
  // -------------------------------------------------------
  function confetti(container, count) {
    if (count === undefined) count = 30;
    const target = container || document.body;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';

      const color = randomFrom(COLORS);
      const left = randomBetween(5, 95);
      const size = randomBetween(6, 14);
      const delay = randomBetween(0, 1.5);
      const duration = randomBetween(2.5, 4);

      piece.style.left = left + '%';
      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      piece.style.backgroundColor = color;
      piece.style.animationDelay = delay + 's';
      piece.style.animationDuration = duration + 's';

      // Alternate shapes: some square, some circle
      if (Math.random() > 0.5) {
        piece.style.borderRadius = '50%';
      }

      target.appendChild(piece);

      // Auto-cleanup after animation ends
      piece.addEventListener('animationend', function () {
        removeEl(piece);
      });
    }
  }

  // -------------------------------------------------------
  // 2. starBurst(x, y, count)
  //    Burst star emojis outward from a point.
  // -------------------------------------------------------
  function starBurst(x, y, count) {
    if (count === undefined) count = 5;

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star-burst';
      star.textContent = '\u2B50'; // star emoji
      star.style.left = x + 'px';
      star.style.top = y + 'px';

      // Spread outward in a circle
      const angle = (Math.PI * 2 * i) / count;
      const distance = randomBetween(40, 100);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      document.body.appendChild(star);

      // Animate outward using a transition
      requestAnimationFrame(function () {
        star.style.transition = 'all 0.8s ease-out';
        star.style.left = (x + dx) + 'px';
        star.style.top = (y + dy) + 'px';
        star.style.opacity = '0';
        star.style.transform = 'scale(1.5)';
      });

      // Cleanup
      setTimeout(function () {
        removeEl(star);
      }, 1000);
    }
  }

  // -------------------------------------------------------
  // 3. coinFly(fromEl, toEl)
  //    Animate a coin emoji from one element to another.
  // -------------------------------------------------------
  function coinFly(fromEl, toEl) {
    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const coin = document.createElement('div');
    coin.className = 'coin-fly';
    coin.textContent = '\u{1FA99}'; // coin emoji

    // Start at fromEl center
    coin.style.left = (fromRect.left + fromRect.width / 2) + 'px';
    coin.style.top = (fromRect.top + fromRect.height / 2) + 'px';

    document.body.appendChild(coin);

    // Animate to toEl center
    requestAnimationFrame(function () {
      coin.style.left = (toRect.left + toRect.width / 2) + 'px';
      coin.style.top = (toRect.top + toRect.height / 2) + 'px';
      coin.style.transform = 'scale(0.3) rotateY(720deg)';
      coin.style.opacity = '0.5';
    });

    // Cleanup
    setTimeout(function () {
      removeEl(coin);
    }, 700);
  }

  // -------------------------------------------------------
  // 4. showAchievement(name, emoji)
  //    Display an achievement banner at the top of the screen.
  // -------------------------------------------------------
  function showAchievement(name, emoji) {
    // Remove any existing achievement banner
    var existing = document.querySelector('.achievement-banner');
    if (existing) {
      removeEl(existing);
    }

    var banner = document.createElement('div');
    banner.className = 'achievement-banner';
    banner.textContent = (emoji || '\u{1F3C6}') + ' ' + name;

    document.body.appendChild(banner);

    // Auto-dismiss after the animation (3.5s in CSS)
    setTimeout(function () {
      removeEl(banner);
    }, 3500);
  }

  // -------------------------------------------------------
  // 5. celebrateLevel(stars)
  //    Full celebration: confetti + star burst + fanfare sound.
  // -------------------------------------------------------
  function celebrateLevel(stars) {
    var starCount = stars || 3;

    // Trigger confetti
    confetti(document.body, 40);

    // Star bursts at center of viewport
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;
    starBurst(cx, cy, starCount * 3);

    // Delayed additional bursts for extra flair
    setTimeout(function () {
      starBurst(cx - 100, cy - 50, starCount);
      starBurst(cx + 100, cy - 50, starCount);
    }, 300);

    // Play fanfare sound if Audio module is available
    if (typeof Audio !== 'undefined' && Audio && typeof Audio.playSFX === 'function') {
      Audio.playSFX('fanfare');
    }
  }

  // -------------------------------------------------------
  // 6. melodyCat(container, state)
  //    Render or update the Melody cat character.
  //    States: idle, listening, sleeping, excited, encouraging
  // -------------------------------------------------------
  function melodyCat(container, state) {
    if (!container) return null;

    var catState = state || 'idle';
    var catEl = container.querySelector('.melody-cat');

    if (!catEl) {
      // Create the cat element
      catEl = document.createElement('div');
      catEl.className = 'melody-cat';
      container.appendChild(catEl);
    }

    // Set the appropriate emoji for the state
    var emoji = CAT_EMOJIS[catState] || CAT_EMOJIS.idle;
    catEl.textContent = emoji;

    // Remove all state classes
    catEl.classList.remove('listening', 'sleeping', 'excited');

    // Apply state class
    if (catState === 'listening') {
      catEl.classList.add('listening');
    } else if (catState === 'sleeping') {
      catEl.classList.add('sleeping');
    } else if (catState === 'excited') {
      catEl.classList.add('excited');
    }

    // For encouraging state, add a brief speech bubble
    if (catState === 'encouraging') {
      var encouragements = [
        'You can do it!',
        'Try again!',
        'Almost there!',
        'Keep going!',
        'You\'re doing great!',
      ];
      var msg = randomFrom(encouragements);
      showSpeechBubble(container, msg, 2500);
    }

    return catEl;
  }

  // -------------------------------------------------------
  // 7. showSpeechBubble(container, text, duration)
  //    Show a speech bubble near the cat, auto-dismiss.
  // -------------------------------------------------------
  function showSpeechBubble(container, text, duration) {
    if (!container) return;
    var dur = duration !== undefined ? duration : 3000;

    // Remove any existing speech bubble in this container
    var existing = container.querySelector('.speech-bubble');
    if (existing) {
      removeEl(existing);
    }

    var bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;

    // Position relative to container
    container.style.position = container.style.position || 'relative';
    bubble.style.bottom = '100%';
    bubble.style.left = '10px';
    bubble.style.marginBottom = '8px';

    container.appendChild(bubble);

    // Auto-dismiss
    setTimeout(function () {
      if (bubble.parentNode) {
        bubble.style.transition = 'opacity 0.3s ease';
        bubble.style.opacity = '0';
        setTimeout(function () {
          removeEl(bubble);
        }, 300);
      }
    }, dur);

    return bubble;
  }

  // -------------------------------------------------------
  // 8. particleExplosion(x, y, color, count)
  //    Generic particle explosion effect.
  // -------------------------------------------------------
  function particleExplosion(x, y, color, count) {
    var particleCount = count !== undefined ? count : 15;
    var particleColor = color || randomFrom(COLORS);

    for (var i = 0; i < particleCount; i++) {
      var particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.backgroundColor = particleColor;
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';

      var size = randomBetween(4, 10);
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';

      document.body.appendChild(particle);

      // Each particle flies in a random direction
      var angle = (Math.PI * 2 * i) / particleCount + randomBetween(-0.3, 0.3);
      var distance = randomBetween(30, 120);
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance;
      var dur = randomBetween(0.4, 0.9);

      // Use an IIFE to capture per-particle values
      (function (p, pdx, pdy, pdur) {
        requestAnimationFrame(function () {
          p.style.transition = 'all ' + pdur + 's ease-out';
          p.style.left = (x + pdx) + 'px';
          p.style.top = (y + pdy) + 'px';
          p.style.opacity = '0';
          p.style.transform = 'scale(0.2)';
        });

        setTimeout(function () {
          removeEl(p);
        }, pdur * 1000 + 100);
      })(particle, dx, dy, dur);
    }
  }

  // -------------------------------------------------------
  // 9. progressFill(el, percent)
  //    Animate a progress bar fill to the given percentage.
  // -------------------------------------------------------
  function progressFill(el, percent) {
    if (!el) return;

    var pct = Math.max(0, Math.min(100, percent));

    // Look for the fill child, or style the element directly
    var fill = el.querySelector('.progress-fill');
    if (!fill) {
      fill = el;
    }

    // Set CSS custom property and width
    fill.style.setProperty('--fill-percent', pct + '%');
    fill.style.width = pct + '%';
  }

  // -------------------------------------------------------
  // 10. screenTransition(hideId, showId)
  //     Hide one screen div, show another with animation.
  // -------------------------------------------------------
  function screenTransition(hideId, showId) {
    var hideScreen = document.getElementById(hideId);
    var showScreen = document.getElementById(showId);

    if (hideScreen) {
      hideScreen.classList.remove('active');
      // Small delay so the fade-out can be perceived
      setTimeout(function () {
        hideScreen.style.display = 'none';
      }, 50);
    }

    if (showScreen) {
      // Brief delay to allow the hide to take effect
      setTimeout(function () {
        showScreen.style.display = 'block';
        showScreen.classList.add('active');
      }, 100);
    }
  }

  // -------------------------------------------------------
  // Public API
  // -------------------------------------------------------
  return {
    confetti: confetti,
    starBurst: starBurst,
    coinFly: coinFly,
    showAchievement: showAchievement,
    celebrateLevel: celebrateLevel,
    melodyCat: melodyCat,
    showSpeechBubble: showSpeechBubble,
    particleExplosion: particleExplosion,
    progressFill: progressFill,
    screenTransition: screenTransition,
  };
})();
