"use client";

import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

type Player = {
  id: string;
  name: string;
  isGhost?: boolean;
  hasAnswered?: boolean;
  score?: number;
  lives?: number;
};

const FALLBACK_ORIGIN = "http://host:3000";
const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");
const stripProtocol = (value: string) => value.replace(/^https?:\/\//, "");

const getCorrectIndex = (question: any): number | null => {
  if (!question) return null;
  if (typeof question.correctAnswer === "number") return question.correctAnswer;
  if (typeof question.answer_index === "number") return question.answer_index;
  if (typeof question.correct === "number") return question.correct;
  return null;
};

const ScreenShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen w-full overflow-hidden bg-[#060912] px-4 py-6 text-white sm:px-6 sm:py-10 lg:px-10 lg:py-14 xl:px-14 xl:py-16 2xl:px-20">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 left-[12%] h-[520px] w-[520px] rounded-full bg-[rgba(34,211,238,0.12)] blur-[220px]" />
      <div className="absolute -bottom-48 right-[10%] h-[620px] w-[620px] rounded-full bg-[rgba(244,63,94,0.12)] blur-[260px]" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_-20%,rgba(63,185,255,0.08)_0%,transparent_55%)]" />
    </div>
    <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-col gap-6 sm:gap-8 lg:gap-12">
      {children}
    </div>
  </div>
);

export default function TVPage() {
  const [gameState, setGameState] = useState<string>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [round, setRound] = useState<number>(0);
  const [maxRounds, setMaxRounds] = useState<number>(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [ghosts, setGhosts] = useState<string[]>([]);
  const [winner, setWinner] = useState<any>(null);
  const [hostUrl, setHostUrl] = useState<string>(FALLBACK_ORIGIN);
  const [answerSummary, setAnswerSummary] = useState<{
    answeredAlive: number;
    totalAlive: number;
    allAliveAnswered?: boolean;
  }>({ answeredAlive: 0, totalAlive: 0, allAliveAnswered: false });
  const [socketError, setSocketError] = useState<string>("");
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostUrl(trimTrailingSlash(window.location.origin || FALLBACK_ORIGIN));
    }
  }, []);

  useEffect(() => {
    let socketInstance = io();
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let currentAttempts = 0;

    const setupSocket = () => {
      const handleGameUpdate = (data: any) => {
        setGameState(data.state);
        setPlayers(data.players || []);
        setCurrentQuestion(data.question || null);
        setRound(data.round || 0);
        setMaxRounds((prev) => {
          const next = data.maxRounds ?? data.totalRounds;
          return typeof next === "number" ? next : prev;
        });
        setScores(data.scores || {});
        setGhosts(data.ghosts || []);
        setWinner(data.winner || null);
        setAnswerSummary(
          data.answerSummary || {
            answeredAlive: (data.players || []).filter(
              (player: Player) => !player.isGhost && player.hasAnswered
            ).length,
            totalAlive: (data.players || []).filter(
              (player: Player) => !player.isGhost
            ).length,
            allAliveAnswered: data.allAnswered ?? false,
          }
        );
        setSocketError("");
        currentAttempts = 0; // Reset on successful data
        setReconnectAttempts(0);
      };

      const handleConnect = () => {
        currentAttempts = 0;
        setReconnectAttempts(0);
        setSocketError("");
      };

      const handleConnectError = (error: any) => {
        console.warn('Socket connection error:', error);
        setSocketError("Connection error. Trying to reconnect…");
      };

      const handleDisconnect = () => {
        setSocketError("Connection lost. Trying to reconnect…");
        currentAttempts++;
        setReconnectAttempts(currentAttempts);
        const delay = Math.min(2000 * Math.pow(2, currentAttempts), 15000);
        reconnectTimeout = setTimeout(() => {
          socketInstance.connect();
        }, delay);
      };

      socketInstance.on("connect", handleConnect);
      socketInstance.on("game:update", handleGameUpdate);
      socketInstance.on("connect_error", handleConnectError);
      socketInstance.on("disconnect", handleDisconnect);
    };

    setupSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      socketInstance.off("connect");
      socketInstance.off("game:update");
      socketInstance.off("connect_error");
      socketInstance.off("disconnect");
      socketInstance.disconnect();
    };
  }, []);

  // Sort players: alive first, then by score (desc), then by name (asc)
  const sortPlayers = (players: Player[], scores: Record<string, number>, ghosts: string[]) => {
    return players
      .map((player) => ({
        ...player,
        score: scores[player.id] ?? player.score ?? 0,
        isGhost: ghosts.includes(player.id),
      }))
      .sort((a, b) => {
        // Alive players first
        if (a.isGhost !== b.isGhost) {
          return a.isGhost ? 1 : -1;
        }
        // Higher score first
        if ((b.score ?? 0) !== (a.score ?? 0)) {
          return (b.score ?? 0) - (a.score ?? 0);
        }
        // Alphabetical by name
        return a.name.localeCompare(b.name);
      });
  };

  const scoreboard = useMemo(() => {
    return sortPlayers(players, scores, ghosts);
  }, [players, scores, ghosts]);

  const alivePlayers = useMemo(
    () => scoreboard.filter((player) => !player.isGhost),
    [scoreboard]
  );

  const normalizedState = (gameState || "").toLowerCase();
  const isReveal = normalizedState === "reveal";
  const playerCount = players.length;
  const aliveCount = answerSummary.totalAlive ?? alivePlayers.length;
  const answeredCount = answerSummary.answeredAlive ?? 0;
  const hostDisplay = stripProtocol(hostUrl) || "henze-trivia.onrender.com";
  const tvDisplay = `${stripProtocol(hostUrl) || "henze-trivia.onrender.com"}/tv`;

  if (socketError) {
    return (
      <ScreenShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="surface glass flex flex-col items-center gap-4 px-10 py-12 text-center">
            <div className="spinner" />
            <p className="text-sm uppercase tracking-[0.24em] text-[rgba(244,63,94,0.8)]">
              {socketError}
            </p>
            <button
              className="mt-4 px-6 py-2 rounded bg-[rgba(34,211,238,0.8)] text-white font-bold"
              onClick={() => {
                setSocketError("");
                setReconnectAttempts(0);
                window.location.reload();
              }}
            >
              Reconnect
            </button>
          </div>
        </div>
      </ScreenShell>
    );
  }
  if (normalizedState === "lobby") {
    return (
      <ScreenShell>
        <header className="space-y-4 text-center lg:text-left">
          <span className="pill inline-flex text-sm lg:text-base">Lobby · Broadcast Mode</span>
          <h1 className="heading text-fluid-display text-balance">
            Henze Trivia Murder Party
          </h1>
          <p className="text-fluid-body text-[rgba(203,213,225,0.78)] text-balance lg:max-w-4xl">
            Keep this screen on your TV or projector. Players join from their
            own devices, and the stage updates live with every elimination.
          </p>
        </header>

        <div className="grid gap-6 sm:gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <section className="surface glass space-y-6 lg:space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[rgba(148,163,184,0.7)] lg:text-base">
                  Survivors Checked In
                </p>
                <p className="heading text-6xl lg:text-8xl xl:text-9xl">{playerCount}</p>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="score-pill text-sm lg:text-base">Lobby Live</span>
                <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.65)] lg:text-sm">
                  Host starts from their device
                </span>
              </div>
            </div>

            <div className="grid-fluid">
              {players.length === 0 ? (
                <div className="glass col-span-full rounded-[18px] border border-[rgba(148,163,184,0.12)] px-6 py-8 text-center">
                  <p className="text-fluid-body text-[rgba(203,213,225,0.75)]">
                    Waiting for players to claim their seats…
                  </p>
                </div>
              ) : (
                players.map((player, index) => (
                  <article
                    key={player.id}
                    className="glass rounded-[18px] border border-[rgba(148,163,184,0.12)] px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 lg:gap-6">
                        <span className="heading text-3xl text-[rgba(244,63,94,0.85)] sm:text-4xl xl:text-5xl">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-fluid-title font-semibold text-[rgba(247,249,252,0.95)]">
                            {player.name}
                          </p>
                          <p className="text-fluid-meta text-[rgba(148,163,184,0.6)]">
                            Waiting on host
                          </p>
                        </div>
                      </div>
                      <span className="badge text-sm lg:text-base">Ready</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <aside className="surface space-y-6 lg:space-y-8">
            <div className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] px-6 py-6 space-y-4 lg:px-8 lg:py-8">
              <p className="text-fluid-meta text-[rgba(148,163,184,0.75)]">
                Share These Links
              </p>
              <div className="space-y-3 lg:space-y-4">
                <DisplayLink
                  label="Player Lobby"
                  value={hostDisplay}
                  helper="Players join from phones"
                />
                <DisplayLink
                  label="TV Display"
                  value={tvDisplay}
                  helper="Keep this open on the big screen"
                />
              </div>
            </div>

            <div className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] px-6 py-6 space-y-3 lg:px-8 lg:py-8">
              <p className="text-fluid-meta text-[rgba(148,163,184,0.75)]">
                Quick Checklist
              </p>
              <ul className="space-y-2 text-fluid-body text-[rgba(203,213,225,0.78)] lg:space-y-3">
                <li>Host confirms everyone is in before starting.</li>
                <li>Keep volume up for dramatic reveals.</li>
                <li>No spoilers—TV view shows the truth in real time.</li>
              </ul>
            </div>
          </aside>
        </div>
      </ScreenShell>
    );
  }

  if (
    (normalizedState === "asking" ||
      normalizedState === "question" ||
      normalizedState === "reveal") &&
    currentQuestion
  ) {
    const correctIdx = getCorrectIndex(currentQuestion);
    const progress =
      aliveCount > 0
        ? Math.min(100, Math.max(0, (answeredCount / aliveCount) * 100))
        : 0;
    const scoreboardTop = scoreboard.slice(0, 6);

    return (
      <ScreenShell>
        <header className="surface glass space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="pill">Round {round || "–"}</span>
              <h2 className="heading text-fluid-headline text-balance">
                {currentQuestion.category || "Question"}
              </h2>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="score-pill">
                {isReveal
                  ? "Reveal"
                  : answerSummary.allAliveAnswered
                  ? "Locking in"
                  : "Players answering"}
              </span>
              <span className="text-fluid-meta text-[rgba(148,163,184,0.7)]">
                {round || "–"}/{maxRounds || "?"} · {aliveCount} alive
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-fluid-meta text-[rgba(148,163,184,0.7)] sm:flex-row sm:items-center sm:gap-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)] sm:flex-1">
              <div
                className="h-full rounded-full bg-[rgba(34,211,238,0.7)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-center sm:text-right">
              {answeredCount}/{aliveCount} answered
            </span>
          </div>
        </header>

        <section className="glass rounded-[24px] border border-[rgba(255,255,255,0.08)] px-6 py-8 text-center sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <p className="text-fluid-meta text-[rgba(148,163,184,0.7)]">
            Question {currentQuestion.questionNumber ?? round ?? "–"}
          </p>
          <h1 className="heading text-fluid-question leading-tight text-balance max-w-5xl mx-auto">
            {currentQuestion.text || currentQuestion.question}
          </h1>
        </section>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {currentQuestion.options?.map((option: string, index: number) => {
            const isCorrect =
              typeof correctIdx === "number" && correctIdx === index;
            let tone = "border-[rgba(255,255,255,0.1)] bg-[rgba(9,12,23,0.7)]";
            if (isReveal) {
              tone = isCorrect
                ? "border-[rgba(63,214,165,0.6)] bg-[rgba(32,162,119,0.18)]"
                : "border-[rgba(148,163,184,0.14)] bg-[rgba(9,12,23,0.55)] opacity-80";
            }
            return (
              <div
                key={`${option}-${index}`}
                className={`glass rounded-[20px] border px-6 py-5 text-left transition-all duration-300 sm:px-7 sm:py-6 lg:px-8 lg:py-7 ${tone} ${
                  isReveal && isCorrect ? 'animate-pulse-once' : ''
                }`}
              >
                <div className="flex items-start gap-4 sm:gap-5">
                  <span
                    className={`heading text-4xl ${
                      isCorrect ? "text-[rgba(63,214,165,0.9)]" : ""
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <p className="text-fluid-option text-[rgba(247,249,252,0.95)] leading-relaxed text-balance">
                    {option}
                  </p>
                  {isReveal && isCorrect && (
                    <span className="ml-auto text-3xl">✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <section className="surface space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-fluid-headline font-semibold text-[rgba(231,234,240,0.92)] text-balance">
              {isReveal
                ? "✨ Answers revealed"
                : answerSummary.allAliveAnswered
                ? "🔒 Locked in—revealing shortly"
                : "⏳ Waiting for the last survivors"}
            </p>
            <span className="text-fluid-meta text-[rgba(148,163,184,0.65)]">
              {Math.max(aliveCount - answeredCount, 0)} still deciding
            </span>
          </div>

          {isReveal && (
            <div className="glass rounded-[18px] border border-[rgba(63,214,165,0.3)] bg-[rgba(32,162,119,0.1)] px-6 py-5 text-[rgba(203,213,225,0.85)]">
              <p className="text-fluid-headline font-semibold text-[rgba(247,249,252,0.95)]">
                ✅ Correct answer:{" "}
                {typeof correctIdx === "number"
                  ? String.fromCharCode(65 + correctIdx)
                  : "Unknown"}
              </p>
              {currentQuestion.explanation && (
                <p className="mt-3 text-fluid-body leading-relaxed text-balance">
                  {currentQuestion.explanation}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="surface glass space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="heading text-2xl">Scoreboard</h3>
            <span className="text-fluid-meta text-[rgba(148,163,184,0.65)]">
              Top Survivors
            </span>
          </div>
          <div className="grid-fluid">
            {scoreboardTop.map((player) => (
              <article
                key={player.id}
                className={`rounded-[18px] border px-5 py-4 ${
                  player.isGhost
                    ? "border-[rgba(148,163,184,0.12)] bg-[rgba(9,12,23,0.5)] opacity-75"
                    : "border-[rgba(63,185,255,0.35)] bg-[rgba(63,185,255,0.12)]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-fluid-title font-semibold text-[rgba(247,249,252,0.95)] text-balance">
                    {player.name}
                  </p>
                  <span className="badge">
                    {Number(player.score ?? 0).toLocaleString()} pts
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-fluid-meta text-[rgba(148,163,184,0.65)] sm:flex-row sm:items-center sm:justify-between">
                  <span className="capitalize">
                    {player.isGhost
                      ? "Ghosted"
                      : player.hasAnswered
                      ? "Answered"
                      : "Thinking"}
                  </span>
                  <span className="uppercase">
                    {(player.lives ?? 0) > 0 ? `${player.lives} lives` : "Out"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </ScreenShell>
    );
  }

  if (normalizedState === "final") {
    return (
      <ScreenShell>
        <header className="surface glass space-y-6 text-center">
          <span className="pill inline-flex">Finale · Sudden Death</span>
          <h1 className="heading text-fluid-display text-balance">Final Escape</h1>
          {winner ? (
            <div className="glass rounded-[24px] border border-[rgba(148,163,184,0.14)] px-6 py-6 mx-auto max-w-2xl space-y-3 sm:px-8">
              <p className="text-fluid-meta text-[rgba(148,163,184,0.72)]">
                Survivor Identified
              </p>
              <p className="heading text-fluid-headline text-[rgba(244,63,94,0.85)]">
                {winner.name}
              </p>
              <p className="text-fluid-body text-[rgba(203,213,225,0.8)]">
                {Number(scores[winner.id] ?? 0).toLocaleString()} pts
              </p>
            </div>
          ) : (
            <p className="text-fluid-body text-[rgba(203,213,225,0.78)]">
              Waiting for the host to crown a winner…
            </p>
          )}
        </header>

        <section className="surface space-y-4">
          <h2 className="text-fluid-meta text-[rgba(148,163,184,0.72)]">
            Survivors Still Standing
          </h2>
          <div className="grid-fluid">
            {alivePlayers.map((player) => (
              <article
                key={player.id}
                className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] px-5 py-5 sm:px-6"
              >
                <p className="text-fluid-title font-semibold text-[rgba(247,249,252,0.95)] text-balance">
                  {player.name}
                </p>
                <p className="text-fluid-meta text-[rgba(148,163,184,0.65)]">
                  {Number(player.score ?? 0).toLocaleString()} pts ·{" "}
                  {player.lives ?? 0} lives
                </p>
              </article>
            ))}
          </div>
        </section>
      </ScreenShell>
    );
  }

  if (normalizedState === "results") {
    return (
      <ScreenShell>
        <header className="surface glass space-y-6 text-center">
          <span className="pill inline-flex">Game Complete</span>
          <h1 className="heading text-fluid-display text-balance">
            Final Reckoning
          </h1>
          {winner ? (
            <p className="text-fluid-body text-[rgba(203,213,225,0.8)]">
              Champion: {winner.name} ·{" "}
              {Number(scores[winner.id] ?? 0).toLocaleString()} pts
            </p>
          ) : (
            <p className="text-fluid-body text-[rgba(203,213,225,0.8)]">
              Awaiting winner announcement…
            </p>
          )}
        </header>

        <section className="surface space-y-4">
          <h2 className="text-fluid-meta text-[rgba(148,163,184,0.72)]">
            Leaderboard
          </h2>
          <div className="grid-fluid">
            {scoreboard.map((player, index) => (
              <article
                key={player.id}
                className={`flex flex-col gap-4 rounded-[20px] border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                  index === 0
                    ? "border-[rgba(244,63,94,0.6)] bg-[rgba(244,63,94,0.14)] shadow-[0_22px_44px_rgba(244,63,94,0.2)]"
                    : player.isGhost
                    ? "border-[rgba(148,163,184,0.12)] bg-[rgba(9,12,23,0.55)] opacity-75"
                    : "border-[rgba(148,163,184,0.16)] bg-[rgba(9,12,23,0.62)]"
                }`}
              >
                <div>
                  <p className="text-fluid-meta text-[rgba(148,163,184,0.65)]">
                    {player.isGhost
                      ? "Eliminated"
                      : index === 0
                      ? "Champion"
                      : `#${index + 1}`}
                  </p>
                  <p className="text-fluid-title font-semibold text-[rgba(247,249,252,0.95)] text-balance">
                    {player.name}
                  </p>
                </div>
                <span className="badge self-start sm:self-auto">
                  {Number(player.score ?? 0).toLocaleString()} pts
                </span>
              </article>
            ))}
          </div>
        </section>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface glass flex flex-col items-center gap-4 px-10 py-12 text-center">
          <div className="spinner" />
          <p className="text-fluid-meta text-[rgba(148,163,184,0.7)]">
            Syncing game state…
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}

function DisplayLink({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="glass rounded-[18px] border border-[rgba(148,163,184,0.12)] px-5 py-4">
      <p className="text-fluid-meta text-[rgba(148,163,184,0.7)]">
        {label}
      </p>
      <p
        className="font-mono text-[clamp(1.25rem,4vw,2.25rem)] tracking-[0.22em] text-[rgba(247,249,252,0.95)] break-words text-balance"
        title={value}
      >
        {value}
      </p>
      <p className="text-fluid-body text-[rgba(148,163,184,0.6)]">{helper}</p>
    </div>
  );
}
