import { EmptyState } from '../components/shared'
import type { Issue } from '../github'

export default function CasesPage({ cases, loading }: { cases: Issue[]; loading: boolean }) {
    return (
        <section className="page-cases">
            {cases.length === 0
                ? <EmptyState text="No open cases" loading={loading} />
                : <div className="item-list">
                    {cases.map(c => {
                        const status = c.state === 'closed' ? 'closed'
                            : c.labels.some(l => l.name.toLowerCase().includes('resolved')) ? 'resolved'
                            : c.labels.some(l => l.name.toLowerCase().includes('provisioned')) ? 'provisioned'
                            : 'open'
                        return (
                            <a key={c.number} className="item-row case-row" href={c.html_url} target="_blank" rel="noopener noreferrer">
                                <span className={`case-status case-${status}`}>{status}</span>
                                <div className="item-main">
                                    <span>{c.title}</span>
                                    {c.body && <p>{c.body.slice(0, 120)}</p>}
                                </div>
                            </a>
                        )
                    })}
                </div>
            }
        </section>
    )
}
