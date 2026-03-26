// Konami code: ↑↑↓↓←→←→BA
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;
let konamiActivated = false;

export function initKeyboard(gameEngine) {
  if (isMobile()) {
    showMobileMessage();
    return;
  }

  // Separate listener for Konami — never blocked by any other handler
  document.addEventListener('keydown', (event) => {
    if (event.key === KONAMI[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === KONAMI.length) {
        konamiIndex = 0;
        if (!konamiActivated) {
          konamiActivated = true;
          activateKonami();
        }
      }
    } else {
      konamiIndex = event.key === KONAMI[0] ? 1 : 0;
    }
  });

  document.addEventListener('keydown', (event) => {
    // Ignore input when app is closed
    if (!gameEngine.isOpen) return;

    // In SHELL or NAME_ENTRY state, let the prompt input handle all keys
    if (gameEngine.state === 'SHELL' || gameEngine.state === 'NAME_ENTRY') {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const input = document.querySelector('.main-prompt-line .about-cmd-input');
        if (input) { input.value = ''; }
        return;
      }
      return; // let prompt input handle everything else
    }

    // Block game input only when about window's input is focused
    const aboutWin = document.getElementById('about-window');
    if (aboutWin && (event.target.closest('#about-window') || document.activeElement?.closest('#about-window'))) return;

    // Ctrl+C or Cmd+C
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      event.preventDefault();
      event.stopPropagation();

      if (gameEngine.state === 'PLAYING' || gameEngine.state === 'TUTORIAL') {
        gameEngine.handleCtrlC();
      }
      return;
    }

    // Enter key
    if (event.key === 'Enter') {
      // During gameplay: start terminals waiting for Enter
      if (gameEngine.state === 'PLAYING' || gameEngine.state === 'TUTORIAL') {
        if (gameEngine.handleEnter()) return;
      }

      if (gameEngine.state === 'MENU' && gameEngine.menuReady) {
        gameEngine.sounds.init();
        gameEngine.transition('PLAYING');
        return;
      }

      if (gameEngine.state === 'LEADERBOARD') {
        gameEngine.transition('SHELL');
        return;
      }
    }

    // 1-4 keys to focus terminals during gameplay
    if ((gameEngine.state === 'PLAYING' || gameEngine.state === 'TUTORIAL') &&
        ['1', '2', '3', '4'].includes(event.key)) {
      const index = parseInt(event.key) - 1;
      gameEngine.focusTerminal(index);
      return;
    }

    // R key for retry during game over animation (before shell prompt appears)
    if ((event.key === 'r' || event.key === 'R') && gameEngine.state === 'GAME_OVER') {
      gameEngine.autoSubmitAndRetry();
      return;
    }
  });

  window.addEventListener('blur', () => {
    // Could implement pause here if desired
  });
}

function activateKonami() {
  // Achievement
  if (window._unlockAchievement) window._unlockAchievement('konami');

  // Rainbow mode — cycle through colors
  const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff41', '#00ccff', '#8800ff', '#ff00ff'];
  let colorIdx = 0;
  const root = document.documentElement;

  const interval = setInterval(() => {
    root.style.setProperty('--term-green', colors[colorIdx % colors.length]);
    root.style.setProperty('--term-bright-green', colors[(colorIdx + 1) % colors.length]);
    colorIdx++;
  }, 200);

  // Matrix rain goes rainbow too
  if (window._matrixRain) {
    const origDraw = window._matrixRain._draw.bind(window._matrixRain);
    window._matrixRain.color = colors[0];
    let mIdx = 0;
    const matrixInterval = setInterval(() => {
      window._matrixRain.color = colors[mIdx % colors.length];
      mIdx++;
    }, 300);

    // Stop after 10 seconds
    setTimeout(() => {
      clearInterval(matrixInterval);
      window._matrixRain.color = '#00ff41';
    }, 10000);
  }

  // Show toast
  const { showToast } = window._notifications || {};
  if (typeof window._showToast === 'function') {
    window._showToast('KONAMI CODE ACTIVATED', 'Rainbow mode for 10 seconds!');
  }

  // Notification via import
  import('../ui/notifications.js').then(({ showToast }) => {
    showToast('KONAMI CODE ACTIVATED', 'Rainbow mode! ↑↑↓↓←→←→BA');
  }).catch(() => {});

  // Revert after 10 seconds
  setTimeout(() => {
    clearInterval(interval);
    // Restore from settings or default
    try {
      const saved = JSON.parse(localStorage.getItem('pshell_settings'));
      if (saved && saved.theme) {
        const themes = {
          green: ['#00ff41', '#33ff66'], amber: ['#ffb000', '#ffc833'],
          cyan: ['#00e5ff', '#33ecff'], red: ['#ff3333', '#ff6666'],
          purple: ['#bf5af2', '#d17ff5'], white: ['#cccccc', '#ffffff'],
        };
        const t = themes[saved.theme] || themes.green;
        root.style.setProperty('--term-green', t[0]);
        root.style.setProperty('--term-bright-green', t[1]);
      } else {
        root.style.setProperty('--term-green', '#00ff41');
        root.style.setProperty('--term-bright-green', '#33ff66');
      }
    } catch {
      root.style.setProperty('--term-green', '#00ff41');
      root.style.setProperty('--term-bright-green', '#33ff66');
    }
    konamiActivated = false;
  }, 10000);
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches);
}

function showMobileMessage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="terminal" class="mobile-terminal">
      <div id="terminal-header">
        <div class="header-left">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span class="title">user@pshell:~$</span>
      </div>
      <div id="terminal-body">
        <div id="lines-container">
          <div class="line command"><span class="prompt">$ </span>./pshell</div>
          <div class="line blank">&nbsp;</div>
          <div class="line danger-text">  ERROR: Terminal requires a physical keyboard.</div>
          <div class="line blank">&nbsp;</div>
          <div class="line menu-text">  This game uses Ctrl+C to interrupt</div>
          <div class="line menu-text">  dangerous commands.</div>
          <div class="line blank">&nbsp;</div>
          <div class="line menu-text">  Please visit on a desktop computer.</div>
          <div class="line blank">&nbsp;</div>
          <div class="line dimmed">  [Process exited with code 1]</div>
        </div>
      </div>
    </div>
  `;
}
