import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Contact Us — Premium Watch Club',
}

export default function ContactPage() {
  return (
    <>
      <Header />

      <div className="page-hero">
        <div className="container">
          <div className="section-eyebrow">Get in Touch</div>
          <h1 className="page-hero-headline">Contact Us</h1>
          <p className="page-hero-sub">Our team is available to assist you. We respond to all enquiries within 24–48 business hours.</p>
        </div>
      </div>

      <main className="page-content-wrap page-content-wide">
        <div className="container">

          <div className="contact-cards-grid">
            <div className="contact-card">
              <div className="contact-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>General Support</h3>
              <p>Questions about entering a competition, your account, payments, or ticket queries.</p>
              <a href="mailto:support@premiumwatchclub.com" className="contact-card-email">support@premiumwatchclub.com</a>
            </div>

            <div className="contact-card">
              <div className="contact-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Winner Support</h3>
              <p>Dedicated assistance for draw winners regarding prize confirmation, delivery, and logistics.</p>
              <a href="mailto:support@premiumwatchclub.com" className="contact-card-email">support@premiumwatchclub.com</a>
            </div>

            <div className="contact-card">
              <div className="contact-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Partnership Enquiries</h3>
              <p>Brand collaborations, dealer partnerships, and editorial opportunities with the PWC team.</p>
              <a href="mailto:support@premiumwatchclub.com" className="contact-card-email">support@premiumwatchclub.com</a>
            </div>
          </div>

          <div className="contact-form-card">
            <div className="contact-form-header">
              <h2>Send Us a Message</h2>
              <p>Use the form below and we will get back to you within 24–48 business hours.</p>
            </div>
            <div className="contact-form-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact-name" className="form-label">Full Name</label>
                  <input
                    type="text"
                    id="contact-name"
                    className="form-input"
                    placeholder="Your full name"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-email" className="form-label">Email Address</label>
                  <input
                    type="email"
                    id="contact-email"
                    className="form-input"
                    placeholder="your@email.com"
                    disabled
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="contact-subject" className="form-label">Subject</label>
                <select id="contact-subject" className="form-input form-select" disabled>
                  <option value="">Select a subject</option>
                  <option value="general">General Support</option>
                  <option value="winner">Winner Support</option>
                  <option value="payment">Payment Query</option>
                  <option value="refund">Refund Request</option>
                  <option value="partnership">Partnership Enquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="contact-message" className="form-label">Message</label>
                <textarea
                  id="contact-message"
                  className="form-input form-textarea"
                  placeholder="Please describe your enquiry in detail..."
                  rows={6}
                  disabled
                ></textarea>
              </div>
              <div className="contact-form-footer">
                <p className="contact-form-note">Form submission is currently unavailable. Please email us directly at support@premiumwatchclub.com.</p>
                <button className="btn-contact-submit" disabled>
                  Send Message
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7h9M7.5 3.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
