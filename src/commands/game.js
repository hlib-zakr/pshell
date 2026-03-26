export const gameCommands = [

  {
    meta: { name: 'play', desc: 'Start the game (or press Enter)', category: 'game' },
    match: cmd => cmd === 'play' || cmd === './pshell' || cmd === './stop-the-code' || cmd === 'stc' || /^play\s+\d+$/.test(cmd),
    handler: async (cmd, { term, onPlay }) => {
      if (!onPlay) {
        term.addLine('Game can only be started from the main terminal.', 'about-text');
        return;
      }
      const match = cmd.match(/^play\s+(\d+)$/);
      const termCount = match ? Math.min(Math.max(parseInt(match[1]), 1), 4) : null;
      onPlay(termCount);
    },
  },
  {
    meta: { name: 'tutorial', desc: 'Practice mode', category: 'game' },
    match: 'tutorial',
    handler: async (cmd, { term, onTutorial }) => {
      if (!onTutorial) {
        term.addLine('Tutorial can only be started from the main terminal.', 'about-text');
        return;
      }
      onTutorial();
    },
  },
  {
    meta: { name: 'terminals <n>', desc: 'Set terminal count (1-4)', category: 'game' },
    match: cmd => /^terminals?\s+\d+$/.test(cmd),
    handler: async (cmd, { term }) => {
      const n = Math.min(Math.max(parseInt(cmd.match(/\d+/)[0]), 1), 4);
      window._selectedTerminals = n;
      term.addLine(`Terminal count set to ${n}. Type "play" to start.`, 'about-text');
    },
  },

];
