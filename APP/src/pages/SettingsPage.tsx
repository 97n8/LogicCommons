import type { GHUser } from '../github'

export default function SettingsPage({ user, onSwitchRepo }: { user: GHUser | null; onSwitchRepo: () => void }) {
    return (
        <section className="page-settings">
            <div className="panel"><h3>GitHub Token</h3><p>Token is configured.</p></div>
            {user && <div className="panel"><h3>Account</h3><p>Signed in as {user.login}</p></div>}
            <button className="button" type="button" onClick={onSwitchRepo}>Switch Repository</button>
        </section>
    )
}
