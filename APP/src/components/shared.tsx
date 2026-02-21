import type { RepoTier, DeploymentStatus } from '../github'

/* ── small shared components ───────────────────────────────── */

export function StatusDot({ ok }: { ok: boolean | null }) {
    const color = ok === null ? 'var(--muted)' : ok ? '#22c55e' : '#ef4444'
    return <span className="status-dot" style={{ background: color }} />
}

export function Badge({ n, color }: { n: number; color?: string }) {
    if (!n) return null
    return <span className="badge" style={color ? { background: color } : undefined}>{n}</span>
}

export function EmptyState({ text, loading }: { text: string; loading?: boolean }) {
    return <p className="empty-state">{loading ? 'Loading…' : text}</p>
}

export function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <article className="metric-card">
            <p className="metric-label">{label}</p>
            <p className="metric-value">{value}</p>
            {sub && <p className="metric-sub">{sub}</p>}
        </article>
    )
}

/* ── status badges ──────────────────────────────────────────── */

const TIER_LABELS: Record<RepoTier, string> = { CORE: 'Core', PILOT: 'Pilot', DRAFT: 'Draft', ARCHIVED: 'Archived', EXPERIMENTAL: 'Experimental' }
const DEPLOY_LABELS: Record<DeploymentStatus, string> = { PRODUCTION: 'Production', STAGING: 'Staging', LOCAL: 'Local', NONE: 'None' }

export function StatusBadge({ tier }: { tier: RepoTier }) {
    return <span className={`status-badge tier-${tier.toLowerCase()}`}>{TIER_LABELS[tier]}</span>
}

export function DeployBadge({ status }: { status: DeploymentStatus }) {
    if (status === 'NONE') return null
    return <span className={`status-badge deploy-${status.toLowerCase()}`}>{DEPLOY_LABELS[status]}</span>
}
