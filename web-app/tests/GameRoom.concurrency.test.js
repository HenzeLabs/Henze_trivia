/**
 * GameRoom Concurrency Stress Tests
 * Tests race conditions with high concurrent load
 */

const { GameRoom, GameState } = require("../GameRoom");

describe("GameRoom Concurrency Tests", () => {
  let gameRoom;

  beforeEach(() => {
    gameRoom = new GameRoom({
      maxPlayers: 8,
      maxLives: 3,
      maxRounds: 10,
    });

    // Mock database
    gameRoom.db = {
      createGame: jest.fn(() => 999), // Return mock game ID
      markQuestionUsed: jest.fn(),
      recordQuestionResult: jest.fn(),
      recordPlayerAnswer: jest.fn(),
      completeGame: jest.fn(),
      runLearningLoop: jest.fn(() => ({ questionsUpdated: 0, questionsRetired: 0 })),
    };

    // Load mock questions
    gameRoom.questionPool = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      type: "trivia",
      text: `Question ${i + 1}?`,
      options: ["A", "B", "C", "D"],
      answer_index: i % 4,
    }));
  });

  afterEach(() => {
    gameRoom.timers.forEach((timer) => clearTimeout(timer));
  });

  describe("Concurrent Answer Submission", () => {
    test("should handle 8 players answering simultaneously", async () => {
      // Add 8 players
      const playerIds = [];
      for (let i = 0; i < 8; i++) {
        gameRoom.addPlayer(`socket${i}`, `Player${i}`, {});
        playerIds.push(gameRoom.players.get(`socket${i}`).id);
      }

      gameRoom.startGame();

      // All 8 players answer at exactly the same time
      const answerPromises = playerIds.map((pid, idx) =>
        gameRoom.submitAnswer(pid, idx % 4)
      );

      await Promise.all(answerPromises);

      // Verify all answers recorded
      expect(gameRoom.answers.size).toBe(8);

      // Verify state transitioned exactly once
      expect(gameRoom.state).toBe(GameState.ANSWERS_LOCKED);
    });

    test("should prevent double transition with rapid concurrent answers", async () => {
      // Add 4 players
      const playerIds = [];
      for (let i = 0; i < 4; i++) {
        gameRoom.addPlayer(`socket${i}`, `Player${i}`, {});
        playerIds.push(gameRoom.players.get(`socket${i}`).id);
      }

      gameRoom.startGame();

      // Submit answers in rapid succession (simulating network race)
      const promises = [];
      for (let i = 0; i < 4; i++) {
        promises.push(gameRoom.submitAnswer(playerIds[i], 0));
      }

      await Promise.all(promises);

      // State should be ANSWERS_LOCKED (not REVEAL or beyond)
      expect(gameRoom.state).toBe(GameState.ANSWERS_LOCKED);

      // answerMutex should be true (locked)
      expect(gameRoom.answerMutex).toBe(true);
    });

    test("should queue 100 rapid answer attempts correctly", async () => {
      // Add 2 players
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.addPlayer("socket2", "Bob", {});

      const player1 = gameRoom.players.get("socket1").id;
      const player2 = gameRoom.players.get("socket2").id;

      gameRoom.startGame();

      // Submit 100 answer attempts (50 each player, simulating button spam)
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          gameRoom.submitAnswer(player1, 0).catch(() => {}) // Catch "already answered" errors
        );
        promises.push(
          gameRoom.submitAnswer(player2, 1).catch(() => {})
        );
      }

      await Promise.all(promises);

      // Only 2 answers should be recorded (one per player)
      expect(gameRoom.answers.size).toBe(2);
    });
  });

  describe("State Transition Integrity", () => {
    test("should maintain state integrity under concurrent transitions", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      const playerId = gameRoom.players.get("socket1").id;

      gameRoom.startGame();

      // Try to force multiple state transitions concurrently
      const transitionAttempts = [];

      // Submit answer (triggers transition)
      transitionAttempts.push(
        gameRoom.submitAnswer(playerId, 0).catch(() => {})
      );

      // Try to manually transition (should be prevented)
      for (let i = 0; i < 10; i++) {
        transitionAttempts.push(
          new Promise((resolve) => {
            try {
              gameRoom.transitionTo(GameState.REVEAL);
            } catch (e) {
              // Expected to throw if invalid transition
            }
            resolve();
          })
        );
      }

      await Promise.all(transitionAttempts);

      // State should be valid (either ASKING or ANSWERS_LOCKED)
      expect([GameState.ASKING, GameState.ANSWERS_LOCKED]).toContain(
        gameRoom.state
      );
    });
  });

  describe("Answer Queue Ordering", () => {
    test("should process answers in submission order", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.addPlayer("socket2", "Bob", {});
      gameRoom.addPlayer("socket3", "Charlie", {});

      const player1 = gameRoom.players.get("socket1").id;
      const player2 = gameRoom.players.get("socket2").id;
      const player3 = gameRoom.players.get("socket3").id;

      gameRoom.startGame();

      const submissionOrder = [];

      // Submit with delays to test queue ordering
      const p1 = gameRoom.submitAnswer(player1, 0).then(() => {
        submissionOrder.push("Alice");
      });

      const p2 = gameRoom.submitAnswer(player2, 1).then(() => {
        submissionOrder.push("Bob");
      });

      const p3 = gameRoom.submitAnswer(player3, 2).then(() => {
        submissionOrder.push("Charlie");
      });

      await Promise.all([p1, p2, p3]);

      // All should have been processed
      expect(submissionOrder.length).toBe(3);

      // Order should be maintained (Alice, Bob, Charlie)
      expect(submissionOrder).toEqual(["Alice", "Bob", "Charlie"]);
    });
  });

  describe("Stress Test: Full Game Simulation", () => {
    test("should complete full game with 8 players without corruption", async () => {
      // Add 8 players
      const playerIds = [];
      for (let i = 0; i < 8; i++) {
        gameRoom.addPlayer(`socket${i}`, `Player${i}`, {});
        playerIds.push(gameRoom.players.get(`socket${i}`).id);
      }

      gameRoom.startGame();

      // Play through 5 rounds with concurrent answers
      for (let round = 0; round < 5; round++) {
        // Reset for new question
        gameRoom.answers.clear();
        gameRoom.answerMutex = false;
        gameRoom.state = GameState.ASKING;
        gameRoom.nextQuestion();

        // All players answer concurrently
        const answerPromises = playerIds.map((pid, idx) =>
          gameRoom.submitAnswer(pid, idx % 4).catch(() => {})
        );

        await Promise.all(answerPromises);

        // Verify round completed correctly
        expect(gameRoom.answers.size).toBeLessThanOrEqual(8);
      }

      // Game state should still be valid
      expect(gameRoom.currentRound).toBe(6); // Started at 0, incremented 6 times
    });
  });

  describe("Edge Cases", () => {
    test("should handle player disconnecting mid-answer-submission", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.addPlayer("socket2", "Bob", {});

      const player1 = gameRoom.players.get("socket1").id;
      const player2 = gameRoom.players.get("socket2").id;

      gameRoom.startGame();

      // Player 1 submits
      await gameRoom.submitAnswer(player1, 0);

      // Player 1 disconnects
      gameRoom.removePlayer("socket1");

      // Player 2 submits (should still work)
      await gameRoom.submitAnswer(player2, 1);

      // Should transition since all *alive* players answered
      expect(gameRoom.state).toBe(GameState.ANSWERS_LOCKED);
    });

    test("should handle rapid join/leave during lobby", () => {
      // Rapidly add and remove players (stay under 8 player limit)
      for (let i = 0; i < 16; i++) {
        const socketId = `socket${i}`;
        gameRoom.addPlayer(socketId, `Player${i}`, {});
        if (i % 2 === 0) {
          gameRoom.removePlayer(socketId);
        }
      }

      // Should have 8 players remaining (every odd index)
      expect(gameRoom.players.size).toBe(8);
    });

    test("should handle concurrent laugh votes", async () => {
      // Add 8 players
      const playerIds = [];
      for (let i = 0; i < 8; i++) {
        gameRoom.addPlayer(`socket${i}`, `Player${i}`, {});
        playerIds.push(gameRoom.players.get(`socket${i}`).id);
      }

      gameRoom.startGame();

      // All players vote funny at the same time
      const votePromises = playerIds.map((pid) =>
        Promise.resolve(gameRoom.voteQuestionFunny(pid))
      );

      await Promise.all(votePromises);

      // All 8 votes should be recorded
      expect(gameRoom.laughVotes.size).toBe(8);
    });
  });

  describe("Timer Interaction with Concurrency", () => {
    test("should handle answers arriving during timeout transition", async () => {
      gameRoom.addPlayer("socket1", "Alice", {});
      gameRoom.addPlayer("socket2", "Bob", {});

      const player1 = gameRoom.players.get("socket1").id;
      const player2 = gameRoom.players.get("socket2").id;

      gameRoom.startGame();

      // Player 1 answers
      await gameRoom.submitAnswer(player1, 0);

      // Wait for timeout to start (but not complete)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Player 2 answers during timeout window
      await gameRoom.submitAnswer(player2, 1);

      // Should have transitioned
      expect(gameRoom.state).toBe(GameState.ANSWERS_LOCKED);

      // Timer should be cleared
      expect(gameRoom.timers.has("asking")).toBe(false);
    });
  });
});
