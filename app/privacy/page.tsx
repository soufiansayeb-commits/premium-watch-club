import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy — Premium Watch Club',
  description: 'Read how Premium Watch Club collects, uses, and protects your personal data when you enter our skill-based luxury watch prize competitions and draws.',
}

// Block model — text/data only, rendered into the existing legal layout.
type Block =
  | { p: string }
  | { list: string[] }

type Section = { id: string; label: string; blocks: Block[] }

const sections: Section[] = [
  {
    id: 'p1',
    label: 'Who We Are',
    blocks: [
      { p: 'Premium Watch Club is operated by PREMIUM WATCH CLUB LTD (company number 17233368), a company registered in England and Wales, with registered office at 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. We are the data controller responsible for your personal information collected through this website and our competition entry processes.' },
      { p: 'If you have any questions about how we handle your data, please contact us at info@premiumwatchclub.com. We are committed to handling your personal information with care, transparency, and in full compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.' },
    ],
  },
  {
    id: 'p2',
    label: 'What Data We Collect',
    blocks: [
      { p: 'We collect personal data that you provide directly to us, as well as data collected automatically when you use our website. This includes:' },
      { list: [
        'Name and contact details (email address, postal address)',
        'Date of birth (for age verification purposes)',
        'Transaction and payment data',
        'Competition entry records, including ticket numbers and skill question responses',
        'Communications you send to us',
        'Technical data collected automatically (IP address, browser type, device information)',
      ] },
      { p: 'We do not collect any special category data (such as health, religious belief, or biometric data) and do not knowingly collect data relating to children.' },
    ],
  },
  {
    id: 'p3',
    label: "Children's Data",
    blocks: [
      { p: 'This website is not intended for anyone under the age of 18, and all entrants must confirm they are 18 or over. We do not knowingly collect personal data from anyone under 18. If we become aware that we have done so, we will delete it promptly.' },
    ],
  },
  {
    id: 'p4',
    label: 'Order & Payment Data',
    blocks: [
      { p: 'When you purchase competition entries, we collect your billing name, email address, and shipping address. Payment card details are processed securely by our payment provider and are never stored on PWC systems. We retain transaction records for a minimum of 7 years to comply with financial and tax regulations.' },
      { p: 'Your order data is used to issue tickets, confirm your entry, contact you if you win, and deliver your prize if applicable. It may also be retained to investigate disputes or fraud.' },
    ],
  },
  {
    id: 'p5',
    label: 'How We Use Your Data',
    blocks: [
      { p: 'We use your personal data to: process your entries and payments; run competition draws and contact winners; verify eligibility and prevent fraud; respond to your enquiries; and, with your consent, send marketing communications.' },
      { p: 'We rely on the following legal bases: performance of a contract with you (to process entries and deliver prizes), our legitimate interests (to prevent fraud and improve our service), your consent (for marketing), and compliance with legal obligations (such as financial record-keeping).' },
    ],
  },
  {
    id: 'p6',
    label: 'Sharing Your Data',
    blocks: [
      { p: 'We share your data only where necessary, with:' },
      { list: [
        'Service providers who support our operations, including payment processors, delivery couriers, our random draw provider, and website hosting and analytics providers',
        'Law enforcement or regulatory authorities, where required by law or to investigate fraud',
        'Insurers and professional advisers, in connection with legal claims',
        'A prospective buyer or successor, in the event of a sale, merger, or restructuring of our business',
      ] },
      { p: 'We do not sell your personal data to third parties. Any third party we share data with is required to protect it and use it only for the purpose we specify.' },
    ],
  },
  {
    id: 'p7',
    label: 'International Transfers',
    blocks: [
      { p: 'Some of our service providers are based outside the UK and European Economic Area, including in the United States. Where we transfer your data internationally, we ensure appropriate safeguards are in place, such as standard contractual clauses or transferring only to countries recognised as providing an adequate level of data protection.' },
    ],
  },
  {
    id: 'p8',
    label: 'Email Communications',
    blocks: [
      { p: 'If you purchase entries or create an account, we will send you transactional emails related to your entries, draw results, and account activity. These are necessary for the performance of our contract with you and cannot be opted out of while you hold an active account.' },
      { p: 'With your consent, we may also send you marketing communications about new competitions, editorial content, and exclusive member offers by email and, where you have provided a phone number, by text message, including messages sent by autodialer. Consent to receive marketing communications is not a condition of any purchase. Message and data rates may apply for text messages, and message frequency varies. You can unsubscribe from email marketing at any time using the link in any email we send, and from text messages at any time by replying STOP.' },
    ],
  },
  {
    id: 'p9',
    label: 'Cookies & Analytics',
    blocks: [
      { p: 'Our website uses cookies and similar tracking technologies to improve your browsing experience and understand how our site is used. These include essential cookies required for the site to function, as well as optional analytics cookies.' },
      { p: 'We use analytics data to understand visitor behaviour in aggregate, improve our competition pages, and measure the performance of our communications. We do not sell cookie or analytics data to third parties. You can manage your cookie preferences through the cookie banner displayed on your first visit.' },
    ],
  },
  {
    id: 'p10',
    label: 'How We Store & Protect Your Data',
    blocks: [
      { p: 'Your personal data is stored on secure servers located within the United Kingdom and European Economic Area. We implement appropriate technical and organisational measures to protect your data against unauthorised access, loss, or destruction, including encryption, access controls, and regular security assessments. We have procedures in place to detect and respond to any suspected data breach, and will notify you and any applicable regulator where we are legally required to do so.' },
      { p: 'We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected, comply with legal obligations, resolve disputes, and enforce our agreements. Account data is retained for 3 years after your last active entry, unless you request earlier deletion.' },
    ],
  },
  {
    id: 'p11',
    label: 'Winner Publicity',
    blocks: [
      { p: 'If you win a competition, your first name, surname initial, and location may be published on our website and social channels as proof that the competition was properly administered, in line with our Terms & Conditions. You may object to publicity in writing, but we may still be required to retain limited winner verification records for regulatory purposes.' },
    ],
  },
  {
    id: 'p12',
    label: 'Your Rights',
    blocks: [
      { p: 'Under UK GDPR, you have the right to: access the personal data we hold about you; request correction of inaccurate data; request erasure in certain circumstances; restrict how we process your data; receive your data in a portable format; and object to processing based on legitimate interests or direct marketing.' },
      { p: "To exercise any of these rights, please contact us as set out below. We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk." },
    ],
  },
  {
    id: 'p13',
    label: 'Changes to This Policy',
    blocks: [
      { p: 'We may update this policy from time to time to reflect changes in our practices or legal requirements. Material changes will be notified to registered users by email; otherwise, we recommend checking this page periodically. The version published on this website applies at the time of your visit.' },
    ],
  },
  {
    id: 'p14',
    label: 'Contact for Privacy Requests',
    blocks: [
      { p: 'For any privacy-related enquiries, data subject access requests, or to exercise any of your rights, please contact us at:' },
      { p: 'Email: info@premiumwatchclub.com' },
      { p: 'We take all privacy requests seriously and will acknowledge your request within 5 business days.' },
    ],
  },
]

export default function PrivacyPage() {
  return (
    <>
      <Header />

      <div className="legal-hero">
        <div className="container">
          <div className="legal-hero-badge">Legal</div>
          <h1 className="legal-hero-title">Privacy Policy</h1>
          <p className="legal-hero-sub">How Premium Watch Club collects, uses, and protects your personal data.</p>
        </div>
      </div>

      <main className="legal-layout">
        <div className="legal-doc">

          <aside className="legal-toc">
            <div className="legal-toc-heading">Contents</div>
            <ol className="legal-toc-list">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span className="toc-num">{i + 1}.</span>
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <div className="legal-body">
            <div className="legal-body-meta">Last reviewed: May 2026</div>

            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="legal-section">
                <h2>{i + 1}. {s.label}</h2>
                {s.blocks.map((block, bi) =>
                  'list' in block ? (
                    <ul key={bi}>
                      {block.list.map((item, li) => (
                        <li key={li}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={bi}>{block.p}</p>
                  )
                )}
              </section>
            ))}

          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
