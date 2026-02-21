import { MetricCard } from '../components/shared'
import type { Repo, Branch, WorkflowRun } from '../github'
import { NA, relativeTime, formatDate, formatTime } from '../helpers'

export default function TodayPage({ repo, openIssueCount, openPRCount, branches, runs }: {
    repo: Repo | null; openIssueCount: number; openPRCount: number; branches: Branch[]; runs: WorkflowRun[]
}) {
    return (
        <section className="page-today">
            <div className="today-header">
                <h2>{formatDate()}</h2>
                <p className="today-time">{formatTime()}</p>
            </div>
            <div className="today-summary">
                <MetricCard label="Open Issues" value={repo ? openIssueCount : NA} />
                <MetricCard label="Open PRs" value={repo ? openPRCount : NA} />
                <MetricCard label="Branches" value={repo ? branches.length : NA} />
                <MetricCard label="Recent Runs" value={repo ? runs.length : NA} />
            </div>
            {runs.length > 0 && (
                <div className="today-section">
                    <h3>Latest Pipeline Runs</h3>
                    <div className="item-list">
                        {runs.slice(0, 5).map(r => (
                            <a key={r.id} className="item-row" href={r.html_url} target="_blank" rel="noopener noreferrer">
                                <span className={`ci-badge ci-${r.conclusion ?? r.status}`}>{r.conclusion ?? r.status}</span>
                                <span>{r.name}</span>
                                <span>{relativeTime(r.created_at)}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
