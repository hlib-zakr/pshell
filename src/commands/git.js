import { generateHash } from '../state/simulation-state.js';
import { parseCommand } from './parse.js';
import { readFile, fileExists } from './file-utils.js';

function fullHash(shortHash) {
  // Generate a deterministic 40-char hash from the short one
  const base = shortHash.replace(/[^0-9a-f]/gi, '');
  return (base + base + base + base + base + base).slice(0, 40);
}

function formatCommitDate(ts) {
  const d = new Date(ts);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} ${d.getFullYear()} +0000`;
}

export const gitCommands = [
  {
    meta: { name: 'git log', desc: 'Commit history (per branch)', category: 'git' },
    match: cmd => cmd === 'git log' || cmd === 'git log --oneline',
    handler: async (cmd, { term, sleep, state }) => {
      const isOneline = cmd.includes('--oneline');
      const currentBranch = state.sim.git.branch;
      const commits = state.sim.git.commits
        .filter(c => c.branch === currentBranch || c.branch === 'main')
        .sort((a, b) => b.ts - a.ts);

      if (commits.length === 0) {
        term.addLine(`fatal: your current branch '${state.sim.git.branch}' does not have any commits yet`, 'about-text');
        return;
      }

      for (const c of commits) {
        if (isOneline) {
          const el = term.addLine(`${c.hash} ${c.msg}`, 'about-text');
          if (el && el.innerHTML !== undefined) {
            el.innerHTML = `<span style="color:var(--term-yellow)">${c.hash}</span> ${term._escapeHtml(c.msg)}`;
          }
        } else {
          // Full format
          term.addLine(`commit ${fullHash(c.hash)}`, 'about-tech-line');
          term.addLine(`Author: root <root@pshell.internal>`, 'about-text');
          term.addLine(`Date:   ${formatCommitDate(c.ts)}`, 'about-text');
          term.addLine('', 'blank');
          term.addLine(`    ${c.msg}`, 'about-text');
          term.addLine('', 'blank');
        }
        await sleep(30);
      }
    },
  },

  {
    match: 'git blame',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Every single line: Claude', 'about-text');
      term.addLine('Every single bug: Also Claude', 'about-text');
      term.addLine('The idea: Hlib Zakrevskyi (so blame him)', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'git status', desc: 'Working tree status', category: 'git' },
    match: 'git status',
    handler: async (cmd, { term, state }) => {
      const sim = state.sim;
      const git = sim.git;
      term.addLine(`On branch ${git.branch}`, 'about-text');
      const branchCommits = git.commits.filter(c => c.branch === git.branch);
      if (branchCommits.length > 0) {
        term.addLine(`Your branch is ahead of 'origin/${git.branch}' by ${branchCommits.length} commit${branchCommits.length > 1 ? 's' : ''}.`, 'about-text');
        term.addLine('  (use "git push" to publish your local commits)', 'about-text');
      }
      term.addLine('', 'blank');

      // Staged files
      if (git.staged.length > 0) {
        term.addLine('Changes to be committed:', 'about-text');
        term.addLine('  (use "git restore --staged <file>..." to unstage)', 'about-text');
        for (const f of git.staged) {
          // Determine if file is "new file" or "modified"
          const isNew = sim.fs.createdFiles[f] && !sim.fs.modifiedFiles[f];
          const prefix = isNew ? 'new file:' : 'modified:';
          term.addLine(`\t${prefix}   ${f}`, 'about-tech-line');
        }
        term.addLine('', 'blank');
      }

      // Modified files (from fs mutations + notepad localStorage)
      const modified = new Set(Object.keys(sim.fs.modifiedFiles));
      try {
        const notepadFiles = JSON.parse(localStorage.getItem('pshell_notepad_files') || '[]');
        for (const f of notepadFiles) modified.add(f);
      } catch {}
      const unstaged = [...modified].filter(f => !git.staged.includes(f));
      // Deleted files merged into "not staged" section
      const deleted = sim.fs.deletedFiles.size > 0 ? [...sim.fs.deletedFiles] : [];
      if (unstaged.length > 0 || deleted.length > 0) {
        term.addLine('Changes not staged for commit:', 'about-text');
        term.addLine('  (use "git add <file>..." to update what will be committed)', 'about-text');
        term.addLine('  (use "git restore <file>..." to discard changes in working directory)', 'about-text');
        for (const f of unstaged) term.addLine(`\tmodified:   ${f}`, 'danger-text');
        for (const f of deleted) term.addLine(`\tdeleted:    ${f}`, 'danger-text');
        term.addLine('', 'blank');
      }

      if (git.staged.length === 0 && unstaged.length === 0 && deleted.length === 0) {
        term.addLine('nothing to commit, working tree clean', 'about-text');
      }
    },
  },
  {
    meta: { name: 'git push', desc: 'Push to remote', category: 'git' },
    match: cmd => cmd === 'git push' || cmd === 'git push origin main',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Enumerating objects: 42, done.', 'about-access', 8);
      await term.typeLine('Counting objects: 100% (42/42), done.', 'about-access', 8);
      await term.typeLine('Delta compression using up to 8 threads', 'about-access', 8);
      await sleep(200);
      await term.typeLine('Compressing objects: 100% (28/28), done.', 'about-access', 8);
      await term.typeLine('Writing objects: 100% (30/30), 12.34 KiB | 4.11 MiB/s, done.', 'about-access', 8);
      term.addLine('To github.com:hlib-zakr/pshell.git', 'about-text');
      term.addLine('   a1b2c3d..e4f5g6h  main -> main', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    match: cmd => cmd === 'git push --force' || cmd === 'git push --force origin main' || cmd === 'git push -f origin main',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Whoa there.', 'danger-text');
      term.addLine('Force pushing to main? This is EXACTLY the kind', 'about-text');
      term.addLine('of command this game trains you to catch.', 'about-text');
      term.addLine('', 'blank');
      term.addLine('You\'d overwrite everyone else\'s work.', 'about-text');
      term.addLine('Their commits? Gone. Their branches? Orphaned.', 'about-text');
      term.addLine('Their trust in you? Destroyed.', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'git diff', desc: 'Show file changes', category: 'git' },
    match: 'git diff',
    handler: async (cmd, { term, state }) => {
      const modified = Object.keys(state.sim.fs.modifiedFiles);
      const staged = state.sim.git.staged;
      const all = [...new Set([...modified, ...staged])];
      if (all.length === 0) return;
      for (const f of all) {
        const hashA = generateHash();
        const hashB = generateHash();
        term.addLine(`diff --git a/${f} b/${f}`, 'about-text');
        term.addLine(`index ${hashA}..${hashB} 100644`, 'about-text');
        term.addLine(`--- a/${f}`, 'danger-text');
        const plusLine = term.addLine(`+++ b/${f}`, 'about-text');
        if (plusLine && plusLine.innerHTML !== undefined) {
          plusLine.innerHTML = `<span style="color:var(--term-green)">+++ b/${term._escapeHtml(f)}</span>`;
        }
        const content = readFile(f, state) || '';
        const lines = content ? content.split('\n') : [];
        term.addLine(`@@ -0,0 +1,${lines.length || 1} @@`, 'about-access');
        if (lines.length > 0) {
          for (const line of lines.slice(0, 10)) {
            term.addLine(`+${line.substring(0, 80)}`, 'about-text');
          }
          if (lines.length > 10) term.addLine(`... (+${lines.length - 10} more lines)`, 'about-access');
        } else {
          term.addLine('+  (new file)', 'about-text');
        }
      }
    },
  },
  {
    meta: { name: 'git stash', desc: 'Stash/list/pop changes', category: 'git' },
    match: cmd => cmd === 'git stash' || cmd === 'git stash list',
    handler: async (cmd, { term, state }) => {
      const git = state.sim.git;
      if (cmd.includes('list')) {
        if (git.stashes.length > 0) {
          for (const [i, s] of git.stashes.entries()) {
            term.addLine(`stash@{${i}}: ${s.msg}`, 'about-text');
          }
        }
      } else {
        const modified = Object.keys(state.sim.fs.modifiedFiles);
        const files = [...git.staged, ...modified];
        if (files.length === 0) {
          term.addLine('No local changes to save', 'about-text');
          return;
        }
        const stashId = git.stashCounter++;
        git.stashes.push({ id: stashId, msg: `WIP on ${git.branch}: stash #${stashId}`, files: [...files] });
        git.staged = [];
        state.sim.fs.modifiedFiles = {};
        term.addLine(`Saved working directory and index state on ${git.branch}`, 'about-text');
      }
    },
  },
  {
    meta: { name: 'git branch', desc: 'List branches', category: 'git' },
    match: 'git branch',
    handler: async (cmd, { term, state }) => {
      for (const b of state.sim.git.branches) {
        const prefix = b === state.sim.git.branch ? '* ' : '  ';
        term.addLine(`${prefix}${b}`, b === state.sim.git.branch ? 'about-tech-line' : 'about-text');
      }
    },
  },
  {
    match: cmd => cmd === 'git branch -a',
    handler: async (cmd, { term, state }) => {
      for (const b of state.sim.git.branches) {
        const prefix = b === state.sim.git.branch ? '* ' : '  ';
        term.addLine(`${prefix}${b}`, b === state.sim.git.branch ? 'about-tech-line' : 'about-text');
      }
      // Remote branches from state
      for (const b of state.sim.git.branches) {
        term.addLine(`  remotes/origin/${b}`, 'danger-text');
      }
    },
  },
  {
    match: cmd => cmd === 'git pull' || cmd === 'git pull origin main',
    handler: async (cmd, { term, sleep }) => {
      await term.typeLine('From github.com:hlib-zakr/pshell', 'about-access', 8);
      term.addLine(' * branch            main       -> FETCH_HEAD', 'about-text');
      await sleep(200);
      term.addLine('Already up to date.', 'about-text');
    },
  },
  {
    match: cmd => cmd === 'git reset --hard' || cmd.startsWith('git reset --hard'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('git reset --hard? That destroys uncommitted work.', 'danger-text');
      term.addLine('Every change you haven\'t committed? Poof.', 'about-text');
      term.addLine('No recovery. No undo. Just regret.', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    match: cmd => cmd === 'git clean -fdx',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('git clean -fdx removes ALL untracked files.', 'danger-text');
      term.addLine('Including .env, build artifacts, and your hopes.', 'about-text');
      term.addLine('Blocked.', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'git add <file>', desc: 'Stage files', category: 'git' },
    match: cmd => cmd.startsWith('git add'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const git = state.sim.git;
      const { args, flags } = parseCommand(rawCmd || cmd);
      const target = args[1] || ''; // args[0] is 'add'
      if (!target && !flags.A) {
        term.addLine('Nothing specified, nothing added.', 'about-text');
        return;
      }
      if (target === '.' || flags.A) {
        // Stage all modified files (silent on success, like real git)
        const modified = Object.keys(state.sim.fs.modifiedFiles);
        for (const f of modified) {
          if (!git.staged.includes(f)) git.staged.push(f);
        }
      } else {
        if (state.sim.fs.modifiedFiles[target] || fileExists(target, state)) {
          if (!git.staged.includes(target)) git.staged.push(target);
        } else {
          term.addLine(`fatal: pathspec '${target}' did not match any files`, 'about-text');
        }
      }
    },
  },
  {
    match: cmd => cmd === 'git stash pop',
    handler: async (cmd, { term, state }) => {
      const git = state.sim.git;
      if (git.stashes.length === 0) {
        term.addLine('No stash entries found.', 'about-text');
      } else {
        const stash = git.stashes.pop();
        for (const f of stash.files) {
          state.sim.fs.modifiedFiles[f] = Date.now();
        }
        // Show status-like output first (real git does this)
        term.addLine(`On branch ${git.branch}`, 'about-text');
        term.addLine('Changes not staged for commit:', 'about-text');
        for (const f of stash.files) {
          term.addLine(`\tmodified:   ${f}`, 'danger-text');
        }
        term.addLine('', 'blank');
        // Then the dropped message with hash
        const hash = generateHash();
        term.addLine(`Dropped refs/stash@{${git.stashes.length}} (${fullHash(hash)})`, 'about-text');
      }
    },
  },
  {
    match: 'git remote -v',
    handler: async (cmd, { term }) => {
      term.addLine('origin\tgit@github.com:hlib-zakr/pshell.git (fetch)', 'about-text');
      term.addLine('origin\tgit@github.com:hlib-zakr/pshell.git (push)', 'about-text');
    },
  },
  {
    meta: { name: 'git commit -m "msg"', desc: 'Commit staged changes', category: 'git' },
    match: cmd => cmd === 'git commit' || cmd.startsWith('git commit'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const git = state.sim.git;
      const { flags } = parseCommand(rawCmd || cmd);
      if (flags.m) {
        if (git.staged.length === 0) {
          // Check if there are unstaged changes
          const modified = Object.keys(state.sim.fs.modifiedFiles);
          if (modified.length > 0) {
            term.addLine('nothing added to commit but untracked files present (use "git add" to track)', 'about-text');
          } else {
            term.addLine('nothing to commit, working tree clean', 'about-text');
          }
        } else {
          const msg = typeof flags.m === 'string' ? flags.m : ((rawCmd || cmd).split('-m')[1]?.trim().replace(/['"]/g, '') || 'fix stuff');
          const hash = generateHash();
          const commit = { hash, msg, branch: git.branch, ts: Date.now() };
          git.commits.push(commit);
          // Compute insertions from staged files' content
          let insertions = 0;
          for (const f of git.staged) {
            const content = readFile(f, state);
            if (content) insertions += content.split('\n').length;
          }
          const fileCount = git.staged.length;
          term.addLine(`[${git.branch} ${hash}] ${msg}`, 'about-text');
          term.addLine(` ${fileCount} file${fileCount > 1 ? 's' : ''} changed, ${insertions} insertions(+)`, 'about-text');
          // Clear staged
          git.staged = [];
        }
      } else {
        term.addLine('hint: Waiting for your editor to close the file...', 'about-text');
        term.addLine('(Use git commit -m "your message")', 'about-text');
      }
    },
  },
  {
    match: 'git init',
    handler: async (cmd, { term }) => {
      term.addLine('Reinitialized existing Git repository in /home/classified/.git/', 'about-text');
    },
  },
  {
    meta: { name: 'git checkout [-b] <branch>', desc: 'Switch/create branch', category: 'git' },
    match: cmd => cmd.startsWith('git checkout') || cmd.startsWith('git switch'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const git = state.sim.git;
      const { args, flags } = parseCommand(rawCmd || cmd);
      const hasCreateFlag = !!flags.b;
      // With parseCommand, -b is a flag and branch name is in args
      // args[0] = 'checkout'/'switch', args[1] = branch name
      let branch;
      if (hasCreateFlag) {
        branch = args[1]; // word after checkout/switch (since -b is consumed as flag)
      } else {
        branch = args[args.length - 1]; // last non-flag arg
      }
      if (!branch || branch === 'checkout' || branch === 'switch') {
        term.addLine('usage: git checkout [-b] <branch-name>', 'about-text');
      } else if (hasCreateFlag) {
        if (git.branches.includes(branch)) {
          term.addLine(`fatal: A branch named '${branch}' already exists.`, 'danger-text');
        } else {
          git.branches.push(branch);
          git.branch = branch;
          term.addLine(`Switched to a new branch '${branch}'`, 'about-text');
        }
      } else if (branch === git.branch) {
        term.addLine(`Already on '${branch}'`, 'about-text');
      } else if (git.branches.includes(branch)) {
        git.branch = branch;
        term.addLine(`Switched to branch '${branch}'`, 'about-text');
      } else {
        term.addLine(`error: pathspec '${branch}' did not match any file(s) known to git`, 'about-text');
      }
    },
  },
  {
    match: cmd => cmd === 'git' || cmd === 'git --help',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('usage: git <command> [<args>]', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Available commands: status, log, blame, diff,', 'about-text');
      term.addLine('push, pull, branch, stash, commit, remote,', 'about-text');
      term.addLine('init, checkout, clean, reset', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Type "help git" for details.', 'about-access');
      term.addLine('', 'blank');
    },
  },
];
