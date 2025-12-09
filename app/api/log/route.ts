import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, lessonId, duration, scrollDepth, openedAt, closedAt } = body

    if (!userId || !lessonId) {
      return NextResponse.json({ error: 'userId and lessonId are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('interactions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        duration: duration || 0,
        scroll_depth: scrollDepth || 0,
        opened_at: openedAt || new Date().toISOString(),
        closed_at: closedAt,
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging interaction:', error)
      return NextResponse.json({ error: 'Failed to log interaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true, interaction: data })
  } catch (error) {
    console.error('Error in log API:', error)
    return NextResponse.json(
      { error: 'Failed to log interaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

