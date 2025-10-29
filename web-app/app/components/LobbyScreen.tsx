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
  inputRef: React.RefObject<HTMLInputElement>;
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

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-8 v-gap">
      <div className="box w-full max-w-md flex flex-col items-center v-gap">
        <div className="text-center">
          {offlineBanner}
          <h1 className="heading text-4xl text-red-600 mb-6 text-center">
            MURDER PARTY
          </h1>
          <p className="subtitle text-lg text-red-600 mb-8 text-center">
            Answer wrong = lose a life!
          </p>
          {!players.find((p) => p.id === playerId) ? (
            <div className="flex flex-col items-center w-full v-gap">
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && joinGame()}
                maxLength={20}
                className="w-full max-w-[300px] text-lg text-white border-b-2 border-[rgba(255,255,255,0.1)] focus:border-[#e50914] bg-transparent px-2 py-3 outline-none transition-colors duration-200 font-medium"
                autoFocus
              />
              <button
                onClick={joinGame}
                disabled={!playerName.trim() || isSubmitting}
                className="btn-primary mt-2"
              >
                {isSubmitting ? "ENTERING..." : "JOIN GAME"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full v-gap">
              <h2 className="heading text-xl text-red-600 mb-2 text-center">
                PLAYERS ({players.length})
              </h2>
              <div className="subtitle text-red-400 font-bold mb-4 text-center">
                The roast begins the moment you join. No mercy.
              </div>
              <div className="flex flex-col w-full v-gap">
                {players.map((player, i) => {
                  const rankLabel = i === 0 ? "#1 (Alpha Clown)" : `${i + 1}.`;
                  return (
                    <div
                      key={player.id}
                      className={`box flex items-center gap-4 transition-all duration-300 ${
                        player.id === playerId
                          ? "border-red-600 bg-red-600 text-white scale-105 shadow-xl"
                          : "border-[rgba(255,255,255,0.1)] bg-[#0d0d0d] text-red-600"
                      }`}
                    >
                      <span className="font-bold text-red-400 mr-2">
                        {rankLabel}
                      </span>
                      <span className="text-2xl font-bold">{player.name}</span>
                      {player.id === playerId && (
                        <span className="text-red-600 font-bold ml-2">
                          (YOU)
                        </span>
                      )}
                      <span className="ml-auto flex gap-1">
                        {[...Array(player.lives || 3)].map((_, idx) => (
                          <span key={idx} className="text-red-600 text-xl">
                            ❤️
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="box w-full mt-6 text-center animate-pulse border-2 border-red-600 bg-black">
                <p className="text-red-600 font-black text-2xl tracking-wide">
                  {waitingMsg}
                </p>
              </div>
              {players.length >= 1 && (
                <button
                  onClick={startGame}
                  disabled={isSubmitting}
                  className="btn-primary mt-8"
                >
                  {isSubmitting ? "STARTING..." : "START GAME"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
