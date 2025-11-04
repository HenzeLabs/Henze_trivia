"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CopyTarget = "player" | "tv" | null;

const FALLBACK_ORIGIN = "http://host:3000";

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");
const stripProtocol = (value: string) => value.replace(/^https?:\/\//, "");

export default function LandingPage() {
  const [playerUrl, setPlayerUrl] = useState<string>(FALLBACK_ORIGIN);
  const [tvUrl, setTvUrl] = useState<string>(`${FALLBACK_ORIGIN}/tv`);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = trimTrailingSlash(window.location.origin || FALLBACK_ORIGIN);
    setPlayerUrl(origin);
    setTvUrl(`${origin}/tv`);
  }, []);

  const handleCopy = useCallback((value: string, key: Exclude<CopyTarget, null>) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopiedTarget(null);
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedTarget(key);
        setTimeout(() => setCopiedTarget(null), 1800);
      })
      .catch(() => setCopiedTarget(null));
  }, []);

  const quickTips = useMemo(
    () => [
      "Collect your chaos crew before the host starts the ritual.",
      "Players need phones or laptops—TV view is read-only.",
      "Three lives per player. Wrong answers hurt.",
    ],
    []
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(140%_120%_at_50%_-20%,rgba(63,185,255,0.14)_0%,transparent_55%)] bg-[#060912] px-6 py-16 flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-16 h-[420px] w-[420px] rounded-full bg-[rgba(34,211,238,0.14)] blur-[180px]" />
        <div className="absolute -bottom-40 right-10 h-[520px] w-[520px] rounded-full bg-[rgba(244,63,94,0.12)] blur-[220px]" />
      </div>

      <main className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="surface glass h-full space-y-8">
          <span className="pill inline-flex">Welcome · Henze Trivia</span>
          <div className="space-y-4">
            <h1 className="heading text-5xl md:text-6xl tracking-[0.22em] glow-text">
              Choose Your Arena
            </h1>
            <p className="text-base md:text-lg text-[rgba(203,213,225,0.78)] max-w-xl leading-relaxed">
              Launch the lobby on your device or broadcast the action to the room. This landing page keeps everyone in sync with a clean hand-off between player screens and the TV display.
            </p>
          </div>

          <div className="badge-list">
            <span className="badge">Realtime scoreboard sync</span>
            <span className="badge">Optimized for dark rooms</span>
            <span className="badge">No-app required</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/" className="btn-primary justify-center py-3">
              Enter Player Lobby
            </Link>
            <Link
              href="/tv"
              className="btn-secondary justify-center py-3 border border-[rgba(34,211,238,0.35)]"
            >
              Open TV Display
            </Link>
          </div>

          <div className="glass rounded-[22px] border border-[rgba(148,163,184,0.14)] p-6 space-y-4">
            <h2 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
              Quick Briefing
            </h2>
            <ul className="space-y-2 text-sm text-[rgba(203,213,225,0.75)]">
              {quickTips.map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[rgba(34,211,238,0.8)]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="surface h-full space-y-6">
          <header className="space-y-2">
            <p className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
              Share These Links
            </p>
            <h2 className="heading text-3xl tracking-[0.2em]">Join Codes</h2>
            <p className="text-sm text-[rgba(203,213,225,0.75)]">
              Hand these out to players and the host controlling the TV. Links update automatically to match whichever machine is serving the game.
            </p>
          </header>

          <div className="space-y-4">
            <UrlRow
              label="Player Devices"
              helper="Everyone joins the lobby here"
              value={playerUrl}
              displayValue={stripProtocol(playerUrl)}
              onCopy={() => handleCopy(playerUrl, "player")}
              isCopied={copiedTarget === "player"}
            />
            <UrlRow
              label="TV Display"
              helper="Open on a big screen or projector"
              value={tvUrl}
              displayValue={stripProtocol(tvUrl)}
              onCopy={() => handleCopy(tvUrl, "tv")}
              isCopied={copiedTarget === "tv"}
            />
          </div>

          <div className="glass rounded-[22px] border border-[rgba(148,163,184,0.14)] p-6 space-y-4">
            <h3 className="subtitle uppercase tracking-[0.24em] text-xs text-[rgba(148,163,184,0.75)]">
              How The Night Flows
            </h3>
            <ol className="space-y-3 text-sm text-[rgba(203,213,225,0.78)]">
              <li className="flex gap-3">
                <span className="score-pill">01</span>
                <span>Host launches the TV display using the second link.</span>
              </li>
              <li className="flex gap-3">
                <span className="score-pill">02</span>
                <span>Players join from phones using the player lobby link.</span>
              </li>
              <li className="flex gap-3">
                <span className="score-pill">03</span>
                <span>Once everyone is locked in, start the ritual from the host screen.</span>
              </li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}

function UrlRow({
  label,
  helper,
  value,
  displayValue,
  onCopy,
  isCopied,
}: {
  label: string;
  helper: string;
  value: string;
  displayValue: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <div className="glass rounded-[18px] border border-[rgba(148,163,184,0.12)] px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-[rgba(148,163,184,0.72)]">
            {label}
          </p>
          <p className="font-mono text-lg tracking-wider text-[rgba(247,249,252,0.95)]">
            <span title={value}>{displayValue}</span>
          </p>
          <p className="text-xs text-[rgba(148,163,184,0.6)]">{helper}</p>
        </div>
        <button
          onClick={onCopy}
          className={`inline-flex items-center justify-center gap-2 rounded-[12px] border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
            isCopied
              ? "border-[rgba(63,214,165,0.45)] bg-[rgba(63,214,165,0.16)] text-[rgba(224,255,245,0.9)]"
              : "border-[rgba(34,211,238,0.35)] bg-[rgba(34,211,238,0.08)] text-[rgba(191,239,255,0.85)] hover:border-[rgba(34,211,238,0.6)]"
          }`}
          aria-label={isCopied ? "Copied to clipboard" : `Copy ${label} link`}
        >
          {isCopied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
