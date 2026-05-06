import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy — Premium Watch Club',
}

export default function PrivacyPage() {
  return (
    <>
      <Header />

      <div className="page-hero">
        <div className="container">
          <div className="section-eyebrow">Legal</div>
          <h1 className="page-hero-headline">Privacy Policy</h1>
          <p className="page-hero-sub">How Premium Watch Club collects, uses, and protects your personal data.</p>
        </div>
      </div>

      <main className="page-content-wrap">
        <div className="page-content">

          <div className="legal-disclaimer">
            <strong>Draft Content Notice:</strong> This is draft content — for development purposes only. Must be reviewed by qualified legal counsel before launch.
          </div>

          <section className="legal-section">
            <h2>1. Who We Are</h2>
            <p>Premium Watch Club is operated by PWC Ltd, registered in England and Wales. We are the data controller responsible for your personal information collected through this website and our competition entry processes.</p>
            <p>If you have any questions about how we handle your data, please contact us at support@premiumwatchclub.com. We are committed to handling your personal information with care, transparency, and in full compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>
          </section>

          <section className="legal-section">
            <h2>2. What Data We Collect</h2>
            <p>We collect personal data that you provide directly to us, as well as data collected automatically when you use our website. The categories of data we collect include:</p>
            <ul>
              <li>Name and contact details (email address, postal address)</li>
              <li>Date of birth (for age verification purposes)</li>
              <li>Transaction and payment data</li>
              <li>Competition entry records, including ticket numbers and skill question responses</li>
              <li>Communications you send to us</li>
              <li>Technical data collected automatically (IP address, browser type, device information)</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Order &amp; Payment Data</h2>
            <p>When you purchase competition entries, we collect your billing name, email address, and shipping address. Payment card details are processed securely by our payment provider and are never stored on PWC systems. We retain transaction records for a minimum of 7 years to comply with financial and tax regulations.</p>
            <p>Your order data is used to issue tickets, confirm your entry, contact you if you win, and deliver your prize if applicable. It may also be retained to investigate disputes or fraud.</p>
          </section>

          <section className="legal-section">
            <h2>4. Email Communications</h2>
            <p>If you purchase entries or create an account, we will send you transactional emails related to your entries, draw results, and account activity. These are necessary for the performance of our contract with you and cannot be opted out of while you hold an active account.</p>
            <p>With your explicit consent, we may also send you marketing communications about new competitions, editorial content, and exclusive member offers. You can unsubscribe from marketing emails at any time using the link in any email we send.</p>
          </section>

          <section className="legal-section">
            <h2>5. Cookies &amp; Analytics</h2>
            <p>Our website uses cookies and similar tracking technologies to improve your browsing experience and understand how our site is used. These include essential cookies required for the site to function, as well as optional analytics cookies.</p>
            <p>We use analytics data to understand visitor behaviour in aggregate, improve our competition pages, and measure the performance of our communications. We do not sell cookie or analytics data to third parties. You can manage your cookie preferences through the cookie banner displayed on your first visit.</p>
          </section>

          <section className="legal-section">
            <h2>6. How We Store Your Data</h2>
            <p>Your personal data is stored on secure servers located within the United Kingdom and European Economic Area. We implement appropriate technical and organisational measures to protect your data against unauthorised access, loss, or destruction, including encryption, access controls, and regular security assessments.</p>
            <p>We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected, comply with legal obligations, resolve disputes, and enforce our agreements. Account data is retained for 3 years after your last active entry, unless you request earlier deletion.</p>
          </section>

          <section className="legal-section">
            <h2>7. Your Rights</h2>
            <p>Under UK GDPR, you have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Right of access</strong> — you may request a copy of the personal data we hold about you</li>
              <li><strong>Right to rectification</strong> — you may request correction of inaccurate or incomplete data</li>
              <li><strong>Right to erasure</strong> — you may request deletion of your data in certain circumstances</li>
              <li><strong>Right to restriction</strong> — you may request that we limit how we process your data</li>
              <li><strong>Right to data portability</strong> — you may request your data in a machine-readable format</li>
              <li><strong>Right to object</strong> — you may object to processing based on legitimate interests or direct marketing</li>
            </ul>
            <p>To exercise any of these rights, please contact us as set out below. We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at ico.org.uk.</p>
          </section>

          <section className="legal-section">
            <h2>8. Contact for Privacy Requests</h2>
            <p>For any privacy-related enquiries, data subject access requests, or to exercise any of your rights, please contact us at:</p>
            <p><strong>Email:</strong> <a href="mailto:support@premiumwatchclub.com" className="legal-link">support@premiumwatchclub.com</a></p>
            <p>We take all privacy requests seriously and will acknowledge your request within 5 business days.</p>
            <p>This policy was last reviewed in May 2026.</p>
          </section>

        </div>
      </main>

      <Footer />
    </>
  )
}
