let menuEl = null;

const MENUS = {
  desktop: [
    { label: 'New Terminal', icon: '>_', action: 'new-terminal' },
    { type: 'separator' },
    { label: 'About', icon: '?', action: 'about' },
    { label: 'Settings', icon: '#', action: 'settings' },
    { label: 'Notepad', icon: '=', action: 'notepad' },
    { label: 'Files', icon: '/', action: 'files' },
    { type: 'separator' },
    { label: 'Toggle CRT', action: 'toggle-crt' },
    { label: 'Toggle Matrix', action: 'toggle-matrix' },
  ],
  windowHeader: [
    { label: 'Bring to Front', action: 'bring-front' },
    { type: 'separator' },
    { label: 'Minimize', action: 'minimize' },
    { label: 'Maximize', action: 'maximize' },
    { type: 'separator' },
    { label: 'Close', action: 'close', danger: true },
  ],
  terminalBody: [
    { label: 'Copy', action: 'copy' },
    { label: 'Select All', action: 'select-all' },
    { type: 'separator' },
    { label: 'Clear', action: 'clear' },
  ],
  icon: [
    { label: 'Open', action: 'open-icon' },
  ],
};

export function initContextMenu(handlers) {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    dismiss();

    // Determine context
    const icon = e.target.closest('.desktop-icon');
    const header = e.target.closest('.gt-header, #terminal-header');
    const body = e.target.closest('.gt-body, #terminal-body');
    const win = e.target.closest('.game-terminal, #terminal, .about-window');

    let items;
    let context = { target: e.target, win };

    if (icon) {
      items = MENUS.icon;
      context.icon = icon;
    } else if (header && win) {
      items = MENUS.windowHeader;
    } else if (body && win) {
      items = MENUS.terminalBody;
    } else {
      items = MENUS.desktop;
    }

    show(e.clientX, e.clientY, items, context, handlers);
  });

  document.addEventListener('click', dismiss);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dismiss();
  });
}

function show(x, y, items, context, handlers) {
  menuEl = document.createElement('div');
  menuEl.className = 'context-menu';

  for (const item of items) {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'ctx-separator';
      menuEl.appendChild(sep);
      continue;
    }

    const row = document.createElement('div');
    row.className = `ctx-item${item.danger ? ' ctx-danger' : ''}`;

    if (item.icon) {
      row.innerHTML = `<span class="ctx-icon">${item.icon}</span>${item.label}`;
    } else {
      row.textContent = item.label;
    }

    row.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
      if (handlers[item.action]) {
        handlers[item.action](context);
      }
    });

    menuEl.appendChild(row);
  }

  // Position — keep within viewport
  document.body.appendChild(menuEl);
  const rect = menuEl.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
  menuEl.style.left = x + 'px';
  menuEl.style.top = y + 'px';
}

function dismiss() {
  if (menuEl) {
    menuEl.remove();
    menuEl = null;
  }
}
