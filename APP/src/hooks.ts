import { useState, useCallback, useEffect } from 'react'
import type { RepoCtx } from './github'
import * as gh from './github'

/* ── toast ─────────────────────────────────────────────────── */

export type ToastType = 'success' | 'error' | 'info'
export interface Toast { id: number; msg: string; type: ToastType }
let _tid = 0

export function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([])
    const push = useCallback((msg: string, type: ToastType = 'info') => {
        const id = ++_tid
        setToasts(p => [...p, { id, msg, type }])
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
    }, [])
    return { toasts, push }
}

/* ── live data ─────────────────────────────────────────────── */

export interface LiveState {
    repo: gh.Repo | null
    issues: gh.Issue[]
    prs: gh.PR[]
    runs: gh.WorkflowRun[]
    workflows: gh.Workflow[]
    branches: gh.Branch[]
    labels: gh.Label[]
    variables: gh.Variable[]
    loading: boolean
    error: string | null
    lastFetch: Date | null
}

export function useLiveData(ctx: RepoCtx | null) {
    const [state, setState] = useState<LiveState>({
        repo: null, issues: [], prs: [], runs: [], workflows: [], branches: [], labels: [], variables: [],
        loading: false, error: null, lastFetch: null,
    })

    const fetchAll = useCallback(async () => {
        if (!ctx) return
        setState(p => ({ ...p, loading: true, error: null }))
        try {
            const [repo, issues, prs, runs, workflows, branches, labels, variables] = await Promise.all([
                gh.fetchRepo(ctx),
                gh.fetchIssues(ctx, 'all').catch(() => [] as gh.Issue[]),
                gh.fetchPRs(ctx).catch(() => [] as gh.PR[]),
                gh.fetchWorkflowRuns(ctx).catch(() => [] as gh.WorkflowRun[]),
                gh.fetchWorkflows(ctx).catch(() => [] as gh.Workflow[]),
                gh.fetchBranches(ctx).catch(() => [] as gh.Branch[]),
                gh.fetchLabels(ctx).catch(() => [] as gh.Label[]),
                gh.fetchVariables(ctx).catch(() => [] as gh.Variable[]),
            ])
            setState({ repo, issues, prs, runs, workflows, branches, labels, variables, loading: false, error: null, lastFetch: new Date() })
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
