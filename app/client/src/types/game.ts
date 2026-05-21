export type Phase = "home" | "lobby" | "submitting" | "waiting" | "ready" | "playing" | "reveal" | "finished";

export type Song = {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  preview: string | null;
};

export type Player = {
  id: string | null;
  name: string;
  ready: boolean;
  songCount: number;
  guess: string | null;
  score: number;
};

export type Room = {
  code: string;
  phase: Exclude<Phase, "home" | "waiting">;
  config: { songsPerPlayer: number };
  hostId: string | null;
  hostName: string | null;
  playedCount: number;
  players: Player[];
};

export type CurrentSong = {
  index: number;
  total: number;
  song: Song;
};

export type RevealData = {
  playerName: string;
  song: Song;
  results?: Array<{ playerName: string; correct: boolean }>;
};

export type LeaderboardItem = {
  name: string;
  score: number;
};

export type ServerResponse = {
  ok?: boolean;
  error?: string;
  room?: Room;
  isHost?: boolean;
  phase?: Room["phase"];
  currentSong?: CurrentSong;
  reveal?: RevealData;
  revealResults?: RevealData["results"];
  leaderboard?: LeaderboardItem[];
};
