import { describe, it, expect } from 'vitest';
import { validateSimState } from '../../src/state/schema.js';

describe('validateSimState', () => {
  it('returns null/undefined input unchanged', () => {
    expect(validateSimState(null)).toBe(null);
    expect(validateSimState(undefined)).toBe(undefined);
  });

  it('fills all defaults on an empty object', () => {
    const state = validateSimState({});
    expect(state.session).toBeDefined();
    expect(state.git).toBeDefined();
    expect(state.docker).toBeDefined();
    expect(state.sql).toBeDefined();
    expect(state.fs).toBeDefined();
    expect(state.k8s).toBeDefined();
    expect(state.services).toBeDefined();
    expect(state.crontab).toEqual([]);
    expect(state.processes).toBeDefined();
    expect(state._history).toEqual([]);
    expect(state.session.cwd).toBe('/home/classified');
    expect(state.git.branch).toBe('main');
    expect(state.git.branches).toEqual(['main']);
    expect(state.git.commits).toEqual([]);
    expect(state.docker.containers).toEqual({});
    expect(state.sql.connected).toBe(true);
    expect(state.fs.createdFiles).toEqual({});
    expect(state.fs.deletedFiles).toBeInstanceOf(Set);
    expect(state.fs.createdDirs).toBeInstanceOf(Set);
    expect(state.k8s.pods).toEqual([]);
    expect(state.k8s.deletedPods).toBeInstanceOf(Set);
    expect(typeof state.commandCount).toBe('number');
    expect(state.filesRead).toBeInstanceOf(Set);
  });

  it('adds default session when session is missing', () => {
    const state = validateSimState({ git: { branch: 'dev', branches: ['dev'], commits: [], staged: [], stashes: [], stashCounter: 0 } });
    expect(state.session).toBeDefined();
    expect(state.session.cwd).toBe('/home/classified');
    expect(state.session.hackedMainframe).toBe(false);
    expect(state.session.sudoCount).toBe(0);
  });

  it('corrects wrong types (e.g. git.commits as string becomes [])', () => {
    const state = validateSimState({ git: { commits: 'string' } });
    expect(Array.isArray(state.git.commits)).toBe(true);
    expect(state.git.commits).toEqual([]);
  });

  it('creates empty Set when fs.deletedFiles is missing', () => {
    const state = validateSimState({ fs: {} });
    expect(state.fs.deletedFiles).toBeInstanceOf(Set);
    expect(state.fs.deletedFiles.size).toBe(0);
  });

  it('reconstructs Set from __set format', () => {
    const state = validateSimState({
      fs: {
        deletedFiles: { __set: ['a', 'b'] },
        createdDirs: { __set: ['/tmp/test'] },
      },
    });
    expect(state.fs.deletedFiles).toBeInstanceOf(Set);
    expect(state.fs.deletedFiles.has('a')).toBe(true);
    expect(state.fs.deletedFiles.has('b')).toBe(true);
    expect(state.fs.createdDirs).toBeInstanceOf(Set);
    expect(state.fs.createdDirs.has('/tmp/test')).toBe(true);
  });

  it('passes a valid state through unchanged', () => {
    const original = validateSimState({});
    const startedAt = original.startedAt;
    const result = validateSimState(original);
    expect(result.session.cwd).toBe('/home/classified');
    expect(result.git.branch).toBe('main');
    expect(result.startedAt).toBe(startedAt);
    expect(result.fs.deletedFiles).toBeInstanceOf(Set);
  });

  it('adds empty _history array when missing', () => {
    const state = validateSimState({});
    expect(Array.isArray(state._history)).toBe(true);
    expect(state._history).toEqual([]);
  });

  it('adds empty crontab array when missing', () => {
    const state = validateSimState({});
    expect(Array.isArray(state.crontab)).toBe(true);
    expect(state.crontab).toEqual([]);
  });
});
