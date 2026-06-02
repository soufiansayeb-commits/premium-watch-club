import { NextRequest, NextResponse } from 'next/server'
import { CHALLENGE_CORRECT_OPTIONS } from '@/lib/skill-challenge-answers'
import { fetchWooProductById } from '@/lib/woocommerce'

export async function POST(req: NextRequest) {
  let body: { challengeId?: unknown; optionId?: unknown; productId?: unknown; selectedAnswer?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // ── ACF-driven mode: productId + selectedAnswer ──────────────────────────────
  // The correct answer is fetched server-side from WooCommerce — never exposed to client.
  if (body.productId !== undefined || body.selectedAnswer !== undefined) {
    const productId     = body.productId
    const selectedAnswer = body.selectedAnswer

    if (typeof productId !== 'number' || typeof selectedAnswer !== 'string') {
      return NextResponse.json(
        { error: 'productId (number) and selectedAnswer (string) are required for ACF validation.' },
        { status: 400 }
      )
    }

    const { product, error } = await fetchWooProductById(productId)
    if (error || !product) {
      return NextResponse.json({ error: 'Unknown challenge.' }, { status: 404 })
    }

    const correctAnswer = product.correct_answer
    if (!correctAnswer) {
      // Product exists but no correct_answer ACF field set — treat as correct to not block entry
      return NextResponse.json({ isCorrect: true })
    }

    const isCorrect =
      selectedAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

    return NextResponse.json({ isCorrect })
  }

  // ── Hardcoded mode: challengeId + optionId ───────────────────────────────────
  const { challengeId, optionId } = body

  if (typeof challengeId !== 'string' || typeof optionId !== 'string') {
    return NextResponse.json(
      { error: 'challengeId and optionId must be strings.' },
      { status: 400 }
    )
  }

  const correctOption = CHALLENGE_CORRECT_OPTIONS[challengeId]
  if (correctOption === undefined) {
    return NextResponse.json({ error: 'Unknown challenge.' }, { status: 404 })
  }

  return NextResponse.json({ isCorrect: optionId === correctOption })
}
