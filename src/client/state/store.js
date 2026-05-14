import { GAME_PHASES, BLANK_IMG } from '../../shared/constants.js';

// State management simple avec observer pattern
class Store {
  constructor() {
    this.state = {
      socket: null,
      me: { name: '', isHost: false },
      room: null,
      phase: GAME_PHASES.HOME,
      currentSessionKey: null,

      // Submission
      myList: [],
      searchResults: [],
      searchQuery: '',
      searchDebounce: null,
      isSearching: false,
      searchError: null,
      previewingId: null,

      // Playing
      currentSong: null,
      audio: null,
      guess: null,

      // Reveal
      revealData: null,

      // Finished
      leaderboard: [],

      errorMsg: '',
    };

    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const store = new Store();