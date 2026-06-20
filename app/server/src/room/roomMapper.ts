import type { PublicPlayer, PublicRoom, Room } from "../types/types.js";

function toPublicPlayer(player: Room["players"][number]): PublicPlayer {
  const { token: _token, ...rest } = player;
  return rest;
}

export function roomPublic(room: Room): PublicRoom {
  const players =
    room.phase === "lobby"
      ? room.players
          .filter((player) => player.id !== null)
          .map(toPublicPlayer)
      : room.players.map((player) => ({
          ...toPublicPlayer(player),
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
