import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx, findHandler, runCommand } from '../helpers/mock-ctx.js';
import { systemCommands } from '../../src/commands/system.js';

describe('systemCommands', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  // ── exit ──

  describe('exit', () => {
    it('shows "can\'t escape" on main terminal', async () => {
      ctx = createMockCtx({ isMainTerminal: true });
      await runCommand(systemCommands, 'exit', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain("can't escape");
    });

    it('shows disconnect message on non-main terminal', async () => {
      ctx = createMockCtx({ isMainTerminal: false });
      await runCommand(systemCommands, 'exit', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain('Disconnecting');
    });
  });

  // ── clear ──

  describe('clear', () => {
    it('clears the terminal', async () => {
      // Add some lines first
      ctx.term.addLine('noise', 'about-text');
      expect(ctx.lines.length).toBe(1);
      await runCommand(systemCommands, 'clear', ctx);
      expect(ctx.lines.length).toBe(0);
    });
  });

  // ── systemctl ──

  describe('systemctl', () => {
    it('systemctl status nginx shows service info', async () => {
      await runCommand(systemCommands, 'systemctl status nginx', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain('nginx.service');
      expect(text).toContain('active (running)');
    });

    it('systemctl stop nginx sets active=false and syncs docker container', async () => {
      await runCommand(systemCommands, 'systemctl stop nginx', ctx);
      expect(ctx.state.sim.services.nginx.active).toBe(false);
      expect(ctx.state.sim.docker.containers.nginx.status).toBe('exited');
    });

    it('systemctl start nginx sets active=true and syncs docker container', async () => {
      // Stop first, then start
      ctx.state.sim.services.nginx.active = false;
      ctx.state.sim.docker.containers.nginx.status = 'exited';
      ctx.state.sim.docker.containers.nginx.manuallyStopped = true;
      await runCommand(systemCommands, 'systemctl start nginx', ctx);
      expect(ctx.state.sim.services.nginx.active).toBe(true);
      expect(ctx.state.sim.docker.containers.nginx.status).toBe('running');
    });

    it('systemctl stop postgres sets sql.connected=false', async () => {
      expect(ctx.state.sim.sql.connected).toBe(true);
      await runCommand(systemCommands, 'systemctl stop postgres', ctx);
      expect(ctx.state.sim.sql.connected).toBe(false);
    });

    it('bare systemctl shows all services', async () => {
      await runCommand(systemCommands, 'systemctl', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain('nginx');
      expect(text).toContain('postgres');
      expect(text).toContain('redis');
    });
  });

  // ── service ──

  describe('service', () => {
    it('service unknown shows "unrecognized service"', async () => {
      await runCommand(systemCommands, 'service unknown', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain('unrecognized service');
    });
  });

  // ── crontab ──

  describe('crontab -l', () => {
    it('shows cron entries from state', async () => {
      await runCommand(systemCommands, 'crontab -l', ctx);
      const text = ctx.lines.map(l => l.text).join('\n');
      expect(text).toContain('backup.sh');
      expect(text).toContain('0 3 * * *');
    });
  });
});
