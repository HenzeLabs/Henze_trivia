"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-black flex items-center justify-center p-8">
      <div className="bg-gray-900 border-4 border-red-500 rounded-3xl p-12 w-full max-w-4xl shadow-2xl text-center">
        <h1 className="text-6xl font-black text-red-400 mb-8 drop-shadow-lg">
          🎮 HENZE TRIVIA MURDER PARTY 🎮
        </h1>
        <p className="text-2xl text-red-300 mb-12 font-medium">
          Choose your experience:
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-red-800/30 border-3 border-red-600 rounded-2xl p-8">
            <h2 className="text-4xl font-bold text-yellow-400 mb-6">
              📱 PLAYERS
            </h2>
            <p className="text-red-200 mb-6 text-lg">
              Join the game on your phone or computer
            </p>
            <div className="bg-black/50 border-2 border-yellow-500 rounded-xl p-4 mb-6">
              <div className="text-yellow-300 font-mono text-2xl font-bold">
                192.168.1.159:3000
              </div>
            </div>
            <Link
              href="/"
              className="block w-full p-4 text-xl font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors border-2 border-red-400"
            >
              🎯 JOIN GAME
            </Link>
          </div>
          <div className="bg-purple-800/30 border-3 border-purple-600 rounded-2xl p-8">
            <h2 className="text-4xl font-bold text-yellow-400 mb-6">
              📺 TV DISPLAY
            </h2>
            <p className="text-purple-200 mb-6 text-lg">
              Big screen view for everyone to see
            </p>
            <div className="bg-black/50 border-2 border-yellow-500 rounded-xl p-4 mb-6">
              <div className="text-yellow-300 font-mono text-2xl font-bold">
                192.168.1.159:3000/tv
              </div>
            </div>
            <Link
              href="/tv"
              className="block w-full p-4 text-xl font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors border-2 border-purple-400"
            >
              📺 OPEN TV VIEW
            </Link>
          </div>
        </div>
        <div className="mt-12 p-6 bg-gray-800/50 border-2 border-gray-600 rounded-xl">
          <h3 className="text-2xl font-bold text-gray-300 mb-4">
            How to Play:
          </h3>
          <div className="text-left text-gray-400 space-y-2">
            <p>1. Open TV view on your big screen</p>
            <p>2. Players join on their phones using the player URL</p>
            <p>3. Answer questions - wrong answers cost you a life!</p>
            <p>4. Last player standing wins!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
