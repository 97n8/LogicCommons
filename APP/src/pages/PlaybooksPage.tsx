import { EmptyState } from '../components/shared'

export default function PlaybooksPage({ loading }: { loading: boolean }) {
    return (
        <section className="page-playbooks">
            <div className="page-header"><h2>Playbooks</h2></div>
            <EmptyState text="No playbooks — create playbooks for standard operating procedures and runbooks" loading={loading} />
        </section>
    )
}
