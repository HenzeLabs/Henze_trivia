import { NextResponse } from "next/server";

let answers: Record<string, string[]> = {};
let currentQuestionId: string = "";
let correctAnswer: string = "";

export async function POST(request: Request) {
  const { questionId, playerId, answer } = await request.json();
  if (!answers[questionId]) answers[questionId] = [];
  answers[questionId].push(JSON.stringify({ playerId, answer }));
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("questionId");
  if (!questionId || !answers[questionId]) {
    return NextResponse.json({ error: "No answers yet." });
  }
  return NextResponse.json({
    answers: answers[questionId],
    correct: correctAnswer,
  });
}
