#!/usr/bin/env node
/**
 * Seed database with initial trivia questions
 * Run this on Render to populate the database
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
const db = new Database(DB_PATH);

console.log("🌱 Seeding database with trivia questions...");

// Check if questions already exist
const count = db.prepare("SELECT COUNT(*) as count FROM questions").get();
if (count.count > 0) {
  console.log(`✅ Database already has ${count.count} questions. Skipping seed.`);
  process.exit(0);
}

// Seed questions
const questions = [
  { type: "trivia", text: "What event were Benny and Ian planning to attend where Ian was excited to see Flo Milli?", options: JSON.stringify(["Pride Festival","Top Golf","Trivia Night","Movie Night"]), answer_index: 0, explanation: "Benny mentioned that she is the headliner for pride, which excited Ian.", category: "Events", source: "curated" },
  { type: "trivia", text: "What food item did Ian decide he wanted after considering other options?", options: JSON.stringify(["Tacos","Pizza","Burgers","Sushi"]), answer_index: 0, explanation: "Ian said, 'On second thought I will take some tacos lol' after a conversation about food.", category: "Food", source: "curated" },
  { type: "trivia", text: "How many hours did Benny suggest for Top Golf pricing?", options: JSON.stringify(["2 hours for $20","1 hour for $10","90 mins for $15","All of the above"]), answer_index: 3, explanation: "Benny listed multiple Top Golf pricing options that included all mentioned durations.", category: "Activities", source: "curated" },
  { type: "trivia", text: "What reward program does Benny mention regarding Bangkok Thai?", options: JSON.stringify(["Free drink after 5 visits","Free entree after 8 orders","Discount on next meal","Free dessert after 10 orders"]), answer_index: 1, explanation: "Benny noted that the program gives a free entree after 8 orders.", category: "Dining", source: "curated" },
  { type: "trivia", text: "What beverage does Benny plan to get at Whole Foods while mentioning 'going to get edibles'?", options: JSON.stringify(["Coffee","Wine","Mimosas","Soda"]), answer_index: 1, explanation: "Benny asked if the group wanted wine while heading to Whole Foods.", category: "Beverages", source: "curated" },
  { type: "who-said-it", text: `Who said: "I had sex with him 🤦🏽‍♂️"?`, options: JSON.stringify(["Ian O'Malley","Gina Ortiz","Lauren","Benny Harris"]), answer_index: 3, explanation: "Benny Harris said this. Classic chaotic energy with a surprise twist. Perfect for a trivia game!", category: "Who Said It?", source: "chat" },
  { type: "who-said-it", text: `Who said: "I'll bring the hawks one too tho"?`, options: JSON.stringify(["Ian O'Malley","Gina Ortiz","Benny Harris","Jackson"]), answer_index: 2, explanation: "Benny Harris said this. Casual mention of bringing 'the hawks'—what does that even mean? Pure chaos.", category: "Who Said It?", source: "chat" },
  { type: "who-said-it", text: `Who said: "Last night we celebrated Ian's divorce but let's make a pact not to stay up past midnight on school nights again 😂. I am STRUGGLING LOL"?`, options: JSON.stringify(["Jackson","Gina Ortiz","Ian O'Malley","Benny Harris"]), answer_index: 3, explanation: "Benny Harris said this. Divorce party followed by a hilarious self-awareness about adulting struggles. A mood!", category: "Who Said It?", source: "chat" },
  { type: "chaos", text: "Who has sent the most late-night messages (11pm-5am) with 166 chaos messages?", options: JSON.stringify(["Benny Harris","Jackson","Lauren","Gina Ortiz"]), answer_index: 0, explanation: "Benny Harris is the undisputed chaos champion with 166 late-night messages!", category: "Chaos Hours", source: "chat" },
  { type: "chaos", text: "What percentage of all messages were sent during chaos hours (11pm-5am)?", options: JSON.stringify(["17%","27%","12%","12%"]), answer_index: 1, explanation: "27% of messages happened in the chaos hours. The night owls are real!", category: "Chaos Hours", source: "chat" },
  { type: "chaos", text: "What is the single most active hour for late-night messaging?", options: JSON.stringify(["11PM","3AM","4AM","1AM"]), answer_index: 0, explanation: "11PM is peak chaos time in this group chat!", category: "Chaos Hours", source: "chat" },
  { type: "roast", text: "Who has the highest average roast/savage score with 5.0/10?", options: JSON.stringify(["Lauren","Ian O'Malley","Gina Ortiz","Jackson"]), answer_index: 3, explanation: "Jackson brings the heat with an average roast level of 5.0/10!", category: "Roast Mode", source: "chat" },
  { type: "roast", text: "Which message received the highest roast score (6/10)?", options: JSON.stringify(["None of these - they're all too nice","Why did I take mushrooms here?","Benny not you lauren ","Brb lighting myself on fire"]), answer_index: 3, explanation: `Benny Harris said this savage message: "Brb lighting myself on fire". Reason: Dramatic statement suggesting self-harm for comedic effect, decent burn.`, category: "Roast Mode", source: "chat" }
];

const insert = db.prepare(`
  INSERT INTO questions (type, text, options, answer_index, explanation, category, source)
  VALUES (@type, @text, @options, @answer_index, @explanation, @category, @source)
`);

const insertMany = db.transaction((questions) => {
  for (const question of questions) {
    insert.run(question);
  }
});

insertMany(questions);

const newCount = db.prepare("SELECT COUNT(*) as count FROM questions").get();
console.log(`✅ Seeded ${newCount.count} questions successfully!`);

db.close();
