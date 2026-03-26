import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx, findHandler, runCommand } from '../helpers/mock-ctx.js';
import { fsCommands } from '../../src/commands/fs.js';

describe('fsCommands', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe('touch', () => {
    it('creates a file in createdFiles', async () => {
      ctx.rawCmd = 'touch hello.txt';
      const handler = findHandler(fsCommands, 'touch hello.txt');
      await handler.handler('touch hello.txt', ctx);
      expect(ctx.state.sim.fs.createdFiles['hello.txt']).toBeDefined();
      expect(ctx.state.sim.fs.createdFiles['hello.txt'].content).toBe('');
      // Real touch is silent on success — no terminal output
      const output = ctx.lines.filter(l => l.text && l.text.trim());
      expect(output.length).toBe(0);
    });
  });

  describe('echo > (write)', () => {
    it('writes content to a file', async () => {
      ctx.rawCmd = 'echo "hello" > greet.txt';
      const handler = findHandler(fsCommands, 'echo "hello" > greet.txt');
      await handler.handler('echo "hello" > greet.txt', ctx);
      expect(ctx.state.sim.fs.createdFiles['greet.txt']).toBeDefined();
      expect(ctx.state.sim.fs.createdFiles['greet.txt'].content).toBe('hello\n');
      // Real echo redirect is silent on success — no terminal output
      const output = ctx.lines.filter(l => l.text && l.text.trim());
      expect(output.length).toBe(0);
    });
  });

  describe('cat', () => {
    it('reads a created file', async () => {
      ctx.state.sim.fs.createdFiles['greet.txt'] = { content: 'hello', createdAt: Date.now() };
      ctx.rawCmd = 'cat greet.txt';
      const handler = findHandler(fsCommands, 'cat greet.txt');
      await handler.handler('cat greet.txt', ctx);
      const contentLine = ctx.lines.find(l => l.text === 'hello');
      expect(contentLine).toBeDefined();
    });
  });

  describe('echo >> (append)', () => {
    it('appends content to an existing file', async () => {
      ctx.state.sim.fs.createdFiles['greet.txt'] = { content: 'hello\n', createdAt: Date.now(), dir: '/home/classified' };
      ctx.rawCmd = 'echo "world" >> greet.txt';
      const handler = findHandler(fsCommands, 'echo "world" >> greet.txt');
      await handler.handler('echo "world" >> greet.txt', ctx);
      expect(ctx.state.sim.fs.createdFiles['greet.txt'].content).toBe('hello\nworld\n');
    });

    it('shows appended content via cat', async () => {
      ctx.state.sim.fs.createdFiles['greet.txt'] = { content: 'hello\nworld', createdAt: Date.now() };
      ctx.rawCmd = 'cat greet.txt';
      const handler = findHandler(fsCommands, 'cat greet.txt');
      await handler.handler('cat greet.txt', ctx);
      const helloLine = ctx.lines.find(l => l.text === 'hello');
      const worldLine = ctx.lines.find(l => l.text === 'world');
      expect(helloLine).toBeDefined();
      expect(worldLine).toBeDefined();
    });
  });

  describe('rm', () => {
    it('deletes a user-created file', async () => {
      ctx.state.sim.fs.createdFiles['temp.txt'] = { content: 'tmp', createdAt: Date.now() };
      ctx.rawCmd = 'rm temp.txt';
      const handler = findHandler(fsCommands, 'rm temp.txt');
      await handler.handler('rm temp.txt', ctx);
      expect(ctx.state.sim.fs.createdFiles['temp.txt']).toBeUndefined();
      expect(ctx.state.sim.fs.deletedFiles.has('temp.txt')).toBe(true);
      const output = ctx.lines.find(l => l.text.includes("removed 'temp.txt'"));
      expect(output).toBeDefined();
    });

    it('cat after rm shows not found', async () => {
      ctx.state.sim.fs.createdFiles['temp.txt'] = { content: 'tmp', createdAt: Date.now() };
      // Delete the file
      const rmHandler = findHandler(fsCommands, 'rm temp.txt');
      await rmHandler.handler('rm temp.txt', ctx);
      // Clear output
      ctx.lines.length = 0;
      // Try to cat the deleted file
      ctx.rawCmd = 'cat temp.txt';
      const catHandler = findHandler(fsCommands, 'cat temp.txt');
      await catHandler.handler('cat temp.txt', ctx);
      const notFound = ctx.lines.find(l => l.text.includes('No such file or directory'));
      expect(notFound).toBeDefined();
    });
  });

  describe('mkdir', () => {
    it('creates a directory', async () => {
      ctx.rawCmd = 'mkdir projects';
      const handler = findHandler(fsCommands, 'mkdir projects');
      await handler.handler('mkdir projects', ctx);
      expect(ctx.state.sim.fs.createdDirs.has('/home/classified/projects')).toBe(true);
      // Real mkdir is silent on success — no terminal output
      const output = ctx.lines.filter(l => l.text && l.text.trim());
      expect(output.length).toBe(0);
    });

    it('shows error for duplicate directory', async () => {
      ctx.state.sim.fs.createdDirs.add('/home/classified/projects');
      ctx.rawCmd = 'mkdir projects';
      const handler = findHandler(fsCommands, 'mkdir projects');
      await handler.handler('mkdir projects', ctx);
      const errorLine = ctx.lines.find(l => l.text.includes('File exists'));
      expect(errorLine).toBeDefined();
    });
  });

  describe('cd', () => {
    it('changes the current working directory', async () => {
      // Create a directory first so cd can resolve it
      ctx.state.sim.fs.createdDirs.add('/home/classified/projects');
      ctx.rawCmd = 'cd projects';
      const handler = findHandler(fsCommands, 'cd projects');
      await handler.handler('cd projects', ctx);
      expect(ctx.state.cwd).toBe('/home/classified/projects');
    });

    it('cd ~ goes to /home/classified', async () => {
      ctx.state.cwd = '/tmp';
      const handler = findHandler(fsCommands, 'cd ~');
      await handler.handler('cd ~', ctx);
      expect(ctx.state.cwd).toBe('/home/classified');
    });

    it('cd .. goes up one level', async () => {
      ctx.state.cwd = '/home/classified/projects';
      ctx.state.sim.fs.createdDirs.add('/home/classified/projects');
      ctx.rawCmd = 'cd ..';
      const handler = findHandler(fsCommands, 'cd ..');
      await handler.handler('cd ..', ctx);
      expect(ctx.state.cwd).toBe('/home/classified');
    });
  });

  describe('pwd', () => {
    it('shows the current directory', async () => {
      await runCommand(fsCommands, 'pwd', ctx);
      const output = ctx.lines.find(l => l.text === '/home/classified');
      expect(output).toBeDefined();
    });
  });

  describe('wc', () => {
    it('counts lines, words, and chars of a created file', async () => {
      ctx.state.sim.fs.createdFiles['data.txt'] = { content: 'hello world\nfoo bar baz', createdAt: Date.now() };
      ctx.rawCmd = 'wc data.txt';
      const handler = findHandler(fsCommands, 'wc data.txt');
      await handler.handler('wc data.txt', ctx);
      // wc -l counts \n characters: "hello world\nfoo bar baz" has 1 newline
      // Full wc: 1 line, 5 words, 23 chars
      const output = ctx.lines.find(l => l.text.includes('data.txt'));
      expect(output).toBeDefined();
      expect(output.text).toContain('1');  // lines (1 newline)
      expect(output.text).toContain('5');  // words
      expect(output.text).toContain('23'); // chars
    });
  });
});
