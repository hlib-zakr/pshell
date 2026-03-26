import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const LEADERBOARD_FILE = path.resolve('leaderboard.json');

function leaderboardPlugin() {
  return {
    name: 'leaderboard-api',
    configureServer(server) {
      // GET /api/leaderboard
      server.middlewares.use('/api/leaderboard', (req, res) => {
        if (req.method === 'GET') {
          let scores = [];
          try {
            if (fs.existsSync(LEADERBOARD_FILE)) {
              scores = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
            }
          } catch {}

          const url = new URL(req.url, 'http://localhost');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          scores.sort((a, b) => b.score - a.score);

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(scores.slice(0, limit)));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const entry = JSON.parse(body);
              let scores = [];
              try {
                if (fs.existsSync(LEADERBOARD_FILE)) {
                  scores = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
                }
              } catch {}

              entry.created_at = new Date().toISOString();
              scores.push(entry);
              scores.sort((a, b) => b.score - a.score);
              scores = scores.slice(0, 100);
              fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(scores, null, 2));

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify(entry));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 204;
          res.end();
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [leaderboardPlugin()],
});
