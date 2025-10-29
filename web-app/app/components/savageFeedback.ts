// Savage, smart-ass, and group-specific feedback utilities

export const savageCorrect = [
  "You got it right, but don't get cocky, slut.",
  "Correct! Even a broken clock is right twice a day, you absolute disaster.",
  "Congrats, you feral gremlin. Go brag to your situationship.",
  "You must cheat, because that was too good for you. Go off, queen!",
  "Correct! Did you finally sober up, or was that a fluke?",
  "You nailed it, but let's be real, you probably just guessed.",
  "Wow, you actually used your brain for once. Miracles happen.",
  "Correct! Your therapist will be so proud. Or shocked.",
  "You did it! Now go flex in the group chat, you menace.",
  "Right answer, but your life is still a mess.",
];

export const savageWrong = [
  "WRONG! Are you even awake, or just hungover again?",
  "Nope! Did you even read the question, disaster?",
  "Incorrect! Your brain must be on vacation with your ex.",
  "Oof, not even close. Embarrassing! Go text your therapist.",
  "Wrong! You must've been distracted by Grindr notifications.",
  "Incorrect! Are you still thinking about that hookup from last night?",
  "Wrong! Your parents would be so disappointed. Again.",
  "Nope! Maybe try reading next time, genius.",
  "Incorrect! You make bad choices and this is just another one.",
  "Wrong answer, but at least you're consistent.",
];

export const savageWaiting = [
  "Waiting for the slowpokes... as usual. Someone's probably sexting.",
  "Hurry up, drama queens! This isn't rocket science, just gay science.",
  "Tick tock, chaos crew. Some of you need Google and a life coach.",
  "Still waiting... classic. Maybe try reading next time, or put down the wine.",
  "Waiting for answers like waiting for a text back from your ex.",
  "Hurry it up! Can someone answer before the next group hookup?",
  "Still waiting... did someone pass out or just ghost the game?",
  "Come on, it's not that hard. Even you can do it.",
  "Waiting for answers like waiting for a Venmo request to be paid.",
  "If you were any slower, you'd be a group chat reply at 3am.",
];

// Utility to pick a random roast
export function getSavage(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
