// app/api/skill-challenge/validate/route.ts
//
// Confirms that a submitted skill answer can be recorded for a competition:
// the competition exists, is open for entries, has a complete skill question,
// and the answer is one of its options.
//
// It intentionally does NOT say whether the answer is correct. Returning
// correctness here made this endpoint an answer oracle. Correctness is decided
// in WordPress when the order is created and is never shown to the customer —
// exactly what the entry flow already promises ("your answer will be recorded").
//
// Fail closed: any lookup failure or incomplete configuration rejects the answer.

import { NextRequest, NextResponse } from 'next/server'
import { fetchWooProductById, isWooEntryClosed } from '@/lib/woocommerce'
import { getSkillConfigProblem, matchAnswerOption } from '@/lib/skill-check'

export async function POST(req: NextRequest) {
  let body: { productId?: unknown; selectedAnswer?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { productId, selectedAnswer } = body
  if (
    typeof productId !== 'number' || !Number.isInteger(productId) || productId <= 0 ||
    typeof selectedAnswer !== 'string' || !selectedAnswer.trim()
  ) {
    return NextResponse.json({ error: 'productId and selectedAnswer are required.' }, { status: 400 })
  }

  const { product, error } = await fetchWooProductById(productId)
  if (error) {
    console.error('[PWC skill-validate] WooCommerce lookup failed')
    return NextResponse.json(
      { error: 'We could not confirm your answer right now. Please try again in a moment.' },
      { status: 503 },
    )
  }
  if (!product) {
    return NextResponse.json({ error: 'Unknown competition.' }, { status: 404 })
  }
  if (isWooEntryClosed(product)) {
    return NextResponse.json(
      { error: 'This competition is closed and no longer accepting entries.' },
      { status: 409 },
    )
  }

  const problem = getSkillConfigProblem(product)
  if (problem) {
    console.error(`[PWC skill-validate] product #${productId} skill question not configured (${problem})`)
    return NextResponse.json(
      { error: 'Entries for this competition are temporarily unavailable. Please try again later.' },
      { status: 503 },
    )
  }

  if (!matchAnswerOption(product, selectedAnswer)) {
    return NextResponse.json({ error: 'Please select one of the listed answers.' }, { status: 422 })
  }

  return NextResponse.json({ accepted: true })
}
