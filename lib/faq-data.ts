// Shared FAQ content — consumed by the full /faq page and the compact
// homepage FAQ section so the questions/answers live in exactly one place.

export interface FaqItem {
  question: string
  answer: string
}

export const faqs: FaqItem[] = [
  {
    question: "Is this legit?",
    answer: "Yes. Premium Watch Club is a registered company operating skill-based prize competitions in full compliance with applicable law. Every draw runs through RandomDraws, an independent third-party random draw system, and every winner is published with a verifiable draw certificate.",
  },
  {
    question: "Is this a lottery?",
    answer: "No. Every competition includes a skill-based question. Only correct answers are entered into the final draw, which is what separates a skill-based prize competition from a lottery.",
  },
  {
    question: "What happens if a competition doesn't sell out?",
    answer: "The draw always happens on the announced date. If a competition is undersold, we may extend the entry period once to protect the prize pool, but we will never cancel or indefinitely delay a draw.",
  },
  {
    question: "Are the watches authentic?",
    answer: "Every watch is sourced new, verified for authenticity, and issued with its own certificate alongside box and papers where applicable.",
  },
  {
    question: "Do you offer a cash alternative?",
    answer: "Yes. Winners can choose a guaranteed cash alternative worth at least 90% of the watch's retail value, payable within 7 days.",
  },
  {
    question: "Can I enter by post for free?",
    answer: "No. Premium Watch Club does not offer free postal entries. Every competition includes a skill-based question, which means we operate as a skill-based prize competition rather than a lottery, and are not required to provide a free entry route under the Gambling Act 2005.",
  },
  {
    question: "Who is responsible for import duties or taxes?",
    answer: "You are not. Premium Watch Club covers all applicable import duties and taxes, so the watch you win arrives at no additional cost to you.",
  },
  {
    question: "Why is there a skill question?",
    answer: "The skill question is what makes this a competition of skill rather than chance. Only correct answers progress to the draw.",
  },
  {
    question: "How do I enter a competition?",
    answer: "Choose how many tickets you want, answer the skill question correctly, and complete your purchase. You're in.",
  },
  {
    question: "How are winners selected and verified?",
    answer: "Winners are drawn using RandomDraws, an independent third-party system also used across the industry. Every draw generates a public certificate you can check yourself.",
  },
  {
    question: "What is the minimum age to enter?",
    answer: "Our competitions are open to entrants aged 18 and over.",
  },
  {
    question: "How will I know if I win, and how do I receive my watch?",
    answer: "We contact winners directly using the details provided at entry, and arrange secure delivery or collection soon after the draw.",
  },
]

export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}
