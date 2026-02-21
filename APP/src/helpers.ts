/* ── shared helpers ─────────────────────────────────────────── */

export const NA = '—'

export const NAV_PAGES = ['Dashboard', 'Today', 'Issues', 'PRs', 'Lists', 'CI', 'Pipeline', 'Branches', 'Labels', 'Files', 'Registry', 'Projects', 'Playbooks', 'Tools', 'Cases', 'Vault', 'Environments', 'Settings'] as const
export type NavPage = (typeof NAV_PAGES)[number]

export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

export function formatTime(): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(new Date())
}

export function formatDate(): string {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    }).format(new Date())
}

export function workflowFileName(path: string): string {
    const idx = path.lastIndexOf('/')
    return idx >= 0 ? path.slice(idx + 1) : path
}

export function sanitizeSlug(raw: string): string {
    return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export const NAV_GROUPS: { label: string; pages: readonly NavPage[] }[] = [
    { label: 'Overview', pages: ['Dashboard', 'Today'] },
    { label: 'Work', pages: ['Issues', 'PRs', 'Lists', 'Cases'] },
    { label: 'Infrastructure', pages: ['CI', 'Pipeline', 'Branches', 'Files', 'Vault', 'Environments'] },
    { label: 'Governance', pages: ['Labels', 'Registry', 'Projects', 'Playbooks', 'Tools'] },
    { label: '', pages: ['Settings'] },
]

export const NAV_ICONS: Record<NavPage, string> = {
    Dashboard: '▦',
    Today: '◉',
    Issues: '●',
    PRs: '⇌',
    Lists: '≡',
    Cases: '▤',
    CI: '⚡',
    Pipeline: '⏵',
    Branches: '⑂',
    Files: '◧',
    Vault: '⊡',
    Environments: '◎',
    Labels: '◈',
    Registry: '⊞',
    Projects: '⊟',
    Playbooks: '▷',
    Tools: '⛭',
    Settings: '⚙',
}

export function textColorForBg(hex: string): string {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000' : '#fff'
}
