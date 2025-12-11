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
  // Remove code fences
  let cleaned = text.replace(/```json|```/g, "").trim();

  // Find the first { ... } block
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    console.error("RAW MODEL OUTPUT:\n", text);
    throw new Error("Model did not output JSON.");
  }

  cleaned = cleaned.substring(start, end + 1);

  // --- Attempt direct parse ---
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    console.warn("First parse failed, attempting brace-repair…");
  }

  // --- Brace repair ---
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;

  let fixed = cleaned;
  while (closeBraces < openBraces) fixed += "}";
  while (openBraces < closeBraces) fixed = "{" + fixed;

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
  learningStyle:
    | "visual"
    | "verbal"
    | "step-by-step"
    | "short-summaries" = "verbal",
  numQuestions = 5,
  weakSkills: string[] = []
): Promise<QuizResponse> {
  const prompt = `
Generate ${numQuestions} history quiz questions based on this content:

${lessonContent}
Weak skills to focus on: ${weakSkills.join(", ") || "None"}
Your questions must reinforce these skills whenever possible.
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
      ? `The student is particularly weak in the following subskills or subtopics related to the theme: ${weakSkills.join(
          ", "
        )}.
Design a REMEDIAL lesson:
- Re-explain these weak skills in simpler language.
- Use more concrete examples, analogies, and step-by-step reasoning for them.
- Explicitly connect these weak skills back to the main topic.
- Spend proportionally more space on these weak skills than on already mastered areas.`
      : `You do NOT know the student's current mastery. 
Design a CLEAR, INTRODUCTORY lesson:
- Explain the topic from the ground up.
- Use a logically structured flow and highlight core concepts.
- Avoid assuming prior detailed knowledge.`;

  const prompt = `
You MUST output a STRICT JSON object with EXACTLY these keys:

{
  "title": string,
  "content": string
}

Rules:
- NO explanation
- NO markdown
- NO prose outside the JSON
- Title must be 5–12 words
- Content must be ~3–6 paragraphs
- Topic: "${topic}"
- Difficulty: "${difficulty}"
- Learning style: "${learningStyle}"
- If weak skills are provided, this is a personalised remedial lesson.
- If no weak skills are provided, this is an initial, general lesson.

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
  console.log("RAW LESSON MODEL OUTPUT:\n\n", raw);
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