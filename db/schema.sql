-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  learning_style TEXT CHECK (learning_style IN ('visual', 'verbal', 'step-by-step', 'short-summaries')) DEFAULT 'verbal',
  difficulty_preference TEXT CHECK (difficulty_preference IN ('easy', 'normal', 'hard')) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'normal', 'hard')) DEFAULT 'normal',
  topic TEXT, -- e.g., "World War I", "Cold War"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skills table (for BKT tracking)
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_key TEXT UNIQUE NOT NULL, -- e.g., "ww1_causes", "versailles_consequences"
  skill_name TEXT NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interactions table (tracks user engagement)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  duration INTEGER DEFAULT 0, -- seconds spent on page
  scroll_depth REAL DEFAULT 0, -- 0.0 to 1.0
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  questions JSONB NOT NULL, -- array of question objects
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- { question_id: answer_index }
  score REAL, -- 0.0 to 1.0
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BKT states table (tracks knowledge tracing for each user-skill pair)
CREATE TABLE IF NOT EXISTS bkt_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  p_known REAL DEFAULT 0.0, -- probability of knowing (0.0 to 1.0)
  p_learn REAL DEFAULT 0.3, -- probability of learning (BKT parameter)
  p_guess REAL DEFAULT 0.2, -- probability of guessing correctly (BKT parameter)
  p_slip REAL DEFAULT 0.1, -- probability of slipping (BKT parameter)
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, skill_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_user_lesson ON interactions(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_bkt_states_user_skill ON bkt_states(user_id, skill_key);
CREATE INDEX IF NOT EXISTS idx_skills_lesson ON skills(lesson_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

