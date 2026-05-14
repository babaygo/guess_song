import { sanitizeSearchTerm, sanitizeSong } from '../../shared/utils.js';

export async function searchHandler(req, res) {
  const q = sanitizeSearchTerm(req.query.q);
  if (!q || q.length < 2) return res.json({ results: [] });

  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);

  try {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const upstream = await fetch(`https://api.deezer.com/search?${params.toString()}`, {
      headers: { 'User-Agent': 'guess-the-song/1.0', 'Accept': 'application/json' },
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Deezer ${upstream.status}`, results: [] });
    const data = await upstream.json();
    const results = (Array.isArray(data.data) ? data.data : [])
      .filter(r => r.id && r.title)
      .map(r => ({
        id: r.id,
        title: r.title ?? 'Titre inconnue',
        artist: r.artist?.name ?? '',
        artwork: r.album?.cover_medium ?? '',
        preview: r.preview ?? null,
      }))
      .map(sanitizeSong)
      .filter(Boolean);
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur: ' + err.message, results: [] });
  }
}