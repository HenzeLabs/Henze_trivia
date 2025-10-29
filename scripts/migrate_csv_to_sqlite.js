#!/usr/bin/env node

/**
 * Migration Script: CSV → SQLite
 * Imports existing CSV questions into the new SQLite database
 */

const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const { getDB } = require("../web-app/database");

const OUTPUT_DIR = path.join(__dirname, "..", "output");

// CSV files to migrate
const CSV_FILES = [
  {
    path: path.join(OUTPUT_DIR, "sample_questions.csv"),
    type: "trivia",
    source: "curated",
  },
  {
    path: path.join(OUTPUT_DIR, "who_said_it_questions.csv"),
    type: "who-said-it",
    source: "chat",
  },
  {
    path: path.join(OUTPUT_DIR, "chaos_questions.csv"),
    type: "chaos",
    source: "chat",
  },
  {
    path: path.join(OUTPUT_DIR, "roast_mode_questions.csv"),
    type: "roast",
    source: "chat",
  },
];

/**
 * Parse a single CSV file
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const questions = [];

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath} (skipping)`);
      return resolve([]);
    }

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        // CSV format: question,correct_answer,explanation,difficulty,category,option_A,option_B,option_C,option_D
        const options = [
          row.option_A || row.option_a || row.A,
          row.option_B || row.option_b || row.B,
          row.option_C || row.option_c || row.C,
          row.option_D || row.option_d || row.D,
        ];

        // Convert letter answer (A/B/C/D) to index (0/1/2/3)
        let correctIndex = 0;
        const correctAnswer = row.correct_answer || row.Correct_Answer || row.correct || row.Correct || "A";
        if (correctAnswer.toUpperCase() === "A" || correctAnswer === "0") correctIndex = 0;
        else if (correctAnswer.toUpperCase() === "B" || correctAnswer === "1") correctIndex = 1;
        else if (correctAnswer.toUpperCase() === "C" || correctAnswer === "2") correctIndex = 2;
        else if (correctAnswer.toUpperCase() === "D" || correctAnswer === "3") correctIndex = 3;
        else correctIndex = parseInt(correctAnswer, 10) || 0;

        const question = {
          question: row.question || row.Question,
          options,
          correct: correctIndex,
          explanation: row.explanation || row.Explanation || row.explainer || "",
          category: row.category || row.Category || "",
          difficulty: row.difficulty || row.Difficulty || "",
        };

        // Validate
        if (
          question.question &&
          question.options.every((opt) => opt) &&
          question.correct >= 0 &&
          question.correct <= 3
        ) {
          questions.push(question);
        } else {
          console.warn(`⚠️  Invalid question row:`, row);
        }
      })
      .on("end", () => {
        resolve(questions);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

/**
 * Main migration function
 */
async function migrate() {
  console.log("🚀 Starting CSV → SQLite migration...\n");

  const db = getDB();
  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of CSV_FILES) {
    console.log(`📂 Processing: ${path.basename(file.path)}`);

    try {
      const questions = await parseCSV(file.path);

      console.log(`   Found ${questions.length} questions`);

      for (const q of questions) {
        try {
          const questionId = db.insertQuestion({
            type: file.type,
            text: q.question,
            options: q.options,
            answer_index: q.correct,
            explanation: q.explanation,
            category: q.category,
            difficulty: q.difficulty,
            source: file.source,
          });

          totalImported++;
        } catch (err) {
          console.error(`   ❌ Failed to insert question:`, err.message);
          totalSkipped++;
        }
      }

      console.log(`   ✅ Imported ${questions.length} questions\n`);
    } catch (err) {
      console.error(`   ❌ Error processing file:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Migration complete!`);
  console.log(`   Total imported: ${totalImported}`);
  console.log(`   Total skipped:  ${totalSkipped}`);
  console.log("=".repeat(60) + "\n");

  // Show stats
  const stats = db.getStats();
  console.log("📊 Database Statistics:");
  console.log(`   Total active questions: ${stats.questions.count}`);
  console.log(`   By type:`);
  stats.questionsByType.forEach((t) => {
    console.log(`     - ${t.type}: ${t.count}`);
  });

  db.close();
}

// Run migration
if (require.main === module) {
  migrate().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
}

module.exports = { migrate };
