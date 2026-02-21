import { EmptyState } from '../components/shared'
import type { WorkflowRun } from '../github'
import { relativeTime } from '../helpers'

export default function PipelinePage({ runs, loading }: { runs: WorkflowRun[]; loading: boolean }) {
    return (
        <section className="page-pipeline">
            <div className="page-header"><h2>Pipeline</h2></div>
            {runs.length === 0
                ? <EmptyState text="No pipeline activity" loading={loading} />
                : <div className="pipeline-stages">
                    <div className="pipeline-stage">
                        <h3>Recent</h3>
                        <div className="item-list">
                            {runs.slice(0, 10).map(r => (
                                <a key={r.id} className="item-row" href={r.html_url} target="_blank" rel="noopener noreferrer">
                                    <span className={`ci-badge ci-${r.conclusion ?? r.status}`}>{r.conclusion ?? r.status}</span>
                                    <div className="item-main">
                                        <span>{r.name}</span>
                                        <div>
                                            <span className="branch-name">{r.head_branch}</span>
                                            <span>{r.event}</span>
                                            <span>{relativeTime(r.created_at)}</span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            }
        </section>
    )
}
