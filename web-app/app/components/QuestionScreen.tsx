import React, { useEffect, useMemo, useState } from "react";
import io from "socket.io-client";
import { getPersonalizedSavage } from "./personalizedSavageFeedback";

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

  const players = useMemo(() => gameState?.players || [], [gameState?.players]);
  const scoreboard = useMemo(() => {
    const source = props.scoreboard?.length ? props.scoreboard : players;
    return source.map((player: any) => ({
      id: player.id,
      name: player.name,
      score: player.score ?? 0,
      isGhost: player.isGhost,
      isYou:
        typeof player.isYou !== "undefined"
          ? player.isYou
          : player.id === props.playerId,
      lives:
        typeof player.lives !== "undefined"
          ? player.lives
          : props.playerLives ?? 0,
    }));
  }, [players, props.playerId, props.playerLives, props.scoreboard]);

  const handleSubmit = (index: number) => {
    if (submitted || !gameState || gameState.state !== "ASKING") return;
    setSelected(index);
    setSubmitted(true);
    socket.emit(
      "player:answer",
      { playerId: props.playerId, token: gameState?.token, answer: index },
      (res: any) => {
        if (!res.success) {
          setWaitingMsg(
            "Error submitting answer: " + (res.error || "Unknown error")
          );
        }
      }
    );
  };

  if (!gameState || !gameState.question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const { question } = gameState;
  const alivePlayers = players.filter((p: any) => !p.isGhost);
  const answeredAlive = alivePlayers.filter((p: any) => p.hasAnswered).length;
  const totalAlive = alivePlayers.length;
  const isReveal = gameState.state === "REVEAL" || props.isReveal;
  const correctIdx =
    question.correctAnswer ?? question.answer_index ?? question.correct;
  const waitingHeadline =
    props.waitingHeadline ||
    (totalAlive > 0
      ? `${answeredAlive}/${totalAlive} answered`
      : "Waiting for players…");

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl space-y-10">
        {props.offlineBanner}

        <header className="surface space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="pill">Round {question.round}</span>
              <h1 className="heading text-3xl mt-2">
                {question.category || "Question"}
              </h1>
            </div>
            <div className="score-pill">
              {isReveal ? "Reveal" : submitted ? "Answer locked" : "Your turn"}
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-[rgba(138,147,172,0.7)]">
            {question.round}/{question.totalRounds} · {totalAlive} alive
          </p>
        </header>

        <section className="glass rounded-[16px] border border-[rgba(255,255,255,0.06)] px-6 py-8 space-y-3">
          <p className="subtitle uppercase tracking-[0.2em] text-xs text-[rgba(138,147,172,0.72)]">
            Question {question.questionNumber ?? question.round}
          </p>
          <h2 className="heading text-3xl leading-tight">
            {question.text || question.question}
          </h2>
          <p className="text-sm text-[rgba(203,213,225,0.75)]">
            Choose the best answer. Wrong picks cost a life.
          </p>
        </section>

        <div className="space-y-3">
          {question.options?.map((option: string, index: number) => {
            const isSelected = selected === index;
            const isCorrect =
              typeof correctIdx === "number" && correctIdx === index;
            const disabled = isReveal || submitted || selected !== null;

            const base =
              "w-full text-left rounded-[12px] border px-5 py-4 flex items-center gap-4 transition-colors";
            let tone =
              "border-[rgba(255,255,255,0.06)] bg-[rgba(31,36,50,0.72)] hover:border-[rgba(63,185,255,0.28)]";
            if (disabled) {
              tone =
                "border-[rgba(255,255,255,0.04)] bg-[rgba(31,36,50,0.6)] cursor-default";
            }
            if (isSelected && !isReveal) {
              tone = "border-[rgba(63,185,255,0.4)] bg-[rgba(63,185,255,0.12)]";
            }
            if (isReveal) {
              if (isCorrect) {
                tone =
                  "border-[rgba(63,214,165,0.45)] bg-[rgba(63,214,165,0.12)]";
              } else if (isSelected) {
                tone =
                  "border-[rgba(245,86,109,0.4)] bg-[rgba(245,86,109,0.12)]";
              } else {
                tone =
                  "border-[rgba(255,255,255,0.04)] bg-[rgba(31,36,50,0.45)] opacity-80";
              }
            }

            return (
              <button
                key={option}
                onClick={() => handleSubmit(index)}
                disabled={disabled}
                className={`${base} ${tone}`}
              >
                <span className="heading text-2xl">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 text-[rgba(247,249,252,0.95)]">
                  {option}
                </span>
                {isReveal && isCorrect && (
                  <span className="score-pill">Correct</span>
                )}
              </button>
            );
          })}
        </div>

        <section className="glass rounded-[14px] border border-[rgba(255,255,255,0.06)] px-6 py-5 space-y-2">
          <p className="text-sm font-medium text-[rgba(231,234,240,0.9)]">
            {waitingHeadline}
          </p>
          {!isReveal ? (
            <p className="text-xs text-[rgba(138,147,172,0.72)] uppercase tracking-[0.18em]">
              {waitingMsg}
            </p>
          ) : (
            <div className="text-sm text-[rgba(203,213,225,0.8)] space-y-1">
              <p>
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
              <p>
                <strong>Correct answer: </strong>
                {String.fromCharCode(
                  typeof correctIdx === "number" ? 65 + correctIdx : 63
                )}
              </p>
              {question.explanation && <p>{question.explanation}</p>}
            </div>
          )}
        </section>

        <section className="surface space-y-3">
          <header className="flex items-center justify-between">
            <h3 className="heading text-2xl">Players</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-[rgba(138,147,172,0.7)]">
              Score · Lives
            </span>
          </header>
          <div className="space-y-2">
            {scoreboard.map((player) => {
              const isSelf = player.id === props.playerId || player.isYou;
              return (
                <div
                  key={player.id}
                  className={`rounded-[10px] border px-4 py-3 flex items-center justify-between ${
                    isSelf
                      ? "border-[rgba(63,185,255,0.3)] bg-[rgba(63,185,255,0.1)]"
                      : "border-[rgba(255,255,255,0.05)] bg-[rgba(31,36,50,0.6)]"
                  }`}
                >
                  <span className="font-semibold text-[rgba(247,249,252,0.95)]">
                    {player.name} {isSelf && <span>· you</span>}
                  </span>
                  <div className="text-sm text-[rgba(203,213,225,0.75)] flex items-center gap-4">
                    <span>{player.score} pts</span>
                    {!player.isGhost && (
                      <span>
                        {Array.from({ length: props.maxLivesState || 3 })
                          .map((_, idx) =>
                            idx <
                            (player.lives ?? (props.playerLives ?? 0))
                              ? "●"
                              : "○"
                          )
                          .join(" ")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default QuestionScreen;
