export function initCRTEffect() {
  // CRT effect is handled entirely in CSS via ::after pseudo-element
  // This module handles the toggle
  const toggle = document.getElementById('crt-toggle');
  const terminal = document.getElementById('terminal');

  if (toggle) {
    toggle.addEventListener('click', () => {
      terminal.classList.toggle('no-crt');
      toggle.textContent = terminal.classList.contains('no-crt') ? 'CRT: OFF' : 'CRT: ON';
    });
  }
}
