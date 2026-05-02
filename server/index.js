import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.API_PORT || 8787);

function loadEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

async function createPlan(task) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or VITE_GEMINI_API_KEY in .env");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are FocusFlow's planning assistant. Return only valid JSON for a focus plan. Keep the user's selected difficulty unchanged.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Create a focus plan for this task:
Task name: ${task.taskName}
Description: ${task.taskDescription || "No description"}
User-selected difficulty: ${task.taskDifficulty}
Deadline date: ${task.taskDeadline}
Deadline time: ${task.taskDeadlineTime}

Return JSON with exactly these keys:
{
  "difficulty": "${task.taskDifficulty}",
  "focusMinutes": number between 15 and 60,
  "sessions": number between 1 and 6,
  "breakMinutes": number between 5 and 20,
  "reason": "one concise sentence"
}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              difficulty: { type: "STRING", enum: ["Easy", "Medium", "Hard"] },
              focusMinutes: { type: "NUMBER" },
              sessions: { type: "NUMBER" },
              breakMinutes: { type: "NUMBER" },
              reason: { type: "STRING" },
            },
            required: [
              "difficulty",
              "focusMinutes",
              "sessions",
              "breakMinutes",
              "reason",
            ],
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const planText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!planText) {
    throw new Error("Invalid response from Gemini");
  }

  const plan = JSON.parse(planText);

  return {
    difficulty: task.taskDifficulty,
    focusMinutes: clampNumber(plan.focusMinutes, 15, 60, 25),
    sessions: clampNumber(plan.sessions, 1, 6, 2),
    breakMinutes: clampNumber(plan.breakMinutes, 5, 20, 10),
    reason: String(plan.reason || "Plan generated from your task details."),
  };
}

loadEnv();

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.url !== "/api/suggest-plan" || request.method !== "POST") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const body = await readBody(request);
    const task = JSON.parse(body);
    const plan = await createPlan(task);
    sendJson(response, 200, plan);
  } catch (error) {
    sendJson(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the plan.",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`FocusFlow API running at http://127.0.0.1:${PORT}`);
});
