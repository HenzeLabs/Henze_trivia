import React from "react";
import { getSavage, savageCorrect, savageWrong } from "./savageFeedback";

interface ResultsScreenProps {
  players: any[];
  ghosts: string[];
  scores: Record<string, number>;
  playerId: string;
  isSubmitting: boolean;
  resetGame: () => void;
  offlineBanner: React.ReactNode;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  players,
  ghosts,
  scores,
  playerId,
  isSubmitting,
  resetGame,
  offlineBanner,
}) => {
  const sortedPlayers = players
    .map((player) => ({
      ...player,
      score: scores[player.id] || 0,
      isDead: ghosts.includes(player.id),
    }))
    .sort((a, b) => b.score - a.score);

  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-14 relative overflow-hidden">
      {offlineBanner}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[10%] w-[420px] h-[420px] bg-[rgba(244,63,94,0.14)] blur-[210px]" />
        <div className="absolute bottom-[-34%] right-[12%] w-[480px] h-[480px] bg-[rgba(34,211,238,0.1)] blur-[230px]" />
      </div>

      <div className="max-w-5xl w-full space-y-8 relative z-10">
        <header className="surface text-center space-y-6">
          <span className="pill">Game Complete · Survivors Accounted For</span>
          <h1 className="heading text-6xl tracking-[0.24em] glow-text">
            Final Reckoning
          </h1>
          <p className="text-sm uppercase tracking-[0.24em] text-[rgba(148,163,184,0.7)]">
            Scores locked · ghosts archived · smack talk begins now
          </p>
          {winner ? (
            <div className="glass rounded-[24px] border border-[rgba(148,163,184,0.16)] px-8 py-6 max-w-2xl mx-auto space-y-2">
              <p className="subtitle uppercase tracking-[0.28em] text-xs text-[rgba(148,163,184,0.75)]">
                Sole Survivor
              </p>
              <h2 className="heading text-4xl tracking-[0.18em] text-[rgba(244,63,94,0.85)]">
                {winner.name}
              </h2>
              <p className="text-base text-[rgba(226,232,240,0.85)]">
                {winner.score} pts · {getSavage(savageCorrect)}
              </p>
            </div>
          ) : (
            <p className="text-base text-[rgba(226,232,240,0.8)]">
              {getSavage(savageWrong)}
            </p>
          )}
        </header>

        <section className="surface space-y-6">
          <h3 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
            Leaderboard
          </h3>
          <div className="space-y-4">
            {sortedPlayers.map((player, index) => {
              const isSelf = player.id === playerId;
              const statusLabel =
                index === 0
                  ? "Champion"
                  : player.isDead
                  ? "Ghosted"
                  : `#${index + 1}`;

              return (
                <article
                  key={player.id}
                  className={`flex items-center gap-4 rounded-[22px] border px-5 py-4 md:px-6 md:py-5 transition-all ${
                    index === 0
                      ? "border-[rgba(244,63,94,0.55)] bg-[rgba(244,63,94,0.12)] shadow-[0_22px_40px_rgba(244,63,94,0.18)]"
                      : player.isDead
                      ? "border-[rgba(148,163,184,0.08)] bg-[rgba(9,12,23,0.55)] opacity-60"
                      : isSelf
                      ? "border-[rgba(34,211,238,0.55)] bg-[rgba(34,211,238,0.12)]"
                      : "border-[rgba(148,163,184,0.12)] bg-[rgba(9,12,23,0.62)]"
                  }`}
                >
                  <div className="flex flex-col min-w-[120px] text-left">
                    <span className="subtitle uppercase tracking-[0.28em] text-xs text-[rgba(148,163,184,0.7)]">
                      {statusLabel}
                    </span>
                    <span className="heading text-2xl tracking-[0.16em]">
                      {player.name}
                      {isSelf && <span> · you</span>}
                    </span>
                  </div>
                  <div className="flex-1" />
                  <div className="text-right space-y-1">
                    <span className="badge">Score {player.score}</span>
                    <div className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.6)]">
                      {player.isDead ? "Eliminated" : "Survived"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="surface glass flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h4 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
              Rematch Protocol
            </h4>
            <p className="text-sm text-[rgba(203,213,225,0.75)] max-w-lg">
              Reset clears the board, restocks the question vault, and sacrifices
              the least dramatic player for good luck. Everyone rejoins the
              lobby. No skipping lines.
            </p>
          </div>
          <button
            onClick={resetGame}
            disabled={isSubmitting}
            className="btn-primary min-w-[220px] justify-center"
          >
            {isSubmitting ? "Resetting..." : "Queue Up Another Run"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ResultsScreen;
