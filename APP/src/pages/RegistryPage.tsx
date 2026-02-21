import { useState, useEffect } from 'react'
import { EmptyState } from '../components/shared'
import type { RepoCtx } from '../github'
import * as gh from '../github'
import type { ToastType } from '../hooks'

export default function RegistryPage({ ctx, loading, toast }: {
    ctx: RepoCtx; loading: boolean; toast: (msg: string, type: ToastType) => void
}) {
    const [entries, setEntries] = useState<gh.RegistryEntry[]>([])
    const [fetching, setFetching] = useState(true)
    const [unitName, setUnitName] = useState('')
    const [deployTarget, setDeployTarget] = useState<gh.DeployTarget>('production')
    const [templateId, setTemplateId] = useState(gh.BUILTIN_TEMPLATES[0].id)
    const [scaffolding, setScaffolding] = useState(false)

    useEffect(() => {
        let cancelled = false
        gh.fetchRegistry(ctx)
            .then(e => { if (!cancelled) setEntries(e) })
            .catch(() => {})
            .finally(() => { if (!cancelled) setFetching(false) })
        return () => { cancelled = true }
    }, [ctx])

    async function handleScaffold() {
        if (!unitName.trim()) return
        setScaffolding(true)
        try {
            await gh.scaffoldRepository(ctx, unitName.trim(), templateId, deployTarget)
            toast('Unit scaffolded', 'success')
            setUnitName('')
            const updated = await gh.fetchRegistry(ctx)
            setEntries(updated)
        } catch (e) {
            toast(`Failed to scaffold: ${e instanceof Error ? e.message : 'unknown'}`, 'error')
        } finally {
            setScaffolding(false)
        }
    }

    return (
        <section className="page-registry">
            <div className="page-header"><h2>Registry</h2></div>

            <div className="surface" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <h3>Scaffold Unit</h3>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
                    <input
                        className="form-input"
                        placeholder="Unit name"
                        value={unitName}
                        onChange={e => setUnitName(e.target.value)}
                    />
                    <select className="picker-select" value={deployTarget} onChange={e => setDeployTarget(e.target.value as gh.DeployTarget)}>
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="local">Local</option>
                    </select>
                    <select className="picker-select" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                        {gh.BUILTIN_TEMPLATES.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <button className="button primary" type="button" disabled={scaffolding || !unitName.trim()} onClick={handleScaffold}>
                        {scaffolding ? 'Scaffolding…' : 'Scaffold'}
                    </button>
                </div>
            </div>

            <h3>Templates</h3>
            <div className="item-list" style={{ marginBottom: '1.5rem' }}>
                {gh.BUILTIN_TEMPLATES.map(t => (
                    <div key={t.id} className="item-row">
                        <div className="item-main">
                            <span><strong>{t.name}</strong></span>
                            <span>{t.description}</span>
                        </div>
                    </div>
                ))}
            </div>

            <h3>Registered Units</h3>
            {fetching || loading ? (
                <EmptyState text="Loading registry…" loading />
            ) : entries.length === 0 ? (
                <EmptyState text="No registered units — scaffold a unit to get started" />
            ) : (
                <div className="item-list">
                    {entries.map(e => (
                        <div key={e.name} className="item-row">
                            <div className="item-main">
                                <div className="item-title-row">
                                    <strong>{e.name}</strong>
                                    <span className={`tag ${e.status}`}>{e.status}</span>
                                </div>
                                <div>
                                    <span>Template: {e.template}</span>
                                    <span>Deploy: {e.deployTarget}</span>
                                    {e.requiredConfig.length > 0 && <span>Config: {e.requiredConfig.join(', ')}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
