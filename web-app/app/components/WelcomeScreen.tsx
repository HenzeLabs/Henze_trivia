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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-red-950 p-8">
      <div className="max-w-4xl w-full">
        <h1 className="heading text-7xl md:text-8xl text-red-600 text-center mb-12 select-none animate-pulse">
          HENZE TRIVIA
        </h1>

        <div
          className={`subtitle text-2xl md:text-3xl text-center mb-16 max-w-3xl mx-auto transition-opacity duration-300 min-h-[4rem] flex items-center justify-center ${
            fade ? "opacity-100" : "opacity-30"
          }`}
        >
          <p className="text-gray-300 font-semibold italic">"{tagline}"</p>
        </div>

        <div className="flex flex-col items-center gap-8">
          <button
            onClick={onJoin}
            className="btn-primary text-2xl px-16 py-6 shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:shadow-[0_0_80px_rgba(220,38,38,0.8)]"
          >
            JOIN THE GAME
          </button>

          <p className="text-gray-500 text-sm uppercase tracking-widest">
            No mercy. No refunds. Maximum carnage.
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-red-900/20 text-xs uppercase tracking-widest font-bold">
        <span>DEATH</span>
        <span>|</span>
        <span>GLORY</span>
      </div>
    </div>
  );
}
