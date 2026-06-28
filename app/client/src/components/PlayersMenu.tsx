import { useState } from "react";
import type { Player } from "../types/game";

type PlayersMenuProps = {
  players: Player[];
  hostId: string | null;
  isHost: boolean;
  myName: string;
  onKick: (name: string) => void;
};

export function PlayersMenu({ players, hostId, isHost, myName, onKick }: PlayersMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="players-menu">
      <button
        aria-expanded={open}
        className="players-menu-toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="material-symbols-outlined">group</span>
        Joueurs ({players.length})
        <span className="material-symbols-outlined chevron">{open ? "expand_less" : "expand_more"}</span>
      </button>

      {open ? (
        <div className="players-menu-list">
          {players.map((player) => {
            const isMe = player.name === myName;
            const isThisHost = player.id !== null && player.id === hostId;
            return (
              <div className="player-entry" key={player.name}>
                <span className="player-entry-name">
                  {player.name}
                  {isMe ? <span className="muted"> (moi)</span> : null}
                  {isThisHost ? (
                    <span className="host-crown" title="Hôte">
                      <span className="material-symbols-outlined">military_tech</span>
                    </span>
                  ) : null}
                </span>
                <span className="player-entry-side">
                  {player.id === null ? (
                    <span className="status-pill is-off">Déconnecté</span>
                  ) : player.ready ? (
                    <span className="status-pill is-ready">Prêt</span>
                  ) : (
                    <span className="status-pill">En cours</span>
                  )}
                  {isHost && !isMe ? (
                    <button
                      aria-label={`Retirer ${player.name}`}
                      className="icon-btn is-remove"
                      onClick={() => onKick(player.name)}
                      title={`Retirer ${player.name}`}
                      type="button"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
