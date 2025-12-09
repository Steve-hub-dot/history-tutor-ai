import { NextRequest, NextResponse } from 'next/server'
import { generateLesson } from '@/lib/ai'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { lessonId, topic, difficulty, learningStyle } = await req.json()

    if (!lessonId || !topic) {
      return NextResponse.json(
        { error: 'lessonId and topic are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // 1. Call AI to generate lesson JSON
    const generated = await generateLesson(topic, difficulty, learningStyle)

    // 2. Save into database
    const { data, error } = await supabase
      .from('lessons')
      .insert({
        id: lessonId,
        title: generated.title,
        content: generated.content,
        topic,
        difficulty: difficulty || 'normal'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ lesson: data })

  } catch (err) {
    console.error('lesson-gen error:', err)
    return NextResponse.json(
      { error: 'Lesson generation failed', details: `${err}` },
      { status: 500 }
    )
  }
}
