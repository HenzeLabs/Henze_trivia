/**
 * Henze Trivia Server (New Architecture)
 * Uses GameRoom FSM, SQLite database, and proper state management
 */

// Load environment variables from .env file
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const { createServer } = require("http");
const Sentry = require("./sentry");
const helmet = require("helmet");
const { Server } = require("socket.io");
const { parse } = require("url");
const next = require("next");
const os = require("os");
const { exec } = require("child_process");

// Initialize database
const { getDB } = require("./database");
const db = getDB();

// Import game dependencies
const { GameRoom } = require("./GameRoom");
const logger = require("./logger");
const validation = require("./validation");

const dev = process.env.NODE_ENV !== "production";
// Use environment hostname if available, fallback to platform defaults
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = (() => {
  const portEnv = process.env.PORT || "3000";
  const parsed = parseInt(portEnv, 10);
  return isNaN(parsed) ? 3000 : parsed;
})();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Seed database if empty (for first deploy on Render)
const questionCheckQuery = db.db.prepare("SELECT COUNT(*) as count FROM questions");
const { count } = questionCheckQuery.get();
if (count === 0) {
  logger.info("🌱 Database is empty, seeding with initial questions...");
  require("./seed-database-inline")();
  logger.info("✅ Database seeded successfully");
}

// Initialize game room
let gameRoom = new GameRoom();

// Load questions at startup
logger.info("📚 Loading questions from database...");
const questionCount = gameRoom.loadQuestions();
logger.info(`✅ Loaded ${questionCount} questions`);

// Rate limiting
const rateLimits = new Map();
const RATE_LIMIT_MS = 100;

// Socket.io server (will be initialized in app.prepare())
let io = null;

/**
 * Get local IP address for LAN access
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

/**
 * Broadcast current game state to all connected clients
 */
function broadcastGameState() {
  if (io) {
    const state = gameRoom.getGameState();
    logger.info("Broadcasting game state", {
      players: state.players.map((p) => p.name),
      totalPlayers: state.players.length,
    });
    io.emit("game:update", state);
  }
}

// Prepare Next.js app and start server
app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      // Skip helmet for Next.js static files to avoid MIME type issues
      if (req.url?.startsWith("/_next/") || req.url?.startsWith("/static/")) {
        return handle(req, res, parse(req.url, true));
      }

      // Helmet with relaxed CSP for Next.js
      const helmetOptions = {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
      };
      helmet(helmetOptions)(req, res, async () => {
        if (req.url === "/healthz" || req.url === "/status") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
          return;
        }
        if (req.url === "/api/reset") {
          logger.info("🔄 Game reset requested");
          gameRoom.reset();
          broadcastGameState();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              message: "Game reset successfully",
            })
          );
          return;
        }
        if (
          process.env.ENFORCE_HTTPS === "true" &&
          req.headers["x-forwarded-proto"] !== "https"
        ) {
          const host = req.headers["host"];
          res.writeHead(301, { Location: `https://${host}${req.url}` });
          res.end();
          return;
        }
        handle(req, res, parse(req.url, true));
      });
    });

    // Dynamic CORS origins for production deployment
    const allowedOrigins = (() => {
      try {
        if (process.env.ALLOWED_ORIGINS) {
          return process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
        }
        // Production fallback: allow any origin if no ALLOWED_ORIGINS set
        if (!dev) {
          return true; // Allow all origins in production if not configured
        }
        return [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3001",
        ];
      } catch (e) {
        logger.warn("Invalid ALLOWED_ORIGINS format, using fallback", { error: e.message });
        return dev ? [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ] : true;
      }
    })();

    io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Register socket.io event handlers
    io.on("connection", (socket) => {
      logger.player(`Player connected`, { socketId: socket.id });

      // Send initial game state to newly connected client
      socket.emit("game:update", gameRoom.getGameState());

      /**
       * Rate limiting helper
       */
      function rateLimitCheck(cb) {
        const now = Date.now();
        const lastCall = rateLimits.get(socket.id) || 0;
        if (now - lastCall < RATE_LIMIT_MS) {
          if (cb && typeof cb === "function") {
            if (cb) cb({ error: "Rate limit exceeded" });
          }
          return false;
        }
        rateLimits.set(socket.id, now);
        return true;
      }

      // ========================================================================
      // PLAYER: JOIN GAME
      // ========================================================================
      socket.on("player:join", (payload, cb) => {
        if (!rateLimitCheck(cb)) {
          logger.info("Join rate limit exceeded", {
            socketId: socket.id,
            payload,
          });
          return;
        }

        try {
          logger.info("Join request received", {
            socketId: socket.id,
            payload,
          });
          // Validate payload
          const validationResult = validation.joinSchema.safeParse(payload);
          if (!validationResult.success) {
            logger.warn("Join validation failed", {
              socketId: socket.id,
              errors: validationResult.error.errors,
            });
            if (cb) return cb({
              error: "Invalid payload",
              details: validationResult.error.errors,
            });
          }

          logger.info("Join validation succeeded", {
            socketId: socket.id,
            playerName: payload.playerName,
          });
          // Add player (GameRoom handles name reservation and duplicate check)
          const player = gameRoom.addPlayer(socket.id, payload.playerName);

          logger.player(`Player joined: ${payload.playerName}`, {
            playerId: player.playerId,
            totalPlayers: gameRoom.players.size,
            players: Array.from(gameRoom.players.values()).map((p) => p.name),
          });

          if (cb) cb({
            success: true,
            playerId: player.playerId,
            token: gameRoom.token,
            game: gameRoom.getGameState(),
          });

          logger.info("Broadcasting game state after join", {
            players: gameRoom.getGameState().players.map((p) => p.name),
            totalPlayers: gameRoom.getGameState().players.length,
          });
          // Broadcast updated state
          broadcastGameState();
        } catch (e) {
          logger.error(`Join error`, {
            error: e.message,
            socketId: socket.id,
            payload,
          });
          if (cb) cb({ success: false, error: e.message || "Join failed" });
        }
      });

      // ========================================================================
      // PLAYER: START GAME
      // ========================================================================
      socket.on("player:start", (payload, cb) => {
        if (!rateLimitCheck(cb)) return;

        try {
          // Validate payload
          const validationResult = validation.startSchema.safeParse(payload);
          if (!validationResult.success) {
            if (cb) return cb({
              error: "Invalid payload",
              details: validationResult.error.errors,
            });
          }

          // Verify token
          if (payload.token !== gameRoom.token) {
            if (cb) return cb({ error: "Invalid token" });
          }

          // Start game
          gameRoom.startGame();

          if (cb) cb({ success: true });
          broadcastGameState();
        } catch (e) {
          logger.error(`Start error`, {
            error: e.message,
            socketId: socket.id,
          });
          if (cb) cb({ success: false, error: e.message || "Start failed" });
        }
      });

      // ========================================================================
      // PLAYER: SUBMIT ANSWER
      // ========================================================================
      socket.on("player:answer", async (payload, cb) => {
        if (!rateLimitCheck(cb)) return;

        try {
          // Validate payload
          const validationResult = validation.answerSchema.safeParse(payload);
          if (!validationResult.success) {
            if (cb) return cb({
              error: "Invalid payload",
              details: validationResult.error.errors,
            });
          }

          // Verify token
          if (payload.token !== gameRoom.token) {
            if (cb) return cb({ error: "Invalid token" });
          }

          // Get player
          const player = gameRoom.getPlayer(socket.id);
          if (!player) {
            if (cb) return cb({ error: "Player not found" });
          }

          // Submit answer (now async with mutex)
          await gameRoom.submitAnswer(player.id, payload.answer);

          if (cb) cb({ success: true });
          broadcastGameState();
        } catch (e) {
          logger.error(`Answer error`, {
            error: e.message,
            socketId: socket.id,
          });
          if (cb) cb({ success: false, error: e.message || "Answer failed" });
        }
      });

      // ========================================================================
      // PLAYER: VOTE FUNNY (laugh vote)
      // ========================================================================
      socket.on("player:laugh", async (payload, cb) => {
        if (!rateLimitCheck(cb)) return;

        try {
          // Verify token
          if (payload.token !== gameRoom.token) {
            if (cb) return cb({ error: "Invalid token" });
          }

          // Get player
          const player = gameRoom.getPlayer(socket.id);
          if (!player) {
            if (cb) return cb({ error: "Player not found" });
          }

          // Vote question as funny
          gameRoom.voteQuestionFunny(player.id);

          if (cb) cb({ success: true });
          broadcastGameState();
        } catch (e) {
          logger.error(`Laugh vote error`, {
            error: e.message,
            socketId: socket.id,
          });
          if (cb) cb({ success: false, error: e.message || "Laugh vote failed" });
        }
      });

      // ========================================================================
      // PLAYER: FINAL (determine survivor)
      // ========================================================================
      socket.on("player:final", async (payload, cb) => {
        if (!rateLimitCheck(cb)) return;

        try {
          // Verify token
          if (payload.token !== gameRoom.token) {
            if (cb) return cb({ error: "Invalid token" });
          }

          // Only allow in final state
          if (gameRoom.getState() !== "GAME_END") {
            if (cb) return cb({ error: "Game not in final state" });
          }

          // Reset to lobby for new game
          gameRoom.reset();

          if (cb) cb({ success: true });
          broadcastGameState();
        } catch (e) {
          logger.error(`Final error`, {
            error: e.message,
            socketId: socket.id,
          });
          if (cb) cb({ success: false, error: e.message || "Final failed" });
        }
      });

      // ========================================================================
      // PLAYER: RESET GAME
      // ========================================================================
      socket.on("player:reset", async (payload, cb) => {
        if (!rateLimitCheck(cb)) return;

        try {
          // Validate payload
          const validationResult = validation.resetSchema.safeParse(payload);
          if (!validationResult.success) {
            if (cb) return cb({
              error: "Invalid payload",
              details: validationResult.error.errors,
            });
          }

          // Verify token
          if (payload.token !== gameRoom.token) {
            if (cb) return cb({ error: "Invalid token" });
          }

          // Reset game
          gameRoom.reset();

          if (cb) cb({ success: true });
          broadcastGameState();
        } catch (e) {
          logger.error(`Reset error`, {
            error: e.message,
            socketId: socket.id,
          });
          if (cb) cb({ success: false, error: e.message || "Reset failed" });
        }
      });

      // ========================================================================
      // PLAYER: RESTORE SESSION
      // ========================================================================
      socket.on("player:restore", async (payload, cb) => {
        try {
          // Validate payload
          const validationResult = validation.restoreSchema.safeParse(payload);
          if (!validationResult.success) {
            if (cb) return cb({
              error: "Invalid payload",
              details: validationResult.error.errors,
            });
          }

          // Verify token
          if (payload.token !== gameRoom.token) {
            if (cb && typeof cb === "function") {
              if (cb) return cb({ error: "Invalid token or session expired" });
            }
            return;
          }

          // Try to restore existing player session
          const existingPlayer = Array.from(gameRoom.players.values()).find(
            p => p.id === payload.playerId
          );
          
          if (existingPlayer) {
            // Update socket mapping for existing player
            const oldSocketId = Array.from(gameRoom.players.entries())
              .find(([_, player]) => player.id === payload.playerId)?.[0];
            
            if (oldSocketId) {
              gameRoom.players.delete(oldSocketId);
            }
            
            gameRoom.players.set(socket.id, existingPlayer);
            
            logger.info(`Player session restored`, {
              playerId: payload.playerId,
              playerName: existingPlayer.name,
              newSocketId: socket.id
            });
            
            if (cb) cb({ success: true, game: gameRoom.getGameState() });
            broadcastGameState();
          } else {
            if (cb) cb({ error: "Player session not found" });
          }
        } catch (e) {
          logger.error(`Restore error`, {
            error: e.message,
            socketId: socket.id,
          });
          if (cb && typeof cb === "function") {
            if (cb) cb({ success: false, error: e.message || "Restore failed" });
          }
        }
      });

      // ========================================================================
      // DISCONNECT
      // ========================================================================
      socket.on("disconnect", () => {
        logger.player(`Player disconnected`, { socketId: socket.id });
        gameRoom.removePlayer(socket.id);
        broadcastGameState();

        // Cleanup rate limit
        rateLimits.delete(socket.id);
      });
    });

    // Start server
    server.listen(port, hostname, (err) => {
      if (err) {
        logger.error("Failed to start server", { error: err.message });
        throw err;
      }
      const localIP = getLocalIP();
      logger.info(`Server binding to ${hostname}:${port}`);
      const banner =
        "\n" +
        "=".repeat(60) +
        "\n" +
        "🎮 HENZE TRIVIA SERVER\n" +
        "=".repeat(60) +
        "\n" +
        `> Ready on http://${hostname}:${port}\n` +
        `> Local: http://localhost:${port}\n`;
      console.log(banner);
      logger.info("🎮 Henze Trivia Server started", {
        hostname,
        port,
        env: process.env.NODE_ENV || "development",
      });
      if (hostname === "0.0.0.0") {
        console.log(`\n📱 PLAYERS: http://${localIP}:${port}`);
        console.log(`📺 TV: http://${localIP}:${port}/tv`);
        logger.info("Network URLs", {
          players: `http://${localIP}:${port}`,
          tv: `http://${localIP}:${port}/tv`,
        });
      }
      console.log("=".repeat(60) + "\n");
      if (dev && process.platform === "darwin") {
        exec(`open http://localhost:${port}`);
      }
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, closing server...");
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, closing server...");
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    logger.error("❌ Server crashed during startup", {
      error: err.message,
      stack: err.stack,
    });
    console.error("\n" + "=".repeat(60));
    console.error("🔴 GAME CRASHED");
    console.error("=".repeat(60));
    console.error(`Error: ${err.message}`);
    console.error("\n💡 To restart:");
    console.error("   cd web-app");
    console.error("   npm run dev");
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  });
