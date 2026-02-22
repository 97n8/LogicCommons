import { useState } from 'react'
import { EmptyState } from '../components/shared'
import type { WorkflowRun, RepoCtx } from '../github'
import * as gh from '../github'
import { relativeTime, ghUrl } from '../helpers'

export default function PipelinePage({ runs, loading, ctx, toast, refresh }: {
    runs: WorkflowRun[]; loading: boolean; ctx: RepoCtx
    toast: (msg: string, type?: 'success' | 'error' | 'info') => void
    refresh: () => void
}) {
    const [busy, setBusy] = useState<number | null>(null)

    async function rerun(r: WorkflowRun) {
        setBusy(r.id)
        try {
            await gh.rerunWorkflow(ctx, r.id)
            toast(`Re-running ${r.name}`, 'info')
            setTimeout(refresh, 2000)
        } catch {
            toast('Re-run failed', 'error')
        } finally {
            setBusy(null)
        }
    }

    return (
        <section className="page-pipeline">
            <div className="page-header">
                <h2>Pipeline</h2>
                <div className="page-actions">
                    <a className="button" href={ghUrl(ctx, '/actions')} target="_blank" rel="noopener noreferrer">View Actions</a>
                </div>
            </div>
            {runs.length === 0
                ? <EmptyState text="No pipeline activity" loading={loading} />
                : <div className="pipeline-stages">
                    <div className="pipeline-stage">
                        <h3>Recent</h3>
                        <div className="item-list">
                            {runs.slice(0, 10).map(r => (
                                <div key={r.id} className="item-row">
                                    <span className={`ci-badge ci-${r.conclusion ?? r.status}`}>{r.conclusion ?? r.status}</span>
                                    <div className="item-main">
                                        <a href={r.html_url} target="_blank" rel="noopener noreferrer">{r.name}</a>
                                        <div>
                                            <span className="branch-name">{r.head_branch}</span>
                                            <span>{r.event}</span>
                                            <span className="item-time">{relativeTime(r.created_at)}</span>
                                        </div>
                                    </div>
                                    {r.conclusion === 'failure' && (
                                        <div className="item-actions">
                                            <button className="button action-btn action-rerun" type="button" disabled={busy === r.id} onClick={() => rerun(r)}>
                                                {busy === r.id ? '…' : '↺ Re-run'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            }
        </section>
    )
}
