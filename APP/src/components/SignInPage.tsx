import { useState } from 'react'

type Provider = 'github' | 'google' | 'microsoft365'

const PROVIDERS: { id: Provider; label: string; enabled: boolean }[] = [
    { id: 'github', label: 'GitHub', enabled: true },
    { id: 'google', label: 'Google', enabled: false },
    { id: 'microsoft365', label: 'Microsoft 365', enabled: false },
]

export default function SignInPage({ onGitHub }: { onGitHub: () => void }) {
    const [selected, setSelected] = useState<Provider>('github')
    const [comingSoon, setComingSoon] = useState(false)

    function handleSignIn() {
        const provider = PROVIDERS.find(p => p.id === selected)
        if (provider?.enabled) {
            onGitHub()
        } else {
            setComingSoon(true)
        }
    }

    return (
        <div className="picker-screen">
            <div className="signin-card">
                <div className="picker-brand">
                    <span className="picker-logo">LC</span>
                    <h1>LogicCommons</h1>
                </div>
                <p className="signin-subtitle">Sign in to continue</p>

                <label className="signin-label" htmlFor="provider-select">Sign in with</label>
                <select
                    id="provider-select"
                    className="signin-select"
                    value={selected}
                    onChange={e => { setSelected(e.target.value as Provider); setComingSoon(false) }}
                >
                    {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                </select>

                {comingSoon && <p className="signin-coming-soon">Coming soon — only GitHub is available right now.</p>}

                <button className="button primary signin-btn" type="button" onClick={handleSignIn}>
                    Sign In
                </button>
            </div>
        </div>
    )
}
