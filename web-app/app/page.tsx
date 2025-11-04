"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import WelcomeScreen from "./components/WelcomeScreen";
import LobbyScreen from "./components/LobbyScreen";
import OfflineBanner from "./components/OfflineBanner";
import ErrorScreen from "./components/ErrorScreen";
import FinalScreen from "./components/FinalScreen";

const QuestionScreen = dynamic(() => import("./components/QuestionScreen"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  ),
  ssr: false,
});
const ResultsScreen = dynamic(() => import("./components/ResultsScreen"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
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

  const questionIdentity = useMemo(() => {
    if (!currentQuestion) return "";
    const base = currentQuestion.question || currentQuestion.text || "";
    return [currentQuestion.round, currentQuestion.questionNumber, base]
      .filter(Boolean)
      .join("-");
  }, [currentQuestion]);

  useEffect(() => {
    if (!questionIdentity) return;
    setSelectedAnswer(null);
    setIsSubmitting(false);
  }, [questionIdentity]);

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
        setCurrentQuestion(data.question);
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
    console.log("[JOIN] Attempting to join with name:", playerName);
    console.log("[JOIN] Socket connected:", socketRef.current?.connected);
    setIsSubmitting(true);
    setError("");
    if (socketRef.current) {
      socketRef.current.emit(
        "player:join",
        { playerName: playerName.trim() },
        (data: any) => {
          console.log("[JOIN] Response received:", data);
          setIsSubmitting(false);
          if (data.success) {
            console.log("[JOIN] Success! PlayerId:", data.playerId);
            setPlayerId(data.playerId);
            setGameToken(data.token);
            localStorage.setItem("henzeTrivia_playerId", data.playerId);
            localStorage.setItem("henzeTrivia_token", data.token);
          } else {
            console.error("[JOIN] Failed:", data.error);
            setError(data.error || "Failed to join game");
          }
        }
      );
    } else {
      console.error("[JOIN] Socket not connected!");
      setIsSubmitting(false);
      setError("Connection lost. Please refresh the page.");
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
    return <ErrorScreen error={error} />;
  }

  const offlineBanner =
    hasMounted && !isOnline ? (
      <OfflineBanner message="Connection lost. Reconnecting..." />
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
      <LobbyScreen
        players={players}
        playerId={playerId}
        playerName={playerName}
        setPlayerName={setPlayerName}
        joinGame={joinGame}
        isSubmitting={isSubmitting}
        startGame={startGame}
        inputRef={inputRef}
        offlineBanner={offlineBanner}
      />
    );
  }

  if (
    ((gameState === "ASKING" || gameState === "question" || gameState === "REVEAL" || gameState === "reveal") && currentQuestion) ||
    (playerId &&
      gameState !== "lobby" &&
      gameState !== "LOBBY" &&
      gameState !== "results" &&
      gameState !== "final" &&
      currentQuestion)
  ) {
    const isReveal = gameState === "reveal" || gameState === "REVEAL";
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
      <FinalScreen
        winner={winner}
        scores={scores}
        alivePlayers={alivePlayers}
        gameToken={gameToken}
        socketRef={socketRef}
        setError={setError}
        offlineBanner={offlineBanner}
      />
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
    <div className="min-h-screen flex items-center justify-center bg-[#020309]">
      <div className="surface glass text-center space-y-4">
        {offlineBanner}
        <div className="spinner mx-auto" />
        <p className="text-sm uppercase tracking-[0.24em] text-[rgba(148,163,184,0.7)]">
          Loading the chamber…
        </p>
      </div>
    </div>
  );
}
