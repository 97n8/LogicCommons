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

function textColorForBg(hex: string): string {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#000' : '#fff'
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
    const [loading, setLoading] = useState(gh.hasToken())
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const [newRepo, setNewRepo] = useState(false)
    const [creating, setCreating] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!gh.hasToken()) return
        let cancelled = false
        gh.fetchUserRepos()
            .then(r => { if (!cancelled) { setRepos(r); setLoading(false) } })
            .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
        return () => { cancelled = true }
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

function CreateModal({ onClose }: { onClose: () => void }) {
    const options = ['Issue', 'Pull Request', 'Branch', 'Label', 'File', 'Environment', 'Variable', 'Workflow', 'Repository']
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create</h2>
                    <button type="button" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {options.map(o => (
                        <button key={o} className="modal-option" type="button">{o}</button>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ── command palette ───────────────────────────────────────── */

const NAV_PAGES = ['Dashboard', 'Today', 'Issues', 'PRs', 'Lists', 'CI', 'Pipeline', 'Branches', 'Labels', 'Files', 'Projects', 'Playbooks', 'Tools', 'Cases', 'Vault', 'Environments', 'Settings'] as const
type NavPage = (typeof NAV_PAGES)[number]

function CommandPalette({ onClose, onNav, onSwitchRepo, onCreateOpen }: {
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

/* ── app ───────────────────────────────────────────────────── */

export default function App() {
    const [ctx, setCtx] = useState<RepoCtx | null>(null)
    const [user, setUser] = useState<gh.GHUser | null>(null)
    const [page, setPage] = useState<NavPage>('Dashboard')
    const [cmdOpen, setCmdOpen] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [issueFilter, setIssueFilter] = useState<'open' | 'closed' | 'all'>('open')
    const [filePath, setFilePath] = useState<string[]>([])
    const [dirEntries, setDirEntries] = useState<gh.FileEntry[]>([])
    const [openFile, setOpenFile] = useState<{ path: string; content: string; sha: string } | null>(null)
    const [editContent, setEditContent] = useState('')
    const [commitMsg, setCommitMsg] = useState('')
    const { toasts, push: toast } = useToasts()
    const live = useLiveData(ctx)
    const activeBranch = live.repo?.default_branch ?? 'main'

    useEffect(() => {
        if (gh.hasToken()) {
            gh.fetchUser().then(setUser).catch(() => {})
        }
    }, [])

    useEffect(() => {
        if (page !== 'Files' || !ctx) return
        let cancelled = false
        gh.fetchDirContents(ctx, filePath.join('/'), activeBranch)
            .then(entries => { if (!cancelled) setDirEntries(Array.isArray(entries) ? entries : []) })
            .catch(() => { if (!cancelled) setDirEntries([]) })
        return () => { cancelled = true }
    }, [page, ctx, filePath, activeBranch])

    if (!ctx) {
        return (
            <div>
                <RepoPicker onSelect={c => { setCtx(c); setPage('Dashboard') }} user={user} />
            </div>
        )
    }

    const realIssues = live.issues.filter(i => !i.pull_request)
    const openIssues = realIssues.filter(i => i.state === 'open')
    const openPRs = live.prs.filter(p => p.state === 'open')
    const filteredIssues = issueFilter === 'all' ? realIssues : realIssues.filter(i => i.state === issueFilter)
    const cases = realIssues.filter(i => i.labels.some(l => l.name.toLowerCase().includes('case')))
    const envBranches = live.branches.filter(b => b.name.startsWith('env/'))

    return (
        <div className="shell">
            <aside className="sidebar">
                <div className="brand" onClick={() => setCtx(null)}>
                    <span>{ctx.owner}/{ctx.repo}</span>
                </div>
                <nav className="nav">
                    {NAV_PAGES.map(n => (
                        <button key={n} className={`nav-item${page === n ? ' active' : ''}`} type="button" onClick={() => setPage(n)}>
                            {n}
                            {n === 'Issues' && <Badge n={openIssues.length} />}
                            {n === 'PRs' && <Badge n={openPRs.length} />}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button className="create-btn" type="button" onClick={() => setCreateOpen(true)}>+</button>
                    <button type="button" onClick={() => setCmdOpen(true)}>⌘K</button>
                </div>
            </aside>

            <div className="main">
                <header className="topbar">
                    <button type="button" onClick={live.refresh}>{live.loading ? 'Syncing' : 'Refresh'}</button>
                    <StatusDot ok={live.error ? false : live.lastFetch ? true : null} />
                    <span className="topbar-time">{formatDate()} {formatTime()}</span>
                </header>

                {live.error && <div className="error-banner">Connection issue: {live.error}</div>}

                {page === 'Dashboard' && (
                    <section className="page-dashboard">
                        <MetricCard label="Open Issues" value={live.repo ? openIssues.length : NA} />
                        <MetricCard label="Open PRs" value={live.repo ? openPRs.length : NA} />
                        <MetricCard label="Stars" value={live.repo?.stargazers_count ?? NA} />
                        <MetricCard label="Forks" value={live.repo?.forks_count ?? NA} />
                    </section>
                )}

                {page === 'Today' && (
                    <section className="page-today">
                        <div className="today-header">
                            <h2>{formatDate()}</h2>
                            <p className="today-time">{formatTime()}</p>
                        </div>
                        <div className="today-summary">
                            <MetricCard label="Open Issues" value={live.repo ? openIssues.length : NA} />
                            <MetricCard label="Open PRs" value={live.repo ? openPRs.length : NA} />
                            <MetricCard label="Branches" value={live.repo ? live.branches.length : NA} />
                            <MetricCard label="Recent Runs" value={live.repo ? live.runs.length : NA} />
                        </div>
                        {live.runs.length > 0 && (
                            <div className="today-section">
                                <h3>Latest CI Runs</h3>
                                <div className="item-list">
                                    {live.runs.slice(0, 5).map(r => (
                                        <a key={r.id} className="item-row" href={r.html_url} target="_blank" rel="noopener noreferrer">
                                            <span className={`ci-badge ci-${r.conclusion ?? r.status}`}>{r.conclusion ?? r.status}</span>
                                            <span>{r.name}</span>
                                            <span>{relativeTime(r.created_at)}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {page === 'Issues' && (
                    <section className="page-issues">
                        <div className="filter-tabs">
                            <button type="button" className={issueFilter === 'open' ? 'active' : ''} onClick={() => setIssueFilter('open')}>open</button>
                            <button type="button" className={issueFilter === 'closed' ? 'active' : ''} onClick={() => setIssueFilter('closed')}>closed</button>
                            <button type="button" className={issueFilter === 'all' ? 'active' : ''} onClick={() => setIssueFilter('all')}>all</button>
                        </div>
                        {filteredIssues.length === 0
                            ? <EmptyState text="No open issues" loading={live.loading} />
                            : <div className="item-list">
                                {filteredIssues.map(i => (
                                    <a key={i.number} className="item-row" href={i.html_url} target="_blank" rel="noopener noreferrer">
                                        <div className="item-main">
                                            <div className="item-title-row">
                                                <span className="item-number">#{i.number}</span>
                                                <span>{i.title}</span>
                                                <span className={`tag ${i.state}`}>{i.state}</span>
                                            </div>
                                            <div>
                                                {i.labels.map(l => <span key={l.name} className="tag" style={{ background: `#${l.color}`, color: textColorForBg(l.color) }}>{l.name}</span>)}
                                                <span>{relativeTime(i.created_at)}</span>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        }
                    </section>
                )}

                {page === 'PRs' && (
                    <section className="page-prs">
                        {live.prs.length === 0
                            ? <EmptyState text="No open PRs" loading={live.loading} />
                            : <div className="item-list">
                                {live.prs.map(p => (
                                    <a key={p.number} className="item-row" href={p.html_url} target="_blank" rel="noopener noreferrer">
                                        <div className="item-main">
                                            <div className="item-title-row">
                                                <span className="item-number">#{p.number}</span>
                                                <span>{p.title}</span>
                                                {p.draft && <span className="tag draft">draft</span>}
                                            </div>
                                            <div>
                                                <span className="branch-name">{p.head.ref}</span> → <span className="branch-name">{p.base.ref}</span>
                                                {p.merged_at && <span>{relativeTime(p.merged_at)}</span>}
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        }
                    </section>
                )}

                {page === 'Lists' && (
                    <section className="page-lists">
                        <div className="page-header"><h2>Lists</h2></div>
                        <EmptyState text="No lists yet — create a list to organize issues, tasks, or items" loading={live.loading} />
                    </section>
                )}

                {page === 'CI' && (
                    <section className="page-ci">
                        {live.runs.length === 0
                            ? <EmptyState text="No workflow runs" loading={live.loading} />
                            : <div className="item-list">
                                {live.runs.map(r => (
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
                )}

                {page === 'Pipeline' && (
                    <section className="page-pipeline">
                        <div className="page-header"><h2>Pipeline</h2></div>
                        {live.runs.length === 0
                            ? <EmptyState text="No pipeline activity" loading={live.loading} />
                            : <div className="pipeline-stages">
                                <div className="pipeline-stage">
                                    <h3>Recent</h3>
                                    <div className="item-list">
                                        {live.runs.slice(0, 10).map(r => (
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
                                </div>
                            </div>
                        }
                    </section>
                )}

                {page === 'Branches' && (
                    <section className="page-branches">
                        {live.branches.length === 0
                            ? <EmptyState text="No branches" loading={live.loading} />
                            : <div className="item-list">
                                {live.branches.map(b => (
                                    <div key={b.name} className="item-row">
                                        <span>{b.name}</span>
                                        {b.protected && <span className="tag protected">protected</span>}
                                        {b.name === live.repo?.default_branch && <span className="tag default-tag">default</span>}
                                        <span>{b.commit.sha.slice(0, 7)}</span>
                                    </div>
                                ))}
                            </div>
                        }
                    </section>
                )}

                {page === 'Labels' && (
                    <section className="page-labels">
                        {live.labels.length === 0
                            ? <EmptyState text="No labels" loading={live.loading} />
                            : <div className="label-grid">
                                {live.labels.map(l => (
                                    <span key={l.name} className="label-chip large" style={{ background: `#${l.color}`, color: textColorForBg(l.color) }}>{l.name}</span>
                                ))}
                            </div>
                        }
                    </section>
                )}

                {page === 'Files' && (
                    <section className="page-files">
                        <div className="files-layout">
                            <div className="breadcrumb">
                                <button type="button" onClick={() => { setFilePath([]); setOpenFile(null) }}>root</button>
                                {filePath.map((seg, i) => (
                                    <button key={filePath.slice(0, i + 1).join('/')} type="button" onClick={() => { setFilePath(filePath.slice(0, i + 1)); setOpenFile(null) }}>/ {seg}</button>
                                ))}
                            </div>
                            {openFile ? (
                                <div className="file-editor">
                                    <textarea className="editor-textarea" value={editContent} onChange={e => setEditContent(e.target.value)} />
                                    <div className="editor-actions">
                                        <input className="form-input" placeholder="Commit message" value={commitMsg} onChange={e => setCommitMsg(e.target.value)} />
                                        <button className="button primary" type="button" onClick={async () => {
                                            if (!ctx) return
                                            try {
                                                await gh.putFile(ctx, openFile.path, gh.encodeContent(editContent), commitMsg || `Update ${openFile.path}`, activeBranch, openFile.sha)
                                                toast('File saved', 'success')
                                                setOpenFile(null)
                                                setCommitMsg('')
                                            } catch (e) { toast(`Failed to save file: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
                                        }}>Save</button>
                                        <button className="button" type="button" onClick={() => setOpenFile(null)}>Cancel</button>
                                    </div>
                                </div>
                            ) : dirEntries.length === 0 ? (
                                <EmptyState text="Browse files" />
                            ) : (
                                <div className="file-tree">
                                    {dirEntries.map(entry => (
                                        <div key={entry.path} className="file-entry" onClick={async () => {
                                            if (entry.type === 'dir') {
                                                setFilePath([...filePath, entry.name])
                                            } else {
                                                try {
                                                    const file = await gh.fetchFileContent(ctx, entry.path, activeBranch)
                                                    const content = gh.decodeContent(file.content)
                                                    setOpenFile({ path: file.path, content, sha: file.sha })
                                                    setEditContent(content)
                                                } catch (err) { toast(`Failed to load file: ${err instanceof Error ? err.message : 'unknown'}`, 'error') }
                                            }
                                        }}>
                                            <span className="file-icon" aria-label={entry.type === 'dir' ? 'Directory' : 'File'}>{entry.type === 'dir' ? '📁' : '📄'}</span>
                                            <span className="file-name">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {page === 'Projects' && (
                    <section className="page-projects">
                        <div className="page-header"><h2>Projects</h2></div>
                        <EmptyState text="No projects — use projects to track and coordinate work across the repo" loading={live.loading} />
                    </section>
                )}

                {page === 'Playbooks' && (
                    <section className="page-playbooks">
                        <div className="page-header"><h2>Playbooks</h2></div>
                        <EmptyState text="No playbooks — create playbooks for standard operating procedures and runbooks" loading={live.loading} />
                    </section>
                )}

                {page === 'Tools' && (
                    <section className="page-tools">
                        <div className="page-header"><h2>Tools</h2></div>
                        <EmptyState text="No tools configured — add developer tools and utilities" loading={live.loading} />
                    </section>
                )}

                {page === 'Cases' && (
                    <section className="page-cases">
                        {cases.length === 0
                            ? <EmptyState text="No open cases" loading={live.loading} />
                            : <div className="item-list">
                                {cases.map(c => {
                                    const status = c.state === 'closed' ? 'closed'
                                        : c.labels.some(l => l.name.toLowerCase().includes('resolved')) ? 'resolved'
                                        : c.labels.some(l => l.name.toLowerCase().includes('provisioned')) ? 'provisioned'
                                        : 'open'
                                    return (
                                        <a key={c.number} className="item-row case-row" href={c.html_url} target="_blank" rel="noopener noreferrer">
                                            <span className={`case-status case-${status}`}>{status}</span>
                                            <div className="item-main">
                                                <span>{c.title}</span>
                                                {c.body && <p>{c.body.slice(0, 120)}</p>}
                                            </div>
                                        </a>
                                    )
                                })}
                            </div>
                        }
                    </section>
                )}

                {page === 'Vault' && (
                    <section className="page-vault">
                        {live.variables.length === 0
                            ? <EmptyState text="No variables in vault" loading={live.loading} />
                            : <div className="item-list">
                                {live.variables.map(v => (
                                    <div key={v.name} className="item-row vault-row">
                                        <span className="vault-name">{v.name}</span>
                                        <span className="vault-value">{v.value}</span>
                                    </div>
                                ))}
                            </div>
                        }
                    </section>
                )}

                {page === 'Environments' && (
                    <section className="page-environments">
                        {envBranches.length === 0
                            ? <EmptyState text="No environments" loading={live.loading} />
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
                )}

                {page === 'Settings' && (
                    <section className="page-settings">
                        <div className="panel"><h3>GitHub Token</h3><p>Token is configured.</p></div>
                        {user && <div className="panel"><h3>Account</h3><p>Signed in as {user.login}</p></div>}
                        <button className="button" type="button" onClick={() => setCtx(null)}>Switch Repository</button>
                    </section>
                )}
            </div>

            <div className="toast-stack">
                {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
            </div>

            {cmdOpen && (
                <CommandPalette
                    onClose={() => setCmdOpen(false)}
                    onNav={p => { setPage(p); setCmdOpen(false) }}
                    onSwitchRepo={() => { setCtx(null); setCmdOpen(false) }}
                    onCreateOpen={() => { setCreateOpen(true); setCmdOpen(false) }}
                />
            )}

            {createOpen && <CreateModal onClose={() => setCreateOpen(false)} />}
        </div>
    )
}