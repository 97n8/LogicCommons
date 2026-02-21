import { useState, type FormEvent } from 'react'
import { EmptyState } from '../components/shared'
import type { Branch, RepoCtx } from '../github'
import * as gh from '../github'
import { sanitizeSlug } from '../helpers'
import type { ToastType } from '../hooks'

interface EnvironmentsPageProps {
    envBranches: Branch[]
    loading: boolean
    ctx: RepoCtx | null
    activeBranch: string
    toast: (msg: string, type?: ToastType) => void
}

export default function EnvironmentsPage({ envBranches, loading, ctx, activeBranch, toast }: EnvironmentsPageProps) {
    const [envFormOpen, setEnvFormOpen] = useState(false)
    return (
        <section className="page-environments">
            <div className="page-header">
                <h2>Environments</h2>
                <button className="button primary" type="button" onClick={() => setEnvFormOpen(!envFormOpen)}>
                    {envFormOpen ? '✕ Cancel' : '+ New Environment'}
                </button>
            </div>
            {envFormOpen && (
                <form className="surface env-create-form" onSubmit={async (e: FormEvent) => {
                    e.preventDefault()
                    if (!ctx) return
                    if (!gh.hasToken()) { toast('Set a GitHub token in Settings to perform actions', 'error'); return }
                    const fd = new FormData(e.currentTarget as HTMLFormElement)
                    const slug = sanitizeSlug(fd.get('slug') as string)
                    const desc = (fd.get('description') as string).trim()
                    if (!slug) return
                    try {
                        const result = await gh.createEnvironment(ctx, slug, desc || slug, activeBranch)
                        toast(`Environment "${slug}" created on ${result.branch}`, 'success')
                        setEnvFormOpen(false)
                    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
                }}>
                    <input name="slug" className="form-input" placeholder="Environment name (e.g. staging, dev)" required autoFocus />
                    <input name="description" className="form-input" placeholder="Description (optional)" />
                    <button className="button primary" type="submit">Create Environment</button>
                </form>
            )}
            {envBranches.length === 0
                ? <EmptyState text="No environments" loading={loading} />
                : <div className="item-list">
                    {envBranches.map(b => (
                        <div key={b.name} className="item-row env-row">
                            <span className="tag env-tag">{b.name}</span>
                            <span>{b.commit.sha.slice(0, 7)}</span>
                        </div>
                    ))}
                </div>
            }
        </section>
    )
}
