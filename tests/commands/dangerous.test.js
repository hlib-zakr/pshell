import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx, findHandler, runCommand } from '../helpers/mock-ctx.js';
import { dangerousCommands } from '../../src/commands/dangerous.js';

describe('dangerousCommands', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe('rm -rf /', () => {
    it('increments rmCount', async () => {
      expect(ctx.state.rmCount).toBe(0);
      const handler = findHandler(dangerousCommands, 'rm -rf /');
      await handler.handler('rm -rf /', ctx);
      expect(ctx.state.rmCount).toBe(1);
      // Run again to verify it keeps incrementing
      ctx.lines.length = 0;
      await handler.handler('rm -rf /', ctx);
      expect(ctx.state.rmCount).toBe(2);
    });
  });

  describe('sudo', () => {
    it('increments sudoCount', async () => {
      expect(ctx.state.sudoCount).toBe(0);
      const handler = findHandler(dangerousCommands, 'sudo something');
      await handler.handler('sudo something', ctx);
      expect(ctx.state.sudoCount).toBe(1);
      const output = ctx.lines.find(l => l.text.includes('already root'));
      expect(output).toBeDefined();
    });
  });

  describe('kill -9 1', () => {
    it('sets kernelPanic to true', async () => {
      expect(ctx.state.sim.processes.kernelPanic).toBe(false);
      await runCommand(dangerousCommands, 'kill -9 1', ctx);
      expect(ctx.state.sim.processes.kernelPanic).toBe(true);
      const panicLine = ctx.lines.find(l => l.text.includes('Kernel panic'));
      expect(panicLine).toBeDefined();
    });
  });

  describe('kill <pid>', () => {
    it('adds the pid to killedPids', async () => {
      ctx.rawCmd = 'kill 420';
      const handler = findHandler(dangerousCommands, 'kill 420');
      await handler.handler('kill 420', ctx);
      expect(ctx.state.sim.processes.killedPids.has(420)).toBe(true);
      // kill is silent on success (no terminal output)
      const output = ctx.lines.filter(l => l.text && l.text.trim());
      expect(output.length).toBe(0);
    });

    it('shows error when killing an already-killed process', async () => {
      ctx.state.sim.processes.killedPids.add(420);
      ctx.rawCmd = 'kill 420';
      const handler = findHandler(dangerousCommands, 'kill 420');
      await handler.handler('kill 420', ctx);
      const errorLine = ctx.lines.find(l => l.text.includes('already killed'));
      expect(errorLine).toBeDefined();
    });
  });
});
