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


/* ---------- QUIZ GENERATOR (BKT-AWARE) ---------- */
export async function generateQuiz(
  lessonContent: string,
  difficulty: "easy" | "normal" | "hard" = "normal",
  learningStyle:
    | "visual"
    | "verbal"
    | "step-by-step"
    | "short-summaries" = "verbal",
  numQuestions = 7,              // <- default 7
  weakSkills: string[] = []      // <- BKT focus
): Promise<QuizResponse> {
  const prompt = `
    Generate ${numQuestions} multiple-choice questions based on the lesson below.
    
    ${lessonContent}
    
    Focus extra questions on weak skills: ${weakSkills.join(", ") || "None"}.
    
    STRICT RULES:
    - Output ONLY valid JSON.
    - Options must be an array of FOUR plain strings WITHOUT prefixes like "A)", "B)".
      Example: ["Germany invaded...", "Austria...", "France...", "Serbia..."]
    - The structure MUST be:
    
    {
      "questions": [
        {
          "question": "string",
          "options": ["opt1","opt2","opt3","opt4"],
          "answer": 0,
          "skill_key": "string"
        }
      ]
    }
    
    No comments, no markdown, no explanation — ONLY the JSON object.
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
      {
        role: "system",
        content:
          "You generate high-quality history multiple-choice quizzes. Always respond with pure JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    ...(provider !== "ollama" && { response_format: { type: "json_object" } }),
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
// lib/ai.ts (only generateLesson changed)

export async function generateLesson(
  topic: string,
  difficulty = "normal",
  learningStyle = "verbal"
): Promise<LessonResponse> {

  const visualExtra =
    learningStyle === "visual"
      ? `
Additionally, because the student is a VISUAL learner:

- At the END of "content", append 1–2 short Mermaid diagrams.
- Each diagram MUST be a fenced code block with this exact format:

\`\`\`mermaid
flowchart TD
  A[Start] --> B[Some step]
\`\`\`

- Use simple flowcharts or timelines that summarize the most important causes / events / relationships in the topic.
- The diagrams must be valid Mermaid syntax.
`
      : "";

  const prompt = `
You MUST output a STRICT JSON object with EXACTLY these keys:

{
  "title": string,
  "content": string
}

Rules:
- NO explanation
- NO markdown outside the JSON
- NO prose outside the JSON itself
- "title" must be 5–12 words
- "content" must be ~3–6 paragraphs of text.
- Topic: "${topic}"
- Difficulty: "${difficulty}"
- Learning style: "${learningStyle}"
${visualExtra}

"content" MAY contain markdown (headings, lists, etc.). 
If you add diagrams for visual learners, put them at the END of the content as Mermaid code fences as described above.

Now generate ONLY the JSON object.
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
      { role: "system", content: "Return STRICT JSON ONLY. Never add comments." },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    ...(provider !== "ollama" && { response_format: { type: "json_object" } }),
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  console.log("RAW MODEL OUTPUT:\n\n", raw);
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