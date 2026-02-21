import { EmptyState } from '../components/shared'
import type { PR } from '../github'
import { relativeTime } from '../helpers'

export default function PRsPage({ prs, loading }: { prs: PR[]; loading: boolean }) {
    return (
        <section className="page-prs">
            {prs.length === 0
                ? <EmptyState text="No open PRs" loading={loading} />
                : <div className="item-list">
                    {prs.map(p => (
                        <a key={p.number} className="item-row" href={p.html_url} target="_blank" rel="noopener noreferrer">
                            <div className="item-main">
                                <div className="item-title-row">
                                    <span className="item-number">#{p.number}</span>
                                    <span>{p.title}</span>
                                    {p.draft && <span className="tag draft">draft</span>}
                                </div>
                                <div>
                                    <span className="branch-name">{p.head.ref}</span> → <span className="branch-name">{p.base.ref}</span>
                                    {p.merged_at && <span>{relativeTime(p.merged_at)}</span>}
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            }
        </section>
    )
}
