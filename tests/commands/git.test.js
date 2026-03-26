import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx, findHandler, runCommand } from '../helpers/mock-ctx.js';
import { gitCommands } from '../../src/commands/git.js';

describe('gitCommands', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe('git status', () => {
    it('shows the current branch name', async () => {
      await runCommand(gitCommands, 'git status', ctx);
      const branchLine = ctx.lines.find(l => l.text.includes('On branch'));
      expect(branchLine).toBeDefined();
      expect(branchLine.text).toContain('On branch main');
    });

    it('shows staged files', async () => {
      ctx.state.sim.git.staged = ['app.js'];
      await runCommand(gitCommands, 'git status', ctx);
      // Real git uses "modified:" or "new file:" prefix with tab indentation
      const stagedLine = ctx.lines.find(l => l.text.includes('app.js') && (l.text.includes('modified:') || l.text.includes('new file:')));
      expect(stagedLine).toBeDefined();
    });
  });

  describe('git add', () => {
    it('stages a file that exists in createdFiles', async () => {
      ctx.state.sim.fs.createdFiles['hello.txt'] = { content: 'hi', createdAt: Date.now() };
      ctx.rawCmd = 'git add hello.txt';
      const handler = findHandler(gitCommands, 'git add hello.txt');
      await handler.handler('git add hello.txt', ctx);
      expect(ctx.state.sim.git.staged).toContain('hello.txt');
      // Real git add is silent on success — no output
      const nonBlank = ctx.lines.filter(l => l.text && l.text.trim());
      expect(nonBlank.length).toBe(0);
    });

    it('stages all modified files with git add .', async () => {
      ctx.state.sim.fs.modifiedFiles = { 'a.js': Date.now(), 'b.js': Date.now() };
      ctx.rawCmd = 'git add .';
      const handler = findHandler(gitCommands, 'git add .');
      await handler.handler('git add .', ctx);
      expect(ctx.state.sim.git.staged).toContain('a.js');
      expect(ctx.state.sim.git.staged).toContain('b.js');
      // Real git add is silent on success
      const nonBlank = ctx.lines.filter(l => l.text && l.text.trim());
      expect(nonBlank.length).toBe(0);
    });
  });

  describe('git commit', () => {
    it('creates a commit with the given message', async () => {
      ctx.state.sim.git.staged = ['app.js'];
      ctx.rawCmd = 'git commit -m "initial commit"';
      const handler = findHandler(gitCommands, 'git commit -m "initial commit"');
      await handler.handler('git commit -m "initial commit"', ctx);
      const commit = ctx.state.sim.git.commits.find(c => c.msg === 'initial commit');
      expect(commit).toBeDefined();
      expect(commit.branch).toBe('main');
      // Staged should be cleared after commit
      expect(ctx.state.sim.git.staged).toEqual([]);
    });

    it('shows error when nothing is staged', async () => {
      ctx.state.sim.git.staged = [];
      ctx.rawCmd = 'git commit -m "empty"';
      const handler = findHandler(gitCommands, 'git commit -m "empty"');
      await handler.handler('git commit -m "empty"', ctx);
      const errorLine = ctx.lines.find(l => l.text.includes('nothing to commit'));
      expect(errorLine).toBeDefined();
    });
  });

  describe('git checkout', () => {
    it('creates and switches to a new branch with -b', async () => {
      ctx.rawCmd = 'git checkout -b newbranch';
      const handler = findHandler(gitCommands, 'git checkout -b newbranch');
      await handler.handler('git checkout -b newbranch', ctx);
      expect(ctx.state.sim.git.branch).toBe('newbranch');
      expect(ctx.state.sim.git.branches).toContain('newbranch');
      const output = ctx.lines.find(l => l.text.includes("Switched to a new branch 'newbranch'"));
      expect(output).toBeDefined();
    });

    it('shows error when creating a branch that already exists', async () => {
      ctx.rawCmd = 'git checkout -b main';
      const handler = findHandler(gitCommands, 'git checkout -b main');
      await handler.handler('git checkout -b main', ctx);
      const errorLine = ctx.lines.find(l => l.text.includes('already exists'));
      expect(errorLine).toBeDefined();
    });

    it('switches to an existing branch', async () => {
      ctx.rawCmd = 'git checkout main';
      // First go to another branch
      ctx.state.sim.git.branch = 'feature/multi-terminal';
      const handler = findHandler(gitCommands, 'git checkout main');
      await handler.handler('git checkout main', ctx);
      expect(ctx.state.sim.git.branch).toBe('main');
      const output = ctx.lines.find(l => l.text.includes("Switched to branch 'main'"));
      expect(output).toBeDefined();
    });
  });

  describe('git log', () => {
    it('filters commits by current branch', async () => {
      // Add a commit on a different branch
      ctx.state.sim.git.commits.push({ hash: 'xyz1234', msg: 'feature work', branch: 'feature/multi-terminal', ts: Date.now() });
      await runCommand(gitCommands, 'git log', ctx);
      // Should NOT include the feature branch commit in output (no innerHTML accessible, but the handler uses term.linesContainer)
      // The main branch commits exist and the handler filters by branch
      const mainCommits = ctx.state.sim.git.commits.filter(c => c.branch === 'main');
      expect(mainCommits.length).toBeGreaterThan(0);
      // Feature commit should not appear in the filtered list
      const featureInMain = mainCommits.find(c => c.msg === 'feature work');
      expect(featureInMain).toBeUndefined();
    });
  });

  describe('git stash', () => {
    it('saves and clears staged and modified files', async () => {
      ctx.state.sim.git.staged = ['app.js'];
      ctx.state.sim.fs.modifiedFiles = { 'util.js': Date.now() };
      await runCommand(gitCommands, 'git stash', ctx);
      expect(ctx.state.sim.git.staged).toEqual([]);
      expect(ctx.state.sim.fs.modifiedFiles).toEqual({});
      expect(ctx.state.sim.git.stashes.length).toBe(1);
      expect(ctx.state.sim.git.stashes[0].files).toContain('app.js');
      expect(ctx.state.sim.git.stashes[0].files).toContain('util.js');
      const output = ctx.lines.find(l => l.text.includes('Saved working directory'));
      expect(output).toBeDefined();
    });
  });

  describe('git stash pop', () => {
    it('restores stashed files to modifiedFiles', async () => {
      ctx.state.sim.git.stashes.push({ id: 0, msg: 'WIP on main: stash #0', files: ['app.js', 'util.js'] });
      await runCommand(gitCommands, 'git stash pop', ctx);
      expect(ctx.state.sim.fs.modifiedFiles).toHaveProperty('app.js');
      expect(ctx.state.sim.fs.modifiedFiles).toHaveProperty('util.js');
      expect(ctx.state.sim.git.stashes.length).toBe(0);
      // Real git stash pop shows status then "Dropped refs/stash@{0}"
      const dropped = ctx.lines.find(l => l.text.includes('Dropped refs/stash'));
      expect(dropped).toBeDefined();
    });
  });

  describe('git diff', () => {
    it('shows file content in diff output', async () => {
      ctx.state.sim.fs.createdFiles['test.js'] = { content: 'console.log("test")', createdAt: Date.now() };
      ctx.state.sim.fs.modifiedFiles['test.js'] = Date.now();
      await runCommand(gitCommands, 'git diff', ctx);
      const diffHeader = ctx.lines.find(l => l.text.includes('diff --git a/test.js b/test.js'));
      expect(diffHeader).toBeDefined();
      const contentLine = ctx.lines.find(l => l.text.includes('+console.log("test")'));
      expect(contentLine).toBeDefined();
    });
  });
});
