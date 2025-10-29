"use client";

import { useState } from "react";

interface LaughButtonProps {
  onVote: () => void;
  disabled?: boolean;
  hasVoted?: boolean;
  voteCount?: number;
}

export default function LaughButton({
  onVote,
  disabled = false,
  hasVoted = false,
  voteCount = 0,
}: LaughButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled || hasVoted) return;

    setIsAnimating(true);
    onVote();

    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || hasVoted}
      className={`
        relative flex items-center gap-2 px-6 py-3 rounded-full
        font-bold text-lg transition-all duration-200
        ${
          hasVoted
            ? "bg-yellow-500 text-white scale-110"
            : "bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:scale-105"
        }
        ${disabled && !hasVoted ? "opacity-50 cursor-not-allowed" : ""}
        ${isAnimating ? "animate-bounce" : ""}
        shadow-lg hover:shadow-xl
      `}
    >
      <span className="text-2xl">{hasVoted ? "😂" : "😄"}</span>
      <span>{hasVoted ? "Hilarious!" : "Vote Funny"}</span>
      {voteCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {voteCount}
        </span>
      )}
    </button>
  );
}
