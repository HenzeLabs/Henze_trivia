/**
 * GameRoom FSM (Finite State Machine) Tests
 * Tests all state transitions, guards, and edge cases
 */

const { GameRoom, GameState } = require("../GameRoom");
const { getDB } = require("../database");

describe("GameRoom FSM Tests", () => {
  let gameRoom;

  beforeEach(() => {
    gameRoom = new GameRoom({
      maxPlayers: 4,
      maxLives: 3,
      maxRounds: 5,
      askingTimeoutMs: 1000,
      revealDelayMs: 100,
      roundEndDelayMs: 100,
    });

    // Mock database to avoid actual DB writes in tests
    gameRoom.db = {
      createGame: jest.fn(() => 123), // Return mock game ID
      markQuestionUsed: jest.fn(),
      recordQuestionResult: jest.fn(),
      recordPlayerAnswer: jest.fn(),
      completeGame: jest.fn(),
      runLearningLoop: jest.fn(() => ({ questionsUpdated: 0, questionsRetired: 0 })),
    };

    // Load mock questions
    gameRoom.questionPool = [
      { id: 1, type: "trivia", text: "Q1?", options: ["A", "B", "C", "D"], answer_index: 0 },
      { id: 2, type: "trivia", text: "Q2?", options: ["A", "B", "C", "D"], answer_index: 1 },
      { id: 3, type: "trivia", text: "Q3?", options: ["A", "B", "C", "D"], answer_index: 2 },
      { id: 4, type: "trivia", text: "Q4?", options: ["A", "B", "C", "D"], answer_index: 3 },
      { id: 5, type: "trivia", text: "Q5?", options: ["A", "B", "C", "D"], answer_index: 0 },
    ];
  });

  afterEach(() => {
    // Clean up timers
    gameRoom.timers.forEach((timer) => clearTimeout(timer));
  });

  describe("State Transitions", () => {
    test("should start in LOBBY state", () => {
      expect(gameRoom.state).toBe(GameState.LOBBY);
    });

    test("should transition LOBBY → ASKING when game starts", () => {
      gameRoom.addPlayer("socket1", "Player1", {});
      gameRoom.startGame();
      expect(gameRoom.state).toBe(GameState.ASKING);
    });

    test("should reject invalid transitions", () => {
      // Cannot go from LOBBY directly to REVEAL
      expect(() => {
        gameRoom.transitionTo(GameState.REVEAL);
      }).toThrow("Invalid transition");
    });

    test("should allow LOBBY → ASKING → ANSWERS_LOCKED → REVEAL", () => {
      gameRoom.addPlayer("socket1", "Player1", {});
      gameRoom.startGame();
      expect(gameRoom.state).toBe(GameState.ASKING);

      gameRoom.transitionTo(GameState.ANSWERS_LOCKED);
      expect(gameRoom.state).toBe(GameState.ANSWERS_LOCKED);

      gameRoom.transitionTo(GameState.REVEAL);
      expect(gameRoom.state).toBe(GameState.REVEAL);
    });

    test("should prevent duplicate transitions when transitionInProgress", () => {
      gameRoom.transitionInProgress = true;

      expect(() => {
        gameRoom.transitionTo(GameState.ASKING);
      }).toThrow("Transition already in progress");
    });
  });

  describe("Player Management", () => {
    test("should add player in LOBBY", () => {
      const result = gameRoom.addPlayer("socket1", "Alice", {});
      expect(result.playerName).toBe("Alice");
      expect(gameRoom.players.size).toBe(1);
    });

    test("should reject players when game is full", () => {
      for (let i = 0; i < 4; i++) {
        gameRoom.addPlayer(`socket${i}`, `Player${i}`, {});
      }

      expect(() => {
        gameRoom.addPlayer("socket5", "Player5", {});
      }).toThrow("Game is full");
    });

    test("should reject duplicate names", () => {
      gameRoom.addPlayer("socket1", "Alice", {});

      expect(() => {
        gameRoom.addPlayer("socket2", "Alice", {});
      }).toThrow("Name already taken");
    });

    test("should reject joining when game in progress", () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.startGame();

      expect(() => {
        gameRoom.addPlayer("socket2", "Bob", {});
      }).toThrow("Cannot join game in progress");
    });

    test("should eliminate player after 3 wrong answers", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();

      // Simulate 3 wrong answers
      for (let i = 0; i < 3; i++) {
        gameRoom.currentQuestion = { id: i, answer_index: 0 };
        gameRoom.answers.set(playerId, { answerIndex: 1, answeredAt: Date.now() }); // Wrong answer
        gameRoom._processAnswers();
      }

      expect(gameRoom.ghosts.has(playerId)).toBe(true);
    });
  });

  describe("Answer Submission (Race Condition Prevention)", () => {
    test("should process concurrent answers atomically", async () => {
      // Add 3 players
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.addPlayer("socket2", "Bob", {});
      gameRoom.addPlayer("socket3", "Charlie", {});

      gameRoom.startGame();

      const player1 = gameRoom.players.get("socket1").id;
      const player2 = gameRoom.players.get("socket2").id;
      const player3 = gameRoom.players.get("socket3").id;

      // Submit all 3 answers concurrently
      const promises = [
        gameRoom.submitAnswer(player1, 0),
        gameRoom.submitAnswer(player2, 1),
        gameRoom.submitAnswer(player3, 2),
      ];

      await Promise.all(promises);

      // All 3 should be recorded
      expect(gameRoom.answers.size).toBe(3);

      // State should have transitioned exactly once
      expect(gameRoom.state).toBe(GameState.ANSWERS_LOCKED);
    });

    test("should reject duplicate answers from same player", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.addPlayer("socket2", "Bob", {}); // Add second player so state doesn't auto-transition
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();

      await gameRoom.submitAnswer(playerId, 0);

      await expect(gameRoom.submitAnswer(playerId, 1)).rejects.toThrow(
        "Already answered this question"
      );
    });

    test("should reject answers when not in ASKING state", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();
      gameRoom.state = GameState.REVEAL; // Manually change state

      await expect(gameRoom.submitAnswer(playerId, 0)).rejects.toThrow(
        "Not accepting answers in current state"
      );
    });

    test("should reject answers from eliminated players", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();
      gameRoom.ghosts.add(playerId);

      await expect(gameRoom.submitAnswer(playerId, 0)).rejects.toThrow(
        "Eliminated players cannot answer"
      );
    });

    test("should validate answer index range", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();

      await expect(gameRoom.submitAnswer(playerId, -1)).rejects.toThrow(
        "Invalid answer index"
      );

      await expect(gameRoom.submitAnswer(playerId, 4)).rejects.toThrow(
        "Invalid answer index"
      );
    });
  });

  describe("Question Sanitization", () => {
    test("should hide correct answer in getSanitizedQuestion", () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.startGame();

      const sanitized = gameRoom.getSanitizedQuestion();

      expect(sanitized).not.toHaveProperty("answer_index");
      expect(sanitized).toHaveProperty("text");
      expect(sanitized).toHaveProperty("options");
    });

    test("should include correct answer in getQuestionWithAnswer", () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.startGame();

      const withAnswer = gameRoom.getQuestionWithAnswer();

      expect(withAnswer).toHaveProperty("correctAnswer");
      expect(withAnswer.correctAnswer).toBe(0);
    });
  });

  describe("Scoring and Lives", () => {
    test("should award points for correct answer", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();

      // Correct answer
      await gameRoom.submitAnswer(playerId, 0);
      gameRoom._processAnswers();

      expect(gameRoom.scores.get(playerId)).toBe(100);
    });

    test("should deduct life for wrong answer", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();

      const initialLives = gameRoom.lives.get(playerId);

      // Wrong answer
      await gameRoom.submitAnswer(playerId, 1);
      gameRoom._processAnswers();

      expect(gameRoom.lives.get(playerId)).toBe(initialLives - 1);
    });

    test("should not award points to eliminated players", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();
      gameRoom.ghosts.add(playerId);

      gameRoom.answers.set(playerId, { answerIndex: 0, answeredAt: Date.now() });
      gameRoom._processAnswers();

      // Score should remain 0
      expect(gameRoom.scores.get(playerId)).toBe(0);
    });
  });

  describe("Game Reset", () => {
    test("should reset to LOBBY and clear all state", () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.startGame();

      gameRoom.reset();

      expect(gameRoom.state).toBe(GameState.LOBBY);
      expect(gameRoom.currentRound).toBe(0);
      expect(gameRoom.answers.size).toBe(0);
      expect(gameRoom.ghosts.size).toBe(0);
    });

    test("should generate new token on reset", () => {
      const oldToken = gameRoom.token;
      gameRoom.reset();
      expect(gameRoom.token).not.toBe(oldToken);
    });
  });

  describe("Database Integration", () => {
    test("should call markQuestionUsed when question starts", () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.startGame();

      expect(gameRoom.db.markQuestionUsed).toHaveBeenCalledWith(1);
    });

    test("should record round results", () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();
      gameRoom.dbGameId = 123;

      gameRoom.answers.set(playerId, {
        answerIndex: 0,
        answeredAt: Date.now(),
        answerTimeMs: 1000,
      });

      gameRoom._recordRoundResults();

      expect(gameRoom.db.recordQuestionResult).toHaveBeenCalled();
      expect(gameRoom.db.recordPlayerAnswer).toHaveBeenCalled();
    });
  });

  describe("Mutex Reset", () => {
    test("should reset answerMutex when nextQuestion is called", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.startGame();

      // Simulate mutex being set
      gameRoom.answerMutex = true;

      gameRoom.nextQuestion();

      expect(gameRoom.answerMutex).toBe(false);
    });
  });
});
