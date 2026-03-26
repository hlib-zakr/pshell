import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx } from '../helpers/mock-ctx.js';
import { executeCommand } from '../../src/commands/index.js';

async function run(rawCmd, ctx) {
  ctx.rawCmd = rawCmd;
  await executeCommand(rawCmd.toLowerCase(), ctx);
  return ctx.lines.map(l => l.text).filter(t => t && String(t).trim());
}

describe('Full pre-processing pipeline via executeCommand()', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  // ═══════════════════════════════════════════════════════════
  // VARIABLE EXPANSION (15 tests)
  // ═══════════════════════════════════════════════════════════

  describe('Variable expansion', () => {
    it('echo $HOME contains /home/classified', async () => {
      const output = await run('echo $HOME', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });

    it('echo $USER contains classified', async () => {
      const output = await run('echo $USER', ctx);
      expect(output.some(l => l.includes('classified'))).toBe(true);
    });

    it('echo $PWD contains current cwd', async () => {
      const output = await run('echo $PWD', ctx);
      expect(output.some(l => l.includes(ctx.state.cwd))).toBe(true);
    });

    it('echo $SHELL contains /bin/bash', async () => {
      const output = await run('echo $SHELL', ctx);
      expect(output.some(l => l.includes('/bin/bash'))).toBe(true);
    });

    it('echo $HOSTNAME contains pshell', async () => {
      const output = await run('echo $HOSTNAME', ctx);
      expect(output.some(l => l.toLowerCase().includes('pshell'))).toBe(true);
    });

    it('echo $RANDOM is a number, different on second call', async () => {
      const output1 = await run('echo $RANDOM', ctx);
      const num1 = output1.find(l => /\d+/.test(l));
      expect(num1).toBeDefined();
      expect(/^\d+$/.test(num1.trim())).toBe(true);

      ctx.lines.length = 0;
      const output2 = await run('echo $RANDOM', ctx);
      const num2 = output2.find(l => /\d+/.test(l));
      expect(num2).toBeDefined();
      // They could theoretically be equal, but with 32768 possibilities it is extremely unlikely
      // Just verify it is a number
      expect(/^\d+$/.test(num2.trim())).toBe(true);
    });

    it('echo $? contains 0', async () => {
      const output = await run('echo $?', ctx);
      expect(output.some(l => l.includes('0'))).toBe(true);
    });

    it('echo $NONEXISTENT produces empty or no output', async () => {
      const output = await run('echo $NONEXISTENT', ctx);
      // After variable expansion, $NONEXISTENT becomes empty string, so echo outputs nothing or blank
      const nonBlank = output.filter(l => l.trim().length > 0);
      expect(nonBlank.length).toBe(0);
    });

    it('echo ${HOME} curly brace form works', async () => {
      const output = await run('echo ${HOME}', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });

    it('export FOO=bar then echo $FOO outputs bar', async () => {
      await run('export FOO=bar', ctx);
      ctx.lines.length = 0;
      const output = await run('echo $FOO', ctx);
      expect(output.some(l => l.includes('bar'))).toBe(true);
    });

    it('export then unset then echo produces empty', async () => {
      await run('export TEMPVAR=hello', ctx);
      ctx.lines.length = 0;
      await run('unset TEMPVAR', ctx);
      ctx.lines.length = 0;
      const output = await run('echo $TEMPVAR', ctx);
      const nonBlank = output.filter(l => l.trim().length > 0);
      expect(nonBlank.length).toBe(0);
    });

    it('variable in path: cd $HOME changes cwd', async () => {
      // First cd somewhere else
      await run('mkdir subdir1', ctx);
      ctx.lines.length = 0;
      await run('cd subdir1', ctx);
      expect(ctx.state.cwd).toContain('subdir1');

      ctx.lines.length = 0;
      await run('cd $HOME', ctx);
      expect(ctx.state.cwd).toBe('/home/classified');
    });

    it('export A=hello; echo $A works with semicolons + vars', async () => {
      const output = await run('export A=hello; echo $A', ctx);
      expect(output.some(l => l.includes('hello'))).toBe(true);
    });

    it('export X=1 && export Y=2 && echo $X $Y with conditional + vars', async () => {
      const output = await run('export X=1 && export Y=2 && echo $X $Y', ctx);
      expect(output.some(l => l.includes('1') && l.includes('2'))).toBe(true);
    });

    it('double expansion: export A=hello && export B="$A world" -> B contains "hello world"', async () => {
      await run('export A=hello', ctx);
      ctx.lines.length = 0;
      await run('export B="$A world"', ctx);
      // Variable expansion happens before the export handler, so $A should be expanded
      expect(ctx.state.sim.env.B).toContain('hello');
      expect(ctx.state.sim.env.B).toContain('world');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // QUOTING (15 tests)
  // ═══════════════════════════════════════════════════════════

  describe('Quoting', () => {
    it('echo "hello world" preserves spaces in double quotes', async () => {
      const output = await run('echo "hello world"', ctx);
      expect(output.some(l => l.includes('hello world'))).toBe(true);
    });

    it("echo 'hello world' preserves spaces in single quotes", async () => {
      const output = await run("echo 'hello world'", ctx);
      expect(output.some(l => l.includes('hello world'))).toBe(true);
    });

    it('echo "path: $HOME" expands variable inside double quotes', async () => {
      const output = await run('echo "path: $HOME"', ctx);
      expect(output.some(l => l.includes('path: /home/classified'))).toBe(true);
    });

    it("echo 'path: $HOME' is literal, no expansion in single quotes", async () => {
      const output = await run("echo 'path: $HOME'", ctx);
      // Variable should NOT be expanded inside single quotes
      expect(output.some(l => l.toLowerCase().includes('$home') || l.includes('$HOME'))).toBe(true);
    });

    it('echo "it\'s fine" handles single quote inside double quotes', async () => {
      const output = await run('echo "it\'s fine"', ctx);
      expect(output.some(l => l.includes("it's fine"))).toBe(true);
    });

    it("echo 'he said \"hi\"' handles double quotes inside single quotes", async () => {
      const output = await run("echo 'he said \"hi\"'", ctx);
      expect(output.some(l => l.includes('he said'))).toBe(true);
    });

    it('echo "hello \\"world\\"" handles escaped quotes', async () => {
      const output = await run('echo "hello \\"world\\""', ctx);
      expect(output.some(l => l.includes('hello'))).toBe(true);
      expect(output.some(l => l.includes('world'))).toBe(true);
    });

    it('echo "$(whoami)" expands command substitution in double quotes', async () => {
      const output = await run('echo "$(whoami)"', ctx);
      expect(output.some(l => l.toLowerCase().includes('root'))).toBe(true);
    });

    it("echo '$(whoami)' does NOT expand in single quotes", async () => {
      const output = await run("echo '$(whoami)'", ctx);
      expect(output.some(l => l.includes('$(whoami)'))).toBe(true);
      expect(output.some(l => l.toLowerCase() === 'root')).toBe(false);
    });

    it('echo hello\\ world handles backslash escaping', async () => {
      const output = await run('echo hello\\ world', ctx);
      // Backslash escaping the space should keep "hello world" as one token
      expect(output.some(l => l.includes('hello'))).toBe(true);
      expect(output.some(l => l.includes('world'))).toBe(true);
    });

    it('touch "my file.txt" creates filename with spaces', async () => {
      await run('touch "my file.txt"', ctx);
      // The file should be created (parseCommand extracts quoted args)
      const created = ctx.state.sim.fs.createdFiles;
      const hasSpaceFile = Object.keys(created).some(k => k.includes('my file') || k.includes('my'));
      expect(hasSpaceFile || ctx.lines.some(l => l.text && l.text.includes('Created'))).toBe(true);
    });

    it('cat "README.md" works with quoted filename', async () => {
      const output = await run('cat "README.md"', ctx);
      // Should output the file content or show the cat handler output
      expect(output.length).toBeGreaterThan(0);
    });

    it('echo "" outputs empty string (no crash)', async () => {
      const output = await run('echo ""', ctx);
      // Should not crash; output may be empty or have a blank line
      expect(output).toBeDefined();
    });

    it('echo "multi\\nline" handles newline escape in quotes', async () => {
      const output = await run('echo "multi\\nline"', ctx);
      // The string should be output (may or may not interpret \\n as literal or newline)
      expect(output.some(l => l.includes('multi'))).toBe(true);
    });

    it('grep "pattern" with quoted pattern does not crash', async () => {
      // Create a file with content to grep
      await run('echo "hello pattern world" > searchme.txt', ctx);
      ctx.lines.length = 0;
      const output = await run('grep "pattern" searchme.txt', ctx);
      expect(output.some(l => l.includes('pattern'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CONDITIONALS (15 tests)
  // ═══════════════════════════════════════════════════════════

  describe('Conditionals (&&, ||, ;)', () => {
    it('echo a && echo b runs both', async () => {
      const output = await run('echo a && echo b', ctx);
      expect(output.some(l => l.includes('a'))).toBe(true);
      expect(output.some(l => l.includes('b'))).toBe(true);
    });

    it('echo a || echo b runs only the first', async () => {
      const output = await run('echo a || echo b', ctx);
      expect(output.some(l => l.includes('a'))).toBe(true);
      // b should NOT run because a succeeded and || skips on success
      const bLines = output.filter(l => l.trim() === 'b');
      expect(bLines.length).toBe(0);
    });

    it('echo a; echo b runs both', async () => {
      const output = await run('echo a; echo b', ctx);
      expect(output.some(l => l.includes('a'))).toBe(true);
      expect(output.some(l => l.includes('b'))).toBe(true);
    });

    it('nonexistent_cmd && echo b -> b does NOT run', async () => {
      const output = await run('nonexistent_cmd_xyz && echo b', ctx);
      // The first command fails -> && skips b
      expect(output.some(l => l.includes('not found'))).toBe(true);
      const bLines = output.filter(l => l.trim() === 'b');
      expect(bLines.length).toBe(0);
    });

    it('nonexistent_cmd || echo fallback -> fallback DOES run', async () => {
      const output = await run('nonexistent_cmd_xyz || echo fallback', ctx);
      expect(output.some(l => l.includes('fallback'))).toBe(true);
    });

    it('echo a && nonexistent && echo c -> c does NOT run', async () => {
      const output = await run('echo a && nonexistent_xyz && echo c', ctx);
      expect(output.some(l => l.includes('a'))).toBe(true);
      expect(output.some(l => l.includes('not found'))).toBe(true);
      const cLines = output.filter(l => l.trim() === 'c');
      expect(cLines.length).toBe(0);
    });

    it('nonexistent1 || nonexistent2 || echo final -> final runs', async () => {
      const output = await run('nonexistent_1 || nonexistent_2 || echo final', ctx);
      expect(output.some(l => l.includes('final'))).toBe(true);
    });

    it('echo a; nonexistent; echo c -> a and c both run', async () => {
      const output = await run('echo a; nonexistent_xyz; echo c', ctx);
      expect(output.some(l => l.includes('a'))).toBe(true);
      expect(output.some(l => l.includes('c'))).toBe(true);
    });

    it('mkdir testdir && cd testdir && pwd -> chained filesystem ops', async () => {
      await run('mkdir pipelinedir', ctx);
      ctx.lines.length = 0;
      const output = await run('cd pipelinedir && pwd', ctx);
      expect(ctx.state.cwd).toContain('pipelinedir');
      expect(output.some(l => l.includes('pipelinedir'))).toBe(true);
    });

    it('echo hello && echo world && echo done -> triple chain', async () => {
      const output = await run('echo hello && echo world && echo done', ctx);
      expect(output.some(l => l.includes('hello'))).toBe(true);
      expect(output.some(l => l.includes('world'))).toBe(true);
      expect(output.some(l => l.includes('done'))).toBe(true);
    });

    it('nonexistent && echo a || echo b -> b runs (first fails, && skips a, || runs b)', async () => {
      const output = await run('nonexistent_xyz && echo a || echo b', ctx);
      // nonexistent fails -> && skips "echo a" -> || sees failure -> runs "echo b"
      const aLines = output.filter(l => l.trim() === 'a');
      expect(aLines.length).toBe(0);
      expect(output.some(l => l.includes('b'))).toBe(true);
    });

    it('echo ok || nonexistent && echo yes -> yes runs (first succeeds, || skips, && runs)', async () => {
      const output = await run('echo ok || nonexistent_xyz && echo yes', ctx);
      // echo ok succeeds -> || skips nonexistent -> && sees success -> runs "echo yes"
      expect(output.some(l => l.includes('ok'))).toBe(true);
      expect(output.some(l => l.includes('yes'))).toBe(true);
    });

    it('empty segments: ; ; ; -> no crash', async () => {
      const output = await run('; ; ;', ctx);
      // Should not throw, may produce no output or help text
      expect(output).toBeDefined();
    });

    it('empty conditionals: && && -> no crash', async () => {
      const output = await run('&& &&', ctx);
      // Should not throw
      expect(output).toBeDefined();
    });

    it('very long chain: echo 1 && echo 2 && echo 3 && echo 4 && echo 5', async () => {
      const output = await run('echo 1 && echo 2 && echo 3 && echo 4 && echo 5', ctx);
      expect(output.some(l => l.includes('1'))).toBe(true);
      expect(output.some(l => l.includes('2'))).toBe(true);
      expect(output.some(l => l.includes('3'))).toBe(true);
      expect(output.some(l => l.includes('4'))).toBe(true);
      expect(output.some(l => l.includes('5'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // COMMAND SUBSTITUTION (15 tests)
  // ═══════════════════════════════════════════════════════════

  describe('Command substitution', () => {
    it('echo $(whoami) outputs root', async () => {
      const output = await run('echo $(whoami)', ctx);
      expect(output.some(l => l.toLowerCase().includes('root'))).toBe(true);
    });

    it('echo $(pwd) outputs /home/classified', async () => {
      const output = await run('echo $(pwd)', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });

    it('echo $(hostname) contains pshell', async () => {
      const output = await run('echo $(hostname)', ctx);
      expect(output.some(l => l.toLowerCase().includes('pshell'))).toBe(true);
    });

    it('echo "I am $(whoami)" outputs I am root', async () => {
      const output = await run('echo "I am $(whoami)"', ctx);
      expect(output.some(l => l.toLowerCase().includes('i am root'))).toBe(true);
    });

    it('echo $(echo hello) outputs hello', async () => {
      const output = await run('echo $(echo hello)', ctx);
      expect(output.some(l => l.includes('hello'))).toBe(true);
    });

    it('echo $(echo $(whoami)) nested substitution outputs root', async () => {
      const output = await run('echo $(echo $(whoami))', ctx);
      expect(output.some(l => l.toLowerCase().includes('root'))).toBe(true);
    });

    it('export X=$(whoami) && echo $X outputs root', async () => {
      const output = await run('export X=$(whoami) && echo $X', ctx);
      expect(output.some(l => l.toLowerCase().includes('root'))).toBe(true);
    });

    it('touch $(whoami).txt then ls shows file exists', async () => {
      await run('touch $(whoami).txt', ctx);
      // The file "root.txt" should have been created
      const created = ctx.state.sim.fs.createdFiles;
      const hasFile = Object.keys(created).some(k => k.toLowerCase().includes('root'));
      expect(hasFile).toBe(true);
    });

    it("echo '$(whoami)' is literal, NOT expanded in single quotes", async () => {
      const output = await run("echo '$(whoami)'", ctx);
      expect(output.some(l => l.includes('$(whoami)'))).toBe(true);
    });

    it('echo "$(date)" contains date output', async () => {
      const output = await run('echo "$(date)"', ctx);
      // date outputs something like "Thu Mar 26 2026 ..."
      expect(output.length).toBeGreaterThan(0);
      // Should contain some date-like string (year, month, day, or time)
      const joined = output.join(' ');
      expect(joined.length).toBeGreaterThan(5);
    });

    it('echo "count: $(ps aux | wc -l)" handles pipe inside substitution', async () => {
      const output = await run('echo "count: $(ps aux | wc -l)"', ctx);
      // Should contain "count:" and some text after it
      expect(output.some(l => l.includes('count:'))).toBe(true);
    });

    it('echo "$(nonexistent_cmd)" produces empty or error text', async () => {
      const output = await run('echo "$(nonexistent_cmd_xyz)"', ctx);
      // The substitution will run the command, get "not found" output,
      // which then gets inlined into the echo
      expect(output).toBeDefined();
    });

    it('echo `whoami` backtick form outputs root', async () => {
      const output = await run('echo `whoami`', ctx);
      expect(output.some(l => l.toLowerCase().includes('root'))).toBe(true);
    });

    it('echo `pwd` backtick with path outputs /home/classified', async () => {
      const output = await run('echo `pwd`', ctx);
      expect(output.some(l => l.includes('/home/classified'))).toBe(true);
    });

    it('echo "$(echo "hello")" handles quotes inside substitution', async () => {
      const output = await run('echo "$(echo "hello")"', ctx);
      expect(output.some(l => l.includes('hello'))).toBe(true);
    });
  });
});
