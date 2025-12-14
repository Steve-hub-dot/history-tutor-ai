// lib/skills.ts
export type SkillDef = { id: string; description: string };

export const SKILL_CATALOG: SkillDef[] = [
  { id: "historical_knowledge", description: "Recall of key facts, dates, people, events" },
  { id: "historical_analysis", description: "Cause-effect, comparison, interpretation" },
  { id: "historical_understanding", description: "Conceptual understanding of the topic" },
  { id: "critical_thinking", description: "Reasoning, evaluation, inference" },
  { id: "source_evaluation", description: "Primary/secondary source reasoning" },
  { id: "chronology", description: "Sequencing and timelines" },
  { id: "general", description: "Fallback skill key" },
];

export const SKILL_IDS = new Set(SKILL_CATALOG.map((s) => s.id));
