import { parseSqlQuery } from '../state/simulation-state.js';

// Shared helper: render a psql-style table with dynamic column widths
function renderPsqlTable(term, cols, rows, schema) {
  // Determine which columns are numeric for right-alignment
  const numericTypes = new Set(['serial', 'int', 'integer', 'bigint', 'smallint', 'numeric', 'real', 'double', 'float']);
  const isNumeric = {};
  if (schema) {
    for (const s of schema) {
      isNumeric[s.name] = numericTypes.has(s.type.toLowerCase().split('(')[0]);
    }
  }

  // Calculate column widths: max of header length and all value lengths
  const widths = {};
  for (const col of cols) {
    widths[col] = col.length;
  }
  for (const row of rows) {
    for (const col of cols) {
      const val = row[col] == null ? '' : String(row[col]);
      widths[col] = Math.max(widths[col], val.length);
    }
  }

  // Render header: " col1 | col2 | col3"
  const header = ' ' + cols.map(c => {
    return isNumeric[c] ? c.padStart(widths[c]) : c.padEnd(widths[c]);
  }).join(' | ');
  term.addLine(header, 'about-text');

  // Render separator: "------+------+------"
  const sep = '-' + cols.map(c => '-'.repeat(widths[c])).join('-+-') + '-';
  term.addLine(sep, 'about-text');

  // Render rows
  for (const row of rows) {
    const line = ' ' + cols.map(c => {
      const val = row[c] == null ? '' : String(row[c]);
      return isNumeric[c] ? val.padStart(widths[c]) : val.padEnd(widths[c]);
    }).join(' | ');
    term.addLine(line, 'about-text');
  }

  // Row count footer
  term.addLine(`(${rows.length} row${rows.length !== 1 ? 's' : ''})`, 'about-text');
}

export const sqlCommands = [
  {
    meta: { name: 'psql', desc: 'PostgreSQL shell (stateful SQL)', category: 'sql' },
    match: cmd => cmd.startsWith('psql') || cmd === 'psql' || cmd === '\\dt' || cmd.startsWith('\\d '),
    handler: async (cmd, { term, state, rawCmd }) => {
      const sql = state.sim.sql;

      // Check if postgres is running
      if (!sql.connected) {
        term.addLine('psql: error: connection to server failed: Connection refused', 'danger-text');
        term.addLine('Is the server running? (hint: docker start postgres)', 'about-text');
        return;
      }

      // Extract SQL from psql -c "..."
      let query = '';
      const raw = rawCmd || cmd;
      if (raw.includes('-c')) {
        query = raw.split('-c')[1]?.trim().replace(/^["']|["']$/g, '').trim() || '';
      } else if (cmd === '\\dt' || cmd.startsWith('\\d ')) {
        query = cmd;
      }

      if (!query) {
        term.addLine('psql (15.4) \u2014 connected to "prod"', 'about-text');
        term.addLine('', 'blank');
        term.addLine(' Tables:', 'about-heading');
        for (const [name, tbl] of Object.entries(sql.tables)) {
          const cols = tbl.schema.map(c => c.name).join(', ');
          term.addLine(`   ${name.padEnd(12)} (${tbl.rows.length} rows) \u2014 ${cols}`, 'about-text');
        }
        term.addLine('', 'blank');
        term.addLine(' Try:', 'about-heading');
        term.addLine('   psql -c "SELECT * FROM users"', 'about-access');
        term.addLine('   psql -c "SELECT * FROM users WHERE id = 3"', 'about-access');
        term.addLine('   psql -c "INSERT INTO users (username, email) VALUES (\'bob\', \'bob@test.com\')"', 'about-access');
        term.addLine('   psql -c "SELECT username, email FROM users"', 'about-access');
        term.addLine('   psql -c "UPDATE users SET email = \'new@test.com\' WHERE id = 3"', 'about-access');
        term.addLine('   psql -c "DELETE FROM users WHERE username = \'hacker\'"', 'about-access');
        term.addLine('   psql -c "CREATE TABLE logs (level text, msg text)"', 'about-access');
        term.addLine('   psql -c "DROP TABLE logs"', 'about-access');
        term.addLine('   \\dt (list tables)  |  \\d users (describe schema)', 'about-access');
        term.addLine('', 'blank');
        return;
      }

      const parsed = parseSqlQuery(query);
      if (!parsed) {
        term.addLine(`ERROR:  syntax error at or near "${query.split(/\s/)[0]}"`, 'danger-text');
        return;
      }

      term.addLine('', 'blank');

      if (parsed.type === 'list_tables') {
        const tables = Object.keys(sql.tables);
        // Compute column widths dynamically
        const maxName = Math.max(4, ...tables.map(n => n.length)); // min width = "Name".length
        term.addLine('              List of relations', 'about-text');
        term.addLine(` Schema | ${'Name'.padEnd(maxName)} | Type  | Owner`, 'about-text');
        term.addLine(`--------+${'-'.repeat(maxName + 2)}+-------+------------`, 'about-text');
        for (const name of tables) {
          term.addLine(` public | ${name.padEnd(maxName)} | table | classified`, 'about-text');
        }
        term.addLine(`(${tables.length} row${tables.length !== 1 ? 's' : ''})`, 'about-text');
      } else if (parsed.type === 'describe') {
        const tbl = sql.tables[parsed.table];
        if (!tbl) { term.addLine(`Did not find any relation named "${parsed.table}"`, 'about-text'); }
        else {
          // Compute column widths dynamically
          const maxCol = Math.max(6, ...tbl.schema.map(c => c.name.length)); // "Column".length = 6
          const maxType = Math.max(4, ...tbl.schema.map(c => c.type.length)); // "Type".length = 4
          term.addLine(`                 Table "public.${parsed.table}"`, 'about-heading');
          term.addLine(` ${'Column'.padEnd(maxCol)} | ${'Type'.padEnd(maxType)} | Collation | Nullable | Default`, 'about-text');
          term.addLine(`${'-'.repeat(maxCol + 2)}+${'-'.repeat(maxType + 2)}+-----------+----------+--------`, 'about-text');
          for (const col of tbl.schema) {
            const nullable = col.pk ? 'not null' : '';
            const def = col.pk && col.type === 'serial' ? `nextval('${parsed.table}_${col.name}_seq'::regclass)` : '';
            term.addLine(` ${col.name.padEnd(maxCol)} | ${col.type.padEnd(maxType)} |           | ${nullable.padEnd(8)} | ${def}`, 'about-text');
          }
        }
      } else if (parsed.type === 'count') {
        const tbl = sql.tables[parsed.table];
        if (!tbl) { term.addLine(`ERROR:  relation "${parsed.table}" does not exist`, 'danger-text'); }
        else {
          const count = String(tbl.rows.length);
          const width = Math.max(5, count.length); // "count" = 5 chars
          term.addLine(` ${'count'.padStart(width)}`, 'about-text');
          term.addLine(`-${'-'.repeat(width)}-`, 'about-text');
          term.addLine(` ${count.padStart(width)}`, 'about-text');
          term.addLine('(1 row)', 'about-text');
        }
      } else if (parsed.type === 'select') {
        const tbl = sql.tables[parsed.table];
        if (!tbl) { term.addLine(`ERROR:  relation "${parsed.table}" does not exist`, 'danger-text'); }
        else {
          const allCols = tbl.schema.map(c => c.name);
          const cols = parsed.selectCols ? parsed.selectCols.filter(c => allCols.includes(c)) : allCols;
          if (cols.length === 0) {
            term.addLine(`ERROR:  column "${parsed.selectCols[0]}" does not exist`, 'danger-text');
          } else {
            let filtered = tbl.rows;
            if (parsed.whereCol) {
              // eslint-disable-next-line eqeqeq
              filtered = filtered.filter(r => r[parsed.whereCol] == parsed.whereVal);
            }
            const rows = filtered.slice(0, parsed.limit);
            renderPsqlTable(term, cols, rows, tbl.schema);
          }
        }
      } else if (parsed.type === 'insert') {
        const tbl = sql.tables[parsed.table];
        if (!tbl) { term.addLine(`ERROR:  relation "${parsed.table}" does not exist`, 'danger-text'); }
        else {
          const newRow = { id: tbl.nextId || tbl.rows.length + 1 };
          if (parsed.columns) {
            parsed.columns.forEach((col, i) => { newRow[col] = parsed.values[i]; });
          } else {
            newRow[parsed.column] = parsed.value;
          }
          const hasCreatedAt = tbl.schema.some(c => c.name === 'created_at');
          if (hasCreatedAt && !newRow.created_at) newRow.created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
          tbl.rows.push(newRow);
          if (tbl.nextId) tbl.nextId++;
          term.addLine('INSERT 0 1', 'about-text');
        }
      } else if (parsed.type === 'update') {
        const tbl = sql.tables[parsed.table];
        if (!tbl) { term.addLine(`ERROR:  relation "${parsed.table}" does not exist`, 'danger-text'); }
        else {
          let count = 0;
          for (const row of tbl.rows) {
            // eslint-disable-next-line eqeqeq
            if (row[parsed.whereCol] == parsed.whereVal) {
              row[parsed.setCol] = parsed.setVal;
              count++;
            }
          }
          term.addLine(`UPDATE ${count}`, 'about-text');
        }
      } else if (parsed.type === 'delete') {
        const tbl = sql.tables[parsed.table];
        if (!tbl) { term.addLine(`ERROR:  relation "${parsed.table}" does not exist`, 'danger-text'); }
        else {
          const before = tbl.rows.length;
          // eslint-disable-next-line eqeqeq
          tbl.rows = tbl.rows.filter(r => r[parsed.whereCol] != parsed.whereVal);
          term.addLine(`DELETE ${before - tbl.rows.length}`, 'about-text');
        }
      } else if (parsed.type === 'create_table') {
        if (sql.tables[parsed.table]) {
          term.addLine(`ERROR:  relation "${parsed.table}" already exists`, 'danger-text');
        } else {
          // Add auto-increment id as first column if not specified
          const hasId = parsed.columns.some(c => c.name === 'id');
          const schema = hasId
            ? parsed.columns.map(c => ({ name: c.name, type: c.type, pk: c.name === 'id' }))
            : [{ name: 'id', type: 'serial', pk: true }, ...parsed.columns.map(c => ({ name: c.name, type: c.type }))];
          sql.tables[parsed.table] = { schema, rows: [], nextId: 1 };
          term.addLine('CREATE TABLE', 'about-text');
        }
      } else if (parsed.type === 'drop') {
        if (parsed.what.toLowerCase() === 'table' && sql.tables[parsed.name]) {
          // Block dropping built-in tables
          if (parsed.name === 'users' || parsed.name === 'sessions') {
            term.addLine(`ERROR:  permission denied to drop table "${parsed.name}"`, 'danger-text');
            term.addLine('Nice try.', 'about-text');
          } else {
            delete sql.tables[parsed.name];
            term.addLine('DROP TABLE', 'about-text');
          }
        } else if (parsed.what.toLowerCase() === 'table') {
          term.addLine(`ERROR:  table "${parsed.name}" does not exist`, 'danger-text');
        } else {
          term.addLine(`ERROR:  permission denied to drop ${parsed.what} "${parsed.name}"`, 'danger-text');
          term.addLine('Nice try.', 'about-text');
        }
      }
      term.addLine('', 'blank');
    },
  },
  {
    meta: { name: 'mysql', desc: 'MySQL shell', category: 'sql' },
    match: cmd => cmd.startsWith('mysql'),
    handler: async (cmd, { term }) => {
      if (cmd.includes('DROP') || cmd.includes('drop')) {
        term.addLine('ERROR 1044 (42000): Access denied. Nice try.', 'danger-text');
      } else {
        term.addLine('Welcome to the MySQL monitor. (read-only mode)', 'about-text');
      }
    },
  },
  {
    meta: { name: 'redis-cli', desc: 'Redis shell', category: 'sql' },
    match: cmd => cmd === 'redis-cli' || cmd.startsWith('redis-cli '),
    handler: async (cmd, { term, state }) => {
      if (cmd.includes('FLUSHALL') || cmd.includes('flushall')) {
        term.addLine('', 'blank');
        term.addLine('FLUSHALL would wipe every Redis key.', 'danger-text');
        term.addLine('Sessions, cache, queues \u2014 all destroyed.', 'about-text');
        term.addLine('', 'blank');
      } else if (cmd.includes('INFO') || cmd.includes('info')) {
        const redis = state.sim.docker.containers['redis'];
        const uptimeDays = redis ? Math.floor((Date.now() - redis.startedAt) / 86400000) : 42;
        const memUsage = redis ? (redis.memoryUsage / 1048576).toFixed(2) + 'M' : '64.00M';

        term.addLine('# Server', 'about-text');
        term.addLine('redis_version:7.2.3', 'about-text');
        term.addLine(`uptime_in_days:${uptimeDays}`, 'about-text');
        term.addLine('connected_clients:23', 'about-text');
        term.addLine(`used_memory_human:${memUsage}`, 'about-text');
        term.addLine('keyspace_hits:12847293', 'about-text');
        term.addLine('keyspace_misses:785', 'about-text');
      } else {
        term.addLine('127.0.0.1:6379> PONG', 'about-text');
      }
    },
  },
  {
    meta: { name: 'mongosh', desc: 'MongoDB shell', category: 'sql' },
    match: cmd => cmd.startsWith('mongo') || cmd.startsWith('mongosh'),
    handler: async (cmd, { term }) => {
      if (cmd.includes('dropDatabase') || cmd.includes('drop')) {
        term.addLine('MongoError: not authorized to drop database', 'danger-text');
      } else {
        term.addLine('MongoDB shell version v7.0', 'about-text');
        term.addLine('connecting to: mongodb://localhost:27017/prod', 'about-text');
        term.addLine('{ ok: 1 }', 'about-text');
      }
    },
  },

  // pg_dump — export database as SQL text
  {
    meta: { name: 'pg_dump', desc: 'Export database as .sql file', category: 'sql' },
    match: cmd => cmd === 'pg_dump' || cmd === 'pg_dump prod' || cmd.startsWith('pg_dump '),
    handler: async (cmd, { term, state }) => {
      const sql = state.sim.sql;
      if (!sql.connected) {
        term.addLine('pg_dump: connection to server failed: Connection refused', 'danger-text');
        return;
      }

      term.addLine('-- PostgreSQL database dump', 'about-text');
      term.addLine(`-- Dumped at: ${new Date().toISOString()}`, 'about-text');
      term.addLine('', 'blank');

      for (const [tableName, tbl] of Object.entries(sql.tables)) {
        const cols = tbl.schema.map(c => `  ${c.name} ${c.type}${c.pk ? ' PRIMARY KEY' : ''}`);
        term.addLine(`CREATE TABLE ${tableName} (`, 'about-text');
        for (let i = 0; i < cols.length; i++) {
          const comma = i < cols.length - 1 ? ',' : '';
          term.addLine(cols[i] + comma, 'about-text');
        }
        term.addLine(');', 'about-text');
        term.addLine('', 'blank');

        for (const row of tbl.rows) {
          const colNames = tbl.schema.map(c => c.name);
          const vals = colNames.map(c => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return String(v);
            return `'${String(v).replace(/'/g, "''")}'`;
          });
          term.addLine(`INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${vals.join(', ')});`, 'about-text');
        }
        term.addLine('', 'blank');
      }
      term.addLine('-- Dump complete', 'about-text');
    },
  },

];
