// lib/ai.ts
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

if (useOllama) {
  provider = "ollama";
  aiClient = new OpenAI({ baseURL: `${ollamaBaseUrl}/v1`, apiKey: "ollama" });
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
  provider = "ollama";
  aiClient = new OpenAI({ baseURL: `${ollamaBaseUrl}/v1`, apiKey: "ollama" });
  console.warn("No AI provider configured. Defaulting to Ollama.");
}

/* ---------------------------------------------
   SKILL TAXONOMY (MUST MATCH DB.skills.id)
------------------------------------------------ */
export const ALLOWED_SKILL_KEYS = [
  "historical_knowledge",
  "historical_analysis",
  "historical_understanding",
  "critical_thinking",
  "source_evaluation",
  "chronology",
  "general",
] as const;

export type SkillKey = (typeof ALLOWED_SKILL_KEYS)[number];

/* ---------------------------------------------
   TYPES
------------------------------------------------ */
export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  skill_key?: SkillKey | string; // model may return junk; server will sanitize
}

export interface QuizResponse {
  questions: QuizQuestion[];
}

export interface LessonResponse {
  title: string;
  content: string;
}

/* ---------------------------------------------
   JSON CLEANER
------------------------------------------------ */
function extractJson(text: string): any {
  let cleaned = text.replace(/```json|```/g, "").trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    console.error("RAW MODEL OUTPUT:\n", text);
    throw new Error("Model did not output JSON.");
  }

  cleaned = cleaned.substring(start, end + 1);

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    console.warn("First parse failed, attempting brace-repair…");
  }

  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;

  let fixed = cleaned;
  while ((fixed.match(/\}/g) || []).length < (fixed.match(/\{/g) || []).length) fixed += "}";

  try {
    return JSON.parse(fixed);
  } catch (err) {
    console.error("Final JSON parsing failure.\nOUTPUT:\n", cleaned);
    throw new Error("Returned JSON is malformed even after repair.");
  }
}

/* ---------------------------------------------
   QUIZ GENERATOR
------------------------------------------------ */
export async function generateQuiz(
  lessonContent: string,
  difficulty: "easy" | "normal" | "hard" = "normal",
  learningStyle: "visual" | "verbal" | "step-by-step" | "short-summaries" = "verbal",
  numQuestions = 5,
  weakSkills: string[] = []
): Promise<QuizResponse> {
  const allowed = ALLOWED_SKILL_KEYS.join(", ");

  const prompt = `
Return ONLY a valid JSON object with this exact structure:

{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "answer": number,
      "skill_key": "string"
    }
  ]
}

Rules (VERY IMPORTANT):
- No markdown. No extra text.
- Exactly ${numQuestions} questions.
- "answer" must be 0..3.
- "skill_key" MUST be exactly ONE of: ${allowed}
- If unsure, set "skill_key" to "general".
- Difficulty: ${difficulty}
- Learning style: ${learningStyle}
- Weak skills to emphasize (if relevant): ${weakSkills.join(", ") || "None"}

Lesson content:
${lessonContent}
`;

  const model =
    provider === "ollama"
      ? ollamaModel
      : provider === "groq"
      ? "llama-3.1-70b-versatile"
      : "gpt-4o-mini";

  const completion = await aiClient.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You output JSON ONLY. No explanations." },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
  });

  const text = completion.choices?.[0]?.message?.content || "";
  const parsed = extractJson(text);

  if (!parsed?.questions || !Array.isArray(parsed.questions)) {
    console.error("BAD MODEL OUTPUT:", text);
    throw new Error("AI returned invalid quiz JSON.");
  }

  return parsed as QuizResponse;
}

/* ---------------------------------------------
   LESSON GENERATOR (BKT-AWARE)
------------------------------------------------ */
export async function generateLesson(
  topic: string,
  difficulty: string = "normal",
  learningStyle: string = "verbal",
  weakSkills: string[] = []
): Promise<LessonResponse> {
  const model =
    provider === "ollama"
      ? ollamaModel
      : provider === "groq"
      ? "llama-3.1-70b-versatile"
      : "gpt-4o-mini";

  const learnerModelDescription =
    weakSkills.length > 0
      ? `Weak areas: ${weakSkills.join(", ")}.
Design a remedial lesson that re-explains those parts clearly and step-by-step.`
      : `No mastery data available. Produce a clean introductory lesson.`;

  const prompt = `
You MUST output a STRICT JSON object with EXACTLY these keys:

{
  "title": string,
  "content": string
}

Rules:
- NO markdown
- NO extra text outside JSON
- Title: 5–12 words
- Content: ~3–6 paragraphs
- Topic: "${topic}"
- Difficulty: "${difficulty}"
- Learning style: "${learningStyle}"

Learner model:
${learnerModelDescription}

Now generate ONLY the JSON object.
`;

  const completion = await aiClient.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Return STRICT JSON ONLY. Never add comments." },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    ...(provider !== "ollama" && { response_format: { type: "json_object" } }),
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  return extractJson(raw) as LessonResponse;
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
The student is struggling with: ${weakSkills.join(", ") || "Unknown"}.

Rewrite the explanation focusing more on those weak parts:
- Learning style: ${learningStyle}
- Difficulty: ${difficulty}

Return ONLY plain text.
`;

  const completion = await aiClient.chat.completions.create({
    model: provider === "ollama" ? ollamaModel : "gpt-4o-mini",
    messages: [
      { role: "system", content: "You generate explanations with clear reasoning." },
      { role: "user", content: prompt + "\n\n" + lessonContent },
    ],
    temperature: 0.8,
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}
