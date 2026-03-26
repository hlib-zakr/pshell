import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx, findHandler, runCommand } from '../helpers/mock-ctx.js';
import { gameCommands } from '../../src/commands/game.js';

// Set up window global for the terminals command
globalThis.window = globalThis.window || {};
globalThis.window._selectedTerminals = undefined;

describe('gameCommands', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
    globalThis.window._selectedTerminals = undefined;
  });

  // ── play ──

  describe('play', () => {
    it('calls onPlay callback', async () => {
      let called = false;
      ctx = createMockCtx({ onPlay: () => { called = true; } });
      await runCommand(gameCommands, 'play', ctx);
      expect(called).toBe(true);
    });

    it('play 4 calls onPlay with termCount=4', async () => {
      let received = null;
      ctx = createMockCtx({ onPlay: (n) => { received = n; } });
      await runCommand(gameCommands, 'play 4', ctx);
      expect(received).toBe(4);
    });

    it('play 0 clamps to 1', async () => {
      let received = null;
      ctx = createMockCtx({ onPlay: (n) => { received = n; } });
      await runCommand(gameCommands, 'play 0', ctx);
      expect(received).toBe(1);
    });

    it('play 5 clamps to 4', async () => {
      let received = null;
      ctx = createMockCtx({ onPlay: (n) => { received = n; } });
      await runCommand(gameCommands, 'play 5', ctx);
      expect(received).toBe(4);
    });

    it('play without onPlay shows "main terminal only" message', async () => {
      ctx = createMockCtx({ onPlay: undefined });
      await runCommand(gameCommands, 'play', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain('main terminal');
    });
  });

  // ── tutorial ──

  describe('tutorial', () => {
    it('calls onTutorial callback', async () => {
      let called = false;
      ctx = createMockCtx({ onTutorial: () => { called = true; } });
      await runCommand(gameCommands, 'tutorial', ctx);
      expect(called).toBe(true);
    });

    it('tutorial without onTutorial shows error', async () => {
      ctx = createMockCtx({ onTutorial: undefined });
      await runCommand(gameCommands, 'tutorial', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain('main terminal');
    });
  });

  // ── terminals ──

  describe('terminals', () => {
    it('terminals 3 sets window._selectedTerminals to 3', async () => {
      await runCommand(gameCommands, 'terminals 3', ctx);
      expect(globalThis.window._selectedTerminals).toBe(3);
    });

    it('terminals 0 clamps to 1', async () => {
      await runCommand(gameCommands, 'terminals 0', ctx);
      expect(globalThis.window._selectedTerminals).toBe(1);
    });
  });
});
