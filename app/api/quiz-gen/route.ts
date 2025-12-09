import { NextRequest, NextResponse } from 'next/server'
import { generateQuiz } from '@/lib/ai'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lessonId, difficulty, learningStyle, numQuestions } = body

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
    }

    // Check AI provider configuration - Ollama is default
    const useOllama = process.env.USE_OLLAMA !== 'false' // Default to true
    const hasGroqKey = !!process.env.GROQ_API_KEY
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY

    // Log which provider is being used
    if (useOllama) {
      console.log('Using Ollama (local, default)')
    } else if (hasGroqKey) {
      console.log('Using Groq API (cloud)')
    } else if (hasOpenAIKey) {
      console.log('Using OpenAI API')
    } else {
      console.log('No explicit provider configured, defaulting to Ollama')
    }

    // Fetch lesson content from database
    const supabase = createServerClient()
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('content, difficulty')
      .eq('id', lessonId)
      .single()

    if (lessonError) {
      console.error('Supabase error:', lessonError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch lesson',
          details: lessonError.message || 'Database error'
        },
        { status: 500 }
      )
    }

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found', details: `No lesson found with id: ${lessonId}` },
        { status: 404 }
      )
    }

    // Generate quiz using AI
    try {
      const quiz = await generateQuiz(
        lesson.content,
        difficulty || lesson.difficulty || 'normal',
        learningStyle || 'verbal',
        numQuestions || 5
      )

      // Save quiz to database (optional, don't fail if this errors)
      let savedQuiz = null
      try {
        const { data, error: saveError } = await supabase
          .from('quizzes')
          .insert({
            lesson_id: lessonId,
            questions: quiz.questions,
          })
          .select()
          .single()

        if (!saveError) {
          savedQuiz = data
        } else {
          console.warn('Error saving quiz to database (non-critical):', saveError)
        }
      } catch (saveError) {
        console.warn('Error saving quiz to database (non-critical):', saveError)
      }

      return NextResponse.json({
        quiz: savedQuiz || { id: 'temp', questions: quiz.questions },
        questions: quiz.questions,
      })
    } catch (aiError) {
      console.error('AI API error:', aiError)
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error'
      return NextResponse.json(
        {
          error: 'Failed to generate quiz with AI',
          details: errorMessage,
          hint: process.env.USE_OLLAMA !== 'false'
            ? 'Make sure Ollama is installed and running:\n1. Install from https://ollama.com/\n2. Run: ollama pull llama3.2\n3. Ensure Ollama is running at http://localhost:11434'
            : process.env.GROQ_API_KEY
            ? 'Check your Groq API key at https://console.groq.com/'
            : 'Check your OpenAI API key and credits'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in quiz-gen API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate quiz', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

