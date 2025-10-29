import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function GET() {
  // Path to the question generator script
  const scriptPath = path.resolve(
    process.cwd(),
    "../../utils/question_generator.py"
  );

  return new Promise((resolve) => {
    const py = spawn("python3", [scriptPath]);
    let data = "";
    py.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });
    py.stderr.on("data", (err) => {
      console.error("Python error:", err.toString());
    });
    py.on("close", () => {
      try {
        // Parse output as JSON
        const question = JSON.parse(data);
        resolve(NextResponse.json(question));
      } catch (e) {
        resolve(
          NextResponse.json({
            error: "Failed to generate question",
            details: e.toString(),
          })
        );
      }
    });
  });
}
