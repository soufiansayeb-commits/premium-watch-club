import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SocialIconLinks from '@/components/SocialIconLinks'

export const metadata = {
  title: 'Contact Us — Premium Watch Club',
  description: 'Contact Premium Watch Club about competitions, entries, partnerships or general enquiries. Email info@premiumwatchclub.com and we will respond as soon as possible.',
}

export default function ContactPage() {
  return (
    <>
      <Header />

      <div className="page-hero">
        <div className="container">
          <div className="section-eyebrow">Get in Touch</div>
          <h1 className="page-hero-headline">Contact Premium Watch Club</h1>
          <p className="page-hero-sub">
            For questions about competitions, entries, partnerships or general enquiries, contact us directly.
          </p>
        </div>
      </div>

      <main className="page-content-wrap page-content-wide">
        <div className="container">

          <div className="contact-panel">
            <div className="contact-panel-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2.5 6.5L12 13l9.5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <span className="contact-panel-label">Email us</span>

            <a href="mailto:info@premiumwatchclub.com" className="contact-email-link">
              info@premiumwatchclub.com
            </a>

            <p className="contact-panel-note">We aim to respond as soon as possible.</p>

            <div className="contact-panel-rule" aria-hidden="true" />

            <p className="contact-social-intro">You may also follow us on Instagram, Facebook and YouTube.</p>
            <SocialIconLinks
              className="contact-social-row"
              itemClassName="contact-social-btn"
              size={17}
            />
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
