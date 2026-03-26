export const packagesCommands = [

  // ══════════════════════════════════════
  // PACKAGE MANAGERS
  // ══════════════════════════════════════

  {
    meta: { name: 'npm install', desc: 'Install packages', category: 'package' },
    match: cmd => cmd === 'npm install' || cmd === 'npm i',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      const count = Math.floor(Math.random() * 80) + 120;
      const audited = count + 1;
      const time = Math.floor(Math.random() * 8) + 2;
      const vuln = Math.floor(Math.random() * 5);
      await sleep(400);
      term.addLine(`added ${count} packages, and audited ${audited} packages in ${time}s`, 'about-text');
      term.addLine('', 'blank');
      if (vuln > 0) {
        const critical = vuln > 2 ? 1 : 0;
        const moderate = vuln - critical;
        const parts = [];
        if (critical > 0) parts.push(`${critical} critical`);
        if (moderate > 0) parts.push(`${moderate} moderate`);
        term.addLine(`${vuln} vulnerabilities (${parts.join(', ')})`, 'danger-text');
        term.addLine('', 'blank');
        term.addLine('To address all issues, run:', 'about-text');
        term.addLine('  npm audit fix', 'about-text');
      } else {
        term.addLine('found 0 vulnerabilities', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'npm test', desc: 'Run tests', category: 'package' },
    match: 'npm test',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('> pshell@1.0.0 test', 'about-access', 8);
      await term.typeLine('> jest --coverage', 'about-access', 8);
      await sleep(200);
      const tests = [
        ['PASS', 'src/game/engine.test.js', true],
        ['PASS', 'src/game/commands.test.js', true],
        ['PASS', 'src/game/scoring.test.js', true],
        ['PASS', 'src/ui/terminal.test.js', true],
        ['FAIL', 'src/ui/about.test.js', false],
        ['PASS', 'src/leaderboard/supabase.test.js', true],
      ];
      for (const [status, file, pass] of tests) {
        const cls = pass ? 'about-text' : 'danger-text';
        term.addLine(` ${status}  ${file}`, cls);
        await sleep(100);
      }
      term.addLine('', 'blank');
      term.addLine('Test Suites: 1 failed, 5 passed, 6 total', 'about-text');
      term.addLine('Tests:       1 failed, 47 passed, 48 total', 'about-text');
      term.addLine('Coverage:    69% (nice)', 'about-text');
      term.addLine('', 'blank');
      term.addLine('Failing test: "about window should not', 'danger-text');
      term.addLine('  contain infinite commands" \u2014 EXCEEDED LIMIT', 'danger-text');
      term.addLine('', 'blank');
    },
  },

  {
    match: 'npm run build',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('> pshell@1.0.0 build', 'about-access', 8);
      await term.typeLine('> vite build', 'about-access', 8);
      await sleep(200);
      const steps = [
        'transforming...',
        '\u2713 58 modules transformed.',
        'rendering chunks...',
        'computing gzip size...',
      ];
      for (const s of steps) {
        term.addLine(s, 'about-access');
        await sleep(150);
      }
      term.addLine('', 'blank');
      term.addLine('dist/index.html          1.92 kB \u2502 gzip: 0.76 kB', 'about-text');
      term.addLine('dist/assets/index.css   19.81 kB \u2502 gzip: 4.45 kB', 'about-text');
      term.addLine('dist/assets/index.js   110.08 kB \u2502 gzip: 33.1 kB', 'about-text');
      term.addLine('', 'blank');
      term.addLine('\u2713 built in 125ms', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'npm audit', desc: 'Security audit', category: 'package' },
    match: 'npm audit',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Running security audit...', 'about-access', 10);
      await sleep(400);
      term.addLine('', 'blank');
      term.addLine('                === Audit Report ===', 'about-heading');
      term.addLine('', 'blank');
      term.addLine('  lodash  <4.17.21', 'about-text');
      term.addLine('  Severity: critical', 'danger-text');
      term.addLine('  Prototype Pollution in lodash', 'about-text');
      term.addLine('  fix: npm audit fix', 'about-access');
      term.addLine('', 'blank');
      term.addLine('  node-fetch  <2.6.7', 'about-text');
      term.addLine('  Severity: moderate', 'about-access-warn');
      term.addLine('  Exposure of sensitive information', 'about-text');
      term.addLine('  fix: npm audit fix --force', 'about-access');
      term.addLine('', 'blank');
      term.addLine('2 vulnerabilities found', 'danger-text');
      term.addLine('  1 critical | 1 moderate', 'about-text');
      term.addLine('', 'blank');
    },
  },

  // "npm install happiness" / "apt install happiness" — specific match before generic
  {
    match: cmd => cmd === 'apt install happiness' || cmd === 'npm install happiness',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      await term.typeLine('Searching package registry...', 'about-access', 10);
      await sleep(300);
      term.addLine('ERROR: Package "happiness" not found.', 'danger-text');
      term.addLine('Did you mean: coffee? therapy? sleep?', 'about-text');
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'pip install <pkg>', desc: 'Install Python packages', category: 'package' },
    match: cmd => cmd === 'pip install' || cmd.startsWith('pip install '),
    handler: async (cmd, { term, sleep }) => {
      const pkg = cmd.slice(12) || 'requirements.txt';
      term.addLine('', 'blank');
      await term.typeLine(`Collecting ${pkg}...`, 'about-access', 8);
      await sleep(200);
      const deps = ['numpy', 'pandas', 'requests', 'flask', 'cryptography'];
      for (const d of deps.slice(0, 3)) {
        term.addLine(`  Downloading ${d}-${Math.floor(Math.random()*3)+1}.${Math.floor(Math.random()*20)}.${Math.floor(Math.random()*5)}.whl`, 'about-access');
        await sleep(80);
      }
      term.addLine(`Successfully installed ${pkg} + 12 dependencies`, 'about-text');
      if (pkg === 'happiness') {
        term.addLine('', 'blank');
        term.addLine('WARNING: happiness is deprecated.', 'about-access-warn');
        term.addLine('Use "coffee" or "therapy" instead.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

  {
    meta: { name: 'apt install <pkg>', desc: 'Install system packages', category: 'package' },
    match: cmd => cmd === 'apt install' || cmd.startsWith('apt install '),
    handler: async (cmd, { term, sleep }) => {
      const pkg = cmd.slice(12) || 'common-sense';
      term.addLine('', 'blank');
      term.addLine(`Reading package lists... Done`, 'about-access');
      await sleep(100);
      term.addLine(`Building dependency tree... Done`, 'about-access');
      await sleep(100);
      term.addLine(`The following NEW packages will be installed:`, 'about-text');
      term.addLine(`  ${pkg} lib${pkg}-dev lib${pkg}-common`, 'about-text');
      await sleep(100);
      term.addLine(`0 upgraded, 3 newly installed, 0 to remove.`, 'about-text');
      term.addLine(`Need to get 42.0 MB of archives.`, 'about-text');
      await sleep(200);
      if (pkg === 'happiness' || pkg === 'common-sense') {
        term.addLine(`E: Unable to locate package ${pkg}`, 'danger-text');
        term.addLine('Some things can\'t be installed with apt.', 'about-text');
      } else {
        term.addLine(`Setting up ${pkg}... Done`, 'about-access');
      }
      term.addLine('', 'blank');
    },
  },

  {
    match: cmd => cmd === 'cargo build' || cmd === 'cargo build --release',
    handler: async (cmd, { term, sleep }) => {
      term.addLine('', 'blank');
      const crates = ['tokio', 'serde', 'hyper', 'axum', 'sqlx', 'rand', 'clap'];
      for (const c of crates) {
        term.addLine(`   Compiling ${c} v${Math.floor(Math.random()*2)+1}.${Math.floor(Math.random()*30)}.${Math.floor(Math.random()*10)}`, 'about-access');
        await sleep(60);
      }
      term.addLine(`   Compiling pshell v1.0.0`, 'about-text');
      await sleep(200);
      const time = (Math.random() * 30 + 15).toFixed(1);
      term.addLine(`    Finished \`release\` profile in ${time}s`, 'about-text');
      term.addLine('', 'blank');
    },
  },

  // npm list / npm ls
  {
    match: cmd => cmd === 'npm list' || cmd === 'npm ls' || cmd === 'npm list --depth=0',
    handler: async (cmd, { term }) => {
      term.addLine('pshell@1.0.0 /app', 'about-text');
      term.addLine('\u251C\u2500\u2500 vite@8.0.2', 'about-text');
      term.addLine('\u251C\u2500\u2500 @anthropic/claude-tears@\u221E', 'about-text');
      term.addLine('\u251C\u2500\u2500 hope@0.0.1', 'about-text');
      term.addLine('\u251C\u2500\u2500 sleep-deprivation@3.0.0', 'about-text');
      term.addLine('\u251C\u2500\u2500 coffee@99.9.9', 'about-text');
      term.addLine('\u251C\u2500\u2500 impostor-syndrome@1.0.0', 'about-text');
      term.addLine('\u2514\u2500\u2500 it-works-on-my-machine@1.0.0', 'about-text');
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

  // npm publish
  {
    meta: { name: 'npm publish', desc: 'Publish package (blocked)', category: 'package' },
    match: cmd => cmd.startsWith('npm publish'),
    handler: async (cmd, { term }) => {
      term.addLine('', 'blank');
      term.addLine('npm publish blocked!', 'danger-text');
      if (cmd.includes('--access public')) {
        term.addLine('Publishing a private package publicly?', 'about-text');
        term.addLine('Internal code and secrets on the public registry.', 'about-text');
      } else {
        term.addLine('You almost published the game to npm.', 'about-text');
        term.addLine('That would have been... interesting.', 'about-text');
      }
      term.addLine('', 'blank');
    },
  },

];
