'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { itemCount, openDrawer } = useCart()
  const hasItem = itemCount > 0

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
          <li><Link href="/#competitions-grid" onClick={closeMenu}>Competitions</Link></li>
          <li><Link href="/#how" onClick={closeMenu}>How It Works</Link></li>
          <li><Link href="/#winners" onClick={closeMenu}>Winners</Link></li>
          <li><Link href="/#journal" onClick={closeMenu}>Journal</Link></li>
          <li><Link href="/faq" onClick={closeMenu}>FAQ</Link></li>
        </ul>

        <div className="nav-right">
          {/* Cart icon — opens branded cart drawer */}
          <button
            className="nav-cart-btn"
            onClick={openDrawer}
            aria-label={hasItem ? `Open basket — ${itemCount} ${itemCount === 1 ? 'entry' : 'entries'}` : 'Open basket'}
          >
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
              <circle cx="7" cy="16.5" r="1.5" fill="currentColor" />
              <circle cx="14" cy="16.5" r="1.5" fill="currentColor" />
              <path d="M1 1.5h2.5l3 10.5h8.5L17.5 6H5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {hasItem && <span className="nav-cart-badge" aria-hidden="true">{itemCount}</span>}
          </button>

          <Link href="/#competitions-grid" className="btn-nav-enter">Enter Now</Link>

          <button
            className={`hamburger${menuOpen ? ' is-open' : ''}`}
            id="hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
