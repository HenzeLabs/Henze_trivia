import React from "react";
import { getSavage, savageCorrect, savageWrong } from "./savageFeedback";

interface FinalScreenProps {
  winner: any;
  scores: Record<string, number>;
  alivePlayers: any[];
  gameToken: string;
  socketRef: React.MutableRefObject<any>;
  setError: (err: string) => void;
  offlineBanner: React.ReactNode;
}

const FinalScreen: React.FC<FinalScreenProps> = ({
  winner,
  scores,
  alivePlayers,
  gameToken,
  socketRef,
  setError,
  offlineBanner,
}) => {
  const handleDetermineWinner = () => {
    if (!socketRef.current) return;
    socketRef.current.emit(
      "player:final",
      { token: gameToken },
      (data: any) => {
        if (!data.success) {
          setError(data.error || "Failed to determine winner");
        }
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-14 relative overflow-hidden">
      {offlineBanner}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-28%] left-[15%] w-[420px] h-[420px] bg-[rgba(34,211,238,0.12)] blur-[210px]" />
        <div className="absolute bottom-[-30%] right-[10%] w-[460px] h-[460px] bg-[rgba(244,63,94,0.12)] blur-[200px]" />
      </div>

      <div className="surface max-w-4xl w-full space-y-8 relative z-10">
        <header className="text-center space-y-4">
          <span className="pill">Finale · Sudden Death Ritual</span>
          <h1 className="heading text-5xl tracking-[0.22em] glow-text">
            Final Escape
          </h1>
          <p className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.7)]">
            If a winner isn&apos;t crowned, chaos continues until morale
            improves.
          </p>
        </header>

        <section className="glass rounded-[24px] border border-[rgba(148,163,184,0.16)] p-8 space-y-6">
          {winner ? (
            <div className="space-y-4 text-center">
              <p className="subtitle uppercase tracking-[0.28em] text-xs text-[rgba(148,163,184,0.75)]">
                Survivor Identified
              </p>
              <h2 className="heading text-4xl tracking-[0.18em] text-[rgba(244,63,94,0.85)]">
                {winner.name}
              </h2>
              <p className="text-base text-[rgba(226,232,240,0.85)]">
                {scores[winner.id] || 0} pts · {getSavage(savageCorrect)}
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="subtitle uppercase tracking-[0.28em] text-xs text-[rgba(148,163,184,0.75)]">
                Survivors Still Standing
              </p>
              <p className="text-sm text-[rgba(203,213,225,0.75)] max-w-2xl mx-auto">
                No one has escaped yet. The arena demands one final decision.
                {getSavage(savageWrong)}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {alivePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="glass rounded-[18px] border border-[rgba(148,163,184,0.16)] px-4 py-4 text-left space-y-1"
                  >
                    <h3 className="heading text-2xl tracking-[0.16em]">
                      {player.name}
                    </h3>
                    <p className="text-sm text-[rgba(203,213,225,0.7)]">
                      {scores[player.id] || 0} pts · hanging on out of spite
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-sm text-[rgba(203,213,225,0.75)] max-w-lg">
            Smash the button to let the algorithm declare a winner. If it takes
            too long, it starts sacrificing alphabetically.
          </p>
          <button
            onClick={handleDetermineWinner}
            className="btn-primary min-w-[240px] justify-center"
          >
            Determine The Survivor
          </button>
        </footer>
      </div>
    </div>
  );
};

export default FinalScreen;
