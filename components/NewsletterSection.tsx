'use client'

import { useState } from 'react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [checked, setChecked] = useState(false)

  return (
    <section className="newsletter-section">
      <div className="container">
        <div className="newsletter-inner reveal">
          <div className="newsletter-copy">
            <span className="newsletter-label">Subscribe to</span>
            <h2 className="newsletter-title">The PWC newsletter</h2>
            <p className="newsletter-text">
              Get early access to new watch drops, live draw alerts, winner stories, and private member updates.
            </p>
          </div>

          <div className="newsletter-form">
            <label className="newsletter-consent">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
              />
              <span>I confirm I would like to be added to the Premium Watch Club mailing list</span>
            </label>

            <div className="newsletter-input-row">
              <input
                className="newsletter-input"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button
                type="button"
                className="newsletter-button"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
