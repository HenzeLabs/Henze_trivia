"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import WelcomeScreen from "./components/WelcomeScreen";

const QuestionScreen = dynamic(() => import("./components/QuestionScreen"), {
  loading: () => (
    <div className="text-center text-xl text-red-300">Loading question…</div>
  ),
  ssr: false,
});
const ResultsScreen = dynamic(() => import("./components/ResultsScreen"), {
  loading: () => (
    <div className="text-center text-xl text-yellow-300">Loading results…</div>
  ),
  ssr: false,
});

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [gameState, setGameState] = useState("lobby");
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [gameToken, setGameToken] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [alivePlayers, setAlivePlayers] = useState<any[]>([]);
  const [ghosts, setGhosts] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [scores, setScores] = useState<any>({});
  const [lives, setLives] = useState<any>({});
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(20);
  const [maxLivesState, setMaxLivesState] = useState(3);
  const [finalRound, setFinalRound] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [gameId, setGameId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerSummary, setAnswerSummary] = useState<{
    answeredAlive: number;
    totalAlive: number;
    allAliveAnswered: boolean;
  }>({ answeredAlive: 0, totalAlive: 0, allAliveAnswered: false });
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(
    typeof document === "undefined"
      ? true
      : document.visibilityState !== "hidden"
  );
  const [showJoin, setShowJoin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scoreboard = useMemo(() => {
    return players
      .map((player) => ({
        ...player,
        score: (scores && scores[player.id]) || 0,
        lives: Math.max(
          0,
          Math.min(maxLivesState, (lives && lives[player.id]) ?? maxLivesState)
        ),
        isGhost: ghosts.includes(player.id),
        isYou: player.id === playerId,
      }))
      .sort((a, b) => {
        if (a.isGhost !== b.isGhost) {
          return a.isGhost ? 1 : -1;
        }
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (b.lives !== a.lives) {
          return b.lives - a.lives;
        }
        return a.name.localeCompare(b.name);
      });
  }, [players, scores, lives, ghosts, playerId, maxLivesState]);

  useEffect(() => {
    setHasMounted(true);
    // Note: Auto-restore from localStorage is disabled to prevent "Name already taken" errors
    // when reconnecting with a different socket.id
    // const savedPlayerId = localStorage.getItem("henzeTrivia_playerId");
    // const savedToken = localStorage.getItem("henzeTrivia_token");
    // if (savedPlayerId) setPlayerId(savedPlayerId);
    // if (savedToken) setGameToken(savedToken);
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updateVisibility = () =>
      setIsDocumentVisible(document.visibilityState !== "hidden");

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if ((gameState === "lobby" || gameState === "LOBBY") && !playerId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, playerId]);

  // --- Socket.IO integration ---
  // --- Socket.IO integration ---
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    let isMounted = true;

    const connectSocket = () => {
      if (socketRef.current) return;
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : undefined;
      // Use default namespace for simplicity
      const socket = io(baseUrl || "", {
        path: "/socket.io",
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        reconnectAttempts = 0;
        setIsOnline(true);
        // Note: Session restore is handled in a separate useEffect
      });

      socket.on("disconnect", () => {
        setIsOnline(false);

        // Clear session on disconnect to prevent stale session issues
        // Keep playerName so user doesn't have to re-enter it
        setPlayerId("");
        setGameToken("");
        localStorage.removeItem("henzeTrivia_playerId");
        localStorage.removeItem("henzeTrivia_token");

        if (isMounted) {
          reconnectAttempts++;
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 15000);
          reconnectTimeout = setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.connect();
            } else {
              connectSocket();
            }
          }, delay);
        }
      });

      socket.on("game:update", (data) => {
        setGameState(data.state);
        setPlayers(data.players);
        setAlivePlayers(data.alivePlayers || []);
        setGhosts(data.ghosts || []);
        setCurrentQuestion(data.currentQuestion);
        setQuestionNumber(data.questionNumber);
        setTotalQuestions(data.totalQuestions);
        setRound(data.round);
        setMaxRounds(data.maxRounds);
        setFinalRound(data.finalRound);
        setWinner(data.winner);
        setScores(data.scores);
        setLives(data.lives);
        setMaxLivesState(data.maxLives || 3);
        setAnswerSummary(
          data.answerSummary || {
            answeredAlive: 0,
            totalAlive: (data.alivePlayers || []).length,
            allAliveAnswered: false,
          }
        );
        setGameId(data.gameId);
        setError("");
      });

      socket.on("player:joined", (data) => {
        // Optionally handle join confirmation
        if (data.success && data.playerId && data.token) {
          setPlayerId(data.playerId);
          setGameToken(data.token);
          localStorage.setItem("henzeTrivia_playerId", data.playerId);
          localStorage.setItem("henzeTrivia_token", data.token);
        } else if (data.error) {
          setError(data.error);
        }
      });

      socket.on("player:actionResult", (data) => {
        if (!data.success && data.error) {
          setError(data.error);
        }
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - socket connects once and stays connected

  // Note: Session restoration is disabled because the server doesn't properly handle
  // reconnecting with a different socket.id. Each connection requires a fresh join.
  // useEffect(() => {
  //   if (socketRef.current && playerId && gameToken) {
  //     // Only restore if we're connected
  //     if (socketRef.current.connected) {
  //       socketRef.current.emit("player:restore", { playerId, token: gameToken });
  //     }
  //   }
  // }, [playerId, gameToken]);

  // Stricter frontend name validation: only allow letters, numbers, spaces, dashes, underscores
  function isValidPlayerName(name: string) {
    if (!name) return false;
    const cleaned = name.trim();
    if (!cleaned) return false;
    if (cleaned.length < 1 || cleaned.length > 20) return false;
    // Only allow letters, numbers, spaces, dashes, underscores
    if (!/^[a-zA-Z0-9 _-]+$/.test(cleaned)) return false;
    return true;
  }

  const joinGame = () => {
    if (isSubmitting) return;
    if (!isValidPlayerName(playerName)) {
      setError(
        "Name must be 1-20 letters, numbers, spaces, dashes, or underscores. No emoji or special characters."
      );
      return;
    }
    setIsSubmitting(true);
    setError("");
    if (socketRef.current) {
      socketRef.current.emit(
        "player:join",
        { playerName: playerName.trim() },
        (data: any) => {
          setIsSubmitting(false);
          if (data.success) {
            setPlayerId(data.playerId);
            setGameToken(data.token);
            localStorage.setItem("henzeTrivia_playerId", data.playerId);
            localStorage.setItem("henzeTrivia_token", data.token);
          } else {
            setError(data.error || "Failed to join game");
          }
        }
      );
    }
  };

  const startGame = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    if (socketRef.current) {
      socketRef.current.emit(
        "player:start",
        { token: gameToken },
        (data: any) => {
          setIsSubmitting(false);
          if (!data.success) setError(data.error || "Failed to start game");
        }
      );
    }
  };

  const submitAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null || isSubmitting) return;
    if (!playerId) {
      setError("Join the game before answering.");
      return;
    }
    if (ghosts.includes(playerId)) {
      setError("You're a ghost this round. Spectate until the next reset!");
      return;
    }
    setSelectedAnswer(answerIndex);
    setIsSubmitting(true);
    setError("");
    if (socketRef.current) {
      socketRef.current.emit(
        "player:answer",
        { playerId, answer: answerIndex, token: gameToken },
        (data: any) => {
          setIsSubmitting(false);
          if (!data.success && data.error !== "Already answered") {
            setError(data.error || "Failed to submit answer");
            setSelectedAnswer(null);
          }
        }
      );
    }
  };

  const resetGame = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    if (socketRef.current) {
      socketRef.current.emit(
        "player:reset",
        { token: gameToken },
        (data: any) => {
          setIsSubmitting(false);
          if (data.success) {
            setPlayerId("");
            setPlayerName("");
            setGameToken("");
            setSelectedAnswer(null);
            setError("");
            localStorage.removeItem("henzeTrivia_playerId");
            localStorage.removeItem("henzeTrivia_token");
          } else {
            setError(data.error || "Failed to reset game");
          }
        }
      );
    }
  };

  const isPlayerDead = playerId ? ghosts.includes(playerId) : false;
  const playerLives = Math.max(
    0,
    Math.min(maxLivesState, (lives && lives[playerId]) ?? maxLivesState)
  );
  const aliveResponsesRemaining = Math.max(
    answerSummary.totalAlive - answerSummary.answeredAlive,
    0
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-900 border-4 border-red-500 rounded-3xl p-12 w-full max-w-md shadow-2xl text-center">
          <h1 className="text-4xl font-black text-red-400 mb-6 uppercase tracking-wide">
            CONNECTION SEVERED
          </h1>
          <p className="text-red-300 mb-8 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            RECONNECT
          </button>
        </div>
      </div>
    );
  }

  const offlineBanner =
    hasMounted && !isOnline ? (
      <div className="mb-4 rounded-2xl border-2 border-yellow-500 bg-yellow-900/90 px-6 py-4 text-yellow-100 text-base font-bold shadow-lg uppercase tracking-wide">
        Connection lost. Reconnecting...
      </div>
    ) : null;

  if (
    (gameState === "lobby" || gameState === "LOBBY") &&
    !players.find((p) => p.id === playerId) &&
    !showJoin
  ) {
    return <WelcomeScreen onJoin={() => setShowJoin(true)} />;
  }

  if (gameState === "lobby" || gameState === "LOBBY") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950 flex items-center justify-center p-6">
        <div className="bg-gray-900/90 border-4 border-red-600 rounded-3xl p-12 w-full max-w-2xl shadow-2xl shadow-red-900/50">
          <div className="text-center">
            {offlineBanner}
            <h1 className="heading text-6xl md:text-7xl text-red-500 mb-8">
              JOIN THE GAME
            </h1>
            <p className="text-gray-300 mb-12 text-2xl font-semibold">
              Enter your name to join. No mercy, no refunds.
            </p>
            {!players.find((p) => p.id === playerId) ? (
              <div className="space-y-8">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && joinGame()}
                  maxLength={20}
                  className="input-netflix w-full"
                  autoFocus
                />
                <button
                  onClick={joinGame}
                  disabled={!isValidPlayerName(playerName) || isSubmitting}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-gray-700"
                >
                  {isSubmitting ? "ENTERING..." : "JOIN GAME"}
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-3xl font-black text-gray-200 mb-8 uppercase tracking-wide">
                  Players in Lobby ({players.length})
                </h2>
                <div className="space-y-4 mb-10">
                  {players.map((player, i) => (
                    <div
                      key={player.id}
                      className={`p-6 rounded-2xl font-bold border-4 transition-all ${
                        player.id === playerId
                          ? "bg-red-700/50 text-white border-red-400 shadow-lg shadow-red-500/30"
                          : "bg-gray-800/50 text-gray-200 border-gray-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-black">
                          {player.name} {player.id === playerId && <span className="text-red-400">(YOU)</span>}
                        </span>
                        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">LIVES: 3</span>
                      </div>
                    </div>
                  ))}
                </div>
                {players.length >= 1 && (
                  <button
                    onClick={startGame}
                    disabled={isSubmitting}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-gray-700"
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
  }

  if (
    ((gameState === "question" || gameState === "reveal") && currentQuestion) ||
    (playerId &&
      gameState !== "lobby" &&
      gameState !== "results" &&
      gameState !== "final" &&
      currentQuestion)
  ) {
    const isReveal = gameState === "reveal";
    const waitingHeadline =
      aliveResponsesRemaining > 0
        ? `Waiting for ${aliveResponsesRemaining} ${
            aliveResponsesRemaining === 1 ? "survivor" : "survivors"
          }...`
        : "Everyone answered. Revealing results...";
    return (
      <QuestionScreen
        playerId={playerId}
        currentQuestion={{
          ...currentQuestion,
          round,
          maxRounds,
          questionNumber,
          totalQuestions,
        }}
        isReveal={isReveal}
        isPlayerDead={isPlayerDead}
        playerLives={playerLives}
        maxLivesState={maxLivesState}
        selectedAnswer={selectedAnswer}
        submitAnswer={submitAnswer}
        scoreboard={scoreboard}
        answerSummary={answerSummary}
        waitingHeadline={waitingHeadline}
        offlineBanner={offlineBanner}
      />
    );
  }

  if (gameState === "final") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-600 via-red-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-900 border-4 border-yellow-500 rounded-3xl p-12 w-full max-w-lg shadow-2xl">
          {offlineBanner}
          <h1 className="heading text-6xl text-center text-yellow-400 mb-12 uppercase tracking-wide">
            FINAL ROUND
          </h1>

          <div className="text-center mb-12">
            {winner ? (
              <div>
                <p className="text-yellow-200 text-2xl mb-6 font-bold uppercase tracking-wide">
                  Victory Claimed
                </p>
                <div className="p-6 bg-yellow-600 rounded-2xl text-black font-black text-3xl border-4 border-yellow-400">
                  {winner.name} - {scores[winner.id] || 0} points
                </div>
              </div>
            ) : (
              <div>
                <p className="text-yellow-200 text-2xl mb-6 font-bold uppercase tracking-wide">
                  Survivors Remaining
                </p>
                <div className="space-y-3">
                  {alivePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="p-4 bg-yellow-800/50 rounded-xl text-yellow-100 font-bold text-xl border-2 border-yellow-600"
                    >
                      {player.name} - {scores[player.id] || 0} points
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
            className="btn-primary w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 border-yellow-500/30"
          >
            DETERMINE WINNER
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "results") {
    return (
      <ResultsScreen
        players={players}
        ghosts={ghosts}
        scores={scores}
        playerId={playerId}
        isSubmitting={isSubmitting}
        resetGame={resetGame}
        offlineBanner={offlineBanner}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-black flex items-center justify-center text-red-300 text-2xl">
      <div className="text-center">
        {offlineBanner}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
        Loading the chamber...
      </div>
    </div>
  );
}
