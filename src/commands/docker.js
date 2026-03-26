import { formatUptime, pushDockerEvent, generateFullId, formatDockerStatus, COMPOSE_YAML } from '../state/simulation-state.js';
import { parseCommand } from './parse.js';
import { stateEvents } from '../state/events.js';

function formatImageCreated(ts) {
  if (!ts) return '2 weeks ago';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days < 1) return 'Less than a day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function resolveContainerName(name, state) {
  const containers = state.sim.docker.containers;
  // Direct match
  if (containers[name]) return name;
  // Try stripping compose project prefix: "pshell-api-nginx-1" → "nginx"
  const compose = state.sim.docker.compose;
  if (compose) {
    for (const [svcName, svc] of Object.entries(compose.services)) {
      const composeName = `${compose.projectName}-${svcName}-1`;
      if (name === composeName) return svc.container;
    }
  }
  return name; // return as-is, will fail in lookup
}

function topologicalSort(services) {
  const visited = new Set();
  const result = [];
  function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);
    const svc = services[name];
    if (svc) {
      for (const dep of svc.depends_on) visit(dep);
    }
    result.push(name);
  }
  for (const name of Object.keys(services)) visit(name);
  return result;
}

export const dockerCommands = [
  {
    match: cmd => cmd === 'docker' || cmd === 'docker --help',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Usage: docker <command>', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Commands: ps, images, logs, stats, stop, start, kill,', 'about-text');
      term.addLine('rm, run, exec, inspect, pause, unpause, update,', 'about-text');
      term.addLine('events, build, pull, push, network, volume, system, compose', 'about-text');
      term.addLine('', 'blank');
    },
  },
  // ── Docker Compose ──
  {
    meta: { name: 'docker compose up', desc: 'Start compose services', category: 'docker' },
    match: cmd => /^docker[ -]compose up/.test(cmd),
    handler: async (cmd, { term, state, sleep }) => {
      const compose = state.sim.docker.compose;
      const containers = state.sim.docker.containers;
      const order = topologicalSort(compose.services);
      const total = order.length;

      term.addLine(`[+] Running ${total}/${total}`, 'about-text');
      for (const svcName of order) {
        const svc = compose.services[svcName];
        if (!svc) continue;
        const c = containers[svc.container];
        if (!c) continue;

        c.status = 'running';
        c.startedAt = Date.now();
        c.finishedAt = null;
        c.exitCode = 0;
        c.manuallyStopped = false;
        if (c.healthCheck) c.health = svcName === 'matrix-rain' ? 'unhealthy' : 'healthy';

        pushDockerEvent(state, svc.container, 'start');
        stateEvents.emit('container:start', { name: svc.container, state });

        const displayName = `${compose.projectName}-${svcName}-1`;
        const time = (Math.random() * 0.8 + 0.2).toFixed(1);
        term.addLine(` \u2714 Container ${displayName.padEnd(35)} Started     ${time}s`, 'about-text');
        await sleep(80);
      }
    },
  },
  {
    meta: { name: 'docker compose down', desc: 'Stop compose services', category: 'docker' },
    match: cmd => /^docker[ -]compose down/.test(cmd),
    handler: async (cmd, { term, state, sleep }) => {
      const compose = state.sim.docker.compose;
      const containers = state.sim.docker.containers;
      const order = topologicalSort(compose.services).reverse();
      const hasV = cmd.includes('-v') || cmd.includes('--volumes');
      const total = order.length + (hasV ? 2 : 1);
      let count = 0;

      term.addLine(`[+] Running ${total}/${total}`, 'about-text');
      for (const svcName of order) {
        const svc = compose.services[svcName];
        if (!svc) continue;
        const c = containers[svc.container];
        if (!c || c.status !== 'running') continue;

        c.status = 'exited';
        c.exitCode = 0;
        c.finishedAt = Date.now();
        c.manuallyStopped = true;

        pushDockerEvent(state, svc.container, 'stop');
        stateEvents.emit('container:stop', { name: svc.container, state });

        count++;
        const displayName = `${compose.projectName}-${svcName}-1`;
        const time = (Math.random() * 0.5 + 0.1).toFixed(1);
        term.addLine(` \u2714 Container ${displayName.padEnd(35)} Stopped     ${time}s`, 'about-text');
        await sleep(60);
      }

      if (hasV) {
        const deletedVols = Object.keys(state.sim.docker.volumes);
        for (const volName of deletedVols) {
          term.addLine(` \u2714 Volume ${volName.padEnd(40)} Removed     0.0s`, 'about-text');
          delete state.sim.docker.volumes[volName];
        }
      }

      const composeNetwork = Object.keys(state.sim.docker.networks).find(n => n !== 'bridge' && n !== 'host') || 'pshell-network';
      term.addLine(` \u2714 Network ${composeNetwork.padEnd(40)} Removed     0.1s`, 'about-text');
    },
  },
  {
    meta: { name: 'docker compose ps', desc: 'List compose services', category: 'docker' },
    match: cmd => /^docker[ -]compose ps/.test(cmd),
    handler: async (cmd, { term, state }) => {
      const compose = state.sim.docker.compose;
      const containers = state.sim.docker.containers;

      term.addLine('NAME                              SERVICE        STATUS       PORTS', 'about-text');
      for (const [svcName, svc] of Object.entries(compose.services)) {
        const c = containers[svc.container];
        if (!c) continue;
        const displayName = `${compose.projectName}-${svcName}-1`;
        const status = c.status === 'running' ? 'running' : c.status;

        let portStr = '';
        if (c.ports && c.status === 'running') {
          portStr = Object.entries(c.ports).map(([cp, b]) => `${b.HostIp}:${b.HostPort}->${cp}`).join(', ');
        }

        term.addLine(`${displayName.padEnd(34)}${svcName.padEnd(15)}${status.padEnd(13)}${portStr}`, 'about-text');
      }
    },
  },
  {
    meta: { name: 'docker compose logs', desc: 'Service logs (colored)', category: 'docker' },
    match: cmd => /^docker[ -]compose logs/.test(cmd),
    handler: async (cmd, { term, state, sleep, rawCmd }) => {
      const compose = state.sim.docker.compose;
      const containers = state.sim.docker.containers;
      const { args } = parseCommand(rawCmd || cmd);
      const targetService = args[2] || null;

      const LOG_DATA = {};
      for (const [svcName, svc] of Object.entries(compose.services)) {
        const c = containers[svc.container];
        if (!c) continue;
        const port = Object.values(c.ports || {})[0]?.HostPort || '3000';
        const image = (c.image || '').split(':')[0];

        if (image.includes('postgres')) {
          LOG_DATA[svcName] = ['LOG:  database system is ready to accept connections', 'LOG:  autovacuum launcher started', 'LOG:  checkpoint complete: wrote 42 buffers'];
        } else if (image.includes('redis')) {
          LOG_DATA[svcName] = ['Ready to accept connections', 'DB loaded from append only file', 'Background saving terminated with success'];
        } else if (image.includes('nginx')) {
          LOG_DATA[svcName] = ['nginx/1.24', 'worker process started', '10.0.1.50 - GET /api/users 200 12ms'];
        } else {
          LOG_DATA[svcName] = [`Server starting on port ${port}`, 'Connected to database', 'Ready'];
        }
      }

      const servicesToShow = targetService
        ? { [targetService]: compose.services[targetService] }
        : compose.services;

      for (const [svcName, svc] of Object.entries(servicesToShow)) {
        if (!svc) continue;
        const c = containers[svc.container];
        if (!c) continue;
        const logs = LOG_DATA[svcName] || ['Process started'];
        const maxNameLen = Math.max(...Object.keys(servicesToShow).map(n => n.length));

        for (const log of logs) {
          term.addLine(`${svcName.padEnd(maxNameLen)}  | ${log}`, 'about-text');
          await sleep(30);
        }
      }
    },
  },
  {
    meta: { name: 'docker compose restart', desc: 'Restart compose services', category: 'docker' },
    match: cmd => /^docker[ -]compose restart/.test(cmd),
    handler: async (cmd, { term, state, sleep, rawCmd }) => {
      const compose = state.sim.docker.compose;
      const containers = state.sim.docker.containers;
      const { args } = parseCommand(rawCmd || cmd);
      const targetService = args[2] || null;

      const services = targetService
        ? { [targetService]: compose.services[targetService] }
        : compose.services;

      const total = Object.keys(services).length;
      term.addLine(`[+] Running ${total}/${total}`, 'about-text');

      for (const [svcName, svc] of Object.entries(services)) {
        if (!svc) continue;
        const c = containers[svc.container];
        if (!c) continue;
        c.startedAt = Date.now();
        c.status = 'running';
        c.finishedAt = null;
        c.manuallyStopped = false;
        const displayName = `${compose.projectName}-${svcName}-1`;
        const time = (Math.random() * 0.5 + 0.3).toFixed(1);
        term.addLine(` \u2714 Container ${displayName.padEnd(35)} Started     ${time}s`, 'about-text');
        await sleep(60);
      }
    },
  },
  {
    meta: { name: 'docker compose config', desc: 'Show compose YAML', category: 'docker' },
    match: cmd => /^docker[ -]compose config/.test(cmd),
    handler: async (cmd, { term }) => {
      for (const line of COMPOSE_YAML.split('\n')) {
        term.addLine(line, 'about-text');
      }
    },
  },
  {
    match: 'docker images',
    handler: async (cmd, { term, state }) => {
      const containers = state.sim.docker.containers;
      const knownSizes = { 'nginx': '142MB', 'postgres': '379MB', 'redis': '28MB', 'node': '175MB' };

      term.addLine('', 'blank');
      term.addLine('REPOSITORY          TAG       IMAGE ID       CREATED        SIZE', 'about-text');

      const seen = new Set();
      for (const [name, c] of Object.entries(containers)) {
        const imageStr = c.image;
        if (seen.has(imageStr)) continue;
        seen.add(imageStr);
        const [repo, tag] = imageStr.split(':');
        const id = generateFullId(imageStr).slice(0, 12);
        const baseImage = repo.split('/').pop().split('-')[0];
        const size = knownSizes[baseImage] || `${Math.floor(Math.random() * 200 + 50)}MB`;
        const created = formatImageCreated(c.startedAt ? c.startedAt - 3600000 : null);
        term.addLine(`${repo.padEnd(20)}${(tag || 'latest').padEnd(10)}${id}   ${created.padEnd(15)}${size}`, 'about-text');
      }
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'docker logs <name>', desc: 'Container logs', category: 'docker' },
    match: cmd => cmd.startsWith('docker logs'),
    handler: async (cmd, { term, sleep, state, rawCmd }) => {
      const container = resolveContainerName((rawCmd || cmd).split(/\s+/)[2] || 'pshell-api', state);
      const c = state.sim.docker.containers[container];
      if (!c) {
        term.addLine(`Error response from daemon: No such container: ${container}`, 'danger-text');
        return;
      }
      term.addLine('', 'blank');
      const d = new Date(c.startedAt).toISOString().slice(0, 10);
      const port = Object.values(c.ports || {})[0]?.HostPort || '3000';
      const logs = [
        `[${container}] ${d}T08:00:00Z INFO  Server starting...`,
        `[${container}] ${d}T08:00:01Z INFO  Connected to database`,
        `[${container}] ${d}T08:00:02Z INFO  Listening on port ${port}`,
        `[${container}] ${d}T09:15:00Z INFO  New player connected`,
        `[${container}] ${d}T09:15:42Z WARN  Player missed rm -rf /`,
        `[${container}] ${d}T09:15:42Z INFO  Incident report #4242 created`,
      ];
      for (const log of logs) {
        term.addLine(log, 'about-text');
        await sleep(40);
      }
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'docker stats', desc: 'Resource usage', category: 'docker' },
    match: cmd => cmd === 'docker stats' || cmd === 'docker stats --no-stream',
    handler: async (cmd, { term, state }) => {
      const containers = state.sim.docker.containers;

      function formatBytes(bytes) {
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + 'GiB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + 'MiB';
        return (bytes / 1024).toFixed(1) + 'KiB';
      }

      term.addLine('CONTAINER ID   NAME                CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS', 'about-text');

      for (const [name, c] of Object.entries(containers)) {
        if (c.status !== 'running') continue;

        const id = generateFullId(name).slice(0, 12);
        const baseCpu = (c.nanoCpus / 1e9) * 100;
        const cpu = (baseCpu * (0.3 + Math.random() * 1.4)).toFixed(2);

        // Memory leak for matrix-rain: usage creeps up each time stats is called
        if (name === 'matrix-rain') {
          c.memoryUsage = Math.min(c.memoryUsage + Math.floor(Math.random() * 5000000) + 2000000, Math.floor(c.memoryLimit * 1.1));
        }

        const memUsage = name === 'matrix-rain' ? c.memoryUsage : Math.floor(c.memoryUsage * (0.85 + Math.random() * 0.3));
        const memPercent = ((memUsage / c.memoryLimit) * 100).toFixed(2);
        const memStr = `${formatBytes(memUsage)} / ${formatBytes(c.memoryLimit)}`;

        const netIn = (Math.random() * 50 + 1).toFixed(1);
        const netOut = (Math.random() * 20 + 0.5).toFixed(1);
        const blockIn = (Math.random() * 10).toFixed(1);
        const blockOut = (Math.random() * 5).toFixed(1);

        // Count PIDs from process list
        const procs = state.sim.processes;
        let pids = 0;
        for (const p of procs.list) {
          if (p.linkedContainer === name && !procs.killedPids.has(p.pid)) pids++;
        }
        if (pids === 0) pids = 1; // at least 1 process per running container

        term.addLine(
          `${id}   ${name.padEnd(20)}${cpu.padStart(5)}%     ${memStr.padEnd(22)}${memPercent.padStart(5)}%     ${netIn}MB / ${netOut}MB`.padEnd(88) + `${blockIn}MB / ${blockOut}MB`.padEnd(18) + `${pids}`,
          name === 'matrix-rain' && parseFloat(memPercent) > 90 ? 'danger-text' : 'about-text'
        );
      }

      // Check for OOM after displaying stats
      const mr = containers['matrix-rain'];
      if (mr && mr.status === 'running' && mr.memoryUsage > mr.memoryLimit) {
        term.addLine('', 'blank');
        term.addLine('WARNING: Container matrix-rain exceeded memory limit \u2014 OOM killed', 'danger-text');
        stateEvents.emit('container:oom', { name: 'matrix-rain', state });
        pushDockerEvent(state, 'matrix-rain', 'oom');
      }
    },
  },
  {
    meta: { name: 'docker stop <name>', desc: 'Stop container (stateful)', category: 'docker' },
    match: cmd => cmd.startsWith('docker stop'),
    handler: async (cmd, { term, state, sleep, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = resolveContainerName(args[1], state);
      const containers = state.sim.docker.containers;
      if (!containers[name]) {
        term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text');
        return;
      }
      if (name === 'pshell-api') {
        term.addLine('You can\'t stop the main API. That\'s the core service.', 'about-text');
        return;
      }
      if (name === 'about-terminal') {
        term.addLine('You can\'t stop the terminal you\'re using right now.', 'about-text');
        return;
      }
      containers[name].status = 'exited';
      containers[name].exitCode = 0;
      containers[name].finishedAt = Date.now();
      containers[name].manuallyStopped = true;
      pushDockerEvent(state, name, 'stop');

      stateEvents.emit('container:stop', { name, state });

      await sleep(200);
      term.addLine(name, 'about-text');
    },
  },
  {
    meta: { name: 'docker kill <name>', desc: 'Kill container (stateful)', category: 'docker' },
    match: cmd => cmd.startsWith('docker kill'),
    handler: async (cmd, { term, state, sleep, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = resolveContainerName(args[1], state);
      const containers = state.sim.docker.containers;
      if (!containers[name]) {
        term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text');
        return;
      }
      if (name === 'pshell-api') {
        term.addLine('You can\'t stop the main API. That\'s the core service.', 'about-text');
        return;
      }
      if (name === 'about-terminal') {
        term.addLine('You can\'t stop the terminal you\'re using right now.', 'about-text');
        return;
      }
      containers[name].status = 'exited';
      containers[name].exitCode = 137;
      containers[name].finishedAt = Date.now();
      containers[name].manuallyStopped = true;
      pushDockerEvent(state, name, 'kill');

      stateEvents.emit('container:stop', { name, state });

      await sleep(200);
      term.addLine(name, 'about-text');
    },
  },
  {
    meta: { name: 'docker start <name>', desc: 'Start container (stateful)', category: 'docker' },
    match: cmd => cmd.startsWith('docker start'),
    handler: async (cmd, { term, state, sleep, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = resolveContainerName(args[1], state);
      const containers = state.sim.docker.containers;
      if (!containers[name]) {
        term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text');
        return;
      }
      if (containers[name].status === 'running') {
        term.addLine(`Error response from daemon: Container ${name} is already running`, 'about-text');
        return;
      }
      containers[name].status = 'running';
      containers[name].startedAt = Date.now();
      containers[name].manuallyStopped = false;
      containers[name].finishedAt = null;
      containers[name].exitCode = 0;
      containers[name].oomKilled = false;
      // Reset memory usage on restart (matrix-rain back to initial leak level)
      if (name === 'matrix-rain') {
        containers[name].memoryUsage = 98000000;
      }
      if (containers[name].healthCheck) {
        containers[name].health = 'starting';
        containers[name].health = 'healthy';
      }
      pushDockerEvent(state, name, 'start');

      stateEvents.emit('container:start', { name, state });

      await sleep(200);
      term.addLine(name, 'about-text');
    },
  },
  {
    meta: { name: 'docker rm <name>', desc: 'Remove container', category: 'docker' },
    match: cmd => cmd.startsWith('docker rm'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args, flags } = parseCommand(rawCmd || cmd);
      const force = flags.f || flags.force || false;
      const removeVolumes = flags.v || flags.volumes || false;
      const name = resolveContainerName(args[1], state);
      const containers = state.sim.docker.containers;
      if (!name) {
        term.addLine('Error response from daemon: "docker rm" requires at least 1 argument.', 'about-text');
        return;
      }
      if (!containers[name]) {
        term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text');
        return;
      }
      if (containers[name].status === 'running') {
        if (force) {
          // Force stop first
          containers[name].status = 'exited';
          containers[name].exitCode = 137;
          containers[name].finishedAt = Date.now();
          containers[name].manuallyStopped = true;
          pushDockerEvent(state, name, 'kill');
          stateEvents.emit('container:stop', { name, state });
        } else {
          term.addLine(`Error response from daemon: cannot remove container "/${name}": container is running: stop the container before removing or force remove`, 'about-text');
          return;
        }
      }
      // Remove associated volumes if -v flag
      if (removeVolumes && containers[name].volumes) {
        for (const v of containers[name].volumes) {
          const volName = v.split(':')[0];
          if (state.sim.docker.volumes[volName]) {
            delete state.sim.docker.volumes[volName];
          }
        }
      }
      // Remove container from its network's containers map
      const netName = containers[name].network;
      if (netName && state.sim.docker.networks[netName] && state.sim.docker.networks[netName].containers) {
        delete state.sim.docker.networks[netName].containers[name];
      }
      pushDockerEvent(state, name, 'destroy');
      // Actually remove container
      delete containers[name];
      term.addLine(name, 'about-text');
    },
  },
  // ── Docker inspect ──
  {
    meta: { name: 'docker inspect <name>', desc: 'Container details (JSON)', category: 'docker' },
    match: cmd => cmd.startsWith('docker inspect'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = resolveContainerName(args[1], state);
      if (!name) { term.addLine('Error: requires at least 1 argument', 'about-text'); return; }
      const c = state.sim.docker.containers[name];
      if (!c) { term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text'); return; }

      const id = generateFullId(name);
      const inspect = [{
        Id: id,
        Created: new Date(c.startedAt - 3600000).toISOString(),
        Path: c.cmd[0],
        Args: c.cmd.slice(1),
        State: {
          Status: c.status,
          Running: c.status === 'running',
          Paused: c.status === 'paused',
          Restarting: c.status === 'restarting',
          OOMKilled: c.oomKilled,
          Dead: c.status === 'dead',
          Pid: c.status === 'running' ? c.pid : 0,
          ExitCode: c.exitCode,
          Error: '',
          StartedAt: new Date(c.startedAt).toISOString(),
          FinishedAt: c.finishedAt ? new Date(c.finishedAt).toISOString() : '0001-01-01T00:00:00Z',
        },
        Image: 'sha256:' + generateFullId(c.image),
        Name: '/' + name,
        RestartCount: c.restartCount,
        HostConfig: {
          RestartPolicy: c.restartPolicy,
          Memory: c.memoryLimit,
          NanoCpus: c.nanoCpus,
        },
        Config: {
          Hostname: name,
          Env: c.env,
          Cmd: c.cmd,
          Image: c.image,
        },
        NetworkSettings: {
          Networks: {
            [c.network]: {
              IPAddress: c.ip,
              Gateway: '172.18.0.1',
            }
          },
        },
        Mounts: c.volumes.map(v => {
          const [vol, dest] = v.split(':');
          return { Type: 'volume', Name: vol, Source: `/var/lib/docker/volumes/${vol}/_data`, Destination: dest };
        }),
      }];

      // Check for --format flag
      const formatMatch = (rawCmd || cmd).match(/--format\s+['"]?(\{\{[^}]+\}\})['"]?/);
      if (formatMatch) {
        const template = formatMatch[1]; // e.g., {{.State.Status}}
        const path = template.replace(/\{\{\.?/g, '').replace(/\}\}/g, '').split('.');
        let val = inspect[0];
        for (const key of path) {
          if (key && val) val = val[key];
        }
        term.addLine(typeof val === 'object' ? JSON.stringify(val) : String(val ?? ''), 'about-text');
      } else {
        // Pretty-print JSON
        const json = JSON.stringify(inspect, null, 4);
        for (const line of json.split('\n')) {
          term.addLine(line, 'about-text');
        }
      }
    },
  },
  // ── Docker pause ──
  {
    meta: { name: 'docker pause <name>', desc: 'Pause container', category: 'docker' },
    match: cmd => cmd.startsWith('docker pause'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = resolveContainerName(args[1], state);
      const c = state.sim.docker.containers[name];
      if (!c) { term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text'); return; }
      if (c.status !== 'running') { term.addLine(`Error response from daemon: Container ${name} is not running`, 'about-text'); return; }
      c.status = 'paused';
      pushDockerEvent(state, name, 'pause');
      stateEvents.emit('container:stop', { name, state });
      term.addLine(name, 'about-text');
    },
  },
  // ── Docker unpause ──
  {
    meta: { name: 'docker unpause <name>', desc: 'Unpause container', category: 'docker' },
    match: cmd => cmd.startsWith('docker unpause'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = resolveContainerName(args[1], state);
      const c = state.sim.docker.containers[name];
      if (!c) { term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text'); return; }
      if (c.status !== 'paused') { term.addLine(`Error response from daemon: Container ${name} is not paused`, 'about-text'); return; }
      c.status = 'running';
      pushDockerEvent(state, name, 'unpause');
      stateEvents.emit('container:start', { name, state });
      term.addLine(name, 'about-text');
    },
  },
  // ── Docker update ──
  {
    meta: { name: 'docker update <name>', desc: 'Update container resources', category: 'docker' },
    match: cmd => cmd.startsWith('docker update'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = args[args.length - 1]; // last arg is container name
      if (!name || name === 'update') { term.addLine('Error: "docker update" requires at least 2 arguments', 'about-text'); return; }

      const c = state.sim.docker.containers[name];
      if (!c) { term.addLine(`Error response from daemon: No such container: ${name}`, 'about-text'); return; }

      // Parse --memory flag
      const memMatch = (rawCmd || cmd).match(/--memory[= ](\d+[kmgKMG]?)/);
      if (memMatch) {
        const val = memMatch[1];
        let bytes;
        if (val.endsWith('g') || val.endsWith('G')) bytes = parseInt(val) * 1073741824;
        else if (val.endsWith('m') || val.endsWith('M')) bytes = parseInt(val) * 1048576;
        else if (val.endsWith('k') || val.endsWith('K')) bytes = parseInt(val) * 1024;
        else bytes = parseInt(val);
        c.memoryLimit = bytes;
      }

      // Parse --cpus flag
      const cpuMatch = (rawCmd || cmd).match(/--cpus[= ](\d+\.?\d*)/);
      if (cpuMatch) {
        c.nanoCpus = Math.floor(parseFloat(cpuMatch[1]) * 1e9);
      }

      term.addLine(name, 'about-text');
    },
  },
  // ── Docker events ──
  {
    meta: { name: 'docker events', desc: 'Container event stream', category: 'docker' },
    match: cmd => cmd === 'docker events' || cmd.startsWith('docker events'),
    handler: async (cmd, { term, state, sleep }) => {
      const events = state.sim.docker.events;
      if (events.length === 0) {
        term.addLine('(no events recorded yet)', 'about-text');
        return;
      }
      for (const e of events) {
        const ts = new Date(e.time).toISOString();
        term.addLine(`${ts} ${e.type} ${e.action} ${generateFullId(e.actor.name).slice(0,12)} (image=${e.actor.image}, name=${e.actor.name})`, 'about-text');
        await sleep(20);
      }
    },
  },
  // ── Docker exec (SSH into containers) ──
  {
    meta: { name: 'docker exec -it <c> bash', desc: 'Shell into container', category: 'docker' },
    match: cmd => /^docker exec\s+(-it\s+)?(\S+)\s+(bash|sh)$/.test(cmd),
    handler: async (cmd, { term, state, win }) => {
      const m = cmd.match(/^docker exec\s+(?:-it\s+)?(\S+)\s+(?:bash|sh)$/);
      const containerName = resolveContainerName(m[1], state);
      const containers = state.sim.docker.containers;

      if (!containers[containerName]) {
        term.addLine(`Error response from daemon: No such container: ${containerName}`, 'about-text');
        return;
      }
      if (containers[containerName].status !== 'running') {
        term.addLine(`Error: Container ${containerName} is not running`, 'danger-text');
        return;
      }

      // ── Container-specific data ──
      const CONTAINER_DATA = {
        'nginx': {
          files: {
            '/etc/nginx/nginx.conf': 'worker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n  server {\n    listen 80;\n    server_name pshell.dev;\n    location / { proxy_pass http://pshell-api:3000; }\n    location /api { proxy_pass http://leaderboard-api:3001; }\n  }\n}',
            '/var/log/nginx/access.log': '172.18.0.1 - - [25/Mar/2026:12:00:01] "GET / HTTP/1.1" 200 3842\n172.18.0.1 - - [25/Mar/2026:12:00:02] "GET /api/leaderboard HTTP/1.1" 200 1024\n172.18.0.1 - - [25/Mar/2026:12:00:05] "POST /api/score HTTP/1.1" 201 64',
            '/var/log/nginx/error.log': '[warn] 1024 worker_connections are not enough',
          },
          env: { NGINX_VERSION: '1.24', WORKER_PROCESSES: 'auto' },
          processes: [
            { user: 'root', pid: 1, cpu: '0.0', mem: '0.1', cmd: 'nginx: master process nginx -g daemon off;' },
            { user: 'nginx', pid: 29, cpu: '0.0', mem: '0.1', cmd: 'nginx: worker process' },
            { user: 'nginx', pid: 30, cpu: '0.0', mem: '0.1', cmd: 'nginx: worker process' },
          ],
        },
        'postgres': {
          files: {
            '/var/lib/postgresql/data/postgresql.conf': "max_connections = 100\nshared_buffers = 256MB\neffective_cache_size = 768MB\nwork_mem = 4MB\nwal_level = replica\nlog_destination = 'stderr'",
            '/var/log/postgresql.log': 'LOG:  database system is ready to accept connections\nLOG:  autovacuum launcher started\nLOG:  checkpoint complete: wrote 42 buffers',
          },
          env: { POSTGRES_DB: 'prod', POSTGRES_USER: 'admin', PGDATA: '/var/lib/postgresql/data' },
          processes: [
            { user: 'postgres', pid: 1, cpu: '0.2', mem: '1.5', cmd: 'postgres' },
            { user: 'postgres', pid: 27, cpu: '0.0', mem: '0.3', cmd: 'postgres: writer process' },
            { user: 'postgres', pid: 28, cpu: '0.0', mem: '0.2', cmd: 'postgres: wal writer process' },
          ],
        },
        'redis': {
          files: {
            '/etc/redis/redis.conf': 'bind 0.0.0.0\nport 6379\nmaxmemory 256mb\nmaxmemory-policy allkeys-lru\nappendonly yes\nsave 900 1\nsave 300 10',
            '/var/log/redis/redis.log': 'Ready to accept connections\nDB loaded from append only file: 0.042 seconds\nBackground saving terminated with success',
          },
          env: { REDIS_VERSION: '7.0', REDIS_PORT: '6379' },
          processes: [
            { user: 'redis', pid: 1, cpu: '0.3', mem: '0.8', cmd: 'redis-server *:6379' },
          ],
        },
        'pshell-api': {
          files: {
            '/app/package.json': '{\n  "name": "pshell-api",\n  "version": "2.0.0",\n  "main": "src/main.js",\n  "scripts": {\n    "start": "node src/main.js",\n    "dev": "nodemon src/main.js"\n  }\n}',
            '/app/src/main.js': "const express = require('express');\nconst app = express();\napp.listen(process.env.PORT, () => {\n  console.log(`PShell API running on port ${process.env.PORT}`);\n});",
            '/app/.env': 'NODE_ENV=production\nPORT=3000\nDATABASE_URL=postgres://admin@postgres:5432/prod\nSECRET_KEY=you-wish-you-could-read-this',
          },
          env: { NODE_ENV: 'production', PORT: '3000', DATABASE_URL: 'postgres://admin@postgres:5432/prod' },
          processes: [
            { user: 'node', pid: 1, cpu: '0.5', mem: '2.1', cmd: 'node /app/pshell-api.js' },
          ],
        },
        'leaderboard-api': {
          files: {
            '/app/package.json': '{\n  "name": "leaderboard-api",\n  "version": "1.3.0",\n  "main": "api.js",\n  "scripts": {\n    "start": "node api.js"\n  }\n}',
            '/app/api.js': "const express = require('express');\nconst redis = require('redis');\nconst app = express();\nconst client = redis.createClient({ url: process.env.REDIS_URL });\napp.get('/leaderboard', async (req, res) => {\n  const scores = await client.zrevrange('scores', 0, 9);\n  res.json(scores);\n});",
          },
          env: { NODE_ENV: 'production', PORT: '3001', REDIS_URL: 'redis://redis:6379' },
          processes: [
            { user: 'node', pid: 1, cpu: '0.3', mem: '1.8', cmd: 'node /app/leaderboard-api.js' },
          ],
        },
      };

      const data = CONTAINER_DATA[containerName] || {
        files: {},
        env: {},
        processes: [{ user: 'root', pid: 1, cpu: '0.0', mem: '0.1', cmd: '/bin/sh' }],
      };

      // Show banner
      term.addLine(`root@${containerName}:/#`, 'about-cmd');

      // Enter sub-shell — returns a Promise that resolves only on `exit`
      await new Promise((resolve) => {
        const shellHistory = [];
        let shellHistoryIdx = 0;

        function showShellPrompt() {
          const promptLine = document.createElement('div');
          promptLine.className = 'line input-line about-prompt-line';
          promptLine.innerHTML = `<span class="prompt">root@${containerName}:/# </span>`;

          const shellInput = document.createElement('input');
          shellInput.type = 'text';
          shellInput.className = 'about-cmd-input';
          shellInput.autocomplete = 'off';
          shellInput.spellcheck = false;

          promptLine.appendChild(shellInput);
          term.linesContainer.appendChild(promptLine);
          term._scrollToBottom();
          setTimeout(() => shellInput.focus(), 50);

          // Click on body focuses input (works for both main terminal and about window)
          const body = win.querySelector('.gt-body') || win.querySelector('#terminal-body');
          if (body) {
            const bodyClickHandler = (e) => { if (e.target.closest('a')) return; if (e.target.closest('.dot')) return; shellInput.focus(); };
            body.addEventListener('click', bodyClickHandler);
            const observer = new MutationObserver(() => {
              if (!promptLine.parentNode) { body.removeEventListener('click', bodyClickHandler); observer.disconnect(); }
            });
            observer.observe(term.linesContainer, { childList: true });
          }

          shellInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (shellHistoryIdx > 0) { shellHistoryIdx--; shellInput.value = shellHistory[shellHistoryIdx]; }
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (shellHistoryIdx < shellHistory.length - 1) { shellHistoryIdx++; shellInput.value = shellHistory[shellHistoryIdx]; }
              else { shellHistoryIdx = shellHistory.length; shellInput.value = ''; }
              return;
            }
            if (e.key !== 'Enter') return;
            e.stopPropagation();
            const rawShellCmd = shellInput.value.trim();
            if (!rawShellCmd) return;

            const shellCmd = rawShellCmd.toLowerCase();
            shellHistory.push(rawShellCmd);
            shellHistoryIdx = shellHistory.length;

            // Echo the command
            term.addLine(`root@${containerName}:/# ${rawShellCmd}`, 'about-cmd');
            promptLine.remove();

            // Process sub-shell commands
            if (shellCmd === 'exit') {
              term.addLine('', 'blank');
              resolve();
              return;
            }

            if (shellCmd === 'help') {
              term.addLine('', 'blank');
              term.addLine('Available commands:', 'about-heading');
              const helpCmds = [
                ['ls', 'List files'],
                ['cat <file>', 'Read a file'],
                ['env', 'Show environment variables'],
                ['ps aux', 'Show running processes'],
                ['pwd', 'Print working directory'],
                ['whoami', 'Show current user'],
                ['hostname', 'Show container hostname'],
                ['exit', 'Exit container shell'],
              ];
              for (const [c, d] of helpCmds) {
                term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
              }
              term.addLine('', 'blank');
            } else if (shellCmd === 'ls' || shellCmd === 'ls -la' || shellCmd === 'ls -l' || shellCmd === 'ls -a') {
              const fileNames = Object.keys(data.files);
              if (fileNames.length === 0) {
                term.addLine('(empty)', 'about-text');
              } else {
                for (const f of fileNames) {
                  term.addLine(f, 'about-access');
                }
              }
            } else if (shellCmd.startsWith('cat ')) {
              const filePath = rawShellCmd.slice(4).trim();
              if (data.files[filePath]) {
                const lines = data.files[filePath].split('\n');
                for (const line of lines) {
                  term.addLine(line, 'about-text');
                }
              } else {
                term.addLine(`cat: ${filePath}: No such file or directory`, 'about-text');
              }
            } else if (shellCmd === 'env') {
              // Show CONTAINER_DATA env if available
              for (const [key, val] of Object.entries(data.env)) {
                term.addLine(`${key}=${val}`, 'about-text');
              }
              // Also show container state env vars
              const stateEnv = containers[containerName]?.env || [];
              for (const e of stateEnv) {
                // Don't duplicate if already shown from CONTAINER_DATA
                const key = e.split('=')[0];
                if (!data.env[key]) {
                  term.addLine(e, 'about-text');
                }
              }
              // Standard vars
              term.addLine(`HOSTNAME=${containerName}`, 'about-text');
              term.addLine('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'about-text');
              term.addLine('HOME=/root', 'about-text');
            } else if (shellCmd === 'ps aux') {
              term.addLine('USER       PID  %CPU  %MEM  COMMAND', 'about-text');
              for (const p of data.processes) {
                term.addLine(`${p.user.padEnd(10)} ${String(p.pid).padEnd(5)} ${p.cpu.padEnd(5)} ${p.mem.padEnd(5)} ${p.cmd}`, 'about-text');
              }
            } else if (shellCmd === 'pwd') {
              term.addLine('/', 'about-text');
            } else if (shellCmd === 'whoami') {
              term.addLine('root', 'about-text');
            } else if (shellCmd === 'hostname') {
              term.addLine(containerName, 'about-text');
            } else {
              term.addLine(`bash: ${rawShellCmd}: command not found`, 'about-text');
            }

            // Show next prompt
            showShellPrompt();
          });
        }

        // Remove existing about prompt input if any
        const existingInput = term.linesContainer.querySelector('.about-prompt-line');
        if (existingInput) existingInput.remove();

        showShellPrompt();
      });
    },
  },
  {
    match: cmd => cmd.startsWith('docker run'),
    handler: async (cmd, { term }) => {
      if (cmd.includes('-v /:/mnt') || cmd.includes('rm -rf')) {
        term.addLine('', 'blank');
        term.addLine('Docker escape attack detected!', 'danger-text');
        term.addLine('Mounting host root into a container and deleting it?', 'about-text');
        term.addLine('That\'s a classic container breakout technique.', 'about-text');
        term.addLine('Blocked.', 'about-text');
        term.addLine('', 'blank');
      } else {
        term.addLine('Error: daemon is in read-only mode', 'about-text');
      }
    },
  },
  // ── Docker network inspect ──
  {
    meta: { name: 'docker network inspect <n>', desc: 'Network details (JSON)', category: 'docker' },
    match: cmd => cmd.startsWith('docker network inspect'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      // args: ['network', 'inspect', 'name']
      const name = args[2];
      if (!name) { term.addLine('Error: requires exactly 1 argument', 'about-text'); return; }
      const net = state.sim.docker.networks[name];
      if (!net) { term.addLine(`Error response from daemon: network ${name} not found`, 'about-text'); return; }

      const containers = state.sim.docker.containers;
      const containerEntries = {};
      for (const [cName, info] of Object.entries(net.containers || {})) {
        const c = containers[cName];
        if (c) {
          containerEntries[generateFullId(cName)] = {
            Name: cName,
            EndpointID: generateFullId(cName + '-endpoint').slice(0, 64),
            MacAddress: '02:42:' + info.ip.split('.').slice(1).map(n => parseInt(n).toString(16).padStart(2, '0')).join(':'),
            IPv4Address: info.ip + '/' + (net.subnet ? net.subnet.split('/')[1] : '16'),
            IPv6Address: '',
          };
        }
      }

      const inspect = [{
        Name: name,
        Id: generateFullId(name),
        Created: new Date(Date.now() - 42 * 86400000).toISOString(),
        Scope: 'local',
        Driver: net.driver,
        IPAM: {
          Driver: 'default',
          Config: net.subnet ? [{ Subnet: net.subnet, Gateway: net.gateway }] : [],
        },
        Internal: false,
        Containers: containerEntries,
        Options: {},
      }];

      const json = JSON.stringify(inspect, null, 4);
      for (const line of json.split('\n')) {
        term.addLine(line, 'about-text');
      }
    },
  },
  // ── Docker network create ──
  {
    match: cmd => cmd.startsWith('docker network create'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = args[2];
      if (!name) { term.addLine('Error: requires exactly 1 argument', 'about-text'); return; }
      if (state.sim.docker.networks[name]) {
        term.addLine(`Error response from daemon: network with name ${name} already exists`, 'about-text');
        return;
      }
      // Auto-assign subnet
      const existingSubnets = Object.values(state.sim.docker.networks).map(n => n.subnet).filter(Boolean);
      let octet = 19; // start from 172.19.x.x
      while (existingSubnets.includes(`172.${octet}.0.0/16`)) octet++;

      const id = generateFullId(name);
      state.sim.docker.networks[name] = {
        id: id.slice(0, 12),
        driver: 'bridge',
        subnet: `172.${octet}.0.0/16`,
        gateway: `172.${octet}.0.1`,
        containers: {},
      };
      term.addLine(id.slice(0, 64), 'about-text');
    },
  },
  // ── Docker network rm ──
  {
    match: cmd => cmd.startsWith('docker network rm'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = args[2];
      if (!name) { term.addLine('Error: requires exactly 1 argument', 'about-text'); return; }
      const net = state.sim.docker.networks[name];
      if (!net) { term.addLine(`Error response from daemon: network ${name} not found`, 'about-text'); return; }
      if (name === 'bridge' || name === 'host') {
        term.addLine(`Error response from daemon: ${name} is a pre-defined network and cannot be removed`, 'about-text');
        return;
      }
      if (Object.keys(net.containers || {}).length > 0) {
        term.addLine(`Error response from daemon: network ${name} has active endpoints`, 'about-text');
        return;
      }
      delete state.sim.docker.networks[name];
      term.addLine(name, 'about-text');
    },
  },
  {
    match: 'docker network ls',
    handler: async (cmd, { term, state }) => {
      term.addLine('NETWORK ID     NAME              DRIVER    SCOPE', 'about-text');
      for (const [name, net] of Object.entries(state.sim.docker.networks)) {
        term.addLine(`${net.id.slice(0,12).padEnd(14)} ${name.padEnd(17)} ${net.driver.padEnd(9)} local`, 'about-text');
      }
    },
  },
  {
    match: 'docker volume ls',
    handler: async (cmd, { term, state }) => {
      term.addLine('DRIVER    VOLUME NAME', 'about-text');
      for (const name of Object.keys(state.sim.docker.volumes)) {
        term.addLine(`local     ${name}`, 'about-text');
      }
    },
  },
  {
    meta: { name: 'docker ps', desc: 'List containers (stateful)', category: 'docker' },
    match: cmd => cmd === 'docker ps' || cmd === 'docker ps -a',
    handler: async (cmd, { term, state }) => {
      const containers = state.sim.docker.containers;
      const showAll = cmd.includes('-a');

      function generateId(name) {
        let h = 0;
        for (const ch of name) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
        const hex = Math.abs(h).toString(16);
        return (hex + hex + hex).slice(0, 12);
      }

      function formatPorts(c) {
        if (!c.ports || Object.keys(c.ports).length === 0) return '';
        return Object.entries(c.ports).map(([containerPort, binding]) => {
          return `${binding.HostIp}:${binding.HostPort}->${containerPort}`;
        }).join(', ');
      }

      function formatCmd(c) {
        if (!c.cmd || c.cmd.length === 0) return '"/bin/sh"';
        const joined = c.cmd.join(' ');
        if (joined.length > 20) return `"${joined.slice(0, 20)}\u2026"`;
        return `"${joined}"`;
      }

      term.addLine('', 'blank');
      term.addLine(
        'CONTAINER ID   IMAGE                    COMMAND                  CREATED        STATUS                  PORTS                    NAMES',
        'about-text'
      );
      for (const [name, c] of Object.entries(containers)) {
        if (!showAll && c.status !== 'running') continue;
        const id = generateId(name);
        const command = formatCmd(c);
        const ports = formatPorts(c);
        // Use formatElapsed-style for CREATED column
        const createdTs = c.startedAt || (Date.now() - 2 * 86400000);
        const seconds = Math.floor((Date.now() - createdTs) / 1000);
        let createdStr;
        if (seconds < 60) createdStr = 'Less than a second ago';
        else {
          const minutes = Math.floor(seconds / 60);
          if (minutes < 60) createdStr = minutes === 1 ? 'About a minute ago' : `${minutes} minutes ago`;
          else {
            const hours = Math.floor(minutes / 60);
            if (hours < 24) createdStr = hours === 1 ? 'About an hour ago' : `${hours} hours ago`;
            else {
              const days = Math.floor(hours / 24);
              createdStr = days === 1 ? 'About a day ago' : `${days} days ago`;
            }
          }
        }
        const status = formatDockerStatus(c);
        const line = `${id}   ${c.image.padEnd(24)} ${command.padEnd(24)} ${createdStr.padEnd(14)} ${status.padEnd(23)} ${(ports || '').padEnd(24)} ${name}`;
        term.addLine(line, 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // npm cache clean
  {
    match: cmd => cmd.includes('npm cache'),
    handler: async (cmd, { term }) => {
      term.addLine('Cache cleared. 847MB freed.', 'about-text');
      term.addLine('npm will re-download everything next install.', 'about-text');
    },
  },

  // docker system prune
  {
    match: cmd => cmd.includes('docker system prune') || cmd.includes('docker prune'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('WARNING: This will remove:', 'about-access-warn');
      term.addLine('  - all stopped containers', 'about-text');
      term.addLine('  - all networks not used by at least one container', 'about-text');
      term.addLine('  - all dangling images', 'about-text');
      term.addLine('  - all build cache', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Total reclaimed space: 4.2GB', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // nginx -t
  {
    match: cmd => cmd === 'nginx -t' || cmd === 'apachectl configtest',
    handler: async (cmd, { term }) => {
      term.addLine(`${cmd.split(' ')[0]}: the configuration file syntax is ok`, 'about-text');
      term.addLine(`${cmd.split(' ')[0]}: configuration file test is successful`, 'about-text');
    },
  },
];
