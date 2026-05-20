// lib/skill-challenge-config.ts
// CLIENT-SAFE — contains only option IDs and labels, never the correct answer.
// The correct answer mapping lives server-side in lib/skill-challenge-answers.ts
// and is only accessed through the /api/skill-challenge/validate endpoint.

export interface SkillOption {
  id: string
  label: string
}

export interface VisualSkillChallenge {
  id: string
  image: string
  question: string
  options: SkillOption[]
}

export const VISUAL_CHALLENGES: Record<string, VisualSkillChallenge> = {
  'wc-id-001': {
    id: 'wc-id-001',
    image: '/assets/images/skill-challenge/skill-challenge-watch.png',
    question: 'Which watch model is shown in the image?',
    options: [
      { id: 'wc-a', label: 'AIR-KING' },
      { id: 'wc-b', label: 'GMT-MASTER II' },
      { id: 'wc-c', label: 'YACHT-MASTER' },
      { id: 'wc-d', label: 'SUBMARINER' },
    ],
  },
}

export function getChallenge(id: string): VisualSkillChallenge | undefined {
  return VISUAL_CHALLENGES[id]
}

export function getOptionLabel(challengeId: string, optionId: string): string {
  return VISUAL_CHALLENGES[challengeId]?.options.find(o => o.id === optionId)?.label ?? optionId
}
