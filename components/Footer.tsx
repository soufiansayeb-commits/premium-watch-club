import Link from 'next/link'

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand-assets/WhatsApp Image 2026-04-21 at 18.26.41.jpeg" alt="PWC Logo" />
              </div>
              <span className="footer-logo-name">Premium Watch Club</span>
            </div>
            <p className="footer-desc">A curated destination for watch collectors. One competition at a time — done properly.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Competition</h4>
              <ul>
                <li><Link href="/competitions/omega-speedmaster-moonwatch">Current Draw</Link></li>
                <li><Link href="/#how">How It Works</Link></li>
                <li><Link href="/#winners">Past Winners</Link></li>
                <li><Link href="/competitions/closed">Closed Draws</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Information</h4>
              <ul>
                <li><Link href="/terms">Competition Terms</Link></li>
                <li><Link href="/faq">FAQs</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Editorial</h4>
              <ul>
                <li><Link href="/#journal">Journal</Link></li>
                <li><Link href="/#journal">Watch Guides</Link></li>
                <li><Link href="/#journal">Brand Heritage</Link></li>
                <li><Link href="/#journal">Collecting Advice</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Follow</h4>
              <ul>
                <li><Link href="#">Instagram</Link></li>
                <li><Link href="#">Facebook</Link></li>
                <li><Link href="#">YouTube</Link></li>
                <li><Link href="#">X / Twitter</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-legal">Premium Watch Club is a skill-based competition platform. Promoter: PWC Ltd, registered in England &amp; Wales. A correct answer to a skill question is required to win. All competitions are subject to full terms and conditions available on request. 18+ only. Please compete responsibly.</p>
          <div className="social-row">
            <Link href="#" className="social-btn" aria-label="Instagram">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor"/></svg>
            </Link>
            <Link href="#" className="social-btn" aria-label="Facebook">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" stroke="currentColor" strokeWidth="1.5"/></svg>
            </Link>
            <Link href="#" className="social-btn" aria-label="YouTube">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="M10 9l6 3-6 3V9z" fill="currentColor"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
