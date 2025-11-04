import React, { useEffect, useMemo, useState } from "react";
import { getPersonalizedSavage } from "./personalizedSavageFeedback";

type ScoreboardEntry = {
  id: string;
  name: string;
  score: number;
  isGhost?: boolean;
  isYou?: boolean;
  lives?: number;
  hasAnswered?: boolean;
};

interface QuestionDetails {
  round?: number;
  maxRounds?: number;
  totalRounds?: number;
  questionNumber?: number;
  totalQuestions?: number;
  category?: string;
  type?: string;
  question?: string;
  text?: string;
  options?: string[];
  correct?: number;
  correctAnswer?: number;
  answer_index?: number;
  explanation?: string;
  source?: string;
}

interface QuestionScreenProps {
  offlineBanner: React.ReactNode;
  playerId: string;
  currentQuestion?: QuestionDetails;
  difficultyLabel?: string;
  isReveal?: boolean;
  isPlayerDead?: boolean;
  playerLives?: number;
  maxLivesState?: number;
  selectedAnswer?: number | null;
  submitAnswer?: (index: number) => void;
  waitingHeadline?: string;
  answerSummary?: {
    answeredAlive: number;
    totalAlive: number;
  };
  scoreboard?: ScoreboardEntry[];
}

const getCorrectIndex = (question?: QuestionDetails | null): number | null => {
  if (!question) return null;
  if (typeof question.correctAnswer === "number") return question.correctAnswer;
  if (typeof question.answer_index === "number") return question.answer_index;
  if (typeof question.correct === "number") return question.correct;
  return null;
};

const QuestionScreen: React.FC<QuestionScreenProps> = ({
  offlineBanner,
  playerId,
  currentQuestion,
  isReveal = false,
  isPlayerDead = false,
  maxLivesState = 3,
  selectedAnswer = null,
  submitAnswer,
  waitingHeadline,
  answerSummary,
  scoreboard: scoreboardProp = [],
}) => {
  const resolvedMaxLives = Math.max(1, maxLivesState);

  const scoreboard = useMemo(
    () =>
      scoreboardProp.map((player) => ({
        ...player,
        lives: Math.max(
          0,
          Math.min(resolvedMaxLives, player.lives ?? resolvedMaxLives)
        ),
      })),
    [scoreboardProp, resolvedMaxLives]
  );

  const alivePlayers = useMemo(
    () => scoreboard.filter((player) => !player.isGhost),
    [scoreboard]
  );

  const playerDisplayName = useMemo(
    () => scoreboard.find((player) => player.isYou)?.name ?? playerId,
    [scoreboard, playerId]
  );

  const questionKey = useMemo(() => {
    if (!currentQuestion) return "no-question";
    return [
      currentQuestion.round,
      currentQuestion.questionNumber,
      currentQuestion.question,
      currentQuestion.text,
      currentQuestion.type,
    ]
      .filter(Boolean)
      .join("-");
  }, [currentQuestion]);

  const [waitingMsg, setWaitingMsg] = useState<string>("");

  useEffect(() => {
    if (isReveal || !currentQuestion) return;
    const groupNames = alivePlayers.map((player) => player.name);
    setWaitingMsg(
      getPersonalizedSavage("waiting", {
        playerName: playerDisplayName,
        groupNames,
      })
    );
  }, [questionKey, alivePlayers, playerDisplayName, isReveal, currentQuestion]);

  const answeredAlive =
    answerSummary?.answeredAlive ??
    alivePlayers.filter((player) => player.hasAnswered).length;
  const totalAlive =
    answerSummary?.totalAlive ?? alivePlayers.length;
  const computedWaitingHeadline =
    waitingHeadline ??
    (totalAlive > 0
      ? `${answeredAlive}/${totalAlive} survivors answered`
      : "Waiting for players…");
  const progressPercent =
    totalAlive > 0
      ? Math.min(100, Math.max(0, (answeredAlive / totalAlive) * 100))
      : 0;

  const playerSelection = selectedAnswer;
  const selectionLocked =
    isReveal || playerSelection !== null || isPlayerDead || !submitAnswer;

  const handleSelect = (index: number) => {
    if (!submitAnswer || selectionLocked) return;
    submitAnswer(index);
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const correctIdx = getCorrectIndex(currentQuestion);
  const revealMessage = isReveal
    ? playerSelection !== null && playerSelection === correctIdx
      ? getPersonalizedSavage("correct", {
          playerName: playerDisplayName,
          groupNames: alivePlayers.map((player) => player.name),
          currentQuestion: currentQuestion.text || currentQuestion.question,
        })
      : getPersonalizedSavage("wrong", {
          playerName: playerDisplayName,
          groupNames: alivePlayers.map((player) => player.name),
          currentQuestion: currentQuestion.text || currentQuestion.question,
        })
    : null;

  const totalRounds =
    currentQuestion.maxRounds ??
    currentQuestion.totalRounds ??
    currentQuestion.totalQuestions ??
    "?";

  const remainingAlive = Math.max(totalAlive - answeredAlive, 0);

  const chatTypes = ["who-said-it", "chaos", "roast"] as const;
  const questionType = currentQuestion?.type;
  const questionSource = currentQuestion?.source;
  const isChatQuestion =
    questionSource === "chat" ||
    (questionType && chatTypes.includes(questionType as (typeof chatTypes)[number]));

  const questionLabel = (() => {
    if (!questionType && !currentQuestion?.category) return null;
    switch (questionType) {
      case "who-said-it":
        return "Group chat receipts";
      case "chaos":
        return "Group chat chaos";
      case "roast":
        return "Personal roast";
      default:
        return currentQuestion?.category || "Trivia";
    }
  })();

  return (
    <div className="relative min-h-dvh w-full px-4 py-10 sm:py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-[12%] h-[420px] w-[420px] rounded-full bg-[rgba(34,211,238,0.12)] blur-[190px]" />
        <div className="absolute -bottom-44 right-[10%] h-[520px] w-[520px] rounded-full bg-[rgba(244,63,94,0.12)] blur-[210px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8">
        {offlineBanner}

        <header className="surface space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill">Round {currentQuestion.round ?? "–"}</span>
                {questionLabel && (
                  <span
                    className={`pill ${
                      isChatQuestion
                        ? "bg-[rgba(63,185,255,0.2)] text-[rgba(191,239,255,0.95)]"
                        : "bg-[rgba(244,63,94,0.18)] text-[rgba(254,226,226,0.95)]"
                    }`}
                  >
                    {questionLabel}
                  </span>
                )}
              </div>
              <h1 className="heading text-3xl md:text-4xl">
                {currentQuestion.category || "Question"}
              </h1>
              {isChatQuestion && (
                <p className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.7)]">
                  Pulled straight from your group chat receipts.
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <span className="score-pill">
                {isReveal
                  ? "Reveal"
                  : playerSelection !== null
                  ? "Answer locked"
                  : isPlayerDead
                  ? "Spectating"
                  : "Your move"}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.7)]">
                {currentQuestion.round ?? "–"}/{totalRounds} · {totalAlive} alive
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[rgba(148,163,184,0.7)]">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-[rgba(34,211,238,0.65)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
                aria-hidden="true"
              />
            </div>
            <span>
              {answeredAlive}/{totalAlive} answered
            </span>
          </div>
        </header>

        <section className="glass rounded-[18px] border border-[rgba(255,255,255,0.06)] px-5 py-7 space-y-3 sm:px-6 sm:py-8 sm:space-y-4">
          <p className="subtitle uppercase tracking-[0.2em] text-xs text-[rgba(148,163,184,0.72)]">
            Question {currentQuestion.questionNumber ?? currentQuestion.round ?? "–"}
          </p>
          <h2 className="heading text-3xl leading-tight sm:text-[2.25rem]">
            {currentQuestion.text || currentQuestion.question}
          </h2>
          <p className="text-sm text-[rgba(203,213,225,0.78)]">
            Choose wisely—every wrong guess burns a life.
          </p>
        </section>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {currentQuestion.options?.map((option, index) => {
            const isSelected = playerSelection === index;
            const isCorrect = typeof correctIdx === "number" && correctIdx === index;

            let tone =
              "border-[rgba(255,255,255,0.08)] bg-[rgba(15,18,29,0.72)] hover:border-[rgba(63,185,255,0.32)] hover:bg-[rgba(31,36,50,0.85)]";
            if (selectionLocked) {
              tone = "border-[rgba(255,255,255,0.06)] bg-[rgba(15,18,29,0.58)] cursor-not-allowed";
            }
            if (isSelected && !isReveal) {
              tone = "border-[rgba(63,185,255,0.45)] bg-[rgba(63,185,255,0.14)]";
            }
            if (isReveal) {
              if (isCorrect) {
                tone = "border-[rgba(63,214,165,0.6)] bg-[rgba(32,162,119,0.16)]";
              } else if (isSelected) {
                tone = "border-[rgba(245,86,109,0.45)] bg-[rgba(245,86,109,0.16)]";
              } else {
                tone = "border-[rgba(148,163,184,0.12)] bg-[rgba(15,18,29,0.5)] opacity-80";
              }
            }

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => handleSelect(index)}
                disabled={selectionLocked}
                className={`flex items-start gap-4 rounded-[14px] border px-5 py-4 text-left text-base transition-all duration-200 sm:px-6 sm:py-5 sm:text-lg ${tone}`}
                aria-pressed={isSelected}
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

        <section className="glass rounded-[18px] border border-[rgba(255,255,255,0.06)] px-5 py-5 space-y-3 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-[rgba(231,234,240,0.9)]">
              {computedWaitingHeadline}
            </p>
            <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.65)]">
              {remainingAlive > 0
                ? `${remainingAlive} awaiting judgment`
                : isReveal
                ? "Answers locked"
                : "Standing by"}
            </span>
          </div>

          {!isReveal && (
            <p className="text-xs uppercase tracking-[0.18em] text-[rgba(148,163,184,0.65)]">
              {waitingMsg || "Keeping the pressure high…"}
            </p>
          )}

          {isReveal && (
            <div className="space-y-2 text-sm text-[rgba(203,213,225,0.85)]">
              {revealMessage && <p>{revealMessage}</p>}
              <p>
                <strong>Correct answer:</strong> {" "}
                {typeof correctIdx === "number"
                  ? String.fromCharCode(65 + correctIdx)
                  : "Unknown"}
              </p>
              {currentQuestion.explanation && <p>{currentQuestion.explanation}</p>}
            </div>
          )}

          {isPlayerDead && !isReveal && (
            <p className="text-xs text-[rgba(248,113,113,0.75)] uppercase tracking-[0.2em]">
              You are currently a ghost—spectate until the next reset.
            </p>
          )}
        </section>

        <section className="surface space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="heading text-2xl">Players</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.7)]">
              Score · Lives
            </span>
          </header>
          {scoreboard.length === 0 ? (
            <p className="text-sm text-[rgba(203,213,225,0.75)]">
              Players are syncing… stand by.
            </p>
          ) : (
            <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
              {scoreboard.map((player) => {
                const isSelf = player.isYou || player.id === playerId;
                return (
                  <article
                    key={player.id}
                    className={`rounded-[14px] border px-4 py-4 transition-all duration-200 ${
                      isSelf
                        ? "border-[rgba(63,185,255,0.45)] bg-[rgba(63,185,255,0.12)]"
                        : player.isGhost
                        ? "border-[rgba(148,163,184,0.1)] bg-[rgba(9,12,23,0.58)] opacity-75"
                        : "border-[rgba(148,163,184,0.14)] bg-[rgba(9,12,23,0.62)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-[rgba(247,249,252,0.95)]">
                          {player.name}
                          {isSelf && <span> · you</span>}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-[rgba(148,163,184,0.6)]">
                          {player.isGhost ? "Eliminated" : "Alive"}
                        </p>
                      </div>
                      <span className="badge">
                        Score {Number(player.score ?? 0).toLocaleString()} pts
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {player.isGhost ? (
                        <span className="text-xs uppercase tracking-[0.2em] text-[rgba(244,63,94,0.7)]">
                          Ghosting the arena
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: resolvedMaxLives }).map((_, idx) => (
                            <span
                              key={`${player.id}-life-${idx}`}
                              className={`h-2.5 w-2.5 rounded-full border ${
                                idx < (player.lives ?? resolvedMaxLives)
                                  ? "border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.7)]"
                                  : "border-[rgba(148,163,184,0.3)] bg-transparent"
                              }`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      )}
                      {player.isYou && (
                        <span className="text-xs uppercase tracking-[0.2em] text-[rgba(34,211,238,0.75)]">
                          You
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default QuestionScreen;
