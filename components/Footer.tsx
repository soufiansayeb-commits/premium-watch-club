'use client'

import { useState } from 'react'
import Link from 'next/link'
import SocialIconLinks from '@/components/SocialIconLinks'
import { SOCIAL_LINKS } from '@/lib/social'

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
                <li><Link href="/#faq">FAQ</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Editorial</h4>
              <ul>
                <li><Link href="/journal">Journal</Link></li>
                <li><Link href="/journal/weekly">Weekly</Link></li>
                <li><Link href="/journal/monthly">Monthly</Link></li>
                <li><Link href="/journal/special">Special</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Follow</h4>
              <ul>
                {SOCIAL_LINKS.map(social => (
                  <li key={social.name}>
                    <a href={social.href} aria-label={social.ariaLabel} target="_blank" rel="noopener noreferrer">
                      {social.name}
                    </a>
                  </li>
                ))}
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

          <p className="footer-legal">Premium Watch Club is a skill-based competition platform. Promoter: PREMIUM WATCH CLUB LTD is a company registered in England and Wales (company number 17233368). Registered office: 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. A correct answer to a skill question is required to win. All competitions are subject to full terms and conditions. 18+ only. Please compete responsibly.</p>

          <div className="footer-meta-end">
            <SocialIconLinks />
            <div className="footer-policies">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/#faq">FAQ</Link>
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
