import { HostResetButton } from "../components/HostResetButton";
import { LeaveButton } from "../components/LeaveButton";
import { PlayersMenu } from "../components/PlayersMenu";
import { SongItem } from "../components/SongItem";
import type { Room, Song } from "../types/game";

type SubmittingProps = {
  isHost: boolean;
  isSearching: boolean;
  kickPlayer: (name: string) => void;
  leaveGame: () => void;
  myList: Song[];
  name: string;
  neededSongs: number;
  onSearch: (value: string) => void;
  previewingId: number | null;
  query: string;
  restartGame: () => void;
  results: Song[];
  room: Room;
  searchError: string;
  submitMySongs: () => void;
  togglePreview: (song: Song) => void;
  toggleSong: (song: Song) => void;
};

export function Submitting({
  isHost,
  isSearching,
  kickPlayer,
  leaveGame,
  myList,
  name,
  neededSongs,
  onSearch,
  previewingId,
  query,
  restartGame,
  results,
  room,
  searchError,
  submitMySongs,
  togglePreview,
  toggleSong,
}: SubmittingProps) {
  const isDone = myList.length === neededSongs;

  return (
    <main className="app-shell">
      <section className="screen">
        <div className="row-between">
          <div>
            <h2 className="ui-heading">{name}</h2>
            <p className="ui-meta">
              {myList.length} / {neededSongs} musiques
            </p>
          </div>
          <span className="badge">
            {myList.length}/{neededSongs}
          </span>
        </div>

        <PlayersMenu
          hostId={room.hostId}
          isHost={isHost}
          myName={name}
          onKick={kickPlayer}
          players={room.players}
        />

        <div className="info-box">Les autres ne voient pas ce que tu ajoutes</div>

        <div className="card">
          <label className="section-label" htmlFor="search-input">
            Rechercher une musique
          </label>
          <input
            autoComplete="off"
            className="input"
            id="search-input"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Titre, artiste..."
            type="search"
            value={query}
          />
          <div className="scroll-list search-results">
            <SearchResults
              isSearching={isSearching}
              myList={myList}
              previewingId={previewingId}
              query={query}
              results={results}
              searchError={searchError}
              togglePreview={togglePreview}
              toggleSong={toggleSong}
            />
          </div>
        </div>

        {myList.length ? (
          <div className="card">
            <span className="section-label">
              Ma liste <span className="badge">{myList.length}</span>
            </span>
            <div className="scroll-list">
              {myList.map((song) => (
                <SongItem
                  action={
                    <button className="icon-btn is-remove" onClick={() => toggleSong(song)} title="Retirer" type="button">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  }
                  key={song.id}
                  song={song}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="spacer" />
        <button className={`btn btn-primary btn-lg ${isDone ? "btn-pulse" : ""}`} disabled={!isDone} onClick={submitMySongs} type="button">
          {isDone ? "Valider mes musiques" : `Ajoute encore ${neededSongs - myList.length} musique${neededSongs - myList.length > 1 ? "s" : ""}`}
        </button>
        <HostResetButton isHost={isHost} restartGame={restartGame} />
        <LeaveButton onLeave={leaveGame} variant="full" />
      </section>
    </main>
  );
}

type SearchResultsProps = Pick<
  SubmittingProps,
  "isSearching" | "myList" | "previewingId" | "query" | "results" | "searchError" | "togglePreview" | "toggleSong"
>;

function SearchResults({ isSearching, myList, previewingId, query, results, searchError, togglePreview, toggleSong }: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className="search-hint">
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (searchError) return <div className="search-hint error-text">{searchError}</div>;

  if (results.length) {
    return results.map((song) => {
      const added = myList.some((item) => item.id === song.id);
      const playing = previewingId === song.id;
      return (
        <SongItem
          action={
            <button className={`icon-btn ${added ? "is-remove" : "is-add"}`} onClick={() => toggleSong(song)} type="button">
              {added ? "-" : "+"}
            </button>
          }
          key={song.id}
          secondaryAction={
            song.preview ? (
              <button className="icon-btn is-play" onClick={() => togglePreview(song)} title={playing ? "Pause" : "Lecture"} type="button">
                <span className="material-symbols-outlined">{playing ? "pause" : "play_arrow"}</span>
              </button>
            ) : null
          }
          song={song}
        />
      );
    });
  }

  if (query) return <div className="search-hint">Aucun résultat pour « {query} »</div>;
  return <div className="search-hint">Tape le titre ou l'artiste</div>;
}
