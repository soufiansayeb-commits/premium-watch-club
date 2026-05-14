'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <nav id="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo" onClick={closeMenu}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-assets/pwc-logo-nav.png"
            alt="Premium Watch Club"
            className="nav-logo-img"
          />
        </Link>

        <ul className={`nav-links${menuOpen ? ' open' : ''}`} id="navLinks">
          <li><Link href="/competitions/omega-speedmaster-moonwatch" onClick={closeMenu}>Competition</Link></li>
          <li><Link href="/#how" onClick={closeMenu}>How It Works</Link></li>
          <li><Link href="/#winners" onClick={closeMenu}>Winners</Link></li>
          <li><Link href="/#journal" onClick={closeMenu}>Journal</Link></li>
          <li><Link href="/faq" onClick={closeMenu}>FAQ</Link></li>
        </ul>

        <div className="nav-right">
          <Link href="/account/signin" className="btn-signin">Sign In</Link>
          <Link href="/competitions/omega-speedmaster-moonwatch" className="btn-nav-enter">Enter Now</Link>
          <button
            className={`hamburger${menuOpen ? ' is-open' : ''}`}
            id="hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <>
                <span></span><span></span><span></span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
