import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const BKT_SERVER_URL = process.env.BKT_SERVER_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, skillKey, correct, lessonId, questionId } = body

    if (!userId || !skillKey || typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'userId, skillKey, and correct(boolean) are required' },
        { status: 400 }
      )
    }

    // Forward to Python BKT server
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
      throw new Error(`BKT error: ${bktResponse.statusText}`)
    }

    const bktData = await bktResponse.json()

    // Update state in DB
    const supabase = createServerClient()

    await supabase.from('bkt_states').upsert(
      {
        user_id: userId,
        skill_key: skillKey,
        p_known: bktData.p_new,
        p_learn: bktData.p_learn,
        p_guess: bktData.p_guess,
        p_slip: bktData.p_slip,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id,skill_key' }
    )

    return NextResponse.json(bktData)
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to process BKT answer', details: `${err}` },
      { status: 500 }
    )
  }
}
