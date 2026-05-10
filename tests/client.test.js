const { sanitizeLocal, esc } = require('../client-utils');

describe('Client Utils', () => {
  test('sanitizeLocal removes HTML and trims', () => {
    expect(sanitizeLocal('<script>')).toBe('script');
    expect(sanitizeLocal('  hello  ')).toBe('hello');
    expect(sanitizeLocal('a'.repeat(30))).toBe('a'.repeat(20));
  });

  test('esc escapes HTML entities', () => {
    expect(esc('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
    expect(esc('normal text')).toBe('normal text');
  });
});

// Mock localStorage for session tests
const localStorageMock = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; },
  get keys() { return Object.keys(this.store); }
};
global.localStorage = localStorageMock;

// Mock s object
const s = {
  currentSessionKey: null,
  me: { name: '' },
  room: null
};

describe('Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
    s.currentSessionKey = null;
    s.me.name = '';
    s.room = null;
  });

  test('persistSession sets key and stores data', () => {
    s.room = { code: 'ABCD' };
    s.me.name = 'Test';
    persistSession();
    expect(s.currentSessionKey).toBe('guess-song-session-ABCD');
    expect(localStorage.getItem('guess-song-session-ABCD')).toBe(JSON.stringify({ code: 'ABCD', name: 'Test' }));
  });

  test('clearSession removes current key', () => {
    s.currentSessionKey = 'guess-song-session-ABCD';
    localStorage.setItem('guess-song-session-ABCD', 'data');
    clearSession();
    expect(localStorage.getItem('guess-song-session-ABCD')).toBe(null);
    expect(s.currentSessionKey).toBe(null);
  });
});

// Define the functions for testing
function persistSession() {
  if (!s.room?.code || !s.me.name) return;
  try {
    const key = 'guess-song-session-' + s.room.code;
    s.currentSessionKey = key;
    localStorage.setItem(key, JSON.stringify({
      code: s.room.code,
      name: s.me.name,
    }));
  } catch (_) { }
}

function clearSession() {
  try {
    if (s.currentSessionKey) {
      localStorage.removeItem(s.currentSessionKey);
      s.currentSessionKey = null;
    }
  } catch (_) { }
}

function hydrateLocalSession() {
  try {
    const keys = Object.keys(localStorage.store).filter(k => k.startsWith('guess-song-session-'));
    if (keys.length === 0) return;
    const key = keys[keys.length - 1];
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.name) s.me.name = sanitizeLocal(data.name);
    s.currentSessionKey = key;
  } catch (_) { }
}