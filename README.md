# PShell

Browser-based infrastructure simulator. 250+ real commands, stateful Docker/K8s/Git/SQL, cascading failures. All client-side JavaScript, zero backend.

**[Live Demo](https://pshell.vercel.app)** · **[Contributing](CONTRIBUTING.md)** · **[Architecture](ARCHITECTURE.md)**

## What is this?

A terminal that behaves like a real Linux server — entirely in your browser.

Stop a Docker container and watch your SQL break. Kill init and get a kernel panic. Deploy with Helm, query with psql, grep through logs. Everything is connected. Everything cascades.

No VM. No container. No backend. A pure JavaScript state machine that simulates how infrastructure actually behaves — instantly, at zero cost.

## The Vision

PShell is an infinitely deep infrastructure simulator built by the community.

The core engine handles state, cascades, and the command pipeline. Contributors add the depth — a kernel engineer adds real process trees, a DBA adds replication failover, a network engineer adds iptables chains, a k8s admin adds CRDs and operators.

**Every system added makes every other system more realistic.** Add health checks → Docker compose gets smarter. Add connection pools → cascading failures become more real. Add DNS → networking scenarios unlock.

The depth compounds. The architecture supports it. And no single person or company would build all of it — that's why it's open source.

### Where it's going

- **Import your state.** Export your real `docker ps`, `kubectl get pods` output. Paste it into PShell. Practice commands against your own infrastructure safely.
- **Scenario engine.** JSON-defined broken states with win conditions. "Postgres is down, users are getting 502s. Fix it."
- **Community depth.** Hundreds of contributors, each going deep on the systems they know.
- **The tool that doesn't exist.** There is no safe place to run `docker stop postgres` and see what cascades. PShell is that place.

## Try it

```
docker stop postgres && psql -c "SELECT 1"     # cascade failure
docker compose down && docker compose up        # full lifecycle
docker stats                                    # watch OOM kill
kubectl get pods && kubectl delete pod ...      # k8s management
psql -c "SELECT * FROM users"                  # query the database
curl nginx:80                                   # container DNS
curl localhost:3000                             # port mapping
docker inspect nginx                            # full JSON output
ping postgres                                   # resolves to container IP
```

## Quick Start

```bash
git clone https://github.com/hlib-zakr/pshell.git
cd pshell
npm install
npm run dev     # localhost:5173
npm test        # 677 tests
```

## Add a Command (5 minutes)

```javascript
// src/commands/system.js
{
  meta: { name: 'yourcommand', desc: 'What it does', category: 'system' },
  match: 'yourcommand',
  handler: async (cmd, { term, state }) => {
    term.addLine('output here', 'about-text');
  }
}
```

Run `npm test` — the completeness test tells you if you forgot anything.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full guide.

## How it works

```
Commands:   {meta, match, handler} objects in src/commands/*.js
State:      One JS object — src/state/simulation-state.js
Cascades:   Event emitter — src/state/events.js
Pipeline:   Aliases > Conditionals > Variables > Substitution > Globs > Redirects > Pipes
```

Every command reads/writes the same state object. Stop postgres → cascade event fires → SQL disconnects, services go down, processes killed. Start it → everything restores. The state is ONE object. Override any field. Commands just work on whatever state you give them.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the deep dive.

## What's inside

- **Shell:** Variables, pipes, conditionals (&&/||/;), command substitution, globs, redirections, aliases, quoting
- **Docker:** 7 container states, restart policies, health checks, compose (up/down/ps/logs), inspect with Go templates, events, networking, OOM simulation, resource limits
- **Kubernetes:** Pods, deployments, services, nodes (all stateful), Helm releases with dependency resolution
- **Git:** Branches, commits, staging, stash, diff — all tracked in state
- **SQL:** Full CRUD with auto-sized columns, right-aligned numbers, case-insensitive table names
- **Networking:** Container DNS (`curl nginx:80`), port mapping (`curl localhost:3000`), IP resolution, dynamic nmap/netstat/iptables
- **System:** Processes (killable), services (stoppable), crontab, filesystem mutations, dynamic top/free/uptime
- **250+ commands** across 16 modules, every output matching real Linux

## Why this doesn't exist anywhere else

| | PShell | WebVM/v86 | SadServers | Killercoda |
|---|---|---|---|---|
| Client-side | Yes | Yes (WASM) | No (AWS VMs) | No (VMs) |
| Commands | 250+ | Real OS | Real OS | Real OS |
| Stateful systems | 8 interconnected | 1 VM | 1 VM/scenario | Real infra |
| Cascading failures | Yes | No | No | No |
| Instant load | Yes | Slow boot | VM spin-up | VM spin-up |
| Zero cost per user | Yes | Yes | No | No |
| Open source engine | Yes | Proprietary engine | Yes | No |

No tool combines client-side + deep stateful simulation + cross-system cascades + instant load + zero cost. PShell is the first.

## Contributing

We want contributors who know specific systems deeply. A DBA who adds replication failover. A network engineer who adds real iptables chains. A k8s admin who adds CRDs.

Adding a command takes 5 minutes. Adding a new system takes an hour. The architecture is designed for infinite depth.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for how to add commands, systems, and cascades.

## Stats

- 250+ commands across 16 modules
- 8 stateful subsystems (Docker, K8s, Git, SQL, processes, services, filesystem, crontab)
- Full Docker lifecycle (7 states, restart policies, health checks, compose, OOM)
- 677 tests
- Cross-system cascading failures
- Every output dynamically computed from state — no hardcoded data

## License

[AGPL-3.0](LICENSE) — use it, modify it, share it. If you host a modified version, you must open-source your changes.

Built by [Hlib Zakrevskyi](https://github.com/hlib-zakr)
