import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react'
import * as gh from '../github'
import type { RepoCtx, RepoTier, DeploymentStatus } from '../github'
import { StatusBadge, DeployBadge } from './shared'
import { relativeTime } from '../helpers'

/* ── repo card ─────────────────────────────────────────────── */

function RepoCard({ repo, onClick }: { repo: gh.Repo; onClick: () => void }) {
    const status = gh.inferRepoStatus(repo)
    return (
        <button className="repo-card" type="button" onClick={onClick}>
            <div className="repo-card-header">
                <span className="repo-card-name">{repo.full_name}</span>
                <div className="repo-card-badges">
                    <StatusBadge tier={status.tier} />
                    <DeployBadge status={status.deploymentStatus} />
                    {repo.private && <span className="status-badge badge-private">Private</span>}
                </div>
            </div>
            {repo.description && <p className="repo-card-desc">{repo.description}</p>}
            <div className="repo-card-meta">
                {repo.language && <span className="repo-card-lang">{repo.language}</span>}
                <span>★ {repo.stargazers_count}</span>
                <span>⑂ {repo.forks_count}</span>
                {status.openIssueCount > 0 && <span>◎ {status.openIssueCount}</span>}
                <span className="repo-card-time">{relativeTime(repo.updated_at)}</span>
            </div>
        </button>
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

/* ── repo picker ───────────────────────────────────────────── */

type SortKey = 'activity' | 'issues' | 'stars' | 'name'

export default function RepoPicker({ onSelect, user }: { onSelect: (ctx: RepoCtx) => void; user: gh.GHUser | null }) {
    const [repos, setRepos] = useState<gh.Repo[]>([])
    const [loading, setLoading] = useState(gh.hasToken())
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const [newRepo, setNewRepo] = useState(false)
    const [creating, setCreating] = useState(false)
    const [tierFilter, setTierFilter] = useState<RepoTier | 'ALL'>('ALL')
    const [deployFilter, setDeployFilter] = useState<DeploymentStatus | 'ALL'>('ALL')
    const [sortKey, setSortKey] = useState<SortKey>('activity')
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

    const statusMap = useMemo(() => {
        const map = new Map<number, gh.RepoStatusMeta>()
        for (const r of repos) map.set(r.id, gh.inferRepoStatus(r))
        return map
    }, [repos])

    const filtered = useMemo(() => {
        let list = repos.filter(r =>
            r.full_name.toLowerCase().includes(query.toLowerCase()) ||
            (r.description ?? '').toLowerCase().includes(query.toLowerCase())
        )
        if (tierFilter !== 'ALL') list = list.filter(r => statusMap.get(r.id)?.tier === tierFilter)
        if (deployFilter !== 'ALL') list = list.filter(r => statusMap.get(r.id)?.deploymentStatus === deployFilter)

        list = [...list].sort((a, b) => {
            switch (sortKey) {
                case 'activity': return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
                case 'issues': return b.open_issues_count - a.open_issues_count
                case 'stars': return b.stargazers_count - a.stargazers_count
                case 'name': return a.full_name.localeCompare(b.full_name)
                default: return 0
            }
        })
        return list
    }, [repos, query, tierFilter, deployFilter, sortKey, statusMap])

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

                <div className="picker-controls">
                    <div className="picker-filter-group">
                        <label className="picker-filter-label">Tier</label>
                        <select className="picker-select" value={tierFilter} onChange={e => setTierFilter(e.target.value as RepoTier | 'ALL')}>
                            <option value="ALL">All tiers</option>
                            <option value="CORE">Core</option>
                            <option value="PILOT">Pilot</option>
                            <option value="DRAFT">Draft</option>
                            <option value="EXPERIMENTAL">Experimental</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>
                    </div>
                    <div className="picker-filter-group">
                        <label className="picker-filter-label">Deploy</label>
                        <select className="picker-select" value={deployFilter} onChange={e => setDeployFilter(e.target.value as DeploymentStatus | 'ALL')}>
                            <option value="ALL">All statuses</option>
                            <option value="PRODUCTION">Production</option>
                            <option value="STAGING">Staging</option>
                            <option value="LOCAL">Local</option>
                            <option value="NONE">None</option>
                        </select>
                    </div>
                    <div className="picker-filter-group">
                        <label className="picker-filter-label">Sort</label>
                        <select className="picker-select" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
                            <option value="activity">Last activity</option>
                            <option value="issues">Issue count</option>
                            <option value="stars">Stars</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
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
                    <div className="picker-grid">
                        {filtered.length === 0 && <p className="empty-state">{query ? 'No matching repositories' : 'No repositories found'}</p>}
                        {filtered.map(r => (
                            <RepoCard key={r.id} repo={r} onClick={() => onSelect({ owner: r.owner.login, repo: r.name })} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
