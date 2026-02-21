import { useState, useEffect } from 'react'
import './App.css'
import * as gh from './github'
import type { RepoCtx } from './github'
import { formatDate, formatTime, NAV_GROUPS } from './helpers'
import type { NavPage } from './helpers'
import { useToasts, useLiveData } from './hooks'
import { StatusDot, Badge } from './components/shared'
import RepoPicker from './components/RepoPicker'
import CreateModal from './components/CreateModal'
import CommandPalette from './components/CommandPalette'
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

export default function App() {
    const [ctx, setCtx] = useState<RepoCtx | null>(null)
    const [user, setUser] = useState<gh.GHUser | null>(null)
    const [page, setPage] = useState<NavPage>('Dashboard')
    const [cmdOpen, setCmdOpen] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [issueFilter, setIssueFilter] = useState<'open' | 'closed' | 'all'>('open')
    const [filePath, setFilePath] = useState<string[]>([])
    const [dirEntries, setDirEntries] = useState<gh.FileEntry[]>([])
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
        return <div><RepoPicker onSelect={c => { setCtx(c); setPage('Dashboard') }} user={user} /></div>
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
                    {NAV_GROUPS.map(group => (
                        <div key={group.label || 'ungrouped'} className="nav-group">
                            {group.label && <div className="nav-group-label">{group.label}</div>}
                            {group.pages.map(n => (
                                <button key={n} className={`nav-item${page === n ? ' active' : ''}`} type="button" onClick={() => setPage(n)}>
                                    {n}
                                    {n === 'Issues' && <Badge n={openIssues.length} />}
                                    {n === 'PRs' && <Badge n={openPRs.length} />}
                                </button>
                            ))}
                        </div>
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

                {page === 'Dashboard' && <DashboardPage repo={live.repo} openIssueCount={openIssues.length} openPRCount={openPRs.length} />}
                {page === 'Today' && <TodayPage repo={live.repo} openIssueCount={openIssues.length} openPRCount={openPRs.length} branches={live.branches} runs={live.runs} />}
                {page === 'Issues' && <IssuesPage issues={filteredIssues} loading={live.loading} filter={issueFilter} onFilterChange={setIssueFilter} />}
                {page === 'PRs' && <PRsPage prs={live.prs} loading={live.loading} />}
                {page === 'Lists' && <ListsPage loading={live.loading} />}
                {page === 'CI' && <CIPage runs={live.runs} loading={live.loading} workflows={live.workflows} ctx={ctx} activeBranch={activeBranch} toast={toast} />}
                {page === 'Pipeline' && <PipelinePage runs={live.runs} loading={live.loading} />}
                {page === 'Branches' && <BranchesPage branches={live.branches} loading={live.loading} repo={live.repo} />}
                {page === 'Labels' && <LabelsPage labels={live.labels} loading={live.loading} />}
                {page === 'Files' && <FilesPage dirEntries={dirEntries} filePath={filePath} setFilePath={setFilePath} ctx={ctx} activeBranch={activeBranch} toast={toast} />}
                {page === 'Registry' && <RegistryPage ctx={ctx} loading={live.loading} toast={toast} />}
                {page === 'Projects' && <ProjectsPage loading={live.loading} />}
                {page === 'Playbooks' && <PlaybooksPage loading={live.loading} />}
                {page === 'Tools' && <ToolsPage loading={live.loading} />}
                {page === 'Cases' && <CasesPage cases={cases} loading={live.loading} />}
                {page === 'Vault' && <VaultPage variables={live.variables} loading={live.loading} ctx={ctx} toast={toast} refresh={live.refresh} />}
                {page === 'Environments' && <EnvironmentsPage envBranches={envBranches} loading={live.loading} ctx={ctx} activeBranch={activeBranch} toast={toast} />}
                {page === 'Settings' && <SettingsPage user={user} onSwitchRepo={() => setCtx(null)} />}
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
