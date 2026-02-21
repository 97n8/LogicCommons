import { useState, useRef } from 'react'
import * as gh from '../github'
import type { RepoCtx, Branch } from '../github'
import type { ToastType } from '../hooks'

type View = 'menu' | 'Issue' | 'Branch' | 'Label' | 'PR'

export default function CreateModal({ onClose, ctx, branches, toast, refresh, initialView }: {
    onClose: () => void
    ctx: RepoCtx
    branches: Branch[]
    toast: (msg: string, type: ToastType) => void
    refresh: () => void
    initialView?: View
}) {
    const [view, setView] = useState<View>(initialView ?? 'menu')
    const [busy, setBusy] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    async function submit(fn: () => Promise<unknown>, successMsg: string) {
        setBusy(true)
        try {
            await fn()
            toast(successMsg, 'success')
            refresh()
            onClose()
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Failed', 'error')
        } finally {
            setBusy(false)
        }
    }

    const defaultBranch = branches.find(b => b.protected)?.name ?? branches[0]?.name ?? 'main'
    const defaultSha = branches[0]?.commit.sha ?? ''

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{view === 'menu' ? 'Create' : `New ${view}`}</h2>
                    <button type="button" onClick={onClose}>✕</button>
                </div>

                {view === 'menu' && (
                    <div className="modal-body">
                        {(['Issue', 'PR', 'Branch', 'Label'] as const).map(o => (
                            <button key={o} className="modal-option" type="button" onClick={() => setView(o === 'PR' ? 'PR' : o)}>
                                {o === 'PR' ? 'Pull Request' : o}
                            </button>
                        ))}
                    </div>
                )}

                {view === 'Issue' && (
                    <form ref={formRef} className="modal-form" onSubmit={e => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        submit(() => gh.createIssue(ctx, fd.get('title') as string, fd.get('body') as string || undefined), 'Issue created')
                    }}>
                        <input name="title" className="form-input" placeholder="Title" required autoFocus />
                        <textarea name="body" className="form-input" placeholder="Description (optional)" rows={4} />
                        <div className="form-actions">
                            <button className="button" type="button" onClick={() => setView('menu')}>← Back</button>
                            <button className="button primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Issue'}</button>
                        </div>
                    </form>
                )}

                {view === 'Branch' && (
                    <form ref={formRef} className="modal-form" onSubmit={e => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        const from = branches.find(b => b.name === fd.get('base'))?.commit.sha ?? defaultSha
                        submit(() => gh.createBranch(ctx, fd.get('name') as string, from), 'Branch created')
                    }}>
                        <input name="name" className="form-input" placeholder="Branch name" required autoFocus />
                        <select name="base" className="form-input">
                            {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                        <div className="form-actions">
                            <button className="button" type="button" onClick={() => setView('menu')}>← Back</button>
                            <button className="button primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Branch'}</button>
                        </div>
                    </form>
                )}

                {view === 'Label' && (
                    <form ref={formRef} className="modal-form" onSubmit={e => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        const color = (fd.get('color') as string).replace('#', '')
                        submit(() => gh.createLabel(ctx, fd.get('name') as string, color, fd.get('desc') as string || undefined), 'Label created')
                    }}>
                        <input name="name" className="form-input" placeholder="Label name" required autoFocus />
                        <div className="form-row">
                            <input name="color" type="color" defaultValue="#3b82f6" className="color-picker" />
                            <input name="desc" className="form-input" placeholder="Description (optional)" />
                        </div>
                        <div className="form-actions">
                            <button className="button" type="button" onClick={() => setView('menu')}>← Back</button>
                            <button className="button primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Label'}</button>
                        </div>
                    </form>
                )}

                {view === 'PR' && (
                    <form ref={formRef} className="modal-form" onSubmit={e => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        submit(() => gh.createPR(ctx, fd.get('title') as string, fd.get('head') as string, fd.get('base') as string, fd.get('body') as string || undefined), 'PR created')
                    }}>
                        <input name="title" className="form-input" placeholder="PR title" required autoFocus />
                        <div className="form-row">
                            <select name="head" className="form-input">
                                {branches.filter(b => b.name !== defaultBranch).map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                            </select>
                            <span style={{ alignSelf: 'center', color: 'var(--color-muted)', flexShrink: 0 }}>→</span>
                            <select name="base" className="form-input">
                                {branches.map(b => <option key={b.name} value={b.name} selected={b.name === defaultBranch}>{b.name}</option>)}
                            </select>
                        </div>
                        <textarea name="body" className="form-input" placeholder="Description (optional)" rows={3} />
                        <div className="form-actions">
                            <button className="button" type="button" onClick={() => setView('menu')}>← Back</button>
                            <button className="button primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create PR'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
