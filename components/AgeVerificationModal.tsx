'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pwc_age_verified'

export default function AgeVerificationModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function handleEnter() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  function handleExit() {
    window.location.href = 'https://www.google.com'
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        .av-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .av-modal {
          background: #fff;
          border-radius: 6px;
          padding: 40px 36px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          box-shadow: 0 8px 40px rgba(0,0,0,0.25);
        }
        .av-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 10px;
        }
        .av-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #111;
          margin-bottom: 16px;
        }
        .av-body {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #555;
          line-height: 1.65;
          margin-bottom: 28px;
        }
        .av-btn-enter {
          display: block;
          width: 100%;
          padding: 13px;
          background: #0A1F44;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          margin-bottom: 10px;
          transition: background 0.2s;
        }
        .av-btn-enter:hover { background: #122a5e; }
        .av-separator {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: #bbb;
          margin-bottom: 10px;
        }
        .av-btn-exit {
          display: block;
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #999;
          cursor: pointer;
          margin-bottom: 20px;
          transition: border-color 0.2s, color 0.2s;
        }
        .av-btn-exit:hover { border-color: #bbb; color: #666; }
        .av-footer {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: #bbb;
        }
        @media (max-width: 480px) {
          .av-modal { padding: 32px 24px 28px; }
        }
      `}</style>

      <div className="av-backdrop" role="dialog" aria-modal="true" aria-labelledby="av-title">
        <div className="av-modal">
          <p className="av-eyebrow">Age Verification</p>
          <h2 className="av-title" id="av-title">Are you 18 or older?</h2>
          <p className="av-body">
            By clicking enter, I certify that I am over the age of 18 and will comply with the above statement.
          </p>
          <button className="av-btn-enter" onClick={handleEnter}>Enter</button>
          <p className="av-separator">or</p>
          <button className="av-btn-exit" onClick={handleExit}>Exit</button>
          <p className="av-footer">Always enjoy responsibily.</p>
        </div>
      </div>
    </>
  )
}
