import { useState, useEffect } from 'react'
import * as gh from '../github'
import type { PR, PRCheck, PRReview, RepoCtx } from '../github'
import { relativeTime } from '../helpers'

export default function PRDetailPanel({ pr: initialPR, ctx, onClose, toast, refresh }: {
    pr: PR; ctx: RepoCtx
    onClose: () => void
    toast: (msg: string, type?: 'success' | 'error' | 'info') => void
    refresh: () => void
}) {
    const [pr, setPR] = useState<PR>(initialPR)
    const [checks, setChecks] = useState<PRCheck[]>([])
    const [reviews, setReviews] = useState<PRReview[]>([])
    const [comment, setComment] = useState('')
    const [busy, setBusy] = useState<string | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(true)

    useEffect(() => {
        setLoadingDetails(true)
        Promise.all([
            gh.fetchPR(ctx, initialPR.number),
            gh.fetchPRChecks(ctx, initialPR.head.sha),
            gh.fetchPRReviews(ctx, initialPR.number),
        ]).then(([fullPR, c, r]) => {
            setPR(fullPR)
            setChecks(c)
            setReviews(r)
        }).catch(() => {}).finally(() => setLoadingDetails(false))
    }, [ctx, initialPR.number, initialPR.head.sha])

    async function handleMerge() {
        setBusy('merge')
        try {
            await gh.mergePR(ctx, pr.number, 'squash')
            toast(`Merged #${pr.number} ✓`, 'success')
            refresh()
            onClose()
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Merge failed', 'error')
        } finally { setBusy(null) }
    }

    async function handleApprove() {
        setBusy('approve')
        try {
            await gh.approvePR(ctx, pr.number)
            toast(`Approved #${pr.number} ✓`, 'success')
            setReviews(prev => [...prev, {
                id: Date.now(), user: { login: 'you', avatar_url: '' },
                state: 'APPROVED', submitted_at: new Date().toISOString(), body: ''
            }])
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Approve failed', 'error')
        } finally { setBusy(null) }
    }

    async function handleComment(e: React.FormEvent) {
        e.preventDefault()
        if (!comment.trim()) return
        setBusy('comment')
        try {
            await gh.commentOnIssue(ctx, pr.number, comment.trim())
            toast('Comment posted', 'success')
            setComment('')
        } catch {
            toast('Failed to post comment', 'error')
        } finally { setBusy(null) }
    }

    const approved = reviews.some(r => r.state === 'APPROVED')
    const changesRequested = reviews.some(r => r.state === 'CHANGES_REQUESTED')
    const failedChecks = checks.filter(c => c.conclusion === 'failure')
    const passingChecks = checks.filter(c => c.conclusion === 'success')

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="panel" onClick={e => e.stopPropagation()}>
                <div className="panel-header">
                    <div className="panel-header-meta">
                        <span className="item-number">#{pr.number}</span>
                        {pr.draft && <span className="tag draft">draft</span>}
                        {approved && <span className="tag approved">approved</span>}
                        {changesRequested && <span className="tag changes-requested">changes requested</span>}
                    </div>
                    <div className="panel-header-actions">
                        <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="button">Open ↗</a>
                        <button className="button" type="button" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="panel-body">
                    <h2 className="panel-title">{pr.title}</h2>
                    <div className="panel-meta-row">
                        <span className="branch-name">{pr.head.ref}</span>
                        <span>→</span>
                        <span className="branch-name">{pr.base.ref}</span>
                        <span className="item-time">opened {relativeTime(pr.created_at)}</span>
                        {!loadingDetails && <>
                            <span className="pr-stat pr-add">+{pr.additions}</span>
                            <span className="pr-stat pr-del">-{pr.deletions}</span>
                            <span className="pr-stat">{pr.changed_files} files</span>
                        </>}
                    </div>

                    {pr.body && (
                        <div className="panel-desc">{pr.body}</div>
                    )}

                    {checks.length > 0 && (
                        <div className="panel-section">
                            <h4>Checks <span className="section-count">{checks.length}</span>
                                {failedChecks.length > 0 && <span className="section-count ci-failure-count">{failedChecks.length} failed</span>}
                                {passingChecks.length > 0 && <span className="section-count ci-pass-count">{passingChecks.length} passing</span>}
                            </h4>
                            <div className="check-list">
                                {checks.map((c, i) => (
                                    <div key={i} className="check-row">
                                        <span className={`ci-badge ci-${c.conclusion ?? c.status}`}>{c.conclusion ?? c.status}</span>
                                        <span className="check-name">{c.name}</span>
                                        {c.html_url && <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="check-link">details</a>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {reviews.length > 0 && (
                        <div className="panel-section">
                            <h4>Reviews</h4>
                            <div className="review-list">
                                {reviews.map(r => (
                                    <div key={r.id} className="review-row">
                                        <span className={`review-state review-${r.state.toLowerCase()}`}>{r.state.replace('_', ' ')}</span>
                                        <span className="review-author">{r.user.login}</span>
                                        <span className="item-time">{relativeTime(r.submitted_at)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <form className="panel-section panel-comment" onSubmit={handleComment}>
                        <h4>Leave a comment</h4>
                        <textarea
                            className="form-input"
                            rows={3}
                            placeholder="Write a comment…"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                        <button className="button primary" type="submit" disabled={!comment.trim() || busy === 'comment'}>
                            {busy === 'comment' ? 'Posting…' : 'Comment'}
                        </button>
                    </form>
                </div>

                <div className="panel-footer">
                    {!pr.draft && pr.state === 'open' && (
                        <>
                            <button
                                className="button action-btn action-approve"
                                type="button"
                                disabled={!!busy || approved}
                                onClick={handleApprove}
                            >
                                {busy === 'approve' ? '…' : approved ? '✓ Approved' : '✓ Approve'}
                            </button>
                            <button
                                className="button action-btn action-merge"
                                type="button"
                                disabled={!!busy || changesRequested}
                                onClick={handleMerge}
                                title={changesRequested ? 'Changes requested — cannot merge' : ''}
                            >
                                {busy === 'merge' ? 'Merging…' : 'Squash & Merge'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
