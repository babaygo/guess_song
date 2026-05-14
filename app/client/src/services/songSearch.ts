import type { Song } from "../types/game";

export async function searchSongs(query: string) {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`search ${response.status}`);
  const data = (await response.json()) as { results?: Song[] };
  return Array.isArray(data.results) ? data.results : [];
}
