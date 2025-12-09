// ai.ts - Clean, type-safe, null-safe AI module
import OpenAI from "openai";

/* ---------------------------------------------
   PROVIDER CONFIG
------------------------------------------------ */
const useOllama = process.env.USE_OLLAMA !== "false";
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const ollamaModel = process.env.OLLAMA_MODEL || "gemma3:4b";

const groqApiKey = process.env.GROQ_API_KEY || "";
const openaiApiKey = process.env.OPENAI_API_KEY || "";

type AIProvider = "ollama" | "groq" | "openai";

let provider: AIProvider = "ollama";
let aiClient: OpenAI;

/* ---------------------------------------------
   SAFE CLIENT INITIALIZATION (never null)
------------------------------------------------ */
if (useOllama) {
  provider = "ollama";
  aiClient = new OpenAI({
    baseURL: `${ollamaBaseUrl}/v1`,
    apiKey: "ollama",
  });
  console.log(`Using Ollama with model: ${ollamaModel}`);
} else if (groqApiKey) {
  provider = "groq";
  aiClient = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqApiKey,
  });
  console.log("Using Groq API");
} else if (openaiApiKey) {
  provider = "openai";
  aiClient = new OpenAI({ apiKey: openaiApiKey });
  console.log("Using OpenAI API");
} else {
  // Final fallback → still Ollama, guaranteed non-null client
  provider = "ollama";
  aiClient = new OpenAI({
    baseURL: `${ollamaBaseUrl}/v1`,
    apiKey: "ollama",
  });
  console.warn(
    "No AI provider configured. Defaulting to Ollama. Make sure it's running!"
  );
}

/* ---------------------------------------------
   TYPES
------------------------------------------------ */
export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  skill_key?: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
}

export interface LessonResponse {
  title: string;
  content: string;
}

/* ---------------------------------------------
   JSON CLEANER (shared)
------------------------------------------------ */
function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("MODEL OUTPUT:", text);
    throw new Error("AI did not return JSON.");
  }

  try {
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("INVALID JSON:", match[0]);
    throw new Error("Returned JSON is malformed.");
  }
}

/* ---------------------------------------------
   QUIZ GENERATOR
------------------------------------------------ */
export async function generateQuiz(
  lessonContent: string,
  difficulty: "easy" | "normal" | "hard" = "normal",
  learningStyle:
    | "visual"
    | "verbal"
    | "step-by-step"
    | "short-summaries" = "verbal",
  numQuestions = 5
): Promise<QuizResponse> {
  const prompt = `
Generate ${numQuestions} history quiz questions based on this content:

${lessonContent}

Instructions:
- Difficulty: ${difficulty}
- Learning style: ${learningStyle}
- Every question must have "question", "options", "answer", and "skill_key".
- Return ONLY JSON:
{
  "questions": [
    { "question": "...", "options": ["A","B","C","D"], "answer": 0, "skill_key": "..." }
  ]
}
`;

  const completion = await aiClient.chat.completions.create({
    model: provider === "ollama" ? ollamaModel : provider === "groq"
      ? "llama-3.1-70b-versatile"
      : "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You generate history quizzes. Always respond with pure JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const text = completion.choices?.[0]?.message?.content || "";
  const parsed = extractJson(text);

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("AI returned invalid quiz structure.");
  }

  return parsed as QuizResponse;
}

/* ---------------------------------------------
   LESSON GENERATOR
------------------------------------------------ */
export async function generateLesson(
  topic: string,
  difficulty = "normal",
  learningStyle = "verbal"
): Promise<LessonResponse> {
  const prompt = `
Generate a personalized history lesson.

Topic: ${topic}
Difficulty: ${difficulty}
Learning style: ${learningStyle}

Return ONLY JSON:
{
  "title": "...",
  "content": "..."
}
`;

  const completion = await aiClient.chat.completions.create({
    model: provider === "ollama" ? ollamaModel : "gpt-4o-mini",
    messages: [
      { role: "system", content: "You output lessons in JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  return extractJson(
    completion.choices?.[0]?.message?.content || ""
  ) as LessonResponse;
}

/* ---------------------------------------------
   EXPLANATION GENERATOR
------------------------------------------------ */
export async function generateExplanation(
  lessonContent: string,
  weakSkills: string[],
  learningStyle: string = "verbal",
  difficulty: string = "normal"
): Promise<string> {
  const prompt = `
The student is struggling with: ${weakSkills.join(", ")}.

Rewrite the explanation based on:
- Learning style: ${learningStyle}
- Difficulty: ${difficulty}

Return ONLY plain text, not JSON.
`;

  const completion = await aiClient.chat.completions.create({
    model: provider === "ollama" ? ollamaModel : "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You generate explanations with clear reasoning.",
      },
      { role: "user", content: prompt + "\n\n" + lessonContent },
    ],
    temperature: 0.8,
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}