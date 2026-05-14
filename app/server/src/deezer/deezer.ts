import type { Request, Response } from "express";
import { searchDeezerTracks } from "./deezerClient.js";
import { sanitizeSearchTerm } from "../utils/sanitize.js";

export async function searchHandler(req: Request, res: Response) {
  const q = sanitizeSearchTerm(req.query.q);
  if (!q || q.length < 2) return res.json({ results: [] });

  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);

  try {
    const search = await searchDeezerTracks(q, limit);
    if (!search.ok) {
      return res.status(search.status).json({ error: `Deezer ${search.status}`, results: [] });
    }

    res.set("Cache-Control", "public, max-age=60");
    return res.json({ results: search.results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return res.status(500).json({ error: `Erreur serveur: ${message}`, results: [] });
  }
}
