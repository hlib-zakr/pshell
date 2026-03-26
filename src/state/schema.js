// Schema validation — ensures all state fields exist with correct types
// Called after loadSimState() and after every migration

export function validateSimState(state) {
  if (!state) return state;

  // Version
  if (!state._version) state._version = 2;

  // Session
  if (!state.session) state.session = {};
  const s = state.session;
  if (typeof s.cwd !== 'string') s.cwd = '/home/classified';
  if (typeof s.hackedMainframe !== 'boolean') s.hackedMainframe = false;
  if (typeof s.foundPort !== 'boolean') s.foundPort = false;
  if (typeof s.sudoCount !== 'number') s.sudoCount = 0;
  if (typeof s.rmCount !== 'number') s.rmCount = 0;
  if (typeof s.exitAttempts !== 'number') s.exitAttempts = 0;

  // Git
  if (!state.git) state.git = {};
  const g = state.git;
  if (typeof g.branch !== 'string') g.branch = 'main';
  if (!Array.isArray(g.branches)) g.branches = ['main'];
  if (!Array.isArray(g.commits)) g.commits = [];
  if (!Array.isArray(g.staged)) g.staged = [];
  if (!Array.isArray(g.stashes)) g.stashes = [];
  if (typeof g.stashCounter !== 'number') g.stashCounter = g.stashes.length;

  // Docker
  if (!state.docker) state.docker = {};
  if (!state.docker.containers || typeof state.docker.containers !== 'object') state.docker.containers = {};
  if (!state.docker.networks || typeof state.docker.networks !== 'object') state.docker.networks = {};
  if (!state.docker.volumes || typeof state.docker.volumes !== 'object') state.docker.volumes = {};
  if (!Array.isArray(state.docker.events)) state.docker.events = [];
  if (!state.docker.compose || typeof state.docker.compose !== 'object') {
    state.docker.compose = { projectName: 'pshell', services: {} };
  }

  // SQL
  if (!state.sql) state.sql = {};
  if (typeof state.sql.connected !== 'boolean') state.sql.connected = true;
  if (!state.sql.tables || typeof state.sql.tables !== 'object') state.sql.tables = {};

  // Filesystem
  if (!state.fs) state.fs = {};
  if (!state.fs.createdFiles || typeof state.fs.createdFiles !== 'object') state.fs.createdFiles = {};
  if (!(state.fs.deletedFiles instanceof Set)) state.fs.deletedFiles = new Set(state.fs.deletedFiles?.__set || []);
  if (!state.fs.modifiedFiles || typeof state.fs.modifiedFiles !== 'object') state.fs.modifiedFiles = {};
  if (!(state.fs.createdDirs instanceof Set)) state.fs.createdDirs = new Set(state.fs.createdDirs?.__set || []);

  // K8s
  if (!state.k8s) state.k8s = {};
  if (!Array.isArray(state.k8s.pods)) state.k8s.pods = [];
  if (!(state.k8s.deletedPods instanceof Set)) state.k8s.deletedPods = new Set(state.k8s.deletedPods?.__set || []);
  if (!Array.isArray(state.k8s.nodes)) state.k8s.nodes = [];
  if (!Array.isArray(state.k8s.services)) state.k8s.services = [];
  if (!Array.isArray(state.k8s.deployments)) state.k8s.deployments = [];
  if (!Array.isArray(state.k8s.helmReleases)) state.k8s.helmReleases = [];

  // Services
  if (!state.services || typeof state.services !== 'object') state.services = {};

  // Crontab
  if (!Array.isArray(state.crontab)) state.crontab = [];

  // Processes
  if (!state.processes) state.processes = {};
  if (!Array.isArray(state.processes.list)) state.processes.list = [];
  if (!(state.processes.killedPids instanceof Set)) state.processes.killedPids = new Set(state.processes.killedPids?.__set || []);
  if (typeof state.processes.kernelPanic !== 'boolean') state.processes.kernelPanic = false;

  // Environment variables
  if (!state.env || typeof state.env !== 'object') state.env = {};

  // Aliases
  if (!state.aliases || typeof state.aliases !== 'object') state.aliases = {};

  // Counters
  if (typeof state.commandCount !== 'number') state.commandCount = 0;
  if (!(state.filesRead instanceof Set)) state.filesRead = new Set(state.filesRead?.__set || []);
  if (typeof state.startedAt !== 'number') state.startedAt = Date.now();
  if (!Array.isArray(state._history)) state._history = [];

  return state;
}
