// lib/competition-data.ts
// Central mock data — replace with WooCommerce API calls when backend is live

export interface TicketOption {
  qty: number;
  popular: boolean;
}

export interface Competition {
  id: string;
  wooProductId: number;
  slug: string;
  title: string;
  brand: string;
  model: string;
  shortName: string;
  reference: string;
  detail: string;
  image: string;
  heroImage: string;
  retailValue: number;
  entryPrice: number;
  currency: string;
  totalTickets: number;
  ticketsSold: number;
  ticketsLeft: number;
  soldPercentage: number;
  drawDate: string; // ISO string — use new Date(drawDate) in components
  drawDateDisplay: string;
  cashAlternative: number;
  ticketOptions: TicketOption[];
  maxTicketsPerPurchase: number;
  skillQuestion: string;
  skillAnswers: string[];
  /**
   * SECURITY WARNING: correctAnswer is visible in client bundle.
   * For launch: remove this field and validate server-side via
   * a Next.js API route or WooCommerce order meta.
   */
  correctAnswer: string;
  checkoutUrl: string;
  ctaLink: string;
  recentPurchases: string[];
  leaderboard: Array<{ name: string; location: string; tickets: number }>;
}

export const competitions: Competition[] = [
  {
    id: 'comp-001',
    wooProductId: 856,
    slug: 'omega-speedmaster-moonwatch',
    title: 'Omega Speedmaster Moonwatch',
    brand: 'Omega',
    model: 'Speedmaster Professional Moonwatch',
    shortName: 'Omega Speedmaster Moonwatch',
    reference: '310.30.42.50.01.001',
    detail: 'Hesalite Crystal · Calibre 3861',
    image: '/assets/images/omega-speedmaster-correct.avif',
    heroImage: '/assets/images/omega-speedmaster-correct.avif',
    retailValue: 6100,
    entryPrice: 5.95,
    currency: '£',
    totalTickets: 500,
    ticketsSold: 101,
    ticketsLeft: 399,
    soldPercentage: 20.2,
    drawDate: '2026-05-30T23:59:00',
    drawDateDisplay: '30 May 2026, 23:59 BST',
    cashAlternative: 5000,
    ticketOptions: [
      { qty: 1,  popular: false },
      { qty: 3,  popular: false },
      { qty: 5,  popular: false },
      { qty: 10, popular: true  },
      { qty: 25, popular: false },
      { qty: 50, popular: false },
    ],
    maxTicketsPerPurchase: 20,
    skillQuestion: 'Which Swiss manufacturer produces the Speedmaster Moonwatch?',
    skillAnswers: ['Omega', 'Rolex', 'Breitling', 'TAG Heuer'],
    correctAnswer: 'Omega',
    checkoutUrl: '/checkout',
    ctaLink: '/competitions/omega-speedmaster-moonwatch',
    recentPurchases: ['London', 'Amsterdam', 'Edinburgh'],
    leaderboard: [
      { name: 'J.T.', location: 'London',    tickets: 10 },
      { name: 'S.M.', location: 'Edinburgh', tickets: 10 },
      { name: 'M.H.', location: 'Manchester',tickets: 10 },
    ],
  },
];

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return competitions.find(c => c.slug === slug);
}

export function getAllCompetitions(): Competition[] {
  return competitions;
}
