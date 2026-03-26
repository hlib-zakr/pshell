import { validateSimState } from './schema.js';

export const COMPOSE_YAML = `version: "3.8"

services:
  nginx:
    image: nginx:1.24
    ports: ["80:80"]
    depends_on: [api, leaderboard]
    restart: always
    networks: [pshell-network]

  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: prod
      POSTGRES_USER: admin
    restart: unless-stopped
    networks: [pshell-network]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    restart: unless-stopped
    networks: [pshell-network]

  api:
    image: pshell-api:latest
    ports: ["3000:3000"]
    depends_on: [postgres, redis]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://admin@postgres:5432/prod
    restart: always
    networks: [pshell-network]

  leaderboard:
    image: leaderboard-api:latest
    ports: ["3001:3001"]
    depends_on: [redis]
    environment:
      REDIS_URL: redis://redis:6379
    restart: always
    networks: [pshell-network]

volumes:
  postgres_data:
  redis_data:

networks:
  pshell-network:
    driver: bridge
`;

// Simulation state factory — creates the full stateful world for the about CLI

export function createSimState() {
  // Try to restore from localStorage
  const saved = loadSimState();
  if (saved) return saved;

  const now = Date.now();

  return {
    _version: 3,

    // ─── Session (about window state) ───
    session: {
      cwd: '/home/classified',
      hackedMainframe: false,
      foundPort: false,
      sudoCount: 0,
      rmCount: 0,
      exitAttempts: 0,
    },

    // ─── Git ───
    git: {
      branch: 'main',
      branches: ['main', 'feature/multi-terminal', 'feature/about-cli', 'hotfix/rm-rf-protection', 'abandoned/sleep-schedule'],
      commits: [
        { hash: '0000000', msg: 'README.md: "this will be simple"', branch: 'main', ts: now - 7 * 86400000 },
        { hash: 'y9z0a1b', msg: 'initial commit: what have we done', branch: 'main', ts: now - 6 * 86400000 },
        { hash: 'u6v7w8x', msg: 'feat: draggable, resizable windows', branch: 'main', ts: now - 5 * 86400000 },
        { hash: 'q3r4s5t', msg: 'feat: matrix rain background', branch: 'main', ts: now - 4 * 86400000 },
        { hash: 'm0n1o2p', msg: 'feat: interactive about window with CLI', branch: 'main', ts: now - 3 * 86400000 },
        { hash: 'i7j8k9l', msg: 'feat: multi-terminal gameplay (up to 4)', branch: 'main', ts: now - 2 * 86400000 },
        { hash: 'e4f5g6h', msg: 'fix: ctrl+c giving points multiple times', branch: 'main', ts: now - 86400000 },
        { hash: 'a1b2c3d', msg: 'add 30 new roasts for game over screen', branch: 'main', ts: now - 3600000 },
      ],
      staged: [],
      stashes: [
        { id: 0, msg: 'WIP on main: "I\'ll come back to this"', files: ['engine.js'] },
        { id: 1, msg: 'WIP on main: "I definitely won\'t"', files: ['styles.css'] },
      ],
      stashCounter: 2,
    },

    // ─── Docker ───
    docker: {
      containers: {
        'pshell-api': {
          image: 'pshell-api:latest',
          status: 'running',
          startedAt: now - 42 * 3600000,
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
          env: ['NODE_ENV=production', 'PORT=3000', 'DATABASE_URL=postgres://admin@postgres:5432/prod'],
          memoryLimit: 536870912,
          nanoCpus: 500000000,
          memoryUsage: 247000000,
          volumes: [],
          events: [],
          manuallyStopped: false,
        },
        'leaderboard-api': {
          image: 'leaderboard-api:latest',
          status: 'running',
          startedAt: now - 42 * 3600000,
          finishedAt: null,
          exitCode: 0,
          oomKilled: false,
          pid: 1338,
          restartPolicy: { name: 'always', maximumRetryCount: 0 },
          restartCount: 0,
          health: null,
          healthCheck: null,
          ports: { '3001/tcp': { HostIp: '0.0.0.0', HostPort: '3001' } },
          network: 'pshell-network',
          ip: '172.18.0.6',
          cmd: ['node', '/app/leaderboard-api.js'],
          env: ['NODE_ENV=production', 'PORT=3001', 'REDIS_URL=redis://redis:6379'],
          memoryLimit: 536870912,
          nanoCpus: 500000000,
          memoryUsage: 185000000,
          volumes: [],
          events: [],
          manuallyStopped: false,
        },
        'nginx': {
          image: 'nginx:1.24',
          status: 'running',
          startedAt: now - 42 * 3600000,
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
          env: ['NGINX_VERSION=1.24', 'NGINX_WORKER_PROCESSES=auto'],
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
          startedAt: now - 42 * 3600000,
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
          env: ['POSTGRES_DB=prod', 'POSTGRES_USER=admin', 'PGDATA=/var/lib/postgresql/data'],
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
          startedAt: now - 42 * 3600000,
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
        'matrix-rain': {
          image: 'matrix-rain:latest',
          status: 'running',
          startedAt: now - 42 * 3600000,
          finishedAt: null,
          exitCode: 0,
          oomKilled: false,
          pid: 31337,
          restartPolicy: { name: 'no', maximumRetryCount: 0 },
          restartCount: 0,
          health: 'unhealthy',
          healthCheck: { test: ['CMD', 'curl', '-f', 'http://localhost:8080/health'], interval: 30000, timeout: 5000, retries: 3, startPeriod: 5000 },
          ports: {},
          network: 'pshell-network',
          ip: '172.18.0.7',
          cmd: ['node', '/app/matrix.js'],
          env: ['EFFECT=rain'],
          memoryLimit: 134217728,
          nanoCpus: 250000000,
          memoryUsage: 98000000,
          volumes: [],
          events: [],
          manuallyStopped: false,
        },
        'about-terminal': {
          image: 'about-terminal:latest',
          status: 'running',
          startedAt: now,
          finishedAt: null,
          exitCode: 0,
          oomKilled: false,
          pid: 9999,
          restartPolicy: { name: 'no', maximumRetryCount: 0 },
          restartCount: 0,
          health: null,
          healthCheck: null,
          ports: { '8080/tcp': { HostIp: '0.0.0.0', HostPort: '8080' } },
          network: 'pshell-network',
          ip: '172.18.0.8',
          cmd: ['node', '/app/terminal.js'],
          env: ['PORT=8080'],
          memoryLimit: 268435456,
          nanoCpus: 250000000,
          memoryUsage: 42000000,
          volumes: [],
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
          'leaderboard-api': { ip: '172.18.0.6' },
          'matrix-rain': { ip: '172.18.0.7' },
          'about-terminal': { ip: '172.18.0.8' },
        }},
        'host': { id: 'deadbeef1234', driver: 'host', subnet: null, gateway: null, containers: {} },
      },
      volumes: {
        'postgres_data': { driver: 'local', mountpoint: '/var/lib/docker/volumes/postgres_data/_data', createdAt: now - 42 * 3600000 },
        'redis_data': { driver: 'local', mountpoint: '/var/lib/docker/volumes/redis_data/_data', createdAt: now - 42 * 3600000 },
        'pshell_uploads': { driver: 'local', mountpoint: '/var/lib/docker/volumes/pshell_uploads/_data', createdAt: now - 42 * 3600000 },
      },
      events: [],
      compose: {
        projectName: 'pshell-api',
        services: {
          'nginx':       { container: 'nginx',           depends_on: ['api', 'leaderboard'] },
          'postgres':    { container: 'postgres',        depends_on: [] },
          'redis':       { container: 'redis',           depends_on: [] },
          'api':         { container: 'pshell-api',   depends_on: ['postgres', 'redis'] },
          'leaderboard': { container: 'leaderboard-api', depends_on: ['redis'] },
        },
      },
    },

    // ─── SQL ───
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
            { id: 1, username: 'classified', email: 'classified@pshell.internal', created_at: '2026-01-15 08:00:00' },
            { id: 2, username: 'root', email: 'root@localhost', created_at: '2026-01-15 08:00:01' },
            { id: 3, username: 'hacker', email: 'leet@31337.io', created_at: '2026-02-20 13:37:00' },
            { id: 4, username: 'claude', email: 'claude@anthropic.com', created_at: '2026-03-01 00:00:00' },
            { id: 5, username: 'player', email: 'player@pshell.dev', created_at: '2026-03-25 12:00:00' },
          ],
          nextId: 6,
        },
        sessions: {
          schema: [
            { name: 'id', type: 'uuid' },
            { name: 'user_id', type: 'int' },
            { name: 'token', type: 'varchar(64)' },
            { name: 'expires_at', type: 'timestamp' },
          ],
          rows: [
            { id: 'a1b2c3d4', user_id: 1, token: 'sk_live_***REDACTED***', expires_at: '2026-04-01' },
            { id: 'e5f6g7h8', user_id: 5, token: 'sk_live_***REDACTED***', expires_at: '2026-04-01' },
          ],
          nextId: null,
        },
      },
    },

    // ─── Filesystem Mutations ───
    fs: {
      createdFiles: {},    // { path: { content, createdAt } }
      deletedFiles: new Set(),
      modifiedFiles: {},   // { path: modifiedAt } — for git status
      createdDirs: new Set(),
    },

    // ─── Kubernetes ───
    k8s: {
      pods: [
        { name: 'pshell-api-7b8c9d-abc12',     ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
        { name: 'pshell-api-7b8c9d-def34',     ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
        { name: 'pshell-web-5f6a7b-ghi56',     ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
        { name: 'pshell-worker-3d4e5f-jkl78',  ready: '1/1', status: 'Running', restarts: 3, createdAt: now - 42 * 86400000 },
        { name: 'postgres-0',                ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
        { name: 'redis-master-0',            ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
        { name: 'mystery-pod-31337-xyz99',   ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
      ],
      deletedPods: new Set(),
      nodes: [
        { name: 'master-01', status: 'Ready', roles: 'control-plane', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
        { name: 'worker-01', status: 'Ready', roles: '<none>', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
        { name: 'worker-02', status: 'Ready', roles: '<none>', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
        { name: 'worker-03', status: 'Ready', roles: '<none>', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
      ],
      services: [
        { name: 'pshell-api',  type: 'ClusterIP',    clusterIP: '10.96.0.42',  externalIP: '<none>',    ports: '3000/TCP',     createdAt: now - 42 * 86400000 },
        { name: 'pshell-web',  type: 'LoadBalancer',  clusterIP: '10.96.0.80',  externalIP: '<pending>', ports: '80:30080/TCP', createdAt: now - 42 * 86400000 },
        { name: 'postgres', type: 'ClusterIP',    clusterIP: '10.96.0.100', externalIP: '<none>',    ports: '5432/TCP',     createdAt: now - 42 * 86400000 },
      ],
      deployments: [
        { name: 'pshell-api',    replicas: 2, podPrefix: 'pshell-api-',    createdAt: now - 42 * 86400000 },
        { name: 'pshell-web',    replicas: 1, podPrefix: 'pshell-web-',    createdAt: now - 42 * 86400000 },
        { name: 'pshell-worker', replicas: 1, podPrefix: 'pshell-worker-', createdAt: now - 42 * 86400000 },
      ],
      helmReleases: [
        { name: 'pshell',        namespace: 'production', revision: 47, status: 'deployed', chart: 'pshell-1.0.0', updated: '2026-03-20 14:30:00.000000 +0000 UTC', appVersion: '1.0.0' },
        { name: 'monitoring', namespace: 'monitoring', revision: 12, status: 'deployed', chart: 'prometheus-stack-45.0', updated: '2026-03-15 10:00:00.000000 +0000 UTC', appVersion: '45.0.0' },
      ],
    },

    // ─── Services (systemctl) ───
    services: {
      nginx:   { active: true, pid: 420,  tasks: 8,  memory: 128, startedAt: now - 42 * 3600000 },
      sshd:    { active: true, pid: 42,   tasks: 2,  memory: 24,  startedAt: now - 42 * 3600000 },
      cron:    { active: true, pid: 1339, tasks: 1,  memory: 8,   startedAt: now - 42 * 3600000 },
      postgres:{ active: true, pid: 666,  tasks: 12, memory: 256, startedAt: now - 42 * 3600000 },
      redis:   { active: true, pid: 999,  tasks: 4,  memory: 64,  startedAt: now - 42 * 3600000 },
    },

    // ─── Crontab ───
    crontab: [
      { schedule: '0  3  *   *   *',   command: '/usr/local/bin/backup.sh' },
      { schedule: '*/5 *  *   *   *',  command: '/usr/local/bin/health-check.sh' },
      { schedule: '0  0  *   *   0',   command: '/usr/local/bin/log-rotate.sh' },
      { schedule: '* *  *   *   *',    command: 'echo "I am still running" > /dev/null' },
      { schedule: '0  9  *   *   1',   command: 'echo "Monday. Ugh." | mail -s "Mood" classified' },
    ],

    // ─── Process Table ───
    processes: {
      list: [
        { user: 'root',     pid: 1,     cpu: 0.0, mem: 0.1, command: '/sbin/init',                    linkedContainer: null },
        { user: 'root',     pid: 42,    cpu: 0.0, mem: 0.2, command: '/usr/sbin/sshd',                 linkedContainer: null },
        { user: 'www-data', pid: 420,   cpu: 2.1, mem: 1.4, command: 'nginx: worker process',          linkedContainer: 'nginx' },
        { user: 'www-data', pid: 421,   cpu: 1.8, mem: 1.3, command: 'nginx: worker process',          linkedContainer: 'nginx' },
        { user: 'postgres', pid: 666,   cpu: 5.4, mem: 8.2, command: 'postgres: writer process',       linkedContainer: 'postgres' },
        { user: 'postgres', pid: 667,   cpu: 0.3, mem: 0.8, command: 'postgres: wal writer',           linkedContainer: 'postgres' },
        { user: 'redis',    pid: 999,   cpu: 0.8, mem: 2.1, command: 'redis-server *:6379',            linkedContainer: 'redis' },
        { user: 'node',     pid: 1337,  cpu: 12.4, mem: 4.7, command: 'node /app/pshell-api.js',    linkedContainer: 'pshell-api' },
        { user: 'node',     pid: 1338,  cpu: 3.2, mem: 1.8, command: 'node /app/leaderboard-api.js',   linkedContainer: 'leaderboard-api' },
        { user: 'root',     pid: 1339,  cpu: 0.1, mem: 0.1, command: '/usr/bin/cron',                  linkedContainer: null },
        { user: 'nobody',   pid: 31337, cpu: 99.9, mem: 0.0, command: '[REDACTED]',                    linkedContainer: null },
        { user: 'classif+', pid: 9999,  cpu: 0.0, mem: 0.0, command: '-bash',                          linkedContainer: null },
      ],
      killedPids: new Set(),
      kernelPanic: false,
    },

    // ─── Environment Variables ───
    env: {},

    // ─── Aliases ───
    aliases: {
      'll': 'ls -la',
      'la': 'ls -a',
      '..': 'cd ..',
      '...': 'cd ../..',
    },

    // ─── Counters ───
    commandCount: 0,
    filesRead: new Set(),
    startedAt: now,
    _history: [],
  };
}

// ─── Helpers ───

export function generateHash() {
  return Math.random().toString(16).slice(2, 9);
}

export function formatUptime(startedAt) {
  const diff = Date.now() - startedAt;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `Up ${Math.floor(hours / 24)} days`;
  if (hours > 0) return `Up ${hours} hours`;
  return `Up ${mins} minutes`;
}

export function pushDockerEvent(state, containerName, action) {
  const c = state.sim.docker.containers[containerName];
  if (!c) return;
  const event = { type: 'container', action, actor: { name: containerName, image: c.image }, time: Date.now() };
  c.events.push(event);
  state.sim.docker.events.push(event);
}

export function generateFullId(name) {
  let h = 0;
  for (const ch of name) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  const hex = Math.abs(h).toString(16);
  return (hex + hex + hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
}

export function formatDockerStatus(c) {
  if (c.status === 'running') {
    const uptime = formatUptime(c.startedAt);
    const healthSuffix = c.health ? ` (${c.health})` : '';
    return `Up ${uptime}${healthSuffix}`;
  }
  if (c.status === 'exited') {
    const elapsed = formatElapsedShort(c.finishedAt);
    return `Exited (${c.exitCode}) ${elapsed}`;
  }
  if (c.status === 'paused') return `Up ${formatUptime(c.startedAt)} (Paused)`;
  if (c.status === 'restarting') return `Restarting (${c.exitCode}) ${formatElapsedShort(c.finishedAt || Date.now())}`;
  if (c.status === 'created') return 'Created';
  if (c.status === 'dead') return 'Dead';
  return c.status;
}

function formatElapsedShort(ts) {
  if (!ts) return 'moments ago';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return 'Less than a second ago';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'About a minute ago' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'About an hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'About a day ago' : `${days} days ago`;
}

const SIM_STORAGE_KEY = 'pshell_sim_state';

export function saveSimState(sim) {
  try {
    // Convert Sets to arrays for JSON serialization
    const serializable = JSON.parse(JSON.stringify(sim, (key, value) => {
      if (value instanceof Set) return { __set: [...value] };
      return value;
    }));
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

export function loadSimState() {
  try {
    const raw = localStorage.getItem(SIM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw, (key, value) => {
      if (value && value.__set) return new Set(value.__set);
      return value;
    });
    // Validate it has the expected structure
    if (!parsed.git || !parsed.docker || !parsed.sql || !parsed.fs || !parsed.processes) return null;
    // Migrate from v1 (no version) to v2
    if (!parsed._version || parsed._version < 2) {
      parsed._version = 2;
      if (!parsed.session) {
        parsed.session = { cwd: '/home/classified', hackedMainframe: false, foundPort: false, sudoCount: 0, rmCount: 0, exitAttempts: 0 };
      }
      if (!parsed.k8s) {
        const now = Date.now();
        parsed.k8s = {
          pods: [
            { name: 'pshell-api-7b8c9d-abc12', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
            { name: 'pshell-api-7b8c9d-def34', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
            { name: 'pshell-web-5f6a7b-ghi56', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
            { name: 'pshell-worker-3d4e5f-jkl78', ready: '1/1', status: 'Running', restarts: 3, createdAt: now - 42 * 86400000 },
            { name: 'postgres-0', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
            { name: 'redis-master-0', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
            { name: 'mystery-pod-31337-xyz99', ready: '1/1', status: 'Running', restarts: 0, createdAt: now - 42 * 86400000 },
          ],
          deletedPods: new Set(),
          nodes: [
            { name: 'master-01', status: 'Ready', roles: 'control-plane', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
            { name: 'worker-01', status: 'Ready', roles: '<none>', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
            { name: 'worker-02', status: 'Ready', roles: '<none>', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
            { name: 'worker-03', status: 'Ready', roles: '<none>', version: 'v1.28.2', createdAt: now - 42 * 86400000 },
          ],
          services: [
            { name: 'pshell-api', type: 'ClusterIP', clusterIP: '10.96.0.42', externalIP: '<none>', ports: '3000/TCP', createdAt: now - 42 * 86400000 },
            { name: 'pshell-web', type: 'LoadBalancer', clusterIP: '10.96.0.80', externalIP: '<pending>', ports: '80:30080/TCP', createdAt: now - 42 * 86400000 },
            { name: 'postgres', type: 'ClusterIP', clusterIP: '10.96.0.100', externalIP: '<none>', ports: '5432/TCP', createdAt: now - 42 * 86400000 },
          ],
          deployments: [
            { name: 'pshell-api', replicas: 2, podPrefix: 'pshell-api-', createdAt: now - 42 * 86400000 },
            { name: 'pshell-web', replicas: 1, podPrefix: 'pshell-web-', createdAt: now - 42 * 86400000 },
            { name: 'pshell-worker', replicas: 1, podPrefix: 'pshell-worker-', createdAt: now - 42 * 86400000 },
          ],
          helmReleases: [
            { name: 'pshell', namespace: 'production', revision: 47, status: 'deployed', chart: 'pshell-1.0.0', updated: '2026-03-20 14:30:00.000000 +0000 UTC', appVersion: '1.0.0' },
            { name: 'monitoring', namespace: 'monitoring', revision: 12, status: 'deployed', chart: 'prometheus-stack-45.0', updated: '2026-03-15 10:00:00.000000 +0000 UTC', appVersion: '45.0.0' },
          ],
        };
        parsed.services = {
          nginx: { active: true, pid: 420, tasks: 8, memory: 128, startedAt: now - 42 * 3600000 },
          sshd: { active: true, pid: 42, tasks: 2, memory: 24, startedAt: now - 42 * 3600000 },
          cron: { active: true, pid: 1339, tasks: 1, memory: 8, startedAt: now - 42 * 3600000 },
          postgres: { active: true, pid: 666, tasks: 12, memory: 256, startedAt: now - 42 * 3600000 },
          redis: { active: true, pid: 999, tasks: 4, memory: 64, startedAt: now - 42 * 3600000 },
        };
        parsed.crontab = [
          { schedule: '0  3  *   *   *', command: '/usr/local/bin/backup.sh' },
          { schedule: '*/5 *  *   *   *', command: '/usr/local/bin/health-check.sh' },
          { schedule: '0  0  *   *   0', command: '/usr/local/bin/log-rotate.sh' },
          { schedule: '* *  *   *   *', command: 'echo "I am still running" > /dev/null' },
          { schedule: '0  9  *   *   1', command: 'echo "Monday. Ugh." | mail -s "Mood" classified' },
        ];
      }
      if (!parsed._history) parsed._history = [];
      // Save migrated state
      saveSimState(parsed);
    }
    if (parsed._version < 3) {
      // Expand container state
      for (const [name, c] of Object.entries(parsed.docker.containers)) {
        if (c.finishedAt === undefined) c.finishedAt = null;
        if (c.exitCode === undefined) c.exitCode = 0;
        if (c.oomKilled === undefined) c.oomKilled = false;
        if (c.pid === undefined) c.pid = Math.floor(Math.random() * 9000) + 1000;
        if (c.restartPolicy === undefined) c.restartPolicy = { name: 'no', maximumRetryCount: 0 };
        if (c.restartCount === undefined) c.restartCount = 0;
        if (c.healthCheck === undefined) c.healthCheck = null;
        if (c.health === undefined) c.health = null;
        if (c.ports === undefined) c.ports = c.port ? { [`${c.port}/tcp`]: { HostIp: '0.0.0.0', HostPort: String(c.port) } } : {};
        if (c.network === undefined) c.network = 'pshell-network';
        if (c.ip === undefined) c.ip = '172.18.0.' + (Object.keys(parsed.docker.containers).indexOf(name) + 2);
        if (c.cmd === undefined) c.cmd = ['/bin/sh'];
        if (c.env === undefined) c.env = [];
        if (c.memoryLimit === undefined) c.memoryLimit = 536870912;
        if (c.nanoCpus === undefined) c.nanoCpus = 500000000;
        if (c.memoryUsage === undefined) c.memoryUsage = Math.floor(Math.random() * 200000000) + 50000000;
        if (c.volumes === undefined) c.volumes = [];
        if (c.events === undefined) c.events = [];
        if (c.manuallyStopped === undefined) c.manuallyStopped = false;
        // Convert old status values
        if (c.status === 'stopped') { c.status = 'exited'; c.exitCode = 0; }
        if (c.status === 'killed') { c.status = 'exited'; c.exitCode = 137; }
        // Remove old port field
        delete c.port;
        delete c.stoppedAt;
      }
      // Add networks if missing
      if (!parsed.docker.networks) {
        parsed.docker.networks = {
          'bridge': { id: 'a1b2c3d4e5f6', driver: 'bridge', subnet: '172.17.0.0/16', gateway: '172.17.0.1', containers: {} },
          'pshell-network': { id: 'f6e5d4c3b2a1', driver: 'bridge', subnet: '172.18.0.0/16', gateway: '172.18.0.1', containers: {} },
          'host': { id: 'deadbeef1234', driver: 'host', subnet: null, gateway: null, containers: {} },
        };
        // Populate network containers
        for (const [name, c] of Object.entries(parsed.docker.containers)) {
          if (c.network && parsed.docker.networks[c.network]) {
            parsed.docker.networks[c.network].containers[name] = { ip: c.ip };
          }
        }
      }
      if (!parsed.docker.volumes) {
        parsed.docker.volumes = {};
      }
      if (!parsed.docker.events) parsed.docker.events = [];
      if (!parsed.docker.compose) {
        parsed.docker.compose = {
          projectName: 'pshell-api',
          services: {
            'nginx':       { container: 'nginx',           depends_on: ['api', 'leaderboard'] },
            'postgres':    { container: 'postgres',        depends_on: [] },
            'redis':       { container: 'redis',           depends_on: [] },
            'api':         { container: 'pshell-api',   depends_on: ['postgres', 'redis'] },
            'leaderboard': { container: 'leaderboard-api', depends_on: ['redis'] },
          },
        };
      }
      parsed._version = 3;
    }
    return validateSimState(parsed);
  } catch {
    return null;
  }
}

export function clearSimState() {
  localStorage.removeItem(SIM_STORAGE_KEY);
}

export function parseSqlQuery(sql) {
  const s = sql.trim();
  let m;
  if ((m = s.match(/^select\s+count\s*\(\s*\*\s*\)\s+from\s+(\w+)/i))) {
    return { type: 'count', table: m[1].toLowerCase() };
  }
  if ((m = s.match(/^select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(\w+)\s*=\s*(?:'([^']*)'|(\d+)))?(?:\s+limit\s+(\d+))?$/i))) {
    const colsPart = m[1].trim();
    const result = { type: 'select', table: m[2].toLowerCase(), limit: m[6] ? parseInt(m[6]) : Infinity };
    if (colsPart !== '*') {
      result.selectCols = colsPart.split(',').map(c => c.trim().toLowerCase());
    }
    if (m[3]) {
      result.whereCol = m[3].toLowerCase();
      result.whereVal = m[4] !== undefined ? m[4] : parseInt(m[5]);
    }
    return result;
  }
  if ((m = s.match(/^insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i))) {
    const cols = m[2].split(',').map(c => c.trim().toLowerCase());
    const vals = m[3].match(/'[^']*'|\d+/g)?.map(v => {
      if (v.startsWith("'")) return v.slice(1, -1);
      return parseInt(v);
    }) || [];
    if (cols.length === 1) {
      return { type: 'insert', table: m[1].toLowerCase(), column: cols[0], value: vals[0] };
    }
    return { type: 'insert', table: m[1].toLowerCase(), columns: cols, values: vals };
  }
  if ((m = s.match(/^update\s+(\w+)\s+set\s+(\w+)\s*=\s*(?:'([^']*)'|(\d+))\s+where\s+(\w+)\s*=\s*(?:'([^']*)'|(\d+))/i))) {
    return {
      type: 'update', table: m[1].toLowerCase(),
      setCol: m[2].toLowerCase(), setVal: m[3] !== undefined ? m[3] : parseInt(m[4]),
      whereCol: m[5].toLowerCase(), whereVal: m[6] !== undefined ? m[6] : parseInt(m[7]),
    };
  }
  if ((m = s.match(/^delete\s+from\s+(\w+)\s+where\s+(\w+)\s*=\s*(?:'([^']*)'|(\d+))/i))) {
    return { type: 'delete', table: m[1].toLowerCase(), whereCol: m[2].toLowerCase(), whereVal: m[3] !== undefined ? m[3] : parseInt(m[4]) };
  }
  if ((m = s.match(/^create\s+table\s+(\w+)\s*\(([^)]+)\)/i))) {
    const colDefs = m[2].split(',').map(c => {
      const parts = c.trim().split(/\s+/);
      return { name: parts[0], type: parts.slice(1).join(' ') || 'text' };
    });
    return { type: 'create_table', table: m[1].toLowerCase(), columns: colDefs };
  }
  if ((m = s.match(/^drop\s+(table|database|schema)\s+(\w+)/i))) {
    return { type: 'drop', what: m[1], name: m[2].toLowerCase() };
  }
  if (s === '\\dt') return { type: 'list_tables' };
  if ((m = s.match(/^\\d\s+(\w+)/))) return { type: 'describe', table: m[1].toLowerCase() };
  return null;
}
