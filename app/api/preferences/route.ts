import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('users')
      .select('learning_style, difficulty_preference')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      learningStyle: data.learning_style || 'verbal',
      difficulty: data.difficulty_preference || 'normal',
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, learningStyle, difficulty } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const updateData: any = {}
    if (learningStyle) updateData.learning_style = learningStyle
    if (difficulty) updateData.difficulty_preference = difficulty

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error('Error in preferences API:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

