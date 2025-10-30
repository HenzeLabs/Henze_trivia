"use client";
import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import "./tv-styles.css";

export default function TVDisplay() {
  const [gameState, setGameState] = useState("lobby");
  const [players, setPlayers] = useState<any[]>([]);
  const [alivePlayers, setAlivePlayers] = useState<any[]>([]);
  const [ghosts, setGhosts] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [scores, setScores] = useState<any>({});
  const [lives, setLives] = useState<any>({});
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(20);
  const [finalRound, setFinalRound] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [allAnswered, setAllAnswered] = useState(false);
  const [hostname, setHostname] = useState("Loading...");
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  // Set hostname on client side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostname(window.location.host);
    }
  }, []);

  // --- Socket.IO integration ---
  useEffect(() => {
    let socket: Socket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    let isMounted = true;

    const connectSocket = () => {
      if (socket) return;
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : undefined;
      socket = io(baseUrl || "", { path: "/socket.io" });

      socket.on("connect", () => {
        console.log("[TV] Socket connected", socket?.id);
        reconnectAttempts = 0;
      });

      socket.onAny((event, ...args) => {
        console.log(`[TV] Socket event: ${event}`, ...args);
      });

      socket.on("disconnect", () => {
        console.log("[TV] Socket disconnected", socket?.id);
        if (isMounted) {
          reconnectAttempts++;
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 15000);
          reconnectTimeout = setTimeout(() => {
            if (socket) {
              socket.connect();
            } else {
              connectSocket();
            }
          }, delay);
        }
      });

      socket.on("game:update", (data) => {
        console.log("[TV] Received game:update", data);
        setGameState(data.state);
        setPlayers(data.players);
        setAlivePlayers(data.alivePlayers || []);
        setGhosts(data.ghosts || []);
        setCurrentQuestion(data.currentQuestion);
        setQuestionNumber(data.questionNumber);
        setTotalQuestions(data.totalQuestions);
        setRound(data.round);
        setMaxRounds(data.maxRounds);
        setFinalRound(data.finalRound);
        setWinner(data.winner);
        setScores(data.scores);
        setLives(data.lives);
        setAllAnswered(data.allAnswered);
      });

      // Save socket instance for starting game
      setSocketInstance(socket);
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      setSocketInstance(null);
    };
  }, []);

  // Lobby Screen - TV View (Cinematic Netflix-style)
  if (gameState === "lobby" || gameState === "LOBBY") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <h1
          style={{
            fontSize: "4rem",
            fontWeight: 900,
            color: "#e50914",
            marginBottom: "1rem",
            letterSpacing: "-2px",
          }}
        >
          Trivia Murder Party
        </h1>
        <p
          style={{
            fontSize: "1.5rem",
            color: "#fff",
            marginBottom: "2rem",
            fontWeight: 600,
          }}
        >
          Answer correctly or face elimination
        </p>
        <section style={{ marginBottom: "2rem", width: "100%", maxWidth: 600 }}>
          <p style={{ fontWeight: 700, color: "#e50914", fontSize: "1.2rem" }}>
            Players Connected
          </p>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 900,
              color: "#fff",
              marginBottom: "1rem",
            }}
          >
            {players.length}
            <span style={{ color: "#e50914", fontWeight: 700 }}>/8</span>
          </div>
          {players.length > 0 ? (
            <div>
              {players.map((player, i) => (
                <div
                  key={player.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#111",
                    border: "2px solid #e50914",
                    borderRadius: 12,
                    padding: "0.75rem 1.25rem",
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: "#e50914", fontWeight: 900 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>
                    {player.name}
                  </span>
                  <span style={{ color: "#e50914", fontWeight: 700 }}>
                    Ready
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#e50914", fontWeight: 700 }}>
              Waiting for players to join...
            </p>
          )}
        </section>
        <section style={{ marginBottom: "2rem", textAlign: "center" }}>
          <p style={{ color: "#fff", fontWeight: 700 }}>Join on your phone</p>
          <a
            href="#"
            style={{
              color: "#e50914",
              fontWeight: 900,
              fontSize: "1.2rem",
              textDecoration: "underline",
            }}
          >
            {hostname}
          </a>
        </section>
        <button
          disabled={players.length < 1}
          style={{
            padding: "1rem 3rem",
            fontSize: "1.5rem",
            fontWeight: 900,
            borderRadius: 16,
            background: players.length >= 1 ? "#e50914" : "#222",
            color: "#fff",
            border: "2px solid #e50914",
            boxShadow: "0 0 16px #e50914",
            cursor: players.length >= 1 ? "pointer" : "not-allowed",
            marginBottom: "2rem",
            transition: "background 0.2s, color 0.2s",
          }}
        >
          {players.length >= 1 ? "Start Game" : "Waiting for Players"}
        </button>
        <footer
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: "1rem",
            opacity: 0.7,
          }}
        >
          <span>v0.1.0</span>
          <span style={{ marginLeft: 16 }}>Sound: On</span>
        </footer>
      </div>
    );
  }

  // Question Screen - TV View
  if ((gameState === "ASKING" || gameState === "question" || gameState === "REVEAL" || gameState === "reveal") && currentQuestion) {
    const isReveal = gameState === "reveal" || gameState === "REVEAL";
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <header
          style={{
            width: "100%",
            maxWidth: 700,
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{ fontWeight: 900, color: "#e50914", fontSize: "1.5rem" }}
          >
            Round {round}/{maxRounds}
          </div>
          <div
            style={{
              fontWeight: 700,
              color: "#fff",
              fontSize: "1.2rem",
              background: "#e50914",
              borderRadius: 8,
              padding: "0.5rem 1rem",
            }}
          >
            {currentQuestion.category}
          </div>
        </header>
        <section style={{ marginBottom: "2rem", width: "100%", maxWidth: 700 }}>
          <h2
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#fff",
              textAlign: "center",
              marginBottom: "1rem",
              letterSpacing: "-1px",
            }}
          >
            {currentQuestion.question}
          </h2>
        </section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1rem",
            width: "100%",
            maxWidth: 700,
          }}
        >
          {currentQuestion.options.map((option: string, i: number) => {
            let styleObj: any = {
              background: "#111",
              color: "#fff",
              border: "2px solid #e50914",
              borderRadius: 12,
              padding: "1rem 1.5rem",
              fontWeight: 900,
              fontSize: "1.2rem",
              display: "flex",
              alignItems: "center",
              transition: "background 0.2s, color 0.2s",
            };
            if (isReveal) {
              if (i === currentQuestion.correct) {
                styleObj.background = "#e50914";
                styleObj.color = "#fff";
                styleObj.border = "2px solid #fff";
              } else {
                styleObj.background = "#222";
                styleObj.color = "#888";
                styleObj.border = "2px solid #222";
              }
            }
            return (
              <div key={i} style={styleObj}>
                <span
                  style={{
                    color: "#e50914",
                    fontWeight: 900,
                    fontSize: "1.5rem",
                    marginRight: 16,
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
              </div>
            );
          })}
        </div>
        {!isReveal && (
          <div
            style={{
              marginTop: "2rem",
              color: "#e50914",
              fontWeight: 700,
              fontSize: "1.2rem",
            }}
          >
            {allAnswered ? "Revealing answer..." : "Players answering..."}
          </div>
        )}
        {isReveal && (
          <section
            style={{
              marginTop: "2rem",
              background: "#111",
              borderRadius: 12,
              padding: "1rem 1.5rem",
              width: "100%",
              maxWidth: 700,
              border: "2px solid #e50914",
            }}
          >
            <div
              style={{
                color: "#e50914",
                fontWeight: 900,
                fontSize: "1.2rem",
                marginBottom: 8,
              }}
            >
              Correct: {String.fromCharCode(65 + currentQuestion.correct)}
            </div>
            <p style={{ color: "#fff", fontWeight: 700 }}>
              {currentQuestion.explanation}
            </p>
          </section>
        )}
      </div>
    );
  }

  // Final Round Screen
  if (gameState === "final") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 700,
            background: "#111",
            borderRadius: 16,
            padding: "2rem",
            border: "2px solid #e50914",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              color: "#e50914",
              marginBottom: "1rem",
              letterSpacing: "-1px",
            }}
          >
            Final Round
          </h1>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: "2rem" }}>
            Only the survivors remain
          </p>
          {winner ? (
            <div>
              <p
                style={{
                  color: "#e50914",
                  fontWeight: 900,
                  fontSize: "1.2rem",
                  marginBottom: 8,
                }}
              >
                The last one standing
              </p>
              <div
                style={{
                  background: "#e50914",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "1rem 1.5rem",
                  fontWeight: 900,
                  fontSize: "1.5rem",
                  border: "2px solid #fff",
                  marginBottom: 8,
                }}
              >
                {winner.name}
              </div>
              <div
                style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}
              >
                {scores[winner.id] || 0} points
              </div>
            </div>
          ) : (
            <div>
              {alivePlayers.map((player) => (
                <div
                  key={player.id}
                  style={{
                    background: "#111",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "1rem 1.5rem",
                    fontWeight: 900,
                    fontSize: "1.2rem",
                    border: "2px solid #e50914",
                    marginBottom: 8,
                  }}
                >
                  {player.name} - {scores[player.id] || 0} points
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Results Screen
  if (gameState === "results") {
    const sortedPlayers = players
      .map((player) => ({
        ...player,
        score: scores[player.id] || 0,
        isDead: ghosts.includes(player.id),
      }))
      .sort((a, b) => b.score - a.score);
    const topWinner = sortedPlayers[0];
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 700,
            background: "#111",
            borderRadius: 16,
            padding: "2rem",
            border: "2px solid #e50914",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              color: "#e50914",
              marginBottom: "1rem",
              letterSpacing: "-1px",
            }}
          >
            Sole Survivor
          </h1>
          <section style={{ marginBottom: "2rem" }}>
            <div
              style={{
                fontWeight: 900,
                color: "#fff",
                fontSize: "2rem",
                marginBottom: 8,
              }}
            >
              {topWinner?.name}
            </div>
            <div
              style={{ color: "#e50914", fontWeight: 700, fontSize: "1.2rem" }}
            >
              Escaped with {topWinner?.score} points
            </div>
          </section>
          <p style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>
            Final Standings
          </p>
          <div>
            {sortedPlayers.map((player, i) => (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background:
                    i === 0 ? "#e50914" : player.isDead ? "#222" : "#111",
                  color: i === 0 ? "#fff" : player.isDead ? "#888" : "#fff",
                  border: "2px solid #e50914",
                  borderRadius: 12,
                  padding: "0.75rem 1.25rem",
                  marginBottom: 8,
                  fontWeight: 900,
                }}
              >
                <span>
                  {i === 0 ? "#1" : player.isDead ? "ELIMINATED" : `${i + 1}.`}
                </span>
                <span>{player.name}</span>
                <span>{player.score} pts</span>
              </div>
            ))}
          </div>
          <p style={{ color: "#e50914", fontWeight: 700, marginTop: 16 }}>
            New game starting soon...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: "2rem",
          color: "#e50914",
          marginBottom: "1rem",
        }}
      >
        Loading...
      </div>
    </div>
  );
}
