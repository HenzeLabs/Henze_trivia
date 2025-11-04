/**
 * GameRoom: Finite State Machine for Henze Trivia
 *
 * State Flow:
 * LOBBY → ASKING → ANSWERS_LOCKED → REVEAL → ROUND_END → (repeat) → GAME_END
 */

const crypto = require("crypto");
const { getDB } = require("./database");
const logger = require("./logger");

// Game states enum
const GameState = {
  LOBBY: "LOBBY",
  ASKING: "ASKING",
  ANSWERS_LOCKED: "ANSWERS_LOCKED",
  REVEAL: "REVEAL",
  ROUND_END: "ROUND_END",
  GAME_END: "GAME_END",
};

// Valid state transitions
const VALID_TRANSITIONS = {
  [GameState.LOBBY]: [GameState.ASKING],
  [GameState.ASKING]: [GameState.ANSWERS_LOCKED],
  [GameState.ANSWERS_LOCKED]: [GameState.REVEAL],
  [GameState.REVEAL]: [GameState.ROUND_END],
  [GameState.ROUND_END]: [GameState.ASKING, GameState.GAME_END],
  [GameState.GAME_END]: [GameState.LOBBY], // Allow reset
};

class GameRoom {
  constructor(config = {}) {
    this.id = Date.now();
    this.token = crypto.randomBytes(16).toString("hex");
    this.state = GameState.LOBBY;
    this.config = {
      maxPlayers: config.maxPlayers || 8,
      maxLives: config.maxLives || 3,
      maxRounds: config.maxRounds || 20,
      askingTimeoutMs: config.askingTimeoutMs || 30000, // 30s to answer
      revealDelayMs: config.revealDelayMs || 500,
      roundEndDelayMs: config.roundEndDelayMs || 3000,
      pointsPerCorrect: config.pointsPerCorrect || 100,
    };

    // Player management
    this.players = new Map(); // socketId -> { id, name, socket, joinedAt }
    this.scores = new Map(); // playerId -> score
    this.lives = new Map(); // playerId -> lives remaining
    this.ghosts = new Set(); // playerId set of eliminated players

    // Question management
    this.questionPool = []; // All questions loaded for this game
    this.activeQuestions = []; // Questions selected for this game
    this.currentRound = 0;
    this.currentQuestion = null; // Full question with correct answer
    this.currentQuestionStartTime = null;

    // Answer tracking
    this.answers = new Map(); // playerId -> { answerIndex, answeredAt }
    this.laughVotes = new Set(); // playerId set who voted this question funny

    // Timers
    this.timers = new Map();

    // Database tracking
    this.db = getDB();
    this.dbGameId = null;

    // Transition lock (prevents race conditions)
    this.transitionInProgress = false;

    // Answer submission mutex (prevents concurrent answer processing)
    this.answerMutex = false;
    this.answerQueue = Promise.resolve();
  }

  // ==========================================================================
  // STATE MACHINE CORE
  // ==========================================================================

  /**
   * Check if transition from current state to target state is valid
   */
  canTransition(toState) {
    const validTargets = VALID_TRANSITIONS[this.state] || [];
    return validTargets.includes(toState);
  }

  /**
   * Attempt to transition to a new state
   * @throws {Error} If transition is invalid
   */
  transitionTo(newState) {
    if (this.transitionInProgress) {
      throw new Error(`Transition already in progress`);
    }

    if (!this.canTransition(newState)) {
      throw new Error(`Invalid transition: ${this.state} → ${newState}`);
    }

    const previousState = this.state;
    this.state = newState;

    logger.game(`State transition: ${previousState} → ${newState}`, {
      round: this.currentRound,
      alivePlayers: this.getAlivePlayers().length,
    });

    // State entry hooks
    this._onEnterState(newState, previousState);

    return newState;
  }

  /**
   * State entry hooks (called when entering a state)
   */
  _onEnterState(state, previousState) {
    switch (state) {
      case GameState.ASKING:
        this._startAskingTimer();
        break;

      case GameState.ANSWERS_LOCKED:
        this._startRevealTimer();
        break;

      case GameState.REVEAL:
        this._processAnswers();
        this._startRevealToRoundEndTimer();
        break;

      case GameState.ROUND_END:
        this._recordRoundResults();
        this._startRoundEndTimer();
        break;

      case GameState.GAME_END:
        this._finalizeGame();
        break;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  // ==========================================================================
  // PLAYER MANAGEMENT
  // ==========================================================================

  /**
   * Add a player to the game
   * @throws {Error} If game not in LOBBY or player limit reached
   */
  addPlayer(socketId, playerName, socket) {
    if (this.state !== GameState.LOBBY) {
      throw new Error("Cannot join game in progress");
    }

    if (this.players.size >= this.config.maxPlayers) {
      throw new Error(`Game is full (max ${this.config.maxPlayers} players)`);
    }

    // Only block names actively in use
    const existingNames = Array.from(this.players.values()).map((p) =>
      p.name.toLowerCase()
    );
    if (existingNames.includes(playerName.toLowerCase())) {
      throw new Error("Name already taken");
    }

    const playerId = crypto.randomBytes(8).toString("hex");

    this.players.set(socketId, {
      id: playerId,
      name: playerName,
      socket,
      joinedAt: Date.now(),
      role: "player", // default role, can be changed later
    });

    this.scores.set(playerId, 0);
    this.lives.set(playerId, this.config.maxLives);

    logger.player(`Player joined: ${playerName}`, {
      playerId,
      totalPlayers: this.players.size,
    });

    return { playerId, playerName };
  }

  /**
   * Remove a player (disconnect)
   */
  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      logger.player(`Player left: ${player.name}`, {
        playerId: player.id,
        remainingPlayers: this.players.size - 1,
      });
      this.players.delete(socketId);

      // Clean up if all players leave
      if (this.players.size === 0) {
        logger.info(
          `All players left - resetting to LOBBY from state: ${this.state}`
        );
        this.reset();
      }
    }
  }

  /**
   * Get player by socket ID
   */
  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  /**
   * Get all alive (non-ghost) players
   */
  getAlivePlayers() {
    return Array.from(this.players.values()).filter(
      (p) => !this.ghosts.has(p.id)
    );
  }

  /**
   * Eliminate a player (out of lives)
   */
  eliminatePlayer(playerId) {
    this.ghosts.add(playerId);
    const player = Array.from(this.players.values()).find(
      (p) => p.id === playerId
    );
    if (player) {
      logger.warn(`Player eliminated: ${player.name}`, {
        playerId,
        alivePlayers: this.getAlivePlayers().length - 1,
      });
    }
  }

  // ==========================================================================
  // QUESTION MANAGEMENT
  // ==========================================================================

  /**
   * Load questions for this game based on type mixing algorithm
   */
  loadQuestions(typeMix = null) {
    const mixer = require("./questionMixer");

    // Default mix: 40% chat, 60% general
    const mix = typeMix || {
      "who-said-it": 0.15,
      chaos: 0.1,
      roast: 0.15,
      trivia: 0.6,
    };

    this.questionPool = mixer.generateQuestionPack(
      this.config.maxRounds,
      mix,
      { excludeDays: 0 } // Allow question reuse (small question pool)
    );

    const composition = mixer.getPackComposition(this.questionPool);
    logger.info(`Loaded ${this.questionPool.length} questions`, {
      count: this.questionPool.length,
      composition,
    });

    return this.questionPool.length;
  }

  /**
   * Get next question (with correct answer hidden for clients)
   */
  nextQuestion() {
    if (this.currentRound >= this.questionPool.length) {
      return null; // Game over
    }

    this.currentQuestion = this.questionPool[this.currentRound];
    this.currentQuestionStartTime = Date.now();
    this.currentRound++;

    // Mark as used in database
    this.db.markQuestionUsed(this.currentQuestion.id);

    // Reset answer tracking
    this.answers.clear();
    this.laughVotes.clear();

    // Reset answer mutex for new question
    this.answerMutex = false;

    logger.game(`Round ${this.currentRound} started`, {
      round: this.currentRound,
      questionId: this.currentQuestion.id,
      type: this.currentQuestion.type,
      questionPreview: this.currentQuestion.text.substring(0, 60),
    });

    return this.currentQuestion;
  }

  /**
   * Get sanitized question (without correct answer) for clients
   */
  getSanitizedQuestion() {
    if (!this.currentQuestion) return null;

    const { answer_index, ...questionWithoutAnswer } = this.currentQuestion;

    return {
      ...questionWithoutAnswer,
      round: this.currentRound,
      totalRounds: this.config.maxRounds,
    };
  }

  /**
   * Get question with answer (for reveal phase)
   */
  getQuestionWithAnswer() {
    if (!this.currentQuestion) return null;

    return {
      ...this.currentQuestion,
      round: this.currentRound,
      totalRounds: this.config.maxRounds,
      correctAnswer: this.currentQuestion.answer_index,
    };
  }

  // ==========================================================================
  // ANSWER MANAGEMENT
  // ==========================================================================

  /**
   * Submit an answer for a player (with mutex to prevent race conditions)
   * @throws {Error} If not in ASKING state or invalid answer
   */
  async submitAnswer(playerId, answerIndex) {
    // Queue this answer submission to prevent race conditions
    return new Promise((resolve, reject) => {
      this.answerQueue = this.answerQueue.then(async () => {
        try {
          // All validation and processing happens atomically
          if (this.state !== GameState.ASKING) {
            throw new Error("Not accepting answers in current state");
          }

          if (this.ghosts.has(playerId)) {
            throw new Error("Eliminated players cannot answer");
          }

          if (answerIndex < 0 || answerIndex > 3) {
            throw new Error("Invalid answer index");
          }

          if (this.answers.has(playerId)) {
            throw new Error("Already answered this question");
          }

          const answeredAt = Date.now();
          const answerTimeMs = answeredAt - this.currentQuestionStartTime;

          this.answers.set(playerId, {
            answerIndex,
            answeredAt,
            answerTimeMs,
          });

          const player = Array.from(this.players.values()).find(
            (p) => p.id === playerId
          );
          if (player) {
            logger.info(`Player answered`, {
              playerName: player.name,
              playerId,
              answerIndex,
              answerTimeMs,
              round: this.currentRound,
            });
          }

          // Check if all alive players have answered (atomic check + transition)
          if (this._checkAllAnswered() && !this.answerMutex) {
            this.answerMutex = true; // Prevent duplicate transitions
            this._clearTimer("asking");
            this.transitionTo(GameState.ANSWERS_LOCKED);
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /**
   * Vote a question as funny
   */
  voteQuestionFunny(playerId) {
    this.laughVotes.add(playerId);
  }

  /**
   * Check if all alive players have answered
   */
  _checkAllAnswered() {
    const alivePlayers = this.getAlivePlayers();
    const answeredCount = Array.from(this.answers.keys()).filter(
      (pid) => !this.ghosts.has(pid)
    ).length;

    return answeredCount >= alivePlayers.length && alivePlayers.length > 0;
  }

  /**
   * Process answers and update scores/lives
   */
  _processAnswers() {
    const correctAnswer = this.currentQuestion.answer_index;

    for (const [playerId, answer] of this.answers.entries()) {
      if (this.ghosts.has(playerId)) continue; // Skip ghosts

      const isCorrect = answer.answerIndex === correctAnswer;

      if (isCorrect) {
        // Award points
        const currentScore = this.scores.get(playerId) || 0;
        this.scores.set(playerId, currentScore + this.config.pointsPerCorrect);
      } else {
        // Lose a life
        const currentLives = this.lives.get(playerId) || 0;
        this.lives.set(playerId, currentLives - 1);

        // Check elimination
        if (currentLives - 1 <= 0) {
          this.eliminatePlayer(playerId);
        }
      }
    }
  }

  // ==========================================================================
  // GAME FLOW
  // ==========================================================================

  /**
   * Start the game
   * @throws {Error} If not enough players or not in LOBBY
   */
  startGame() {
    if (this.state !== GameState.LOBBY) {
      throw new Error("Game already started");
    }

    if (this.players.size < 1) {
      throw new Error("Need at least 1 player to start");
    }

    // Create database game record
    this.dbGameId = this.db.createGame(
      this.players.size,
      this.config.maxRounds
    );
    logger.game(`Game started`, {
      gameId: this.dbGameId,
      playerCount: this.players.size,
      maxRounds: this.config.maxRounds,
    });

    // Load questions
    if (this.questionPool.length === 0) {
      this.loadQuestions();
    }

    // Transition to first question
    this.nextQuestion();
    this.transitionTo(GameState.ASKING);
  }

  /**
   * Reset game to lobby
   */
  reset() {
    logger.info("Resetting game to lobby", {
      previousGameId: this.dbGameId,
    });

    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Reset state
    this.state = GameState.LOBBY;
    this.currentRound = 0;
    this.currentQuestion = null;
    this.questionPool = [];
    this.answers.clear();
    this.laughVotes.clear();
    this.ghosts.clear();

    // Reset player stats
    this.players.forEach((player) => {
      this.scores.set(player.id, 0);
      this.lives.set(player.id, this.config.maxLives);
    });

    // Generate new token
    this.token = crypto.randomBytes(16).toString("hex");

    this.dbGameId = null;
  }

  // ==========================================================================
  // TIMERS
  // ==========================================================================

  _startAskingTimer() {
    this._setTimer(
      "asking",
      () => {
        logger.warn("Asking timeout - locking answers", {
          round: this.currentRound,
          answersReceived: this.answers.size,
          alivePlayers: this.getAlivePlayers().length,
        });
        if (this.state === GameState.ASKING) {
          // Force transition even if not everyone answered
          this.transitionTo(GameState.ANSWERS_LOCKED);
        }
      },
      this.config.askingTimeoutMs
    );
  }

  _startRevealTimer() {
    this._setTimer(
      "reveal",
      () => {
        this.transitionTo(GameState.REVEAL);
      },
      this.config.revealDelayMs
    );
  }

  _startRevealToRoundEndTimer() {
    this._setTimer(
      "revealToRoundEnd",
      () => {
        this.transitionTo(GameState.ROUND_END);
      },
      3000 // 3 seconds to see reveal
    );
  }

  _startRoundEndTimer() {
    this._setTimer(
      "roundEnd",
      () => {
        // Check if game should end
        const alivePlayers = this.getAlivePlayers();

        if (
          alivePlayers.length <= 1 ||
          this.currentRound >= this.config.maxRounds
        ) {
          this.transitionTo(GameState.GAME_END);
          // Auto-reset to LOBBY after 5 seconds
          this._startGameEndTimer();
        } else {
          // Next round
          this.nextQuestion();
          this.transitionTo(GameState.ASKING);
        }
      },
      2000 // 2 seconds to see results before next question
    );
  }

  _startGameEndTimer() {
    this._setTimer(
      "gameEnd",
      () => {
        logger.info("Game ended - resetting to LOBBY for next game");
        this.reset();
      },
      5000
    ); // 5 second delay before reset
  }

  _setTimer(name, callback, delay) {
    this._clearTimer(name);
    this.timers.set(name, setTimeout(callback, delay));
  }

  _clearTimer(name) {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }
  }

  // ==========================================================================
  // DATABASE TRACKING
  // ==========================================================================

  /**
   * Record results for the current round
   */
  _recordRoundResults() {
    if (!this.dbGameId || !this.currentQuestion) return;

    const alivePlayers = this.getAlivePlayers();
    const correctAnswer = this.currentQuestion.answer_index;

    let playersAnswered = 0;
    let playersCorrect = 0;
    let totalAnswerTime = 0;

    // Record individual answers
    for (const [playerId, answer] of this.answers.entries()) {
      if (this.ghosts.has(playerId)) continue;

      playersAnswered++;
      const isCorrect = answer.answerIndex === correctAnswer;
      if (isCorrect) playersCorrect++;
      totalAnswerTime += answer.answerTimeMs;

      const player = Array.from(this.players.values()).find(
        (p) => p.id === playerId
      );
      if (player) {
        this.db.recordPlayerAnswer(
          this.dbGameId,
          this.currentQuestion.id,
          player.name,
          answer.answerIndex,
          isCorrect,
          answer.answerTimeMs,
          this.laughVotes.has(playerId)
        );
      }
    }

    const avgAnswerTime =
      playersAnswered > 0 ? Math.round(totalAnswerTime / playersAnswered) : 0;

    // Record aggregate results
    this.db.recordQuestionResult(
      this.dbGameId,
      this.currentQuestion.id,
      this.currentRound,
      playersAnswered,
      playersCorrect,
      avgAnswerTime,
      this.laughVotes.size
    );
  }

  /**
   * Finalize game in database
   */
  _finalizeGame() {
    if (!this.dbGameId) return;

    const winner = this._getWinner();
    const durationSeconds = Math.floor((Date.now() - this.id) / 1000);

    this.db.completeGame(
      this.dbGameId,
      winner.name,
      winner.score,
      durationSeconds
    );

    logger.game(`Game complete`, {
      gameId: this.dbGameId,
      winner: winner.name,
      score: winner.score,
      durationSeconds,
    });

    // Run learning loop
    setTimeout(() => {
      const results = this.db.runLearningLoop();
      logger.info(`Learning loop complete`, {
        questionsUpdated: results.questionsUpdated,
        questionsRetired: results.questionsRetired,
      });
    }, 1000);
  }

  // ==========================================================================
  // GAME STATE SERIALIZATION (for clients)
  // ==========================================================================

  /**
   * Get current game state for broadcasting to clients
   */
  getGameState() {
    const playerList = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      score: this.scores.get(p.id) || 0,
      lives: this.lives.get(p.id) || 0,
      isGhost: this.ghosts.has(p.id),
      hasAnswered:
        this.state === GameState.ASKING ? this.answers.has(p.id) : undefined,
      role: p.role || "player",
    }));

    const state = {
      gameId: this.id,
      state: this.state,
      round: this.currentRound,
      totalRounds: this.config.maxRounds,
      players: playerList,
    };

    // Add question data based on state
    if (
      this.state === GameState.ASKING ||
      this.state === GameState.ANSWERS_LOCKED
    ) {
      state.question = this.getSanitizedQuestion();
    } else if (
      this.state === GameState.REVEAL ||
      this.state === GameState.ROUND_END
    ) {
      state.question = this.getQuestionWithAnswer();
      state.laughVotes = this.laughVotes.size;
    } else if (this.state === GameState.GAME_END) {
      state.winner = this._getWinner();
    }
    return state;
  }

  /**
   * Determine winner
   */
  _getWinner() {
    let winner = null;
    let maxScore = -1;

    for (const [playerId, score] of this.scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        const player = Array.from(this.players.values()).find(
          (p) => p.id === playerId
        );
        winner = player;
      }
    }

    return winner ? { name: winner.name, score: maxScore } : null;
  }
}

module.exports = {
  GameRoom,
  GameState,
};
