/**
 * Question Type Mixing Algorithm
 * Generates balanced question packs with configurable type ratios
 */

const { getDB } = require("./database");

/**
 * Generate a question pack with specified type ratios
 *
 * @param {number} totalQuestions - Total number of questions needed
 * @param {Object} typeMix - Type ratios (must sum to 1.0)
 *   Example: { "trivia": 0.6, "who-said-it": 0.15, "chaos": 0.1, "roast": 0.15 }
 * @param {Object} options - Additional options
 * @param {number} options.excludeDays - Exclude questions used in last N days
 * @param {boolean} options.prioritizeLaughs - Prioritize high laugh_score questions
 * @param {boolean} options.balanceDifficulty - Balance easy/medium/hard
 * @returns {Array} Array of questions
 */
function generateQuestionPack(totalQuestions, typeMix, options = {}) {
  const {
    excludeDays = 30,
    prioritizeLaughs = true,
    balanceDifficulty = false,
  } = options;

  const db = getDB();
  const pack = [];

  // Validate type mix sums to ~1.0
  const sum = Object.values(typeMix).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1.0) > 0.01) {
    console.warn(`⚠️  Type mix doesn't sum to 1.0 (got ${sum}), normalizing...`);
    Object.keys(typeMix).forEach((key) => {
      typeMix[key] = typeMix[key] / sum;
    });
  }

  // Calculate how many questions per type
  const typeCounts = {};
  let allocated = 0;

  for (const [type, ratio] of Object.entries(typeMix)) {
    const count = Math.floor(totalQuestions * ratio);
    typeCounts[type] = count;
    allocated += count;
  }

  // Distribute remainder to types with highest ratios
  const remainder = totalQuestions - allocated;
  if (remainder > 0) {
    const sortedTypes = Object.entries(typeMix).sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < remainder; i++) {
      typeCounts[sortedTypes[i][0]]++;
    }
  }

  console.log(`🎲 Generating pack: ${totalQuestions} questions`);
  console.log(`   Mix: ${JSON.stringify(typeCounts)}`);

  // Fetch questions for each type
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count === 0) continue;

    const questions = db.getActiveQuestions({
      type,
      limit: count * 2, // Fetch 2x to have buffer for selection
      excludeDays,
    });

    if (questions.length === 0) {
      console.warn(`⚠️  No questions available for type: ${type}`);
      continue;
    }

    // Select best questions
    let selected;
    if (prioritizeLaughs && (type === "roast" || type === "chaos" || type === "who-said-it")) {
      // For chat-based questions, prioritize laugh score
      selected = questions
        .sort((a, b) => (b.laugh_score || 0) - (a.laugh_score || 0))
        .slice(0, count);
    } else if (balanceDifficulty) {
      // Balance difficulty (if available)
      selected = _selectBalancedDifficulty(questions, count);
    } else {
      // Random selection from available pool
      selected = _shuffleArray(questions).slice(0, count);
    }

    pack.push(...selected);

    console.log(`   ✓ ${type}: ${selected.length} questions`);
  }

  // Shuffle the final pack for variety
  const shuffledPack = _shuffleArray(pack);

  // Apply strategic ordering (optional)
  const orderedPack = _applyStrategicOrdering(shuffledPack, typeCounts);

  console.log(`✅ Pack generated: ${orderedPack.length} questions`);

  return orderedPack;
}

/**
 * Strategic ordering: intersperse different types for variety
 * Pattern: Start with trivia, then mix in chat questions
 */
function _applyStrategicOrdering(pack, typeCounts) {
  const byType = {
    trivia: [],
    "who-said-it": [],
    chaos: [],
    roast: [],
  };

  // Group by type
  pack.forEach((q) => {
    if (byType[q.type]) {
      byType[q.type].push(q);
    }
  });

  const ordered = [];
  const maxLength = Math.max(...Object.values(byType).map((arr) => arr.length));

  // Interleave types
  for (let i = 0; i < maxLength; i++) {
    // Trivia first (safe start)
    if (byType.trivia[i]) ordered.push(byType.trivia[i]);

    // Mix in chat questions
    if (byType["who-said-it"][i]) ordered.push(byType["who-said-it"][i]);
    if (byType.chaos[i]) ordered.push(byType.chaos[i]);
    if (byType.roast[i]) ordered.push(byType.roast[i]);
  }

  return ordered;
}

/**
 * Select questions with balanced difficulty
 */
function _selectBalancedDifficulty(questions, count) {
  const byDifficulty = {
    easy: questions.filter((q) => q.difficulty === "easy"),
    medium: questions.filter((q) => q.difficulty === "medium"),
    hard: questions.filter((q) => q.difficulty === "hard"),
    unknown: questions.filter((q) => !q.difficulty),
  };

  // Target: 40% easy, 40% medium, 20% hard
  const targets = {
    easy: Math.ceil(count * 0.4),
    medium: Math.ceil(count * 0.4),
    hard: Math.floor(count * 0.2),
  };

  const selected = [];

  for (const [difficulty, target] of Object.entries(targets)) {
    const available = byDifficulty[difficulty] || [];
    const take = Math.min(target, available.length);
    selected.push(..._shuffleArray(available).slice(0, take));
  }

  // Fill remainder with random questions if needed
  const remaining = count - selected.length;
  if (remaining > 0) {
    const unusedQuestions = questions.filter((q) => !selected.includes(q));
    selected.push(..._shuffleArray(unusedQuestions).slice(0, remaining));
  }

  return selected;
}

/**
 * Fisher-Yates shuffle
 */
function _shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get composition of a question pack (for debugging)
 */
function getPackComposition(pack) {
  const composition = {};
  pack.forEach((q) => {
    composition[q.type] = (composition[q.type] || 0) + 1;
  });
  return composition;
}

/**
 * Get recommended type mix based on available questions
 * Adjusts ratios if certain types have too few questions
 */
function getRecommendedMix(totalQuestions) {
  const db = getDB();
  const stats = db.getStats();

  // Count available questions per type
  const available = {};
  stats.questionsByType.forEach((t) => {
    available[t.type] = t.count;
  });

  // Default ideal mix
  const idealMix = {
    trivia: 0.6,
    "who-said-it": 0.15,
    chaos: 0.1,
    roast: 0.15,
  };

  // Adjust if certain types are scarce
  const recommendedMix = {};
  let totalRatio = 0;

  for (const [type, idealRatio] of Object.entries(idealMix)) {
    const availableCount = available[type] || 0;
    const neededCount = Math.ceil(totalQuestions * idealRatio);

    if (availableCount < neededCount) {
      // Scale down ratio proportionally
      const actualRatio = (availableCount / totalQuestions) * 0.9; // 90% to leave buffer
      recommendedMix[type] = actualRatio;
      console.warn(
        `⚠️  Not enough ${type} questions (need ${neededCount}, have ${availableCount})`
      );
    } else {
      recommendedMix[type] = idealRatio;
    }

    totalRatio += recommendedMix[type];
  }

  // Normalize to sum to 1.0
  Object.keys(recommendedMix).forEach((type) => {
    recommendedMix[type] = recommendedMix[type] / totalRatio;
  });

  return recommendedMix;
}

module.exports = {
  generateQuestionPack,
  getPackComposition,
  getRecommendedMix,
};
