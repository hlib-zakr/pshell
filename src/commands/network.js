import { parseCommand } from './parse.js';

export const networkCommands = [

  // ══════════════════════════════════════
  // NETWORK
  // ══════════════════════════════════════

  {
    meta: { name: 'ping <host>', desc: 'Ping a server', category: 'network' },
    match: cmd => cmd === 'ping pshell.internal' || cmd.startsWith('ping '),
    handler: async (cmd, { term, sleep, state }) => {
      const { args } = parseCommand(cmd);
      const host = args[0] || 'pshell.internal';
      const containers = state.sim.docker.containers;
      let ip = '10.0.42.1';
      if (containers[host]) {
        ip = containers[host].ip || '10.0.42.1';
      }
      term.addLine('', 'blank');
      await term.typeLine(`PING ${host} (${ip}) 56(84) bytes of data.`, 'about-text', 8);
      const times = [];
      for (let i = 1; i <= 4; i++) {
        const ms = (Math.random() * 30 + 5).toFixed(1);
        times.push(parseFloat(ms));
        term.addLine(`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=${ms} ms`, 'about-text');
        await sleep(300);
      }
      const minT = Math.min(...times).toFixed(3);
      const maxT = Math.max(...times).toFixed(3);
      const avgT = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(3);
      const mdev = (Math.sqrt(times.reduce((s, t) => s + (t - avgT) ** 2, 0) / times.length)).toFixed(3);
      const totalTime = Math.floor(300 * 3 + Math.random() * 20);
      term.addLine('', 'blank');
      term.addLine(`--- ${host} ping statistics ---`, 'about-text');
      term.addLine(`4 packets transmitted, 4 received, 0% packet loss, time ${totalTime}ms`, 'about-text');
      term.addLine(`rtt min/avg/max/mdev = ${minT}/${avgT}/${maxT}/${mdev} ms`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'curl <url>', desc: 'HTTP request', category: 'network' },
    match: cmd => cmd === 'curl pshell.internal' || cmd.startsWith('curl '),
    handler: async (cmd, { term, sleep, state, rawCmd }) => {
      const parsed = parseCommand(cmd);
      const showHeaders = parsed.flags.i || parsed.flags.v || parsed.flags.include;

      // Check if target is a container name (Docker DNS)
      const urlMatch = (rawCmd || cmd).match(/curl\s+(?:-[siIvk]+\s+)*(?:https?:\/\/)?(\S+)/);
      const target = urlMatch ? urlMatch[1] : '';
      const [targetHost, targetPort] = target.split(':');

      const containers = state.sim.docker.containers;

      // Helper: respond with container-specific output
      function respondForContainer(cName, requestedPort) {
        const c = containers[cName];
        if (!c || c.status !== 'running') {
          term.addLine(`curl: (7) Failed to connect to ${targetHost} port ${requestedPort || 80}: Connection refused`, 'about-text');
          return true;
        }
        const publishedPorts = Object.keys(c.ports || {}).map(p => p.split('/')[0]);
        if (requestedPort && !publishedPorts.includes(requestedPort)) {
          term.addLine(`curl: (7) Failed to connect to ${targetHost} port ${requestedPort}: Connection refused`, 'about-text');
          return true;
        }
        // Derive response from container image type
        const image = (c.image || '').split(':')[0].toLowerCase();
        let response;
        let cssClass = 'about-text';
        if (image.includes('nginx') || image.includes('httpd') || image.includes('apache')) {
          response = `<html><body><h1>Welcome to ${image}!</h1></body></html>`;
        } else if (image.includes('postgres') || image.includes('mysql') || image.includes('mariadb')) {
          response = 'curl: (56) Recv failure: Connection reset by peer';
          cssClass = 'danger-text';
        } else if (image.includes('redis') || image.includes('memcached')) {
          response = '-ERR wrong number of arguments for \'get\' command';
        } else {
          // Node, Python, Go, or any other service — return JSON
          response = `{"status":"ok","service":"${cName}","version":"${c.image.split(':')[1] || 'latest'}"}`;
        }
        term.addLine(response, cssClass);
        return true;
      }

      // 1. Direct container name
      if (containers[targetHost]) {
        respondForContainer(targetHost, targetPort);
        return;
      }

      // 2. localhost/127.0.0.1/0.0.0.0 port mapping
      if ((targetHost === 'localhost' || targetHost === '127.0.0.1' || targetHost === '0.0.0.0') && targetPort) {
        for (const [cName, c] of Object.entries(containers)) {
          for (const [cp, binding] of Object.entries(c.ports || {})) {
            if (binding.HostPort === targetPort) {
              respondForContainer(cName, cp.split('/')[0]);
              return;
            }
          }
        }
        term.addLine(`curl: (7) Failed to connect to ${targetHost} port ${targetPort}: Connection refused`, 'about-text');
        return;
      }

      // 3. Container IP
      for (const [cName, c] of Object.entries(containers)) {
        if (c.ip === targetHost) {
          respondForContainer(cName, targetPort);
          return;
        }
      }

      term.addLine('', 'blank');
      if (showHeaders) {
        term.addLine('HTTP/1.1 200 OK', 'about-text');
        term.addLine('Content-Type: text/html; charset=UTF-8', 'about-text');
        term.addLine('Content-Length: 247', 'about-text');
        term.addLine('Connection: keep-alive', 'about-text');
        term.addLine('X-Powered-By: Claude + Tears', 'about-text');
        term.addLine('X-Vibe: immaculate', 'about-text');
        term.addLine('', 'blank');
      }
      await sleep(150);
      term.addLine('<html><body>', 'about-text');
      term.addLine('  <h1>PShell</h1>', 'about-text');
      term.addLine('  <p>A terminal reaction game</p>', 'about-text');
      term.addLine('  <p>by Hlib Zakrevskyi</p>', 'about-text');
      term.addLine('  <a href="https://github.com/hlib-zakr/pshell">', 'about-text');
      term.addLine('    github.com/hlib-zakr/pshell</a>', 'about-text');
      term.addLine('</body></html>', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'nmap [host]', desc: 'Port scan', category: 'network' },
    match: cmd => cmd === 'nmap' || cmd.startsWith('nmap '),
    handler: async (cmd, { term, state, sleep }) => {
      const containers = state.sim.docker.containers;
      term.addLine('', 'blank');
      await term.typeLine('Starting Nmap 7.94 ( https://nmap.org )', 'about-access', 8);
      await sleep(200);
      term.addLine(`Nmap scan report for pshell.internal (10.0.42.1)`, 'about-text');
      term.addLine('Host is up (0.00042s latency).', 'about-text');
      term.addLine('', 'blank');
      term.addLine('PORT      STATE  SERVICE', 'about-text');

      // Always show SSH (host service, not a container)
      term.addLine('22/tcp    open   ssh', 'about-text');

      // Show ports from running containers
      const shown = new Set(['22']);
      for (const [name, c] of Object.entries(containers)) {
        if (c.status !== 'running') continue;
        for (const [containerPort, binding] of Object.entries(c.ports || {})) {
          const port = containerPort.split('/')[0];
          if (shown.has(port)) continue;
          shown.add(port);
          // Derive service name from container/port
          const serviceNames = { '80': 'http', '443': 'https', '3000': 'http-alt', '3001': 'http-alt', '5432': 'postgresql', '6379': 'redis', '8080': 'http-proxy' };
          const svc = serviceNames[port] || name;
          term.addLine(`${(port + '/tcp').padEnd(10)}open   ${svc}`, 'about-text');
        }
      }

      term.addLine('', 'blank');
      term.addLine(`Nmap done: 1 IP address (1 host up) scanned in 0.42 seconds`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'traceroute <host>', desc: 'Trace network path', category: 'network' },
    match: cmd => cmd === 'traceroute pshell.internal' || cmd.startsWith('traceroute '),
    handler: async (cmd, { term, sleep, state }) => {
      const { args } = parseCommand(cmd);
      const host = args[0] || 'pshell.internal';
      const containers = state.sim.docker.containers;
      let finalIp = '10.0.42.1';
      if (containers[host]) {
        finalIp = containers[host].ip || '10.0.42.1';
      }
      term.addLine('', 'blank');
      term.addLine(`traceroute to ${host} (${finalIp}), 30 hops max, 60 byte packets`, 'about-text');
      const hops = [
        { n: 1, name: 'router.local', ip: '192.168.1.1', base: 1.2 },
        { n: 2, name: 'isp-gateway.net', ip: '203.0.113.1', base: 12.4 },
        { n: 3, name: null },
        { n: 4, name: 'backbone-us-east.net', ip: '198.51.100.14', base: 34.1 },
        { n: 5, name: 'cdn-edge-42.cloudflare.com', ip: '104.16.132.229', base: 18.7 },
        { n: 6, name: null, label: '(classified)' },
        { n: 7, name: host, ip: finalIp, base: 42.0 },
      ];
      for (const hop of hops) {
        if (!hop.name) {
          const label = hop.label ? `  * * * ${hop.label}` : '  * * *';
          term.addLine(`${String(hop.n).padStart(2)}${label}`, 'about-text');
        } else {
          const t1 = (hop.base + Math.random() * 2).toFixed(3);
          const t2 = (hop.base + Math.random() * 2).toFixed(3);
          const t3 = (hop.base + Math.random() * 2).toFixed(3);
          term.addLine(`${String(hop.n).padStart(2)}  ${hop.name} (${hop.ip})  ${t1} ms  ${t2} ms  ${t3} ms`, 'about-text');
        }
        await sleep(150);
      }
      term.addLine('', 'blank');
    },
  },

  // ssh 31337 (hidden service, MUST be before generic ssh)
  {
    match: cmd => cmd === 'ssh 31337' || cmd === 'connect 31337' || cmd === 'nc localhost 31337',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Connecting to port 31337...', 'about-access', 12);
      await sleep(400);
      await term.typeLine('WARNING: Unknown service detected.', 'about-access-warn', 10);
      await sleep(300);
      term.addLine('', 'blank');
      await term.typeLine('> WELCOME TO THE UNDERGROUND', 'about-granted', 20);
      await sleep(200);
      term.addLine('', 'blank');
      const messages = [
        'You found the hidden port.',
        'Not many make it this far.',
        'The truth is: there is no dangerous command.',
        'Only dangerous engineers who don\'t read.',
        '',
        'Here\'s a reward for your curiosity:',
        '',
        '  Achievement Unlocked: PORT SCANNER',
        '  "Found the hidden service on 31337"',
        '',
        'Now go break some more prod.',
      ];
      for (const msg of messages) {
        if (msg === '') { term.addLine('', 'blank'); continue; }
        if (msg.includes('Achievement')) {
          term.addLine(msg, 'about-granted');
        } else {
          await term.typeLine(msg, 'about-text', 10);
        }
        await sleep(80);
      }
      term.addLine('', 'blank');
      await term.typeLine('Connection closed by remote host.', 'about-access', 10);
      if (window._unlockAchievement) window._unlockAchievement('port_scanner');
      term.addLine('', 'blank');
    },
  },

  // Generic ssh
  {
    meta: { name: 'ssh <host>', desc: 'SSH connection', category: 'network' },
    match: cmd => cmd.startsWith('ssh '),
    handler: async (cmd, { term, sleep }) => {
      const { args } = parseCommand(cmd);
      const host = args[0] || '';
      term.addLine('', 'blank');
      await term.typeLine(`Connecting to ${host}...`, 'about-access', 10);
      await sleep(400);
      if (host.includes('prod')) {
        term.addLine('Connection refused. Prod doesn\'t want you.', 'about-text');
      } else if (host.includes('evil') || host.includes('hack')) {
        term.addLine('Nice try. Blocked by firewall rule #42.', 'danger-text');
      } else {
        term.addLine(`ssh: connect to host ${host} port 22: Connection timed out`, 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // ── More network commands ──
  {
    meta: { name: 'ifconfig', desc: 'Network interfaces', category: 'network' },
    match: cmd => cmd === 'ifconfig',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'about-text');
      term.addLine('        inet 10.0.42.1  netmask 255.255.255.0  broadcast 10.0.42.255', 'about-text');
      term.addLine('        inet6 fe80::1  prefixlen 64  scopeid 0x20<link>', 'about-text');
      term.addLine('        ether 00:1a:2b:3c:4d:5e  txqueuelen 1000  (Ethernet)', 'about-text');
      term.addLine('        RX packets 847293  bytes 1337420069 (1.2 GiB)', 'about-text');
      term.addLine('        TX packets 420420  bytes 847293102 (808.0 MiB)', 'about-text');
      term.addLine('', 'blank');
      term.addLine('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536', 'about-text');
      term.addLine('        inet 127.0.0.1  netmask 255.0.0.0', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'ip addr', desc: 'Show IP addresses', category: 'network' },
    match: cmd => cmd === 'ip addr' || cmd === 'ip a',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000', 'about-text');
      term.addLine('    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00', 'about-text');
      term.addLine('    inet 127.0.0.1/8 scope host lo', 'about-text');
      term.addLine('       valid_lft forever preferred_lft forever', 'about-text');
      term.addLine('    inet6 ::1/128 scope host', 'about-text');
      term.addLine('       valid_lft forever preferred_lft forever', 'about-text');
      term.addLine('2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000', 'about-text');
      term.addLine('    link/ether 00:1a:2b:3c:4d:5e brd ff:ff:ff:ff:ff:ff', 'about-text');
      term.addLine('    inet 10.0.42.1/24 brd 10.0.42.255 scope global eth0', 'about-text');
      term.addLine('       valid_lft forever preferred_lft forever', 'about-text');
      term.addLine('    inet6 fe80::1/64 scope link', 'about-text');
      term.addLine('       valid_lft forever preferred_lft forever', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'netstat', desc: 'Listening ports', category: 'network' },
    match: cmd => cmd === 'netstat' || cmd.startsWith('netstat '),
    handler: async (cmd, { term, state }) => {
      const containers = state.sim.docker.containers;
      const processes = state.sim.processes;

      term.addLine('', 'blank');
      term.addLine('Active Internet connections (only servers)', 'about-text');
      term.addLine('Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name', 'about-text');

      // SSH (host service)
      if (!processes.killedPids.has(42)) {
        term.addLine('tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      42/sshd', 'about-text');
      }

      // Container ports
      for (const [name, c] of Object.entries(containers)) {
        if (c.status !== 'running') continue;
        for (const [containerPort, binding] of Object.entries(c.ports || {})) {
          const port = containerPort.split('/')[0];
          const pid = c.pid || 0;
          // Find process name from process list
          const proc = processes.list.find(p => p.linkedContainer === name && !processes.killedPids.has(p.pid));
          const progName = proc ? proc.command.split(/\s+/)[0].split('/').pop() : name;
          term.addLine(`tcp        0      0 ${binding.HostIp}:${port.padEnd(15)} 0.0.0.0:*               LISTEN      ${pid}/${progName}`, 'about-text');
        }
      }
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'ss', desc: 'Socket statistics', category: 'network' },
    match: cmd => cmd === 'ss' || cmd.startsWith('ss '),
    handler: async (cmd, { term, state }) => {
      const containers = state.sim.docker.containers;
      const processes = state.sim.processes;

      term.addLine('', 'blank');
      term.addLine('State    Recv-Q   Send-Q     Local Address:Port     Peer Address:Port  Process', 'about-text');

      // SSH
      if (!processes.killedPids.has(42)) {
        term.addLine('LISTEN   0        128              0.0.0.0:22           0.0.0.0:*      users:(("sshd",pid=42,fd=3))', 'about-text');
      }

      // Container ports
      for (const [name, c] of Object.entries(containers)) {
        if (c.status !== 'running') continue;
        for (const [containerPort, binding] of Object.entries(c.ports || {})) {
          const port = containerPort.split('/')[0];
          const pid = c.pid || 0;
          const proc = processes.list.find(p => p.linkedContainer === name && !processes.killedPids.has(p.pid));
          const progName = proc ? proc.command.split(/\s+/)[0].split('/').pop() : name;
          term.addLine(`LISTEN   0        128              ${binding.HostIp}:${port.padEnd(5)}        0.0.0.0:*      users:(("${progName}",pid=${pid},fd=3))`, 'about-text');
        }
      }
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'dig <host>', desc: 'DNS lookup', category: 'network' },
    match: cmd => cmd === 'dig' || cmd.startsWith('dig '),
    handler: async (cmd, { term, state }) => {
      const { args } = parseCommand(cmd);
      const host = args[0] || 'pshell.dev';
      const containers = state.sim.docker.containers;
      let resolvedIp = '10.0.42.1';
      if (containers[host]) resolvedIp = containers[host].ip || '10.0.42.1';
      const queryTime = Math.floor(Math.random() * 30 + 5);
      const now = new Date();
      const whenStr = now.toUTCString();
      term.addLine('', 'blank');
      term.addLine(`; <<>> DiG 9.18.1-1-Debian <<>> ${host}`, 'about-text');
      term.addLine(';; global options: +cmd', 'about-text');
      term.addLine(';; Got answer:', 'about-text');
      term.addLine(';; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: ' + Math.floor(Math.random() * 65535), 'about-text');
      term.addLine(';; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1', 'about-text');
      term.addLine('', 'blank');
      term.addLine(';; OPT PSEUDOSECTION:', 'about-text');
      term.addLine('; EDNS: version: 0, flags:; udp: 512', 'about-text');
      term.addLine(';; QUESTION SECTION:', 'about-text');
      term.addLine(`;${host}.                    IN      A`, 'about-text');
      term.addLine('', 'blank');
      term.addLine(';; ANSWER SECTION:', 'about-text');
      term.addLine(`${host}.            300     IN      A       ${resolvedIp}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine(`;; Query time: ${queryTime} msec`, 'about-text');
      term.addLine(`;; SERVER: ${resolvedIp}#53(${resolvedIp}) (UDP)`, 'about-text');
      term.addLine(`;; WHEN: ${whenStr}`, 'about-text');
      term.addLine(';; MSG SIZE  rcvd: 58', 'about-text');
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'nslookup <host>', desc: 'DNS query', category: 'network' },
    match: cmd => cmd === 'nslookup' || cmd.startsWith('nslookup '),
    handler: async (cmd, { term, state }) => {
      const { args } = parseCommand(cmd);
      const host = args[0] || 'pshell.dev';
      const containers = state.sim.docker.containers;
      let resolvedIp = '10.0.42.1';
      if (containers[host]) resolvedIp = containers[host].ip || '10.0.42.1';
      term.addLine('Server:    10.0.42.1', 'about-text');
      term.addLine('Address:   10.0.42.1#53', 'about-text');
      term.addLine('', 'blank');
      term.addLine(`Name:      ${host}`, 'about-text');
      term.addLine(`Address:   ${resolvedIp}`, 'about-text');
    },
  },

  // ── wget ──
  {
    meta: { name: 'wget <url>', desc: 'Download file', category: 'network' },
    match: cmd => cmd.startsWith('wget '),
    handler: async (cmd, { term, sleep }) => {
      const { args } = parseCommand(cmd);
      const url = args[0] || '';
      // Extract hostname from URL for display
      let hostname = url;
      try { hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname; } catch {}
      const filename = 'index.html';
      const fileSize = Math.floor(Math.random() * 50000 + 10000);
      const fileSizeK = (fileSize / 1024).toFixed(0);
      const speed = Math.floor(Math.random() * 500 + 200);
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      term.addLine('', 'blank');
      if (url.includes('evil') || url.includes('malware') || url.includes('payload')) {
        term.addLine(`--${timestamp}--  ${url}`, 'about-text');
        term.addLine('BLOCKED by security policy.', 'danger-text');
        term.addLine('This is exactly the kind of thing the game', 'about-text');
        term.addLine('is training you to catch. Good instincts.', 'about-text');
      } else {
        term.addLine(`--${timestamp}--  ${url.startsWith('http') ? url : 'https://' + url}`, 'about-text');
        term.addLine(`Resolving ${hostname}... 93.184.216.34`, 'about-text');
        await sleep(100);
        term.addLine(`Connecting to ${hostname}|93.184.216.34|:443... connected.`, 'about-text');
        await sleep(100);
        term.addLine('HTTP request sent, awaiting response... 200 OK', 'about-text');
        term.addLine(`Length: ${fileSize} (${fileSizeK}K) [text/html]`, 'about-text');
        term.addLine(`Saving to: '${filename}'`, 'about-text');
        term.addLine('', 'blank');
        await sleep(150);
        term.addLine(`${filename}          100%[===================>]  ${fileSizeK}.00K  --.-KB/s    in 0.1s`, 'about-text');
        term.addLine('', 'blank');
        term.addLine(`${timestamp} (${speed} KB/s) - '${filename}' saved [${fileSize}/${fileSize}]`, 'about-text');
        term.addLine('(read-only fs — file discarded)', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  // ══════════════════════════════════════
  // IPTABLES
  // ══════════════════════════════════════

  {
    meta: { name: 'iptables -L', desc: 'View firewall rules', category: 'network' },
    match: cmd => cmd === 'iptables -l' || cmd === 'iptables -l -n' || cmd === 'iptables -ln' || cmd === 'iptables --list',
    handler: async (cmd, { term, state }) => {
      const containers = state.sim.docker.containers;
      term.addLine('Chain INPUT (policy ACCEPT)', 'about-text');
      term.addLine('target     prot opt source               destination', 'about-text');
      term.addLine('ACCEPT     all  --  0.0.0.0/0            0.0.0.0/0            state RELATED,ESTABLISHED', 'about-text');
      // SSH always open
      term.addLine('ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:22', 'about-text');
      // Container ports
      const shownPorts = new Set(['22']);
      for (const [name, c] of Object.entries(containers)) {
        if (c.status !== 'running') continue;
        for (const [cp] of Object.entries(c.ports || {})) {
          const port = cp.split('/')[0];
          if (shownPorts.has(port)) continue;
          shownPorts.add(port);
          term.addLine(`ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:${port}`, 'about-text');
        }
      }
      term.addLine('DROP       all  --  10.0.0.0/8           0.0.0.0/0            /* suspicious subnet */', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Chain FORWARD (policy DROP)', 'about-text');
      term.addLine('target     prot opt source               destination', 'about-text');
      term.addLine('ACCEPT     all  --  0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED', 'about-text');
      const pshellNet = state.sim.docker.networks['pshell-network'];
      const subnet = pshellNet ? pshellNet.subnet : '172.18.0.0/16';
      term.addLine(`ACCEPT     all  --  ${subnet.split('/')[0].replace(/\.\d+$/, '.0')}/${subnet.split('/')[1]}        0.0.0.0/0            /* docker bridge */`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('Chain OUTPUT (policy ACCEPT)', 'about-text');
      term.addLine('target     prot opt source               destination', 'about-text');
    },
  },

  {
    match: cmd => cmd === 'iptables -f' || cmd === 'iptables --flush' || (cmd.startsWith('iptables') && cmd.includes('-F')),
    handler: async (cmd, { term }) => {
      term.addLine('iptables: Flushing all firewall rules would expose every port.', 'danger-text');
      term.addLine('SSH, databases, internal APIs — all publicly accessible.', 'about-text');
      term.addLine('Blocked.', 'about-text');
    },
  },

  {
    match: cmd => cmd.startsWith('iptables'),
    handler: async (cmd, { term }) => {
      term.addLine('iptables: permission denied (read-only mode)', 'about-text');
      term.addLine('Try: iptables -L to view current rules', 'about-access');
    },
  },

  // ══════════════════════════════════════
  // AWS CLI
  // ══════════════════════════════════════

  {
    match: cmd => cmd.startsWith('aws s3 rb') || cmd.startsWith('aws s3 rm'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Deleting S3 buckets/objects in production?', 'danger-text');
      term.addLine('User uploads, backups, static assets — gone forever.', 'about-text');
      term.addLine('S3 deletion is irreversible. No recycle bin.', 'about-text');
      term.addLine('Blocked.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd.startsWith('aws ec2 terminate'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Terminating EC2 instances kills them permanently.', 'danger-text');
      term.addLine('Unlike "stop", terminated instances can\'t be restarted.', 'about-text');
      term.addLine('Their EBS volumes? Deleted by default.', 'about-text');
      term.addLine('Blocked.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd.startsWith('aws iam'),
    handler: async (cmd, { term }) => {
      if (cmd.includes('delete') || cmd.includes('remove')) {
        term.addLine('Modifying IAM in production is how breaches happen.', 'danger-text');
        term.addLine('Blocked.', 'about-text');
      } else {
        term.addLine('{', 'about-text');
        term.addLine('    "Users": [', 'about-text');
        term.addLine('        {', 'about-text');
        term.addLine('            "UserName": "classified",', 'about-text');
        term.addLine('            "UserId": "AIDA42069PSHELL1337",', 'about-text');
        term.addLine('            "Arn": "arn:aws:iam::123456789:user/classified",', 'about-text');
        term.addLine('            "CreateDate": "2026-01-15T08:00:00+00:00"', 'about-text');
        term.addLine('        }', 'about-text');
        term.addLine('    ]', 'about-text');
        term.addLine('}', 'about-text');
      }
    },
  },

  {
    match: cmd => cmd.startsWith('aws'),
    handler: async (cmd, { term }) => {
      term.addLine('aws: read-only mode. Try: aws iam list-users', 'about-text');
    },
  },

  // ══════════════════════════════════════
  // TERRAFORM
  // ══════════════════════════════════════

  {
    match: cmd => cmd.startsWith('terraform destroy'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('terraform destroy tears down ALL infrastructure.', 'danger-text');
      term.addLine('VPCs, subnets, load balancers, databases, DNS — everything.', 'about-text');
      term.addLine('There is no "undo". You rebuild from scratch.', 'about-text');
      term.addLine('Blocked.', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd.startsWith('terraform'),
    handler: async (cmd, { term, state }) => {
      if (cmd.includes('plan')) {
        term.addLine('No changes. Your infrastructure matches the configuration.', 'about-text');
      } else if (cmd.includes('state list')) {
        for (const name of Object.keys(state.sim.docker.containers)) {
          const type = name.includes('postgres') ? 'aws_db_instance' : name.includes('redis') ? 'aws_elasticache_cluster' : 'aws_instance';
          term.addLine(`${type}.${name.replace(/-/g, '_')}`, 'about-text');
        }
        // Always show load balancer and S3
        term.addLine('aws_lb.main', 'about-text');
        term.addLine('aws_s3_bucket.uploads', 'about-text');
      } else if (cmd.includes('version')) {
        term.addLine('Terraform v1.7.0', 'about-text');
      } else {
        term.addLine('Usage: terraform [plan|apply|destroy|state|version]', 'about-text');
      }
    },
  },

];
