import { NextRequest, NextResponse } from 'next/server'
import { CHALLENGE_CORRECT_OPTIONS } from '@/lib/skill-challenge-answers'

export async function POST(req: NextRequest) {
  let body: { challengeId?: unknown; optionId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { challengeId, optionId } = body

  if (typeof challengeId !== 'string' || typeof optionId !== 'string') {
    return NextResponse.json({ error: 'challengeId and optionId must be strings.' }, { status: 400 })
  }

  const correctOption = CHALLENGE_CORRECT_OPTIONS[challengeId]
  if (correctOption === undefined) {
    return NextResponse.json({ error: 'Unknown challenge.' }, { status: 404 })
  }

  return NextResponse.json({ isCorrect: optionId === correctOption })
}
