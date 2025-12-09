import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, lessonId, answers, score } = body

    if (!userId || !lessonId || !answers || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'userId, lessonId, answers, and score are required' },
        { status: 400 }
      )
    }

    // First, get or create a quiz for this lesson
    const supabase = createServerClient()
    
    // Find the most recent quiz for this lesson
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (quizError && quizError.code !== 'PGRST116') {
      console.error('Error finding quiz:', quizError)
    }

    // Save quiz attempt
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quiz?.id || null,
        lesson_id: lessonId,
        answers,
        score,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving quiz attempt:', error)
      return NextResponse.json({ error: 'Failed to save quiz attempt' }, { status: 500 })
    }

    return NextResponse.json({ success: true, attempt: data })
  } catch (error) {
    console.error('Error in quiz attempt API:', error)
    return NextResponse.json(
      { error: 'Failed to save quiz attempt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

