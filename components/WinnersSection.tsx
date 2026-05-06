const StarSvg = () => (
  <svg className="wc-star" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
)

const FiveStars = () => (
  <div className="wc-stars">
    <StarSvg /><StarSvg /><StarSvg /><StarSvg /><StarSvg />
  </div>
)

export default function WinnersSection() {
  return (
    <section id="winners">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">Hall of Honour</div>
          <h2 className="section-headline">What our winners say</h2>
          <p className="section-sub">Every draw is live. Every winner is verified. Every watch is real — sourced from authorised dealers.</p>
        </div>

        <div className="winners-grid">

          <div className="winner-card reveal">
            <div className="wc-top">
              <FiveStars />
              <div className="wc-prize-badge">Rolex Submariner</div>
            </div>
            <p className="wc-quote">I never believed I&apos;d own a Rolex. Premium Watch Club changed that entirely. The draw was live, the prize real — the whole experience was extraordinary.</p>
            <div className="wc-meta">
              <div className="wc-avatar">JT</div>
              <div>
                <div className="wc-name">James T. — London</div>
                <div className="wc-prize">Won March 2026 · Rolex Submariner Date</div>
              </div>
            </div>
          </div>

          <div className="winner-card reveal d1">
            <div className="wc-top">
              <FiveStars />
              <div className="wc-prize-badge">Patek Philippe</div>
            </div>
            <p className="wc-quote">As a collector for twenty years, winning the Patek was surreal. Impeccably run — professional, transparent, and genuinely thrilling from start to finish.</p>
            <div className="wc-meta">
              <div className="wc-avatar">SM</div>
              <div>
                <div className="wc-name">Sophie M. — Edinburgh</div>
                <div className="wc-prize">Won January 2026 · Patek Philippe Aquanaut</div>
              </div>
            </div>
          </div>

          <div className="winner-card reveal d2">
            <div className="wc-top">
              <FiveStars />
              <div className="wc-prize-badge">Audemars Piguet</div>
            </div>
            <p className="wc-quote">I acquired a piece of horological history for under £10. Arrived fully insured the next morning. The most transparent competition I&apos;ve entered. The real deal.</p>
            <div className="wc-meta">
              <div className="wc-avatar">MD</div>
              <div>
                <div className="wc-name">Marcus D. — Amsterdam</div>
                <div className="wc-prize">Won December 2025 · Audemars Piguet Royal Oak</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
