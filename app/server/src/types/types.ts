export type Phase = "lobby" | "submitting" | "ready" | "playing" | "reveal" | "finished";

export type Song = {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  preview: string | null;
};

export type Player = {
  id: string | null;
  token: string;
  name: string;
  ready: boolean;
  songCount: number;
  guess: string | null;
  score: number;
};

export type Submission = {
  playerId: string;
  playerName: string;
  song: Song;
};

export type RoomConfig = {
  songsPerPlayer: number;
};

export type Room = {
  code: string;
  hostId: string | null;
  hostName: string | null;
  hostToken: string | null;
  phase: Phase;
  config: RoomConfig;
  players: Player[];
  submissions: Submission[];
  playlist: Submission[];
  remainingPlaylist: Submission[];
  playedCount: number;
  currentSong: Submission | null;
  cleanupTimer: NodeJS.Timeout | null;
  hostTransferTimer: NodeJS.Timeout | null;
};

export type PublicPlayer = Omit<Player, "token">;

export type PublicRoom = Omit<
  Room,
  "submissions" | "playlist" | "remainingPlaylist" | "currentSong" | "cleanupTimer" | "hostTransferTimer" | "hostToken" | "players"
> & { players: PublicPlayer[] };
