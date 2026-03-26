export const gamesCommands = [

  {
    match: 'snake',
    handler: async (cmd, ctx) => {
      const { runSnake } = await import('../games/snake.js');
      await runSnake(ctx);
    },
  },

  {
    match: 'minesweeper',
    handler: async (cmd, ctx) => {
      const { runMinesweeper } = await import('../games/minesweeper.js');
      await runMinesweeper(ctx);
    },
  },

  {
    match: 'wordle',
    handler: async (cmd, ctx) => {
      const { runWordle } = await import('../games/wordle.js');
      await runWordle(ctx);
    },
  },

  {
    match: '2048',
    handler: async (cmd, ctx) => {
      const { run2048 } = await import('../games/game-2048.js');
      await run2048(ctx);
    },
  },

  // ══════════════════════════════════════
  // NETMAP — Network Topology Visualizer
  // ══════════════════════════════════════

  {
    match: cmd => cmd === 'netmap' || cmd === 'network-map',
    handler: async (cmd, { term, state, sleep }) => {
      const containers = state.sim.docker.containers;
      const compose = state.sim.docker.compose;

      // Derive topology dynamically from compose dependencies
      const topology = [];
      if (compose) {
        for (const [svcName, svc] of Object.entries(compose.services)) {
          for (const dep of svc.depends_on) {
            const depSvc = compose.services[dep];
            if (depSvc) {
              topology.push([svc.container, depSvc.container]);
            }
          }
        }
      }
      // Fallback if no compose or no dependencies found
      if (topology.length === 0) {
        topology.push(['nginx', 'pshell-api'], ['pshell-api', 'postgres'], ['pshell-api', 'redis']);
      }

      // Determine status for each container
      const getStatus = (name) => {
        const c = containers[name];
        if (!c) return 'missing';
        return c.status === 'running' ? 'running' : 'stopped';
      };

      const getPort = (name) => {
        const c = containers[name];
        if (!c || !c.ports) return '';
        const firstPort = Object.values(c.ports)[0];
        return firstPort ? `:${firstPort.HostPort}` : '';
      };

      // Group containers into tiers based on heuristics
      const containerNames = Object.keys(containers);
      const topTier = containerNames.filter(n => n.includes('nginx') || n.includes('proxy') || n.includes('lb'));
      const bottomTier = containerNames.filter(n => n.includes('postgres') || n.includes('redis') || n.includes('db') || n.includes('cache') || n === 'matrix-rain');
      const midTier = containerNames.filter(n => !topTier.includes(n) && !bottomTier.includes(n));

      const rows = [];
      if (topTier.length > 0) rows.push(topTier);
      if (midTier.length > 0) rows.push(midTier);
      if (bottomTier.length > 0) rows.push(bottomTier);
      if (rows.length === 0) rows.push(containerNames); // fallback: all in one row

      const COL_W = 20;  // width of each column cell
      const BOX_W = 16;  // width of the box itself

      // Build a box for a container
      const makeBox = (name) => {
        const status = getStatus(name);
        const port = getPort(name);
        const stopped = status !== 'running';
        const label = name.length > BOX_W - 4 ? name.slice(0, BOX_W - 5) + '..' : name;
        const portLabel = port || '';
        const tag = stopped ? '[STOP]' : '';

        const top    = '\u250C' + '\u2500'.repeat(BOX_W - 2) + '\u2510';
        const mid1   = '\u2502' + (' ' + label + (tag ? ' ' + tag : '')).padEnd(BOX_W - 2).slice(0, BOX_W - 2) + '\u2502';
        const mid2   = '\u2502' + ('   ' + portLabel).padEnd(BOX_W - 2).slice(0, BOX_W - 2) + '\u2502';
        const bottom = '\u2514' + '\u2500'.repeat(BOX_W - 2) + '\u2518';
        return [top, mid1, mid2, bottom];
      };

      // Build static frame lines
      const buildFrame = (animChar) => {
        const lines = [];

        for (let ri = 0; ri < rows.length; ri++) {
          const row = rows[ri];
          // Each box is 4 lines tall
          const boxLines = row.map(name => makeBox(name));
          for (let lineIdx = 0; lineIdx < 4; lineIdx++) {
            let frameLine = '   '; // left padding
            for (let ci = 0; ci < row.length; ci++) {
              const box = boxLines[ci][lineIdx];
              if (ci > 0) frameLine += '  '; // gap between boxes
              frameLine += box;
            }
            lines.push(frameLine);
          }

          // Draw connection lines between this row and next row
          if (ri < rows.length - 1) {
            const nextRow = rows[ri + 1];
            // Build connector lines — width must cover both rows
            const maxCols = Math.max(row.length, nextRow.length);
            const connWidth = 3 + maxCols * (BOX_W + 2) + BOX_W;
            let connLine1 = ' '.repeat(connWidth).split('');
            let connLine2 = ' '.repeat(connWidth).split('');

            for (const [src, tgt] of topology) {
              const srcRowIdx = rows.findIndex(r => r.includes(src));
              const tgtRowIdx = rows.findIndex(r => r.includes(tgt));
              if (srcRowIdx !== ri || tgtRowIdx !== ri + 1) continue;

              const srcCol = rows[srcRowIdx].indexOf(src);
              const tgtCol = rows[tgtRowIdx].indexOf(tgt);
              const srcX = 3 + srcCol * (BOX_W + 2) + Math.floor(BOX_W / 2);
              const tgtX = 3 + tgtCol * (BOX_W + 2) + Math.floor(BOX_W / 2);

              const srcStopped = getStatus(src) !== 'running';
              const tgtStopped = getStatus(tgt) !== 'running';
              const broken = srcStopped || tgtStopped;

              // Vertical pipe from source down
              if (srcX < connLine1.length) {
                connLine1[srcX] = broken ? '\u00A6' : '\u2502';
              }
              // Horizontal or direct vertical to target
              if (srcX === tgtX) {
                if (tgtX < connLine2.length) {
                  connLine2[tgtX] = broken ? '\u00A6' : (animChar || '\u25BC');
                }
              } else {
                const minX = Math.min(srcX, tgtX);
                const maxX = Math.max(srcX, tgtX);
                for (let x = minX; x <= maxX; x++) {
                  if (x < connLine2.length) {
                    if (x === tgtX) {
                      connLine2[x] = broken ? '\u00A6' : (animChar || '\u25BC');
                    } else if (x === srcX) {
                      connLine2[x] = broken ? '\u00A6' : '\u2514';
                    } else {
                      connLine2[x] = broken ? '\u00B7' : '\u2500';
                    }
                  }
                }
              }
            }

            lines.push(connLine1.join(''));
            lines.push(connLine2.join(''));
          }
        }
        return lines;
      };

      term.addLine('', 'blank');
      const networkName = Object.keys(state.sim.docker.networks).find(n => n !== 'bridge' && n !== 'host') || 'pshell-network';
      term.addLine(`NETWORK TOPOLOGY — ${networkName} (bridge)`, 'about-heading');
      term.addLine('', 'blank');

      // Create a <pre> element for the animated topology
      const pre = document.createElement('pre');
      pre.className = 'about-text';
      pre.style.margin = '0';
      pre.style.padding = '0';
      pre.style.fontFamily = 'inherit';
      pre.style.fontSize = 'inherit';
      pre.style.lineHeight = '1.3';
      pre.style.color = 'inherit';
      term.linesContainer.appendChild(pre);
      term._scrollToBottom();

      // Show initial static frame
      const staticFrame = buildFrame('\u25BC');
      pre.textContent = staticFrame.join('\n');
      term._scrollToBottom();

      // Animate packet flow for ~3 seconds
      const animChars = ['>', '\u00BB', '\u25B6', '\u2022', '\u25BA'];
      let animTick = 0;
      await new Promise(resolve => {
        const animInterval = setInterval(() => {
          animTick++;
          const charIdx = animTick % animChars.length;
          const frame = buildFrame(animChars[charIdx]);
          pre.textContent = frame.join('\n');
          term._scrollToBottom();
          if (animTick >= 12) { // ~3 seconds at 250ms intervals
            clearInterval(animInterval);
            // Final static frame
            pre.textContent = staticFrame.join('\n');
            term._scrollToBottom();
            resolve();
          }
        }, 250);
      });

      // Show legend
      term.addLine('', 'blank');
      const running = Object.entries(containers).filter(([, c]) => c.status === 'running').length;
      const stopped = Object.entries(containers).filter(([, c]) => c.status !== 'running').length;
      term.addLine(`Containers: ${running} running, ${stopped} stopped`, 'about-access');
      if (stopped > 0) {
        const stoppedNames = Object.entries(containers)
          .filter(([, c]) => c.status !== 'running')
          .map(([n]) => n)
          .join(', ');
        term.addLine(`Stopped: ${stoppedNames}`, 'danger-text');
        term.addLine('\u00A6 = broken connection  \u00B7 = broken link', 'about-text');
      }
      term.addLine('\u2502 = active connection  \u25BC = packet flow', 'about-text');
      term.addLine('', 'blank');
    },
  },

];
