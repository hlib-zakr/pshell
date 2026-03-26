import { describe, it, expect } from 'vitest';
import { COMMANDS } from '../../src/commands/index.js';
import { helpCommands } from '../../src/commands/help.js';
import { createMockCtx } from '../helpers/mock-ctx.js';

// ─── Extract all command names that have handlers ───

function getHandlerCommandNames() {
  const names = new Set();

  for (const command of COMMANDS) {
    // From meta field
    if (command.meta?.name) {
      const firstName = command.meta.name.split(/[\s<\[]/)[0].toLowerCase();
      if (firstName) names.add(firstName);
    }

    // From string match
    if (typeof command.match === 'string') {
      const firstName = command.match.split(/\s/)[0].toLowerCase();
      if (firstName && !firstName.startsWith('\\')) names.add(firstName);
    }

    // From array match
    if (Array.isArray(command.match)) {
      for (const m of command.match) {
        const firstName = m.split(/\s/)[0].toLowerCase();
        if (firstName) names.add(firstName);
      }
    }

    // From function match — try common patterns to extract the command name
    if (typeof command.match === 'function') {
      const src = command.match.toString();
      // Match patterns like: cmd === 'xyz' or cmd.startsWith('xyz')
      const exactMatches = src.matchAll(/cmd\s*===\s*'([^']+)'/g);
      for (const m of exactMatches) {
        const firstName = m[1].split(/\s/)[0].toLowerCase();
        if (firstName) names.add(firstName);
      }
      const startsWithMatches = src.matchAll(/cmd\.startsWith\s*\(\s*'([^']+)'/g);
      for (const m of startsWithMatches) {
        const firstName = m[1].split(/\s/)[0].toLowerCase();
        if (firstName) names.add(firstName);
      }
    }
  }

  // Filter out things that aren't real command names
  const ignore = new Set([
    '\\dt', '\\d', 'exit', 'quit', 'logout', 'clear',  // built-in / special
    'hello', 'hi', 'hey', 'thanks', 'thank',            // greetings (not real commands)
    '42', 'yes',                                         // special tokens
    'play', 'tutorial', 'terminals',                     // game commands (special)
    'apachectl',                                         // obscure, bundled with nginx
    './pshell', './stop-the-code', 'stc',                 // game launchers, not CLI commands
    'connect', 'nc',                                     // sub-features of network
    'ip',                                                // handled as part of ifconfig/ip addr
    'mongo',                                             // alias for mongosh
    'drop', 'cow',                                       // partial matches from SQL/cowsay
    'meaning',                                           // "meaning of life" easter egg
    'network-map',                                       // alias for netmap
    'scores',                                            // alias for leaderboard
    'leaderboard',                                       // game-specific
  ]);

  return [...names].filter(n => !ignore.has(n) && n.length > 1 && !n.startsWith('\\'));
}

// ─── Extract all help text ───

async function getAllHelpText() {
  const ctx = createMockCtx();
  const allText = [];

  // Run help 1, 2, 3
  for (const page of ['help', 'help 1', 'help 2', 'help 3']) {
    ctx.lines.length = 0;
    const handler = helpCommands.find(c => {
      if (typeof c.match === 'string') return c.match === page;
      if (typeof c.match === 'function') return c.match(page);
      return false;
    });
    if (handler) {
      await handler.handler(page, ctx);
      allText.push(...ctx.lines.map(l => l.text));
    }
  }

  // Run all deep help topics
  const topics = [
    'help rm', 'help sudo', 'help cat', 'help npm', 'help git',
    'help kill', 'help network', 'help fs', 'help system',
    'help danger', 'help docker', 'help k8s', 'help db',
    'help easter', 'help infra',
  ];
  for (const topic of topics) {
    ctx.lines.length = 0;
    const handler = helpCommands.find(c => {
      if (typeof c.match === 'string') return c.match === topic;
      if (typeof c.match === 'function') return c.match(topic);
      return false;
    });
    if (handler) {
      await handler.handler(topic, ctx);
      allText.push(...ctx.lines.map(l => l.text));
    }
  }

  return allText.join('\n').toLowerCase();
}

// ─── Extract tab-complete commands ───
// We import getBaseCommands indirectly by checking the extras + auto-derived

function getTabCompleteCommands() {
  // Read the source of tab-complete.js to extract extras
  // Since we can't easily call getBaseCommands (it depends on DOM),
  // we'll import COMMANDS and simulate the auto-derivation + check extras
  const autoDerived = new Set();
  for (const c of COMMANDS) {
    if (typeof c.match === 'string') {
      autoDerived.add(c.match.split(' ')[0]);
    } else if (Array.isArray(c.match)) {
      c.match.forEach(m => autoDerived.add(m.split(' ')[0]));
    }
  }

  // Hardcoded extras from tab-complete.js — keep this in sync!
  const extras = [
    'play', 'tutorial', 'terminals',
    'ls', 'cd', 'cat', 'rm', 'echo', 'touch', 'mkdir', 'grep', 'find', 'wc',
    'git', 'docker', 'kubectl', 'helm',
    'psql', 'mysql', 'redis-cli', 'mongosh',
    'ping', 'curl', 'wget', 'ssh', 'traceroute', 'nmap', 'dig', 'nslookup',
    'kill', 'killall', 'pkill',
    'systemctl', 'service', 'crontab',
    'npm', 'pip', 'apt', 'cargo',
    'sudo', 'chmod', 'chown', 'dd', 'mkfs', 'sed', 'ln', 'scp', 'rsync',
    'nohup', 'openssl', 'terraform', 'aws', 'tar', 'truncate',
    'snake', '2048', 'wordle', 'minesweeper', 'netmap',
    'fortune', 'cowsay', 'sl', 'hack', 'vim', 'nano', 'vi',
    'python', 'python3', 'node', 'head', 'tail',
    'top', 'htop', 'ps', 'free', 'df',
    'ifconfig', 'netstat', 'ss', 'iptables', 'ufw',
    'screen', 'tmux', 'make',
    'dmesg', 'journalctl', 'passwd', 'alias', 'export',
    'reboot', 'shutdown', 'halt', 'poweroff',
    'shred', 'swapoff',
    'sort', 'uniq', 'download', 'unset', 'pg_dump', 'unalias',
    'uname', 'mv', 'cp', 'which', 'bash', 'sh', 'zsh',
    'figlet', 'lolcat', 'cmatrix', 'xkcd', 'nginx', 'perl',
    'docker-compose',
  ];
  for (const e of extras) autoDerived.add(e);

  return autoDerived;
}

// ─── Tests ───

describe('Command completeness', () => {
  it('every handler command is in tab-complete', () => {
    const handlerNames = getHandlerCommandNames();
    const tabComplete = getTabCompleteCommands();

    const missing = handlerNames.filter(name => !tabComplete.has(name));

    if (missing.length > 0) {
      throw new Error(
        `Commands with handlers but NOT in tab-complete:\n` +
        missing.map(n => `  - ${n}`).join('\n') +
        `\n\nAdd these to the extras array in src/ui/tab-complete.js`
      );
    }
  });

  it('every handler command is mentioned in help', async () => {
    const handlerNames = getHandlerCommandNames();
    const helpText = await getAllHelpText();

    // Commands that are intentionally hidden from help (easter eggs, aliases)
    const intentionallyHidden = new Set([
      'man', 'team', 'credits', 'achievements', 'stats',   // meta/fun commands
      'hack', 'matrix', 'leaderboard',                      // game-specific
      'bash', 'sh', 'zsh',                                  // shell stubs
      'xkcd', 'figlet', 'lolcat', 'cmatrix',               // easter egg fun
      'perl',                                                // obscure
      'nginx',                                               // bundled with docker
      'redis-cli', 'mongosh', 'mysql',                      // listed under db help
      'unset', 'unalias',                                   // listed under system/alias
      'scores',                                              // alias for leaderboard
      'network-map',                                         // alias for netmap
      '\\dt', '\\d',                                         // psql meta-commands
    ]);

    const missing = handlerNames.filter(name =>
      !intentionallyHidden.has(name) && !helpText.includes(name)
    );

    if (missing.length > 0) {
      throw new Error(
        `Commands with handlers but NOT mentioned in any help page:\n` +
        missing.map(n => `  - ${n}`).join('\n') +
        `\n\nAdd these to the appropriate section in src/commands/help.js`
      );
    }
  });
});
