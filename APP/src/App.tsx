import './App.css'

function App() {
  return (
    <div className="os-root">
      <aside className="os-sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <p className="brand-label">Workspace</p>
          <h1 className="brand-title">LogicCommons</h1>
        </div>

        <nav className="nav-stack" aria-label="Main sections">
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item">Projects</div>
          <div className="nav-item">Tasks</div>
          <div className="nav-item">Settings</div>
        </nav>

        <div className="sidebar-footer surface">
          <p className="meta-label">Today</p>
          <p className="meta-value">4 active workstreams</p>
        </div>
      </aside>

      <header className="os-topbar">
        <div>
          <p className="meta-label">Public Logic OS</p>
          <strong>LogicCommons Operations</strong>
        </div>
        <div className="topbar-actions">
          <button className="button" type="button">
            Export
          </button>
          <button className="button primary" type="button">
            New Entry
          </button>
        </div>
      </header>

      <main className="os-main">
        <section className="stats-row" aria-label="Key metrics">
          <article className="surface metric-card">
            <p className="meta-label">Open Workstreams</p>
            <p className="metric-value">12</p>
          </article>
          <article className="surface metric-card">
            <p className="meta-label">Pending Decisions</p>
            <p className="metric-value">7</p>
          </article>
          <article className="surface metric-card">
            <p className="meta-label">Due This Week</p>
            <p className="metric-value">18</p>
          </article>
        </section>

        <section className="grid cols-2">
          <article className="surface panel-card">
            <h2 className="panel-title">Operational Summary</h2>
            <p className="panel-copy">
              Coordination across projects is stable, with two new initiatives added and one
              dependency requiring owner assignment.
            </p>
          </article>
          <article className="surface panel-card">
            <h2 className="panel-title">Shared Context</h2>
            <p className="panel-copy">
              Team notes, recent decisions, and archive highlights are synchronized and available
              for cross-functional review.
            </p>
          </article>
          <article className="surface panel-card">
            <h2 className="panel-title">Open Workstreams</h2>
            <ul className="panel-list">
              <li>Pipeline orchestration refresh</li>
              <li>Municipal outreach package</li>
              <li>Governance policy review</li>
            </ul>
          </article>
          <article className="surface panel-card">
            <h2 className="panel-title">Decision Queue</h2>
            <ul className="panel-list">
              <li>Approve Q2 implementation budget</li>
              <li>Confirm records retention baseline</li>
              <li>Select pilot program timeline</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
