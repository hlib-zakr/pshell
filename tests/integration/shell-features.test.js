import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx } from '../helpers/mock-ctx.js';
import { executeCommand } from '../../src/commands/index.js';

// Helper: run a command through the full pipeline
async function run(rawCmd, ctx) {
  ctx.rawCmd = rawCmd;
  ctx.lines.length = 0;
  await executeCommand(rawCmd.toLowerCase(), ctx);
  return ctx.lines.map(l => l.text).filter(t => t && t.trim());
}

describe('Shell pre-processing pipeline', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  // ─── Variable expansion ───

  describe('variable expansion', () => {
    it('expands $HOME', async () => {
      const output = await run('echo $HOME', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });

    it('expands $USER', async () => {
      const output = await run('echo $USER', ctx);
      expect(output.some(l => l.includes('classified'))).toBe(true);
    });

    it('expands $PWD to current directory', async () => {
      const output = await run('echo $PWD', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });

    it('expands custom env vars set with export', async () => {
      await run('export MY_VAR=hello123', ctx);
      const output = await run('echo $MY_VAR', ctx);
      expect(output.some(l => l.includes('hello123'))).toBe(true);
    });

    it('does NOT expand inside single quotes', async () => {
      const output = await run("echo '$HOME'", ctx);
      // Single quotes prevent expansion — should NOT contain the resolved path
      expect(output.some(l => l.includes('/home/classified'))).toBe(false);
    });

    it('expands inside double quotes', async () => {
      const output = await run('echo "Hello $USER"', ctx);
      // Double quotes allow expansion
      expect(output.some(l => l.toLowerCase().includes('hello classified'))).toBe(true);
    });

    it('expands ${VAR} syntax', async () => {
      const output = await run('echo ${HOME}', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });
  });

  // ─── Conditionals ───

  describe('conditionals (&&, ||, ;)', () => {
    it('runs second command on && when first succeeds', async () => {
      const output = await run('echo first && echo second', ctx);
      expect(output.some(l => l.includes('first'))).toBe(true);
      expect(output.some(l => l.includes('second'))).toBe(true);
    });

    it('runs both commands with ;', async () => {
      const output = await run('echo one; echo two', ctx);
      expect(output.some(l => l.includes('one'))).toBe(true);
      expect(output.some(l => l.includes('two'))).toBe(true);
    });

    it('chains mkdir && cd && pwd', async () => {
      await run('mkdir testdir123', ctx);
      await run('cd testdir123 && pwd', ctx);
      // After cd, pwd should show the new dir
      expect(ctx.state.cwd).toContain('testdir123');
    });
  });

  // ─── Command substitution ───

  describe('command substitution', () => {
    it('expands $(whoami)', async () => {
      const output = await run('echo "I am $(whoami)"', ctx);
      expect(output.some(l => l.toLowerCase().includes('i am root'))).toBe(true);
    });

    it('expands $(pwd)', async () => {
      const output = await run('echo $(pwd)', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });
  });

  // ─── Aliases ───

  describe('aliases', () => {
    it('expands pre-seeded alias ll', async () => {
      const output = await run('ll', ctx);
      // ll = ls -la, should produce directory listing
      expect(output.length).toBeGreaterThan(0);
    });

    it('expands custom alias', async () => {
      await run("alias greeting='echo hello world'", ctx);
      const output = await run('greeting', ctx);
      expect(output.some(l => l.includes('hello world'))).toBe(true);
    });

    it('unalias removes alias', async () => {
      await run("alias test123='echo test'", ctx);
      await run('unalias test123', ctx);
      const output = await run('test123', ctx);
      expect(output.some(l => l.includes('not found'))).toBe(true);
    });
  });

  // ─── Redirections ───

  describe('output redirections', () => {
    it('redirects ls output to a file with >', async () => {
      await run('ls > listing.txt', ctx);
      // Check file was created
      const content = ctx.state.sim.fs.createdFiles['listing.txt']?.content;
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it('redirects ps aux output to a file', async () => {
      await run('ps aux > procs.txt', ctx);
      const content = ctx.state.sim.fs.createdFiles['procs.txt']?.content;
      expect(content).toBeDefined();
      expect(content).toContain('PID');
    });

    it('appends with >>', async () => {
      await run('echo first > test.txt', ctx);
      await run('echo second >> test.txt', ctx);
      const content = ctx.state.sim.fs.createdFiles['test.txt']?.content;
      expect(content).toContain('first');
      expect(content).toContain('second');
    });

    it('pg_dump > backup.sql creates valid SQL file', async () => {
      await run('pg_dump > backup.sql', ctx);
      const content = ctx.state.sim.fs.createdFiles['backup.sql']?.content;
      expect(content).toBeDefined();
      expect(content).toContain('CREATE TABLE');
      expect(content).toContain('INSERT INTO');
    });
  });

  // ─── Globs ───

  describe('glob expansion', () => {
    it('expands *.txt to matching files', async () => {
      // Create some .txt files first
      await run('echo "a" > file1.txt', ctx);
      await run('echo "b" > file2.txt', ctx);
      await run('echo "c" > file3.log', ctx);
      // ls *.txt should show only txt files
      const output = await run('ls *.txt', ctx);
      // The glob should have expanded to actual filenames
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ─── Quoting ───

  describe('quoting', () => {
    it('double quotes preserve spaces as single argument', async () => {
      const output = await run('echo "hello world"', ctx);
      expect(output.some(l => l.includes('hello world'))).toBe(true);
    });

    it('single quotes are literal', async () => {
      const output = await run("echo 'hello $USER'", ctx);
      // Should NOT contain 'classified' (the expanded value)
      expect(output.some(l => l.includes('classified'))).toBe(false);
    });
  });

  // ─── Combined ───

  describe('combined shell features', () => {
    it('alias + variable + redirect', async () => {
      await run('export NAME=testfile', ctx);
      await run("alias save='echo saved'", ctx);
      await run('save > $NAME.txt', ctx);
      const content = ctx.state.sim.fs.createdFiles['testfile.txt']?.content;
      expect(content).toContain('saved');
    });

    it('pipe + redirect', async () => {
      await run('ps aux | grep nginx > nginx_procs.txt', ctx);
      const content = ctx.state.sim.fs.createdFiles['nginx_procs.txt']?.content;
      expect(content).toBeDefined();
    });

    it('conditional + variable + command substitution', async () => {
      const output = await run('echo "User: $(whoami)" && echo "Home: $HOME"', ctx);
      expect(output.some(l => l.toLowerCase().includes('user: root'))).toBe(true);
      expect(output.some(l => l.toLowerCase().includes('home: /home/classified'))).toBe(true);
    });
  });
});
