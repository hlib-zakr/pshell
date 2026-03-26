import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx, findHandler, runCommand } from '../helpers/mock-ctx.js';
import { dockerCommands } from '../../src/commands/docker.js';
import { sqlCommands } from '../../src/commands/sql.js';
import { dangerousCommands } from '../../src/commands/dangerous.js';
import { funCommands } from '../../src/commands/fun.js';
import { systemCommands } from '../../src/commands/system.js';
import { fsCommands } from '../../src/commands/fs.js';
import { gitCommands } from '../../src/commands/git.js';

// Set up window global for browser-dependent code
globalThis.window = globalThis.window || {};
globalThis.window._unlockAchievement = undefined;

describe('Cross-system state cascades', () => {

  // ── Test 1: Docker -> SQL cascade ──

  describe('Docker -> SQL cascade', () => {
    let ctx;

    beforeEach(() => {
      ctx = createMockCtx();
    });

    it('docker stop postgres disconnects SQL, docker start reconnects', async () => {
      // Stop postgres via docker
      await runCommand(dockerCommands, 'docker stop postgres', ctx);
      expect(ctx.state.sim.sql.connected).toBe(false);

      // psql should show connection refused
      ctx.lines.length = 0;
      await runCommand(sqlCommands, 'psql', ctx);
      const refusedText = ctx.lines.map(l => l.text).join('\n');
      expect(refusedText).toContain('Connection refused');

      // Start postgres via docker
      ctx.lines.length = 0;
      await runCommand(dockerCommands, 'docker start postgres', ctx);
      expect(ctx.state.sim.sql.connected).toBe(true);

      // psql should work now
      ctx.lines.length = 0;
      await runCommand(sqlCommands, 'psql', ctx);
      const connectedText = ctx.lines.map(l => l.text).join('\n');
      expect(connectedText).not.toContain('Connection refused');
    });
  });

  // ── Test 2: Kill -> Kernel Panic -> Reboot ──

  describe('Kill -> Kernel Panic -> Reboot', () => {
    let ctx;

    beforeEach(() => {
      ctx = createMockCtx();
    });

    it('kill -9 1 causes kernel panic, reboot recovers everything', async () => {
      // Kill init
      await runCommand(dangerousCommands, 'kill -9 1', ctx);
      expect(ctx.state.sim.processes.kernelPanic).toBe(true);

      // Reboot should recover
      ctx.lines.length = 0;
      await runCommand(funCommands, 'reboot', ctx);
      expect(ctx.state.sim.processes.kernelPanic).toBe(false);
      expect(ctx.state.sim.processes.killedPids.size).toBe(0);

      // All containers should be running
      for (const c of Object.values(ctx.state.sim.docker.containers)) {
        expect(c.status).toBe('running');
      }

      // K8s pods restored
      expect(ctx.state.sim.k8s.deletedPods.size).toBe(0);

      // All services active
      for (const s of Object.values(ctx.state.sim.services)) {
        expect(s.active).toBe(true);
      }
    });
  });

  // ── Test 3: Systemctl -> Docker sync ──

  describe('Systemctl -> Docker sync', () => {
    let ctx;

    beforeEach(() => {
      ctx = createMockCtx();
    });

    it('systemctl stop nginx stops docker container, systemctl start restores it', async () => {
      // Stop via systemctl
      await runCommand(systemCommands, 'systemctl stop nginx', ctx);
      expect(ctx.state.sim.docker.containers.nginx.status).toBe('exited');

      // Start via systemctl
      ctx.lines.length = 0;
      await runCommand(systemCommands, 'systemctl start nginx', ctx);
      expect(ctx.state.sim.docker.containers.nginx.status).toBe('running');
    });
  });

  // ── Test 4: File lifecycle ──

  describe('File lifecycle: touch -> git status -> git add -> git commit -> git log', () => {
    let ctx;

    beforeEach(() => {
      ctx = createMockCtx();
    });

    it('full file lifecycle through git', async () => {
      // touch file.txt
      await runCommand(fsCommands, 'touch file.txt', ctx);

      // git status should show modified
      ctx.lines.length = 0;
      await runCommand(gitCommands, 'git status', ctx);
      const statusBeforeAdd = ctx.lines.map(l => l.text).join('\n');
      expect(statusBeforeAdd).toContain('file.txt');
      expect(statusBeforeAdd).toContain('modified');

      // git add file.txt (silent on success)
      ctx.lines.length = 0;
      await runCommand(gitCommands, 'git add file.txt', ctx);
      expect(ctx.state.sim.git.staged).toContain('file.txt');

      // git status should show staged file
      ctx.lines.length = 0;
      await runCommand(gitCommands, 'git status', ctx);
      const statusAfterAdd = ctx.lines.map(l => l.text).join('\n');
      expect(statusAfterAdd).toContain('file.txt');
      expect(statusAfterAdd).toContain('Changes to be committed');

      // git commit
      ctx.lines.length = 0;
      await runCommand(gitCommands, 'git commit -m "add file"', ctx);
      const commitText = ctx.lines.map(l => l.text).join('\n');
      expect(commitText).toContain('add file');
      expect(commitText).toContain('1 file changed');

      // Verify commit exists in state (git log uses DOM directly, can't check output in mock)
      const commits = ctx.state.sim.git.commits.filter(c => c.branch === 'main');
      expect(commits.some(c => c.msg === 'add file')).toBe(true);
    });
  });
});
