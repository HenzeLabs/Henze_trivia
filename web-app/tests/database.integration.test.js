/**
 * Database Integration Tests
 * Tests actual database writes and learning loop
 */

const { HenzeTriviaDB } = require("../database");
const fs = require("fs");
const path = require("path");

const TEST_DB_PATH = path.join(__dirname, "test_trivia.db");

describe("Database Integration Tests", () => {
  let db;

  beforeEach(() => {
    // Clean up old test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create fresh database
    db = new HenzeTriviaDB(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();

    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe("Question CRUD", () => {
    test("should insert and retrieve questions", () => {
      const questionId = db.insertQuestion({
        type: "trivia",
        text: "What is 2+2?",
        options: ["2", "3", "4", "5"],
        answer_index: 2,
        explanation: "Basic math",
        category: "math",
        source: "curated",
      });

      expect(questionId).toBeGreaterThan(0);

      const questions = db.getActiveQuestions({ type: "trivia", limit: 10 });
      expect(questions).toHaveLength(1);
      expect(questions[0].text).toBe("What is 2+2?");
      expect(questions[0].options).toEqual(["2", "3", "4", "5"]);
    });

    test("should mark questions as used", () => {
      const questionId = db.insertQuestion({
        type: "trivia",
        text: "Test question",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      db.markQuestionUsed(questionId);

      // Check that times_used incremented by querying the specific question
      const stmt = db.db.prepare("SELECT times_used FROM questions WHERE id = ?");
      const result = stmt.get(questionId);
      expect(result.times_used).toBe(1);
    });

    test("should exclude recently used questions", () => {
      const q1 = db.insertQuestion({
        type: "trivia",
        text: "Q1",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      const q2 = db.insertQuestion({
        type: "trivia",
        text: "Q2",
        options: ["A", "B", "C", "D"],
        answer_index: 1,
        source: "test",
      });

      // Mark Q1 as used
      db.markQuestionUsed(q1);

      // Get questions excluding last 30 days
      const questions = db.getActiveQuestions({ excludeDays: 30 });

      // Should only return Q2
      expect(questions).toHaveLength(1);
      expect(questions[0].text).toBe("Q2");
    });

    test("should retire questions", () => {
      const questionId = db.insertQuestion({
        type: "trivia",
        text: "To be retired",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      db.retireQuestion(questionId);

      const activeQuestions = db.getActiveQuestions({});
      expect(activeQuestions).toHaveLength(0);
    });
  });

  describe("Game Tracking", () => {
    test("should create and complete game", () => {
      const gameId = db.createGame(4, 10);
      expect(gameId).toBeGreaterThan(0);

      db.completeGame(gameId, "Alice", 500, 120);

      // Verify game completed
      const stmt = db.db.prepare("SELECT * FROM games WHERE id = ?");
      const game = stmt.get(gameId);

      expect(game.winner_name).toBe("Alice");
      expect(game.winner_score).toBe(500);
      expect(game.duration_seconds).toBe(120);
      expect(game.ended_at).toBeTruthy();
    });

    test("should record question results", () => {
      const gameId = db.createGame(3, 5);
      const questionId = db.insertQuestion({
        type: "trivia",
        text: "Test",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      db.recordQuestionResult(gameId, questionId, 1, 3, 2, 1500, 1);

      // Verify result recorded
      const stmt = db.db.prepare(
        "SELECT * FROM game_results WHERE game_id = ? AND question_id = ?"
      );
      const result = stmt.get(gameId, questionId);

      expect(result.round_number).toBe(1);
      expect(result.players_answered).toBe(3);
      expect(result.players_correct).toBe(2);
      expect(result.avg_answer_time_ms).toBe(1500);
      expect(result.laugh_votes).toBe(1);
    });

    test("should record individual player answers", () => {
      const gameId = db.createGame(2, 5);
      const questionId = db.insertQuestion({
        type: "trivia",
        text: "Test",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      db.recordPlayerAnswer(gameId, questionId, "Alice", 0, true, 1200, true);
      db.recordPlayerAnswer(gameId, questionId, "Bob", 1, false, 1800, false);

      // Verify both answers recorded
      const stmt = db.db.prepare(
        "SELECT * FROM player_answers WHERE game_id = ?"
      );
      const answers = stmt.all(gameId);

      expect(answers).toHaveLength(2);
      expect(answers[0].player_name).toBe("Alice");
      expect(answers[0].is_correct).toBe(1);
      expect(answers[0].voted_funny).toBe(1);
      expect(answers[1].player_name).toBe("Bob");
      expect(answers[1].is_correct).toBe(0);
    });
  });

  describe("Learning Loop", () => {
    beforeEach(() => {
      // Create test questions
      for (let i = 0; i < 10; i++) {
        db.insertQuestion({
          type: i % 2 === 0 ? "trivia" : "roast",
          text: `Question ${i}`,
          options: ["A", "B", "C", "D"],
          answer_index: i % 4,
          source: "test",
        });
      }
    });

    test("should update question statistics", () => {
      const questionId = 1;

      // Simulate multiple game results
      const gameId = db.createGame(4, 5);

      db.recordQuestionResult(gameId, questionId, 1, 4, 3, 2000, 2);
      db.recordQuestionResult(gameId, questionId, 2, 4, 4, 1500, 3);

      // Run learning loop
      const results = db.runLearningLoop();

      expect(results.questionsUpdated).toBeGreaterThan(0);

      // Check updated stats for the specific question
      const stmt = db.db.prepare("SELECT * FROM questions WHERE id = ?");
      const question = stmt.get(questionId);
      expect(question.avg_answer_time_ms).toBeTruthy();
      expect(question.correct_rate).toBeTruthy();
      expect(question.laugh_score).toBeTruthy();
    });

    test("should retire questions that are too easy", () => {
      const questionId = 1;
      const gameId = db.createGame(4, 5);

      // Simulate high correct rate (100%)
      for (let i = 0; i < 6; i++) {
        db.markQuestionUsed(questionId); // Mark as used
        db.recordQuestionResult(gameId, questionId, i + 1, 4, 4, 1000, 0);
      }

      // Run learning loop
      const results = db.runLearningLoop();

      // Question should be retired (correct_rate = 1.0, > 0.95)
      const activeQuestions = db.getActiveQuestions({ limit: 100 });
      const retired = !activeQuestions.some((q) => q.id === questionId);

      expect(retired).toBe(true);
      expect(results.questionsRetired).toBeGreaterThan(0);
    });

    test("should retire questions that are too hard", () => {
      const questionId = 1;
      const gameId = db.createGame(4, 5);

      // Simulate low correct rate (0%)
      for (let i = 0; i < 6; i++) {
        db.markQuestionUsed(questionId); // Mark as used
        db.recordQuestionResult(gameId, questionId, i + 1, 4, 0, 1000, 0);
      }

      // Run learning loop
      db.runLearningLoop();

      // Question should be retired (correct_rate = 0.0, < 0.15)
      const activeQuestions = db.getActiveQuestions({ limit: 100 });
      const retired = !activeQuestions.some((q) => q.id === questionId);

      expect(retired).toBe(true);
    });

    test("should retire unfunny roast questions", () => {
      // Find a roast question
      const roastQuestions = db.getActiveQuestions({ type: "roast", limit: 1 });
      const questionId = roastQuestions[0].id;

      const gameId = db.createGame(4, 5);

      // Simulate low laugh score
      for (let i = 0; i < 6; i++) {
        db.markQuestionUsed(questionId); // Mark as used
        db.recordQuestionResult(gameId, questionId, i + 1, 4, 2, 1000, 0); // 0 laughs
      }

      // Run learning loop
      db.runLearningLoop();

      // Roast question with low laughs should be retired
      const activeQuestions = db.getActiveQuestions({ type: "roast" });
      const retired = !activeQuestions.some((q) => q.id === questionId);

      expect(retired).toBe(true);
    });

    test("should keep high-performing questions", () => {
      const questionId = 1;
      const gameId = db.createGame(4, 5);

      // Simulate good performance (moderate difficulty, high laughs)
      for (let i = 0; i < 6; i++) {
        db.recordQuestionResult(gameId, questionId, i + 1, 4, 2, 1000, 3); // 50% correct, 3 laughs
      }

      // Run learning loop
      db.runLearningLoop();

      // Question should still be active
      const activeQuestions = db.getActiveQuestions({ limit: 100 });
      const stillActive = activeQuestions.some((q) => q.id === questionId);

      expect(stillActive).toBe(true);
    });
  });

  describe("Top Questions and Topics", () => {
    test("should retrieve top questions by laugh score", () => {
      // Insert questions with varying performance
      const q1 = db.insertQuestion({
        type: "roast",
        text: "Funny question",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      const q2 = db.insertQuestion({
        type: "roast",
        text: "Not funny",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      const gameId = db.createGame(4, 5);

      // Q1 gets lots of laughs
      db.markQuestionUsed(q1);
      db.recordQuestionResult(gameId, q1, 1, 4, 2, 1000, 4);
      db.markQuestionUsed(q1);
      db.recordQuestionResult(gameId, q1, 2, 4, 2, 1000, 4);
      db.markQuestionUsed(q1);
      db.recordQuestionResult(gameId, q1, 3, 4, 2, 1000, 4);

      // Q2 gets no laughs
      db.markQuestionUsed(q2);
      db.recordQuestionResult(gameId, q2, 4, 4, 2, 1000, 0);
      db.markQuestionUsed(q2);
      db.recordQuestionResult(gameId, q2, 5, 4, 2, 1000, 0);
      db.markQuestionUsed(q2);
      db.recordQuestionResult(gameId, q2, 6, 4, 2, 1000, 0);

      db.runLearningLoop();

      const topQuestions = db.getTopQuestions("roast", 2);

      // Q1 should be first (higher laugh score)
      expect(topQuestions[0].id).toBe(q1);
    });

    test("should retrieve top topics", () => {
      // Insert questions with different topics
      db.insertQuestion({
        type: "trivia",
        text: "Math Q1",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        topic: "math",
        source: "test",
      });

      db.insertQuestion({
        type: "trivia",
        text: "Math Q2",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        topic: "math",
        source: "test",
      });

      db.insertQuestion({
        type: "trivia",
        text: "History Q1",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        topic: "history",
        source: "test",
      });

      const gameId = db.createGame(4, 5);

      // Math questions get laughs (need at least 2 uses per getTopTopics requirement)
      db.markQuestionUsed(1);
      db.recordQuestionResult(gameId, 1, 1, 4, 2, 1000, 3);
      db.markQuestionUsed(1);
      db.recordQuestionResult(gameId, 1, 2, 4, 2, 1000, 3);

      db.markQuestionUsed(2);
      db.recordQuestionResult(gameId, 2, 3, 4, 2, 1000, 3);
      db.markQuestionUsed(2);
      db.recordQuestionResult(gameId, 2, 4, 4, 2, 1000, 3);

      // History gets fewer laughs
      db.markQuestionUsed(3);
      db.recordQuestionResult(gameId, 3, 5, 4, 2, 1000, 1);
      db.markQuestionUsed(3);
      db.recordQuestionResult(gameId, 3, 6, 4, 2, 1000, 1);

      db.runLearningLoop();

      const topTopics = db.getTopTopics(5);

      // Math should be first
      expect(topTopics[0].topic).toBe("math");
      expect(topTopics[0].avg_laugh_score).toBeGreaterThan(
        topTopics[1].avg_laugh_score
      );
    });
  });

  describe("Database Stats", () => {
    test("should return accurate statistics", () => {
      // Insert various questions
      db.insertQuestion({
        type: "trivia",
        text: "Q1",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      db.insertQuestion({
        type: "roast",
        text: "Q2",
        options: ["A", "B", "C", "D"],
        answer_index: 0,
        source: "test",
      });

      const gameId = db.createGame(4, 5);
      db.completeGame(gameId, "Alice", 500, 120);

      const stats = db.getStats();

      expect(stats.questions.count).toBe(2);
      expect(stats.questionsByType).toHaveLength(2);
      expect(stats.gamesPlayed.count).toBe(1);
    });
  });
});
