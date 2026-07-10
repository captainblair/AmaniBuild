import Image from "next/image";

const SIDEBAR_ITEMS = ["dashboard", "projects", "map", "inventory", "reports", "team", "settings"];

/** Enterprise dashboard mockup — size/perspective from Homepage1.png */
export function DashboardPreview() {
  return (
    <div className="mockup-frame">
      <div className="mockup-body">
        <aside className="mockup-sidebar" aria-hidden>
          <div className="mockup-sidebar__logo" />
          {SIDEBAR_ITEMS.map((item, index) => (
            <div key={item} className={`mockup-nav-item${index === 0 ? " active" : ""}`} />
          ))}
        </aside>

        <div className="mockup-main">
          <div className="mockup-main__top">
            <p className="mockup-greeting">Good morning, John</p>
            <div className="mockup-main__actions">
              <span className="mockup-pill" />
              <span className="mockup-avatar" />
            </div>
          </div>

          <div className="mockup-kpis">
            <div className="mockup-kpi">
              <div className="label">Active Projects</div>
              <div className="value">12</div>
            </div>
            <div className="mockup-kpi">
              <div className="label">Total Workers</div>
              <div className="value">156</div>
            </div>
            <div className="mockup-kpi">
              <div className="label">Total Spend</div>
              <div className="value orange">KES 2.4M</div>
            </div>
            <div className="mockup-kpi mockup-kpi--progress">
              <div className="label">Site Progress</div>
              <div className="mockup-ring" aria-hidden>
                <svg viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="3.5"
                    strokeDasharray="65 100"
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span>65%</span>
              </div>
            </div>
          </div>

          <div className="mockup-panels">
            <div className="mockup-chart">
              <div className="label">Project Progress</div>
              <svg viewBox="0 0 360 88" className="mockup-chart-svg" aria-hidden>
                <defs>
                  <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111827" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#111827" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 62 L40 48 L80 54 L120 38 L160 44 L200 28 L240 34 L280 22 L320 30 L360 18 L360 88 L0 88 Z"
                  fill="url(#heroChartFill)"
                />
                <path
                  d="M0 62 L40 48 L80 54 L120 38 L160 44 L200 28 L240 34 L280 22 L320 30 L360 18"
                  fill="none"
                  stroke="#111827"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="mockup-side-stack">
              <div className="mockup-card">
                <div className="label">Pending Tasks</div>
                <ul className="mockup-activity">
                  <li>
                    <span className="mockup-dot-task" /> Foundation pour — Block B
                  </li>
                  <li>
                    <span className="mockup-dot-task mockup-dot-task--orange" /> Material delivery check
                  </li>
                  <li>
                    <span className="mockup-dot-task mockup-dot-task--green" /> Safety walkthrough
                  </li>
                </ul>
              </div>
              <div className="mockup-card">
                <div className="label">Site Snapshot</div>
                <div className="mockup-snapshot">
                  <Image
                    src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&q=80&auto=format&fit=crop"
                    alt=""
                    fill
                    sizes="200px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
