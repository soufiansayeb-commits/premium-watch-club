// lib/skill-challenge-answers.ts
// SERVER-SIDE ONLY — never import this file from client components or pages.
// Only used by app/api/skill-challenge/validate/route.ts
//
// TODO (production hardening): move this mapping to an environment variable
// or database row so the answer is not present in the deployed bundle at all.

export const CHALLENGE_CORRECT_OPTIONS: Record<string, string> = {
  'wc-id-001': 'wc-d',
}
