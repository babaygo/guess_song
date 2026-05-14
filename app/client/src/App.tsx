import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SESSION_PREFIX } from "./constants/game";
import { Home } from "./pages/Home";
import { Lobby } from "./pages/Lobby";
import { Submitting } from "./pages/Submitting";
import { Waiting } from "./pages/Waiting";
import { Ready } from "./pages/Ready";
import { Playing } from "./pages/Playing";
import { Reveal } from "./pages/Reveal";
import { Finished } from "./pages/Finished";
import { searchSongs } from "./services/songSearch";
import { emitWithAck } from "./services/socketEvents";
import { socket } from "./types/socket";
import type {
  CurrentSong,
  LeaderboardItem,
  Phase,
  RevealData,
  Room,
  ServerResponse,
  Song,
} from "./types/game";
import { sanitizeCode, sanitizeName } from "./utils/sanitize";

function parseStoredSession(value: string | null) {
  try {
    return JSON.parse(value || "{}") as { code?: string; name?: string; ts?: number };
  } catch {
    return {};
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("home");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState("");
  const [myList, setMyList] = useState<Song[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [currentSong, setCurrentSong] = useState<CurrentSong | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionKeyRef = useRef<string | null>(null);
  const searchTimerRef = useRef<number | null>(null);

  const activePlayers = useMemo(
    () => room?.players.filter((player) => player.id !== null) ?? [],
    [room],
  );
  const neededSongs = room?.config.songsPerPlayer ?? 4;

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPreviewingId(null);
  }, []);

  const persistSession = useCallback((nextRoom: Room, nextName: string) => {
    const key = `${SESSION_PREFIX}${nextRoom.code}`;
    sessionKeyRef.current = key;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ code: nextRoom.code, name: nextName, ts: Date.now() }),
      );
    } catch {
      sessionKeyRef.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      if (sessionKeyRef.current) localStorage.removeItem(sessionKeyRef.current);
    } catch {
      // Ignore storage cleanup failures; the server-side leave still matters most.
    }
    sessionKeyRef.current = null;
  }, []);

  const leaveGame = useCallback(() => {
    if (room) socket.emit("leaveRoom", { code: room.code });
    stopAudio();
    clearSession();
    setRoom(null);
    setIsHost(false);
    setPhase("home");
  }, [clearSession, room, stopAudio]);

  const applyReconnectPayload = useCallback(
    (response: ServerResponse, cleanName: string) => {
      if (!response.room) return;
      setName(cleanName);
      setRoom(response.room);
      setIsHost(Boolean(response.isHost));
      setPhase(response.phase ?? response.room.phase);
      setCurrentSong(response.currentSong ?? null);
      setReveal(
        response.reveal
          ? { ...response.reveal, results: response.revealResults }
          : null,
      );
      setLeaderboard(response.leaderboard ?? []);
      persistSession(response.room, cleanName);
    },
    [persistSession],
  );

  useEffect(() => {
    const handleRoomUpdate = (nextRoom: Room) => {
      setRoom(nextRoom);
      setIsHost(
        Boolean(nextRoom.hostId && socket.id && nextRoom.hostId === socket.id),
      );
    };
    const handlePhaseChange = ({
      phase: nextPhase,
    }: {
      phase: Room["phase"];
    }) => {
      if (nextPhase === "submitting") {
        setMyList([]);
        setResults([]);
        setQuery("");
      }
      if (nextPhase === "playing") stopAudio();
      setPhase(nextPhase);
    };
    const handleSongUpdate = (song: CurrentSong) => {
      stopAudio();
      setCurrentSong(song);
      setGuess(null);
      setReveal(null);
      setPhase("playing");
    };
    const handleReveal = (data: RevealData) => {
      stopAudio();
      setReveal(data);
      setPhase("reveal");
    };
    const handleRevealResults = ({
      results: nextResults,
    }: {
      results: RevealData["results"];
    }) => {
      setReveal((previous) =>
        previous ? { ...previous, results: nextResults } : previous,
      );
    };
    const handleLeaderboard = ({
      leaderboard: nextLeaderboard,
    }: {
      leaderboard: LeaderboardItem[];
    }) => {
      setLeaderboard(nextLeaderboard);
      setPhase("finished");
    };
    const handleDisconnect = () => {
      setError("Connexion perdue. Recharge la page si elle ne revient pas.");
    };
    const handleConnect = () => {
      setError("");
    };

    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("phaseChange", handlePhaseChange);
    socket.on("songUpdate", handleSongUpdate);
    socket.on("reveal", handleReveal);
    socket.on("revealResults", handleRevealResults);
    socket.on("leaderboard", handleLeaderboard);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("phaseChange", handlePhaseChange);
      socket.off("songUpdate", handleSongUpdate);
      socket.off("reveal", handleReveal);
      socket.off("revealResults", handleRevealResults);
      socket.off("leaderboard", handleLeaderboard);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
    };
  }, [stopAudio]);

  useEffect(() => {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(SESSION_PREFIX),
    );
    const lastKey = keys
      .map((key) => ({
        key,
        ts: parseStoredSession(localStorage.getItem(key)).ts ?? 0,
      }))
      .sort((left, right) => right.ts - left.ts)[0]?.key;
    if (!lastKey) return;

    sessionKeyRef.current = lastKey;
    const saved = parseStoredSession(localStorage.getItem(lastKey));
    const cleanName = sanitizeName(saved.name ?? "");
    const code = sanitizeCode(saved.code ?? "");
    if (!cleanName || !code) return;

    let active = true;
    emitWithAck<ServerResponse>("reconnectRoom", {
      code,
      name: cleanName,
    }).then((response) => {
      if (!active) return;
      if (!response?.ok) {
        clearSession();
        return;
      }
      applyReconnectPayload(response, cleanName);
    });

    return () => {
      active = false;
    };
  }, [applyReconnectPayload, clearSession]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      stopAudio();
    };
  }, [stopAudio]);

  useEffect(() => {
    if (phase !== "playing" || !isHost || !currentSong?.song.preview) return;
    const audio = new Audio(currentSong.song.preview);
    audio.volume = 0.8;
    audioRef.current = audio;
    audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audio.onended = null;
      audio.src = "";
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [currentSong, isHost, phase]);

  const createRoom = async () => {
    const cleanName = sanitizeName(name);
    if (!cleanName) {
      setError("Entre ton pseudo !");
      return;
    }

    const response = await emitWithAck<ServerResponse>("createRoom", {
      name: cleanName,
      config: { songsPerPlayer: 4 },
    });
    if (!response.ok || !response.room) {
      setError(response.error ?? "Erreur création salle.");
      return;
    }

    setName(cleanName);
    setRoom(response.room);
    setIsHost(true);
    setPhase("lobby");
    setError("");
    persistSession(response.room, cleanName);
  };

  const joinRoom = async (event?: FormEvent) => {
    event?.preventDefault();
    const cleanName = sanitizeName(name);
    const code = sanitizeCode(joinCode);
    if (!cleanName) {
      setError("Entre ton pseudo !");
      return;
    }
    if (code.length !== 6) {
      setError("Entre le code à 6 caractères.");
      return;
    }

    const response = await emitWithAck<ServerResponse>("joinRoom", {
      code,
      name: cleanName,
    });
    if (!response.ok || !response.room) {
      setError(response.error ?? "Impossible de rejoindre cette partie.");
      return;
    }

    applyReconnectPayload(response, cleanName);
    setError("");
  };

  const updateConfig = (songsPerPlayer: number) => {
    if (!room || !isHost) return;
    socket.emit("updateConfig", {
      code: room.code,
      config: { songsPerPlayer },
    });
  };

  const startSubmission = () =>
    room && isHost && socket.emit("startSubmission", { code: room.code });
  const launchGame = () =>
    room && isHost && socket.emit("launchGame", { code: room.code });
  const revealSong = () =>
    room && isHost && socket.emit("revealSong", { code: room.code });
  const nextSong = () =>
    room && isHost && socket.emit("nextSong", { code: room.code });
  const restartGame = () =>
    room && isHost && socket.emit("restartGame", { code: room.code });

  const onSearch = (value: string) => {
    const nextQuery = value.trim();
    setQuery(nextQuery);
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);

    if (nextQuery.length < 2) {
      setResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError("");
    searchTimerRef.current = window.setTimeout(() => {
      searchSongs(nextQuery)
        .then(setResults)
        .catch(() => {
          setResults([]);
          setSearchError("Erreur réseau. Réessayez.");
        })
        .finally(() => setIsSearching(false));
    }, 450);
  };

  const togglePreview = (song: Song) => {
    if (!song.preview) return;
    if (previewingId === song.id) {
      stopAudio();
      return;
    }

    stopAudio();
    const audio = new Audio(song.preview);
    audio.volume = 0.8;
    audioRef.current = audio;
    setPreviewingId(song.id);
    audio.onended = () => setPreviewingId(null);
    audio.play().catch(() => undefined);
  };

  const toggleSong = (song: Song) => {
    setMyList((list) => {
      if (list.some((item) => item.id === song.id))
        return list.filter((item) => item.id !== song.id);
      if (list.length >= neededSongs) return list;
      return [...list, song];
    });
  };

  const submitMySongs = async () => {
    if (!room || myList.length !== neededSongs) return;
    const response = await emitWithAck<ServerResponse>("submitSongs", {
      code: room.code,
      songs: myList,
    });
    if (!response.ok) {
      setError(response.error ?? "Erreur envoi.");
      return;
    }
    setPhase("waiting");
  };

  const makeGuess = (playerName: string) => {
    if (!room) return;
    setGuess(playerName);
    socket.emit("submitGuess", { code: room.code, guess: playerName });
  };

  const copyRoomCode = () => {
    if (room?.code)
      navigator.clipboard?.writeText(room.code).catch(() => undefined);
  };

  const toggleHostPlayback = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) audioRef.current.play().catch(() => undefined);
    else audioRef.current.pause();
  };

  if (phase === "home") {
    return (
      <Home
        createRoom={createRoom}
        error={error}
        joinCode={joinCode}
        joinRoom={joinRoom}
        name={name}
        setJoinCode={setJoinCode}
        setName={setName}
      />
    );
  }

  if (!room) return null;

  if (phase === "lobby") {
    return (
      <Lobby
        copyRoomCode={copyRoomCode}
        isHost={isHost}
        leaveGame={leaveGame}
        name={name}
        room={room}
        startSubmission={startSubmission}
        updateConfig={updateConfig}
      />
    );
  }

  if (phase === "submitting") {
    return (
      <Submitting
        isSearching={isSearching}
        leaveGame={leaveGame}
        myList={myList}
        name={name}
        neededSongs={neededSongs}
        onSearch={onSearch}
        previewingId={previewingId}
        query={query}
        results={results}
        searchError={searchError}
        submitMySongs={submitMySongs}
        togglePreview={togglePreview}
        toggleSong={toggleSong}
      />
    );
  }

  if (phase === "waiting")
    return <Waiting leaveGame={leaveGame} room={room} />;

  if (phase === "ready")
    return (
      <Ready
        isHost={isHost}
        launchGame={launchGame}
        leaveGame={leaveGame}
        neededSongs={neededSongs}
        room={room}
      />
    );

  if (phase === "playing" && currentSong) {
    return (
      <Playing
        activePlayers={activePlayers}
        currentSong={currentSong}
        guess={guess}
        isHost={isHost}
        leaveGame={leaveGame}
        makeGuess={makeGuess}
        revealSong={revealSong}
        toggleHostPlayback={toggleHostPlayback}
      />
    );
  }

  if (phase === "reveal" && reveal && currentSong) {
    return (
      <Reveal
        currentSong={currentSong}
        isHost={isHost}
        leaveGame={leaveGame}
        nextSong={nextSong}
        reveal={reveal}
      />
    );
  }

  return (
    <Finished
      isHost={isHost}
      leaderboard={leaderboard}
      leaveGame={leaveGame}
      name={name}
      restartGame={restartGame}
    />
  );
}
