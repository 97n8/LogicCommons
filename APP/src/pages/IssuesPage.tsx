import { useState } from 'react'
import { EmptyState } from '../components/shared'
import type { Issue, RepoCtx } from '../github'
import * as gh from '../github'
import { relativeTime, textColorForBg, ghUrl } from '../helpers'

export default function IssuesPage({ issues, loading, filter, onFilterChange, ctx, toast, refresh }: {
    issues: Issue[]; loading: boolean; filter: 'open' | 'closed' | 'all';
    onFilterChange: (f: 'open' | 'closed' | 'all') => void; ctx: RepoCtx
    toast: (msg: string, type?: 'success' | 'error' | 'info') => void
    refresh: () => void
}) {
    const [busy, setBusy] = useState<number | null>(null)

    async function toggleIssue(i: Issue) {
        setBusy(i.number)
        try {
            if (i.state === 'open') {
                await gh.closeIssue(ctx, i.number)
                toast(`Closed #${i.number}`, 'success')
            } else {
                await gh.reopenIssue(ctx, i.number)
                toast(`Reopened #${i.number}`, 'success')
            }
            refresh()
        } catch {
            toast('Action failed', 'error')
        } finally {
            setBusy(null)
        }
    }

    return (
        <section className="page-issues">
            <div className="page-header">
                <h2>Issues</h2>
                <div className="page-actions">
                    <div className="filter-tabs">
                        <button type="button" className={`button${filter === 'open' ? ' active' : ''}`} onClick={() => onFilterChange('open')}>open</button>
                        <button type="button" className={`button${filter === 'closed' ? ' active' : ''}`} onClick={() => onFilterChange('closed')}>closed</button>
                        <button type="button" className={`button${filter === 'all' ? ' active' : ''}`} onClick={() => onFilterChange('all')}>all</button>
                    </div>
                    <a className="button primary" href={ghUrl(ctx, '/issues/new')} target="_blank" rel="noopener noreferrer">New Issue</a>
                </div>
            </div>
            {issues.length === 0
                ? <EmptyState text="No open issues" loading={loading} />
                : <div className="item-list">
                    {issues.map(i => (
                        <div key={i.number} className="item-row">
                            <div className="item-main">
                                <div className="item-title-row">
                                    <span className="item-number">#{i.number}</span>
                                    <a href={i.html_url} target="_blank" rel="noopener noreferrer">{i.title}</a>
                                    <span className={`tag ${i.state}`}>{i.state}</span>
                                </div>
                                <div>
                                    {i.labels.map(l => <span key={l.name} className="tag" style={{ background: `#${l.color}`, color: textColorForBg(l.color) }}>{l.name}</span>)}
                                    <span className="item-time">{relativeTime(i.created_at)}</span>
                                </div>
                            </div>
                            <div className="item-actions">
                                <button
                                    className={`button action-btn ${i.state === 'open' ? 'action-close' : 'action-reopen'}`}
                                    type="button"
                                    disabled={busy === i.number}
                                    onClick={() => toggleIssue(i)}
                                >
                                    {busy === i.number ? '…' : i.state === 'open' ? 'Close' : 'Reopen'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            }
        </section>
    )
}
