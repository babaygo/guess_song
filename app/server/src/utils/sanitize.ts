import type { Song } from "../types/types.js";

export function sanitize(value: unknown, maxLength = 20) {
  return String(value ?? "").trim().replace(/[<>&"']/g, "").slice(0, maxLength);
}

// For free-text coming from clients/Deezer (song title, artist): strip angle
// brackets so a crafted submission can't inject markup. Legitimate punctuation
// (& apostrophes, accents) is kept — React escapes it safely when rendering.
export function sanitizeText(value: unknown, maxLength = 200) {
  return String(value ?? "").replace(/[<>]/g, "").slice(0, maxLength);
}

export function sanitizeSearchTerm(value: unknown) {
  return sanitize(value, 100);
}

export function validateArtworkUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? ""));
    if (url.protocol !== "https:") return "";
    if (!url.hostname.endsWith("dzcdn.net") && !url.hostname.endsWith("mzstatic.com")) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function validatePreviewUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? ""));
    if (url.protocol !== "https:") return null;
    if (!url.hostname.endsWith("dzcdn.net")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function sanitizeSong(song: unknown): Song | null {
  if (!song || typeof song !== "object") return null;
  const source = song as Partial<Song>;
  const id = Number(source.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    id,
    title: sanitizeText(source.title),
    artist: sanitizeText(source.artist),
    artwork: validateArtworkUrl(source.artwork),
    preview: validatePreviewUrl(source.preview),
  };
}
