import { store } from './store.js';
import { GAME_PHASES } from '../../shared/constants.js';

// Actions pour modifier le state
export const actions = {
  setSocket(socket) {
    store.setState({ socket });
  },

  setMe(me) {
    store.setState({ me: { ...store.getState().me, ...me } });
  },

  setRoom(room) {
    store.setState({ room });
  },

  setPhase(phase) {
    store.setState({ phase });
  },

  setCurrentSessionKey(key) {
    store.setState({ currentSessionKey: key });
  },

  setMyList(myList) {
    store.setState({ myList });
  },

  setSearchResults(searchResults) {
    store.setState({ searchResults });
  },

  setSearchQuery(searchQuery) {
    store.setState({ searchQuery });
  },

  setSearchDebounce(debounce) {
    store.setState({ searchDebounce: debounce });
  },

  setIsSearching(isSearching) {
    store.setState({ isSearching });
  },

  setSearchError(searchError) {
    store.setState({ searchError });
  },

  setPreviewingId(previewingId) {
    store.setState({ previewingId });
  },

  setCurrentSong(currentSong) {
    store.setState({ currentSong });
  },

  setAudio(audio) {
    store.setState({ audio });
  },

  setGuess(guess) {
    store.setState({ guess });
  },

  setRevealData(revealData) {
    store.setState({ revealData });
  },

  setLeaderboard(leaderboard) {
    store.setState({ leaderboard });
  },

  setErrorMsg(errorMsg) {
    store.setState({ errorMsg });
  },

  // Actions composées
  resetSubmission() {
    store.setState({
      myList: [],
      searchResults: [],
      searchQuery: '',
      searchDebounce: null,
      isSearching: false,
      searchError: null,
      previewingId: null,
    });
  },

  resetGame() {
    store.setState({
      currentSong: null,
      audio: null,
      guess: null,
      revealData: null,
      leaderboard: [],
    });
  },
};