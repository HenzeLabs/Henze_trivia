import React, { useEffect, useMemo, useState } from "react";
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
    if (submitted || !gameState || gameState.state !== "ASKING") return;
    setSelected(i);
    setSubmitted(true);
    socket.emit(
      "player:answer",
      { playerId: props.playerId, token: gameState?.token, answer: i },
      (res: any) => {
        if (!res.success) {
          setWaitingMsg(
            "Error submitting answer: " + (res.error || "Unknown error")
          );
        }
      }
    );
  };

  // Prepare players data before any early returns (hooks must be called unconditionally)
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
      ? `${answeredAlive}/${totalAlive} survivors locked in`
      : "Waiting for survivors to join");

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {props.offlineBanner}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-35%] right-[12%] w-[460px] h-[460px] bg-[rgba(34,211,238,0.1)] blur-[220px]" />
        <div className="absolute bottom-[-32%] left-[18%] w-[520px] h-[520px] bg-[rgba(244,63,94,0.1)] blur-[240px]" />
      </div>

      <div className="max-w-6xl w-full grid gap-8 lg:grid-cols-[1.35fr_0.65fr] relative z-10">
        <section className="surface space-y-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <span className="pill">Round {question.round}</span>
              <h1 className="heading text-4xl tracking-[0.18em]">
                {question.category || "Unknown Category"}
              </h1>
              <p className="text-sm text-[rgba(203,213,225,0.7)] uppercase tracking-[0.22em]">
                {question.round}/{question.totalRounds} ·{" "}
                {totalAlive} survivors alive · {answeredAlive} locked in
              </p>
            </div>
            <div className="glass rounded-[18px] border border-[rgba(148,163,184,0.14)] px-5 py-3 flex flex-col gap-1 items-start min-w-[180px]">
              <span className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.7)]">
                Status
              </span>
              <span
                className={`text-sm font-semibold ${
                  isReveal
                    ? "text-[rgba(251,191,36,0.9)]"
                    : submitted
                    ? "text-[rgba(34,211,238,0.85)]"
                    : "text-[rgba(203,213,225,0.8)]"
                }`}
              >
                {isReveal
                  ? "Reveal Sequence"
                  : submitted
                  ? "Answer Locked"
                  : "Awaiting Answer"}
              </span>
            </div>
          </header>

          <article className="glass rounded-[24px] border border-[rgba(148,163,184,0.18)] p-6 md:p-8 space-y-6">
            <p className="subtitle uppercase tracking-[0.25em] text-xs text-[rgba(148,163,184,0.7)]">
              Question {question.questionNumber ?? question.round}
            </p>
            <h2 className="heading text-3xl md:text-4xl text-left leading-tight glow-text">
              {question.text || question.question}
            </h2>
            <p className="text-sm text-[rgba(148,163,184,0.75)]">
              Choose wisely. Wrong answers cost a life. Tie-breakers are brutal.
            </p>
          </article>

          <div className="flex flex-col gap-4">
            {question.options?.map((option: string, index: number) => {
              const isSelected = selected === index;
              const isCorrect = typeof correctIdx === "number" && correctIdx === index;
              const revealState = isReveal
                ? isCorrect
                  ? "correct"
                  : isSelected
                  ? "selected"
                  : "inactive"
                : isSelected
                ? "pending"
                : "default";

              const baseClasses =
                "relative overflow-hidden rounded-[22px] border px-5 py-4 md:px-6 md:py-5 text-left transition-all duration-200 flex items-center gap-4";

              const stateClasses: Record<string, string> = {
                default:
                  "border-[rgba(148,163,184,0.16)] bg-[rgba(10,13,24,0.65)] hover:border-[rgba(34,211,238,0.4)] hover:bg-[rgba(34,211,238,0.06)] cursor-pointer",
                pending:
                  "border-[rgba(34,211,238,0.55)] bg-[rgba(34,211,238,0.12)] shadow-[0_18px_32px_rgba(34,211,238,0.18)]",
                correct:
                  "border-[rgba(34,197,94,0.55)] bg-[rgba(34,197,94,0.12)] shadow-[0_22px_40px_rgba(34,197,94,0.18)]",
                selected:
                  "border-[rgba(244,63,94,0.5)] bg-[rgba(244,63,94,0.08)] opacity-70",
                inactive: "border-[rgba(148,163,184,0.08)] opacity-40",
              };

              return (
                <button
                  key={option}
                  onClick={() => handleSubmit(index)}
                  disabled={isReveal || submitted || selected !== null}
                  className={`${baseClasses} ${stateClasses[revealState]} ${
                    isReveal || submitted || selected !== null ? "cursor-default" : ""
                  }`}
                >
                  <span className="heading text-3xl text-[rgba(244,63,94,0.85)]">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 text-left text-[rgba(226,232,240,0.92)] font-medium leading-relaxed">
                    {option}
                  </span>
                  {revealState === "correct" && (
                    <span className="score-pill">Correct</span>
                  )}
                  {revealState === "pending" && (
                    <span className="score-pill">Locked</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="glass rounded-[22px] border border-[rgba(148,163,184,0.18)] p-6 space-y-3">
            {!isReveal && (
              <>
                <p className="text-sm font-semibold text-[rgba(226,232,240,0.8)]">
                  {waitingHeadline}
                </p>
                <p className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.6)]">
                  {waitingMsg}
                </p>
              </>
            )}
            {isReveal && (
              <div className="space-y-3">
                <p className="text-base font-semibold text-[rgba(226,232,240,0.98)]">
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
                <div className="text-sm text-[rgba(203,213,225,0.75)] leading-relaxed">
                  <span className="font-semibold text-[rgba(34,211,238,0.85)]">
                    Correct answer:{" "}
                    {String.fromCharCode(
                      typeof correctIdx === "number" ? 65 + correctIdx : 63
                    )}
                  </span>
                  {question.explanation && (
                    <>
                      <br />
                      {question.explanation}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="surface glass space-y-6 h-full">
          <div className="space-y-4">
            <h3 className="heading text-3xl tracking-[0.18em]">
              Survivor Board
            </h3>
            <p className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.65)]">
              Scores auto-update · ghosts fall to the bottom
            </p>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {scoreboard.map((player) => {
                const isSelf = player.id === props.playerId || player.isYou;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 rounded-[18px] border px-4 py-3 ${
                      player.isGhost
                        ? "border-[rgba(148,163,184,0.08)] bg-[rgba(10,13,24,0.45)] opacity-60"
                        : isSelf
                        ? "border-[rgba(34,211,238,0.5)] bg-[rgba(34,211,238,0.12)]"
                        : "border-[rgba(148,163,184,0.12)] bg-[rgba(9,12,23,0.6)]"
                    }`}
                  >
                    <span className="heading text-2xl text-[rgba(244,63,94,0.85)] w-10">
                      {player.isGhost ? "☠" : "★"}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-[rgba(226,232,240,0.95)]">
                        {player.name} {isSelf && <span>· you</span>}
                      </p>
                      <div className="badge-list mt-1">
                        <span className="badge">Score {player.score}</span>
                        {!player.isGhost && (
                          <span className="badge">
                            Lives{" "}
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
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] p-5 space-y-4">
            <h4 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
              Game Stats
            </h4>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="text-xs uppercase tracking-[0.28em] text-[rgba(148,163,184,0.68)]">
                  Alive
                </span>
                <span className="heading text-3xl">{totalAlive}</span>
              </div>
              <div className="stat-card">
                <span className="text-xs uppercase tracking-[0.28em] text-[rgba(148,163,184,0.68)]">
                  Answered
                </span>
                <span className="heading text-3xl">{answeredAlive}</span>
              </div>
              <div className="stat-card">
                <span className="text-xs uppercase tracking-[0.28em] text-[rgba(148,163,184,0.68)]">
                  Lives Left
                </span>
                <span className="heading text-3xl">
                  {props.playerLives ?? "?"}
                </span>
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-[rgba(148,163,184,0.55)]">
              Answer fast. The room locks when every survivor taps in.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuestionScreen;
