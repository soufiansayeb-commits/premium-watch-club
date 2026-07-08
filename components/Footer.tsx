'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setJoined(true)
  }

  return (
    <footer className="site-footer">
      <div className="container">

        {/* ── Top: newsletter + link columns ── */}
        <div className="footer-main">

          <div className="footer-join">
            <h3 className="footer-join-title">Join the club</h3>
            <p className="footer-join-sub">
              Get early access to new drops, winner updates and private member announcements.
            </p>

            {joined ? (
              <p className="footer-join-done">
                <span className="footer-join-check" aria-hidden="true">✓</span>
                You’re on the list. Welcome to the club.
              </p>
            ) : (
              <form className="footer-join-form" onSubmit={handleJoin}>
                <input
                  className="footer-join-input"
                  type="email"
                  placeholder="Email address"
                  aria-label="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="footer-join-btn">Join Now</button>
              </form>
            )}

            <p className="footer-join-fine">No spam, just drops, draws and winners. 18+ only.</p>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h4>Competition</h4>
              <ul>
                <li><Link href="/weekly">Current Draw</Link></li>
                <li><Link href="/#how-it-works">How It Works</Link></li>
                <li><Link href="/past-winners">Past Winners</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Information</h4>
              <ul>
                <li><Link href="/terms">Competition Terms</Link></li>
                <li><Link href="/about-us">About Us</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Editorial</h4>
              <ul>
                <li><Link href="/journal">Journal</Link></li>
                <li><Link href="/journal">Watch Guides</Link></li>
                <li><Link href="/journal">Brand Heritage</Link></li>
                <li><Link href="/journal">Collecting Advice</Link></li>
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

        {/* ── Compact horizontal meta bar: brand · legal · socials/policies ── */}
        <div className="footer-meta">
          <div className="footer-meta-brand">
            <span className="footer-logo-name">Premium Watch Club</span>
            <p className="footer-desc">A curated destination for watch collectors. One competition at a time, done properly.</p>
          </div>

          <p className="footer-legal">Premium Watch Club is a skill-based competition platform. Promoter: PWC Ltd, registered in England &amp; Wales. A correct answer to a skill question is required to win. All competitions are subject to full terms and conditions available on request. 18+ only. Please compete responsibly.</p>

          <div className="footer-meta-end">
            <div className="social-row">
              <Link href="#" className="social-btn" aria-label="Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor"/></svg>
              </Link>
              <Link href="#" className="social-btn" aria-label="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" stroke="currentColor" strokeWidth="1.5"/></svg>
              </Link>
              <Link href="#" className="social-btn" aria-label="YouTube">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="M10 9l6 3-6 3V9z" fill="currentColor"/></svg>
              </Link>
            </div>
            <div className="footer-policies">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/about-us">About Us</Link>
              <span className="footer-copy">© {new Date().getFullYear()} Premium Watch Club</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Oversized two-line branded wordmark ── */}
      <div className="footer-wordmark" aria-hidden="true">
        <span>PremiumWatch</span>
        <span>Club</span>
      </div>
    </footer>
  )
}
