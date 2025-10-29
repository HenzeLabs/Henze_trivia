import React from "react";
import {
  getSavage,
  savageCorrect,
  savageWrong,
  savageWaiting,
} from "./savageFeedback";

interface ResultsScreenProps {
  players: any[];
  ghosts: string[];
  scores: any;
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl bg-gray-900/90 border-4 border-red-600 rounded-3xl p-12 shadow-2xl shadow-red-900/50">
        {offlineBanner}
        <h1 className="heading text-6xl md:text-7xl text-center text-red-500 mb-12 uppercase tracking-wide">
          FINAL RESULTS
        </h1>
        <div className="text-center mb-12">
          <div className="text-4xl text-white mb-4 font-black">{winner?.name}</div>
          <div className="text-2xl text-red-400 font-bold uppercase tracking-wide">
            {winner
              ? `${winner.score} POINTS - ${getSavage(savageCorrect)}`
              : getSavage(savageWrong)}
          </div>
        </div>
        <div className="flex flex-col w-full gap-3 mb-12">
          {sortedPlayers.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-6 rounded-2xl font-bold border-4 text-xl ${
                i === 0
                  ? "bg-red-700/50 text-white border-red-400 shadow-lg shadow-red-500/30"
                  : player.isDead
                  ? "bg-gray-800/30 text-gray-600 border-gray-800"
                  : player.id === playerId
                  ? "bg-red-900/40 text-white border-red-600"
                  : "bg-gray-800/50 text-gray-200 border-gray-700"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-base uppercase tracking-widest">
                  {i === 0
                    ? "WINNER"
                    : player.isDead
                    ? "ELIMINATED"
                    : `#${i + 1}`}
                </span>
                <span className="text-2xl font-black">
                  {player.name}
                  {player.id === playerId && <span className="text-red-400"> (YOU)</span>}
                </span>
              </div>
              <div className="text-lg font-black">
                {player.score} PTS
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={resetGame}
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting
            ? "RESETTING..."
            : "PLAY AGAIN"}
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
