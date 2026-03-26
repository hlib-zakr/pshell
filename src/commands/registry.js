// Command registry metadata — enables auto-generated help and discoverability
// Each command can optionally declare: meta: { name, desc, category }
// Categories: 'game', 'file', 'system', 'network', 'git', 'docker', 'k8s', 'sql', 'package', 'fun', 'dangerous'

const CATEGORIES = {
  game: 'GAME',
  file: 'FILES',
  system: 'SYSTEM',
  network: 'NETWORK',
  git: 'GIT',
  docker: 'DOCKER',
  k8s: 'KUBERNETES',
  sql: 'DATABASES',
  package: 'PACKAGES',
  fun: 'FUN',
  dangerous: 'DANGEROUS',
};

// Collect metadata from all registered commands
export function getCommandMeta(commands) {
  const meta = [];
  for (const cmd of commands) {
    if (cmd.meta) {
      meta.push(cmd.meta);
    }
  }
  return meta;
}

// Group metadata by category
export function getCommandsByCategory(commands) {
  const groups = {};
  for (const cmd of commands) {
    if (!cmd.meta) continue;
    const cat = cmd.meta.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(cmd.meta);
  }
  return groups;
}

// Render auto-generated help page
export function renderAutoHelp(commands, term, filterCategory = null) {
  const groups = getCommandsByCategory(commands);
  const cats = filterCategory ? [filterCategory] : Object.keys(groups);

  for (const cat of cats) {
    const entries = groups[cat];
    if (!entries || entries.length === 0) continue;
    const label = CATEGORIES[cat] || cat.toUpperCase();
    term.addLine(`  ── ${label} ──`, 'about-heading');
    for (const entry of entries) {
      term.addLine(`  ${(entry.name || '').padEnd(22)} ${entry.desc || ''}`, 'about-text');
    }
    term.addLine('', 'blank');
  }
}

export { CATEGORIES };
