import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { getSavage, savageWaiting } from "./savageFeedback";

interface LobbyScreenProps {
  players: any[];
  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  joinGame: () => void;
  isSubmitting: boolean;
  startGame: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  offlineBanner: React.ReactNode;
}

const socket = io();

const LobbyScreen: React.FC<LobbyScreenProps> = ({
  playerId,
  playerName,
  setPlayerName,
  joinGame,
  isSubmitting,
  startGame,
  inputRef,
  offlineBanner,
}) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [waitingMsg, setWaitingMsg] = useState(getSavage(savageWaiting));

  useEffect(() => {
    socket.on("game:update", (game: any) => {
      setPlayers(game.players || []);
      if (game.state === "LOBBY" && game.players.length > 0) {
        setWaitingMsg(getSavage(savageWaiting));
      }
    });
    return () => {
      socket.off("game:update");
    };
  }, []);

  const hasJoined = players.some((p) => p.id === playerId);
  const spectatingPlayers = players.filter((p) => p.id !== playerId);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {offlineBanner}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-28%] left-[6%] w-[400px] h-[400px] bg-[rgba(34,211,238,0.08)] blur-[190px]" />
        <div className="absolute bottom-[-38%] right-[8%] w-[460px] h-[460px] bg-[rgba(244,63,94,0.11)] blur-[210px]" />
      </div>

      <div className="max-w-5xl w-full grid gap-8 md:grid-cols-[1.2fr_0.8fr] relative z-10">
        <section className="surface h-full flex flex-col justify-between gap-8">
          <header className="space-y-4 text-left">
            <span className="pill">Lobby · Assemble Your Survivors</span>
            <h1 className="heading text-5xl tracking-[0.18em]">
              Murder Party Lobby
            </h1>
            <p className="text-base text-[rgba(203,213,225,0.75)] leading-relaxed max-w-lg">
              Claim a codename, brace for spite, and wait for the host to pull
              the lever. Three lives, zero mercy. Lobby voice channel is
              currently muted for everyone&apos;s safety.
            </p>
          </header>

          {!hasJoined ? (
            <div className="glass p-6 rounded-[22px] border border-[rgba(148,163,184,0.18)] space-y-5 fade-in">
              <label className="flex flex-col text-left gap-2">
                <span className="uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
                  Codename
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Minimum chaos, maximum flair"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && joinGame()}
                  maxLength={20}
                  autoFocus
                />
              </label>
              <button
                onClick={joinGame}
                disabled={!playerName.trim() || isSubmitting}
                className="btn-primary w-full justify-center py-3"
              >
                {isSubmitting ? "Connecting..." : "Join The Lobby"}
              </button>
              <p className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.6)] text-center">
                No duplicates · No anonymous ghosts · No take-backs
              </p>
            </div>
          ) : (
            <div className="glass p-6 rounded-[22px] border border-[rgba(148,163,184,0.16)] space-y-6 fade-in">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                  <span className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
                    You Are Locked In
                  </span>
                  <h2 className="heading text-3xl mt-1">{playerName}</h2>
                  <p className="text-sm text-[rgba(203,213,225,0.75)]">
                    Stay connected. Disconnects forfeit your spot.
                  </p>
                </div>
                <span className="score-pill">
                  <span className="w-2 h-2 rounded-full bg-[rgba(34,211,238,0.8)]" />
                  Ready for carnage
                </span>
              </div>

              <div className="divider" />
              <div className="space-y-4">
                <h3 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
                  Survivors in Lobby ({players.length}/8)
                </h3>
                <ul className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {players.map((player, index) => {
                    const isSelf = player.id === playerId;
                    return (
                      <li
                        key={player.id}
                        className={`flex items-center gap-4 rounded-[18px] border px-4 py-3 transition-all duration-200 ${
                          isSelf
                            ? "border-[rgba(34,211,238,0.5)] bg-[rgba(34,211,238,0.08)]"
                            : "border-[rgba(148,163,184,0.12)] bg-[rgba(9,12,23,0.6)]"
                        }`}
                      >
                        <span className="heading text-2xl text-[rgba(244,63,94,0.85)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold tracking-wide text-[rgba(226,232,240,0.92)]">
                            {player.name} {isSelf && <span>· you</span>}
                          </p>
                          <p className="text-xs uppercase tracking-[0.22em] text-[rgba(148,163,184,0.6)]">
                            {player.lives || 3} lives ·{" "}
                            {isSelf ? "host privileges active" : "standing by"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: player.lives || 3 }).map(
                            (_, idx) => (
                              <span
                                key={idx}
                                className="w-2.5 h-6 rounded-full bg-[rgba(244,63,94,0.4)] border border-[rgba(244,63,94,0.65)]"
                              />
                            )
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="divider" />
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="text-sm text-[rgba(203,213,225,0.7)] max-w-md">
                  <strong className="text-[rgba(244,63,94,0.85)] font-semibold mr-1">
                    Lobby Intel:
                  </strong>
                  {waitingMsg}
                </div>
                {players.length >= 1 && (
                  <button
                    onClick={startGame}
                    disabled={isSubmitting}
                    className="btn-primary min-w-[220px] justify-center"
                  >
                    {isSubmitting ? "Spinning Up..." : "Launch Murder Party"}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="surface glass h-full flex flex-col justify-between gap-6">
          <div>
            <h2 className="heading text-3xl tracking-[0.18em] mb-4">
              Pre-Game Checklist
            </h2>
            <ul className="space-y-4 text-sm text-[rgba(203,213,225,0.75)]">
              <li className="flex gap-3 items-start">
                <span className="mt-1 w-2 h-2 rounded-full bg-[rgba(34,211,238,0.7)]" />
                Pick a codename with plausible deniability.
              </li>
              <li className="flex gap-3 items-start">
                <span className="mt-1 w-2 h-2 rounded-full bg-[rgba(244,63,94,0.7)]" />
                Confirm your mic is muted; chaos only happens on screen.
              </li>
              <li className="flex gap-3 items-start">
                <span className="mt-1 w-2 h-2 rounded-full bg-[rgba(251,191,36,0.7)]" />
                Brag about how you&apos;ll win. Screenshots for later.
              </li>
            </ul>
          </div>

          <div className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] p-5 space-y-4">
            <h3 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
              Waiting Room Mood
            </h3>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="text-xs uppercase tracking-[0.28em] text-[rgba(148,163,184,0.7)]">
                  Connected
                </span>
                <span className="heading text-3xl">{players.length}</span>
              </div>
              <div className="stat-card">
                <span className="text-xs uppercase tracking-[0.28em] text-[rgba(148,163,184,0.7)]">
                  Spectating
                </span>
                <span className="heading text-3xl">
                  {spectatingPlayers.length}
                </span>
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-[rgba(148,163,184,0.55)]">
              Start when everyone&apos;s present. We roast absent players by
              default.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LobbyScreen;
