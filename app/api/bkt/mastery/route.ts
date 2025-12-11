import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, skillKeys = [] } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Alap query
    let query = supabase
      .from('bkt_states')
      .select('skill_key, p_known')
      .eq('user_id', userId)

    // Ha konkrét skill listát kérünk
    if (skillKeys.length > 0) {
      query = query.in('skill_key', skillKeys)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching BKT states:', error)
      return NextResponse.json(
        { error: 'Failed to fetch BKT states' },
        { status: 500 }
      )
    }

    const skills: Record<string, number> = {}

    // DB-ből jött értékek
    data?.forEach((row) => {
      skills[row.skill_key] = row.p_known
    })

    // Ha skillKeys-t adtunk meg, töltsük ki a hiányzókat 0.5-tel
    if (skillKeys.length > 0) {
      for (const key of skillKeys) {
        if (!(key in skills)) {
          skills[key] = 0.5
        }
      }
    }

    return NextResponse.json({ skills })
  } catch (err) {
    console.error('Error in BKT mastery API:', err)
    return NextResponse.json(
      { error: 'Failed to fetch mastery', details: `${err}` },
      { status: 500 }
    )
  }
}
