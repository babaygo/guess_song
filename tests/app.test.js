/**
 * @jest-environment jsdom
 */

'use strict';

let app;
let s;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '<div id="app"></div><input id="search-input" />';
  global.navigator = { clipboard: { writeText: jest.fn().mockResolvedValue() } };
  global.Audio = class {
    constructor(src = '') {
      this.src = src;
      this.volume = 1;
      this.currentTime = 0;
      this.paused = true;
      this._events = {};
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    addEventListener(event, callback) {
      this._events[event] = callback;
    }
  };
  global.fetch = jest.fn();
  global.io = jest.fn(() => ({ on: jest.fn(), emit: jest.fn() }));

  app = require('../public/app');
  s = app.s;
  s.socket = { emit: jest.fn() };
  s.room = { code: 'TEST', config: { songsPerPlayer: 4 }, players: [], phase: 'home' };
  s.myList = [];
  s.searchResults = [];
  s.searchQuery = '';
  s.isSearching = false;
  s.previewingId = null;
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

test('sanitizeLocal trims and strips unsafe characters', () => {
  expect(app.sanitizeLocal(' <b>Sam</b> ')).toBe('bSam/b');
  expect(app.sanitizeLocal('  alice  ')).toBe('alice');
  expect(app.sanitizeLocal("<>&\"' ")).toBe('');
});

test('esc escapes HTML entities', () => {
  expect(app.esc("<>&\"'")).toBe('&lt;&gt;&amp;&quot;&#39;');
  expect(app.esc('hello')).toBe('hello');
});

test('renderSearchResults shows empty search hint when query is blank', () => {
  s.searchQuery = '';
  s.searchResults = [];
  s.isSearching = false;
  const html = app.renderSearchResults();
  expect(html).toContain('Tape le titre');
});

test('renderSearchResults shows loading when searching', () => {
  s.isSearching = true;
  const html = app.renderSearchResults();
  expect(html).toContain('loading-dots');
});

test('renderSearchResults displays song item when results exist', () => {
  s.searchQuery = 'test';
  s.searchResults = [
    { id: 1, title: 'Song', artist: 'Artist', artwork: 'https://dzcdn.net/image.jpg', preview: 'https://dzcdn.net/preview.mp3' },
  ];
  const html = app.renderSearchResults();
  expect(html).toContain('Song');
  expect(html).toContain('Artist');
  expect(html).toContain('is-add');
});

test('persistSession stores the current room and name', () => {
  s.me = { name: 'Alice', isHost: false };
  s.room = { code: 'TEST' };
  app.persistSession();
  expect(s.currentSessionKey).toBe('guess-song-session-TEST');
  expect(localStorage.getItem('guess-song-session-TEST')).toBe(JSON.stringify({ code: 'TEST', name: 'Alice' }));
});

test('hydrateLocalSession loads saved session data', () => {
  localStorage.setItem('guess-song-session-TEST', JSON.stringify({ code: 'TEST', name: 'Bob' }));
  s.me = { name: '' };
  s.currentSessionKey = null;
  app.hydrateLocalSession();
  expect(s.me.name).toBe('Bob');
  expect(s.currentSessionKey).toBe('guess-song-session-TEST');
});

test('clearSession removes the stored key', () => {
  s.currentSessionKey = 'guess-song-session-TEST';
  localStorage.setItem('guess-song-session-TEST', 'data');
  app.clearSession();
  expect(localStorage.getItem('guess-song-session-TEST')).toBe(null);
  expect(s.currentSessionKey).toBe(null);
});

test('toggleSong adds and removes a song from myList', () => {
  s.searchResults = [{ id: 1, title: 'Song', artist: 'Artist', artwork: 'https://dzcdn.net/image.jpg', preview: null }];
  s.room.config.songsPerPlayer = 4;
  app.toggleSong(0);
  expect(s.myList).toHaveLength(1);
  expect(s.myList[0].id).toBe(1);
  app.toggleSong(0);
  expect(s.myList).toHaveLength(0);
});

test('searchItunes returns decoded JSON results when fetch succeeds', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ id: 1 }] }) });
  await expect(app.searchItunes('hello')).resolves.toEqual([{ id: 1 }]);
});

test('searchItunes throws when fetch response is not ok', async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(app.searchItunes('hello')).rejects.toThrow('search 500');
});
