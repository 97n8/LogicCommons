import { useState, type FormEvent } from 'react'
import { EmptyState } from '../components/shared'
import type { WorkflowRun, Workflow, RepoCtx } from '../github'
import * as gh from '../github'
import { relativeTime, workflowFileName } from '../helpers'
import type { ToastType } from '../hooks'

interface CIPageProps {
    runs: WorkflowRun[]
    loading: boolean
    workflows: Workflow[]
    ctx: RepoCtx | null
    activeBranch: string
    toast: (msg: string, type?: ToastType) => void
}

export default function CIPage({ runs, loading, workflows, ctx, activeBranch, toast }: CIPageProps) {
    const [runFormOpen, setRunFormOpen] = useState(false)
    return (
        <section className="page-ci">
            <div className="page-header">
                <h2>CI</h2>
                <button className="button primary" type="button" onClick={() => setRunFormOpen(!runFormOpen)}>
                    {runFormOpen ? '✕ Cancel' : '▶ Run Workflow'}
                </button>
            </div>
            {runFormOpen && (
                <form className="surface run-workflow-form" onSubmit={async (e: FormEvent) => {
                    e.preventDefault()
                    if (!ctx) return
                    if (!gh.hasToken()) { toast('Set a GitHub token in Settings to perform actions', 'error'); return }
                    const fd = new FormData(e.currentTarget as HTMLFormElement)
                    const wfId = (fd.get('workflow') as string).trim()
                    const ref = (fd.get('ref') as string).trim() || activeBranch
                    if (!wfId) return
                    try {
                        await gh.triggerWorkflow(ctx, wfId, ref)
                        toast(`Workflow dispatched on ${ref}`, 'success')
                        setRunFormOpen(false)
                    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
                }}>
                    {workflows.length > 0
                        ? <select name="workflow" className="picker-select" required>
                            <option value="">Select workflow…</option>
                            {workflows.map(w => (
                                <option key={w.id} value={workflowFileName(w.path)}>{w.name}</option>
                            ))}
                        </select>
                        : <input name="workflow" className="form-input" placeholder="Workflow file (e.g. app-build.yml)" required autoFocus />
                    }
                    <input name="ref" className="form-input" placeholder={`Branch (default: ${activeBranch})`} />
                    <button className="button primary" type="submit">Dispatch</button>
                </form>
            )}
            {runs.length === 0
                ? <EmptyState text="No pipeline runs" loading={loading} />
                : <div className="item-list">
                    {runs.map(r => (
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
            }
        </section>
    )
}
