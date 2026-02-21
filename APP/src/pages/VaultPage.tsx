import { useState, type FormEvent } from 'react'
import { EmptyState } from '../components/shared'
import type { Variable, RepoCtx } from '../github'
import * as gh from '../github'
import type { ToastType } from '../hooks'

interface VaultPageProps {
    variables: Variable[]
    loading: boolean
    ctx: RepoCtx | null
    toast: (msg: string, type?: ToastType) => void
    refresh: () => void
}

export default function VaultPage({ variables, loading, ctx, toast, refresh }: VaultPageProps) {
    const [vaultAddOpen, setVaultAddOpen] = useState(false)
    return (
        <section className="page-vault">
            <div className="page-header">
                <h2>Vault</h2>
                <button className="button primary" type="button" onClick={() => setVaultAddOpen(!vaultAddOpen)}>
                    {vaultAddOpen ? '✕ Cancel' : '+ Add Variable'}
                </button>
            </div>
            {vaultAddOpen && (
                <form className="surface vault-add-form" onSubmit={async (e: FormEvent) => {
                    e.preventDefault()
                    if (!ctx) return
                    if (!gh.hasToken()) { toast('Set a GitHub token in Settings to perform actions', 'error'); return }
                    const fd = new FormData(e.currentTarget as HTMLFormElement)
                    const name = (fd.get('name') as string).trim().toUpperCase()
                    const value = (fd.get('value') as string).trim()
                    if (!name) return
                    try {
                        await gh.setVariable(ctx, name, value)
                        toast(`Variable "${name}" saved`, 'success')
                        setVaultAddOpen(false)
                        refresh()
                    } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
                }}>
                    <input name="name" className="form-input" placeholder="NAME" required autoFocus />
                    <input name="value" className="form-input" placeholder="value" />
                    <button className="button primary" type="submit">Save</button>
                </form>
            )}
            {variables.length === 0
                ? <EmptyState text="No vault entries" loading={loading} />
                : <div className="item-list">
                    {variables.map(v => (
                        <div key={v.name} className="item-row vault-row">
                            <span className="vault-name">{v.name}</span>
                            <span className="vault-value">{v.value}</span>
                        </div>
                    ))}
                </div>
            }
        </section>
    )
}
