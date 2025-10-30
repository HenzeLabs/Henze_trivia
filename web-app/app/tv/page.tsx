"use client";

import React, { useEffect, useState } from "react";
import io from "socket.io-client";

export default function TVPage() {
  const [socket, setSocket] = useState<any>(null);
  const [gameState, setGameState] = useState("lobby");
  const [players, setPlayers] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [round, setRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(20);
  const [allAnswered, setAllAnswered] = useState(false);

  useEffect(() => {
    const socketInstance = io();
    setSocket(socketInstance);

    socketInstance.on("game:update", (data) => {
      console.log("[TV] Received game:update", data);
      setGameState(data.state);
      setPlayers(data.players);
      setCurrentQuestion(data.question);
      setRound(data.round);
      setMaxRounds(data.totalRounds);
      setAllAnswered(data.allAnswered);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Lobby Screen
  if (gameState === "lobby" || gameState === "LOBBY") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0505 50%, #0a0a0a 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <h1
          style={{
            fontSize: "6rem",
            fontWeight: 900,
            textAlign: "center",
            marginBottom: "3rem",
            background: "linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #dc2626 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            letterSpacing: "2px",
            textTransform: "uppercase",
            position: "relative",
            zIndex: 1,
          }}
        >
          Trivia Murder Party
        </h1>

        <div
          style={{
            background: "rgba(26, 26, 26, 0.8)",
            border: "4px solid #dc2626",
            borderRadius: 32,
            padding: "3rem 4rem",
            maxWidth: "800px",
            width: "100%",
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), inset 0 2px 8px rgba(255,255,255,0.1)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h2
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              color: "#dc2626",
              textAlign: "center",
              marginBottom: "2rem",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Players Connected: {players.length}
          </h2>

          {players.length === 0 ? (
            <p
              style={{
                fontSize: "2rem",
                color: "#999",
                textAlign: "center",
                fontWeight: 600,
                fontStyle: "italic",
              }}
            >
              Waiting for players to join...
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: players.length > 2 ? "1fr 1fr" : "1fr",
                gap: "1.5rem",
              }}
            >
              {players.map((player, idx) => (
                <div
                  key={player.id}
                  style={{
                    background: "linear-gradient(135deg, #1f1f1f 0%, #0f0f0f 100%)",
                    padding: "1.5rem 2rem",
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    border: "2px solid #dc2626",
                    boxShadow: "0 4px 16px rgba(220, 38, 38, 0.3)",
                  }}
                >
                  <div
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      fontWeight: 900,
                      flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(220, 38, 38, 0.5)",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {player.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p
            style={{
              marginTop: "3rem",
              fontSize: "1.8rem",
              color: "#dc2626",
              textAlign: "center",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            ⏱️ Start the game from your phone
          </p>
        </div>
      </div>
    );
  }

  // Question Screen
  if (
    (gameState === "ASKING" ||
      gameState === "question" ||
      gameState === "REVEAL" ||
      gameState === "reveal") &&
    currentQuestion
  ) {
    const isReveal = gameState === "reveal" || gameState === "REVEAL";
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a0505 50%, #0a0a0a 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "3rem 3rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background effect */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.1) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Header with round and category */}
        <header
          style={{
            width: "100%",
            maxWidth: "1600px",
            marginBottom: "2.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              color: "#dc2626",
              fontSize: "2.5rem",
              textTransform: "uppercase",
              letterSpacing: "2px",
              textShadow: "0 0 20px rgba(220, 38, 38, 0.5)",
            }}
          >
            Round {round} / {maxRounds}
          </div>
          <div
            style={{
              fontWeight: 800,
              color: "#fff",
              fontSize: "2rem",
              background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
              borderRadius: 16,
              padding: "1rem 2.5rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
              boxShadow:
                "0 8px 32px rgba(220, 38, 38, 0.4), inset 0 -2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {currentQuestion.category}
          </div>
        </header>

        {/* Question */}
        <section
          style={{
            marginBottom: "3rem",
            width: "100%",
            maxWidth: "1600px",
            zIndex: 1,
          }}
        >
          <h2
            style={{
              fontSize: "3.5rem",
              fontWeight: 900,
              color: "#fff",
              textAlign: "center",
              marginBottom: "2rem",
              letterSpacing: "-1px",
              lineHeight: "1.2",
              textShadow: "0 4px 12px rgba(0, 0, 0, 0.8)",
              padding: "0 2rem",
            }}
          >
            {currentQuestion.text || currentQuestion.question}
          </h2>
        </section>

        {/* Answer options in 2x2 grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            width: "100%",
            maxWidth: "1600px",
            marginBottom: "2.5rem",
            zIndex: 1,
          }}
        >
          {currentQuestion.options.map((option: string, i: number) => {
            let styleObj: any = {
              background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
              color: "#fff",
              border: "4px solid #dc2626",
              borderRadius: 24,
              padding: "2.5rem 3rem",
              fontWeight: 900,
              fontSize: "2.2rem",
              display: "flex",
              alignItems: "center",
              transition: "all 0.3s ease",
              boxShadow:
                "0 8px 32px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255,255,255,0.1)",
              position: "relative",
              overflow: "hidden",
            };
            if (isReveal) {
              if (i === (currentQuestion.correct ?? currentQuestion.answer_index)) {
                styleObj.background =
                  "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)";
                styleObj.color = "#fff";
                styleObj.border = "4px solid #fff";
                styleObj.boxShadow =
                  "0 0 60px rgba(220, 38, 38, 0.8), inset 0 -4px 12px rgba(0,0,0,0.4)";
                styleObj.transform = "scale(1.03)";
              } else {
                styleObj.background = "#1a1a1a";
                styleObj.color = "#666";
                styleObj.border = "4px solid #333";
                styleObj.opacity = "0.5";
              }
            }
            const correctIdx = currentQuestion.correct ?? currentQuestion.answer_index;
            return (
              <div key={i} style={styleObj}>
                <span
                  style={{
                    background:
                      isReveal && i === correctIdx ? "#fff" : "#dc2626",
                    color: isReveal && i === correctIdx ? "#dc2626" : "#fff",
                    fontWeight: 900,
                    fontSize: "2.5rem",
                    marginRight: 24,
                    width: 70,
                    height: 70,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ flex: 1 }}>{option}</span>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        {!isReveal && (
          <div
            style={{
              color: "#dc2626",
              fontWeight: 800,
              fontSize: "2.2rem",
              textTransform: "uppercase",
              letterSpacing: "2px",
              textShadow: "0 0 20px rgba(220, 38, 38, 0.6)",
              zIndex: 1,
            }}
          >
            {allAnswered ? "🔥 Revealing answer..." : "⏱️ Players answering..."}
          </div>
        )}

        {/* Explanation during reveal */}
        {isReveal && currentQuestion.explanation && (
          <section
            style={{
              background: "rgba(26, 26, 26, 0.9)",
              borderRadius: 24,
              padding: "2rem 3rem",
              width: "100%",
              maxWidth: "1600px",
              border: "4px solid #dc2626",
              boxShadow: "0 12px 48px rgba(220, 38, 38, 0.3)",
              zIndex: 1,
            }}
          >
            <div
              style={{
                color: "#dc2626",
                fontWeight: 900,
                fontSize: "2rem",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              ✓ Correct:{" "}
              {String.fromCharCode(
                65 + (currentQuestion.correct ?? currentQuestion.answer_index)
              )}
            </div>
            <p
              style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "1.8rem",
                lineHeight: "1.6",
              }}
            >
              {currentQuestion.explanation}
            </p>
          </section>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ fontSize: "2rem" }}>Loading...</p>
    </div>
  );
}
