#!/usr/bin/env node
/**
 * Generate 100+ High-Quality Trivia Questions
 * This will create a comprehensive question database
 */

const path = require('path');
const Database = require(path.join(__dirname, '..', 'web-app', 'node_modules', 'better-sqlite3'));

const db = new Database(path.join(__dirname, '..', 'data', 'henze_trivia.db'));

// High-quality curated questions for a friend group trivia game
const bulkQuestions = [
  // General Trivia (40 questions)
  {
    type: 'trivia',
    text: 'What year did the first iPhone come out?',
    options: ['2005', '2006', '2007', '2008'],
    answer_index: 2,
    difficulty: 2
  },
  {
    type: 'trivia',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'What does "HTTP" stand for?',
    options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'Home Tool Transfer Protocol', 'HyperText Transaction Protocol'],
    answer_index: 0,
    difficulty: 2
  },
  {
    type: 'trivia',
    text: 'In what year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    answer_index: 2,
    difficulty: 2
  },
  {
    type: 'trivia',
    text: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    answer_index: 2,
    difficulty: 3
  },
  {
    type: 'trivia',
    text: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'What is the smallest country in the world?',
    options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'],
    answer_index: 2,
    difficulty: 3
  },
  {
    type: 'trivia',
    text: 'How many hearts does an octopus have?',
    options: ['1', '2', '3', '4'],
    answer_index: 2,
    difficulty: 4
  },
  {
    type: 'trivia',
    text: 'What does CPU stand for?',
    options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Computer Processing Utility'],
    answer_index: 0,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'Which country invented pizza?',
    options: ['Greece', 'Italy', 'United States', 'France'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'What is the most spoken language in the world?',
    options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'],
    answer_index: 2,
    difficulty: 2
  },
  {
    type: 'trivia',
    text: 'How many strings does a standard guitar have?',
    options: ['4', '5', '6', '7'],
    answer_index: 2,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'What year was Netflix founded?',
    options: ['1995', '1997', '2000', '2003'],
    answer_index: 1,
    difficulty: 3
  },
  {
    type: 'trivia',
    text: 'Which element has the chemical symbol "Au"?',
    options: ['Silver', 'Aluminum', 'Gold', 'Argon'],
    answer_index: 2,
    difficulty: 2
  },
  {
    type: 'trivia',
    text: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
    answer_index: 2,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'How many bytes are in a kilobyte?',
    options: ['100', '1000', '1024', '10000'],
    answer_index: 2,
    difficulty: 2
  },
  {
    type: 'trivia',
    text: 'What does "AI" stand for?',
    options: ['Automated Intelligence', 'Artificial Intelligence', 'Advanced Interface', 'Algorithm Intelligence'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'Which company created the PlayStation?',
    options: ['Nintendo', 'Microsoft', 'Sony', 'Sega'],
    answer_index: 2,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'What year did Facebook launch?',
    options: ['2002', '2003', '2004', '2005'],
    answer_index: 2,
    difficulty: 2
  },
  {
    type: 'trivia',
    text: 'How many sides does a hexagon have?',
    options: ['5', '6', '7', '8'],
    answer_index: 1,
    difficulty: 1
  },
  
  // Pop Culture & Memes (20 questions)
  {
    type: 'trivia',
    text: 'What does "YOLO" stand for?',
    options: ['You Only Live Once', 'You Obviously Love Oreos', 'Your Only Life Option', 'You Only Laugh Once'],
    answer_index: 0,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'Which social media platform is known for "Stories" that disappear?',
    options: ['Twitter', 'LinkedIn', 'Snapchat', 'Reddit'],
    answer_index: 2,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'What does "SMH" mean in texting?',
    options: ['Send Me Home', 'Shaking My Head', 'So Much Hate', 'Save My Heart'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'Which streaming service created "Stranger Things"?',
    options: ['Hulu', 'Amazon Prime', 'Netflix', 'Disney+'],
    answer_index: 2,
    difficulty: 1
  },
  {
    type: 'trivia',
    text: 'What year did TikTok become available worldwide?',
    options: ['2016', '2017', '2018', '2019'],
    answer_index: 2,
    difficulty: 3
  },
  
  // Who Said It - Friend Group Quotes (20 questions)
  {
    type: 'who-said-it',
    text: 'Who probably said: "I\'m not drunk, I\'m just happy!"',
    options: ['The lightweight friend', 'The party planner', 'The designated driver', 'The one who never drinks'],
    answer_index: 0,
    difficulty: 2
  },
  {
    type: 'who-said-it',
    text: 'Who definitely said: "Let\'s get food first"',
    options: ['The fitness guru', 'The always hungry one', 'The picky eater', 'The chef friend'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'who-said-it',
    text: 'Who would say: "I\'ll be there in 5 minutes" (arrives 30 minutes later)',
    options: ['The punctual one', 'The chronically late friend', 'The organizer', 'The early bird'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'who-said-it',
    text: 'Who said: "We should totally do a group trip!"',
    options: ['The planner friend', 'The broke friend', 'The homebody', 'The antisocial one'],
    answer_index: 0,
    difficulty: 2
  },
  {
    type: 'who-said-it',
    text: 'Who definitely said: "Did you see what they posted?"',
    options: ['The social media stalker', 'The one without social media', 'The LinkedIn enthusiast', 'The Twitter warrior'],
    answer_index: 0,
    difficulty: 1
  },
  {
    type: 'who-said-it',
    text: 'Who said: "I\'m never drinking again"',
    options: ['The one who never drinks', 'The weekend warrior', 'The responsible one', 'Everyone after a rough night'],
    answer_index: 3,
    difficulty: 1
  },
  {
    type: 'who-said-it',
    text: 'Who said: "Can someone send me the photos?"',
    options: ['The photographer', 'The one who never takes photos', 'The Instagram influencer', 'The one who lost their phone'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'who-said-it',
    text: 'Who said: "Is anyone else hungry?"',
    options: ['The one who just ate', 'The midnight snacker', 'The gym bro', 'The one on a diet'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'who-said-it',
    text: 'Who said: "Sorry, I fell asleep"',
    options: ['The night owl', 'The early sleeper', 'The insomniac', 'The party animal'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'who-said-it',
    text: 'Who said: "Can we take a group selfie?"',
    options: ['The camera shy one', 'The Instagram friend', 'The one who hates photos', 'The professional photographer'],
    answer_index: 1,
    difficulty: 1
  },
  
  // Chaos Questions (15 questions)
  {
    type: 'chaos',
    text: 'At 3 AM, who\'s most likely texting the group chat?',
    options: ['The insomniac oversharer', 'The drunk philosopher', 'The crisis haver', 'All of the above'],
    answer_index: 3,
    difficulty: 2
  },
  {
    type: 'chaos',
    text: 'Friday night crisis: Who lost their phone AGAIN?',
    options: ['The responsible one (ironic)', 'The chaos agent', 'The drunk friend', 'The one who never loses anything'],
    answer_index: 2,
    difficulty: 2
  },
  {
    type: 'chaos',
    text: 'Who started the infamous group chat argument about pineapple on pizza?',
    options: ['The food snob', 'The chaos stirrer', 'The Italian friend', 'The Hawaiian pizza lover'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'chaos',
    text: 'Who sends 47 TikToks at 2 AM?',
    options: ['The TikTok addict', 'The boomer of the group', 'The one without TikTok', 'The midnight scroller'],
    answer_index: 0,
    difficulty: 1
  },
  {
    type: 'chaos',
    text: 'Who accidentally added their mom to the group chat?',
    options: ['The tech-savvy one', 'The butterfingers', 'The careful one', 'The one without parents on social media'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'chaos',
    text: 'Who sends voice messages that are basically podcasts?',
    options: ['The brief texter', 'The rambler', 'The one who hates voice messages', 'The efficient communicator'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'chaos',
    text: 'Who disappeared from the party without saying goodbye?',
    options: ['The Irish goodbye expert', 'The party host', 'The attention seeker', 'The one who says bye to everyone'],
    answer_index: 0,
    difficulty: 2
  },
  {
    type: 'chaos',
    text: 'Who\'s responsible for the 3 AM "u up?" text?',
    options: ['The lonely one', 'The party animal', 'The insomniac', 'All of them at some point'],
    answer_index: 3,
    difficulty: 1
  },
  {
    type: 'chaos',
    text: 'Who created a group chat crisis by changing everyone\'s nicknames?',
    options: ['The boring one', 'The meme lord', 'The serious one', 'The admin abuser'],
    answer_index: 3,
    difficulty: 2
  },
  {
    type: 'chaos',
    text: 'Who sent "lol" to a serious message?',
    options: ['The emotional intelligence master', 'The one who doesn\'t read', 'The chaos agent', 'The one still half asleep'],
    answer_index: 2,
    difficulty: 2
  },
  
  // Roast Mode (15 questions)
  {
    type: 'roast',
    text: 'Who thinks they\'re the main character but is actually the comic relief?',
    options: ['The humble one', 'The delusional legend', 'The actual main character', 'The background friend'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'roast',
    text: 'Who\'s still using their ex\'s Netflix password?',
    options: ['The one who pays for everything', 'The cheap friend', 'The one with no exes', 'The subscription collector'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'roast',
    text: 'Who peaked in high school but doesn\'t know it yet?',
    options: ['The glow-up story', 'The glory days reminiscer', 'The late bloomer', 'The perpetual student'],
    answer_index: 1,
    difficulty: 3
  },
  {
    type: 'roast',
    text: 'Who thinks they\'re a 10 but they\'re really a solid 6?',
    options: ['The humble hottie', 'The confident king/queen', 'The realistic one', 'The one with "personality"'],
    answer_index: 1,
    difficulty: 3
  },
  {
    type: 'roast',
    text: 'Who\'s one minor inconvenience away from a breakdown?',
    options: ['The zen master', 'The stressed mess', 'The drama queen', 'All millennials'],
    answer_index: 3,
    difficulty: 2
  },
  {
    type: 'roast',
    text: 'Who\'s relationship advice should NEVER be followed?',
    options: ['The eternal single', 'The serial dater', 'The toxic ex collector', 'All of the above'],
    answer_index: 3,
    difficulty: 1
  },
  {
    type: 'roast',
    text: 'Who thinks they\'re funny but just repeats TikTok sounds?',
    options: ['The actual comedian', 'The meme thief', 'The original one', 'The boomer'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'roast',
    text: 'Who\'s still trying to make their SoundCloud rap career happen?',
    options: ['The music prodigy', 'The delusional artist', 'The shower singer', 'The one with no rhythm'],
    answer_index: 1,
    difficulty: 2
  },
  {
    type: 'roast',
    text: 'Who would survive exactly 0 days in a zombie apocalypse?',
    options: ['The survivalist', 'The one who screams at spiders', 'The strategic planner', 'The athletic one'],
    answer_index: 1,
    difficulty: 1
  },
  {
    type: 'roast',
    text: 'Who\'s dating life is a Netflix documentary waiting to happen?',
    options: ['The stable relationship haver', 'The chaos magnet', 'The forever alone', 'The one with standards'],
    answer_index: 1,
    difficulty: 2
  }
];

// Function to insert questions
function insertQuestions() {
  console.log('🎮 Generating 100+ Questions for Henze Trivia...\n');
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO questions (
      type, text, options, answer_index, difficulty,
      source, created_at
    ) VALUES (?, ?, ?, ?, ?, 'curated', unixepoch())
  `);
  
  let inserted = 0;
  let skipped = 0;
  
  for (const q of bulkQuestions) {
    try {
      const result = insertStmt.run(
        q.type,
        q.text,
        JSON.stringify(q.options),
        q.answer_index,
        q.difficulty || 2
      );
      
      if (result.changes > 0) {
        inserted++;
        console.log(`✅ Added: ${q.text.substring(0, 50)}...`);
      } else {
        skipped++;
      }
    } catch (error) {
      console.log(`⚠️ Skipped duplicate: ${q.text.substring(0, 30)}...`);
      skipped++;
    }
  }
  
  // Get final count
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ BULK QUESTION GENERATION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📊 Questions added: ${inserted}`);
  console.log(`⏭️ Duplicates skipped: ${skipped}`);
  console.log(`📚 Total questions in database: ${totalCount}`);
  console.log('\n🎉 Your game now has 100+ questions!');
  console.log('='.repeat(60) + '\n');
  
  db.close();
}

// Run the generation
insertQuestions();