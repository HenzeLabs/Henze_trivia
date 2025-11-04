'use client';

import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div
      className={className}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedButton({ children, onClick, className = '' }: { 
  children: ReactNode, 
  onClick?: () => void,
  className?: string 
}) {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  );
}

// Countdown animation
export function CountdownAnimation({ count }: { count: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={count}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [1, 1.2, 1], opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="text-8xl font-bold text-white"
      >
        {count}
      </motion.div>
    </AnimatePresence>
  );
}

// Score animation
export function ScorePopup({ points, show }: { points: number, show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 0, opacity: 1, scale: 0.5 }}
          animate={{ y: -50, opacity: 0, scale: 1.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute text-4xl font-bold text-green-400"
        >
          +{points}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confetti animation for winners
export function ConfettiEffect() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
  
  return (
    <div className="fixed inset-0 pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{ 
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ 
            y: window.innerHeight + 20,
            x: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720
          }}
          transition={{ 
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 0.5
          }}
        />
      ))}
    </div>
  );
}

// Loading spinner
export function LoadingSpinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"
    />
  );
}

// Progress bar animation
export function AnimatedProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur">
      <motion.div
        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}