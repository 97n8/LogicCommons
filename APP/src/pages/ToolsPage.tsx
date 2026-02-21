import { EmptyState } from '../components/shared'

export default function ToolsPage({ loading }: { loading: boolean }) {
    return (
        <section className="page-tools">
            <div className="page-header"><h2>Tools</h2></div>
            <EmptyState text="No tools configured — add developer tools and utilities" loading={loading} />
        </section>
    )
}
