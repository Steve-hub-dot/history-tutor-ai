import { NextRequest, NextResponse } from 'next/server'
import { generateQuiz } from '@/lib/ai'
import { createServerClient } from '@/lib/supabase'

interface SkillMastery {
  [skill: string]: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, lessonId, difficulty, learningStyle, numQuestions } = body

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: 'userId and lessonId required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    /* ---------------------------------------------------------
       1) FETCH MASTERY FOR USER
    --------------------------------------------------------- */
    const masteryRes = await fetch(`${process.env.BASE_URL}/api/bkt/mastery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });

    let mastery: SkillMastery = {};
    if (masteryRes.ok) {
      mastery = await masteryRes.json() as SkillMastery;
    } else {
      console.warn("Could not fetch mastery → using empty skill map");
    }

    // Convert mastery → sorted weakest → strongest
    const sortedWeaknesses = Object.entries(mastery)
      .sort((a, b) => a[1] - b[1]) // ascending mastery score
      .map(([skill]) => skill);

    // Take 1–3 weakest skills
    const weakSkills = sortedWeaknesses.slice(0, 3);

    console.log("Weakest skills:", weakSkills);


    /* ---------------------------------------------------------
       2) FETCH LESSON CONTENT FROM DB
    --------------------------------------------------------- */
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('content, difficulty')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found', details: lessonError?.message },
        { status: 404 }
      )
    }


    /* ---------------------------------------------------------
       3) GENERATE AI QUIZ (ADAPTIVE)
    --------------------------------------------------------- */
    const quiz = await generateQuiz(
      lesson.content,
      difficulty || lesson.difficulty || 'normal',
      learningStyle || 'verbal',
      numQuestions || 5,
      weakSkills        // 👈 NEW adaptive input
    )


    /* ---------------------------------------------------------
       4) STORE GENERATED QUIZ IN DB
    --------------------------------------------------------- */
    const { data: savedQuiz, error: saveErr } = await supabase
      .from("quizzes")
      .insert({
        lesson_id: lessonId,
        questions: quiz.questions,
      })
      .select()
      .single()

    if (saveErr) console.warn("Warning: quiz not saved:", saveErr)


    /* ---------------------------------------------------------
       5) RETURN RESULT
    --------------------------------------------------------- */
    return NextResponse.json({
      quiz: savedQuiz || { id: 'temp', questions: quiz.questions },
      weakSkills,
      questions: quiz.questions
    });

  } catch (err) {
    console.error("quiz-gen ERROR:", err)
    return NextResponse.json(
      { error: 'Quiz generation failed', details: `${err}` },
      { status: 500 }
    )
  }
}
