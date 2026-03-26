# Contributing to PShell

Three things you can add: **commands**, **stateful systems**, and **cascades**.

## Adding a Command (~5 min)

### 1. Pick a module

| Module | What goes here |
|--------|---------------|
| `src/commands/fs.js` | ls, cat, grep, wc, touch, mkdir, find |
| `src/commands/system.js` | ps, top, whoami, uptime, systemctl |
| `src/commands/docker.js` | docker ps/stop/start/inspect/compose |
| `src/commands/k8s.js` | kubectl, helm |
| `src/commands/git.js` | git status/log/add/commit |
| `src/commands/sql.js` | psql, pg_dump |
| `src/commands/network.js` | ping, curl, traceroute, dig, iptables |
| `src/commands/dangerous.js` | rm, sudo, kill, chmod |
| `src/commands/fun.js` | cowsay, fortune, sl, neofetch |
| `src/commands/packages.js` | npm, pip, cargo, apt |

New domain? Create `src/commands/your-domain.js` and add it to `src/commands/index.js`.

### 2. Add the handler

```javascript
{
  meta: { name: 'yourcommand', desc: 'What it does', category: 'system' },
  match: 'yourcommand',  // string, array, or function
  handler: async (cmd, { term, state, sleep, stdin, rawCmd }) => {
    // Read state
    const value = state.sim.subsystem.field;

    // Write output (auto-pipeable)
    term.addLine('output', 'about-text');

    // Modify state
    state.sim.subsystem.field = newValue;

    // Trigger cascade
    stateEvents.emit('event:name', { name: 'thing', state });
  }
}
```

### 3. Run tests

```bash
npm test
```

The **completeness test** fails if you forgot:
- Tab-complete entry (only for function matchers — string matches auto-derive)
- Help page mention

### 4. Fix completeness (if needed)

If your `match` is a **function** (not a string):
- Add to `src/ui/tab-complete.js` → `extras` array
- Add to `src/commands/help.js` → appropriate section

### 5. Write a test

```javascript
it('yourcommand works', async () => {
  const ctx = createMockCtx();
  await runCommand(yourCommands, 'yourcommand', ctx);
  expect(ctx.lines.some(l => l.text.includes('expected'))).toBe(true);
});
```

---

## Adding a Stateful System (~1 hour)

### 1. Add state — `src/state/simulation-state.js`

```javascript
// Inside createSimState(), add:
dns: {
  records: { 'pshell.internal': '10.0.42.1' },
  servers: ['10.0.42.1', '8.8.8.8'],
},
```

### 2. Validate — `src/state/schema.js`

```javascript
if (!state.dns) state.dns = { records: {}, servers: [] };
```

### 3. Create module — `src/commands/dns.js`

```javascript
export const dnsCommands = [
  {
    meta: { name: 'dig', desc: 'DNS lookup', category: 'network' },
    match: cmd => cmd.startsWith('dig '),
    handler: async (cmd, { term, state }) => { ... }
  }
];
```

### 4. Register — `src/commands/index.js`

```javascript
import { dnsCommands } from './dns.js';
const COMMANDS = [...dnsCommands, ...otherCommands];
```

### 5. Add cascades (optional) — `src/state/events.js`

```javascript
stateEvents.on('container:stop', ({ name, state }) => {
  if (name === 'dns-server') state.sim.dns.servers = [];
});
```

---

## Adding a Cascade (~10 min)

Cascades make systems talk. Stop postgres → SQL breaks. Kill init → kernel panic.

### Emit

```javascript
stateEvents.emit('container:stop', { name: 'postgres', state });
```

### Listen — `src/state/events.js`

```javascript
stateEvents.on('container:stop', ({ name, state }) => {
  if (name === 'postgres') state.sim.sql.connected = false;
});
```

### Current events

| Event | Trigger | Payload |
|-------|---------|---------|
| `container:stop` | docker stop/kill/pause | `{ name, state }` |
| `container:start` | docker start/unpause | `{ name, state }` |
| `container:oom` | memory limit exceeded | `{ name, state }` |
| `system:reboot` | reboot command | `{ state }` |

---

## Rules

1. **Match real output.** Look up what the real command produces. Don't guess.
2. **No hardcoding dynamic data.** If it comes from state, read from state.
3. **Silent commands stay silent.** `touch`, `mkdir`, `git add` produce no output on success.
4. **Tests required.** Every PR needs tests. `npm test` must pass.
5. **Completeness enforced.** Every handler needs tab-complete + help entries.

---

## Project structure

```
src/
  commands/       16 command modules ({meta, match, handler} pattern)
  state/          State factory, schema validation, cascade events
  ui/             Terminal manager, tab completion, screens
  game/           Game engine (Stop The Code mini-game)
  audio/          Sound effects
  input/          Keyboard handling
tests/
  commands/       Unit tests per module
  integration/    Pipeline, cascade, realism, completeness tests
  helpers/        Mock context (createMockCtx)
```
