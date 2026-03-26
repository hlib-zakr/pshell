/**
 * Window management utilities — z-index stacking, focus tracking.
 * Extracted from terminal-manager.js
 */

export let zBase = 100;

/** Central window stack — tracks all windows in focus order */
export const windowStack = [];

/**
 * Bring a window element to the front of the stack and re-assign z-indexes.
 */
export function bringToFront(el) {
  // Remove from current position
  const idx = windowStack.indexOf(el);
  if (idx !== -1) windowStack.splice(idx, 1);
  // Push to top
  windowStack.push(el);
  // Reassign z-indexes based on stack order
  windowStack.forEach((win, i) => {
    win.style.zIndex = zBase + i;
  });
}

/**
 * Register a window element in the stack and wire up click-to-focus.
 */
export function registerWindow(el) {
  if (!windowStack.includes(el)) {
    windowStack.push(el);
  }
  // Click anywhere on the window → bring to front
  el.addEventListener('mousedown', () => {
    bringToFront(el);
  });
  // Set initial z-index
  el.style.zIndex = zBase + windowStack.length;
}

/**
 * Remove a window element from the stack.
 */
export function unregisterWindow(el) {
  const idx = windowStack.indexOf(el);
  if (idx !== -1) windowStack.splice(idx, 1);
}

// Expose globally for other modules (settings, filemanager, notepad, achievements, etc.)
window._bringToFront = (el) => bringToFront(el);
