// Shared argument parser for CLI commands
// Handles quoted strings, flags, and arguments

// Split input respecting quotes — "hello world" stays as one token
function splitRespectingQuotes(input) {
  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\' && !inSingle && i + 1 < input.length) {
      current += input[++i];
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue; // strip quote from token
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue; // strip quote from token
    }
    if (ch === ' ' && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = ''; }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

export function parseCommand(rawCmd) {
  const parts = splitRespectingQuotes(rawCmd);
  const command = parts[0] || '';
  const flags = {};
  const args = [];

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('--')) {
      const eq = p.indexOf('=');
      if (eq !== -1) {
        flags[p.slice(2, eq)] = p.slice(eq + 1);
      } else {
        flags[p.slice(2)] = true;
      }
    } else if (p.startsWith('-') && p.length > 1 && !/^\d/.test(p.slice(1))) {
      for (const ch of p.slice(1)) flags[ch] = true;
    } else {
      args.push(p);
    }
  }

  return { command, flags, args, parts, raw: rawCmd };
}
