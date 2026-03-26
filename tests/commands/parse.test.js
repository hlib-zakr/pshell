import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/commands/parse.js';

describe('parseCommand', () => {
  it('parses a simple command with no args or flags', () => {
    const result = parseCommand('ls');
    expect(result.command).toBe('ls');
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it('parses a command with positional arguments', () => {
    const result = parseCommand('git checkout main');
    expect(result.command).toBe('git');
    expect(result.args).toEqual(['checkout', 'main']);
  });

  it('parses short flags and expands them individually', () => {
    const result = parseCommand('ls -la');
    expect(result.flags).toEqual({ l: true, a: true });
    expect(result.args).toEqual([]);
  });

  it('parses long flags as booleans', () => {
    const result = parseCommand('git push --force');
    expect(result.flags).toEqual({ force: true });
  });

  it('parses long flags with = value', () => {
    const result = parseCommand('git commit --message=test');
    expect(result.flags).toEqual({ message: 'test' });
  });

  it('treats numeric arguments like -9 as args, not flags', () => {
    const result = parseCommand('kill -9 420');
    expect(result.args).toEqual(['-9', '420']);
    expect(result.flags).toEqual({});
  });

  it('handles mixed short flags and positional args', () => {
    const result = parseCommand('docker exec -it nginx bash');
    expect(result.flags).toEqual({ i: true, t: true });
    expect(result.args).toEqual(['exec', 'nginx', 'bash']);
  });

  it('returns empty command, args, and flags for empty input', () => {
    const result = parseCommand('');
    expect(result.command).toBe('');
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({});
  });

  // Quoting tests
  it('treats double-quoted string as single arg', () => {
    const result = parseCommand('echo "hello world"');
    expect(result.args).toEqual(['hello world']);
  });

  it('treats single-quoted string as single arg', () => {
    const result = parseCommand("echo 'hello world'");
    expect(result.args).toEqual(['hello world']);
  });

  it('handles backslash escaping', () => {
    const result = parseCommand('echo hello\\ world');
    expect(result.args).toEqual(['hello world']);
  });

  it('strips quotes from output', () => {
    const result = parseCommand('cat "my file.txt"');
    expect(result.args).toEqual(['my file.txt']);
  });

  it('handles mixed quotes and flags', () => {
    const result = parseCommand('grep -i "error message" log.txt');
    expect(result.flags).toEqual({ i: true });
    expect(result.args).toEqual(['error message', 'log.txt']);
  });
});
