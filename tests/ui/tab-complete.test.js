import { describe, it, expect } from 'vitest';
import { getCompletions, commonPrefix } from '../../src/ui/tab-complete.js';

const state = {
  cwd: '/home/classified',
  sim: {
    git: { branches: ['main', 'dev'] },
    fs: { createdFiles: {}, createdDirs: new Set() },
  },
};

describe('commonPrefix', () => {
  it('returns the longest common prefix of multiple strings', () => {
    expect(commonPrefix(['help', 'helm', 'head'])).toBe('he');
  });

  it('returns the full string when only one completion exists', () => {
    expect(commonPrefix(['abc'])).toBe('abc');
  });

  it('returns empty string for empty array', () => {
    expect(commonPrefix([])).toBe('');
  });
});

describe('getCompletions', () => {
  it('returns 100+ commands for empty input', () => {
    const results = getCompletions('', state);
    expect(results.length).toBeGreaterThan(100);
  });

  it('filters commands by prefix', () => {
    const results = getCompletions('gi', state);
    expect(results).toContain('git');
  });

  it('returns git subcommands for "git "', () => {
    const results = getCompletions('git ', state);
    expect(results.length).toBeGreaterThan(0);
    expect(results).toContain('status');
    expect(results).toContain('commit');
    expect(results).toContain('push');
  });

  it('returns container names for "docker stop "', () => {
    const results = getCompletions('docker stop ', state);
    expect(results.length).toBeGreaterThan(0);
    expect(results).toContain('nginx');
    expect(results).toContain('postgres');
    expect(results).toContain('redis');
  });

  it('returns file names for "cat "', () => {
    const results = getCompletions('cat ', state);
    expect(results.length).toBeGreaterThan(0);
    expect(results).toContain('about.classified');
    expect(results).toContain('secrets.enc');
    expect(results).toContain('README.md');
  });

  it('returns service names for "systemctl status "', () => {
    const results = getCompletions('systemctl status ', state);
    expect(results.length).toBeGreaterThan(0);
    expect(results).toContain('nginx');
    expect(results).toContain('sshd');
    expect(results).toContain('cron');
  });

  it('returns help topics for "help "', () => {
    const results = getCompletions('help ', state);
    expect(results.length).toBeGreaterThan(0);
    expect(results).toContain('rm');
    expect(results).toContain('sudo');
    expect(results).toContain('git');
  });

  it('returns empty array for nonexistent command prefix', () => {
    const results = getCompletions('nonexistent', state);
    expect(results).toEqual([]);
  });
});
