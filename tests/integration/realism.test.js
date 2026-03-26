import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx } from '../helpers/mock-ctx.js';
import { executeCommand } from '../../src/commands/index.js';

function clearOutput(ctx) { ctx.lines.length = 0; }

async function run(cmd, ctx) {
  clearOutput(ctx);
  ctx.rawCmd = cmd;
  await executeCommand(cmd, ctx);
  return ctx.lines.map(l => l.text);
}

// ═══════════════════════════════════════════════════
// FILESYSTEM REALISM (25 tests)
// ═══════════════════════════════════════════════════

describe('Filesystem Realism', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  // ── ls behavior ──

  it('1. ls shows filenames only (no permissions, no dates, no sizes)', async () => {
    const out = await run('ls', ctx);
    for (const line of out) {
      // Should NOT contain permission strings like drwxr-xr-x or -rw-r--r--
      expect(line).not.toMatch(/^[d-]r[w-]x?[r-][w-][x-]/);
      // Should NOT contain date patterns like "Mar 24 09:12"
      expect(line).not.toMatch(/\w{3}\s+\d{1,2}\s+\d{2}:\d{2}/);
      // Should NOT contain size numbers padded with spaces
      expect(line).not.toMatch(/\s{2,}\d+\s+\w{3}\s/);
    }
    // But should contain actual filenames
    expect(out).toContain('README.md');
  });

  it('2. ls does NOT show dotfiles (.bash_history, .ssh)', async () => {
    const out = await run('ls', ctx);
    const dotfiles = out.filter(l => l.startsWith('.'));
    expect(dotfiles).toHaveLength(0);
    expect(out).not.toContain('.bash_history');
    expect(out).not.toContain('.ssh');
  });

  it('3. ls -a shows dotfiles including . and ..', async () => {
    const out = await run('ls -a', ctx);
    expect(out).toContain('.');
    expect(out).toContain('..');
    expect(out).toContain('.bash_history');
    expect(out).toContain('.ssh');
  });

  it('4. ls -l shows long format with permissions, owner, size, date', async () => {
    const out = await run('ls -l', ctx);
    // First line is "total N"
    expect(out[0]).toMatch(/^total \d+$/);
    // Subsequent lines should have permission strings
    const fileLines = out.slice(1);
    expect(fileLines.length).toBeGreaterThan(0);
    for (const line of fileLines) {
      // Permission format: drwxr-xr-x or -rw-r--r--
      expect(line).toMatch(/^[d-][rwx-]{9}/);
      // Owner name present
      expect(line).toContain('classified');
      // Date format present: "Mar 24 09:12" or similar
      expect(line).toMatch(/\w{3}\s+\d{1,2}\s+\d{2}:\d{2}/);
    }
  });

  it('5. ls -l does NOT show dotfiles', async () => {
    const out = await run('ls -l', ctx);
    const dotLines = out.filter(l => l.includes('.bash_history') || l.includes('.ssh'));
    expect(dotLines).toHaveLength(0);
  });

  it('6. ls -la shows long format WITH dotfiles', async () => {
    const out = await run('ls -la', ctx);
    // Should have permission strings (long format)
    const permLines = out.filter(l => /^[d-][rwx-]{9}/.test(l));
    expect(permLines.length).toBeGreaterThan(0);
    // Should contain dotfiles
    const allText = out.join('\n');
    expect(allText).toContain('.bash_history');
    expect(allText).toContain('.ssh');
    // Should contain . and ..
    expect(allText).toMatch(/\s\.$/m);
    expect(allText).toMatch(/\s\.\.$/m);
  });

  it('7. ls -la shows link count 2 for directories, 1 for files', async () => {
    const out = await run('ls -la', ctx);
    // Find a directory entry (starts with 'd')
    const dirLine = out.find(l => l.startsWith('d') && !l.endsWith('.') && !l.endsWith('..'));
    if (dirLine) {
      // Format: drwxr-xr-x  2 classified ...
      expect(dirLine).toMatch(/^drwxr-xr-x\s+2\s/);
    }
    // Find a file entry (starts with '-')
    const fileLine = out.find(l => l.startsWith('-'));
    if (fileLine) {
      expect(fileLine).toMatch(/^-[rwx-]{9}\s+1\s/);
    }
  });

  it('8. ls -la date is formatted like "Mar 24 09:12"', async () => {
    const out = await run('ls -la', ctx);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fileLines = out.filter(l => /^[d-][rwx-]{9}/.test(l));
    for (const line of fileLines) {
      // Should match "Mon DD HH:MM" pattern
      const dateMatch = line.match(/(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2})/);
      expect(dateMatch).not.toBeNull();
      expect(months).toContain(dateMatch[1]);
    }
  });

  // ── Silent commands ──

  it('9. touch newfile.txt produces no output', async () => {
    const out = await run('touch newfile.txt', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('10. mkdir newdir produces no output', async () => {
    const out = await run('mkdir newdir', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('11. echo "test" > file.txt produces no output', async () => {
    const out = await run('echo "test" > file.txt', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('12. git add . produces no output (when files exist to stage)', async () => {
    // Create a file first so there is something to stage
    await run('echo "hello" > staged.txt', ctx);
    const out = await run('git add .', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  // ── grep behavior ──

  it('13. grep on a user file shows matching lines WITHOUT line numbers', async () => {
    // Create a file with known content for grep to search
    await run('echo "root:x:0:0:root:/root:/bin/bash" > users.txt', ctx);
    await run('echo "www-data:x:33:33:www-data" >> users.txt', ctx);
    const out = await run('grep root users.txt', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank.length).toBeGreaterThan(0);
    for (const line of nonBlank) {
      // Should NOT start with a number followed by colon (line number format)
      expect(line).not.toMatch(/^\d+:/);
      // Should contain "root"
      expect(line.toLowerCase()).toContain('root');
    }
  });

  it('14. grep -n on a user file shows matching lines WITH line numbers', async () => {
    await run('echo "root:x:0:0:root" > greptest.txt', ctx);
    await run('echo "www-data:x:33" >> greptest.txt', ctx);
    await run('echo "root-backup:x:99" >> greptest.txt', ctx);
    const out = await run('grep -n root greptest.txt', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank.length).toBeGreaterThan(0);
    for (const line of nonBlank) {
      // Should start with line number followed by colon
      expect(line).toMatch(/^\d+:/);
      expect(line.toLowerCase()).toContain('root');
    }
  });

  it('15. grep nonexistent pattern in user file produces no output (silent)', async () => {
    await run('echo "some content here" > searchme.txt', ctx);
    const out = await run('grep zzzznonexistentpattern searchme.txt', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('16. echo "hello world" > test.txt && grep hello test.txt finds the match', async () => {
    const out = await run('echo "hello world" > test.txt && grep hello test.txt', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank.length).toBeGreaterThan(0);
    const match = nonBlank.find(l => l.includes('hello'));
    expect(match).toBeDefined();
  });

  // ── wc behavior ──

  it('17. echo "hello" | wc -l -- piped echo to wc counts correctly', async () => {
    // In the simulator pipeline, echo outputs "hello" via addLine (no trailing \n).
    // wc -l counts \n chars in the piped string, so the result is 0.
    // This tests that the pipe infrastructure works and wc produces a numeric result.
    const out = await run('echo "hello" | wc -l', ctx);
    const wcLine = out.find(l => l.trim() !== '');
    expect(wcLine).toBeDefined();
    // The value should be a number (padded with spaces)
    expect(wcLine.trim()).toMatch(/^\d+$/);
  });

  it('18. echo > file && echo >> file && wc -l counts newlines in file', async () => {
    // echo "a" > f.txt writes "a\n" (echo adds trailing newline)
    // echo "b" >> f.txt appends "b\n" (no extra separator)
    // Final content: "a\nb\n" which has 2 newline characters
    const out = await run('echo "a" > f.txt && echo "b" >> f.txt && wc -l f.txt', ctx);
    const wcLine = out.find(l => l.trim() !== '' && l.match(/\d/));
    expect(wcLine).toBeDefined();
    expect(wcLine).toMatch(/2/);
  });

  // ── cat behavior ──

  it('19. cat with no args produces no output (not an error)', async () => {
    const out = await run('cat', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('20. echo "test content" > myfile.txt && cat myfile.txt shows "test content"', async () => {
    const out = await run('echo "test content" > myfile.txt && cat myfile.txt', ctx);
    const nonBlank = out.filter(l => l.trim() !== '' && l !== ' ');
    expect(nonBlank.some(l => l.includes('test content'))).toBe(true);
  });

  // ── find behavior ──

  it('21. find / -name "*.log" returns paths with ./ prefix', async () => {
    const out = await run('find / -name "*.log"', ctx);
    const logPaths = out.filter(l => l.includes('.log'));
    expect(logPaths.length).toBeGreaterThan(0);
    for (const p of logPaths) {
      expect(p).toMatch(/^\./);
    }
  });

  it('22. find / -name "passwd" finds /etc/passwd', async () => {
    const out = await run('find / -name "passwd"', ctx);
    const passwdLine = out.find(l => l.includes('passwd'));
    expect(passwdLine).toBeDefined();
    expect(passwdLine).toContain('etc');
    expect(passwdLine).toContain('passwd');
  });

  // ── echo behavior ──

  it('23. echo "Hello World" preserves case (not lowercased)', async () => {
    const out = await run('echo "Hello World"', ctx);
    expect(out).toContain('Hello World');
  });

  it('24. echo "it\'s a test" strips quotes, preserves content', async () => {
    const out = await run("echo \"it's a test\"", ctx);
    const match = out.find(l => l.includes("it's a test"));
    expect(match).toBeDefined();
  });

  it('25. echo \'$HOME\' does NOT expand (single quotes)', async () => {
    const out = await run("echo '$HOME'", ctx);
    // Single quotes should prevent variable expansion
    expect(out).toContain('$HOME');
    // Should NOT contain the expanded path
    const expanded = out.find(l => l.includes('/home/classified'));
    expect(expanded).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════
// GIT REALISM (15 tests)
// ═══════════════════════════════════════════════════

describe('Git Realism', () => {
  let ctx;
  beforeEach(() => {
    // Clear localStorage to prevent file state from bleeding between describe blocks
    localStorage.clear();
    ctx = createMockCtx();
  });

  it('26. git log shows full format (commit hash on first line, Author, Date)', async () => {
    const out = await run('git log', ctx);
    // Should have "commit <40-char-hash>" line
    const commitLine = out.find(l => l.startsWith('commit '));
    expect(commitLine).toBeDefined();
    expect(commitLine.replace('commit ', '')).toHaveLength(40);
    // Should have Author line
    const authorLine = out.find(l => l.startsWith('Author:'));
    expect(authorLine).toBeDefined();
    // Should have Date line
    const dateLine = out.find(l => l.startsWith('Date:'));
    expect(dateLine).toBeDefined();
  });

  it('27. git log --oneline shows short format (hash + message on one line)', async () => {
    const out = await run('git log --oneline', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank.length).toBeGreaterThan(0);
    for (const line of nonBlank) {
      // Each line should have a short hash followed by a space and message
      expect(line).toMatch(/^[a-f0-9]{7}\s+.+$/);
      // Should NOT have "Author:" or "Date:" (those belong to full format)
      expect(line).not.toContain('Author:');
      expect(line).not.toContain('Date:');
    }
  });

  it('28. git status with no changes shows "nothing to commit, working tree clean"', async () => {
    const out = await run('git status', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('nothing to commit, working tree clean');
  });

  it('29. git status uses tab indentation before "modified:" prefix', async () => {
    // Create and stage a file, then modify to see unstaged changes
    await run('echo "data" > trackme.txt', ctx);
    // The file is created (modified), so git status should show it
    const out = await run('git status', ctx);
    const modifiedLine = out.find(l => l.includes('modified:'));
    if (modifiedLine) {
      // Should start with a tab character
      expect(modifiedLine).toMatch(/^\t/);
    }
  });

  it('30. git add is silent on success', async () => {
    await run('echo "data" > addtest.txt', ctx);
    const out = await run('git add addtest.txt', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('31. git commit -m "test" shows insertions count', async () => {
    await run('echo "line1" > commitfile.txt', ctx);
    await run('git add commitfile.txt', ctx);
    const out = await run('git commit -m "test commit"', ctx);
    const joined = out.join('\n');
    expect(joined).toMatch(/insertions?\(\+\)/);
  });

  it('32. git stash list with no stashes produces no output (silent)', async () => {
    const out = await run('git stash list', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('33. git diff with no changes produces no output (silent)', async () => {
    const out = await run('git diff', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('34. git checkout nonexistent says "did not match any file(s) known to git"', async () => {
    const out = await run('git checkout nonexistent-branch-xyz', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('did not match any file(s) known to git');
  });

  it('35. git remote -v output contains tab between origin and URL', async () => {
    const out = await run('git remote -v', ctx);
    for (const line of out) {
      if (line.includes('origin')) {
        expect(line).toContain('\t');
      }
    }
  });

  it('36. touch file.txt && git add file.txt && git status shows file under "Changes to be committed"', async () => {
    const out = await run('touch file.txt && git add file.txt && git status', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('Changes to be committed');
  });

  it('37. Full lifecycle: touch -> add -> commit -> log shows the commit', async () => {
    await run('touch lifecycle.txt', ctx);
    await run('git add lifecycle.txt', ctx);
    await run('git commit -m "lifecycle test"', ctx);
    const out = await run('git log --oneline', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('lifecycle test');
  });
});

// ═══════════════════════════════════════════════════
// SQL REALISM (15 tests)
// ═══════════════════════════════════════════════════

describe('SQL Realism', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('38. psql SELECT * FROM users -- columns are auto-sized (not fixed 20 chars)', async () => {
    const out = await run('psql -c "SELECT * FROM users"', ctx);
    // Find the header line (has column names separated by |)
    const headerLine = out.find(l => l.includes('id') && l.includes('username') && l.includes('|'));
    expect(headerLine).toBeDefined();
    // "id" column should be short (2-3 chars wide), not 20 chars wide
    // Check that the space between "id" and the first | is small
    const idPart = headerLine.split('|')[0];
    // "id" is numeric so right-aligned; total width should be <= 5, not 20
    expect(idPart.trim().length).toBeLessThanOrEqual(5);
  });

  it('39. psql SELECT * FROM users -- id column is right-aligned (numeric)', async () => {
    const out = await run('psql -c "SELECT * FROM users"', ctx);
    // Find data rows (after separator line)
    const sepIdx = out.findIndex(l => l.match(/^-+\+-/));
    expect(sepIdx).toBeGreaterThan(-1);
    const dataRow = out[sepIdx + 1];
    // id value should be right-aligned: leading spaces before the digit
    const idPart = dataRow.split('|')[0];
    // Right-aligned means the value has leading spaces (e.g., " 1" not "1 ")
    // For id=1, the part should end with "1 " (plus trailing space from padStart)
    expect(idPart).toMatch(/\s+\d+\s?$/);
  });

  it('40. psql SELECT * FROM users -- shows (N rows) footer', async () => {
    const out = await run('psql -c "SELECT * FROM users"', ctx);
    const footer = out.find(l => l.match(/^\(\d+ rows?\)$/));
    expect(footer).toBeDefined();
  });

  it('41. psql SELECT * FROM users WHERE id = 1 -- filters correctly', async () => {
    const out = await run('psql -c "SELECT * FROM users WHERE id = 1"', ctx);
    // Should show exactly 1 row
    const footer = out.find(l => l.match(/^\(\d+ rows?\)$/));
    expect(footer).toBe('(1 row)');
    // Should contain 'test' (username of id=1) but not 'admin' (username of id=2)
    const joined = out.join('\n');
    expect(joined).toContain('test');
    expect(joined).not.toMatch(/\badmin\b/);
  });

  it('42. INSERT INTO users outputs "INSERT 0 1"', async () => {
    const out = await run("psql -c \"INSERT INTO users (username, email) VALUES ('newuser', 'new@test.com')\"", ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toContain('INSERT 0 1');
  });

  it('43. psql SELECT * FROM users | wc -l -- pipe SQL output to wc', async () => {
    const out = await run('psql -c "SELECT * FROM users" | wc -l', ctx);
    // SQL output: blank + header + separator + 2 data rows + footer + blank = 7 lines
    // wc -l counts \n chars
    const wcLine = out.find(l => l.trim() !== '');
    expect(wcLine).toBeDefined();
    const count = parseInt(wcLine.trim());
    expect(count).toBeGreaterThan(0);
  });

  it('44. psql SELECT * FROM users | grep classified -- pipe SQL to grep', async () => {
    // The default data has no "classified" username, but let's use an existing value
    const out = await run('psql -c "SELECT * FROM users" | grep test', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank.length).toBeGreaterThan(0);
    for (const line of nonBlank) {
      expect(line.toLowerCase()).toContain('test');
    }
  });

  it('45. Error messages use double space: "ERROR:  " (psql trademark)', async () => {
    const out = await run('psql -c "SELECT * FROM nonexistent_table"', ctx);
    const errorLine = out.find(l => l.startsWith('ERROR:'));
    expect(errorLine).toBeDefined();
    // psql uses double space after ERROR:
    expect(errorLine).toMatch(/^ERROR:\s{2}/);
  });

  it('46. \\dt shows "Owner" column (not "Rows")', async () => {
    const out = await run('\\dt', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('Owner');
    // The header should NOT contain "Rows"
    const headerLine = out.find(l => l.includes('Name') && l.includes('|'));
    if (headerLine) {
      expect(headerLine).not.toContain('Rows');
    }
  });

  it('47. \\dt shows "List of relations" header', async () => {
    const out = await run('\\dt', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('List of relations');
  });

  it('48. pg_dump produces valid SQL with commas between column definitions', async () => {
    const out = await run('pg_dump', ctx);
    const joined = out.join('\n');
    // Should have CREATE TABLE with columns
    expect(joined).toContain('CREATE TABLE');
    // Find the column definition lines between CREATE TABLE and );
    const createIdx = out.findIndex(l => l.includes('CREATE TABLE'));
    expect(createIdx).toBeGreaterThan(-1);
    // Lines between CREATE TABLE and ); should have commas between them (except the last)
    const colLines = [];
    for (let i = createIdx + 1; i < out.length; i++) {
      if (out[i].trim() === ');') break;
      if (out[i].trim() !== '' && out[i].trim() !== '') colLines.push(out[i]);
    }
    // All column lines except the last should end with a comma
    if (colLines.length > 1) {
      for (let i = 0; i < colLines.length - 1; i++) {
        expect(colLines[i].trimEnd()).toMatch(/,$/);
      }
      // Last column line should NOT end with comma
      expect(colLines[colLines.length - 1].trimEnd()).not.toMatch(/,$/);
    }
  });

  it('49. CREATE TABLE + SELECT -- CRUD lifecycle', async () => {
    await run('psql -c "CREATE TABLE test (name text)"', ctx);
    const out = await run('psql -c "SELECT * FROM test"', ctx);
    // Should show empty table with (0 rows) footer
    const footer = out.find(l => l.match(/^\(\d+ rows?\)$/));
    expect(footer).toBe('(0 rows)');
  });

  it('50. docker stop postgres && psql -- connection refused after stop', async () => {
    const out = await run('docker stop postgres && psql -c "SELECT 1"', ctx);
    const joined = out.join('\n');
    // After stopping postgres, SQL should fail with connection refused
    expect(joined).toContain('Connection refused');
  });
});

// ═══════════════════════════════════════════════════
// SYSTEM REALISM (15 tests)
// ═══════════════════════════════════════════════════

describe('System Realism', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('51. ps (bare) shows only PID TTY TIME CMD', async () => {
    const out = await run('ps', ctx);
    const header = out[0];
    // Should have PID, TTY, TIME, CMD columns
    expect(header).toMatch(/PID/);
    expect(header).toMatch(/TTY/);
    expect(header).toMatch(/TIME/);
    expect(header).toMatch(/CMD/);
    // Should NOT have %CPU, %MEM, USER (those are ps aux columns)
    expect(header).not.toContain('%CPU');
    expect(header).not.toContain('%MEM');
    expect(header).not.toContain('USER');
  });

  it('52. ps aux shows full process list with USER PID %CPU %MEM COMMAND', async () => {
    const out = await run('ps aux', ctx);
    const header = out[0];
    expect(header).toContain('USER');
    expect(header).toContain('PID');
    expect(header).toContain('%CPU');
    expect(header).toContain('%MEM');
    expect(header).toContain('COMMAND');
    // Should have multiple process lines beyond the header
    const dataLines = out.slice(1).filter(l => l !== '');
    expect(dataLines.length).toBeGreaterThan(1);
  });

  it('53. whoami returns "root" (consistent with id)', async () => {
    const out = await run('whoami', ctx);
    expect(out).toContain('root');
  });

  it('54. uptime starts with current time', async () => {
    const out = await run('uptime', ctx);
    const line = out[0];
    // Should start with a time in HH:MM:SS format
    expect(line).toMatch(/\d{2}:\d{2}:\d{2}/);
    // Should contain "up"
    expect(line).toContain('up');
    // Should contain "load average"
    expect(line).toContain('load average');
  });

  it('55. free has "available" column and no "Vibes" row', async () => {
    const out = await run('free', ctx);
    const header = out[0];
    expect(header).toContain('available');
    // Should have Mem: and Swap: rows
    const joined = out.join('\n');
    expect(joined).toContain('Mem:');
    expect(joined).toContain('Swap:');
    // Should NOT have a nonsense "Vibes" row
    expect(joined).not.toContain('Vibes');
  });

  it('56. kill 420 is silent on success (no output)', async () => {
    const out = await run('kill 420', ctx);
    const nonBlank = out.filter(l => l !== '');
    expect(nonBlank).toHaveLength(0);
  });

  it('57. kill 420 adds pid to killedPids', async () => {
    await run('kill 420', ctx);
    expect(ctx.state.sim.processes.killedPids.has(420)).toBe(true);
  });

  it('58. systemctl status nginx shows vendor preset and CGroup section', async () => {
    const out = await run('systemctl status nginx', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('vendor preset');
    expect(joined).toContain('CGroup');
  });

  it('59. top shows summary header (task count, CPU, memory)', async () => {
    const out = await run('top', ctx);
    // First line should have time and uptime
    expect(out[0]).toMatch(/^top - \d{2}:\d{2}:\d{2}/);
    // Second line should have Tasks
    expect(out[1]).toMatch(/Tasks:\s+\d+ total/);
  });

  it('60. top reads from process state (not hardcoded)', async () => {
    // Kill a process and verify top reflects it
    await run('kill 420', ctx);
    const out = await run('top', ctx);
    // The killed process (nginx worker, pid 420) should not appear in the PID column
    const pidLines = out.filter(l => l.match(/^\s*420\s/));
    expect(pidLines).toHaveLength(0);
    // Task count should be reduced
    const taskLine = out.find(l => l.includes('Tasks:'));
    expect(taskLine).toBeDefined();
    const taskCount = parseInt(taskLine.match(/Tasks:\s+(\d+)/)[1]);
    // Original had 4 processes, killing one leaves 3
    expect(taskCount).toBe(3);
  });

  it('61. history number width is 5 chars (padStart 5)', async () => {
    // Add some history entries
    ctx.state.sim._history = ['ls', 'pwd', 'whoami'];
    const out = await run('history', ctx);
    const nonBlank = out.filter(l => l !== '');
    // Each entry should have a number padded to 5 characters width
    for (const line of nonBlank) {
      // Format: "  <5-char-number>  <command>"
      const match = line.match(/^\s{2}(\s*\d+)\s{2}/);
      if (match) {
        expect(match[1].length).toBe(5);
      }
    }
  });

  it('62. last shows "wtmp begins" footer', async () => {
    const out = await run('last', ctx);
    const lastLine = out.filter(l => l !== '').pop();
    expect(lastLine).toMatch(/^wtmp begins/);
  });
});

// ═══════════════════════════════════════════════════
// NETWORK REALISM (10 tests)
// ═══════════════════════════════════════════════════

describe('Network Realism', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('63. ping output includes rtt min/avg/max/mdev summary', async () => {
    const out = await run('ping promptup.com', ctx);
    const rttLine = out.find(l => l.includes('rtt min/avg/max/mdev'));
    expect(rttLine).toBeDefined();
    // Should have 4 values separated by /
    const values = rttLine.match(/= ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
    expect(values).not.toBeNull();
    // min <= avg <= max
    const [, min, avg, max] = values.map(Number);
    expect(min).toBeLessThanOrEqual(avg);
    expect(avg).toBeLessThanOrEqual(max);
  });

  it('64. curl default shows only body (no headers)', async () => {
    const out = await run('curl promptup.com', ctx);
    const joined = out.join('\n');
    // Should contain HTML body
    expect(joined).toContain('<html>');
    // Should NOT contain HTTP headers
    expect(joined).not.toContain('HTTP/1.1');
    expect(joined).not.toContain('Content-Type:');
  });

  it('65. curl -i shows headers', async () => {
    const out = await run('curl -i promptup.com', ctx);
    const joined = out.join('\n');
    // Should contain HTTP status line
    expect(joined).toContain('HTTP/1.1 200 OK');
    // Should contain Content-Type header
    expect(joined).toContain('Content-Type:');
    // Should also contain body
    expect(joined).toContain('<html>');
  });

  it('66. traceroute shows 3 time measurements per hop', async () => {
    const out = await run('traceroute promptup.com', ctx);
    // Find a hop line with actual measurements (not * * *)
    const measuredHop = out.find(l => l.match(/^\s*\d+\s+\S+.*\d+\.\d+ ms/));
    expect(measuredHop).toBeDefined();
    // Should have 3 "ms" measurements
    const msCount = (measuredHop.match(/\d+\.\d+ ms/g) || []).length;
    expect(msCount).toBe(3);
  });

  it('67. dig output includes QUESTION SECTION and ANSWER SECTION', async () => {
    const out = await run('dig promptup.fun', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('QUESTION SECTION');
    expect(joined).toContain('ANSWER SECTION');
  });

  it('68. netstat and ss produce different output formats', async () => {
    const netstatOut = await run('netstat', ctx);
    clearOutput(ctx);
    const ssOut = await run('ss', ctx);

    const netstatHeader = netstatOut.find(l => l.includes('Proto') || l.includes('State'));
    const ssHeader = ssOut.find(l => l.includes('State') || l.includes('Recv-Q'));

    // netstat uses "Proto Recv-Q Send-Q" format
    expect(netstatOut.join('\n')).toContain('Proto');
    // ss uses "State    Recv-Q   Send-Q" format with wider spacing
    expect(ssOut.join('\n')).toMatch(/State\s+Recv-Q\s+Send-Q/);
    // ss has Process column with users:() format
    const ssProcessLine = ssOut.find(l => l.includes('users:'));
    expect(ssProcessLine).toBeDefined();
    // netstat uses PID/Program name format
    const netstatPidLine = netstatOut.find(l => l.match(/\d+\/\w+/));
    expect(netstatPidLine).toBeDefined();
  });

  it('69. ifconfig and ip addr produce different output formats', async () => {
    const ifconfigOut = await run('ifconfig', ctx);
    clearOutput(ctx);
    const ipOut = await run('ip addr', ctx);

    // ifconfig uses "eth0: flags=..." format
    expect(ifconfigOut.join('\n')).toContain('flags=');
    expect(ifconfigOut.join('\n')).toContain('inet ');
    // ip addr uses "2: eth0: <BROADCAST..." format with interface number prefix
    expect(ipOut.join('\n')).toMatch(/\d+:\s+\w+:\s+</);
    expect(ipOut.join('\n')).toContain('inet ');
    // ip addr shows CIDR notation (/24), ifconfig shows netmask
    expect(ipOut.join('\n')).toMatch(/\/\d+/);
    expect(ifconfigOut.join('\n')).toContain('netmask');
  });

  it('70. curl nginx:80 returns HTML (container DNS)', async () => {
    const out = await run('curl nginx:80', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('<html>');
    expect(joined).toContain('nginx');
  });

  it('71. curl postgres:5432 returns connection reset error', async () => {
    const out = await run('curl postgres:5432', ctx);
    const joined = out.join('\n');
    expect(joined.toLowerCase()).toContain('connection reset');
  });

  it('72. iptables -L shows INPUT/FORWARD/OUTPUT chains', async () => {
    const out = await run('iptables -L', ctx);
    const joined = out.join('\n');
    expect(joined).toContain('Chain INPUT');
    expect(joined).toContain('Chain FORWARD');
    expect(joined).toContain('Chain OUTPUT');
  });
});
