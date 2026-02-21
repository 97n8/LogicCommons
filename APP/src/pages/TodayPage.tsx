import { MetricCard } from '../components/shared'
import type { Repo, Branch, WorkflowRun, PR, Issue } from '../github'
import { NA, relativeTime, formatDate, formatTime } from '../helpers'

export default function TodayPage({ repo, openIssueCount, openPRCount, branches, runs, prs, issues }: {
    repo: Repo | null; openIssueCount: number; openPRCount: number
    branches: Branch[]; runs: WorkflowRun[]; prs: PR[]; issues: Issue[]
}) {
    const reviewPRs = prs.filter(p => p.state === 'open' && !p.draft)
    const recentFailures = runs.filter(r => r.conclusion === 'failure').slice(0, 5)
    const recentIssues = issues.filter(i => i.state === 'open').slice(0, 5)

    return (
        <section className="page-today">
            <div className="page-header">
                <div>
                    <h2>{formatDate()}</h2>
                    <p className="today-time">{formatTime()}</p>
                </div>
            </div>

            <div className="stats-row">
                <MetricCard label="Open Issues" value={repo ? openIssueCount : NA} />
                <MetricCard label="Open PRs" value={repo ? openPRCount : NA} />
                <MetricCard label="Branches" value={repo ? branches.length : NA} />
                <MetricCard label="Recent Runs" value={repo ? runs.length : NA} />
            </div>

            {reviewPRs.length > 0 && (
                <div className="today-section">
                    <h3>Needs Review <span className="section-count">{reviewPRs.length}</span></h3>
                    <div className="item-list">
                        {reviewPRs.slice(0, 5).map(p => (
                            <a key={p.number} className="item-row" href={p.html_url} target="_blank" rel="noopener noreferrer">
                                <span className="item-number">#{p.number}</span>
                                <span className="item-main">{p.title}</span>
                                <span className="branch-name">{p.head.ref}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {recentFailures.length > 0 && (
                <div className="today-section">
                    <h3>CI Failures <span className="section-count">{recentFailures.length}</span></h3>
                    <div className="item-list">
                        {recentFailures.map(r => (
                            <a key={r.id} className="item-row" href={r.html_url} target="_blank" rel="noopener noreferrer">
                                <span className="ci-badge ci-failure">failed</span>
                                <span className="item-main">{r.name}</span>
                                <span className="branch-name">{r.head_branch}</span>
                                <span className="item-time">{relativeTime(r.created_at)}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {recentIssues.length > 0 && (
                <div className="today-section">
                    <h3>Open Issues <span className="section-count">{recentIssues.length}</span></h3>
                    <div className="item-list">
                        {recentIssues.map(i => (
                            <a key={i.number} className="item-row" href={i.html_url} target="_blank" rel="noopener noreferrer">
                                <span className="item-number">#{i.number}</span>
                                <span className="item-main">{i.title}</span>
                                <span className="item-time">{relativeTime(i.created_at)}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {runs.length > 0 && recentFailures.length === 0 && (
                <div className="today-section">
                    <h3>Latest Runs</h3>
                    <div className="item-list">
                        {runs.slice(0, 5).map(r => (
                            <a key={r.id} className="item-row" href={r.html_url} target="_blank" rel="noopener noreferrer">
                                <span className={`ci-badge ci-${r.conclusion ?? r.status}`}>{r.conclusion ?? r.status}</span>
                                <span className="item-main">{r.name}</span>
                                <span className="item-time">{relativeTime(r.created_at)}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {!repo && <p className="empty-state">Loading…</p>}
        </section>
    )
}
