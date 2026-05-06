export default function StatsBar() {
  return (
    <section id="stats-bar">
      <div className="container">
        <div className="stats-inner">
          <div className="stat-item reveal">
            <div className="stat-val">£2.58M</div>
            <div className="stat-lbl">In Prizes Awarded</div>
          </div>
          <div className="stat-item reveal d1">
            <div className="stat-val">12,847</div>
            <div className="stat-lbl">Club Members</div>
          </div>
          <div className="stat-item reveal d2">
            <div className="stat-val">347</div>
            <div className="stat-lbl">Verified Winners</div>
          </div>
          <div className="stat-item reveal d3">
            <div className="stat-val">4.8 ★</div>
            <div className="stat-lbl">Trustpilot Score</div>
          </div>
        </div>
      </div>
    </section>
  )
}
