function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

async function createPlan(task) {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
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

export default async function handler(request, response) {
  // 1. Handle CORS (just in case)
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // 2. Ensure body is parsed (Vercel usually does this, but let's be safe)
    let task = request.body;
    if (typeof task === "string") {
      try {
        task = JSON.parse(task);
      } catch (e) {
        throw new Error("Failed to parse request body as JSON.");
      }
    }

    if (!task || !task.taskName) {
      throw new Error("Missing task details in request body.");
    }

    // 3. Generate plan
    console.log("Generating plan for:", task.taskName);
    const plan = await createPlan(task);
    
    // 4. Send response
    response.status(200).json(plan);
  } catch (error) {
    console.error("Vercel API Error:", error.message);
    response.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}
