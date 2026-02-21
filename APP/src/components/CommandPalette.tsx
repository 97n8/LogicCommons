import { useState } from 'react'
import { NAV_PAGES, ghUrl } from '../helpers'
import type { NavPage } from '../helpers'
import type { RepoCtx } from '../github'

type CreateView = 'menu' | 'Issue' | 'Branch' | 'Label' | 'PR'

export default function CommandPalette({ onClose, onNav, onSwitchRepo, onCreateOpen, ctx }: {
    onClose: () => void
    onNav: (page: NavPage) => void
    onSwitchRepo: () => void
    onCreateOpen: (view: CreateView) => void
    ctx: RepoCtx | null
}) {
    const [q, setQ] = useState('')
    const commands = [
        { label: 'New Issue', action: () => onCreateOpen('Issue') },
        { label: 'New Pull Request', action: () => onCreateOpen('PR') },
        { label: 'New Branch', action: () => onCreateOpen('Branch') },
        { label: 'New Label', action: () => onCreateOpen('Label') },
        ...NAV_PAGES.map(p => ({ label: `Go to ${p}`, action: () => onNav(p) })),
        ...(ctx ? [{ label: 'Open on GitHub ↗', action: () => { window.open(ghUrl(ctx), '_blank'); onClose() } }] : []),
        { label: 'Switch repository', action: onSwitchRepo },
    ]
    const filtered = commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))
    return (
        <div className="palette-overlay" onClick={onClose}>
            <div className="palette" onClick={e => e.stopPropagation()}>
                <input
                    className="palette-input"
                    placeholder="Type a command…"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Escape') onClose()
                        if (e.key === 'Enter' && filtered.length > 0) { filtered[0].action(); onClose() }
                    }}
                    autoFocus
                />
                <div className="palette-list">
                    {filtered.length === 0 && <p className="empty-state">No matching commands</p>}
                    {filtered.map(c => (
                        <button key={c.label} className="palette-item" type="button" onClick={() => { c.action(); onClose() }}>{c.label}</button>
                    ))}
                </div>
            </div>
        </div>
    )
}
