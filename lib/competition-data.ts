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
  description?: string;
  image: string;
  heroImage: string;
  retailValue: number;
  condition?: string;
  entryPrice: number;
  isFree?: boolean; // true = free-entry competition, connect to WooCommerce free product later
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
   * @deprecated Use skillChallengeId + /api/skill-challenge/validate instead.
   */
  correctAnswer: string;
  /**
   * ID of the visual skill challenge (from lib/skill-challenge-config.ts).
   * When set, SkillChallenge renders the visual watch-identification UI.
   * The correct answer is kept server-side in lib/skill-challenge-answers.ts.
   */
  skillChallengeId?: string;
  /** Stock quantity from WooCommerce — populated at page render time. */
  wooStockQuantity?: number | null;
  /**
   * ACF field: competition lifecycle status.
   * Values: 'Coming Soon' | 'Live' | 'Sold Out' | 'Draw Pending' | 'Winner Announced' | 'Closed'
   * Controls entry gates across homepage, competition page, and checkout.
   */
  competitionStatus?: string;
  /**
   * ACF field: competition category type.
   * Values: 'weekly' | 'monthly' | 'free' | 'special'
   * Used by homepage to select the correct active competition per section.
   */
  competitionType?: string;
  /**
   * ACF field: competition number (e.g. 25 → "Competition #25").
   * Shown in the info strip beneath the homepage hero.
   * Optional — strip omits the number gracefully when absent.
   */
  competitionNumber?: number;
  /**
   * ACF field: challenge_image URL — watch image shown in the skill challenge step.
   * When present (with answerOptions), SkillChallenge uses ACF-driven mode instead
   * of the hardcoded VISUAL_CHALLENGES config.
   */
  challengeImage?: string;
  /**
   * ACF field: answer_options textarea — one answer label per line, parsed to array.
   * In ACF mode each label also serves as its own option ID.
   */
  answerOptions?: string[];
  /**
   * ACF image field: background image URL for the homepage hero section.
   * When present, overrides the default hero-bg-luxury.jpg CSS background.
   * ACF may return an image object, a URL string, or an integer ID — all formats
   * are normalised to a URL string in woocommerce.ts / toSafeProduct.
   */
  heroBackgroundImage?: string;
  /**
   * WooCommerce product description (HTML).
   * Used by ProductEditorial to populate "The Story Behind The Prize" section.
   * Parsed server-side into headline/paragraphs/specs/features/quote.
   */
  wooDescription?: string;
  /**
   * All WooCommerce product images (featured image first, then gallery images).
   * Used by ProductEditorial for the right-side image / thumbnail gallery.
   */
  galleryImages?: Array<{ src: string; alt: string }>;
  checkoutUrl: string;
  ctaLink: string;
  recentPurchases: string[];
  leaderboard: Array<{ name: string; location: string; tickets: number }>;
}

export const competitions: Competition[] = [
  {
    id: 'comp-001',
    wooProductId: 20, // WooCommerce product ID — paid competition (Rolex Cosmograph Daytona)
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
      { qty: 20, popular: false },
    ],
    maxTicketsPerPurchase: 165, // static fallback — overridden by ACF max_entries_percentage (33% of 500)
    skillQuestion: 'Which Swiss manufacturer produces the Speedmaster Moonwatch?',
    skillAnswers: ['Omega', 'Rolex', 'Breitling', 'TAG Heuer'],
    correctAnswer: 'Omega',
    skillChallengeId: 'wc-id-001',
    checkoutUrl: '/checkout',
    ctaLink: '/competitions/omega-speedmaster-moonwatch',
    recentPurchases: ['London', 'Amsterdam', 'Edinburgh'],
    leaderboard: [
      { name: 'J.T.', location: 'London',    tickets: 10 },
      { name: 'S.M.', location: 'Edinburgh', tickets: 10 },
      { name: 'M.H.', location: 'Manchester',tickets: 10 },
    ],
  },
  {
    id: 'comp-002',
    wooProductId: 13, // WooCommerce product ID — free competition (AP X SWATCH ROYAL POPP)
    slug: 'free-omega-speedmaster-moonwatch',
    title: 'Omega Speedmaster Moonwatch',
    brand: 'Omega',
    model: 'Speedmaster Professional Moonwatch',
    shortName: 'Omega Speedmaster Moonwatch',
    reference: '310.30.42.50.01.001',
    detail: 'Hesalite Crystal · Calibre 3861',
    description: 'One competition. One watch. Limited entries only. Secure your chance to own the Speedmaster Professional Moonwatch, for free.',
    image: '/assets/images/omega-speedmaster-correct.avif',
    heroImage: '/assets/images/omega-speedmaster-correct.avif',
    retailValue: 6100,
    entryPrice: 0,
    isFree: true,
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
      { qty: 20, popular: false },
    ],
    maxTicketsPerPurchase: 100, // static fallback — overridden by ACF max_entries_percentage when set in WooCommerce
    skillQuestion: 'Which Swiss manufacturer produces the Speedmaster Moonwatch?',
    skillAnswers: ['Omega', 'Rolex', 'Breitling', 'TAG Heuer'],
    correctAnswer: 'Omega',
    skillChallengeId: 'wc-id-001',
    checkoutUrl: '/checkout',
    ctaLink: '/competitions/free-omega-speedmaster-moonwatch',
    recentPurchases: ['London', 'Amsterdam', 'Edinburgh'],
    leaderboard: [
      { name: 'J.T.', location: 'London',    tickets: 1 },
      { name: 'S.M.', location: 'Edinburgh', tickets: 1 },
      { name: 'M.H.', location: 'Manchester',tickets: 1 },
    ],
  },
];

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return competitions.find(c => c.slug === slug);
}

export function getAllCompetitions(): Competition[] {
  return competitions;
}
