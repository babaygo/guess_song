const { sanitize, sanitizeSearchTerm, sanitizeSong, computeResults } = require('../utils');
const { makeCode, roomPublic, playlistEntry, searchHandler } = require('../server');

describe('Server Utils', () => {
  test('sanitize removes dangerous chars', () => {
    expect(sanitize('<script>alert(1)</script>Hello')).toBe('scriptalert(1)/scrip');
  });

  test('sanitize trims and limits length', () => {
    expect(sanitize('   long string   ')).toBe('long string');
    expect(sanitize('a'.repeat(30))).toBe('a'.repeat(20));
  });

  test('sanitizeSearchTerm removes dangerous chars and limits', () => {
    expect(sanitizeSearchTerm('<b>test</b>')).toBe('btest/b');
    expect(sanitizeSearchTerm('a'.repeat(120))).toBe('a'.repeat(100));
  });

  test('sanitizeSong validates and completes song object', () => {
    expect(sanitizeSong({ id: 123, title: 'Test' })).toEqual({ id: 123, title: 'Test', artist: '', artwork: '', preview: null });
    expect(sanitizeSong({ id: 'abc' })).toBe(null);
    expect(sanitizeSong(null)).toBe(null);
  });

  test('computeResults calculates correct guesses', () => {
    const room = {
      currentSong: { playerName: 'Alice' },
      players: [
        { name: 'Alice', guess: 'Alice' }, // self guess, but still correct
        { name: 'Bob', guess: 'Alice' },   // correct
        { name: 'Charlie', guess: 'Bob' }  // incorrect
      ]
    };
    const results = computeResults(room);
    expect(results).toEqual([
      { playerName: 'Alice', correct: true },
      { playerName: 'Bob', correct: true },
      { playerName: 'Charlie', correct: false }
    ]);
  });
});

describe('Server route helpers', () => {
  test('makeCode returns 4 uppercase hex chars', () => {
    expect(makeCode()).toMatch(/^[0-9A-F]{4}$/);
  });

  test('roomPublic hides disconnected players in lobby', () => {
    const room = {
      code: 'ABCD',
      phase: 'lobby',
      config: { songsPerPlayer: 4 },
      players: [
        { id: 'a', name: 'Alice' },
        { id: null, name: 'Bob' },
      ],
    };
    expect(roomPublic(room).players).toEqual([{ id: 'a', name: 'Alice' }]);
  });

  test('roomPublic shows all players after lobby', () => {
    const room = {
      code: 'ABCD',
      phase: 'playing',
      config: { songsPerPlayer: 4 },
      players: [
        { id: 'a', name: 'Alice' },
        { id: null, name: 'Bob' },
      ],
    };
    expect(roomPublic(room).players).toEqual(room.players);
  });

  test('playlistEntry returns correct index, total and song', () => {
    const room = {
      playlist: [{ song: 'one' }, { song: 'two' }],
      currentIndex: 1,
    };
    expect(playlistEntry(room)).toEqual({ index: 1, total: 2, song: 'two' });
  });

  test('searchHandler returns empty results for short query', async () => {
    const json = jest.fn();
    await searchHandler({ query: { q: 'a' } }, { json });
    expect(json).toHaveBeenCalledWith({ results: [] });
  });

  test('searchHandler returns Deezer results when upstream is ok', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [ { id: 1, title: 'Song', artist: { name: 'Artist' }, album: { cover_medium: 'https://dzcdn.net/image.jpg' }, preview: 'https://dzcdn.net/preview.mp3' } ] }),
    });
    const set = jest.fn().mockReturnThis();
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await searchHandler({ query: { q: 'song', limit: '1' } }, { set, json, status });
    expect(set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=60');
    expect(json).toHaveBeenCalledWith({ results: [ expect.objectContaining({ id: 1, title: 'Song', artist: 'Artist' }) ] });
  });

  test('searchHandler handles upstream failure gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503 });
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await searchHandler({ query: { q: 'song', limit: '1' } }, { status, json });
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: 'Deezer 503', results: [] });
  });
});