import { useState } from 'react'
import { EmptyState } from '../components/shared'
import type { PR, RepoCtx } from '../github'
import * as gh from '../github'
import { relativeTime, ghUrl } from '../helpers'

export default function PRsPage({ prs, loading, ctx, toast, refresh, onOpenPR }: {
    prs: PR[]; loading: boolean; ctx: RepoCtx
    toast: (msg: string, type?: 'success' | 'error' | 'info') => void
    refresh: () => void
    onOpenPR: (pr: PR) => void
}) {
    const [busy, setBusy] = useState<number | null>(null)

    async function merge(p: PR) {
        setBusy(p.number)
        try {
            await gh.mergePR(ctx, p.number, 'squash')
            toast(`Merged #${p.number}`, 'success')
            refresh()
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Merge failed', 'error')
        } finally {
            setBusy(null)
        }
    }

    async function approve(p: PR) {
        setBusy(p.number)
        try {
            await gh.approvePR(ctx, p.number)
            toast(`Approved #${p.number}`, 'success')
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Approve failed', 'error')
        } finally {
            setBusy(null)
        }
    }

    return (
        <section className="page-prs">
            <div className="page-header">
                <h2>Pull Requests</h2>
                <div className="page-actions">
                    <a className="button primary" href={ghUrl(ctx, '/compare')} target="_blank" rel="noopener noreferrer">New PR</a>
                </div>
            </div>
            {prs.length === 0
                ? <EmptyState text="No open PRs" loading={loading} />
                : <div className="item-list">
                    {prs.map(p => (
                        <div key={p.number} className="item-row">
                            <div className="item-main" onClick={() => onOpenPR(p)} style={{ cursor: 'pointer' }}>
                                <div className="item-title-row">
                                    <span className="item-number">#{p.number}</span>
                                    <span>{p.title}</span>
                                    {p.draft && <span className="tag draft">draft</span>}
                                </div>
                                <div>
                                    <span className="branch-name">{p.head.ref}</span> → <span className="branch-name">{p.base.ref}</span>
                                    <span className="item-time">{relativeTime(p.updated_at)}</span>
                                </div>
                            </div>
                            <div className="item-actions">
                                {!p.draft && p.state === 'open' && <>
                                    <button className="button action-btn action-approve" type="button" disabled={busy === p.number} onClick={() => approve(p)}>
                                        {busy === p.number ? '…' : '✓ Approve'}
                                    </button>
                                    <button className="button action-btn action-merge" type="button" disabled={busy === p.number} onClick={() => merge(p)}>
                                        {busy === p.number ? '…' : 'Merge'}
                                    </button>
                                </>}
                            </div>
                        </div>
                    ))}
                </div>
            }
        </section>
    )
}
