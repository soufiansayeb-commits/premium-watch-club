export default function StatsBar() {
  return (
    <section id="stats-bar">
      <div className="container">
        <div className="stats-inner">
          <div className="stat-item reveal">
            <div className="stat-val">£260K</div>
            <div className="stat-lbl">In Prizes Awarded</div>
          </div>
          <div className="stat-item reveal d1">
            <div className="stat-val">8,500+</div>
            <div className="stat-lbl">Entries Placed</div>
          </div>
          <div className="stat-item reveal d2">
            <div className="stat-val">24</div>
            <div className="stat-lbl">Verified Winners</div>
          </div>
          <div className="stat-item reveal d3">
            <div className="stat-val">4.8 <span style={{ color: '#00B67A' }}>★</span></div>
            <div className="stat-lbl">Trustpilot Score</div>
          </div>
        </div>
      </div>
    </section>
  )
}
