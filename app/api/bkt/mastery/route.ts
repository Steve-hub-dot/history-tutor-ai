import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const BKT_SERVER_URL = process.env.BKT_SERVER_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, skillKeys } = body

    if (!userId || !Array.isArray(skillKeys)) {
      return NextResponse.json(
        { error: 'userId and skillKeys (array) are required' },
        { status: 400 }
      )
    }

    // Try to fetch from BKT server first
    try {
      const bktResponse = await fetch(`${BKT_SERVER_URL}/bkt/mastery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          skill_keys: skillKeys,
        }),
      })

      if (bktResponse.ok) {
        const bktData = await bktResponse.json()
        return NextResponse.json(bktData)
      }
    } catch (error) {
      console.warn('BKT server unavailable, fetching from database:', error)
    }

    // Fallback: fetch from database
    const supabase = createServerClient()
    const { data: states, error } = await supabase
      .from('bkt_states')
      .select('skill_key, p_known')
      .eq('user_id', userId)
      .in('skill_key', skillKeys)

    if (error) {
      console.error('Error fetching BKT states:', error)
    }

    // Build response with defaults for missing skills
    const skills: Record<string, number> = {}
    skillKeys.forEach((key: string) => {
      const state = states?.find((s) => s.skill_key === key)
      skills[key] = state?.p_known ?? 0.5
    })

    return NextResponse.json({ skills })
  } catch (error) {
    console.error('Error in BKT mastery API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mastery', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

