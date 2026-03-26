import { describe, it, expect, beforeEach } from 'vitest';
import { createMockCtx, findHandler, runCommand } from '../helpers/mock-ctx.js';
import { sqlCommands } from '../../src/commands/sql.js';

describe('sqlCommands', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it('psql with no query shows welcome and table listing', async () => {
    await runCommand(sqlCommands, 'psql', ctx);
    const welcome = ctx.lines.find(l => l.text.includes('connected to "prod"'));
    expect(welcome).toBeDefined();
    const usersTable = ctx.lines.find(l => l.text.includes('users'));
    expect(usersTable).toBeDefined();
  });

  it('SELECT * FROM users shows all rows', async () => {
    ctx.rawCmd = 'psql -c "SELECT * FROM users"';
    const handler = findHandler(sqlCommands, 'psql -c "select * from users"');
    await handler.handler('psql -c "select * from users"', ctx);
    // Should show both user rows
    const testRow = ctx.lines.find(l => l.text.includes('test'));
    const adminRow = ctx.lines.find(l => l.text.includes('admin'));
    expect(testRow).toBeDefined();
    expect(adminRow).toBeDefined();
    const rowCount = ctx.lines.find(l => l.text.includes('(2 rows)'));
    expect(rowCount).toBeDefined();
  });

  it('SELECT username FROM users shows only username column', async () => {
    ctx.rawCmd = 'psql -c "SELECT username FROM users"';
    const handler = findHandler(sqlCommands, 'psql -c "select username from users"');
    await handler.handler('psql -c "select username from users"', ctx);
    // Header should contain username but not email
    const header = ctx.lines.find(l => l.text.includes('username') && !l.text.includes('email'));
    expect(header).toBeDefined();
  });

  it('SELECT * FROM users WHERE id = 1 filters rows', async () => {
    ctx.rawCmd = 'psql -c "SELECT * FROM users WHERE id = 1"';
    const handler = findHandler(sqlCommands, 'psql -c "select * from users where id = 1"');
    await handler.handler('psql -c "select * from users where id = 1"', ctx);
    const testRow = ctx.lines.find(l => l.text.includes('test'));
    expect(testRow).toBeDefined();
    const rowCount = ctx.lines.find(l => l.text.includes('(1 row)'));
    expect(rowCount).toBeDefined();
    // admin should not appear
    const adminRow = ctx.lines.find(l => l.text.includes('admin'));
    expect(adminRow).toBeUndefined();
  });

  it('INSERT INTO users adds a new row', async () => {
    ctx.rawCmd = `psql -c "INSERT INTO users (username) VALUES ('newuser')"`;
    const handler = findHandler(sqlCommands, `psql -c "insert into users (username) values ('newuser')"`);
    await handler.handler(`psql -c "insert into users (username) values ('newuser')"`, ctx);
    const insertLine = ctx.lines.find(l => l.text.includes('INSERT 0 1'));
    expect(insertLine).toBeDefined();
    // Check that the row was actually added
    const table = ctx.state.sim.sql.tables.users;
    const newRow = table.rows.find(r => r.username === 'newuser');
    expect(newRow).toBeDefined();
  });

  it('UPDATE users SET email WHERE id = 1 updates the row', async () => {
    ctx.rawCmd = "psql -c \"UPDATE users SET email = 'updated@test.com' WHERE id = 1\"";
    const handler = findHandler(sqlCommands, "psql -c \"update users set email = 'updated@test.com' where id = 1\"");
    await handler.handler("psql -c \"update users set email = 'updated@test.com' where id = 1\"", ctx);
    const updateLine = ctx.lines.find(l => l.text.includes('UPDATE 1'));
    expect(updateLine).toBeDefined();
    const row = ctx.state.sim.sql.tables.users.rows.find(r => r.id === 1);
    expect(row.email).toBe('updated@test.com');
  });

  it('DELETE FROM users WHERE id = 2 removes the row', async () => {
    ctx.rawCmd = 'psql -c "DELETE FROM users WHERE id = 2"';
    const handler = findHandler(sqlCommands, 'psql -c "delete from users where id = 2"');
    await handler.handler('psql -c "delete from users where id = 2"', ctx);
    const deleteLine = ctx.lines.find(l => l.text.includes('DELETE 1'));
    expect(deleteLine).toBeDefined();
    const remaining = ctx.state.sim.sql.tables.users.rows;
    expect(remaining.length).toBe(1);
    expect(remaining.find(r => r.id === 2)).toBeUndefined();
  });

  it('CREATE TABLE creates a new table', async () => {
    ctx.rawCmd = 'psql -c "CREATE TABLE test (name text)"';
    const handler = findHandler(sqlCommands, 'psql -c "create table test (name text)"');
    await handler.handler('psql -c "create table test (name text)"', ctx);
    const createLine = ctx.lines.find(l => l.text === 'CREATE TABLE');
    expect(createLine).toBeDefined();
    expect(ctx.state.sim.sql.tables.test).toBeDefined();
    expect(ctx.state.sim.sql.tables.test.rows).toEqual([]);
  });

  it('DROP TABLE drops a user-created table', async () => {
    // First create the table
    ctx.state.sim.sql.tables.test = { schema: [{ name: 'id', type: 'serial', pk: true }], rows: [], nextId: 1 };
    ctx.rawCmd = 'psql -c "DROP TABLE test"';
    const handler = findHandler(sqlCommands, 'psql -c "drop table test"');
    await handler.handler('psql -c "drop table test"', ctx);
    const dropLine = ctx.lines.find(l => l.text === 'DROP TABLE');
    expect(dropLine).toBeDefined();
    expect(ctx.state.sim.sql.tables.test).toBeUndefined();
  });

  it('DROP TABLE users is blocked for built-in tables', async () => {
    ctx.rawCmd = 'psql -c "DROP TABLE users"';
    const handler = findHandler(sqlCommands, 'psql -c "drop table users"');
    await handler.handler('psql -c "drop table users"', ctx);
    const errorLine = ctx.lines.find(l => l.text.includes('permission denied'));
    expect(errorLine).toBeDefined();
    // Table should still exist
    expect(ctx.state.sim.sql.tables.users).toBeDefined();
  });

  it('shows connection error when postgres is stopped', async () => {
    ctx.state.sim.sql.connected = false;
    await runCommand(sqlCommands, 'psql', ctx);
    const errorLine = ctx.lines.find(l => l.text.includes('Connection refused'));
    expect(errorLine).toBeDefined();
  });
});
