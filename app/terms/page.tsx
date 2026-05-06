import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Competition Terms & Conditions — Premium Watch Club',
}

export default function TermsPage() {
  return (
    <>
      <Header />

      <div className="page-hero">
        <div className="container">
          <div className="section-eyebrow">Legal</div>
          <h1 className="page-hero-headline">Competition Terms &amp; Conditions</h1>
          <p className="page-hero-sub">Please read these terms carefully before entering any Premium Watch Club competition.</p>
        </div>
      </div>

      <main className="page-content-wrap">
        <div className="page-content">

          <div className="legal-disclaimer">
            <strong>Draft Content Notice:</strong> This is draft content — for development purposes only. Must be reviewed by qualified legal counsel before launch.
          </div>

          <section className="legal-section">
            <h2>1. About This Competition</h2>
            <p>Premium Watch Club (&quot;PWC&quot;, &quot;we&quot;, &quot;us&quot;) operates skill-based competitions in accordance with UK competition law. Each competition offers participants the opportunity to win a luxury timepiece by correctly answering a skill-based question and purchasing one or more competition entries.</p>
            <p>PWC Ltd is registered in England and Wales. Our competitions are not lotteries and are not regulated by the Gambling Commission. The inclusion of a mandatory skill question distinguishes our competitions from games of chance.</p>
          </section>

          <section className="legal-section">
            <h2>2. Eligibility</h2>
            <p>Entry is open to individuals who are:</p>
            <ul>
              <li>Aged 18 years or over at the time of entry</li>
              <li>Residents of the United Kingdom, European Union member states, or the United States of America</li>
              <li>Not employees, contractors, directors, or close family members of PWC Ltd or its associated partners</li>
            </ul>
            <p>By entering, you confirm that you meet all eligibility criteria. PWC reserves the right to verify eligibility and disqualify entries where eligibility cannot be confirmed.</p>
          </section>

          <section className="legal-section">
            <h2>3. How to Enter</h2>
            <p>To enter a competition, participants must:</p>
            <ul>
              <li>Select the number of entries they wish to purchase (subject to the maximum per-competition limit)</li>
              <li>Correctly answer the mandatory skill-based question</li>
              <li>Complete the checkout process and provide valid payment</li>
            </ul>
            <p>Each valid, paid entry is assigned a unique ticket number. Entry is complete only upon successful payment processing and confirmation by PWC.</p>
          </section>

          <section className="legal-section">
            <h2>4. Skill-Based Question Requirement</h2>
            <p>All competitions include a mandatory skill question. A correct answer is required for an entry to be valid. The skill question tests general knowledge and is designed to be answerable by a reasonable member of the public without specialist knowledge.</p>
            <p>Entries submitted with an incorrect answer to the skill question will not be entered into the draw. No refund will be issued for entries invalidated solely by an incorrect skill answer, except where required by law.</p>
            <p>A free postal entry route is available. See Section 8 for details.</p>
          </section>

          <section className="legal-section">
            <h2>5. The Draw Process</h2>
            <p>The winning entry is selected by random draw from all valid entries received before the competition close date. All draws are conducted live and streamed publicly via our official channels. The draw is facilitated by an independent third-party randomisation tool to ensure fairness and transparency.</p>
            <p>Each valid ticket number has an equal probability of selection. The draw date may be extended if the minimum ticket threshold has not been met; participants will be notified of any changes via email.</p>
          </section>

          <section className="legal-section">
            <h2>6. Winner Notification</h2>
            <p>The winner will be contacted via the email address provided at the time of entry within 48 hours of the draw. PWC will make reasonable attempts to contact the winner over a period of 14 days. If the winner cannot be contacted or does not respond within this period, PWC reserves the right to conduct a redraw.</p>
            <p>The winner&apos;s first name, surname initial, and location will be published on the PWC website and social media channels in accordance with our privacy policy.</p>
          </section>

          <section className="legal-section">
            <h2>7. Prize Delivery</h2>
            <p>Prizes will be delivered to the winner&apos;s confirmed address by fully insured, tracked courier within 14 business days of winner verification. International delivery may take longer; the winner will be advised of timescales. PWC bears all delivery costs.</p>
            <p>Prizes are non-transferable. PWC is not responsible for prizes lost, damaged, or delayed by circumstances outside our reasonable control once dispatched to the carrier.</p>
          </section>

          <section className="legal-section">
            <h2>8. Cash Alternative</h2>
            <p>A cash alternative may be offered at PWC&apos;s discretion. Where offered, the cash value will be no less than 90% of the stated prize retail value. The winner must elect the cash alternative within 7 days of being notified. The cash alternative cannot be claimed in conjunction with the physical prize.</p>
          </section>

          <section className="legal-section">
            <h2>9. Refunds &amp; Failed Payments</h2>
            <p>Entries are non-refundable once the competition draw has taken place. Where a competition is cancelled prior to the draw, all participants will receive a full refund to their original payment method within 10 business days.</p>
            <p>Where a payment fails or is reversed after ticket numbers have been assigned, the associated entries will be voided. PWC will contact the participant to resolve the payment failure before the draw date where possible.</p>
          </section>

          <section className="legal-section">
            <h2>10. Responsible Entry</h2>
            <p>PWC encourages responsible participation. We recommend that participants do not spend more than they can reasonably afford. Competition entry should be treated as entertainment, not as a financial investment strategy.</p>
            <p>If you have concerns about your spending habits, please contact us at support@premiumwatchclub.com or speak to a financial wellbeing adviser.</p>
          </section>

          <section className="legal-section">
            <h2>11. Governing Law</h2>
            <p>These terms and conditions are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or related to these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
            <p>These terms were last reviewed in May 2026 and are subject to change. The version published on our website at the time of entry applies.</p>
          </section>

        </div>
      </main>

      <Footer />
    </>
  )
}
