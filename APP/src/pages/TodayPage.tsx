import { MetricCard } from '../components/shared'
import type { Repo, Branch, WorkflowRun, PR, Issue, RepoCtx } from '../github'
import { NA, relativeTime, formatDate, formatTime } from '../helpers'

export default function TodayPage({ repo, openIssueCount, openPRCount, branches, runs, prs, issues, crossRepoPRs, crossRepoIssues, crossRepoRuns, onSelectRepo }: {
    repo: Repo | null; openIssueCount: number; openPRCount: number
    branches: Branch[]; runs: WorkflowRun[]; prs: PR[]; issues: Issue[]
    crossRepoPRs: (PR & { _ctx: RepoCtx })[]
    crossRepoIssues: (Issue & { _ctx: RepoCtx })[]
    crossRepoRuns: (WorkflowRun & { _ctx: RepoCtx })[]
    onSelectRepo: (ctx: RepoCtx) => void
}) {
    const allOpenPRs = crossRepoPRs.filter(p => p.state === 'open' && !p.draft)
    const allFailures = crossRepoRuns.filter(r => r.conclusion === 'failure')
    const allOpenIssues = crossRepoIssues.filter(i => i.state === 'open')

    // totals across all repos
    const totalPRs = allOpenPRs.length
    const totalFailures = allFailures.length
    const totalIssues = allOpenIssues.length

    // current repo stats still useful for the metrics row
    const reviewPRs = prs.filter(p => p.state === 'open' && !p.draft)
    const recentFailures = runs.filter(r => r.conclusion === 'failure').slice(0, 5)
    const recentIssues = issues.filter(i => i.state === 'open').slice(0, 5)

    const hasCrossRepo = allOpenPRs.length > 0 || allFailures.length > 0 || allOpenIssues.length > 0

    return (
        <section className="page-today">
            <div className="page-header">
                <div>
                    <h2>{formatDate()}</h2>
                    <p className="today-time">{formatTime()}</p>
                </div>
            </div>

            <div className="stats-row">
                <MetricCard label="PRs Needing Review" value={totalPRs || (repo ? openPRCount : NA)} />
                <MetricCard label="CI Failures" value={totalFailures || NA} />
                <MetricCard label="Open Issues" value={totalIssues || (repo ? openIssueCount : NA)} />
                <MetricCard label="Branches" value={repo ? branches.length : NA} />
            </div>

            {hasCrossRepo ? (
                <>
                    {allOpenPRs.length > 0 && (
                        <div className="today-section">
                            <h3>Needs Review <span className="section-count">{allOpenPRs.length}</span></h3>
                            <div className="item-list">
                                {allOpenPRs.slice(0, 8).map(p => (
                                    <a key={`${p._ctx.owner}/${p._ctx.repo}#${p.number}`} className="item-row" href={p.html_url} target="_blank" rel="noopener noreferrer">
                                        <span className="item-repo" onClick={e => { e.preventDefault(); onSelectRepo(p._ctx) }}>{p._ctx.repo}</span>
                                        <span className="item-number">#{p.number}</span>
                                        <span className="item-main">{p.title}</span>
                                        <span className="branch-name">{p.head.ref}</span>
                                        <span className="item-time">{relativeTime(p.updated_at)}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {allFailures.length > 0 && (
                        <div className="today-section">
                            <h3>CI Failures <span className="section-count">{allFailures.length}</span></h3>
                            <div className="item-list">
                                {allFailures.slice(0, 8).map(r => (
                                    <a key={`${r._ctx.owner}/${r._ctx.repo}#${r.id}`} className="item-row" href={r.html_url} target="_blank" rel="noopener noreferrer">
                                        <span className="item-repo" onClick={e => { e.preventDefault(); onSelectRepo(r._ctx) }}>{r._ctx.repo}</span>
                                        <span className="ci-badge ci-failure">failed</span>
                                        <span className="item-main">{r.name}</span>
                                        <span className="branch-name">{r.head_branch}</span>
                                        <span className="item-time">{relativeTime(r.created_at)}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {allOpenIssues.length > 0 && (
                        <div className="today-section">
                            <h3>Open Issues <span className="section-count">{allOpenIssues.length}</span></h3>
                            <div className="item-list">
                                {allOpenIssues.slice(0, 8).map(i => (
                                    <a key={`${i._ctx.owner}/${i._ctx.repo}#${i.number}`} className="item-row" href={i.html_url} target="_blank" rel="noopener noreferrer">
                                        <span className="item-repo" onClick={e => { e.preventDefault(); onSelectRepo(i._ctx) }}>{i._ctx.repo}</span>
                                        <span className="item-number">#{i.number}</span>
                                        <span className="item-main">{i.title}</span>
                                        <span className="item-time">{relativeTime(i.created_at)}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
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
                </>
            )}

            {!repo && !hasCrossRepo && <p className="empty-state">Loading…</p>}
        </section>
    )
}
