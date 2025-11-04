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
  <div className="relative min-h-screen w-full overflow-hidden bg-[#060912] px-8 py-12 text-white">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 left-[12%] h-[520px] w-[520px] rounded-full bg-[rgba(34,211,238,0.12)] blur-[220px]" />
      <div className="absolute -bottom-48 right-[10%] h-[620px] w-[620px] rounded-full bg-[rgba(244,63,94,0.12)] blur-[260px]" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_-20%,rgba(63,185,255,0.08)_0%,transparent_55%)]" />
    </div>
    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8">{children}</div>
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostUrl(trimTrailingSlash(window.location.origin || FALLBACK_ORIGIN));
    }
  }, []);

  useEffect(() => {
    const socketInstance = io();

    socketInstance.on("game:update", (data) => {
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
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const scoreboard = useMemo(() => {
    return players
      .map((player) => ({
        ...player,
        score: scores[player.id] ?? player.score ?? 0,
        isGhost: ghosts.includes(player.id),
      }))
      .sort((a, b) => {
        if (a.isGhost !== b.isGhost) {
          return a.isGhost ? 1 : -1;
        }
        if ((b.score ?? 0) !== (a.score ?? 0)) {
          return (b.score ?? 0) - (a.score ?? 0);
        }
        return a.name.localeCompare(b.name);
      });
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
  const hostDisplay = stripProtocol(hostUrl);
  const tvDisplay = `${stripProtocol(hostUrl)}/tv`;

  if (normalizedState === "lobby") {
    return (
      <ScreenShell>
        <header className="space-y-4 text-center md:text-left">
          <span className="pill inline-flex">Lobby · Broadcast Mode</span>
          <h1 className="heading text-5xl tracking-[0.24em] md:text-6xl">
            Henze Trivia Murder Party
          </h1>
          <p className="text-lg text-[rgba(203,213,225,0.78)] md:max-w-3xl">
            Keep this screen on your TV or projector. Players join from their
            own devices, and the stage updates live with every elimination.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="surface glass space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.7)]">
                  Survivors Checked In
                </p>
                <p className="heading text-5xl">{playerCount}</p>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="score-pill">Lobby Live</span>
                <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.65)]">
                  Host starts from their device
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {players.length === 0 ? (
                <div className="glass rounded-[18px] border border-[rgba(148,163,184,0.12)] px-6 py-8 text-center md:col-span-2">
                  <p className="text-lg text-[rgba(203,213,225,0.75)]">
                    Waiting for players to claim their seats…
                  </p>
                </div>
              ) : (
                players.map((player, index) => (
                  <article
                    key={player.id}
                    className="glass rounded-[18px] border border-[rgba(148,163,184,0.12)] px-6 py-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="heading text-3xl text-[rgba(244,63,94,0.85)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="font-semibold text-[rgba(247,249,252,0.95)]">
                            {player.name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.6)]">
                            Waiting on host
                          </p>
                        </div>
                      </div>
                      <span className="badge">Ready</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <aside className="surface space-y-6">
            <div className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] px-6 py-6 space-y-4">
              <p className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
                Share These Links
              </p>
              <div className="space-y-3">
                <DisplayLink label="Player Lobby" value={hostDisplay} helper="Players join from phones" />
                <DisplayLink label="TV Display" value={tvDisplay} helper="Keep this open on the big screen" />
              </div>
            </div>

            <div className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] px-6 py-6 space-y-3">
              <p className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
                Quick Checklist
              </p>
              <ul className="space-y-2 text-sm text-[rgba(203,213,225,0.78)]">
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

  if ((normalizedState === "asking" || normalizedState === "question" || normalizedState === "reveal") && currentQuestion) {
    const correctIdx = getCorrectIndex(currentQuestion);
    const progress = aliveCount > 0 ? Math.min(100, Math.max(0, (answeredCount / aliveCount) * 100)) : 0;
    const scoreboardTop = scoreboard.slice(0, 6);

    return (
      <ScreenShell>
        <header className="surface glass space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="pill">Round {round || "–"}</span>
              <h2 className="heading text-4xl md:text-5xl">
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
              <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.7)]">
                {round || "–"}/{maxRounds || "?"} · {aliveCount} alive
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.7)]">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-[rgba(34,211,238,0.7)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>
              {answeredCount}/{aliveCount} answered
            </span>
          </div>
        </header>

        <section className="glass rounded-[24px] border border-[rgba(255,255,255,0.08)] px-10 py-12 text-center">
          <p className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.7)]">
            Question {currentQuestion.questionNumber ?? round ?? "–"}
          </p>
          <h1 className="heading text-4xl md:text-5xl leading-tight">
            {currentQuestion.text || currentQuestion.question}
          </h1>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {currentQuestion.options?.map((option: string, index: number) => {
            const isCorrect = typeof correctIdx === "number" && correctIdx === index;
            let tone = "border-[rgba(255,255,255,0.1)] bg-[rgba(9,12,23,0.7)]";
            if (isReveal) {
              tone = isCorrect
                ? "border-[rgba(63,214,165,0.6)] bg-[rgba(32,162,119,0.18)]"
                : "border-[rgba(148,163,184,0.14)] bg-[rgba(9,12,23,0.55)] opacity-80";
            }
            return (
              <div
                key={`${option}-${index}`}
                className={`glass rounded-[20px] border px-8 py-6 text-left transition-all duration-200 ${tone}`}
              >
                <div className="flex items-start gap-5">
                  <span className={`heading text-3xl ${isCorrect ? "text-[rgba(63,214,165,0.9)]" : ""}`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <p className="text-xl text-[rgba(247,249,252,0.95)] leading-relaxed">
                    {option}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <section className="surface space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-lg font-semibold text-[rgba(231,234,240,0.92)]">
              {isReveal ? "Answers revealed" : answerSummary.allAliveAnswered ? "Locked in—revealing shortly" : "Waiting for the last survivors"}
            </p>
            <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.65)]">
              {Math.max(aliveCount - answeredCount, 0)} still deciding
            </span>
          </div>

          {isReveal && (
            <div className="glass rounded-[18px] border border-[rgba(148,163,184,0.12)] px-6 py-5 text-sm text-[rgba(203,213,225,0.85)]">
              <p className="font-semibold text-[rgba(247,249,252,0.95)]">
                Correct answer: {typeof correctIdx === "number" ? String.fromCharCode(65 + correctIdx) : "Unknown"}
              </p>
              {currentQuestion.explanation && <p className="mt-2">{currentQuestion.explanation}</p>}
            </div>
          )}
        </section>

        <section className="surface glass space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="heading text-2xl">Scoreboard</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.65)]">
              Top Survivors
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
                  <p className="text-2xl font-semibold text-[rgba(247,249,252,0.95)]">
                    {player.name}
                  </p>
                  <span className="badge">
                    {Number(player.score ?? 0).toLocaleString()} pts
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm uppercase tracking-[0.22em] text-[rgba(148,163,184,0.65)]">
                  <span>
                    {player.isGhost ? "Ghosted" : player.hasAnswered ? "Answered" : "Thinking"}
                  </span>
                  <span>{(player.lives ?? 0) > 0 ? `${player.lives} lives` : "Out"}</span>
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
          <h1 className="heading text-5xl tracking-[0.24em]">Final Escape</h1>
          {winner ? (
            <div className="glass rounded-[24px] border border-[rgba(148,163,184,0.14)] px-10 py-6 mx-auto max-w-2xl space-y-2">
              <p className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.72)]">
                Survivor Identified
              </p>
              <p className="heading text-4xl text-[rgba(244,63,94,0.85)]">{winner.name}</p>
              <p className="text-base text-[rgba(203,213,225,0.8)]">
                {Number(scores[winner.id] ?? 0).toLocaleString()} pts
              </p>
            </div>
          ) : (
            <p className="text-base text-[rgba(203,213,225,0.78)]">
              Waiting for the host to crown a winner…
            </p>
          )}
        </header>

        <section className="surface space-y-4">
          <h2 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.72)]">
            Survivors Still Standing
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {alivePlayers.map((player) => (
              <article
                key={player.id}
                className="glass rounded-[20px] border border-[rgba(148,163,184,0.12)] px-6 py-5"
              >
                <p className="text-lg font-semibold text-[rgba(247,249,252,0.95)]">
                  {player.name}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.65)]">
                  {Number(player.score ?? 0).toLocaleString()} pts · {player.lives ?? 0} lives
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
          <h1 className="heading text-5xl tracking-[0.24em]">Final Reckoning</h1>
          {winner ? (
            <p className="text-lg text-[rgba(203,213,225,0.8)]">
              Champion: {winner.name} · {Number(scores[winner.id] ?? 0).toLocaleString()} pts
            </p>
          ) : (
            <p className="text-lg text-[rgba(203,213,225,0.8)]">
              Awaiting winner announcement…
            </p>
          )}
        </header>

        <section className="surface space-y-4">
          <h2 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.72)]">
            Leaderboard
          </h2>
          <div className="space-y-3">
            {scoreboard.map((player, index) => (
              <article
                key={player.id}
                className={`flex items-center justify-between gap-4 rounded-[20px] border px-6 py-4 ${
                  index === 0
                    ? "border-[rgba(244,63,94,0.6)] bg-[rgba(244,63,94,0.14)] shadow-[0_22px_44px_rgba(244,63,94,0.2)]"
                    : player.isGhost
                    ? "border-[rgba(148,163,184,0.12)] bg-[rgba(9,12,23,0.55)] opacity-75"
                    : "border-[rgba(148,163,184,0.16)] bg-[rgba(9,12,23,0.62)]"
                }`}
              >
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[rgba(148,163,184,0.65)]">
                    {player.isGhost ? "Eliminated" : index === 0 ? "Champion" : `#${index + 1}`}
                  </p>
                  <p className="text-2xl font-semibold text-[rgba(247,249,252,0.95)]">
                    {player.name}
                  </p>
                </div>
                <span className="badge">
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
          <p className="text-sm uppercase tracking-[0.24em] text-[rgba(148,163,184,0.7)]">
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
      <p className="text-xs uppercase tracking-[0.2em] text-[rgba(148,163,184,0.7)]">
        {label}
      </p>
      <p className="font-mono text-2xl tracking-widest text-[rgba(247,249,252,0.95)]" title={value}>
        {value}
      </p>
      <p className="text-xs text-[rgba(148,163,184,0.6)]">{helper}</p>
    </div>
  );
}
