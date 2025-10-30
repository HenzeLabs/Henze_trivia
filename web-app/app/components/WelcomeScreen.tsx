import React, { useEffect, useState } from "react";

const TAGLINES = [
  "Join to play. Regret everything.",
  "1280 trauma, now interactive.",
  "You brought this on yourself.",
  "We saved the receipts. You're screwed.",
  "Now featuring your worst 3AM takes.",
  "This isn’t trivia. It’s character assassination.",
  "Roasts powered by your actual messages.",
  "Welcome to the group chat version of Saw.",
  "Bring a therapist. You’ll need it.",
  "Answer questions or be publicly shamed.",
];

export default function WelcomeScreen({ onJoin }: { onJoin: () => void }) {
  const [tagline, setTagline] = useState(TAGLINES[0]);
  const [mounted, setMounted] = useState(false);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setTagline((prev) => {
          let idx = TAGLINES.indexOf(prev);
          let next =
            (idx + 1 + Math.floor(Math.random() * (TAGLINES.length - 1))) %
            TAGLINES.length;
          return TAGLINES[next];
        });
        setFade(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[480px] h-[480px] bg-[rgba(244,63,94,0.12)] blur-[180px]" />
        <div className="absolute bottom-[-25%] right-[15%] w-[520px] h-[520px] bg-[rgba(34,211,238,0.1)] blur-[200px]" />
      </div>

      <div className="surface max-w-4xl w-full text-center fade-in relative z-10">
        <div className="flex justify-center mb-6">
          <span className="pill pulse-ring">
            Tonight&apos;s Feature · Multiplayer Roast Ritual
          </span>
        </div>
        <h1 className="heading text-6xl md:text-7xl lg:text-8xl tracking-[0.25em] mb-8 glow-text">
          HENZE TRIVIA
        </h1>
        <div
          className={`subtitle text-xl md:text-2xl max-w-3xl mx-auto transition-opacity duration-300 min-h-[3.5rem] flex items-center justify-center ${
            fade ? "opacity-100" : "opacity-20"
          }`}
        >
          <p className="text-gray-200/90 font-semibold italic">
            “{tagline}”
          </p>
        </div>
        <div className="divider" />
        <div className="stat-grid mt-8">
          <div className="stat-card">
            <span className="subtitle uppercase tracking-[0.28em] text-xs text-[rgba(148,163,184,0.75)]">
              Survivors Tonight
            </span>
            <span className="heading text-4xl text-left">8 max</span>
            <p className="text-sm text-[rgba(203,213,225,0.7)] text-left">
              Seats fill fast. First come, first sacrificed.
            </p>
          </div>
          <div className="stat-card">
            <span className="subtitle uppercase tracking-[0.28em] text-xs text-[rgba(148,163,184,0.75)]">
              Rounds Loaded
            </span>
            <span className="heading text-4xl text-left">20</span>
            <p className="text-sm text-[rgba(203,213,225,0.7)] text-left">
              Trivia, callouts, and the occasional sabotage.
            </p>
          </div>
          <div className="stat-card">
            <span className="subtitle uppercase tracking-[0.28em] text-xs text-[rgba(148,163,184,0.75)]">
              House Rules
            </span>
            <span className="heading text-4xl text-left">3 lives</span>
            <p className="text-sm text-[rgba(203,213,225,0.7)] text-left">
              Miss a question, lose a life. Zero mercy. Minimal refunds.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center gap-6">
          <button onClick={onJoin} className="btn-primary px-8 py-4">
            Enter The Lobby
          </button>
          <p className="text-xs uppercase tracking-[0.24em] text-[rgba(148,163,184,0.65)]">
            No walk-ins · No gentle mode · No ties
          </p>
        </div>
      </div>

      <div className="marquee mt-16 w-full relative z-0">
        <div className="marquee-inner">
          <span>Prepare your alibi</span>
          <span>Bring spare dignity</span>
          <span>Street cred not accepted</span>
          <span>Therapists on standby</span>
          <span>Prepare your alibi</span>
          <span>Bring spare dignity</span>
        </div>
      </div>
    </div>
  );
}
