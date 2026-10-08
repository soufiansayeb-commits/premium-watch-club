// lib/skill-check.ts
// SERVER-SIDE ONLY — used by the skill-challenge and prepare-checkout API routes.
//
// Decides whether a competition's skill question is usable and whether a
// submitted answer is one of its options. It deliberately never reports whether
// an answer is CORRECT: that would turn every public endpoint into an answer
// oracle (four requests reveal the right option). Correctness is decided once,
// in WordPress, when the order line item is created — see
// woocommerce-snippets/pwc-skill-challenge-order-meta.php.
//
// Fail closed: a competition without a complete, consistent skill question
// (answer options + a correct answer that is one of those options) cannot be
// entered at all.

import type { WooProduct } from '@/lib/woocommerce'

/** Normalise an answer for comparison: trimmed, collapsed whitespace, case-insensitive. */
export function normaliseAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export type SkillConfigProblem = 'missing_options' | 'missing_correct_answer' | 'correct_answer_not_an_option'

/**
 * Is this product's skill question complete enough to accept entries?
 * Returns null when it is, otherwise the reason it is not.
 */
export function getSkillConfigProblem(product: WooProduct): SkillConfigProblem | null {
  const options = product.answer_options ?? []
  if (options.length === 0) return 'missing_options'
  const correct = product.correct_answer ? normaliseAnswer(product.correct_answer) : ''
  if (!correct) return 'missing_correct_answer'
  if (!options.some(o => normaliseAnswer(o) === correct)) return 'correct_answer_not_an_option'
  return null
}

/**
 * Return the canonical option label matching a submitted answer, or null when the
 * answer is not one of the product's options. The canonical label (not the raw
 * input) is what gets signed into the checkout handoff.
 */
export function matchAnswerOption(product: WooProduct, answer: unknown): string | null {
  if (typeof answer !== 'string') return null
  const wanted = normaliseAnswer(answer)
  if (!wanted || wanted.length > 200) return null
  return (product.answer_options ?? []).find(o => normaliseAnswer(o) === wanted) ?? null
}
