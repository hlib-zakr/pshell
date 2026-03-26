# PShell

Browser-based infrastructure simulator. 250+ real commands, stateful Docker/K8s/Git/SQL, cascading failures. All client-side JavaScript, zero backend.

**[Live Demo](https://pshell.vercel.app)** · **[Contributing](CONTRIBUTING.md)** · **[Architecture](ARCHITECTURE.md)**

## What is this?

A terminal that behaves like a real Linux server. Stop a Docker container and watch your SQL break. Kill init and get a kernel panic. Deploy with Helm, query with psql, grep through logs — all in your browser, instantly.

No VM. No container. No backend. A pure JavaScript state machine that simulates how infrastructure actually behaves.

## Try it

```
docker stop postgres && psql -c "SELECT 1"     # cascade failure
docker compose down && docker compose up        # full lifecycle
docker stats                                    # watch OOM kill
kubectl get pods && kubectl delete pod ...      # k8s management
psql -c "SELECT * FROM users"                  # query the database
curl nginx:80                                   # container DNS
docker inspect nginx                            # full JSON output
```

## Quick Start

```bash
git clone https://github.com/hlib-zakr/pshell.git
cd pshell
npm install
npm run dev     # localhost:5173
npm test        # 566 tests
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

Every command reads/writes the same state object. Stop postgres → cascade event fires → SQL disconnects, services go down, processes killed. Start it → everything restores.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the deep dive.

## What's inside

- **Shell:** Variables, pipes, conditionals (&&/||/;), command substitution, globs, redirections, aliases, quoting
- **Docker:** 7 container states, restart policies, health checks, compose, inspect, events, networking, OOM simulation
- **Kubernetes:** Pods, deployments, services, nodes (all stateful), Helm releases
- **Git:** Branches, commits, staging, stash, diff — all tracked in state
- **SQL:** CREATE/SELECT/INSERT/UPDATE/DELETE with auto-sized columns, right-aligned numbers
- **System:** Processes (killable), services (stoppable), crontab, filesystem mutations
- **250+ commands** across 16 modules, all producing output that matches real Linux

## Why this exists

There's no safe place to run `docker stop postgres` and see what cascades. No tool where a junior DevOps engineer can practice recovering from a kernel panic. No client-side terminal simulator that goes this deep.

PShell fills that gap. Zero cost per user, instant load, infinite depth.

## Contributing

We want contributors who know specific systems deeply. A DBA who adds replication failover. A network engineer who adds real iptables chains. A k8s admin who adds CRDs.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for how to add commands, systems, and cascades.

## License

[AGPL-3.0](LICENSE)

Built by [Hlib Zakrevskyi](https://github.com/hlib-zakr)
