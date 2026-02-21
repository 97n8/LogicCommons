import { EmptyState } from '../components/shared'
import type { Branch, Repo } from '../github'

export default function BranchesPage({ branches, loading, repo }: { branches: Branch[]; loading: boolean; repo: Repo | null }) {
    return (
        <section className="page-branches">
            {branches.length === 0
                ? <EmptyState text="No branches" loading={loading} />
                : <div className="item-list">
                    {branches.map(b => (
                        <div key={b.name} className="item-row">
                            <span>{b.name}</span>
                            {b.protected && <span className="tag protected">protected</span>}
                            {b.name === repo?.default_branch && <span className="tag default-tag">default</span>}
                            <span>{b.commit.sha.slice(0, 7)}</span>
                        </div>
                    ))}
                </div>
            }
        </section>
    )
}
