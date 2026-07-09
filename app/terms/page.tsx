import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Competition Terms & Conditions — Premium Watch Club',
  description: 'Read the full terms and conditions for entering Premium Watch Club\'s skill-based luxury watch competitions, including eligibility, draws, and prize delivery.',
}

// Block model — text/data only, rendered into the existing legal layout.
type Block =
  | { p: string }
  | { list: string[] }

type Section = { id: string; label: string; blocks: Block[] }

const sections: Section[] = [
  {
    id: 's1',
    label: 'About This Competition',
    blocks: [
      { p: 'Premium Watch Club ("PWC", "we", "us", "our") operates skill-based prize competitions in accordance with UK competition law. Each competition offers participants the chance to win a luxury timepiece by correctly answering a skill-based question and purchasing one or more competition entries.' },
      { p: 'PREMIUM WATCH CLUB LTD (company number 17233368) is a company registered in England and Wales, with registered office at 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. Our competitions are not lotteries and are not regulated by the Gambling Commission. The mandatory skill question is what distinguishes our competitions from games of chance.' },
    ],
  },
  {
    id: 's2',
    label: 'Eligibility',
    blocks: [
      { p: 'Entry is open to individuals who are:' },
      { list: [
        'Aged 18 years or over at the time of entry',
        'Residents of the United Kingdom, European Union member states, or the United States of America, excluding any restricted territories listed in Section 12',
        'Not employees, contractors, directors, or close family members of PWC Ltd or its associated partners, and not otherwise connected with the operation of the competition',
      ] },
      { p: 'By entering, you confirm that you meet all eligibility criteria. We reserve the right to verify eligibility at any stage and to disqualify entries where eligibility cannot be confirmed.' },
    ],
  },
  {
    id: 's3',
    label: 'How to Enter',
    blocks: [
      { p: 'To enter a competition, participants must:' },
      { list: [
        '1. Select the competition and the number of entries they wish to purchase, subject to the maximum per-competition limit set out in Section 5',
        '2. Correctly answer the mandatory skill-based question',
        '3. Complete checkout and provide valid payment',
      ] },
      { p: 'Each valid, paid entry is assigned a unique ticket number. Entry is only complete once payment has been successfully processed and confirmed by us. We accept no responsibility for entries that are incomplete, delayed, damaged, or not received for any reason before the competition closes.' },
      { p: 'For each order, one answer applies to all tickets purchased within that order.' },
    ],
  },
  {
    id: 's4',
    label: 'Skill-Based Question Requirement',
    blocks: [
      { p: 'All competitions include a mandatory skill question. A correct answer is required for an entry to be valid. The question tests general knowledge and is designed to be answerable by a reasonable member of the public without specialist expertise.' },
      { p: 'Entries with an incorrect answer are not entered into the draw. No refund is issued for entries invalidated solely by an incorrect answer, except where required by law.' },
      { p: 'As a skill-based competition and not a lottery, we do not offer free postal entries. Premium Watch Club is compliant with the requirements of the Gambling Act 2005.' },
    ],
  },
  {
    id: 's5',
    label: 'Ticket Limits',
    blocks: [
      { p: 'To keep odds fair for all participants, no individual entrant may purchase more than the maximum number of tickets stated on the relevant competition page. We reserve the right to void and refund any purchase that exceeds this limit.' },
      { p: 'Live ticket availability, including the number of tickets remaining, is shown on the competition page at all times.' },
    ],
  },
  {
    id: 's6',
    label: 'The Draw Process',
    blocks: [
      { p: 'The winning entry is selected by random draw from all valid entries received before the competition closing date. Draws are conducted using RandomDraws, an independent third-party randomisation system also used across the industry, and are livestreamed via our official channels. A public draw certificate is published for every competition.' },
      { p: 'Each valid ticket number has an equal probability of selection.' },
      { p: 'If a competition has not reached its minimum ticket threshold by the closing date, we may extend the entry period once, for no longer than 30 days, to protect the integrity of the prize pool. We will never cancel or indefinitely delay a scheduled draw for this reason, and any extension will be published on the competition page.' },
    ],
  },
  {
    id: 's7',
    label: 'Winner Notification & Verification',
    blocks: [
      { p: 'The winner will be contacted using the email address and, where provided, telephone number supplied at entry, within 48 hours of the draw. We will make reasonable attempts to make contact over a period of 14 days.' },
      { p: 'To confirm identity, age, and lawful ownership of the payment method used, the winner must provide a copy of valid photo identification within 5 days of being contacted. If the name on the payment method does not match the identification provided, the entrant must also provide written proof that the cardholder consented to the purchase.' },
      { p: 'If the winner cannot be reached, does not respond, or does not complete verification within the stated timeframes, we reserve the right to declare the prize forfeited and to select an alternative winner from the remaining valid entries. Once forfeited, the original winner has no further claim to the prize.' },
      { p: "The winner's first name, surname initial, and location will be published on our website and social channels in line with our Privacy Policy, unless the winner objects in writing at least 48 hours before the draw." },
    ],
  },
  {
    id: 's8',
    label: 'Prize Delivery & Import Duties',
    blocks: [
      { p: "Prizes are delivered to the winner's confirmed address by fully insured, tracked courier, typically within 14 business days of verification. Where possible, we source the prize watch within the winner's own country of residence to minimise delay and cost." },
      { p: 'Unlike many competitors, Premium Watch Club covers all applicable import duties and taxes on prizes we ship internationally. Winners are not responsible for these costs.' },
      { p: 'Prizes are non-transferable and provided on an as-described basis. We represent all prizes as new and authentic to the best of our knowledge at the point of dispatch. Any issue with condition or authenticity must be reported in writing within 5 days of confirmed delivery; we are not liable for claims raised after this window.' },
      { p: 'We are not responsible for loss, damage, or delay caused by the courier once a prize has been dispatched, though we will assist the winner in resolving any claim with the carrier.' },
    ],
  },
  {
    id: 's9',
    label: 'Cash Alternative',
    blocks: [
      { p: "Winners may choose a guaranteed cash alternative worth at least 90% of the stated retail value of the prize, payable within 7 days of the winner's election. The cash alternative must be elected within 7 days of being notified as the winner and cannot be combined with the physical prize." },
    ],
  },
  {
    id: 's10',
    label: 'Publicity & Image Rights',
    blocks: [
      { p: "We may request photographs or video content from winners for promotional use, across any channel we choose, including our website and social media. Providing such content is optional and subject to the winner's consent. Winners' first names, surname initials, and locations may be used alongside this content." },
      { p: 'By providing this content, winners grant us a non-exclusive, royalty-free licence to use it for promotional purposes. Consent can be withdrawn for future use at any time by written request to info@premiumwatchclub.com, though this does not apply retroactively to content already published.' },
    ],
  },
  {
    id: 's11',
    label: 'Refunds & Failed Payments',
    blocks: [
      { p: 'Entries are non-refundable once a competition draw has taken place. Where a competition is cancelled prior to the draw, all participants receive a full refund to their original payment method within 10 business days.' },
      { p: 'If a payment fails, is charged back, or is otherwise reversed after ticket numbers have been assigned, the associated entries are automatically voided. Repeated or fraudulent chargebacks may result in restriction from future competitions.' },
    ],
  },
  {
    id: 's12',
    label: 'Restricted Territories',
    blocks: [
      { p: 'Entries from jurisdictions where participation in skill-based prize competitions of this kind is restricted or unclear under local law are not accepted. The current list of restricted territories is published on our website and updated from time to time. Any successful ticket purchase from a restricted territory will be refunded immediately, and the entry voided.' },
      { p: "It remains the entrant's responsibility to ensure that participation is lawful in their own jurisdiction. We accept no liability for a breach of local law by an entrant." },
    ],
  },
  {
    id: 's13',
    label: 'Discount Codes',
    blocks: [
      { p: 'Only one discount code may be applied per order. Discount codes are personal to the entrant they were issued to and may not be transferred, resold, or shared. Unless otherwise stated, codes remain valid for 4 weeks from issue and cannot be reinstated once expired. Misuse of discount codes, including use of multiple accounts to claim codes repeatedly, may result in affected entries being voided.' },
    ],
  },
  {
    id: 's14',
    label: 'Force Majeure',
    blocks: [
      { p: 'We are not liable for any delay or failure to perform our obligations under these terms where this results from events beyond our reasonable control, including but not limited to acts of God, natural disaster, war, civil unrest, pandemic, technical or network failure, or changes in applicable law. Affected obligations are suspended for the duration of the event.' },
    ],
  },
  {
    id: 's15',
    label: 'Liability',
    blocks: [
      { p: 'Nothing in these terms limits or excludes our liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for any other liability that cannot lawfully be limited or excluded.' },
      { p: 'Subject to the above, we are not liable for any loss or damage where: there is no breach of a legal duty we owe you; the loss was not reasonably foreseeable; the loss was caused by your own actions; or the loss relates to a business of yours rather than personal use.' },
      { p: 'Our total liability in connection with any single competition is limited to the value of the tickets purchased by the entrant for that competition.' },
      { p: 'If you are a business user, we are additionally not liable for loss of profit, revenue, business, goodwill, or any indirect or consequential loss, and you agree to indemnify us against claims arising from your use of the website in breach of these terms.' },
    ],
  },
  {
    id: 's16',
    label: 'Website Use & Acceptable Use',
    blocks: [
      { p: 'These website terms apply alongside, and separately from, the competition terms above.' },
      { p: 'You agree not to: breach any applicable law or regulation; infringe the intellectual property or other rights of any party; use the website to offer a competing service; use the website for spam, chain messages, or fraudulent schemes; interfere with or disrupt the website, including through malicious code; use automated tools to access or scrape the website; or attempt to gain unauthorised access to any part of the website or our systems.' },
      { p: 'We do not guarantee that the website will be uninterrupted, secure, or error-free, and are not liable for losses arising from technical issues, maintenance, or downtime.' },
    ],
  },
  {
    id: 's17',
    label: 'Account Security',
    blocks: [
      { p: 'Where we permit account creation, this is for personal use only and may not be shared or transferred. You are responsible for keeping your login details confidential and must notify us immediately of any suspected unauthorised use. We may suspend or terminate an account at our discretion, including where these terms have been breached.' },
    ],
  },
  {
    id: 's18',
    label: 'Intellectual Property',
    blocks: [
      { p: 'All content on this website, including text, images, logos, and design, is owned by us or our licensors. You may view this content for personal use only. You must not copy, reproduce, distribute, or otherwise exploit any part of the website without our prior written consent, and must not scrape, harvest, or deep-link to any part of the site without permission.' },
    ],
  },
  {
    id: 's19',
    label: 'Complaints',
    blocks: [
      { p: 'If you have a complaint, please contact us at info@premiumwatchclub.com. We aim to acknowledge complaints within 5 business days.' },
    ],
  },
  {
    id: 's20',
    label: 'Responsible Entry',
    blocks: [
      { p: 'We encourage responsible participation and recommend that entrants do not spend more than they can comfortably afford. Competition entry should be treated as entertainment, not as a financial investment. If you have concerns about your spending habits, please contact us at info@premiumwatchclub.com or speak to a financial wellbeing adviser.' },
    ],
  },
  {
    id: 's21',
    label: 'General',
    blocks: [
      { p: 'In all matters relating to the operation of a competition, our decision is final. Notices under these terms may be sent by email to the address you provided at entry. Headings are for convenience only and do not affect interpretation. If any part of these terms is found unenforceable, the remainder continues to apply. A failure to enforce any right does not waive that right for the future. These terms are personal to you and may not be transferred; we may transfer our rights and obligations under these terms without affecting your rights.' },
      { p: 'These terms may be updated from time to time. The version published on our website at the time of your entry applies.' },
    ],
  },
  {
    id: 's22',
    label: 'Governing Law',
    blocks: [
      { p: 'These terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or related to these terms are subject to the exclusive jurisdiction of the courts of England and Wales. If you are a consumer resident elsewhere, you retain the benefit of any mandatory consumer protections under the law of your own country of residence, and nothing in these terms affects those rights.' },
    ],
  },
]

export default function TermsPage() {
  return (
    <>
      <Header />

      <div className="legal-hero">
        <div className="container">
          <div className="legal-hero-badge">Legal</div>
          <h1 className="legal-hero-title">Competition Terms &amp; Conditions</h1>
          <p className="legal-hero-sub">Please read these terms carefully before entering any Premium Watch Club competition.</p>
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
