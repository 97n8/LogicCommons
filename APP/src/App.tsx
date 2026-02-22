import { useState, useEffect } from 'react'
import './App.css'
import * as gh from './github'
import type { RepoCtx } from './github'
import { formatDate, formatTime, NAV_GROUPS, NAV_ICONS } from './helpers'
import type { NavPage } from './helpers'
import { useToasts, useLiveData } from './hooks'
import { StatusDot, Badge } from './components/shared'
import RepoPicker from './components/RepoPicker'
import CreateModal from './components/CreateModal'
import CommandPalette from './components/CommandPalette'
import SignInPage from './components/SignInPage'
import DashboardPage from './pages/DashboardPage'
import TodayPage from './pages/TodayPage'
import IssuesPage from './pages/IssuesPage'
import PRsPage from './pages/PRsPage'
import ListsPage from './pages/ListsPage'
import CIPage from './pages/CIPage'
import PipelinePage from './pages/PipelinePage'
import BranchesPage from './pages/BranchesPage'
import LabelsPage from './pages/LabelsPage'
import FilesPage from './pages/FilesPage'
import ProjectsPage from './pages/ProjectsPage'
import PlaybooksPage from './pages/PlaybooksPage'
import ToolsPage from './pages/ToolsPage'
import CasesPage from './pages/CasesPage'
import VaultPage from './pages/VaultPage'
import EnvironmentsPage from './pages/EnvironmentsPage'
import SettingsPage from './pages/SettingsPage'
import RegistryPage from './pages/RegistryPage'
import PRDetailPanel from './components/PRDetailPanel'

export default function App() {
    const [ctx, setCtx] = useState<RepoCtx | null>(null)
    const [user, setUser] = useState<gh.GHUser | null>(null)
    const [allRepos, setAllRepos] = useState<gh.Repo[] | null>(null)
    const [crossRepoPRs, setCrossRepoPRs] = useState<(gh.PR & { _ctx: RepoCtx })[]>([])
    const [crossRepoIssues, setCrossRepoIssues] = useState<(gh.Issue & { _ctx: RepoCtx })[]>([])
    const [crossRepoRuns, setCrossRepoRuns] = useState<(gh.WorkflowRun & { _ctx: RepoCtx })[]>([])
    const [page, setPage] = useState<NavPage>('Dashboard')
    const [cmdOpen, setCmdOpen] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [createView, setCreateView] = useState<'menu' | 'Issue' | 'Branch' | 'Label' | 'PR'>('menu')
    const [authProvider, setAuthProvider] = useState<'github' | null>(gh.hasToken() ? 'github' : null)
    const [selectedPR, setSelectedPR] = useState<{ pr: gh.PR; ctx: RepoCtx } | null>(null)

    function openCreate(view: 'menu' | 'Issue' | 'Branch' | 'Label' | 'PR' = 'menu') {
        setCreateView(view)
        setCreateOpen(true)
    }
    const [issueFilter, setIssueFilter] = useState<'open' | 'closed' | 'all'>('open')
    const [filePath, setFilePath] = useState<string[]>([])
    const [dirEntries, setDirEntries] = useState<gh.FileEntry[]>([])
    const { toasts, push: toast } = useToasts()
    const live = useLiveData(ctx)
    const activeBranch = live.repo?.default_branch ?? 'main'

    useEffect(() => {
        if (!gh.hasToken()) return
        gh.fetchUser().then(setUser).catch(() => {})
        gh.fetchUserRepos().then(repos => {
            setAllRepos(repos)
            // fetch PRs, issues, runs for all repos in parallel (limit to 10 most recent)
            const targets = repos.slice(0, 10)
            Promise.all(targets.map(r => {
                const c: RepoCtx = { owner: r.owner.login, repo: r.name }
                return Promise.all([
                    gh.fetchPRs(c, 'open', 10).then(prs => prs.map(p => ({ ...p, _ctx: c }))).catch(() => []),
                    gh.fetchIssues(c, 'open', 10).then(is => is.filter(i => !i.pull_request).map(i => ({ ...i, _ctx: c }))).catch(() => []),
                    gh.fetchWorkflowRuns(c, 5).then(rs => rs.map(r => ({ ...r, _ctx: c }))).catch(() => []),
                ])
            })).then(results => {
                setCrossRepoPRs(results.flatMap(([prs]) => prs as (gh.PR & { _ctx: RepoCtx })[]))
                setCrossRepoIssues(results.flatMap(([, issues]) => issues as (gh.Issue & { _ctx: RepoCtx })[]))
                setCrossRepoRuns(results.flatMap(([,, runs]) => runs as (gh.WorkflowRun & { _ctx: RepoCtx })[]))
            })
        }).catch(() => {})
    }, [])

    useEffect(() => {
        if (page !== 'Files' || !ctx) return
        let cancelled = false
        gh.fetchDirContents(ctx, filePath.join('/'), activeBranch)
            .then(entries => { if (!cancelled) setDirEntries(Array.isArray(entries) ? entries : []) })
            .catch(() => { if (!cancelled) setDirEntries([]) })
        return () => { cancelled = true }
    }, [page, ctx, filePath, activeBranch])

    if (!authProvider) {
        return <SignInPage onGitHub={() => setAuthProvider('github')} />
    }

    if (!ctx) {
        return <div><RepoPicker onSelect={c => { setCtx(c); setPage('Dashboard') }} user={user} repos={allRepos ?? undefined} /></div>
    }

    const realIssues = live.issues.filter(i => !i.pull_request)
    const openIssues = realIssues.filter(i => i.state === 'open')
    const openPRs = live.prs.filter(p => p.state === 'open')
    const filteredIssues = issueFilter === 'all' ? realIssues : realIssues.filter(i => i.state === issueFilter)
    const cases = realIssues.filter(i => i.labels.some(l => l.name.toLowerCase().includes('case')))
    const envBranches = live.branches.filter(b => b.name.startsWith('env/'))

    return (
        <div className="os-root">
            <aside className="os-sidebar">
                <div className="brand-block brand" onClick={() => setCtx(null)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCtx(null) } }}>
                    <p className="brand-title">{ctx.owner}/{ctx.repo}</p>
                </div>
                <nav className="nav-stack">
                    {NAV_GROUPS.map(group => (
                        <div key={group.label || 'ungrouped'} className="nav-group">
                            {group.label && <div className="nav-group-label">{group.label}</div>}
                            {group.pages.map(n => (
                                <button key={n} className={`nav-item${page === n ? ' active' : ''}`} type="button" onClick={() => setPage(n)}>
                                    <span aria-hidden="true" className="nav-icon">{NAV_ICONS[n]}</span>
                                    {n}
                                    {n === 'Issues' && <Badge n={openIssues.length} />}
                                    {n === 'PRs' && <Badge n={openPRs.length} />}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button className="create-btn" type="button" onClick={() => openCreate()}>
                        <span className="create-icon">+</span>
                        New
                        <span className="create-shortcut">⌥N</span>
                    </button>
                    <button className="cmd-trigger" type="button" onClick={() => setCmdOpen(true)}>
                        <span className="cmd-icon">⌘</span>
                        <span className="cmd-label">Quick commands</span>
                        <span className="cmd-shortcut">⌘K</span>
                    </button>
                </div>
            </aside>

            <header className="os-topbar">
                <div className="topbar-actions">
                    <span className="topbar-page-title">{page}</span>
                    <StatusDot ok={live.error ? false : live.lastFetch ? true : null} />
                </div>
                <div className="topbar-actions">
                    <span className="topbar-time">{formatDate()} {formatTime()}</span>
                    <button className="button topbar-sync" type="button" onClick={live.refresh}>{live.loading ? 'Syncing…' : 'Refresh'}</button>
                </div>
            </header>

            <main className="os-main">

                <div className="page-content">
                {live.error && <div className="error-banner">Connection issue: {live.error}</div>}

                {page === 'Dashboard' && <DashboardPage repo={live.repo} openIssueCount={openIssues.length} openPRCount={openPRs.length} ctx={ctx} />}
                {page === 'Today' && <TodayPage repo={live.repo} openIssueCount={openIssues.length} openPRCount={openPRs.length} branches={live.branches} runs={live.runs} prs={live.prs} issues={realIssues} crossRepoPRs={crossRepoPRs} crossRepoIssues={crossRepoIssues} crossRepoRuns={crossRepoRuns} onSelectRepo={c => { setCtx(c); setPage('Dashboard') }} />}
                {page === 'Issues' && <IssuesPage issues={filteredIssues} loading={live.loading} filter={issueFilter} onFilterChange={setIssueFilter} ctx={ctx} toast={toast} refresh={live.refresh} />}
                {page === 'PRs' && <PRsPage prs={live.prs} loading={live.loading} ctx={ctx} toast={toast} refresh={live.refresh} onOpenPR={pr => setSelectedPR({ pr, ctx })} />}
                {page === 'Lists' && <ListsPage loading={live.loading} ctx={ctx} />}
                {page === 'CI' && <CIPage runs={live.runs} loading={live.loading} workflows={live.workflows} ctx={ctx} activeBranch={activeBranch} toast={toast} />}
                {page === 'Pipeline' && <PipelinePage runs={live.runs} loading={live.loading} ctx={ctx} toast={toast} refresh={live.refresh} />}
                {page === 'Branches' && <BranchesPage branches={live.branches} loading={live.loading} repo={live.repo} ctx={ctx} />}
                {page === 'Labels' && <LabelsPage labels={live.labels} loading={live.loading} ctx={ctx} />}
                {page === 'Files' && <FilesPage dirEntries={dirEntries} filePath={filePath} setFilePath={setFilePath} ctx={ctx} activeBranch={activeBranch} toast={toast} />}
                {page === 'Registry' && <RegistryPage ctx={ctx} loading={live.loading} toast={toast} />}
                {page === 'Projects' && <ProjectsPage loading={live.loading} ctx={ctx} />}
                {page === 'Playbooks' && <PlaybooksPage loading={live.loading} ctx={ctx} />}
                {page === 'Tools' && <ToolsPage loading={live.loading} ctx={ctx} />}
                {page === 'Cases' && <CasesPage cases={cases} loading={live.loading} ctx={ctx} />}
                {page === 'Vault' && <VaultPage variables={live.variables} loading={live.loading} ctx={ctx} toast={toast} refresh={live.refresh} />}
                {page === 'Environments' && <EnvironmentsPage envBranches={envBranches} loading={live.loading} ctx={ctx} activeBranch={activeBranch} toast={toast} />}
                {page === 'Settings' && <SettingsPage user={user} onSwitchRepo={() => setCtx(null)} />}
                </div>
            </main>

            <div className="toast-stack">
                {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
            </div>

            {selectedPR && (
                <PRDetailPanel
                    pr={selectedPR.pr}
                    ctx={selectedPR.ctx}
                    onClose={() => setSelectedPR(null)}
                    toast={toast}
                    refresh={live.refresh}
                />
            )}

            {cmdOpen && (
                <CommandPalette
                    onClose={() => setCmdOpen(false)}
                    onNav={p => { setPage(p); setCmdOpen(false) }}
                    onSwitchRepo={() => { setCtx(null); setCmdOpen(false) }}
                    onCreateOpen={(view) => { openCreate(view); setCmdOpen(false) }}
                    ctx={ctx}
                />
            )}

            {createOpen && (
                <CreateModal
                    onClose={() => setCreateOpen(false)}
                    ctx={ctx}
                    branches={live.branches}
                    toast={toast}
                    refresh={live.refresh}
                    initialView={createView}
                />
            )}
        </div>
    )
}
