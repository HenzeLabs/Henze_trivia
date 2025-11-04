'use client';

import { ReactNode } from 'react';

// Entrance animations
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const slideUp = {
  initial: { y: 50, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -50, opacity: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 30 }
};

export const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  transition: { duration: 0.2 }
};

export const bounceIn = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: [0, 1.2, 0.9, 1.05, 1],
    opacity: 1
  },
  transition: { 
    duration: 0.6,
    times: [0, 0.4, 0.6, 0.8, 1]
  }
};

// Animated components
export function AnimatedCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <div className={`${className} animate-fade-in hover:scale-[1.02] active:scale-[0.98] transition-transform`}>
      {children}
    </div>
  );
}

export function AnimatedButton({ children, onClick, className = '' }: { 
  children: ReactNode, 
  onClick?: () => void,
  className?: string 
}) {
  return (
    <button
      className={`${className} hover:scale-105 active:scale-95 transition-transform animate-fade-in`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Countdown animation
export function CountdownAnimation({ count }: { count: number }) {
  return (
    <div
      key={count}
      className="text-8xl font-bold text-white animate-bounce"
    >
      {count}
    </div>
  );
}

// Score animation
export function ScorePopup({ points, show }: { points: number, show: boolean }) {
  return (
    <>
      {show && (
        <div className="absolute text-4xl font-bold text-green-400 animate-bounce">
          +{points}
        </div>
      )}
    </>
  );
}

// Confetti animation for winners
export function ConfettiEffect() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
  
  return (
    <div className="fixed inset-0 pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full animate-bounce"
          style={{ 
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`
          }}
        />
      ))}
    </div>
  );
}

// Loading spinner
export function LoadingSpinner() {
  return (
    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
  );
}

// Progress bar animation
export function AnimatedProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur">
      <div
        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}