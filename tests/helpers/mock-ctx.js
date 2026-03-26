// Shared mock context factory for command handler testing
// Captures terminal output in a lines[] array for assertions

// Provide browser globals for Node test environment
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { _unlockAchievement: () => {}, _selectedTerminals: undefined };
}
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ remove: () => {}, classList: { add: () => {}, remove: () => {} }, style: {}, textContent: '', innerHTML: '', dataset: {}, querySelector: () => null, appendChild: () => {}, className: '' }),
    getElementById: () => null,
  };
}

import { FS, resolvePath } from '../../src/commands/filesystem.js';

// Create a fresh simulation state without localStorage dependency
function createFreshSimState() {
  const now = Date.now();
  return {
    _version: 3,
    session: { cwd: '/home/classified', hackedMainframe: false, foundPort: false, sudoCount: 0, rmCount: 0, exitAttempts: 0 },
    git: {
      branch: 'main',
      branches: ['main', 'feature/multi-terminal', 'feature/about-cli'],
      commits: [
        { hash: '0000000', msg: 'initial commit', branch: 'main', ts: now - 86400000 },
        { hash: 'a1b2c3d', msg: 'add feature', branch: 'main', ts: now - 3600000 },
      ],
      staged: [],
      stashes: [],
      stashCounter: 0,
    },
    docker: {
      containers: {
        'pshell-api': {
          image: 'pshell-api:latest',
          status: 'running',
          startedAt: now,
          finishedAt: null,
          exitCode: 0,
          oomKilled: false,
          pid: 1337,
          restartPolicy: { name: 'always', maximumRetryCount: 0 },
          restartCount: 0,
          health: null,
          healthCheck: null,
          ports: { '3000/tcp': { HostIp: '0.0.0.0', HostPort: '3000' } },
          network: 'pshell-network',
          ip: '172.18.0.5',
          cmd: ['node', '/app/pshell-api.js'],
          env: ['NODE_ENV=production', 'PORT=3000'],
          memoryLimit: 536870912,
          nanoCpus: 500000000,
          memoryUsage: 247000000,
          volumes: [],
          events: [],
          manuallyStopped: false,
        },
        'nginx': {
          image: 'nginx:1.24',
          status: 'running',
          startedAt: now,
          finishedAt: null,
          exitCode: 0,
          oomKilled: false,
          pid: 420,
          restartPolicy: { name: 'always', maximumRetryCount: 0 },
          restartCount: 0,
          health: 'healthy',
          healthCheck: { test: ['CMD', 'curl', '-f', 'http://localhost'], interval: 30000, timeout: 5000, retries: 3, startPeriod: 5000 },
          ports: { '80/tcp': { HostIp: '0.0.0.0', HostPort: '80' } },
          network: 'pshell-network',
          ip: '172.18.0.2',
          cmd: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
          env: ['NGINX_VERSION=1.24'],
          memoryLimit: 268435456,
          nanoCpus: 500000000,
          memoryUsage: 128000000,
          volumes: [],
          events: [],
          manuallyStopped: false,
        },
        'postgres': {
          image: 'postgres:15',
          status: 'running',
          startedAt: now,
          finishedAt: null,
          exitCode: 0,
          oomKilled: false,
          pid: 666,
          restartPolicy: { name: 'unless-stopped', maximumRetryCount: 0 },
          restartCount: 0,
          health: 'healthy',
          healthCheck: { test: ['CMD', 'pg_isready'], interval: 30000, timeout: 5000, retries: 3, startPeriod: 30000 },
          ports: { '5432/tcp': { HostIp: '0.0.0.0', HostPort: '5432' } },
          network: 'pshell-network',
          ip: '172.18.0.3',
          cmd: ['docker-entrypoint.sh', 'postgres'],
          env: ['POSTGRES_DB=prod', 'POSTGRES_USER=admin'],
          memoryLimit: 536870912,
          nanoCpus: 1000000000,
          memoryUsage: 312000000,
          volumes: ['postgres_data:/var/lib/postgresql/data'],
          events: [],
          manuallyStopped: false,
        },
        'redis': {
          image: 'redis:7-alpine',
          status: 'running',
          startedAt: now,
          finishedAt: null,
          exitCode: 0,
          oomKilled: false,
          pid: 999,
          restartPolicy: { name: 'unless-stopped', maximumRetryCount: 0 },
          restartCount: 0,
          health: 'healthy',
          healthCheck: { test: ['CMD', 'redis-cli', 'ping'], interval: 30000, timeout: 5000, retries: 3, startPeriod: 5000 },
          ports: { '6379/tcp': { HostIp: '0.0.0.0', HostPort: '6379' } },
          network: 'pshell-network',
          ip: '172.18.0.4',
          cmd: ['docker-entrypoint.sh', 'redis-server'],
          env: ['REDIS_VERSION=7.0', 'REDIS_PORT=6379'],
          memoryLimit: 268435456,
          nanoCpus: 250000000,
          memoryUsage: 64000000,
          volumes: ['redis_data:/data'],
          events: [],
          manuallyStopped: false,
        },
      },
      networks: {
        'bridge': { id: 'a1b2c3d4e5f6', driver: 'bridge', subnet: '172.17.0.0/16', gateway: '172.17.0.1', containers: {} },
        'pshell-network': { id: 'f6e5d4c3b2a1', driver: 'bridge', subnet: '172.18.0.0/16', gateway: '172.18.0.1', containers: {
          'nginx': { ip: '172.18.0.2' },
          'postgres': { ip: '172.18.0.3' },
          'redis': { ip: '172.18.0.4' },
          'pshell-api': { ip: '172.18.0.5' },
        }},
        'host': { id: 'deadbeef1234', driver: 'host', subnet: null, gateway: null, containers: {} },
      },
      volumes: {
        'postgres_data': { driver: 'local', mountpoint: '/var/lib/docker/volumes/postgres_data/_data', createdAt: now },
        'redis_data': { driver: 'local', mountpoint: '/var/lib/docker/volumes/redis_data/_data', createdAt: now },
      },
      events: [],
      compose: {
        projectName: 'pshell-api',
        services: {
          'nginx': { container: 'nginx', depends_on: ['api'] },
          'postgres': { container: 'postgres', depends_on: [] },
          'redis': { container: 'redis', depends_on: [] },
          'api': { container: 'pshell-api', depends_on: ['postgres', 'redis'] },
        },
      },
    },
    sql: {
      connected: true,
      tables: {
        users: {
          schema: [
            { name: 'id', type: 'serial', pk: true },
            { name: 'username', type: 'varchar(100)' },
            { name: 'email', type: 'varchar(255)' },
            { name: 'created_at', type: 'timestamp' },
          ],
          rows: [
            { id: 1, username: 'test', email: 'test@test.com', created_at: '2026-01-01' },
            { id: 2, username: 'admin', email: 'admin@test.com', created_at: '2026-01-02' },
          ],
          nextId: 3,
        },
      },
    },
    fs: {
      createdFiles: {},
      deletedFiles: new Set(),
      modifiedFiles: {},
      createdDirs: new Set(),
    },
    k8s: {
      pods: [
        { name: 'pshell-api-abc12', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
        { name: 'postgres-0', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
      ],
      deletedPods: new Set(),
      nodes: [
        { name: 'master-01', status: 'Ready', roles: 'control-plane', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
        { name: 'worker-01', status: 'Ready', roles: '<none>', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
      ],
      services: [
        { name: 'pshell-api', type: 'ClusterIP', clusterIP: '10.96.0.42', externalIP: '<none>', ports: '3000/TCP', createdAt: now - 42 * 86400000 },
      ],
      deployments: [
        { name: 'pshell-api', replicas: 1, podPrefix: 'pshell-api-', createdAt: now - 42 * 86400000 },
      ],
      helmReleases: [
        { name: 'pshell', namespace: 'production', revision: 1, status: 'deployed', chart: 'pshell-1.0.0', updated: '2026-03-20 14:30:00.000000 +0000 UTC', appVersion: '1.0.0' },
      ],
    },
    services: {
      nginx: { active: true, pid: 420, tasks: 8, memory: 128, startedAt: now },
      postgres: { active: true, pid: 666, tasks: 12, memory: 256, startedAt: now },
      redis: { active: true, pid: 999, tasks: 4, memory: 64, startedAt: now },
    },
    crontab: [
      { schedule: '0 3 * * *', command: '/usr/local/bin/backup.sh' },
    ],
    processes: {
      list: [
        { user: 'root', pid: 1, cpu: 0.0, mem: 0.1, command: '/sbin/init', linkedContainer: null },
        { user: 'www-data', pid: 420, cpu: 2.1, mem: 1.4, command: 'nginx: worker', linkedContainer: 'nginx' },
        { user: 'postgres', pid: 666, cpu: 5.4, mem: 8.2, command: 'postgres: writer', linkedContainer: 'postgres' },
        { user: 'redis', pid: 999, cpu: 0.8, mem: 2.1, command: 'redis-server', linkedContainer: 'redis' },
      ],
      killedPids: new Set(),
      kernelPanic: false,
    },
    commandCount: 0,
    filesRead: new Set(),
    startedAt: now,
    _history: [],
  };
}

export function createMockCtx(overrides = {}) {
  const lines = [];
  const sim = createFreshSimState();

  const state = {
    get cwd() { return sim.session.cwd; },
    set cwd(v) { sim.session.cwd = v; },
    get sudoCount() { return sim.session.sudoCount; },
    set sudoCount(v) { sim.session.sudoCount = v; },
    get rmCount() { return sim.session.rmCount; },
    set rmCount(v) { sim.session.rmCount = v; },
    get exitAttempts() { return sim.session.exitAttempts; },
    set exitAttempts(v) { sim.session.exitAttempts = v; },
    sim,
  };

  return {
    term: {
      addLine: (text, cls) => { lines.push({ text, cls }); return { remove: () => {}, classList: { add: () => {}, remove: () => {} }, style: {}, textContent: '', innerHTML: '', dataset: {}, querySelector: () => null }; },
      typeLine: async (text, cls) => { lines.push({ text, cls }); },
      linesContainer: {
        appendChild: () => {},
        insertBefore: () => {},
        lastChild: { remove: () => {} },
      },
      _scrollToBottom: () => {},
      _escapeHtml: (s) => s,
      clear: () => { lines.length = 0; },
      triggerShake: () => {},
    },
    state,
    sleep: () => Promise.resolve(),
    FS,
    win: { remove: () => {}, style: {}, querySelector: () => null, classList: { add: () => {}, remove: () => {} } },
    rawCmd: '',
    isMainTerminal: false,
    unregisterWindow: () => {},
    lines,
    ...overrides,
  };
}

// Helper: find a command handler by match
export function findHandler(commands, input) {
  const cmd = input.toLowerCase();
  for (const command of commands) {
    if (typeof command.match === 'string' && cmd === command.match) return command;
    if (Array.isArray(command.match) && command.match.includes(cmd)) return command;
    if (typeof command.match === 'function' && command.match(cmd)) return command;
  }
  return null;
}

// Helper: run a command and return captured output
export async function runCommand(commands, input, ctx) {
  const handler = findHandler(commands, input);
  if (!handler) throw new Error(`No handler for: ${input}`);
  ctx.rawCmd = input;
  await handler.handler(input.toLowerCase(), ctx);
  return ctx.lines;
}
