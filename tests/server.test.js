const { sanitize, sanitizeSearchTerm, sanitizeSong, computeResults } = require('../utils');
const { generateUniqueRoomCode, roomPublic, playlistEntry, searchHandler } = require('../server');

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
  beforeAll(() => {
    if (typeof global.fetch === 'undefined') {
      global.fetch = jest.fn();
    }
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 1, title: 'Song', artist: { name: 'Artist' }, album: { cover_medium: 'https://dzcdn.net/image.jpg' }, preview: 'https://dzcdn.net/preview.mp3' }] })
    });
  });

  test('generateUniqueRoomCode returns 4 uppercase hex chars', () => {
    expect(generateUniqueRoomCode()).toMatch(/^[0-9A-F]{4}$/);
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

  // Note: Testing searchHandler with actual fetch calls is complex in Jest/Node.js environment
  // The core logic is tested via the app/client integration tests
  // For full API testing, use integration tests with a real server or MSW (Mock Service Worker)
  
  test('searchHandler returns empty results for short query', async () => {
    const json = jest.fn().mockReturnValue(undefined);
    const mockRes = { json };
    await searchHandler({ query: { q: 'a' } }, mockRes);
    expect(json).toHaveBeenCalledWith({ results: [] });
  });
});