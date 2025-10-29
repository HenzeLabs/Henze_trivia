/**
 * Question Loader - Loads all trivia questions from generated files
 * Supports multiple question types: trivia, who-said-it, chaos, roast
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');

/**
 * Parse a CSV file of questions
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of parsed question objects
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const questions = [];

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return resolve([]);
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // Convert CSV row to game format
          const question = {
            question: row.question || '',
            options: [
              row.option_A || '',
              row.option_B || '',
              row.option_C || '',
              row.option_D || ''
            ],
            correct: ['A', 'B', 'C', 'D'].indexOf(row.correct_answer || 'A'),
            explanation: row.explanation || '',
            category: row.category || 'General',
            difficulty: row.difficulty || 'medium',
            type: row.type || 'trivia'
          };

          // Only add if question has valid data
          if (question.question && question.options.every(opt => opt)) {
            questions.push(question);
          }
        } catch (e) {
          console.error(`Error parsing question row:`, e.message);
        }
      })
      .on('end', () => {
        console.log(`✅ Loaded ${questions.length} questions from ${path.basename(filePath)}`);
        resolve(questions);
      })
      .on('error', reject);
  });
}

/**
 * Load all available question files
 * @returns {Promise<Array>} - Combined array of all questions
 */
async function loadAllQuestions() {
  console.log('\n📚 Loading trivia questions...');

  const questionFiles = [
    { path: path.join(OUTPUT_DIR, 'sample_questions.csv'), type: 'trivia' },
    { path: path.join(OUTPUT_DIR, 'who_said_it_questions.csv'), type: 'who-said-it' },
    { path: path.join(OUTPUT_DIR, 'chaos_questions.csv'), type: 'chaos' },
    { path: path.join(OUTPUT_DIR, 'roast_mode_questions.csv'), type: 'roast' },
    { path: path.join(OUTPUT_DIR, 'savage_pack.csv'), type: 'savage' },
    { path: path.join(OUTPUT_DIR, 'general_trivia.csv'), type: 'trivia' }
  ];

  const allQuestions = [];

  for (const file of questionFiles) {
    try {
      const questions = await parseCSV(file.path);
      // Add type metadata
      questions.forEach(q => q.type = file.type);
      allQuestions.push(...questions);
    } catch (e) {
      console.error(`❌ Error loading ${file.path}:`, e.message);
    }
  }

  console.log(`\n🎯 Total questions loaded: ${allQuestions.length}`);

  if (allQuestions.length === 0) {
    console.log('\n⚠️  No questions found! Please run question generation first:');
    console.log('   cd ..');
    console.log('   python generate_questions.py --all');
  }

  return allQuestions;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get a random selection of questions
 * @param {number} count - Number of questions to get
 * @param {Array} questionPool - Pool of questions to choose from
 * @returns {Array} - Random selection of questions
 */
function getRandomQuestions(count, questionPool = []) {
  if (questionPool.length === 0) {
    return [];
  }

  const shuffled = shuffle(questionPool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
  loadAllQuestions,
  getRandomQuestions,
  shuffle
};
