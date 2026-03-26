// ─── Fake filesystem ───
export const FS = {
  '/': ['bin', 'etc', 'home', 'var', 'tmp', 'usr', 'dev', 'proc', 'root'],
  '/home': ['classified'],
  '/home/classified': ['about.classified', 'secrets.enc', 'team.dat', 'README.md', '.bash_history', '.ssh', 'notes.txt', 'todo.md', 'Applications'],
  '/home/classified/Applications': ['pshell.app', 'about.app', 'settings.app', 'notepad.app', 'files.app'],
  '/home/classified/.ssh': ['id_rsa', 'id_rsa.pub', 'known_hosts', 'authorized_keys'],
  '/etc': ['passwd', 'shadow', 'hosts', 'nginx', 'ssh', 'resolv.conf', 'crontab', 'motd'],
  '/etc/nginx': ['nginx.conf', 'sites-enabled', 'mime.types'],
  '/var': ['log', 'lib', 'www', 'run', 'tmp'],
  '/var/log': ['syslog', 'auth.log', 'nginx', 'kern.log', 'dmesg', 'wtmp'],
  '/var/log/nginx': ['access.log', 'error.log'],
  '/tmp': ['build-a1b2c3', 'session_expired.tmp', 'debug.log', '.secret_note'],
  '/root': ['DO_NOT_READ.txt'],
  '/proc': ['cpuinfo', 'meminfo', 'uptime', 'version', 'loadavg'],
  '/usr': ['bin', 'lib', 'share', 'local'],
  '/usr/bin': ['node', 'python3', 'bash', 'git', 'docker', 'npm', 'curl', 'ssh', 'vim', 'notepad', 'pshell'],
  '/dev': ['sda', 'sda1', 'null', 'zero', 'random', 'urandom'],
};

// ─── Path resolver ───
export function resolvePath(cwd, target, fs) {
  if (!target || target === '~') return '/home/classified';
  if (target === '/') return '/';
  if (target.startsWith('~/')) target = '/home/classified/' + target.slice(2);

  let parts;
  if (target.startsWith('/')) {
    parts = target.split('/').filter(Boolean);
  } else {
    parts = [...cwd.split('/').filter(Boolean), ...target.split('/').filter(Boolean)];
  }

  // Resolve .. and .
  const resolved = [];
  for (const p of parts) {
    if (p === '..') { resolved.pop(); }
    else if (p !== '.') { resolved.push(p); }
  }

  return '/' + resolved.join('/') || '/';
}
