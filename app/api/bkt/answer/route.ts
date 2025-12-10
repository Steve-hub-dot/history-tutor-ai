import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const BKT_SERVER_URL = process.env.BKT_SERVER_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, skillKey, correct, lessonId, questionId } = body

    if (!userId || !skillKey || typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'userId, skillKey, and correct (boolean) are required' },
        { status: 400 }
      )
    }

    // Call BKT server
    const bktResponse = await fetch(`${BKT_SERVER_URL}/bkt/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        skill_key: skillKey,
        correct,
        lesson_id: lessonId,
        question_id: questionId,
      }),
    })

    if (!bktResponse.ok) {
      throw new Error(`BKT server error: ${bktResponse.statusText}`)
    }

    const bktData = await bktResponse.json()

    // Update BKT state in database
    const supabase = createServerClient()
    const { error: upsertError } = await supabase
      .from('bkt_states')
      .upsert(
        {
          user_id: userId,
          skill_key: skillKey,
          p_known: bktData.p_new,
          p_learn: bktData.p_learn,
          p_guess: bktData.p_guess,
          p_slip: bktData.p_slip,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,skill_key',
        }
      )

    if (upsertError) {
      console.error('Error updating BKT state:', upsertError)
      // Continue anyway, return the BKT response
    }

    return NextResponse.json(bktData)
  } catch (error) {
    console.error('Error in BKT answer API:', error)
    
    // Fallback: if BKT server is not available, return a simple response
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          p_old: 0.5,
          p_new: 0.5,
          p_learn: 0.3,
          p_guess: 0.2,
          p_slip: 0.1,
          warning: 'BKT server unavailable, using default values',
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process BKT answer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

