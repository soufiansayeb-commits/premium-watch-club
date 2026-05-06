const TpStar = () => (
  <div className="tp-star">
    <svg viewBox="0 0 20 20" fill="white">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
    </svg>
  </div>
)

export default function TrustBar() {
  return (
    <section id="trust-bar">
      <div className="container">
        <div className="trust-inner reveal">
          <div className="trust-left">
            <div className="trust-tagline">Built on <em>transparency</em><br />and trust</div>
            <p className="trust-sub">Every watch sourced from authorised dealers. Every draw publicly streamed and independently verified. Every winner photographed and documented.</p>
          </div>
          <div className="trust-right">
            <div className="trust-stat">
              <div className="trust-stat-val">347</div>
              <div className="trust-stat-lbl">Winners to Date</div>
            </div>
            <div className="trust-stat">
              <div className="trust-stat-val">100%</div>
              <div className="trust-stat-lbl">Draws Verified</div>
            </div>
            <div className="trust-stat">
              <div className="trust-stat-val">£0</div>
              <div className="trust-stat-lbl">Unclaimed Prizes</div>
            </div>
          </div>
        </div>
        <div className="trust-tp reveal">
          <div className="tp-badge">
            <div className="tp-word">Excellent</div>
            <div className="tp-stars-row">
              <TpStar /><TpStar /><TpStar /><TpStar /><TpStar />
            </div>
          </div>
          <div className="tp-divider"></div>
          <div className="tp-score">4.8 / 5</div>
          <div className="tp-divider"></div>
          <div className="tp-count">Based on 1,247 verified reviews</div>
        </div>
      </div>
    </section>
  )
}
