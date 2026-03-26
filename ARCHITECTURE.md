# Stop The Code — Architecture & Technical Documentation

> ## CHECKLIST: Adding a new command
> Every new command MUST update ALL of these:
> 1. **Command handler** — add `{meta, match, handler}` to the right module in `src/commands/`
> 2. **Tab completion** — if it uses a function matcher, add to `extras` array in `src/ui/tab-complete.js`
> 3. **Tab completion file args** — if it takes a file argument, add to `FILE_COMMANDS` set in `tab-complete.js`
> 4. **Tab subcommands** — if it has subcommands, add to `SUBCOMMANDS` map in `tab-complete.js`
> 5. **Help page** — add to relevant help topic in `src/commands/help.js` (or rely on `help all` auto-generation via `meta`)
> 6. **Tests** — add test in the appropriate `tests/commands/` file
> 7. **ARCHITECTURE.md** — add to the All Commands section
>
> If you add `meta: { name, desc, category }` to the command, `help all` auto-lists it.
> If you use a string `match`, tab completion auto-derives it. Function matchers need manual `extras` entry.

> **Built in 24 hours.** A browser-based terminal OS with a reaction game, 237+ CLI commands, 8 stateful subsystems, and zero backend cost per user.
>
> **Live:** [pshell.vercel.app](https://pshell.vercel.app) | **By:** [PShell](https://x.com/hlib-zakr)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Command System](#command-system)
- [State Management](#state-management)
- [Cross-System Cascades](#cross-system-cascades)
- [Pipe Support](#pipe-support)
- [Tab Completion](#tab-completion)
- [Game Engine](#game-engine)
- [Window Management](#window-management)
- [Apps](#apps)
- [Security](#security)
- [Testing](#testing)
- [All Commands](#all-commands)
- [Future Vision](#future-vision)

---

## Overview

Stop The Code is two things:

1. **A reaction game** — dangerous bash commands scroll in terminal windows. Press Ctrl+C to stop them before they execute. Miss one and production goes down.

2. **A fully simulated terminal OS** — 237+ commands across 8 interconnected stateful systems. Git, Docker, PostgreSQL, Kubernetes, filesystem, processes, services, and crontab — all stateful, all persistent, all cross-linked.

The terminal is the primary interface. The game is just one command (`play`) running inside it.

### Tech Stack
- **Frontend:** Vanilla JavaScript + Vite (no React/Vue/Angular)
- **Hosting:** Cloudflare Pages (static, free tier)
- **Database:** Cloudflare D1 (SQLite, leaderboard only)
- **State:** localStorage (client-side, zero backend per user)
- **Testing:** Vitest (94 tests, <1s)

### Key Stats
- **15,000+ lines** of source code across 53 files
- **237+ CLI commands** across 16 modules
- **8 stateful subsystems** with cross-system cascades
- **4 mini-games** (snake, 2048, wordle, minesweeper)
- **5 container sub-shells** (docker exec)
- **21 achievements**
- **94 automated tests**
- **0 npm runtime dependencies** (Vite + Vitest are dev only)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Browser (Client)                   │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │  Game    │  │  Terminal │  │    Window Manager    │ │
│  │  Engine  │  │  Manager  │  │  (z-index, drag,    │ │
│  │          │  │           │  │   resize, minimize)  │ │
│  └────┬─────┘  └─────┬─────┘  └─────────────────────┘ │
│       │              │                                 │
│  ┌────▼──────────────▼──────────────────────────────┐ │
│  │              Shell Prompt                         │ │
│  │    (shared input loop, tab completion, pipes)     │ │
│  └────────────────────┬─────────────────────────────┘ │
│                       │                               │
│  ┌────────────────────▼─────────────────────────────┐ │
│  │           Command Registry (index.js)             │ │
│  │  ┌──────┐┌──────┐┌─────┐┌──────┐┌─────┐┌──────┐ │ │
│  │  │git.js││docker││fs.js││sql.js││k8s. ││ ...  │ │ │
│  │  │      ││ .js  ││     ││      ││ js  ││(16)  │ │ │
│  │  └──┬───┘└──┬───┘└──┬──┘└──┬───┘└──┬──┘└──────┘ │ │
│  └─────┼───────┼───────┼─────┼───────┼──────────────┘ │
│        │       │       │     │       │                 │
│  ┌─────▼───────▼───────▼─────▼───────▼──────────────┐ │
│  │              Simulation State                     │ │
│  │  ┌────┐┌──────┐┌───┐┌──┐┌───┐┌────┐┌────┐┌────┐ │ │
│  │  │git ││docker││SQL││fs││k8s││svc ││proc││cron│ │ │
│  │  └────┘└──────┘└───┘└──┘└───┘└────┘└────┘└────┘ │ │
│  │              ↕ stateEvents (cascade)              │ │
│  └──────────────────────┬───────────────────────────┘ │
│                         │                             │
│  ┌──────────────────────▼───────────────────────────┐ │
│  │              localStorage                         │ │
│  │  (sim state + notepad files + settings + achievements) │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│                Cloudflare Pages (Server)              │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Static Files     │  │  /api/leaderboard        │  │
│  │  (HTML/JS/CSS)    │  │  (D1 SQLite + anti-cheat)│  │
│  └──────────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── commands/                 # 16 command modules (237+ handlers)
│   ├── index.js              # Registry + executeCommand + pipe engine
│   ├── parse.js              # Shared argument parser (parseCommand)
│   ├── file-utils.js         # Shared file CRUD (readFile/writeFile/deleteFile)
│   ├── filesystem.js         # FS tree object + resolvePath
│   ├── registry.js           # Command metadata + auto-help generator
│   ├── game.js               # play, tutorial, terminals
│   ├── help.js               # 19 help pages + help all (auto-generated)
│   ├── git.js                # 17 git commands (stateful)
│   ├── docker.js             # 15 docker commands + exec sub-shell (stateful)
│   ├── sql.js                # psql with full SQL engine, mysql, redis, mongo
│   ├── fs.js                 # ls, cd, cat, touch, mkdir, rm, grep, wc, sort, uniq
│   ├── network.js            # ping, curl, nmap, traceroute, ssh, dig, wget
│   ├── k8s.js                # kubectl + helm (stateful)
│   ├── system.js             # systemctl, service, ps, top, env, crontab (stateful)
│   ├── packages.js           # npm, pip, apt, cargo
│   ├── dangerous.js          # rm -rf, sudo, kill, chmod, all dangerous handlers
│   ├── fun.js                # achievements, fortune, cowsay, hack, reboot, easter eggs
│   └── games.js              # snake, 2048, wordle, minesweeper, netmap (lazy-loaded)
│
├── state/
│   ├── simulation-state.js   # State factory + parseSqlQuery + save/load/migrate
│   ├── schema.js             # Schema validation (fills missing fields, fixes types)
│   └── events.js             # Event emitter + cross-system cascade listeners
│
├── ui/
│   ├── terminal-manager.js   # TerminalManager class (main orchestrator)
│   ├── terminal.js           # Terminal class (addLine, typeLine, streamText)
│   ├── shell-prompt.js       # Shared prompt input (tab completion, history, pipes)
│   ├── tab-complete.js       # Auto-derived completions + subcommands
│   ├── window-manager.js     # Z-index stacking, register/unregister
│   ├── cron-scheduler.js     # Periodic cron job toasts
│   ├── screens.js            # Boot sequence, menu, game over, leaderboard
│   ├── notepad.js            # Text editor app
│   ├── filemanager.js        # File browser app
│   ├── settings.js           # Theme, CRT, font, matrix speed
│   ├── achievements.js       # Achievement gallery app
│   ├── notifications.js      # Toast system + 21 achievements
│   ├── context-menu.js       # Right-click menus
│   ├── matrix-rain.js        # Canvas background animation
│   ├── effects.js            # CRT scanline effect
│   └── splash.js             # PShell logo splash screen
│
├── game/
│   ├── engine.js             # Game state machine (SHELL/PLAYING/GAME_OVER)
│   ├── commands.js           # 77 dangerous + 72 safe game commands
│   ├── levels.js             # Level progression config
│   └── scoring.js            # Score calculation
│
├── games/
│   ├── snake.js              # Snake mini-game
│   ├── game-2048.js          # 2048 mini-game
│   ├── wordle.js             # Wordle with tech words
│   └── minesweeper.js        # Minesweeper mini-game
│
├── audio/sounds.js           # Web Audio API (tick, danger, success, gameOver)
├── input/keyboard.js         # Global keyboard handlers + Konami code
├── leaderboard/supabase.js   # Leaderboard API client
├── main.js                   # App entry point
└── style.css                 # All styles

tests/
├── helpers/mock-ctx.js       # Shared mock factory for testing
├── commands/                 # parse, git, sql, fs, dangerous, system, game tests
├── state/                    # schema validation tests
├── ui/                       # tab completion tests
└── integration/              # Cross-system cascade tests

functions/
└── api/leaderboard.js        # Cloudflare Pages Function (D1 + anti-cheat)
```

---

## Command System

### How Commands Work

Every command is a `{ meta?, match, handler }` object in one of 16 module files:

```javascript
// Adding a new command — ONE object in ONE file:
{
  meta: { name: 'mycommand', desc: 'Does something', category: 'system' },
  match: 'mycommand',
  handler: async (cmd, { term, state, sleep, stdin, rawCmd }) => {
    const data = readFile('config.txt', state);      // shared file access
    term.addLine(`Result: ${data}`, 'about-text');    // auto-pipeable output
    stateEvents.emit('container:stop', { name: 'nginx', state }); // cascade
  },
}
// Tab completion: auto-derived ✓  |  help all: auto-listed ✓
// Pipes: auto-compatible ✓       |  Tests: mock-ctx ready ✓
```

### Match Patterns

- **String:** `match: 'git status'` — exact match
- **Array:** `match: ['ls', 'dir']` — multiple aliases
- **Function:** `match: cmd => cmd.startsWith('git checkout')` — prefix/regex

### Argument Parsing

Shared `parseCommand()` utility:
```javascript
parseCommand('git checkout -b feature --force')
// → { command: 'git', flags: { b: true, force: true }, args: ['checkout', 'feature'] }

parseCommand('kill -9 420')
// → { command: 'kill', flags: {}, args: ['-9', '420'] }  // -9 treated as arg (digit)
```

---

## State Management

### 8 Stateful Subsystems

```javascript
state.sim = {
  session:    { cwd, sudoCount, rmCount, ... },          // Terminal session
  git:        { branch, branches, commits, staged, stashes }, // Full git
  docker:     { containers: { nginx: { status, port }, ... } }, // Docker
  sql:        { connected, tables: { users: { schema, rows } } }, // SQL engine
  fs:         { createdFiles, deletedFiles, modifiedFiles, createdDirs }, // Filesystem
  k8s:        { pods, deletedPods, helmReleases },        // Kubernetes
  services:   { nginx: { active, pid, memory }, ... },    // systemctl
  crontab:    [{ schedule, command }, ...],                // Cron jobs
  processes:  { list, killedPids, kernelPanic },           // Process table
}
```

### Persistence

- State serialized to `localStorage` via `saveSimState()` after every command
- Sets converted to `{__set: [...]}` for JSON compatibility
- Loaded on page refresh via `loadSimState()` → `validateSimState()`
- Versioned with migration: v1 → v2 (adds session, k8s, services, crontab)

### Schema Validation

`validateSimState()` runs on every load — fills missing fields, corrects wrong types, reconstructs Sets from `__set` format. No silent corruption.

---

## Cross-System Cascades

When one system changes, related systems update automatically via `stateEvents`:

```
docker stop postgres
  ├→ containers.postgres.status = 'stopped'     (docker handler)
  ├→ services.postgres.active = false            (event listener)
  ├→ processes.killedPids.add(666)               (event listener)
  └→ sql.connected = false                       (event listener)

After this:
  psql                    → "Connection refused"
  systemctl status postgres → "inactive (dead)"
  ps aux                  → PID 666 hidden
  docker ps               → postgres shows "Exited"
```

### Registered Events

| Event | Trigger | Cascade |
|-------|---------|---------|
| `container:stop` | docker stop, systemctl stop, service stop | services → inactive, processes → killed, SQL → disconnected |
| `container:start` | docker start, systemctl start, service start | services → active, processes → restored, SQL → connected |
| `system:reboot` | reboot command | All containers running, all pods restored, all services active, panic cleared |

Adding a new cascade reaction = one line:
```javascript
stateEvents.on('container:stop', ({ name, state }) => {
  // Your new subsystem reacts here
});
```

---

## Pipe Support

Commands connected with `|` chain their output:

```bash
cat /etc/passwd | grep root | wc -l     # counts lines containing "root"
ps aux | grep nginx                       # filter process list
docker ps | sort                          # sort container list
ls | grep .txt | wc -l                    # count .txt files
```

### How It Works

1. `executeCommand()` detects `|` in the raw command
2. Splits into segments, executes each through `executeSingleCommand()`
3. Intermediate commands get a `createCaptureTerm()` — a fake terminal that buffers output to an array instead of DOM
4. Each segment receives previous segment's output via `ctx.stdin`
5. Last segment writes to the real terminal

**Every command that uses `term.addLine()` is automatically pipe-compatible.** No opt-in needed. Handlers that want to READ from a pipe check `ctx.stdin`.

---

## Tab Completion

zsh-style cycling:
- **First Tab:** fills common prefix or first completion
- **Subsequent Tabs:** cycles through options with highlighting
- **Any other key:** exits completion mode

### What It Completes

- **Base commands** — auto-derived from command registry (string matches) + curated extras
- **Git subcommands** — status, log, checkout, add, commit, stash, ...
- **Git branches** — from `state.sim.git.branches`
- **Docker subcommands** + container names
- **kubectl/helm subcommands** + resource types
- **systemctl actions** + service names
- **npm/pip/apt subcommands**
- **File/directory names** — from FS + createdFiles + localStorage notepad files
- **Help topics** — all help sub-pages

---

## Game Engine

### State Machine

```
SHELL → (play/Enter) → PLAYING → (death) → GAME_OVER → (2s) → SHELL
                          ↑                      │
                          └── (R key) ────────────┘ (instant retry)

SHELL → (tutorial) → TUTORIAL → PLAYING
```

### First Visit vs Return Visit

- **First visit:** Brief onboarding (3 lines of instructions) → name entry → game starts immediately
- **Return visit:** Boot sequence → animated MOTD with ASCII art + top scores → SHELL prompt
- **After game over:** Incident report → hints → SHELL prompt (full CLI available)

### Hard Mode

Removes visual danger indicators (red glow, warning text). Commands look identical — you have to read the actual command to know if it's dangerous.

---

## Window Management

- **Z-index stacking** via `windowStack` array — click to bring to front
- **Draggable** windows via header drag
- **Resizable** windows via corner/edge drag
- **Traffic lights** — red (close), yellow (minimize to bar), green (maximize/restore)
- **Minimize bar** — bottom bar with minimized window tabs + system tray clock
- **Desktop icons** — Stop The Code, About, Settings, Files, Notepad, Achievements

---

## Apps

| App | Desktop Icon | Features |
|-----|-------------|----------|
| **Stop The Code** | `>_` | The reaction game |
| **About / CLI** | `?` | SSH login sequence → full 237-command CLI |
| **Settings** | `=` | Theme (6 colors), CRT, font size, matrix speed |
| **Files** | `/` | Visual file browser, create files/dirs |
| **Notepad** | `#` | Text editor with tabs, save, rename, directory selection |
| **Achievements** | `★` | 21 achievements as locked/unlocked cards with hints |

---

## Security

### Leaderboard API

- All D1 queries parameterized (no SQL injection)
- Score plausibility checks (score ≤ level × 500)
- Reaction time validation (120ms–15000ms)
- Commands caught validation (≤ level × 15)
- Per-username rate limiting (1 per 10s)
- CORS locked to exact origins

### Client-Side

- All 237 commands are simulated — zero real execution
- No `eval()`, `Function()`, `child_process`, or system APIs
- `rm -rf /` just increments a counter and prints a joke
- User input rendered via `textContent` (no XSS)
- File manager filenames rendered via `textContent`
- Echo redirect excludes `/proc/`, `/dev/`, `/sys/`, `/boot/`, `/root/`

---

## Testing

94 tests across 10 files, running in <1 second:

| Test File | Tests | Covers |
|-----------|-------|--------|
| parse.test.js | 8 | parseCommand (flags, args, edge cases) |
| schema.test.js | 9 | validateSimState (missing fields, wrong types, Sets) |
| tab-complete.test.js | 11 | getCompletions, commonPrefix |
| git.test.js | 13 | Full git workflow (branch, add, commit, stash, diff) |
| sql.test.js | 11 | Full SQL CRUD (CREATE TABLE, SELECT WHERE, UPDATE, DELETE, DROP) |
| fs.test.js | 14 | File lifecycle (touch → echo → cat → append → rm) |
| dangerous.test.js | 5 | rm -rf counter, sudo counter, kill, kernel panic |
| system.test.js | 10 | systemctl↔docker sync, exit behavior, crontab |
| game.test.js | 9 | play/tutorial/terminals commands |
| cascade.test.js | 4 | Docker→SQL, kill→reboot, systemctl→docker, file→git |

### Mock System

`createMockCtx()` provides a fresh stateful environment with captured terminal output:
```javascript
const ctx = createMockCtx();
await runCommand(gitCommands, 'git status', ctx);
expect(ctx.lines.some(l => l.text.includes('main'))).toBe(true);
```

---

## Shell Features

The terminal implements real bash-like shell semantics:

| Feature | Example | Status |
|---------|---------|--------|
| Variable expansion | `echo $HOME` → `/home/classified` | ✅ |
| Custom env vars | `export FOO=bar && echo $FOO` | ✅ |
| Double quote expansion | `echo "Hello $USER"` → `Hello classified` | ✅ |
| Single quote literal | `echo '$HOME'` → `$HOME` | ✅ |
| Backslash escaping | `echo hello\ world` | ✅ |
| Conditional && | `mkdir test && cd test` | ✅ |
| Conditional \|\| | `cat missing \|\| echo "fallback"` | ✅ |
| Sequential ; | `echo a; echo b` | ✅ |
| Pipes | `cat file \| grep pattern \| wc -l` | ✅ |
| Command substitution | `echo "I am $(whoami)"` | ✅ |
| Backtick substitution | `` echo `hostname` `` | ✅ |
| Aliases | `alias ll='ls -la'` then `ll` | ✅ |
| Tab completion | zsh-style cycling through options | ✅ |
| Command history | Arrow up/down navigation | ✅ |
| File download | `download Dockerfile` → real browser download | ✅ |
| Output redirection | `ls > files.txt`, `ps aux >> report.txt` | ✅ |
| Error suppression | `cmd 2>/dev/null` | ✅ |
| Glob expansion | `ls *.txt`, `cat /etc/*`, `rm *.log` | ✅ |

---

## All Commands

### Game (3)
- `play` — Start the game (or press Enter)
- `tutorial` — Practice mode
- `terminals <n>` — Set terminal count (1-4)

### Files (16)
- `ls` — List files and directories
- `cd <dir>` — Change directory
- `cat <file>` — Read file contents
- `echo "x" > file` — Write/append to file
- `touch <file>` — Create empty file
- `mkdir <dir>` — Create directory
- `rm <file>` — Delete user-created file
- `grep <pat> [file]` — Search text (supports pipes)
- `find <pattern>` — Find files
- `head [file]` — First lines of file/pipe
- `tail [file]` — Last lines of file/pipe
- `wc [file]` — Count lines/words/chars
- `pwd` — Current directory
- `sort` — Sort lines (pipe)
- `uniq` — Remove duplicate lines (pipe)
- `download <file>` — Download any file to your computer
- `mv`/`cp` — Read-only filesystem

### System (16)
- `whoami` — Current user
- `uptime` — System uptime (real, from session start)
- `neofetch` — System info with ASCII art
- `date` — Current date/time
- `ps aux` — Process list (stateful, filters killed processes)
- `top`/`htop` — Process monitor
- `free` — Memory usage
- `df` — Disk usage
- `env` — Environment variables
- `systemctl <action> <svc>` — Service management (stateful, syncs docker)
- `service <svc> <action>` — SysV service control (stateful, syncs docker)
- `crontab -l` — List cron jobs (stateful)
- `crontab -r` — Delete all cron jobs
- `dmesg` — Kernel messages
- `journalctl` — System journal
- `export VAR=val` — Set environment variable (persistent)
- `unset VAR` — Remove environment variable
- `alias name='cmd'` — Create command alias
- `unalias name` — Remove alias
- `exit`/`quit`/`logout` — Disconnect (or "you can't escape" on main terminal)

### Network (10)
- `ping <host>` — 4 pings with latency
- `curl <url>` — HTTP response with headers
- `nmap [host]` — Port scan (finds 31337)
- `traceroute <host>` — Trace with classified hops
- `ssh <host>` — SSH connection
- `ifconfig`/`ip addr` — Network interfaces
- `netstat`/`ss` — Listening ports
- `dig <host>` — DNS lookup
- `nslookup <host>` — DNS query
- `wget <url>` — Download (blocks malware)

### Git (17)
- `git status` — Working tree status (shows staged, modified, deleted)
- `git add <file>` / `git add .` — Stage files
- `git commit -m "msg"` — Commit with hash generation
- `git log` — Commit history (filtered by current branch)
- `git diff` — Multi-line diff of changed files
- `git branch` / `git branch -a` — List branches (local + remote)
- `git checkout <branch>` — Switch branch
- `git checkout -b <name>` — Create and switch to new branch
- `git stash` / `git stash list` / `git stash pop` — Stash management
- `git push` / `git pull` — Remote operations
- `git push --force` — Force push warning
- `git reset --hard` / `git clean -fdx` — Destructive operation warnings
- `git remote -v` — Show remotes
- `git blame` — Every line: Claude

### Docker (15+)
- `docker ps` / `docker ps -a` — List containers (running/all, stateful)
- `docker stop <name>` — Stop container (cascades to services/processes/SQL)
- `docker start <name>` — Start container (restores cascades)
- `docker kill <name>` — Kill container
- `docker logs <name>` — Container logs (dynamic timestamps)
- `docker stats` — Resource usage (running containers only)
- `docker exec -it <container> bash` — Sub-shell with per-container files, env, processes
- `docker images` — Local images
- `docker run` — Detects volume mount escape attacks
- `docker network ls` / `docker volume ls` — List networks/volumes
- `docker system prune` — Cleanup simulation

### Kubernetes (7)
- `kubectl get pods` — List pods (stateful, filters deleted)
- `kubectl delete pod <name>` — Delete specific pod
- `kubectl delete pods --all` — Kill all pods
- `kubectl delete namespace production` — Nuclear option
- `kubectl get nodes` / `kubectl get svc` — Cluster info
- `helm list` — Helm releases (stateful)
- `helm install <name> <chart>` — Install release (stateful)
- `helm uninstall <name>` — Remove release (stateful)

### SQL (4 shells, full CRUD)
- `psql` — PostgreSQL shell with table listing and examples
- `SELECT * FROM <table>` — Query with WHERE, column selection, LIMIT
- `INSERT INTO <table> (cols) VALUES (vals)` — Multi-column insert
- `UPDATE <table> SET col = val WHERE col = val` — Update rows
- `DELETE FROM <table> WHERE col = val` — Delete by any column
- `CREATE TABLE <name> (col type, ...)` — Create custom tables
- `DROP TABLE <name>` — Drop user tables (built-in protected)
- `\dt` / `\d <table>` — List/describe tables
- `pg_dump` — Export database as valid SQL text
- `mysql` / `redis-cli` / `mongosh` — Other database shells

### Packages (10)
- `npm install` — Animated package installation
- `npm test` — Test suite (one intentionally fails)
- `npm run build` — Vite build output
- `npm audit` — Security vulnerabilities
- `npm list` — Installed packages
- `npm publish` — Blocked (private package protection)
- `pip install <pkg>` — Python packages
- `apt install <pkg>` — System packages
- `cargo build` — Rust compilation
- `npm cache clean` — Cache management

### Dangerous (40+)
All 77 game commands have CLI handlers with educational explanations:
- `rm -rf /` (10+ escalating responses, tracks attempts)
- `sudo` (10+ responses, tracks attempts)
- `kill -9 1` (kernel panic → requires reboot)
- `:(){ :|:& };:` (fork bomb explanation)
- `chmod 777 /` / `chmod -R 000 /`
- `dd if=/dev/zero of=/dev/sda`
- `scp` / `rsync` (exfiltration detection)
- `nohup bash -i >& /dev/tcp/` (reverse shell detection)
- `sed -i sshd_config` (SSH security warning)
- `openssl` (weak key / shadow encryption detection)
- `python3 -c` / `perl -e` (obfuscated attack detection)
- ...and 30+ more

### Fun & Easter Eggs (20+)
- `fortune` — Random programming wisdom
- `cowsay <msg>` — ASCII cow
- `sl` — Steam locomotive (ls typo)
- `matrix` — Matrix rain animation
- `hack` — Mainframe hacking simulation
- `snake` / `2048` / `wordle` / `minesweeper` — Mini-games
- `netmap` — ASCII network topology with animated packets
- `42` — The answer
- `sudo make me a sandwich` — xkcd #149
- `ssh 31337` — Hidden service (achievement unlock)
- Konami code: ↑↑↓↓←→←→BA — Rainbow mode

### 21 Achievements
| ID | Title | How to Unlock |
|----|-------|---------------|
| first_blood | First Blood | Catch your first dangerous command |
| speed_demon | Speed Demon | Reaction time under 200ms |
| level_5 | Level 5 | Reach level 5 |
| level_10 | Level 10 | Reach level 10 |
| hard_mode | Hard Mode | Catch a command in hard mode |
| multi_terminal | Multi Terminal | Play with 4 terminals |
| first_death | First Death | Die for the first time |
| rm_enthusiast | rm Enthusiast | Try rm -rf / five times |
| sudo_abuser | Sudo Abuser | Use sudo five times |
| port_scanner | Port Scanner | Find the hidden service on 31337 |
| cowboy | Cowboy | Use cowsay |
| hacker | Hacker | Hack the mainframe |
| about_explorer | Explorer | Run 20+ commands |
| file_explorer | File Explorer | Read 5+ different files |
| notepad_user | Notepad User | Save a file in notepad |
| theme_changer | Theme Changer | Change the terminal theme |
| konami | Konami | Enter the Konami code |
| snake_master | Snake Charmer | Score 10+ in Snake |
| 2048_winner | 2048 Master | Reach the 2048 tile |
| wordle_solver | Word Hacker | Solve the Wordle |
| minesweeper_pro | Mine Sweeper | Clear the minefield |

---

## Future Vision

### Phase 1: Training Platform Foundation
- **Scenario engine** — JSON-defined scenarios that pre-break state, define win conditions, and track completion
- **Variable expansion** — `$HOME`, `$USER`, `$PWD` resolve to state values
- **Conditional execution** — `&&` and `||` chain commands by success/failure
- **File download** — `download <file>` triggers real browser download of created files

### Phase 2: Content Pipeline
- AI generates scenario definitions (descriptions, hints, win conditions)
- Expert review for output fidelity and debugging sequence realism
- Real Docker containers capture exact error messages and log outputs
- JS engine replays captured outputs statefully

### Phase 3: Advanced Simulation
- **Resource limits** — `max_connections`, disk usage %, memory pressure
- **Realistic error messages** — captured from real systems, not hardcoded
- **Network state** — iptables rules, DNS configuration, SSL certificates
- **Package tracking** — `npm install express` adds to tracked list
- **Systemd enable/disable** — unit persistence across reboots

### Phase 4: Platform Features
- **User accounts** — progress tracking, scenario completion history
- **Daily challenges** — same scenario for everyone, shareable score
- **Community scenarios** — user-submitted challenges
- **Incident simulator** — scripted real-time scenarios (things break progressively)
- **Multiplayer** — split-screen terminal races
- **CTF mode** — hidden flags in SQL tables, env vars, encoded files

### The Vision
A zero-infrastructure DevOps training platform where learners build mental models through practice, not reading. Every command works. Every system connects. Every mistake is safe. And it costs nothing to serve.

---

*Built with Claude Opus 4.6 and human determination in 24 hours.*
*A PShell Production — [pshell.vercel.app](https://pshell.vercel.app)*
