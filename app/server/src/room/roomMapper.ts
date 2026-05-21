import type { PublicRoom, Room } from "../types/types.js";

export function roomPublic(room: Room): PublicRoom {
  const players =
    room.phase === "lobby"
      ? room.players.filter((player) => player.id !== null)
      : room.players.map((player) => ({
          ...player,
          guess: player.guess === null ? null : "submitted",
        }));

  return {
    code: room.code,
    hostId: room.hostId,
    hostName: room.hostName,
    phase: room.phase,
    config: room.config,
    playedCount: room.playedCount,
    players,
  };
}
