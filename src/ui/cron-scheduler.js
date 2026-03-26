/**
 * Cron job simulation — periodically shows toast notifications
 * for random crontab entries from the about-window simulation state.
 * Extracted from terminal-manager.js
 */

import { showToast } from './notifications.js';

const CRON_INTERVAL_MS = 15000;

/**
 * Start the cron simulation interval.
 * Returns the interval ID so the caller can store / clear it.
 *
 * @param {object}      aboutState       The _aboutState object (must have .sim.crontab)
 * @param {number|null} existingInterval  A previous interval ID to clear first (or null)
 * @returns {number}    The new setInterval ID
 */
export function startCronInterval(aboutState, existingInterval) {
  // Clear any existing interval first
  if (existingInterval) clearInterval(existingInterval);

  return setInterval(() => {
    const crontab = aboutState?.sim?.crontab;
    if (!crontab || crontab.length === 0) return;
    const job = crontab[Math.floor(Math.random() * crontab.length)];
    showToast('[cron]', job.command, 'info');
  }, CRON_INTERVAL_MS);
}

/**
 * Stop the cron simulation interval.
 *
 * @param {number|null} intervalId  The interval ID to clear
 */
export function stopCronInterval(intervalId) {
  if (intervalId) clearInterval(intervalId);
}
