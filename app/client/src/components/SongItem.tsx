import { BLANK_IMG } from "../constants/game";
import type { Song } from "../types/game";

type SongItemProps = {
  song: Song;
  action: React.ReactNode;
  secondaryAction?: React.ReactNode;
};

export function SongItem({ action, secondaryAction, song }: SongItemProps) {
  return (
    <div className="song-item">
      <img
        alt=""
        className="song-art"
        onError={(event) => {
          event.currentTarget.src = BLANK_IMG;
        }}
        src={song.artwork || BLANK_IMG}
      />
      <div className="song-info">
        <div className="song-title">{song.title}</div>
        <div className="song-artist">{song.artist}</div>
      </div>
      {secondaryAction}
      {action}
    </div>
  );
}
