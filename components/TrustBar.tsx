import Image from 'next/image'

export default function TrustBar() {
  return (
    <section id="trust-bar">
      <div className="container">
        <div className="trust-inner reveal">
          <div className="trust-left">
            <div className="trust-tagline">Built on <em>transparency</em><br className="trust-br" /> and trust</div>
            <p className="trust-sub">Every watch sourced from authorised dealers. Every draw publicly streamed and independently verified. Every winner photographed and documented.</p>
            <p className="trust-rd-line">
              Every winner is{' '}
              <a
                href="https://www.randomdraws.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="trust-rd-link"
              >
                independently verified by RandomDraws
              </a>
            </p>
          </div>
          <div className="trust-right">
            <div className="trust-stat">
              <div className="trust-stat-val">347</div>
              <div className="trust-stat-lbl">Winners to Date</div>
              <div className="trust-stat-bar"></div>
            </div>
            <div className="trust-stat">
              <div className="trust-stat-val">100%</div>
              <div className="trust-stat-lbl">Draws Verified</div>
              <div className="trust-stat-bar"></div>
            </div>
            <div className="trust-stat">
              <div className="trust-stat-val">$0</div>
              <div className="trust-stat-lbl">Unclaimed Prizes</div>
              <div className="trust-stat-bar"></div>
            </div>
          </div>
        </div>
        <div className="trust-tp reveal">
          <p className="tp-count">Based on 1,247 reviews</p>
          <Image
            src="/brand-assets/trustpilot-stars.png"
            alt="Trustpilot rating"
            width={935}
            height={180}
            className="tp-stars-img"
          />
          <Image
            src="/brand-assets/trustpilot-wordmark.png"
            alt="Trustpilot"
            width={935}
            height={236}
            className="tp-wordmark-img"
          />
        </div>
      </div>
    </section>
  )
}
