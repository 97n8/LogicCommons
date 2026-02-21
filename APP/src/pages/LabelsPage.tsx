import { EmptyState } from '../components/shared'
import type { Label } from '../github'
import { textColorForBg } from '../helpers'

export default function LabelsPage({ labels, loading }: { labels: Label[]; loading: boolean }) {
    return (
        <section className="page-labels">
            {labels.length === 0
                ? <EmptyState text="No labels" loading={loading} />
                : <div className="label-grid">
                    {labels.map(l => (
                        <span key={l.name} className="label-chip large" style={{ background: `#${l.color}`, color: textColorForBg(l.color) }}>{l.name}</span>
                    ))}
                </div>
            }
        </section>
    )
}
