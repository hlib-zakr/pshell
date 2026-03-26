// Cloudflare Pages Function — /api/leaderboard

const ALLOWED_ORIGINS = ['https://stopthecode.dev', 'https://stop-the-code.pages.dev'];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.stop-the-code.pages.dev');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Max possible score per level — generous but blocks absurd values
// Real max: ~370pts/catch * ~7 catches at level 10 ≈ 2590
// We allow 500 * level to be safe
function maxScoreForLevel(level) {
  return Math.min(100000, level * 500);
}

export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const db = context.env.DB;
  const { results } = await db.prepare(
    'SELECT username, score, level_reached, avg_reaction_ms, commands_caught, created_at FROM leaderboard ORDER BY score DESC LIMIT ?'
  ).bind(limit).all();

  return Response.json(results, { headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const headers = corsHeaders(context.request);

  try {
    const body = await context.request.json();
    const { username, score, level_reached, avg_reaction_ms, commands_caught } = body;

    // ─── Input validation ───
    if (!username || typeof username !== 'string') {
      return Response.json({ error: 'Invalid username' }, { status: 400, headers });
    }
    const cleanName = username.trim().substring(0, 20);
    if (cleanName.length < 1 || /^\s+$/.test(cleanName)) {
      return Response.json({ error: 'Username cannot be empty' }, { status: 400, headers });
    }

    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100000) {
      return Response.json({ error: 'Invalid score' }, { status: 400, headers });
    }

    if (typeof level_reached !== 'number' || !Number.isInteger(level_reached) || level_reached < 1 || level_reached > 50) {
      return Response.json({ error: 'Invalid level' }, { status: 400, headers });
    }

    // ─── Anti-cheat: plausibility checks ───

    // Score can't exceed what's possible for the level reached
    if (score > maxScoreForLevel(level_reached)) {
      return Response.json({ error: 'Score too high for level' }, { status: 400, headers });
    }

    // Humans can't consistently react under 120ms
    if (avg_reaction_ms != null && (avg_reaction_ms < 120 || avg_reaction_ms > 15000)) {
      return Response.json({ error: 'Invalid reaction time' }, { status: 400, headers });
    }

    // Can't catch more commands than possible per level
    if (commands_caught != null && (typeof commands_caught !== 'number' || !Number.isInteger(commands_caught) || commands_caught < 0 || commands_caught > level_reached * 15)) {
      return Response.json({ error: 'Invalid catch count' }, { status: 400, headers });
    }

    // Score 0 is fine (died on first command), but score > 0 needs at least 1 catch
    if (score > 0 && (!commands_caught || commands_caught < 1)) {
      return Response.json({ error: 'Score requires catches' }, { status: 400, headers });
    }

    // ─── Rate limiting ───
    const db = context.env.DB;

    // Global: max 5 submissions in last 10 seconds
    const recentGlobal = await db.prepare(
      "SELECT COUNT(*) as cnt FROM leaderboard WHERE created_at > datetime('now', '-10 seconds')"
    ).first();
    if (recentGlobal && recentGlobal.cnt >= 5) {
      return Response.json({ error: 'Server busy. Try again.' }, { status: 429, headers });
    }

    // Per username: 1 submission per 10 seconds
    const recentByName = await db.prepare(
      "SELECT id FROM leaderboard WHERE username = ? AND created_at > datetime('now', '-10 seconds') LIMIT 1"
    ).bind(cleanName).first();
    if (recentByName) {
      return Response.json({ error: 'Wait before submitting again.' }, { status: 429, headers });
    }

    // ─── Insert ───
    await db.prepare(
      'INSERT INTO leaderboard (username, score, level_reached, avg_reaction_ms, commands_caught) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      cleanName,
      score,
      level_reached,
      avg_reaction_ms || null,
      Math.min(commands_caught || 0, 500)
    ).run();

    return Response.json({ success: true }, { status: 201, headers });
  } catch (e) {
    // Don't expose internal errors
    return Response.json({ error: 'Submission failed' }, { status: 500, headers });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
