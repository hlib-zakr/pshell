// State change event system — decouples cross-system cascades
// Instead of docker.js manually updating services + processes + SQL,
// it emits 'container:stop' and listeners handle the cascade.

export const stateEvents = {
  _listeners: {},

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    for (const fn of this._listeners[event]) {
      try { fn(data); } catch (e) { console.warn(`Event ${event} listener error:`, e); }
    }
  },
};

// ─── Built-in cascade listeners ───

// Container stopped → sync services, kill processes, disconnect SQL
stateEvents.on('container:stop', ({ name, state }) => {
  const sim = state.sim;
  const c = sim.docker.containers[name];
  // Sync service state
  if (sim.services[name]) sim.services[name].active = false;
  // Kill linked processes
  for (const p of sim.processes.list) {
    if (p.linkedContainer === name) sim.processes.killedPids.add(p.pid);
  }
  // SQL connection
  if (name === 'postgres') sim.sql.connected = false;

  // Restart policy — if not manually stopped/paused and policy allows, auto-restart
  if (c && !c.manuallyStopped && c.status !== 'paused' && c.restartPolicy) {
    const policy = c.restartPolicy.name;
    if (policy === 'always' || policy === 'unless-stopped') {
      // Auto-restart: transition through restarting → running
      c.status = 'restarting';
      c.restartCount++;
      // Simulate restart completing (instant in our sim)
      c.status = 'running';
      c.startedAt = Date.now();
      c.finishedAt = null;
      c.exitCode = 0;
      c.oomKilled = false;
      if (c.healthCheck) c.health = 'healthy';
      // Restore services and processes
      if (sim.services[name]) {
        sim.services[name].active = true;
        sim.services[name].startedAt = Date.now();
      }
      for (const p of sim.processes.list) {
        if (p.linkedContainer === name) sim.processes.killedPids.delete(p.pid);
      }
      if (name === 'postgres') sim.sql.connected = true;
    } else if (policy === 'on-failure' && c.exitCode !== 0) {
      const max = c.restartPolicy.maximumRetryCount || 0;
      if (max === 0 || c.restartCount < max) {
        c.restartCount++;
        c.status = 'running';
        c.startedAt = Date.now();
        c.finishedAt = null;
        if (c.healthCheck) c.health = 'healthy';
        if (sim.services[name]) {
          sim.services[name].active = true;
          sim.services[name].startedAt = Date.now();
        }
        for (const p of sim.processes.list) {
          if (p.linkedContainer === name) sim.processes.killedPids.delete(p.pid);
        }
        if (name === 'postgres') sim.sql.connected = true;
      }
    }
  }
});

// Container started → restore services, processes, SQL
stateEvents.on('container:start', ({ name, state }) => {
  const sim = state.sim;
  const c = sim.docker.containers[name];
  if (sim.services[name]) {
    sim.services[name].active = true;
    sim.services[name].startedAt = Date.now();
  }
  for (const p of sim.processes.list) {
    if (p.linkedContainer === name) sim.processes.killedPids.delete(p.pid);
  }
  if (name === 'postgres') sim.sql.connected = true;

  // Health check transition
  if (c && c.healthCheck) {
    c.health = 'starting';
    // Simulate health check passing (instant in sim)
    // matrix-rain stays unhealthy (it's the broken container)
    if (name === 'matrix-rain') {
      c.health = 'unhealthy';
    } else {
      c.health = 'healthy';
    }
  }
});

// Container OOM killed → exit, sync services, check restart policy
stateEvents.on('container:oom', ({ name, state }) => {
  const sim = state.sim;
  const c = sim.docker.containers[name];
  if (!c) return;

  c.status = 'exited';
  c.exitCode = 137;
  c.oomKilled = true;
  c.finishedAt = Date.now();

  // Sync services
  if (sim.services[name]) sim.services[name].active = false;

  // Kill linked processes
  for (const p of sim.processes.list) {
    if (p.linkedContainer === name) sim.processes.killedPids.add(p.pid);
  }

  // SQL connection
  if (name === 'postgres') sim.sql.connected = false;

  // Check restart policy
  if (!c.manuallyStopped) {
    const policy = c.restartPolicy?.name;
    if (policy === 'always' || policy === 'unless-stopped') {
      c.restartCount++;
      c.status = 'running';
      c.startedAt = Date.now();
      c.finishedAt = null;
      c.oomKilled = false;
      c.memoryUsage = Math.floor(c.memoryLimit * 0.3); // reset to 30% after restart
      if (c.healthCheck) c.health = name === 'matrix-rain' ? 'unhealthy' : 'healthy';

      // Restore services
      if (sim.services[name]) {
        sim.services[name].active = true;
        sim.services[name].startedAt = Date.now();
      }
      for (const p of sim.processes.list) {
        if (p.linkedContainer === name) sim.processes.killedPids.delete(p.pid);
      }
      if (name === 'postgres') sim.sql.connected = true;
    } else if (policy === 'on-failure') {
      const max = c.restartPolicy.maximumRetryCount || 0;
      if (max === 0 || c.restartCount < max) {
        c.restartCount++;
        c.status = 'running';
        c.startedAt = Date.now();
        c.finishedAt = null;
        c.oomKilled = false;
        c.memoryUsage = Math.floor(c.memoryLimit * 0.3);
        if (c.healthCheck) c.health = name === 'matrix-rain' ? 'unhealthy' : 'healthy';
        if (sim.services[name]) {
          sim.services[name].active = true;
          sim.services[name].startedAt = Date.now();
        }
        for (const p of sim.processes.list) {
          if (p.linkedContainer === name) sim.processes.killedPids.delete(p.pid);
        }
        if (name === 'postgres') sim.sql.connected = true;
      }
    }
    // policy === 'no' → stays dead (matrix-rain's default)
  }
});

// Full system reboot → restore everything
stateEvents.on('system:reboot', ({ state }) => {
  const sim = state.sim;
  sim.processes.kernelPanic = false;
  sim.processes.killedPids.clear();
  for (const [name, c] of Object.entries(sim.docker.containers)) {
    c.status = 'running';
    c.startedAt = Date.now();
    c.finishedAt = null;
    c.exitCode = 0;
    c.oomKilled = false;
    c.manuallyStopped = false;
    c.restartCount = 0;
    // Reset memory usage (matrix-rain back to initial leak-in-progress level)
    if (name === 'matrix-rain') {
      c.memoryUsage = 98000000;
    } else if (c.memoryUsage) {
      c.memoryUsage = Math.floor(c.memoryLimit * 0.3);
    }
    if (c.healthCheck) {
      c.health = name === 'matrix-rain' ? 'unhealthy' : 'healthy';
    }
  }
  sim.k8s.deletedPods.clear();
  for (const s of Object.values(sim.services)) {
    s.active = true;
    s.startedAt = Date.now();
  }
  sim.sql.connected = true;
});
