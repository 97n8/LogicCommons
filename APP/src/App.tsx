import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react'
import './App.css'
import * as gh from './github'

/* ── helpers ───────────────────────────────────────────────── */

const NA = '—'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date())
}

function formatTime(): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date())
}

/* ── toast system ──────────────────────────────────────────── */

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; msg: string; type: ToastType }

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const push = useCallback((msg: string, type: ToastType = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])
  return { toasts, push }
}

/* ── data hook ─────────────────────────────────────────────── */

interface LiveState {
  repo: gh.Repo | null
  issues: gh.Issue[]
  prs: gh.PR[]
  runs: gh.WorkflowRun[]
  branches: gh.Branch[]
  labels: gh.Label[]
  variables: gh.RepoVariable[]
  loading: boolean
  error: string | null
  lastFetch: Date | null
}

function useLiveData() {
  const [state, setState] = useState<LiveState>({
    repo: null, issues: [], prs: [], runs: [], branches: [], labels: [], variables: [],
    loading: true, error: null, lastFetch: null,
  })

  const fetchAll = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const [repo, issues, prs, runs, branches, labels, variables] = await Promise.all([
        gh.fetchRepo(),
        gh.fetchIssues('all', 50).catch(() => [] as gh.Issue[]),
        gh.fetchPRs().catch(() => [] as gh.PR[]),
        gh.fetchWorkflowRuns().catch(() => [] as gh.WorkflowRun[]),
        gh.fetchBranches().catch(() => [] as gh.Branch[]),
        gh.fetchLabels().catch(() => [] as gh.Label[]),
        gh.fetchVariables().catch(() => [] as gh.RepoVariable[]),
      ])
      setState({ repo, issues, prs, runs, branches, labels, variables, loading: false, error: null, lastFetch: new Date() })
    } catch (err) {
      setState(prev => ({
        ...prev, loading: false,
        error: err instanceof Error ? err.message : 'Fetch failed',
      }))
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 120_000)
    return () => clearInterval(id)
  }, [fetchAll])

  return { ...state, refresh: fetchAll }
}

/* ── small shared components ───────────────────────────────── */

function StatusDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? 'var(--color-muted)' : ok ? '#22c55e' : '#ef4444'
  return <span className="status-dot" style={{ background: color }} />
}

function Badge({ n, color }: { n: number; color?: string }) {
  if (!n) return null
  return <span className="badge" style={color ? { background: color } : undefined}>{n}</span>
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <article className="surface metric-card">
      <p className="meta-label">{label}</p>
      <p className="metric-value">{value}</p>
      {sub && <p className="metric-sub">{sub}</p>}
    </article>
  )
}

function EmptyState({ text, loading }: { text: string; loading?: boolean }) {
  return <p className="panel-copy na">{loading ? 'Loading…' : text}</p>
}

/* ── page: Dashboard ───────────────────────────────────────── */

function DashboardPage({ state }: { state: LiveState }) {
  const { repo, issues, prs, runs, loading } = state
  const openIssues = issues.filter(i => i.state === 'open')
  return (
    <>
      <section className="stats-row" aria-label="Key metrics">
        <MetricCard label="Open Issues" value={repo ? openIssues.length : NA} sub={repo ? `on ${repo.default_branch}` : undefined} />
        <MetricCard label="Open PRs" value={repo ? prs.filter(p => p.state === 'open').length : NA} />
        <MetricCard label="Stars" value={repo ? repo.stargazers_count : NA} />
        <MetricCard label="Forks" value={repo ? repo.forks_count : NA} />
      </section>

      <section className="grid cols-2">
        <article className="surface panel-card">
          <h2 className="panel-title">Repo Status</h2>
          {repo ? (
            <dl className="panel-dl">
              <div><dt>Last push</dt><dd>{relativeTime(repo.pushed_at)}</dd></div>
              <div><dt>Branch</dt><dd><code>{repo.default_branch}</code></dd></div>
              <div><dt>Issues</dt><dd>{openIssues.length} open</dd></div>
              <div><dt>PRs</dt><dd>{prs.filter(p => p.state === 'open').length} open</dd></div>
            </dl>
          ) : <EmptyState text="N/A" loading={loading} />}
        </article>

        <article className="surface panel-card">
          <h2 className="panel-title">Recent CI Runs <Badge n={runs.length} /></h2>
          {runs.length > 0 ? (
            <ul className="panel-list">
              {runs.slice(0, 5).map(run => (
                <li key={run.id} className="ci-row">
                  <span className={`ci-badge ci-${run.conclusion ?? run.status}`}>
                    {run.conclusion ?? run.status}
                  </span>
                  <a href={run.html_url} target="_blank" rel="noopener noreferrer">{run.name}</a>
                  <span className="meta-label"> · {run.head_branch} · {relativeTime(run.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState text="No CI runs" loading={loading} />}
        </article>

        <article className="surface panel-card">
          <h2 className="panel-title">Recent Issues <Badge n={openIssues.length} /></h2>
          {openIssues.length > 0 ? (
            <ul className="panel-list">
              {openIssues.slice(0, 5).map(issue => (
                <li key={issue.number}>
                  <a href={issue.html_url} target="_blank" rel="noopener noreferrer">#{issue.number}</a>{' '}
                  {issue.title}
                  <span className="meta-label"> · {relativeTime(issue.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState text="No open issues" loading={loading} />}
        </article>

        <article className="surface panel-card">
          <h2 className="panel-title">Open PRs <Badge n={prs.filter(p => p.state === 'open').length} /></h2>
          {prs.filter(p => p.state === 'open').length > 0 ? (
            <ul className="panel-list">
              {prs.filter(p => p.state === 'open').slice(0, 5).map(pr => (
                <li key={pr.number}>
                  <a href={pr.html_url} target="_blank" rel="noopener noreferrer">#{pr.number}</a>{' '}
                  {pr.title}
                  {pr.draft && <span className="tag draft">draft</span>}
                  <span className="meta-label"> · {pr.head.ref} → {pr.base.ref}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState text="No open PRs" loading={loading} />}
        </article>
      </section>
    </>
  )
}

/* ── page: Issues ──────────────────────────────────────────── */

function IssuesPage({ state, toast, refresh, openCreate }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void; openCreate?: boolean }) {
  const { issues, labels, loading } = state
  const [showCreate, setShowCreate] = useState(false)
  const [stateFilter, setStateFilter] = useState<'open' | 'closed' | 'all'>('open')

  // Allow parent to trigger create form open
  useEffect(() => {
    if (openCreate) setShowCreate(true)
  }, [openCreate])
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const byState = stateFilter === 'all' ? issues : issues.filter(i => i.state === stateFilter)
  const filtered = byState.filter(i =>
    i.title.toLowerCase().includes(filter.toLowerCase()) ||
    i.labels.some(l => l.name.toLowerCase().includes(filter.toLowerCase()))
  )

  async function handleClose(num: number) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings to perform actions', 'error'); return }
    setBusy(num)
    try {
      await gh.closeIssue(num)
      toast(`Issue #${num} closed`, 'success')
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings to perform actions', 'error'); return }
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title') as string
    const body = fd.get('body') as string
    const lbls = (fd.get('labels') as string).split(',').map(s => s.trim()).filter(Boolean)
    try {
      const issue = await gh.createIssue(title, body || undefined, lbls.length ? lbls : undefined)
      toast(`Issue #${issue.number} created`, 'success')
      setShowCreate(false)
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
  }

  return (
    <>
      <div className="page-header">
        <h2>Issues <Badge n={issues.filter(i => i.state === 'open').length} /></h2>
        <div className="page-actions">
          <div className="filter-tabs">
            {(['open', 'closed', 'all'] as const).map(s => (
              <button key={s} className={`button small${stateFilter === s ? ' active' : ''}`} type="button" onClick={() => setStateFilter(s)}>
                {s}
              </button>
            ))}
          </div>
          <input className="search-input" placeholder="Filter issues…" value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="button primary" type="button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Cancel' : '+ New Issue'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="surface create-form" onSubmit={handleCreate}>
          <input name="title" className="form-input" placeholder="Issue title" required autoFocus />
          <textarea name="body" className="form-input form-textarea" placeholder="Description (optional, supports markdown)" rows={4} />
          <input name="labels" className="form-input" placeholder="Labels (comma-separated, e.g. bug, help wanted)" />
          {labels.length > 0 && (
            <div className="label-chips">
              {labels.map(l => (
                <span key={l.name} className="label-chip" style={{ borderColor: `#${l.color}` }}>{l.name}</span>
              ))}
            </div>
          )}
          <button className="button primary" type="submit">Create Issue</button>
        </form>
      )}

      {filtered.length > 0 ? (
        <div className="item-list">
          {filtered.map(issue => (
            <article key={issue.number} className="surface item-row">
              <div className="item-main">
                <div className="item-title-row">
                  <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className="item-number">#{issue.number}</a>
                  <strong>{issue.title}</strong>
                  {issue.labels.map(l => (
                    <span key={l.name} className="tag" style={{ background: `#${l.color}20`, color: `#${l.color}`, borderColor: `#${l.color}` }}>{l.name}</span>
                  ))}
                </div>
                <p className="meta-label">
                  opened {relativeTime(issue.created_at)} by {issue.user.login}
                  {issue.comments > 0 && ` · ${issue.comments} comment${issue.comments > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="item-actions">
                {issue.state === 'open' ? (
                  <button className="button small" type="button" onClick={() => handleClose(issue.number)} disabled={busy === issue.number}>
                    {busy === issue.number ? '…' : '✓ Close'}
                  </button>
                ) : (
                  <button className="button small" type="button" onClick={async () => {
                    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
                    setBusy(issue.number)
                    try { await gh.reopenIssue(issue.number); toast(`Issue #${issue.number} reopened`, 'success'); refresh() }
                    catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
                    finally { setBusy(null) }
                  }} disabled={busy === issue.number}>
                    {busy === issue.number ? '…' : '↺ Reopen'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState text={filter ? 'No matching issues' : 'No open issues'} loading={loading} />}
    </>
  )
}

/* ── page: Pull Requests ───────────────────────────────────── */

function PRsPage({ state, toast, refresh }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void }) {
  const { prs, loading } = state
  const [busy, setBusy] = useState<number | null>(null)
  const openPRs = prs.filter(p => p.state === 'open')

  async function handleMerge(num: number, method: 'merge' | 'squash' | 'rebase') {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    setBusy(num)
    try {
      await gh.mergePR(num, method)
      toast(`PR #${num} merged (${method})`, 'success')
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  return (
    <>
      <div className="page-header">
        <h2>Pull Requests <Badge n={openPRs.length} /></h2>
      </div>

      {openPRs.length > 0 ? (
        <div className="item-list">
          {openPRs.map(pr => (
            <article key={pr.number} className="surface item-row">
              <div className="item-main">
                <div className="item-title-row">
                  <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="item-number">#{pr.number}</a>
                  <strong>{pr.title}</strong>
                  {pr.draft && <span className="tag draft">draft</span>}
                  {pr.labels.map(l => <span key={l.name} className="tag" style={{ background: `#${l.color}20`, color: `#${l.color}`, borderColor: `#${l.color}` }}>{l.name}</span>)}
                </div>
                <p className="meta-label">
                  {pr.head.ref} → {pr.base.ref} · opened {relativeTime(pr.created_at)} by {pr.user.login}
                </p>
              </div>
              <div className="item-actions">
                <button className="button small primary" type="button" onClick={() => handleMerge(pr.number, 'merge')} disabled={busy === pr.number || pr.draft}>
                  {busy === pr.number ? '…' : 'Merge'}
                </button>
                <button className="button small" type="button" onClick={() => handleMerge(pr.number, 'squash')} disabled={busy === pr.number || pr.draft}>
                  Squash
                </button>
                <button className="button small" type="button" onClick={() => handleMerge(pr.number, 'rebase')} disabled={busy === pr.number || pr.draft}>
                  Rebase
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState text="No open PRs" loading={loading} />}
    </>
  )
}

/* ── page: CI / Actions ────────────────────────────────────── */

function CIPage({ state }: { state: LiveState }) {
  const { runs, loading } = state
  return (
    <>
      <div className="page-header">
        <h2>CI / Actions <Badge n={runs.length} /></h2>
      </div>

      {runs.length > 0 ? (
        <div className="item-list">
          {runs.map(run => (
            <article key={run.id} className="surface item-row">
              <div className="item-main">
                <div className="item-title-row">
                  <span className={`ci-badge ci-${run.conclusion ?? run.status}`}>{run.conclusion ?? run.status}</span>
                  <strong>{run.name}</strong>
                </div>
                <p className="meta-label">
                  {run.event} · {run.head_branch} · {relativeTime(run.created_at)}
                </p>
              </div>
              <div className="item-actions">
                <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="button small">View logs</a>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState text="No workflow runs" loading={loading} />}
    </>
  )
}

/* ── page: Branches ────────────────────────────────────────── */

function BranchesPage({ state, toast, refresh }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void }) {
  const { branches, repo, loading } = state
  const [showCreate, setShowCreate] = useState(false)

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const fd = new FormData(e.currentTarget)
    const name = fd.get('name') as string
    const mainBranch = branches.find(b => b.name === repo?.default_branch)
    if (!mainBranch) { toast('Cannot find main branch SHA', 'error'); return }
    try {
      await gh.createBranch(name, mainBranch.commit.sha)
      toast(`Branch "${name}" created`, 'success')
      setShowCreate(false)
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
  }

  return (
    <>
      <div className="page-header">
        <h2>Branches <Badge n={branches.length} /></h2>
        <div className="page-actions">
          <button className="button primary" type="button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Cancel' : '+ New Branch'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="surface create-form" onSubmit={handleCreate}>
          <input name="name" className="form-input" placeholder="Branch name (e.g. feature/my-feature)" required autoFocus />
          <p className="meta-label">Will branch from <code>{repo?.default_branch ?? 'main'}</code></p>
          <button className="button primary" type="submit">Create Branch</button>
        </form>
      )}

      {branches.length > 0 ? (
        <div className="item-list">
          {branches.map(b => (
            <article key={b.name} className="surface item-row">
              <div className="item-main">
                <div className="item-title-row">
                  <code className="branch-name">{b.name}</code>
                  {b.protected && <span className="tag protected">protected</span>}
                  {b.name === repo?.default_branch && <span className="tag default-tag">default</span>}
                </div>
                <p className="meta-label">{b.commit.sha.slice(0, 7)}</p>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState text="No branches" loading={loading} />}
    </>
  )
}

/* ── page: Labels ──────────────────────────────────────────── */

function LabelsPage({ state, toast, refresh }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void }) {
  const { labels, loading } = state
  const [showCreate, setShowCreate] = useState(false)

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const fd = new FormData(e.currentTarget)
    const name = fd.get('name') as string
    const color = (fd.get('color') as string).replace('#', '')
    try {
      await gh.createLabel(name, color)
      toast(`Label "${name}" created`, 'success')
      setShowCreate(false)
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
  }

  return (
    <>
      <div className="page-header">
        <h2>Labels <Badge n={labels.length} /></h2>
        <div className="page-actions">
          <button className="button primary" type="button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Cancel' : '+ New Label'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="surface create-form inline-form" onSubmit={handleCreate}>
          <input name="name" className="form-input" placeholder="Label name" required autoFocus />
          <input name="color" className="form-input color-input" type="color" defaultValue="#2563eb" />
          <button className="button primary" type="submit">Create</button>
        </form>
      )}

      {labels.length > 0 ? (
        <div className="label-grid">
          {labels.map(l => (
            <span key={l.name} className="label-chip large" style={{ background: `#${l.color}20`, color: `#${l.color}`, borderColor: `#${l.color}` }}>
              {l.name}
            </span>
          ))}
        </div>
      ) : <EmptyState text="No labels" loading={loading} />}
    </>
  )
}

/* ── page: Files (repo content browser + editor) ───────────── */

function FilesPage({ state, toast, refresh }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void }) {
  const { branches, repo } = state
  const [currentPath, setCurrentPath] = useState('')
  const [pathStack, setPathStack] = useState<string[]>([])
  const [entries, setEntries] = useState<gh.RepoFile[]>([])
  const [loadingDir, setLoadingDir] = useState(false)
  const [editFile, setEditFile] = useState<{ path: string; content: string; sha: string } | null>(null)
  const [editContent, setEditContent] = useState('')
  const [commitMsg, setCommitMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [branch, setBranch] = useState(repo?.default_branch ?? 'main')
  const [showNew, setShowNew] = useState(false)

  // Load directory
  useEffect(() => {
    let cancelled = false
    setLoadingDir(true)
    gh.fetchDirContents(currentPath, branch)
      .then(items => {
        if (!cancelled) {
          setEntries(
            [...items].sort((a, b) => {
              if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
              return a.name.localeCompare(b.name)
            })
          )
        }
      })
      .catch(() => { if (!cancelled) setEntries([]) })
      .finally(() => { if (!cancelled) setLoadingDir(false) })
    return () => { cancelled = true }
  }, [currentPath, branch])

  function navigateTo(path: string) {
    setPathStack(prev => [...prev, currentPath])
    setCurrentPath(path)
    setEditFile(null)
  }

  function navigateUp() {
    const prev = pathStack[pathStack.length - 1] ?? ''
    setPathStack(ps => ps.slice(0, -1))
    setCurrentPath(prev)
    setEditFile(null)
  }

  async function openFile(file: gh.RepoFile) {
    try {
      const content = await gh.fetchFileContent(file.path, branch)
      const decoded = gh.decodeContent(content.content)
      setEditFile({ path: file.path, content: decoded, sha: content.sha })
      setEditContent(decoded)
      setCommitMsg('')
    } catch (e) {
      toast(`Cannot read ${file.name}: ${e instanceof Error ? e.message : 'unknown'}`, 'error')
    }
  }

  async function saveFile() {
    if (!editFile || !gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const msg = commitMsg.trim() || `update ${editFile.path}`
    setSaving(true)
    try {
      await gh.putFile(editFile.path, editContent, msg, editFile.sha, branch)
      toast(`Committed: ${msg}`, 'success')
      // Reload file to get new sha
      const updated = await gh.fetchFileContent(editFile.path, branch)
      setEditFile({ path: editFile.path, content: gh.decodeContent(updated.content), sha: updated.sha })
      setEditContent(gh.decodeContent(updated.content))
      setCommitMsg('')
      refresh()
    } catch (e) { toast(`Save failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setSaving(false) }
  }

  async function handleCreateFile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const fd = new FormData(e.currentTarget)
    const name = fd.get('name') as string
    const content = fd.get('content') as string || ''
    const path = currentPath ? `${currentPath}/${name}` : name
    const msg = fd.get('message') as string || `create ${path}`
    try {
      await gh.putFile(path, content, msg, undefined, branch)
      toast(`Created ${path}`, 'success')
      setShowNew(false)
      // Reload directory
      const items = await gh.fetchDirContents(currentPath, branch)
      setEntries([...items].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      }))
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
  }

  async function handleDelete(file: gh.RepoFile) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    if (!confirm(`Delete ${file.path}? This will commit directly to ${branch}.`)) return
    try {
      const fc = await gh.fetchFileContent(file.path, branch)
      await gh.deleteFile(file.path, fc.sha, `delete ${file.path}`, branch)
      toast(`Deleted ${file.path}`, 'success')
      setEntries(prev => prev.filter(e => e.path !== file.path))
      if (editFile?.path === file.path) setEditFile(null)
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
  }

  const hasChanges = editFile && editContent !== editFile.content

  return (
    <>
      <div className="page-header">
        <h2>Files</h2>
        <div className="page-actions">
          <select className="form-input branch-select" value={branch} onChange={e => { setBranch(e.target.value); setCurrentPath(''); setPathStack([]); setEditFile(null) }}>
            {branches.map(b => <option key={b.name}>{b.name}</option>)}
          </select>
          <button className="button primary" type="button" onClick={() => setShowNew(!showNew)}>
            {showNew ? '✕ Cancel' : '+ New File'}
          </button>
        </div>
      </div>

      {/* breadcrumb */}
      <div className="breadcrumb">
        <button className="button small" type="button" onClick={() => { setCurrentPath(''); setPathStack([]); setEditFile(null) }}>root</button>
        {currentPath.split('/').filter(Boolean).map((seg, i, arr) => (
          <span key={i}>
            <span className="breadcrumb-sep">/</span>
            <button className="button small" type="button" onClick={() => {
              const target = arr.slice(0, i + 1).join('/')
              setPathStack(prev => [...prev, currentPath])
              setCurrentPath(target)
              setEditFile(null)
            }}>{seg}</button>
          </span>
        ))}
      </div>

      {showNew && (
        <form className="surface create-form" onSubmit={handleCreateFile}>
          <input name="name" className="form-input" placeholder="filename.ext" required autoFocus />
          <textarea name="content" className="form-input form-textarea" placeholder="File content (optional)" rows={4} />
          <input name="message" className="form-input" placeholder="Commit message (optional)" />
          <button className="button primary" type="submit">Create & Commit</button>
        </form>
      )}

      <div className="files-layout">
        {/* file tree */}
        <div className="file-tree surface">
          {currentPath && (
            <button className="file-entry dir" type="button" onClick={navigateUp}>
              ↑ ..
            </button>
          )}
          {loadingDir ? <EmptyState text="Loading…" loading /> : entries.length === 0 ? <EmptyState text="Empty directory" /> : (
            entries.map(entry => (
              <div key={entry.path} className="file-entry-row">
                <button
                  className={`file-entry ${entry.type}`}
                  type="button"
                  onClick={() => entry.type === 'dir' ? navigateTo(entry.path) : openFile(entry)}
                >
                  <span className="file-icon">{entry.type === 'dir' ? '📁' : '📄'}</span>
                  <span className="file-name">{entry.name}</span>
                  {entry.type === 'file' && <span className="meta-label file-size">{entry.size > 1024 ? `${(entry.size / 1024).toFixed(1)}K` : `${entry.size}B`}</span>}
                </button>
                {entry.type === 'file' && (
                  <button className="button small danger file-delete" type="button" onClick={() => handleDelete(entry)} title="Delete">✕</button>
                )}
              </div>
            ))
          )}
        </div>

        {/* editor */}
        {editFile && (
          <div className="file-editor surface">
            <div className="editor-header">
              <strong>{editFile.path}</strong>
              {hasChanges && <span className="tag modified">modified</span>}
            </div>
            <textarea
              className="editor-textarea"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              spellCheck={false}
            />
            <div className="editor-actions">
              <input
                className="form-input"
                placeholder="Commit message…"
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
              />
              <button className="button primary" type="button" onClick={saveFile} disabled={!hasChanges || saving}>
                {saving ? 'Committing…' : 'Commit to ' + branch}
              </button>
              <button className="button" type="button" onClick={() => { setEditContent(editFile.content); setCommitMsg('') }} disabled={!hasChanges}>
                Revert
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── page: Cases ───────────────────────────────────────────── */

const CASE_LABEL = 'case'

function CasesPage({ state, toast, refresh }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void }) {
  const { issues, branches, labels, loading } = state
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open')

  // Cases are issues with labels starting with 'case'
  const cases = issues.filter(i =>
    i.labels.some(l => l.name.toLowerCase() === CASE_LABEL || l.name.toLowerCase().startsWith('case:'))
  )
  const filteredCases = filter === 'all' ? cases : cases.filter(c => c.state === filter)

  // Check if case label exists
  const hasCaseLabel = labels.some(l => l.name.toLowerCase() === CASE_LABEL)

  function getCaseStatus(c: gh.Issue): string {
    const envLabel = c.labels.find(l => l.name.startsWith('case:'))
    if (envLabel) return envLabel.name.replace('case:', '').trim()
    if (c.state === 'closed') return 'resolved'
    return 'open'
  }

  function getEnvBranch(c: gh.Issue): gh.Branch | undefined {
    const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return branches.find(b => b.name === `env/${slug}`)
  }

  async function handleCreateCase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title') as string
    const body = fd.get('body') as string

    try {
      // Ensure case label exists
      if (!hasCaseLabel) {
        await gh.createLabel(CASE_LABEL, '7c3aed', 'Case work item')
      }
      const issue = await gh.createIssue(title, body || undefined, [CASE_LABEL])
      toast(`Case #${issue.number} created: ${title}`, 'success')
      setShowCreate(false)
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
  }

  async function handleProvision(c: gh.Issue) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    setBusy(c.number)
    try {
      const result = await gh.createEnvironment(c.title, c.number)
      toast(`Environment provisioned: ${result.branch} (${result.files.length} files)`, 'success')
      // Add status label
      try { await gh.addLabel(c.number, ['case:provisioned']) } catch { /* ignore label errors */ }
      refresh()
    } catch (e) { toast(`Provision failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  async function handleClose(num: number) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    setBusy(num)
    try {
      await gh.closeIssue(num)
      try { await gh.addLabel(num, ['case:resolved']) } catch { /* */ }
      toast(`Case #${num} resolved`, 'success')
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  return (
    <>
      <div className="page-header">
        <h2>Cases <Badge n={cases.filter(c => c.state === 'open').length} /></h2>
        <div className="page-actions">
          <div className="filter-tabs">
            {(['open', 'closed', 'all'] as const).map(s => (
              <button key={s} className={`button small${filter === s ? ' active' : ''}`} type="button" onClick={() => setFilter(s)}>
                {s}
              </button>
            ))}
          </div>
          <button className="button primary" type="button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Cancel' : '+ New Case'}
          </button>
        </div>
      </div>

      <p className="panel-copy" style={{ marginBottom: 'var(--space-4)' }}>
        Cases are structured work items. Each case can provision an environment with a dedicated branch, config, and scaffold files.
      </p>

      {showCreate && (
        <form className="surface create-form" onSubmit={handleCreateCase}>
          <input name="title" className="form-input" placeholder="Case title (becomes branch name slug)" required autoFocus />
          <textarea name="body" className="form-input form-textarea" placeholder="Case description — goals, requirements, acceptance criteria" rows={5} />
          <button className="button primary" type="submit">Create Case</button>
        </form>
      )}

      {filteredCases.length > 0 ? (
        <div className="item-list">
          {filteredCases.map(c => {
            const status = getCaseStatus(c)
            const envBranch = getEnvBranch(c)
            return (
              <article key={c.number} className="surface item-row case-row">
                <div className="item-main">
                  <div className="item-title-row">
                    <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="item-number">#{c.number}</a>
                    <strong>{c.title}</strong>
                    <span className={`tag case-status case-${status}`}>{status}</span>
                    {envBranch && <span className="tag env-tag">env: {envBranch.name}</span>}
                  </div>
                  <p className="meta-label">
                    opened {relativeTime(c.created_at)} by {c.user.login}
                    {c.comments > 0 && ` · ${c.comments} comment${c.comments > 1 ? 's' : ''}`}
                  </p>
                  {c.body && <p className="case-body">{c.body.slice(0, 200)}{c.body.length > 200 ? '…' : ''}</p>}
                </div>
                <div className="item-actions case-actions">
                  {c.state === 'open' && !envBranch && (
                    <button className="button small primary" type="button" onClick={() => handleProvision(c)} disabled={busy === c.number}>
                      {busy === c.number ? '…' : '🏗️ Provision Env'}
                    </button>
                  )}
                  {c.state === 'open' && (
                    <button className="button small" type="button" onClick={() => handleClose(c.number)} disabled={busy === c.number}>
                      {busy === c.number ? '…' : '✓ Resolve'}
                    </button>
                  )}
                  {envBranch && (
                    <span className="meta-label">sha: {envBranch.commit.sha.slice(0, 7)}</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : <EmptyState text={filter === 'all' ? 'No cases yet' : `No ${filter} cases`} loading={loading} />}
    </>
  )
}

/* ── page: Vault ───────────────────────────────────────────── */

function VaultPage({ state, toast, refresh }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void }) {
  const { variables, loading } = state
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    const value = fd.get('value') as string
    try {
      await gh.setVariable(name, value)
      toast(`Variable ${name} saved`, 'success')
      setShowCreate(false)
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
  }

  async function handleDelete(name: string) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    if (!confirm(`Delete variable ${name}?`)) return
    setBusy(name)
    try {
      await gh.deleteVariable(name)
      toast(`Variable ${name} deleted`, 'success')
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  async function handleUpdate(name: string, currentValue: string) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const newValue = prompt(`Update value for ${name}:`, currentValue)
    if (newValue === null || newValue === currentValue) return
    setBusy(name)
    try {
      await gh.setVariable(name, newValue)
      toast(`Variable ${name} updated`, 'success')
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  return (
    <>
      <div className="page-header">
        <h2>Vault <Badge n={variables.length} /></h2>
        <div className="page-actions">
          <button className="button primary" type="button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Cancel' : '+ New Variable'}
          </button>
        </div>
      </div>

      <p className="panel-copy" style={{ marginBottom: 'var(--space-4)' }}>
        Repository variables (GitHub Actions). Use these for non-secret configuration shared across workflows and environments.
        Names are auto-uppercased with underscores.
      </p>

      {showCreate && (
        <form className="surface create-form" onSubmit={handleCreate}>
          <input name="name" className="form-input" placeholder="VARIABLE_NAME" required autoFocus />
          <textarea name="value" className="form-input form-textarea" placeholder="Variable value" rows={3} required />
          <button className="button primary" type="submit">Save Variable</button>
        </form>
      )}

      {variables.length > 0 ? (
        <div className="item-list">
          {variables.map(v => (
            <article key={v.name} className="surface item-row vault-row">
              <div className="item-main">
                <div className="item-title-row">
                  <code className="vault-name">{v.name}</code>
                </div>
                <p className="vault-value">{v.value}</p>
                <p className="meta-label">updated {relativeTime(v.updated_at)}</p>
              </div>
              <div className="item-actions">
                <button className="button small" type="button" onClick={() => handleUpdate(v.name, v.value)} disabled={busy === v.name}>
                  Edit
                </button>
                <button className="button small danger" type="button" onClick={() => handleDelete(v.name)} disabled={busy === v.name}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState text="No variables configured" loading={loading} />}
    </>
  )
}

/* ── page: Environments ────────────────────────────────────── */

function EnvironmentsPage({ state, toast, refresh }: { state: LiveState; toast: (m: string, t: ToastType) => void; refresh: () => void }) {
  const { branches, issues, loading } = state
  const [busy, setBusy] = useState<string | null>(null)

  // Environments = branches with env/ prefix
  const envBranches = branches.filter(b => b.name.startsWith('env/'))

  // Cases that have been provisioned
  const provisionedCases = issues.filter(i =>
    i.labels.some(l => l.name.toLowerCase().startsWith('case:provisioned') || l.name.toLowerCase().startsWith('case:active'))
  )

  function getLinkedCase(envBranch: gh.Branch): gh.Issue | undefined {
    const slug = envBranch.name.replace('env/', '')
    return issues.find(i => {
      const issueSlug = i.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      return issueSlug === slug && i.labels.some(l => l.name.toLowerCase() === CASE_LABEL || l.name.toLowerCase().startsWith('case:'))
    })
  }

  async function handleDeleteEnv(branchName: string) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    if (!confirm(`Delete environment branch ${branchName}? This cannot be undone.`)) return
    setBusy(branchName)
    try {
      await gh.deleteBranch(branchName)
      toast(`Environment ${branchName} deleted`, 'success')
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  async function handleCreatePR(envBranch: gh.Branch) {
    if (!gh.hasToken()) { toast('Set a GitHub token in Settings', 'error'); return }
    const linkedCase = getLinkedCase(envBranch)
    const slug = envBranch.name.replace('env/', '')
    setBusy(envBranch.name)
    try {
      const pr = await gh.createPR(
        `env(${slug}): merge environment`,
        envBranch.name,
        'main',
        linkedCase ? `Merges environment from Case #${linkedCase.number}\n\n${linkedCase.body ?? ''}` : `Merges environment branch ${envBranch.name}`
      )
      toast(`PR #${pr.number} created for ${envBranch.name}`, 'success')
      refresh()
    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
    finally { setBusy(null) }
  }

  return (
    <>
      <div className="page-header">
        <h2>Environments <Badge n={envBranches.length} /></h2>
      </div>

      <p className="panel-copy" style={{ marginBottom: 'var(--space-4)' }}>
        Environments are provisioned from Cases. Each environment gets a dedicated branch (<code>env/slug</code>),
        scaffold files, and config. When ready, create a PR to merge back to main.
      </p>

      {envBranches.length > 0 ? (
        <div className="item-list">
          {envBranches.map(env => {
            const linkedCase = getLinkedCase(env)
            const slug = env.name.replace('env/', '')
            return (
              <article key={env.name} className="surface item-row env-row">
                <div className="item-main">
                  <div className="item-title-row">
                    <code className="branch-name">{env.name}</code>
                    {linkedCase && <span className="tag case-link">Case #{linkedCase.number}</span>}
                    {linkedCase && <span className={`tag case-status case-${linkedCase.state}`}>{linkedCase.state}</span>}
                  </div>
                  <p className="meta-label">
                    sha: {env.commit.sha.slice(0, 7)}
                    {linkedCase && ` · ${linkedCase.title}`}
                  </p>
                  <div className="env-files-hint">
                    <span className="meta-label">📁 environments/{slug}/</span>
                  </div>
                </div>
                <div className="item-actions">
                  <button className="button small primary" type="button" onClick={() => handleCreatePR(env)} disabled={busy === env.name}>
                    {busy === env.name ? '…' : '↗ Create PR'}
                  </button>
                  <button className="button small danger" type="button" onClick={() => handleDeleteEnv(env.name)} disabled={busy === env.name}>
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : <EmptyState text={provisionedCases.length > 0 ? 'Environment branches may have been merged' : 'No environments — create a Case first and provision it'} loading={loading} />}
    </>
  )
}

/* ── page: Settings ────────────────────────────────────────── */

function SettingsPage({ toast }: { toast: (m: string, t: ToastType) => void }) {
  const [token, setTokenVal] = useState(gh.getToken() ?? '')
  const [saved, setSaved] = useState(gh.hasToken())

  // Sync token state when changed in another tab
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'lc_github_token' || e.key === null) {
        const current = gh.getToken() ?? ''
        setTokenVal(current)
        setSaved(!!current)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function handleSave() {
    if (token.trim()) {
      gh.setToken(token.trim())
      setSaved(true)
      toast('Token saved (stored in localStorage)', 'success')
    }
  }

  function handleClear() {
    gh.clearToken()
    setTokenVal('')
    setSaved(false)
    toast('Token cleared', 'info')
  }

  return (
    <>
      <div className="page-header"><h2>Settings</h2></div>

      <article className="surface panel-card">
        <h3 className="panel-title">GitHub Personal Access Token</h3>
        <p className="panel-copy">Required for write operations (create issues, merge PRs, manage labels, etc.). Generate at <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer">github.com/settings/tokens</a>.</p>
        <p className="panel-copy" style={{ marginTop: '0.5rem' }}>Scopes needed: <code>repo</code> (or fine-grained: Issues R/W, Pull Requests R/W, Actions R/W, Contents R/W).</p>
        <div className="token-form">
          <input
            className="form-input"
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={token}
            onChange={e => { setTokenVal(e.target.value); setSaved(false) }}
          />
          <button className="button primary" type="button" onClick={handleSave} disabled={!token.trim() || saved}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
          {saved && <button className="button" type="button" onClick={handleClear}>Clear</button>}
        </div>
        <p className="meta-label" style={{ marginTop: 'var(--space-2)' }}>
          {saved ? '🟢 Token configured — write operations enabled' : '🔴 No token — read-only mode'}
        </p>
      </article>

      <article className="surface panel-card" style={{ marginTop: 'var(--space-4)' }}>
        <h3 className="panel-title">System Info</h3>
        <dl className="panel-dl">
          <div><dt>App</dt><dd>LogicCommons v0.1.0</dd></div>
          <div><dt>Runtime</dt><dd>Vite 7 + React 19</dd></div>
          <div><dt>Repo</dt><dd>97n8/LogicCommons</dd></div>
          <div><dt>Auth</dt><dd>{saved ? 'Token active' : 'Read-only'}</dd></div>
          <div><dt>Refresh</dt><dd>Every 2 min (auto)</dd></div>
        </dl>
      </article>
    </>
  )
}

/* ── command palette ───────────────────────────────────────── */

type NavPage = 'Dashboard' | 'Issues' | 'PRs' | 'CI' | 'Branches' | 'Labels' | 'Files' | 'Cases' | 'Vault' | 'Environments' | 'Settings'

interface CmdItem { label: string; action: () => void; shortcut?: string }

function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: CmdItem[] }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // Reset and focus on open — deferred to avoid synchronous setState warning
      const id = setTimeout(() => {
        setQuery('')
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(id)
    }
  }, [open])

  if (!open) return null

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette surface" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder="Type a command…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter' && filtered.length > 0) {
              filtered[0].action()
              onClose()
            }
          }}
        />
        <ul className="cmd-list">
          {filtered.map((cmd, i) => (
            <li key={i}>
              <button className="cmd-item" type="button" onClick={() => { cmd.action(); onClose() }}>
                <span>{cmd.label}</span>
                {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="cmd-empty">No matching commands</li>}
        </ul>
      </div>
    </div>
  )
}

/* ── app ───────────────────────────────────────────────────── */

function App() {
  const data = useLiveData()
  const { toasts, push: toast } = useToasts()
  const [clock, setClock] = useState(formatTime())
  const [date, setDate] = useState(formatDate())
  const [page, setPage] = useState<NavPage>('Dashboard')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [issueCreateFlag, setIssueCreateFlag] = useState(false)

  // live clock — update time every second, date every minute
  useEffect(() => {
    const clockId = setInterval(() => setClock(formatTime()), 1_000)
    const dateId = setInterval(() => setDate(formatDate()), 60_000)
    return () => { clearInterval(clockId); clearInterval(dateId) }
  }, [])

  // global keyboard shortcuts: Cmd+K palette + number keys for nav
  useEffect(() => {
    const pageByKey: Record<string, NavPage> = {
      '1': 'Dashboard', '2': 'Issues', '3': 'PRs', '4': 'CI',
      '5': 'Branches', '6': 'Labels', '7': 'Files', '8': 'Cases',
      '9': 'Vault', '0': 'Environments',
    }
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
        return
      }
      // Number shortcuts only when palette is closed and not typing in an input
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !cmdOpen) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); data.refresh(); return }
        const dest = pageByKey[e.key]
        if (dest) { e.preventDefault(); setPage(dest) }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [cmdOpen, data])

  const cases = data.issues.filter(i =>
    i.labels.some(l => l.name.toLowerCase() === 'case' || l.name.toLowerCase().startsWith('case:'))
  )
  const envBranches = data.branches.filter(b => b.name.startsWith('env/'))

  const navItems: { label: NavPage; badge?: number }[] = [
    { label: 'Dashboard' },
    { label: 'Issues', badge: data.issues.filter(i => i.state === 'open').length },
    { label: 'PRs', badge: data.prs.filter(p => p.state === 'open').length },
    { label: 'CI', badge: data.runs.filter(r => r.status === 'in_progress').length },
    { label: 'Branches', badge: data.branches.length },
    { label: 'Labels' },
    { label: 'Files' },
    { label: 'Cases', badge: cases.filter(c => c.state === 'open').length },
    { label: 'Vault', badge: data.variables.length },
    { label: 'Environments', badge: envBranches.length },
    { label: 'Settings' },
  ]

  const commands: CmdItem[] = [
    { label: 'Go to Dashboard', action: () => setPage('Dashboard'), shortcut: '1' },
    { label: 'Go to Issues', action: () => setPage('Issues'), shortcut: '2' },
    { label: 'Go to Pull Requests', action: () => setPage('PRs'), shortcut: '3' },
    { label: 'Go to CI / Actions', action: () => setPage('CI'), shortcut: '4' },
    { label: 'Go to Branches', action: () => setPage('Branches'), shortcut: '5' },
    { label: 'Go to Labels', action: () => setPage('Labels'), shortcut: '6' },
    { label: 'Go to Files', action: () => setPage('Files'), shortcut: '7' },
    { label: 'Go to Cases', action: () => setPage('Cases'), shortcut: '8' },
    { label: 'Go to Vault', action: () => setPage('Vault'), shortcut: '9' },
    { label: 'Go to Environments', action: () => setPage('Environments'), shortcut: '0' },
    { label: 'Go to Settings', action: () => setPage('Settings') },
    { label: 'Refresh data', action: () => data.refresh(), shortcut: 'R' },
    { label: 'New Issue', action: () => { setPage('Issues'); setIssueCreateFlag(true) } },
    { label: 'New Case', action: () => setPage('Cases') },
    { label: 'New File', action: () => setPage('Files') },
    { label: 'New Variable', action: () => setPage('Vault') },
    { label: 'Open repo on GitHub', action: () => window.open(`https://github.com/97n8/LogicCommons`, '_blank') },
  ]

  const pageContent = useMemo(() => {
    const pages: Record<NavPage, React.JSX.Element> = {
      Dashboard: <DashboardPage state={data} />,
      Issues: <IssuesPage state={data} toast={toast} refresh={data.refresh} openCreate={issueCreateFlag} />,
      PRs: <PRsPage state={data} toast={toast} refresh={data.refresh} />,
      CI: <CIPage state={data} />,
      Branches: <BranchesPage state={data} toast={toast} refresh={data.refresh} />,
      Labels: <LabelsPage state={data} toast={toast} refresh={data.refresh} />,
      Files: <FilesPage state={data} toast={toast} refresh={data.refresh} />,
      Cases: <CasesPage state={data} toast={toast} refresh={data.refresh} />,
      Vault: <VaultPage state={data} toast={toast} refresh={data.refresh} />,
      Environments: <EnvironmentsPage state={data} toast={toast} refresh={data.refresh} />,
      Settings: <SettingsPage toast={toast} />,
    }
    // Clear the one-shot create flag after consuming it
    if (issueCreateFlag) setTimeout(() => setIssueCreateFlag(false), 0)
    return pages[page]
  }, [page, data, toast, issueCreateFlag])

  return (
    <div className="os-root">
      {/* ── sidebar ── */}
      <aside className="os-sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <p className="brand-label">Workspace</p>
          <h1 className="brand-title">LogicCommons</h1>
        </div>

        <nav className="nav-stack" aria-label="Main sections">
          {navItems.map(item => (
            <button
              key={item.label}
              type="button"
              className={`nav-item${page === item.label ? ' active' : ''}`}
              onClick={() => setPage(item.label)}
            >
              {item.label}
              {item.badge ? <Badge n={item.badge} /> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer surface">
          <p className="meta-label">{date}</p>
          <p className="meta-value clock">{clock}</p>
          <div className="sidebar-status">
            <StatusDot ok={data.error ? false : data.repo ? true : null} />
            <span className="meta-label">
              {data.loading ? 'Syncing…' : data.error ? 'Offline' : 'Live'}
            </span>
          </div>
          <button className="cmd-trigger" type="button" onClick={() => setCmdOpen(true)}>
            ⌘K
          </button>
        </div>
      </aside>

      {/* ── topbar ── */}
      <header className="os-topbar">
        <div>
          <p className="meta-label">Public Logic OS</p>
          <strong>{page === 'Dashboard' ? 'LogicCommons Operations' : page}</strong>
        </div>
        <div className="topbar-actions">
          <span className="meta-label topbar-sync">
            {data.lastFetch ? `Updated ${relativeTime(data.lastFetch.toISOString())}` : 'Not synced'}
          </span>
          <button className="button" type="button" onClick={data.refresh} disabled={data.loading}>
            {data.loading ? '⟳ Syncing…' : '⟳ Refresh'}
          </button>
        </div>
      </header>

      {/* ── main ── */}
      <main className="os-main">
        {data.error && (
          <div className="error-banner surface" role="alert">
            <strong>Connection issue:</strong> {data.error} — data may be stale or N/A.
          </div>
        )}
        {pageContent}
      </main>

      {/* ── command palette ── */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />

      {/* ── toasts ── */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  )
}

export default App
