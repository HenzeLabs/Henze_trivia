// Savage, smart-ass, and group-specific feedback utilities
// JavaScript version for Jest testing compatibility

const savageCorrect = [
  "You got it right, but don't get cocky, slut.",
  "Correct! Even a broken clock is right twice a day, you absolute disaster.",
  "Congrats, you feral gremlin. Go brag to your situationship.",
  "You must cheat, because that was too good for you. Go off, queen!",
  "Correct! Did you finally sober up, or was that a fluke?",
  "You nailed it, but let's be real, you probably just guessed.",
];

const savageWrong = [
  "WRONG! Are you even awake, or just hungover again?",
  "Nope! Did you even read the question, disaster?",
  "Incorrect! Your brain must be on vacation with your ex.",
  "Oof, not even close. Embarrassing! Go text your therapist.",
  "Wrong! You must've been distracted by Grindr notifications.",
  "Incorrect! Are you still thinking about that hookup from last night?",
];

const savageWaiting = [
  "Waiting for the slowpokes... as usual. Someone's probably sexting.",
  "Hurry up, drama queens! This isn't rocket science, just gay science.",
  "Tick tock, chaos crew. Some of you need Google and a life coach.",
  "Still waiting... classic. Maybe try reading next time, or put down the wine.",
  "Waiting for answers like waiting for a text back from your ex.",
  "Hurry it up! Can someone answer before the next group hookup?",
];

// Utility to pick a random roast
function getSavage(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  savageCorrect,
  savageWrong,
  savageWaiting,
  getSavage,
};
