import Link from 'next/link'

export default function CompetitionFooter() {
  return (
    <footer id="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-logo-name">Premium Watch Club</div>
          <nav className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/#how">How It Works</Link>
            <Link href="/#winners">Winners</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
        <p className="footer-legal">
          Premium Watch Club is a skill-based competition platform. A correct answer to a skill question is required to win.
          All competitions are subject to full terms and conditions available on request. 18+ only. Please compete responsibly.
          Promoter: PWC Ltd, registered in England &amp; Wales.
        </p>
      </div>
    </footer>
  )
}
