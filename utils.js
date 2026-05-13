function sanitize(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 20);
}

function sanitizeSearchTerm(str) {
  return String(str ?? '').trim().replace(/[<>&"']/g, '').slice(0, 100);
}

function sanitizeSong(song) {
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

function validateArtworkUrl(url) {
  try {
    const u = new URL(String(url ?? ''));
    if (u.protocol !== 'https:') return '';
    if (!u.hostname.endsWith('dzcdn.net') && !u.hostname.endsWith('mzstatic.com')) return '';
    return u.href;
  } catch (_) {
    return '';
  }
}

function validatePreviewUrl(url) {
  try {
    const u = new URL(String(url ?? ''));
    if (u.protocol !== 'https:') return null;
    if (!u.hostname.endsWith('dzcdn.net')) return null;
    return u.href;
  } catch (_) { return null; }
}

function computeResults(room) {
  if (!room.currentSong) return [];
  const correctPlayerName = room.currentSong.playerName;
  return room.players.map(p => ({
    playerName: p.name,
    correct: p.guess === correctPlayerName,
  }));
}

module.exports = { sanitize, sanitizeSearchTerm, sanitizeSong, computeResults };