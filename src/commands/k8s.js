import { parseCommand } from './parse.js';

function formatAge(createdAt) {
  if (!createdAt) return '<unknown>';
  const seconds = Math.floor((Date.now() - createdAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const k8sCommands = [

  // ══════════════════════════════════════
  // Kubernetes
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'kubectl' || cmd === 'kubectl --help',
    handler: async (cmd, { term }) => {
      term.addLine('kubectl controls the Kubernetes cluster manager.', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Commands: get, describe, logs, delete, apply,', 'about-text');
      term.addLine('exec, port-forward, top, scale', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'kubectl get pods', desc: 'List pods (stateful)', category: 'k8s' },
    match: cmd => cmd === 'kubectl get pods' || cmd === 'kubectl get pods -n production',
    handler: async (cmd, { term, state }) => {
      const k8s = state.sim.k8s;
      term.addLine('NAME                          READY   STATUS    RESTARTS   AGE', 'about-text');
      for (const pod of k8s.pods) {
        if (k8s.deletedPods.has(pod.name)) continue;
        const age = pod.name.includes('31337') ? '???' : formatAge(pod.createdAt);
        const style = pod.name.includes('31337') ? 'about-access-warn' : 'about-text';
        term.addLine(`${pod.name.padEnd(30)}${pod.ready.padEnd(8)}${pod.status.padEnd(10)}${String(pod.restarts).padEnd(11)}${age}`, style);
      }
      if (k8s.pods.every(p => k8s.deletedPods.has(p.name))) {
        term.addLine('No resources found in production namespace.', 'about-text');
      }
    },
  },
  {
    meta: { name: 'kubectl delete <resource>', desc: 'Delete resources (stateful)', category: 'k8s' },
    match: cmd => cmd.startsWith('kubectl delete'),
    handler: async (cmd, { term, state }) => {
      const k8s = state.sim.k8s;
      if (cmd.includes('namespace production') || cmd.includes('ns production')) {
        term.addLine('kubectl: Deleting the ENTIRE production namespace?', 'danger-text');
        term.addLine('Every pod, service, deployment, secret — gone.', 'about-text');
        term.addLine('This is the Kubernetes equivalent of rm -rf /', 'about-text');
        // Actually delete all pods
        for (const pod of k8s.pods) k8s.deletedPods.add(pod.name);
      } else if (cmd.includes('pods --all')) {
        term.addLine('kubectl: Killing every pod in production.', 'danger-text');
        term.addLine('All services go down simultaneously.', 'about-text');
        for (const pod of k8s.pods) k8s.deletedPods.add(pod.name);
      } else if (cmd.includes('pod ') || cmd.includes('pods ')) {
        // Delete specific pod
        const podName = cmd.split(/\s+/).pop();
        const pod = k8s.pods.find(p => p.name.startsWith(podName));
        if (pod && !k8s.deletedPods.has(pod.name)) {
          k8s.deletedPods.add(pod.name);
          term.addLine(`pod "${pod.name}" deleted`, 'about-text');
        } else {
          term.addLine(`Error from server (NotFound): pods "${podName}" not found`, 'about-text');
        }
      } else {
        term.addLine('Error from server (Forbidden): pods is forbidden: User "system:serviceaccount" cannot delete resource "pods" in API group "" in the namespace "production"', 'about-text');
      }
    },
  },
  {
    match: cmd => cmd.startsWith('kubectl get') && !cmd.includes('pods'),
    handler: async (cmd, { term, state }) => {
      const resource = cmd.split(/\s+/)[2] || 'all';
      if (resource === 'nodes') {
        const nodes = state.sim.k8s.nodes;
        term.addLine('NAME         STATUS   ROLES           AGE   VERSION', 'about-text');
        for (const n of nodes) {
          const age = formatAge(n.createdAt);
          term.addLine(`${n.name.padEnd(13)}${n.status.padEnd(9)}${n.roles.padEnd(16)}${age.padEnd(6)}${n.version}`, 'about-text');
        }
      } else if (resource === 'svc' || resource === 'services') {
        const services = state.sim.k8s.services;
        term.addLine('NAME          TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE', 'about-text');
        for (const s of services) {
          const age = formatAge(s.createdAt);
          term.addLine(`${s.name.padEnd(14)}${s.type.padEnd(15)}${s.clusterIP.padEnd(16)}${s.externalIP.padEnd(14)}${s.ports.padEnd(17)}${age}`, 'about-text');
        }
      } else if (resource === 'deployments' || resource === 'deploy') {
        const deployments = state.sim.k8s.deployments;
        const k8s = state.sim.k8s;
        term.addLine('NAME         READY   UP-TO-DATE   AVAILABLE   AGE', 'about-text');
        for (const d of deployments) {
          const totalPods = k8s.pods.filter(p => p.name.startsWith(d.podPrefix)).length;
          const activePods = k8s.pods.filter(p => p.name.startsWith(d.podPrefix) && !k8s.deletedPods.has(p.name)).length;
          const age = formatAge(d.createdAt);
          term.addLine(`${d.name.padEnd(13)}${(activePods + '/' + totalPods).padEnd(8)}${String(totalPods).padEnd(13)}${String(activePods).padEnd(12)}${age}`, 'about-text');
        }
      } else {
        term.addLine('No resources found in production namespace.', 'about-text');
      }
    },
  },

  // ── Helm ──
  {
    meta: { name: 'helm list', desc: 'Helm releases (stateful)', category: 'k8s' },
    match: cmd => cmd === 'helm list' || cmd === 'helm list -n production',
    handler: async (cmd, { term, state }) => {
      const releases = state.sim.k8s.helmReleases;
      term.addLine('NAME          NAMESPACE    REVISION  UPDATED                              STATUS    CHART                      APP VERSION', 'about-text');
      for (const r of releases) {
        const updated = r.updated || new Date().toISOString().replace('T', ' ').replace('Z', '000 +0000 UTC');
        const appVersion = r.appVersion || r.chart?.split('-').pop() || '0.0.0';
        term.addLine(`${r.name.padEnd(14)}${r.namespace.padEnd(13)}${String(r.revision).padEnd(10)}${updated.padEnd(37)}${r.status.padEnd(10)}${r.chart.padEnd(27)}${appVersion}`, 'about-text');
      }
      if (releases.length === 0) term.addLine('No releases found.', 'about-text');
    },
  },
  {
    meta: { name: 'helm install <n> <chart>', desc: 'Install release', category: 'k8s' },
    match: cmd => cmd.startsWith('helm install') || cmd.startsWith('helm upgrade'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = args[1]; // args[0] = 'install'/'upgrade'
      const chart = args[2] || 'unknown-chart';
      if (!name) { term.addLine('Error: release name required', 'about-text'); return; }
      const releases = state.sim.k8s.helmReleases;
      const existing = releases.find(r => r.name === name);
      const now = new Date();
      const deployedTime = now.toString().slice(0, 24) + ' ' + now.getFullYear();
      if (existing) {
        existing.revision++;
        existing.chart = chart;
        existing.updated = now.toISOString().replace('T', ' ').replace('Z', '0 +0000 UTC');
        term.addLine(`NAME: ${name}`, 'about-text');
        term.addLine(`LAST DEPLOYED: ${deployedTime}`, 'about-text');
        term.addLine(`NAMESPACE: ${existing.namespace}`, 'about-text');
        term.addLine(`STATUS: deployed`, 'about-text');
        term.addLine(`REVISION: ${existing.revision}`, 'about-text');
      } else {
        const updated = now.toISOString().replace('T', ' ').replace('Z', '0 +0000 UTC');
        releases.push({ name, namespace: 'production', revision: 1, status: 'deployed', chart, updated, appVersion: '1.0.0' });
        term.addLine(`NAME: ${name}`, 'about-text');
        term.addLine(`LAST DEPLOYED: ${deployedTime}`, 'about-text');
        term.addLine(`NAMESPACE: production`, 'about-text');
        term.addLine(`STATUS: deployed`, 'about-text');
        term.addLine(`REVISION: 1`, 'about-text');
      }
    },
  },
  {
    meta: { name: 'helm uninstall <name>', desc: 'Remove release', category: 'k8s' },
    match: cmd => cmd.startsWith('helm uninstall') || cmd.startsWith('helm delete'),
    handler: async (cmd, { term, state, rawCmd }) => {
      const { args } = parseCommand(rawCmd || cmd);
      const name = args[1];
      if (!name) { term.addLine('Error: release name required', 'about-text'); return; }
      const releases = state.sim.k8s.helmReleases;
      const idx = releases.findIndex(r => r.name === name);
      if (idx === -1) {
        term.addLine(`Error: release "${name}" not found`, 'about-text');
      } else {
        releases.splice(idx, 1);
        term.addLine(`release "${name}" uninstalled`, 'about-text');
      }
    },
  },

];
