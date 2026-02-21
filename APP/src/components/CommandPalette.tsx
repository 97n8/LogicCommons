import { useState } from 'react'
import { NAV_PAGES } from '../helpers'
import type { NavPage } from '../helpers'

export default function CommandPalette({ onClose, onNav, onSwitchRepo, onCreateOpen }: {
    onClose: () => void
    onNav: (page: NavPage) => void
    onSwitchRepo: () => void
    onCreateOpen: () => void
}) {
    const [q, setQ] = useState('')
    const commands = [
        ...NAV_PAGES.map(p => ({ label: `Go to ${p}`, action: () => onNav(p) })),
        { label: 'Create something', action: onCreateOpen },
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
                    onKeyDown={e => e.key === 'Escape' && onClose()}
                    autoFocus
                />
                <div className="palette-list">
                    {filtered.length === 0 && <p className="empty-state">No matching commands</p>}
                    {filtered.map(c => (
                        <button key={c.label} className="palette-item" type="button" onClick={c.action}>{c.label}</button>
                    ))}
                </div>
            </div>
        </div>
    )
}
