import type { Request, Response } from "express";
import { sanitizeSearchTerm, validateArtworkUrl, validatePreviewUrl } from "./sanitize.js";
import type { Song } from "./types.js";

type DeezerTrack = {
  id?: number;
  title?: string;
  preview?: string;
  artist?: { name?: string };
  album?: { cover_medium?: string };
};

export async function searchHandler(req: Request, res: Response) {
  const q = sanitizeSearchTerm(req.query.q);
  if (!q || q.length < 2) return res.json({ results: [] });

  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);

  try {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const upstream = await fetch(`https://api.deezer.com/search?${params.toString()}`, {
      headers: { "User-Agent": "guess-the-song/1.0", Accept: "application/json" },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Deezer ${upstream.status}`, results: [] });
    }

    const data = (await upstream.json()) as { data?: DeezerTrack[] };
    const results: Song[] = (Array.isArray(data.data) ? data.data : [])
      .filter((track) => track.id && track.title)
      .map((track) => ({
        id: Number(track.id),
        title: track.title ?? "Titre inconnu",
        artist: track.artist?.name ?? "",
        artwork: validateArtworkUrl(track.album?.cover_medium),
        preview: validatePreviewUrl(track.preview),
      }));

    res.set("Cache-Control", "public, max-age=60");
    return res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return res.status(500).json({ error: `Erreur serveur: ${message}`, results: [] });
  }
}
