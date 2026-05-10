import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FaqAccordion from '@/components/FaqAccordion'

export const metadata = {
  title: 'Frequently Asked Questions — Premium Watch Club',
}

const faqs = [
  {
    question: 'How do I enter a competition?',
    answer: 'Select the number of entries you wish to purchase from the competition page, then answer the mandatory skill question correctly. Complete the secure checkout process to confirm your entries. You will receive a confirmation email with your unique ticket numbers once payment has been processed successfully.',
  },
  {
    question: 'Is this a lottery?',
    answer: 'No. Premium Watch Club competitions are skill-based competitions, not lotteries. A mandatory knowledge question must be answered correctly for any entry to be valid. This distinguishes our competitions from games of chance and means they are not regulated by the Gambling Commission. A free postal entry route is also available — please contact us for details.',
  },
  {
    question: 'Why is there a skill question?',
    answer: 'The inclusion of a skill question is a legal requirement that distinguishes our competitions from lotteries under UK law. The question is designed to be answerable by any reasonable adult without specialist knowledge. Only entries with a correct answer to the skill question are entered into the final draw.',
  },
  {
    question: 'How are winners selected?',
    answer: 'The winning ticket is selected at random from all valid entries using an independent, third-party randomisation tool. All draws are conducted live and streamed publicly on our official channels so that participants can verify the process for themselves. Every valid ticket number has an equal probability of being selected.',
  },
  {
    question: 'How will I know if I win?',
    answer: "If you are the winner, we will contact you directly via the email address you provided at the time of entry within 48 hours of the live draw. We will also publish the winner's first name, surname initial, and location on our website and social channels. We recommend watching the live draw stream so you know the outcome in real time.",
  },
  {
    question: 'Are the watches authentic?',
    answer: 'Yes, without exception. Every watch offered as a prize by Premium Watch Club is sourced directly from authorised dealers or certified grey market specialists with verifiable provenance. All prizes arrive with their original box, papers, and manufacturer warranty where applicable. We provide a certificate of authenticity with every prize delivery.',
  },
  {
    question: 'Do you offer a cash alternative?',
    answer: "A cash alternative may be offered at PWC's discretion. Where available, the cash value will be no less than 90% of the watch's stated retail value. If offered, the winner must elect the cash alternative within 7 days of being notified. Please refer to our full competition terms for details.",
  },
  {
    question: 'Can I enter by post for free?',
    answer: 'Yes. In accordance with competition law, a free postal entry route is available for every draw. To enter by post, write your full name, address, date of birth, and the answer to the skill question clearly on a postcard and send it to our registered address. Postal entries have the same probability of winning as paid entries. Contact us for the current postal address.',
  },
  {
    question: 'How many tickets can I buy per competition?',
    answer: 'Each competition has a stated maximum number of tickets per participant, typically between 20 and 50 entries. This limit exists to ensure that no single participant can dominate the entry pool, maintaining fairness for all members. The maximum is clearly stated on each competition page before you purchase.',
  },
  {
    question: 'When and how is the live draw conducted?',
    answer: 'Draws take place on the date stated on the competition page, usually at 8:00 PM GMT. The draw is streamed live on our YouTube channel and Instagram, giving full transparency to all participants. The winning ticket is selected using a verified random number generator in front of the camera. Recordings are archived and available for review after the event.',
  },
]

export default function FAQPage() {
  return (
    <>
      <Header />

      <div className="faq-page-hero">
        <div className="container">
          <div className="faq-hero-eyebrow">
            <span className="faq-hero-eyebrow-line" />
            <span className="faq-hero-eyebrow-text">Support Centre</span>
            <span className="faq-hero-eyebrow-line" />
          </div>
          <h1 className="faq-hero-headline">Frequently Asked Questions</h1>
          <p className="faq-hero-sub">
            Clear answers to the questions we hear most. For anything not covered here, our support team is ready to assist.
          </p>
        </div>
      </div>

      <main className="faq-content-wrap">
        <div className="faq-content">

          <FaqAccordion items={faqs} />

          <div className="faq-support-cta">
            <div className="faq-support-cta-inner">
              <div className="faq-support-cta-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="6" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 9l11 7.5L25 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="faq-support-cta-title">Still have questions?</h3>
              <p className="faq-support-cta-sub">
                Our support team usually responds within 24–48 business hours.
              </p>
              <Link href="/contact" className="faq-support-btn">
                Contact Support
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
