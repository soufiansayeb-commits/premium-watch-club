'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav id="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-assets/WhatsApp Image 2026-04-21 at 18.26.41.jpeg" alt="Premium Watch Club logo" />
          </div>
          <span className="nav-logo-name">Premium Watch Club</span>
        </Link>

        <ul className={`nav-links${menuOpen ? ' open' : ''}`} id="navLinks">
          <li><Link href="/competitions/omega-speedmaster-moonwatch">Competition</Link></li>
          <li><Link href="/#how">How It Works</Link></li>
          <li><Link href="/#winners">Winners</Link></li>
          <li><Link href="/#journal">Journal</Link></li>
          <li><Link href="/faq">FAQ</Link></li>
        </ul>

        <div className="nav-right">
          <Link href="/account/signin" className="btn-signin">Sign In</Link>
          <Link href="/competitions/omega-speedmaster-moonwatch" className="btn-nav-enter">Enter Now</Link>
          <button
            className="hamburger"
            id="hamburger"
            aria-label="Menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>
  )
}
