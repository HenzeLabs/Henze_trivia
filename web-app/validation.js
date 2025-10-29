const { z } = require("zod");

const joinSchema = z.object({
  playerName: z.string().min(1).max(20),
});

const startSchema = z.object({
  token: z.string().min(1),
  // No hostPin needed for local party games!
});

const answerSchema = z.object({
  playerId: z.string(),
  answer: z.number().int().min(0).max(3),
  token: z.string(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  // No hostPin needed for local party games!
});

const finalSchema = z.object({
  token: z.string().min(1),
  // No hostPin needed for local party games!
});

const restoreSchema = z.object({
  playerId: z.string(),
  token: z.string(),
});

module.exports = {
  joinSchema,
  startSchema,
  answerSchema,
  resetSchema,
  finalSchema,
  restoreSchema,
};
