// Dynamic, personalized savage feedback generator
// This replaces static arrays with logic for unique, context-aware roasts

export type FeedbackType =
  | "correct"
  | "wrong"
  | "waiting"
  | "spectate"
  | "winner";

interface FeedbackContext {
  playerName: string;
  answerHistory?: Array<{ correct: boolean; question: string }>; // last 5 answers
  streak?: number;
  groupNames?: string[];
  currentQuestion?: string;
  isWinner?: boolean;
  isSpectating?: boolean;
}

const baseRoasts = {
  correct: [
    "{name}, you got it right, but don't get cocky.",
    "Correct! Even a broken clock is right twice a day, {name}.",
    "Congrats, {name}. Go brag to your situationship.",
    "You must've cheated, {name}. That was too good for you.",
    "Did you finally sober up, {name}, or was that a fluke?",
    "You nailed it, {name}, but let's be real, you probably just guessed.",
    "Wow, {name}, you actually used your brain for once. Miracles happen.",
    "Your therapist will be so proud, {name}. Or shocked.",
    "Go flex in the group chat, {name}, you menace.",
    "Right answer, but your life is still a mess, {name}.",
  ],
  wrong: [
    "WRONG! {name}, are you even awake, or just hungover again?",
    "Nope! Did you even read the question, {name}? Disaster.",
    "Incorrect! Your brain must be on vacation with your ex, {name}.",
    "Oof, not even close, {name}. Embarrassing! Go text your therapist.",
    "Wrong! You must've been distracted by Grindr notifications, {name}.",
    "Are you still thinking about that hookup from last night, {name}?",
    "Your parents would be so disappointed. Again, {name}.",
    "Maybe try reading next time, genius {name}.",
    "You make bad choices and this is just another one, {name}.",
    "Wrong answer, but at least you're consistent, {name}.",
  ],
  waiting: [
    "Waiting for the slowpokes... as usual. Someone's probably sexting.",
    "Hurry up, drama queens! This isn't rocket science, just gay science.",
    "Tick tock, chaos crew. Some of you need Google and a life coach.",
    "Still waiting... classic. Maybe try reading next time, or put down the wine.",
    "Waiting for answers like waiting for a text back from your ex.",
    "Hurry it up! Can someone answer before the next group hookup?",
    "Did someone pass out or just ghost the game?",
    "Come on, it's not that hard. Even you can do it, {name}.",
    "Waiting for answers like waiting for a Venmo request to be paid.",
    "If you were any slower, you'd be a group chat reply at 3am, {name}.",
  ],
  spectate: [
    "{name}, you’re out. Enjoy spectating and reflecting on your life choices.",
    "Spectating, {name}? Maybe next time try answering correctly.",
    "You’re just here for the roast now, {name}.",
  ],
  winner: [
    "{name} wins, but let's be honest, it was mostly luck.",
    "Congrats {name}, you survived. The group chat will never let you forget this.",
    "{name} escaped, but their reputation is still in shambles.",
  ],
};

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getPersonalizedSavage(
  type: FeedbackType,
  ctx: FeedbackContext
): string {
  let roast = pick(baseRoasts[type]);
  // Add streak-based roasts
  if (type === "correct" && ctx.streak && ctx.streak >= 3) {
    roast = `{name}, that's ${ctx.streak} in a row. Are you cheating or just finally sober?`;
  }
  if (type === "wrong" && ctx.streak && ctx.streak <= -3) {
    roast = `{name}, that's ${Math.abs(
      ctx.streak
    )} wrong in a row. Your brain is on vacation.`;
  }
  // Add group-specific context
  if (ctx.groupNames && ctx.groupNames.length > 1) {
    roast += ` The whole group (${ctx.groupNames.join(
      ", "
    )}) is watching you flop.`;
  }
  // Add question context
  if (ctx.currentQuestion) {
    roast += ` (Question: ${ctx.currentQuestion})`;
  }
  // Winner special
  if (type === "winner" && ctx.isWinner) {
    roast += ` Bow down to {name}, the roast champion.`;
  }
  // Spectate special
  if (type === "spectate" && ctx.isSpectating) {
    roast += ` Maybe next time, {name}.`;
  }
  return roast.replace(/{name}/g, ctx.playerName);
}
