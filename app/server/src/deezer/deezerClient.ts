import { sanitizeText, validateArtworkUrl, validatePreviewUrl } from "../utils/sanitize.js";
import type { Song } from "../types/types.js";

type DeezerTrack = {
  id?: number;
  title?: string;
  preview?: string;
  artist?: { name?: string };
  album?: { cover_medium?: string };
};

export async function searchDeezerTracks(q: string, limit: number) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const upstream = await fetch(`https://api.deezer.com/search?${params.toString()}`, {
    headers: { "User-Agent": "guess-the-song/1.0", Accept: "application/json" },
  });

  if (!upstream.ok) {
    return { ok: false as const, status: upstream.status };
  }

  const data = (await upstream.json()) as { data?: DeezerTrack[] };
  return {
    ok: true as const,
    results: mapDeezerTracks(Array.isArray(data.data) ? data.data : []),
  };
}

function mapDeezerTracks(tracks: DeezerTrack[]): Song[] {
  return tracks
    .filter((track) => track.id && track.title)
    .map((track) => ({
      id: Number(track.id),
      title: sanitizeText(track.title) || "Titre inconnu",
      artist: sanitizeText(track.artist?.name),
      artwork: validateArtworkUrl(track.album?.cover_medium),
      preview: validatePreviewUrl(track.preview),
    }));
}
