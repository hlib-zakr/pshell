import { saveSimState } from '../state/simulation-state.js';
import { writeFile, appendFile, listDir } from './file-utils.js';
export { FS, resolvePath } from './filesystem.js';
import { gameCommands } from './game.js';
import { helpCommands } from './help.js';
import { gitCommands } from './git.js';
import { dockerCommands } from './docker.js';
import { sqlCommands } from './sql.js';
import { fsCommands } from './fs.js';
import { networkCommands } from './network.js';
import { k8sCommands } from './k8s.js';
import { systemCommands } from './system.js';
import { packagesCommands } from './packages.js';
import { dangerousCommands } from './dangerous.js';
import { funCommands } from './fun.js';
import { gamesCommands } from './games.js';

const COMMANDS = [
  ...gameCommands,
  ...helpCommands,
  ...fsCommands,
  ...systemCommands,
  ...networkCommands,
  ...gitCommands,
  ...dockerCommands,
  ...k8sCommands,
  ...sqlCommands,
  ...packagesCommands,
  ...dangerousCommands,
  ...funCommands,
  ...gamesCommands,
];

// Export COMMANDS for registry/auto-help
export { COMMANDS };

// ─── Auto-derive completable command names from the COMMANDS registry ───
export function getRegisteredCommands() {
  const cmds = new Set();
  for (const c of COMMANDS) {
    if (typeof c.match === 'string') cmds.add(c.match.split(' ')[0]);
    else if (Array.isArray(c.match)) c.match.forEach(m => cmds.add(m.split(' ')[0]));
  }
  return [...cmds].sort();
}

// ─── Pre-processing pipeline ───

// Stable fake PID — generated once per session, reused for every $$ expansion
const _fakePid = String(Math.floor(Math.random() * 90000) + 10000);

// Expand $VAR, $HOME, $USER, $PWD, $RANDOM, etc.
function expandVariables(input, state) {
  if (!input.includes('$')) return input;
  const sim = state?.sim;
  const builtins = {
    HOME: '/home/classified',
    USER: 'classified',
    PWD: state?.cwd || '/home/classified',
    SHELL: '/bin/bash',
    PATH: '/usr/local/bin:/usr/bin:/bin:/sbin',
    HOSTNAME: 'pshell-classified-001',
    RANDOM: String(Math.floor(Math.random() * 32768)),
    '?': '0',  // last exit code (always success for now)
    '$': _fakePid, // fake PID (constant per session)
  };
  // Merge custom env vars from state
  const env = { ...builtins, ...(sim?.env || {}) };

  // Process character by character to respect quotes
  let result = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; result += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; result += ch; continue; }
    if (ch === '\\' && !inSingle && i + 1 < input.length) {
      const next = input[i + 1];
      if (inDouble) {
        // Inside double quotes: consume backslash for \$, \`, \", and \\
        if (next === '$' || next === '`') { result += next; i++; continue; }
        if (next === '"') { result += '"'; i++; continue; }  // \" → "
        if (next === '\\') { result += '\\'; i++; continue; }  // \\ → \
        // Everything else (\n, \t, etc.) — keep backslash + char intact (real bash behavior)
        result += ch + next; i++; continue;
      }
      // Outside quotes: consume backslash, keep next char
      result += next; i++; continue;
    }
    if (ch === '$' && !inSingle) {
      // ${VAR} form
      if (input[i + 1] === '{') {
        const end = input.indexOf('}', i + 2);
        if (end !== -1) {
          const varName = input.slice(i + 2, end);
          result += env[varName] ?? '';
          i = end;
          continue;
        }
      }
      // $VAR form
      let varName = '';
      let j = i + 1;
      while (j < input.length && /[\w?$]/.test(input[j])) { varName += input[j]; j++; }
      if (varName) {
        result += env[varName] ?? '';
        i = j - 1;
        continue;
      }
    }
    result += ch;
  }
  return result;
}

// Split on && / || / ; respecting quotes
function splitConditionals(input) {
  const segments = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && !inSingle && i + 1 < input.length) { current += ch + input[++i]; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
    if (!inSingle && !inDouble) {
      if (ch === '&' && input[i + 1] === '&') {
        segments.push({ cmd: current.trim(), op: '&&' });
        current = '';
        i++;
        continue;
      }
      if (ch === '|' && input[i + 1] === '|') {
        segments.push({ cmd: current.trim(), op: '||' });
        current = '';
        i++;
        continue;
      }
      if (ch === ';') {
        segments.push({ cmd: current.trim(), op: ';' });
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) segments.push({ cmd: current.trim(), op: null });
  return segments;
}

// Expand aliases — check state.sim.aliases, replace first word
function expandAliases(input, state) {
  const aliases = state?.sim?.aliases;
  if (!aliases) return input;
  const firstSpace = input.indexOf(' ');
  const firstWord = firstSpace === -1 ? input : input.slice(0, firstSpace);
  const rest = firstSpace === -1 ? '' : input.slice(firstSpace);
  if (aliases[firstWord]) return aliases[firstWord] + rest;
  return input;
}

// Command substitution — $(cmd) or `cmd`
async function expandCommandSubstitution(input, ctx) {
  // Handle $(cmd) — find innermost $() first, but respect quotes
  let result = input;
  let safety = 10;
  while (result.includes('$(') && safety-- > 0) {
    // Find innermost $(...) that's NOT inside single quotes
    let depth = 0;
    let start = -1;
    let inSingle = false;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === "'" && depth === 0) { inSingle = !inSingle; continue; }
      if (inSingle) continue; // skip everything inside single quotes
      if (result[i] === '$' && result[i + 1] === '(') {
        if (depth === 0) start = i;
        depth++;
        i++;
      } else if (result[i] === ')' && depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          const innerCmd = result.slice(start + 2, i);
          // Execute inner command and capture output
          const captureTerm = createCaptureTerm(ctx.term);
          const innerCtx = { ...ctx, term: captureTerm, rawCmd: innerCmd };
          await executeSingleCommand(innerCmd, innerCtx);
          const output = captureTerm._buffer.join('\n').trim();
          result = result.slice(0, start) + output + result.slice(i + 1);
          break; // restart search for more substitutions
        }
      }
    }
    if (start === -1) break; // no more $( found
  }

  // Handle backtick form: `cmd` — skip if inside single quotes
  safety = 10;
  while (result.includes('`') && safety-- > 0) {
    // Find first backtick not inside single quotes
    let first = -1;
    let inSQ = false;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === "'") { inSQ = !inSQ; continue; }
      if (result[i] === '`' && !inSQ) { first = i; break; }
    }
    if (first === -1) break;
    const second = result.indexOf('`', first + 1);
    if (second === -1) break;
    const innerCmd = result.slice(first + 1, second);
    const captureTerm = createCaptureTerm(ctx.term);
    const innerCtx = { ...ctx, term: captureTerm, rawCmd: innerCmd };
    await executeSingleCommand(innerCmd, innerCtx);
    const output = captureTerm._buffer.join('\n').trim();
    result = result.slice(0, first) + output + result.slice(second + 1);
  }

  return result;
}

// Check if input contains a pipe operator that's NOT inside quotes or $()
function hasPipe(input) {
  let inSingle = false, inDouble = false, parenDepth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && !inSingle && i + 1 < input.length) { i++; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === '$' && input[i + 1] === '(' && !inSingle) { parenDepth++; i++; continue; }
    if (ch === '(' && !inSingle) { parenDepth++; continue; }
    if (ch === ')' && parenDepth > 0) { parenDepth--; continue; }
    if (ch === '|' && input[i + 1] !== '|' && !inSingle && !inDouble && parenDepth === 0) {
      return true;
    }
  }
  return false;
}

// Split on pipe respecting quotes and $()
function splitPipes(input) {
  const segments = [];
  let current = '';
  let inSingle = false, inDouble = false, parenDepth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && !inSingle && i + 1 < input.length) { current += ch + input[++i]; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
    if (ch === '$' && input[i + 1] === '(' && !inSingle) { parenDepth++; current += ch; continue; }
    if (ch === '(' && !inSingle && parenDepth > 0) { parenDepth++; current += ch; continue; }
    if (ch === ')' && parenDepth > 0) { parenDepth--; current += ch; continue; }
    if (ch === '|' && input[i + 1] !== '|' && !inSingle && !inDouble && parenDepth === 0) {
      segments.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) segments.push(current.trim());
  return segments;
}

// Detect and extract output redirections: cmd > file, cmd >> file, cmd 2>/dev/null
function extractRedirection(input) {
  // Don't process echo redirections (those have their own handler)
  if (/^echo\s/i.test(input)) return { cmd: input, redirect: null };

  let redirect = null;
  let cleaned = input;

  // 2>/dev/null or 2>&1 — suppress errors
  if (cleaned.includes(' 2>/dev/null') || cleaned.includes(' 2>&1')) {
    cleaned = cleaned.replace(/\s+2>(?:\/dev\/null|&1)/g, '');
    redirect = { type: 'suppress_errors' };
  }

  // >> file (append)
  const appendMatch = cleaned.match(/^(.+?)\s+>>\s+(\S+)\s*$/);
  if (appendMatch) {
    return { cmd: appendMatch[1].trim(), redirect: { type: 'append', file: appendMatch[2] } };
  }

  // > file (overwrite)
  const writeMatch = cleaned.match(/^(.+?)\s+>\s+(\S+)\s*$/);
  if (writeMatch) {
    return { cmd: writeMatch[1].trim(), redirect: { type: 'write', file: writeMatch[2] } };
  }

  return { cmd: cleaned, redirect };
}

// Expand glob patterns: *.txt, /etc/*, *.log
function expandGlobs(input, state) {
  if (!input.includes('*') && !input.includes('?')) return input;
  const parts = input.split(/\s+/);
  const expanded = [];

  for (const part of parts) {
    // Skip parts that don't have glob characters
    if (!part.includes('*') && !part.includes('?')) {
      expanded.push(part);
      continue;
    }
    // Skip bare * (common in SQL, not a file glob)
    if (part === '*') {
      expanded.push(part);
      continue;
    }
    // Skip if this specific token is quoted (per-token suppression, not whole-input)
    if ((part.startsWith('"') && part.endsWith('"')) ||
        (part.startsWith("'") && part.endsWith("'"))) {
      expanded.push(part);
      continue;
    }

    // Determine directory and pattern
    const lastSlash = part.lastIndexOf('/');
    const dir = lastSlash === -1 ? (state?.cwd || '/home/classified') : part.slice(0, lastSlash) || '/';
    const pattern = lastSlash === -1 ? part : part.slice(lastSlash + 1);

    // Convert glob to regex: * → .*, ? → .
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');

    // Get directory entries
    const entries = listDir(dir, state);
    const matches = entries.filter(e => regex.test(e));

    if (matches.length > 0) {
      // Add full paths if pattern had a directory component
      if (lastSlash !== -1) {
        expanded.push(...matches.map(m => dir === '/' ? '/' + m : dir + '/' + m));
      } else {
        expanded.push(...matches);
      }
    } else {
      // No matches — keep literal (bash behavior)
      expanded.push(part);
    }
  }

  return expanded.join(' ');
}

// Execute a command with redirection: capture output, write to file
async function executeWithRedirection(cmdStr, redirect, ctx) {
  const captureTerm = createCaptureTerm(ctx.term);
  const captureCtx = { ...ctx, term: captureTerm, rawCmd: cmdStr };
  await executeSingleCommand(cmdStr, captureCtx);
  const output = captureTerm._buffer.join('\n');

  if (redirect.type === 'write') {
    writeFile(redirect.file, output, ctx.state);
  } else if (redirect.type === 'append') {
    appendFile(redirect.file, output, ctx.state);
  }
}

export async function executeCommand(cmd, ctx) {
  const rawCmd = ctx.rawCmd || cmd;

  // Track command count
  if (ctx.state.sim) {
    ctx.state.sim.commandCount++;
    if (ctx.state.sim.commandCount >= 20 && window._unlockAchievement) window._unlockAchievement('about_explorer');
  }

  // Kernel panic — block ALL commands except reboot
  if (ctx.state.sim?.processes?.kernelPanic && !rawCmd.toLowerCase().includes('reboot')) {
    ctx.term.addLine('[KERNEL PANIC] System unstable — type "reboot" to recover', 'danger-text');
    return;
  }

  // Pre-process pipeline:
  // 1. Expand aliases
  const aliased = expandAliases(rawCmd, ctx.state);

  // 2. Split on && / || / ; FIRST (before variable expansion)
  //    This allows left-to-right evaluation: export X=1 && echo $X works
  const conditionals = splitConditionals(aliased);

  if (conditionals.length > 1) {
    let lastSuccess = true;
    let prevOp = null;
    for (const { cmd: segRaw, op } of conditionals) {
      if (!segRaw) { prevOp = op; continue; }
      // Check conditional logic based on PREVIOUS operator
      if (prevOp === '&&' && !lastSuccess) { prevOp = op; continue; }
      if (prevOp === '||' && lastSuccess) { prevOp = op; continue; }

      // Check kernel panic before each segment
      if (ctx.state.sim?.processes?.kernelPanic && !segRaw.toLowerCase().includes('reboot')) {
        ctx.term.addLine('[KERNEL PANIC] System unstable — type "reboot" to recover', 'danger-text');
        prevOp = op;
        lastSuccess = false;
        continue;
      }

      // Expand variables PER SEGMENT (left-to-right, like real bash)
      const segExpanded = expandVariables(segRaw, ctx.state);
      const segSubstituted = await expandCommandSubstitution(segExpanded, ctx);
      const segGlobbed = expandGlobs(segSubstituted, ctx.state);

      // Check for redirections, then pipes
      const { cmd: segClean, redirect } = extractRedirection(segGlobbed);
      const segCtx = { ...ctx, rawCmd: segClean };
      if (redirect && redirect.type !== 'suppress_errors') {
        await executeWithRedirection(segClean, redirect, ctx);
        lastSuccess = true;
      } else if (hasPipe(segClean)) {
        await executePipeline(segClean, segCtx);
        lastSuccess = true;
      } else {
        lastSuccess = await executeSingleCommand(segClean, segCtx);
      }
      // Update $? so subsequent segments can read the exit status
      if (ctx.state.sim) {
        if (!ctx.state.sim.env) ctx.state.sim.env = {};
        ctx.state.sim.env['?'] = lastSuccess ? '0' : '1';
      }
      prevOp = op;
    }
    if (ctx.state.sim) saveSimState(ctx.state.sim);
    return;
  }

  // Single command — expand variables, substitution, globs
  const singleExpanded = expandVariables(conditionals[0]?.cmd || aliased, ctx.state);
  const singleSubstituted = await expandCommandSubstitution(singleExpanded, ctx);
  const singleGlobbed = expandGlobs(singleSubstituted, ctx.state);
  const singleRaw = singleGlobbed;
  const { cmd: cleanCmd, redirect } = extractRedirection(singleRaw);

  if (redirect && redirect.type !== 'suppress_errors') {
    await executeWithRedirection(cleanCmd, redirect, ctx);
  } else if (hasPipe(cleanCmd)) {
    await executePipeline(cleanCmd, { ...ctx, rawCmd: cleanCmd });
  } else {
    await executeSingleCommand(cleanCmd, { ...ctx, rawCmd: cleanCmd });
  }
  if (ctx.state.sim) saveSimState(ctx.state.sim);
}

// Extract the core command matching logic into reusable function
// Returns true if command was found and executed successfully, false otherwise
async function executeSingleCommand(rawCmd, ctx) {
  const cmd = rawCmd.toLowerCase(); // lowercase only for matching
  for (const command of COMMANDS) {
    let matched = false;
    if (typeof command.match === 'string') matched = cmd === command.match;
    else if (Array.isArray(command.match)) matched = command.match.includes(cmd);
    else if (typeof command.match === 'function') matched = command.match(cmd);
    if (matched) {
      try {
        // Pass cmd (lowercased) for handler matching compat, rawCmd in ctx for output
        await command.handler(cmd, { ...ctx, rawCmd });
        return true; // command found and executed
      } catch (e) {
        ctx.term.addLine(`Error: ${e.message || 'command failed'}`, 'danger-text');
        return false; // command found but errored
      }
    }
  }
  ctx.term.addLine(`-bash: ${rawCmd}: command not found`, 'about-text');
  ctx.term.addLine('Type "help" for available commands.', 'about-access');
  return false; // command not found
}

// Capture term that buffers output instead of writing to DOM
function createCaptureTerm(realTerm) {
  const buffer = [];
  return {
    addLine: (text, cls) => { buffer.push(String(text)); return { remove: () => {}, classList: { add: () => {}, remove: () => {} }, style: {}, textContent: '', innerHTML: '', dataset: {} }; },
    typeLine: async (text, cls) => { buffer.push(String(text)); },
    linesContainer: realTerm.linesContainer,
    _scrollToBottom: () => {},
    _escapeHtml: realTerm._escapeHtml,
    clear: () => { buffer.length = 0; },
    _buffer: buffer,
  };
}

// Execute a pipeline of commands connected by |
async function executePipeline(rawCmd, ctx) {
  // Track command count once for the whole pipeline
  if (ctx.state.sim) {
    ctx.state.sim.commandCount++;
    if (ctx.state.sim.commandCount >= 20 && window._unlockAchievement) window._unlockAchievement('about_explorer');
  }

  // Kernel panic prefix
  if (ctx.state.sim?.processes?.kernelPanic) {
    ctx.term.addLine('[KERNEL PANIC] System unstable — type "reboot" to recover', 'danger-text');
  }

  const segments = splitPipes(rawCmd);
  let stdin = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i].trim();
    if (!segment) continue; // skip empty pipe segments
    const isLast = i === segments.length - 1;

    // For intermediate commands: capture output; for last command: write to real terminal
    const term = isLast ? ctx.term : createCaptureTerm(ctx.term);
    const pipeCtx = { ...ctx, term, stdin, rawCmd: segment };

    // Find and execute the matching command
    await executeSingleCommand(segment, pipeCtx);

    // Pass captured output as stdin to next command (add trailing newline like real shell)
    if (!isLast) {
      const joined = term._buffer.join('\n');
      stdin = joined.length > 0 ? joined + '\n' : joined;
    }
  }

  // Save state once after full pipeline
  if (ctx.state.sim) saveSimState(ctx.state.sim);
}
