import React from "react";
import {
  getSavage,
  savageCorrect,
  savageWrong,
  savageWaiting,
} from "./savageFeedback";

interface FinalScreenProps {
  winner: any;
  scores: any;
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
}) => (
  <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-8 v-gap">
    <div className="box w-full max-w-2xl flex flex-col items-center v-gap">
      {offlineBanner}
      <h1 className="heading text-4xl text-center text-red-600 mb-8">
        FINAL ESCAPE
      </h1>
      <div className="text-center mb-8">
        {winner ? (
          <div>
            <p className="subtitle text-white text-xl mb-4 font-bold">
              The winner has been determined! {getSavage(savageCorrect)}
            </p>
            <div className="box bg-red-700 text-white font-black text-xl border-none p-4 rounded-lg">
              {winner.name} - {scores[winner.id] || 0} points (try not to gloat,
              disaster)
            </div>
          </div>
        ) : (
          <div>
            <p className="subtitle text-white text-xl mb-4 font-bold">
              Only the survivors remain... {getSavage(savageWrong)}
            </p>
            <div className="flex flex-col w-full v-gap">
              {alivePlayers.map((player) => (
                <div
                  key={player.id}
                  className="box bg-[#0d0d0d] text-white font-black border-none p-3 rounded-lg"
                >
                  {player.name} - {scores[player.id] || 0} points (barely
                  hanging on)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => {
          if (socketRef.current) {
            socketRef.current.emit(
              "player:final",
              { token: gameToken },
              (data: any) => {
                if (!data.success)
                  setError(data.error || "Failed to determine winner");
              }
            );
          }
        }}
        className="btn-primary w-full text-xl font-black"
      >
        DETERMINE WINNER (let's see who gets roasted)
      </button>
    </div>
  </div>
);

export default FinalScreen;
