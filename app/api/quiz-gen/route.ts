// app/api/quiz-gen/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateQuiz } from '@/lib/ai'
import { createServerClient } from '@/lib/supabase'

type Difficulty = 'easy' | 'normal' | 'hard'

interface SkillMastery {
  [skillId: string]: number; // p_known
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      lessonId,
      difficulty,     // optional override
      learningStyle,  // optional override
      numQuestions,   // optional, but we ignore and force 7
    } = body

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: 'userId and lessonId required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    /* ---------------------------------------------------------
       1) FETCH LESSON CONTENT
    --------------------------------------------------------- */
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('content, difficulty')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      console.error('Lesson fetch error:', lessonError)
      return NextResponse.json(
        { error: 'Lesson not found', details: lessonError?.message },
        { status: 404 }
      )
    }

    /* ---------------------------------------------------------
       2) FETCH BKT MASTERY → WEAK SKILLS
    --------------------------------------------------------- */
    let weakSkills: string[] = []
    let mastery: SkillMastery = {}

    try {
      const masteryUrl = request.nextUrl.clone()
      masteryUrl.pathname = "api/bkt/mastery"
      const masteryRes = await fetch(masteryUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (masteryRes.ok) {
        mastery = (await masteryRes.json()) as SkillMastery

        const entries = Object.entries(mastery) as [string, number][]
        weakSkills = entries
          .sort(([, a], [, b]) => a - b) // weakest first
          .slice(0, 3)
          .map(([skillId]) => skillId)
      } else {
        console.warn(
          'BKT mastery API returned non-OK status:',
          masteryRes.status
        )
      }
    } catch (err) {
      console.warn('Failed to fetch BKT mastery, continuing without it:', err)
    }

    /* ---------------------------------------------------------
       3) CHOOSE ADAPTIVE DIFFICULTY (Option B)
    --------------------------------------------------------- */
    let effectiveDifficulty: Difficulty =
      difficulty || (lesson.difficulty as Difficulty) || 'normal'

    if (Object.keys(mastery).length > 0) {
      const scores = Object.values(mastery)
      const minScore = Math.min(...scores) // weakest mastery

      if (minScore < 0.4) {
        effectiveDifficulty = 'easy'
      } else if (minScore < 0.7) {
        effectiveDifficulty = 'normal'
      } else {
        effectiveDifficulty = 'hard'
      }
    }

    const effectiveLearningStyle =
      learningStyle || 'verbal' // later you can pull from user preferences

    const QUESTION_COUNT = 7

    /* ---------------------------------------------------------
       4) GENERATE QUIZ VIA AI (BKT-FOCUSED)
    --------------------------------------------------------- */
    const quiz = await generateQuiz(
      lesson.content,
      effectiveDifficulty,
      effectiveLearningStyle,
      QUESTION_COUNT,
      weakSkills
    )

    /* ---------------------------------------------------------
       5) SAVE QUIZ IN DB
    --------------------------------------------------------- */
    let savedQuiz: any = null
    try {
      const { data, error: saveError } = await supabase
        .from('quizzes')
        .insert({
          lesson_id: lessonId,
          questions: quiz.questions,
        })
        .select()
        .single()

      if (saveError) {
        console.warn('Quiz save error (non-critical):', saveError)
      } else {
        savedQuiz = data
      }
    } catch (err) {
      console.warn('Quiz save threw (non-critical):', err)
    }

    /* ---------------------------------------------------------
       6) RETURN RESULT
    --------------------------------------------------------- */
    return NextResponse.json({
      quiz: savedQuiz || { id: 'temp', questions: quiz.questions },
      questions: quiz.questions,
      weakSkills,
      usedDifficulty: effectiveDifficulty,
      usedLearningStyle: effectiveLearningStyle,
      questionCount: QUESTION_COUNT,
    })
  } catch (err) {
    console.error('quiz-gen ERROR:', err)
    return NextResponse.json(
      { error: 'Quiz generation failed', details: `${err}` },
      { status: 500 }
    )
  }
}
