// Utilitaires partagés entre client et serveur

export function sanitize(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 20);
}

export function sanitizeSearchTerm(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 100);
}

export function sanitizeSong(song) {
  if (!song || typeof song !== 'object') return null;
  const id = Number(song.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    title: String(song.title ?? '').slice(0, 200),
    artist: String(song.artist ?? '').slice(0, 200),
    artwork: validateArtworkUrl(song.artwork),
    preview: validatePreviewUrl(song.preview),
  };
}

export function validateArtworkUrl(url) {
  try {
    const u = new URL(String(url ?? ''));
    if (u.protocol !== 'https:') return '';
    if (!u.hostname.endsWith('dzcdn.net') && !u.hostname.endsWith('mzstatic.com')) return '';
    return u.href;
  } catch (_) {
    return '';
  }
}

export function validatePreviewUrl(url) {
  try {
    const u = new URL(String(url ?? ''));
    if (u.protocol !== 'https:') return null;
    if (!u.hostname.endsWith('dzcdn.net')) return null;
    return u.href;
  } catch (_) { return null; }
}

export function computeResults(room) {
  if (!room.currentSong) return [];
  const correctPlayerName = room.currentSong.playerName;
  return room.players.map(p => ({
    playerName: p.name,
    correct: p.guess === correctPlayerName,
  }));
}