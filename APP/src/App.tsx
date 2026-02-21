import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react'
import './App.css'
import * as gh from './github'
import type { RepoCtx } from './github'

/* ── helpers ───────────────────────────────────────────────── */

const NA = '—'

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

function formatTime(): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(new Date())
}

function formatDate(): string {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    }).format(new Date())
}

/* ── toast ─────────────────────────────────────────────────── */

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; msg: string; type: ToastType }
let _tid = 0

function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([])
    const push = useCallback((msg: string, type: ToastType = 'info') => {
        const id = ++_tid
        setToasts(p => [...p, { id, msg, type }])
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
    }, [])
    return { toasts, push }
}

/* ── live data ─────────────────────────────────────────────── */

interface LiveState {
    repo: gh.Repo | null
    issues: gh.Issue[]
    prs: gh.PR[]
    runs: gh.WorkflowRun[]
    branches: gh.Branch[]
    labels: gh.Label[]
    variables: gh.Variable[]
    loading: boolean
    error: string | null
    lastFetch: Date | null
}

function useLiveData(ctx: RepoCtx | null) {
    const [state, setState] = useState<LiveState>({
        repo: null, issues: [], prs: [], runs: [], branches: [], labels: [], variables: [],
        loading: false, error: null, lastFetch: null,
    })

    const fetchAll = useCallback(async () => {
        if (!ctx) return
        setState(p => ({ ...p, loading: true, error: null }))
        try {
            const [repo, issues, prs, runs, branches, labels, variables] = await Promise.all([
                gh.fetchRepo(ctx),
                gh.fetchIssues(ctx, 'all').catch(() => [] as gh.Issue[]),
                gh.fetchPRs(ctx).catch(() => [] as gh.PR[]),
                gh.fetchWorkflowRuns(ctx).catch(() => [] as gh.WorkflowRun[]),
                gh.fetchBranches(ctx).catch(() => [] as gh.Branch[]),
                gh.fetchLabels(ctx).catch(() => [] as gh.Label[]),
                gh.fetchVariables(ctx).catch(() => [] as gh.Variable[]),
            ])
            setState({ repo, issues, prs, runs, branches, labels, variables, loading: false, error: null, lastFetch: new Date() })
        } catch (err) {
            setState(p => ({ ...p, loading: false, error: err instanceof Error ? err.message : 'Fetch failed' }))
        }
    }, [ctx])

    useEffect(() => {
        if (!ctx) return
        fetchAll()
        const id = setInterval(fetchAll, 120_000)
        return () => clearInterval(id)
    }, [fetchAll, ctx])

    return { ...state, refresh: fetchAll }
}

/* ── small shared components ───────────────────────────────── */

function StatusDot({ ok }: { ok: boolean | null }) {
    const color = ok === null ? 'var(--muted)' : ok ? '#22c55e' : '#ef4444'
    return <span className="status-dot" style={{ background: color }} />
}

function Badge({ n, color }: { n: number; color?: string }) {
    if (!n) return null
    return <span className="badge" style={color ? { background: color } : undefined}>{n}</span>
}

function EmptyState({ text, loading }: { text: string; loading?: boolean }) {
    return <p className="empty-state">{loading ? 'Loading…' : text}</p>
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <article className="metric-card">
            <p className="metric-label">{label}</p>
            <p className="metric-value">{value}</p>
            {sub && <p className="metric-sub">{sub}</p>}
        </article>
    )
}

/* ── repo picker ───────────────────────────────────────────── */

function RepoPicker({ onSelect, user }: { onSelect: (ctx: RepoCtx) => void; user: gh.GHUser | null }) {
    const [repos, setRepos] = useState<gh.Repo[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const [newRepo, setNewRepo] = useState(false)
    const [creating, setCreating] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!gh.hasToken()) return
        setLoading(true)
        gh.fetchUserRepos()
            .then(r => { setRepos(r); setLoading(false) })
            .catch(e => { setError(e.message); setLoading(false) })
    }, [])

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100)
    }, [])

    const filtered = repos.filter(r =>
        r.full_name.toLowerCase().includes(query.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(query.toLowerCase())
    )

    async function handleCreate(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const name = (fd.get('name') as string).trim()
        const description = (fd.get('description') as string).trim()
        const isPrivate = fd.get('private') === 'on'
        setCreating(true)
        try {
            const repo = await gh.createRepo(name, description || undefined, isPrivate)
            onSelect({ owner: repo.owner.login, repo: repo.name })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed')
            setCreating(false)
        }
    }

    if (!gh.hasToken()) {
        return (
            <div className="picker-screen">
                <div className="picker-inner">
                    <div className="picker-brand">
                        <span className="picker-logo">LC</span>
                        <h1>LogicCommons</h1>
                        <p className="picker-sub">Connect a GitHub token to get started</p>
                    </div>
                    <TokenSetup onSaved={() => window.location.reload()} />
                </div>
            </div>
        )
    }

    return (
        <div className="picker-screen">
            <div className="picker-inner">
                <div className="picker-brand">
                    <span className="picker-logo">LC</span>
                    <h1>LogicCommons</h1>
                    {user && <p className="picker-sub">Signed in as <strong>{user.login}</strong> · {(user.public_repos ?? 0) + (user.total_private_repos ?? 0)} repos</p>}
                </div>

                <div className="picker-actions">
                    <input
                        ref={inputRef}
                        className="picker-search"
                        placeholder="Search repositories…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button className="button primary" onClick={() => setNewRepo(!newRepo)} type="button">
                        {newRepo ? '✕ Cancel' : '+ New Repo'}
                    </button>
                </div>

                {newRepo && (
                    <form className="surface picker-create-form" onSubmit={handleCreate}>
                        <input name="name" className="form-input" placeholder="Repository name" required autoFocus />
                        <input name="description" className="form-input" placeholder="Description (optional)" />
                        <label className="form-checkbox">
                            <input name="private" type="checkbox" defaultChecked /> Make private
                        </label>
                        <button className="button primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create Repository'}</button>
                    </form>
                )}

                {error && <p className="error-text">{error}</p>}

                {loading ? (
                    <div className="picker-loading">Loading repositories…</div>
                ) : (
                    <div className="picker-list">
                        {filtered.length === 0 && <p className="empty-state">{query ? 'No matching repositories' : 'No repositories found'}</p>}
                        {filtered.map(r => (
                            <button
                                key={r.id}
                                className="picker-item"
                                type="button"
                                onClick={() => onSelect({ owner: r.owner.login, repo: r.name })}
                            >
                                <div className="picker-item-main">
                                    <span className="picker-item-name">{r.full_name}</span>
                                    <div className="picker-item-meta">
                                        {r.private && <span className="tag">private</span>}
                                        {r.fork && <span className="tag">fork</span>}
                                        {r.language && <span className="tag lang">{r.language}</span>}
                                        <span className="picker-item-time">{relativeTime(r.updated_at)}</span>
                                    </div>
                                </div>
                                {r.description && <p className="picker-item-desc">{r.description}</p>}
                                <div className="picker-item-stats">
                                    <span>★ {r.stargazers_count}</span>
                                    <span>⑂ {r.forks_count}</span>
                                    {r.open_issues_count > 0 && <span>◎ {r.open_issues_count}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

/* ── token setup ───────────────────────────────────────────── */

function TokenSetup({ onSaved }: { onSaved: () => void }) {
    const [token, setToken] = useState('')
    function save() {
        if (token.trim()) { gh.setToken(token.trim()); onSaved() }
    }
    return (
        <div className="token-setup">
            <p className="panel-copy">Generate a token at <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer">github.com/settings/tokens</a>. Scopes needed: <code>repo</code>, <code>workflow</code>.</p>
            <div className="token-row">
                <input
                    className="form-input"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && save()}
                />
                <button className="button primary" onClick={save} disabled={!token.trim()}>Connect</button>
            </div>
        </div>
    )
}

/* ── universal create modal ────────────────────────────────── */

// ... (rest of the code unchanged for brevity, see user prompt for full code)

export default function App() {
    // ... (rest of the code unchanged for brevity, see user prompt for full code)
}