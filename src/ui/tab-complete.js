// Tab completion for the terminal prompt
// Completes commands, files, directories, and subcommands

import { FS } from '../commands/filesystem.js';
import { getRegisteredCommands } from '../commands/index.js';
import { listDir } from '../commands/file-utils.js';

// Base commands — auto-derived from COMMANDS registry + extras for function matchers
let _cachedBaseCommands = null;
function getBaseCommands() {
  if (_cachedBaseCommands) return _cachedBaseCommands;
  const registered = new Set(getRegisteredCommands());
  // Add commands that use function matchers (not auto-derivable from string matches)
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
  for (const e of extras) registered.add(e);
  _cachedBaseCommands = [...registered].sort();
  return _cachedBaseCommands;
}

// Subcommand completions
const SUBCOMMANDS = {
  git: ['status', 'log', 'blame', 'diff', 'push', 'pull', 'branch', 'checkout', 'add', 'commit', 'stash', 'remote', 'init', 'clean', 'reset'],
  docker: ['ps', 'images', 'logs', 'stats', 'stop', 'start', 'kill', 'rm', 'run', 'exec', 'network', 'volume', 'system', 'inspect', 'events', 'pause', 'unpause', 'update', 'compose'],
  'docker compose': ['up', 'down', 'ps', 'logs', 'restart', 'config'],
  'docker-compose': ['up', 'down', 'ps', 'logs', 'restart', 'config'],
  kubectl: ['get', 'delete', 'describe', 'logs', 'exec', 'apply', 'scale'],
  helm: ['list', 'install', 'upgrade', 'uninstall', 'delete'],
  npm: ['install', 'test', 'run', 'audit', 'list', 'publish', 'cache'],
  systemctl: ['status', 'start', 'stop', 'restart', 'enable', 'disable'],
  psql: ['-c'],
  'redis-cli': ['INFO', 'FLUSHALL', 'GET', 'SET', 'DEL', 'KEYS'],
  service: [],  // service takes service name first
  kill: ['-9'],
  pip: ['install', 'list', 'uninstall'],
  apt: ['install', 'remove', 'update', 'upgrade', 'list'],
  help: ['rm', 'sudo', 'cat', 'npm', 'git', 'kill', 'network', 'fs', 'system', 'danger', 'easter', 'docker', 'k8s', 'db', 'infra', 'help'],
  man: ['pshell', 'stc', 'rm'],
  'git checkout': ['-b'],
  'git push': ['--force', 'origin'],
  'git commit': ['-m'],
  'git stash': ['list', 'pop'],
  'git branch': ['-a'],
  'kubectl get': ['pods', 'nodes', 'svc', 'services'],
  'kubectl delete': ['pod', 'pods', 'namespace'],
  'docker exec': ['-it'],
  'docker network': ['ls', 'inspect', 'create', 'rm'],
};

// Get file/dir completions for a given cwd
function getPathCompletions(cwd, state) {
  return listDir(cwd, state);
}

// Commands that take file/path arguments as FIRST arg
const FILE_COMMANDS = new Set(['cat', 'ls', 'cd', 'rm', 'touch', 'mkdir', 'head', 'tail', 'wc', 'mv', 'cp', 'download']);
// grep takes pattern first, file second — handled separately in the parts.length >= 3 block

// Service names for systemctl/service
const SERVICE_NAMES = ['nginx', 'sshd', 'cron', 'postgres', 'redis'];

// Container names for docker
const CONTAINER_NAMES = ['nginx', 'postgres', 'redis', 'pshell-api', 'leaderboard-api', 'matrix-rain', 'about-terminal'];

export function getCompletions(inputValue, state) {
  const parts = inputValue.split(/\s+/);
  const current = parts[parts.length - 1] || '';
  const prefix = parts.slice(0, -1).join(' ');
  const firstWord = parts[0] || '';

  // Completing first word — match base commands
  if (parts.length <= 1) {
    return getBaseCommands().filter(c => c.startsWith(current)).map(c => c);
  }

  // Completing subcommand (second word)
  if (parts.length === 2) {
    // Check for subcommands
    const subs = SUBCOMMANDS[firstWord];
    if (subs && subs.length > 0) {
      const matches = subs.filter(s => s.startsWith(current));
      if (matches.length > 0) return matches;
    }

    // docker stop/start/kill/logs → container names
    if (['docker stop', 'docker start', 'docker kill', 'docker logs', 'docker rm'].some(c => inputValue.startsWith(c.split(' ')[0]) && parts[0] === 'docker')) {
      // Actually this is the subcommand, not container yet
    }

    // service → service names
    if (firstWord === 'service') {
      return SERVICE_NAMES.filter(s => s.startsWith(current));
    }

    // sudo → complete with base commands
    if (firstWord === 'sudo') {
      return getBaseCommands().filter(c => c.startsWith(current));
    }

    // File commands → file completions
    if (FILE_COMMANDS.has(firstWord)) {
      const cwd = state?.cwd || '/home/classified';
      return getPathCompletions(cwd, state).filter(f => f.startsWith(current));
    }
  }

  // Completing third+ word
  if (parts.length >= 3) {
    const twoWord = parts[0] + ' ' + parts[1];

    // Check two-word subcommands (but not if we already used the flag, e.g. git checkout -b <name>)
    const subs = SUBCOMMANDS[twoWord];
    if (subs && parts.length === 3) {
      const subMatches = subs.filter(s => s.startsWith(current));
      if (subMatches.length > 0) return subMatches;
    }

    // docker stop/start/kill/logs <container>
    if (parts[0] === 'docker' && ['stop', 'start', 'kill', 'logs', 'rm', 'exec', 'inspect', 'pause', 'unpause', 'update'].includes(parts[1])) {
      return CONTAINER_NAMES.filter(c => c.startsWith(current));
    }

    // systemctl <action> <service>
    if (parts[0] === 'systemctl' && ['status', 'start', 'stop', 'restart'].includes(parts[1])) {
      return SERVICE_NAMES.filter(s => s.startsWith(current));
    }

    // grep <pattern> <file>
    if (parts[0] === 'grep' && parts.length === 3) {
      const cwd = state?.cwd || '/home/classified';
      return getPathCompletions(cwd, state).filter(f => f.startsWith(current));
    }

    // git checkout -b → branch names
    if (twoWord === 'git checkout' && !current.startsWith('-') && state?.sim?.git?.branches) {
      return state.sim.git.branches.filter(b => b.startsWith(current));
    }
  }

  return [];
}

// Find the longest common prefix among completions
export function commonPrefix(completions) {
  if (completions.length === 0) return '';
  if (completions.length === 1) return completions[0];
  let prefix = completions[0];
  for (let i = 1; i < completions.length; i++) {
    while (!completions[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}
