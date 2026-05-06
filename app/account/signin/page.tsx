import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Member Sign In — Premium Watch Club',
}

export default function SignInPage() {
  return (
    <>
      <Header />

      <main className="signin-page">
        <div className="signin-card">
          <div className="signin-brand">
            <div className="signin-emblem">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="0.8" fill="none"/>
                <rect x="11.25" y="4" width="1.5" height="5" rx="0.75" fill="currentColor"/>
                <rect x="11.25" y="15" width="1.5" height="5" rx="0.75" fill="currentColor"/>
                <rect x="4" y="11.25" width="5" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="15" y="11.25" width="5" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="11.5" y="7" width="1" height="6" rx="0.5" fill="currentColor" transform="rotate(-30 12 12)"/>
                <rect x="11.75" y="5" width="0.75" height="7" rx="0.375" fill="currentColor" transform="rotate(20 12 12)"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <span className="signin-brand-name">Premium Watch Club</span>
          </div>

          <div className="signin-header">
            <h1 className="signin-title">Member Sign In</h1>
            <p className="signin-subtitle">Access your entries, competition history, and account details.</p>
          </div>

          <div className="signin-form">
            <div className="form-group">
              <label htmlFor="signin-email" className="form-label">Email Address</label>
              <input
                type="email"
                id="signin-email"
                className="form-input"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="signin-password" className="form-label">Password</label>
              <input
                type="password"
                id="signin-password"
                className="form-input"
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>
            <button className="btn-signin-submit" type="button">
              Sign In
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M7.5 3.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="signin-forgot">
              <Link href="/account/forgot-password">Forgot your password?</Link>
            </div>
          </div>

          <div className="signin-divider">
            <span>New to Premium Watch Club?</span>
          </div>

          <div className="signin-register">
            <Link href="/account/register" className="btn-create-account">
              Create an Account
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
