import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import {
  savageCorrect,
  savageWrong,
  savageWaiting,
  getSavage,
} from "./savageFeedback";
import {
  getPersonalizedSavage,
  FeedbackType,
} from "./personalizedSavageFeedback";

interface QuestionScreenProps {
  offlineBanner: React.ReactNode;
  playerId: string;
  currentQuestion?: {
    round: number;
    maxRounds: number;
    questionNumber: number;
    totalQuestions: number;
    category: string;
    question: string;
    options: string[];
    correct: number;
    explanation?: string;
  };
  difficultyLabel?: string;
  isReveal?: boolean;
  isPlayerDead?: boolean;
  playerLives?: number;
  maxLivesState?: number;
  selectedAnswer?: number | null;
  submitAnswer?: (i: number) => void;
  waitingHeadline?: string;
  answerSummary?: {
    answeredAlive: number;
    totalAlive: number;
  };
  scoreboard?: Array<{
    id: string;
    name: string;
    score: number;
    isGhost?: boolean;
    isYou?: boolean;
  }>;
}

const socket = io();

const QuestionScreen: React.FC<QuestionScreenProps> = (props) => {
  const [gameState, setGameState] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [waitingMsg, setWaitingMsg] = useState(
    getPersonalizedSavage("waiting", { playerName: props.playerId })
  );

  useEffect(() => {
    socket.on("game:update", (game: any) => {
      setGameState(game);
      if (game.state === "ASKING" && game.question) {
        const currentPlayers = game.players || [];
        setWaitingMsg(
          getPersonalizedSavage("waiting", {
            playerName: props.playerId,
            groupNames: currentPlayers.map((p: any) => p.name),
          })
        );
      }
      // Auto-advance to reveal if all alive players answered
      if (
        game.state === "ANSWERS_LOCKED" ||
        (game.state === "REVEAL" && submitted)
      ) {
        setSubmitted(false);
      }
    });
    return () => {
      socket.off("game:update");
    };
  }, [submitted, props.playerId]);

  const handleSubmit = (i: number) => {
    setSelected(i);
    setSubmitted(true);
    socket.emit(
      "player:answer",
      { token: gameState?.token, answer: i },
      (res: any) => {
        if (!res.success) {
          setWaitingMsg(
            "Error submitting answer: " + (res.error || "Unknown error")
          );
        }
      }
    );
  };

  // If no game state, show loading
  if (!gameState || !gameState.question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading question...</div>
      </div>
    );
  }

  // Main question UI
  const { question } = gameState;
  const players = gameState.players || [];
  const alivePlayers = players.filter((p: any) => !p.isGhost);
  const answeredAlive = alivePlayers.filter((p: any) => p.hasAnswered).length;
  const totalAlive = alivePlayers.length;
  const isReveal = gameState.state === "REVEAL";
  const correctIdx = question.correctAnswer ?? question.answer_index;

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-8 v-gap">
      <div className="box w-full max-w-2xl flex flex-col items-center v-gap">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="text-lg font-extrabold text-red-600">
              ROUND {question.round} / {question.totalRounds}
            </div>
            <div className="text-sm text-red-500 mt-1 font-bold">
              {question.category}
            </div>
          </div>
        </div>
        <h2 className="heading text-3xl text-white mb-8 text-center">
          {question.text || question.question}
        </h2>
        <div className="flex flex-col w-full v-gap">
          {question.options.map((option: string, i: number) => {
            let buttonClass =
              "btn-primary text-left min-h-[64px] flex items-center text-lg";
            if (isReveal) {
              if (i === correctIdx) {
                buttonClass += " bg-red-600 text-white border-none opacity-100";
              } else if (selected === i && i !== correctIdx) {
                buttonClass +=
                  " bg-[#0d0d0d] text-red-600 border-none opacity-100";
              } else {
                buttonClass +=
                  " bg-[#0d0d0d] text-gray-600 border-none opacity-50";
              }
            } else {
              if (selected === i) {
                buttonClass += " bg-red-600 text-white border-none opacity-100";
              } else {
                buttonClass +=
                  " bg-[#0d0d0d] text-white border-none hover:bg-red-700 hover:text-white";
              }
            }
            return (
              <button
                key={i}
                onClick={() => !isReveal && !submitted && handleSubmit(i)}
                disabled={isReveal || submitted || selected !== null}
                className={buttonClass}
              >
                <span className="font-bold mr-4 text-red-600 text-2xl">
                  {String.fromCharCode(65 + i)}.
                </span>
                <span className="leading-tight">{option}</span>
              </button>
            );
          })}
        </div>
        {/* Waiting state */}
        {submitted && !isReveal && (
          <div className="box w-full mt-8 text-center">
            <p className="text-red-600 font-black text-xl">{waitingMsg}</p>
            <p className="text-red-400 font-medium text-sm mt-2">
              {answeredAlive}/{totalAlive} survivors answered
            </p>
          </div>
        )}
        {/* Reveal state */}
        {isReveal && (
          <div className="box w-full mt-8 text-center">
            <p className="text-red-600 font-black text-xl mb-4">
              {selected === correctIdx
                ? getPersonalizedSavage("correct", {
                    playerName: props.playerId,
                    groupNames: players.map((p: any) => p.name),
                    currentQuestion: question.text || question.question,
                  })
                : getPersonalizedSavage("wrong", {
                    playerName: props.playerId,
                    groupNames: players.map((p: any) => p.name),
                    currentQuestion: question.text || question.question,
                  })}
            </p>
            <p className="text-white font-medium leading-tight">
              Correct answer: {String.fromCharCode(65 + correctIdx)}
              <br />
              {question.explanation}
            </p>
          </div>
        )}
        {/* Scoreboard */}
        <div className="box w-full mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <span className="heading text-sm text-red-600">SCOREBOARD</span>
            <span className="text-red-400 text-xs font-bold">
              {answeredAlive}/{totalAlive} survivors answered
            </span>
          </div>
          <div className="flex flex-col w-full v-gap">
            {players.length === 0 && (
              <div className="text-center text-sm text-red-600">
                Waiting for players to join...
              </div>
            )}
            <div className="subtitle text-red-400 font-bold mb-2 text-center">
              The scoreboard is just a leaderboard for future therapy bills.
            </div>
            {players.map((player: any, index: number) => {
              const rankLabel =
                index === 0 ? "#1 (Top Menace)" : `${index + 1}.`;
              return (
                <div
                  key={player.id}
                  className={`box flex items-center justify-between text-sm font-bold transition-all duration-300 ${
                    player.isGhost
                      ? "bg-[#0d0d0d] text-gray-700 border-none opacity-60"
                      : index === 0
                      ? "bg-red-700 text-white border-none scale-105 shadow-xl"
                      : player.id === props.playerId
                      ? "bg-red-600 text-white border-none"
                      : "bg-[#0d0d0d] text-white border-none"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-400 mr-2">
                      {rankLabel}
                    </span>
                    <span>
                      {player.name}
                      {player.id === props.playerId && " (You, disaster)"}
                      {player.isGhost && " (Ghost)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm">
                    <span>{player.score} pts</span>
                    <span className="ml-2 flex gap-1">
                      {[...Array(player.lives || 0)].map((_, idx) => (
                        <span key={idx} className="text-red-600 text-xl">
                          ❤️
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionScreen;
