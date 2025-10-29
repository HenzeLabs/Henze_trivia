/**
 * SQLite Database Layer
 * Manages questions, game results, and learning loop data
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Ensure database directory exists
const DB_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, "henze_trivia.db");

class HenzeTriviaDB {
  constructor(dbPath = DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL"); // Better concurrency
    this.db.pragma("foreign_keys = ON");
    this.initializeTables();
  }

  initializeTables() {
    // Questions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('trivia', 'who-said-it', 'chaos', 'roast')),
        text TEXT NOT NULL,
        options TEXT NOT NULL, -- JSON array of 4 options
        answer_index INTEGER NOT NULL CHECK(answer_index >= 0 AND answer_index <= 3),
        explanation TEXT,
        category TEXT,
        topic TEXT,
        difficulty TEXT,
        source TEXT, -- 'chat' or 'curated' or 'ai-generated'
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        retired_at INTEGER, -- NULL if active, timestamp if retired
        times_used INTEGER DEFAULT 0,
        avg_answer_time_ms INTEGER,
        correct_rate REAL, -- 0.0 to 1.0
        laugh_score REAL DEFAULT 0.0, -- Avg laughs per use
        last_used_at INTEGER
      );
    `);

    // Games table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER NOT NULL DEFAULT (unixepoch()),
        ended_at INTEGER,
        num_players INTEGER NOT NULL,
        num_rounds INTEGER NOT NULL,
        winner_name TEXT,
        winner_score INTEGER,
        duration_seconds INTEGER
      );
    `);

    // Game results (per question)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        players_answered INTEGER NOT NULL,
        players_correct INTEGER NOT NULL,
        avg_answer_time_ms INTEGER,
        laugh_votes INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      );
    `);

    // Player answers (detailed tracking)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        answer_index INTEGER NOT NULL,
        is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
        answer_time_ms INTEGER NOT NULL,
        voted_funny INTEGER DEFAULT 0 CHECK(voted_funny IN (0, 1)),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      );
    `);

    // Indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
      CREATE INDEX IF NOT EXISTS idx_questions_retired ON questions(retired_at);
      CREATE INDEX IF NOT EXISTS idx_questions_last_used ON questions(last_used_at);
      CREATE INDEX IF NOT EXISTS idx_game_results_game ON game_results(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_results_question ON game_results(question_id);
      CREATE INDEX IF NOT EXISTS idx_player_answers_game ON player_answers(game_id);
    `);

    console.log("✅ Database initialized:", DB_PATH);
  }

  // ============================================================================
  // QUESTION CRUD
  // ============================================================================

  /**
   * Insert a new question
   * @param {Object} question
   * @param {string} question.type - 'trivia', 'who-said-it', 'chaos', 'roast'
   * @param {string} question.text - The question text
   * @param {string[]} question.options - Array of 4 options
   * @param {number} question.answer_index - Index of correct answer (0-3)
   * @param {string} question.explanation - Explanation of the answer
   * @param {string} question.category - Category/topic
   * @param {string} question.source - 'chat' or 'curated'
   * @returns {number} The inserted question ID
   */
  insertQuestion(question) {
    const stmt = this.db.prepare(`
      INSERT INTO questions (type, text, options, answer_index, explanation, category, topic, difficulty, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      question.type,
      question.text,
      JSON.stringify(question.options),
      question.answer_index,
      question.explanation || null,
      question.category || null,
      question.topic || null,
      question.difficulty || null,
      question.source || "curated"
    );

    return result.lastInsertRowid;
  }

  /**
   * Get active questions by type with optional filters
   * @param {Object} filters
   * @param {string} filters.type - Question type
   * @param {number} filters.limit - Max questions to return
   * @param {number} filters.excludeDays - Exclude questions used in last N days
   * @returns {Array} Array of questions
   */
  getActiveQuestions(filters = {}) {
    const { type, limit, excludeDays = 0 } = filters;

    let sql = `
      SELECT id, type, text, options, answer_index, explanation, category, topic, difficulty, source
      FROM questions
      WHERE retired_at IS NULL
    `;

    const params = [];

    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    if (excludeDays > 0) {
      const cutoffTimestamp = Math.floor(Date.now() / 1000) - excludeDays * 24 * 60 * 60;
      sql += ` AND (last_used_at IS NULL OR last_used_at < ?)`;
      params.push(cutoffTimestamp);
    }

    // Prioritize questions that haven't been used much
    sql += ` ORDER BY times_used ASC, RANDOM()`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);

    return rows.map((row) => ({
      ...row,
      options: JSON.parse(row.options),
    }));
  }

  /**
   * Mark a question as used
   */
  markQuestionUsed(questionId) {
    const stmt = this.db.prepare(`
      UPDATE questions
      SET times_used = times_used + 1,
          last_used_at = unixepoch()
      WHERE id = ?
    `);
    stmt.run(questionId);
  }

  /**
   * Retire a question (mark as inactive)
   */
  retireQuestion(questionId) {
    const stmt = this.db.prepare(`
      UPDATE questions
      SET retired_at = unixepoch()
      WHERE id = ?
    `);
    stmt.run(questionId);
  }

  /**
   * Update question statistics based on game results
   */
  updateQuestionStats(questionId, avgAnswerTimeMs, correctRate, laughScore) {
    const stmt = this.db.prepare(`
      UPDATE questions
      SET avg_answer_time_ms = ?,
          correct_rate = ?,
          laugh_score = ?
      WHERE id = ?
    `);
    stmt.run(avgAnswerTimeMs, correctRate, laughScore, questionId);
  }

  // ============================================================================
  // GAME TRACKING
  // ============================================================================

  /**
   * Create a new game record
   */
  createGame(numPlayers, numRounds) {
    const stmt = this.db.prepare(`
      INSERT INTO games (num_players, num_rounds)
      VALUES (?, ?)
    `);
    const result = stmt.run(numPlayers, numRounds);
    return result.lastInsertRowid;
  }

  /**
   * Complete a game and record winner
   */
  completeGame(gameId, winnerName, winnerScore, durationSeconds) {
    const stmt = this.db.prepare(`
      UPDATE games
      SET ended_at = unixepoch(),
          winner_name = ?,
          winner_score = ?,
          duration_seconds = ?
      WHERE id = ?
    `);
    stmt.run(winnerName, winnerScore, durationSeconds, gameId);
  }

  /**
   * Record results for a single question in a game
   */
  recordQuestionResult(gameId, questionId, roundNumber, playersAnswered, playersCorrect, avgAnswerTimeMs, laughVotes = 0) {
    const stmt = this.db.prepare(`
      INSERT INTO game_results (game_id, question_id, round_number, players_answered, players_correct, avg_answer_time_ms, laugh_votes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(gameId, questionId, roundNumber, playersAnswered, playersCorrect, avgAnswerTimeMs, laughVotes);
  }

  /**
   * Record individual player answer
   */
  recordPlayerAnswer(gameId, questionId, playerName, answerIndex, isCorrect, answerTimeMs, votedFunny = false) {
    const stmt = this.db.prepare(`
      INSERT INTO player_answers (game_id, question_id, player_name, answer_index, is_correct, answer_time_ms, voted_funny)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(gameId, questionId, playerName, answerIndex, isCorrect ? 1 : 0, answerTimeMs, votedFunny ? 1 : 0);
  }

  // ============================================================================
  // LEARNING LOOP
  // ============================================================================

  /**
   * Get questions that should be retired based on poor performance
   * @param {Object} criteria
   * @param {number} criteria.minUses - Minimum uses before considering retirement
   * @param {number} criteria.maxCorrectRate - Retire if correct rate above this (too easy)
   * @param {number} criteria.minCorrectRate - Retire if correct rate below this (too hard/unclear)
   * @param {number} criteria.minLaughScore - Retire if laugh score below this (not funny)
   * @returns {Array} Questions to retire
   */
  getQuestionsToRetire(criteria = {}) {
    const {
      minUses = 5,
      maxCorrectRate = 0.95,
      minCorrectRate = 0.15,
      minLaughScore = 0.1,
    } = criteria;

    const stmt = this.db.prepare(`
      SELECT id, type, text, times_used, correct_rate, laugh_score
      FROM questions
      WHERE retired_at IS NULL
        AND times_used >= ?
        AND (
          correct_rate > ? OR
          correct_rate < ? OR
          (type IN ('roast', 'chaos', 'who-said-it') AND laugh_score < ?)
        )
    `);

    return stmt.all(minUses, maxCorrectRate, minCorrectRate, minLaughScore);
  }

  /**
   * Get top performing questions for a given type
   * @param {string} type - Question type
   * @param {number} limit - Number to return
   * @returns {Array} Top questions
   */
  getTopQuestions(type, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT id, type, text, times_used, correct_rate, laugh_score
      FROM questions
      WHERE retired_at IS NULL
        AND type = ?
        AND times_used >= 3
      ORDER BY laugh_score DESC, correct_rate DESC
      LIMIT ?
    `);
    return stmt.all(type, limit);
  }

  /**
   * Get topics/categories that get the most laughs
   * @param {number} limit - Number of topics to return
   * @returns {Array} Topics with stats
   */
  getTopTopics(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT
        topic,
        COUNT(*) as question_count,
        AVG(laugh_score) as avg_laugh_score,
        AVG(correct_rate) as avg_correct_rate,
        SUM(times_used) as total_uses
      FROM questions
      WHERE retired_at IS NULL
        AND topic IS NOT NULL
        AND times_used >= 2
      GROUP BY topic
      ORDER BY avg_laugh_score DESC, total_uses DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  /**
   * Run learning loop: update all question stats based on game results
   */
  runLearningLoop() {
    console.log("🧠 Running learning loop...");

    // Update question statistics from game results
    const updateStmt = this.db.prepare(`
      UPDATE questions
      SET
        avg_answer_time_ms = (
          SELECT AVG(avg_answer_time_ms)
          FROM game_results
          WHERE game_results.question_id = questions.id
        ),
        correct_rate = (
          SELECT CAST(SUM(players_correct) AS REAL) / SUM(players_answered)
          FROM game_results
          WHERE game_results.question_id = questions.id
        ),
        laugh_score = (
          SELECT CAST(SUM(laugh_votes) AS REAL) / COUNT(*)
          FROM game_results
          WHERE game_results.question_id = questions.id
        )
      WHERE id IN (
        SELECT DISTINCT question_id FROM game_results
      )
    `);

    const result = updateStmt.run();
    console.log(`✅ Updated stats for ${result.changes} questions`);

    // Auto-retire poor performers
    const toRetire = this.getQuestionsToRetire();
    toRetire.forEach((q) => {
      console.log(`🗑️  Retiring question ${q.id}: "${q.text.substring(0, 50)}..." (used ${q.times_used}x, correct rate: ${q.correct_rate?.toFixed(2)}, laughs: ${q.laugh_score?.toFixed(2)})`);
      this.retireQuestion(q.id);
    });

    return {
      questionsUpdated: result.changes,
      questionsRetired: toRetire.length,
    };
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Get database statistics
   */
  getStats() {
    const stats = {};

    stats.questions = this.db.prepare("SELECT COUNT(*) as count FROM questions WHERE retired_at IS NULL").get();
    stats.questionsByType = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM questions
      WHERE retired_at IS NULL
      GROUP BY type
    `).all();
    stats.gamesPlayed = this.db.prepare("SELECT COUNT(*) as count FROM games WHERE ended_at IS NOT NULL").get();
    stats.totalRounds = this.db.prepare("SELECT COUNT(*) as count FROM game_results").get();

    return stats;
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

// Singleton instance
let dbInstance = null;

function getDB() {
  if (!dbInstance) {
    dbInstance = new HenzeTriviaDB();
  }
  return dbInstance;
}

module.exports = {
  HenzeTriviaDB,
  getDB,
  DB_PATH,
};
