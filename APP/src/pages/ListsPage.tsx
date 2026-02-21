import { EmptyState } from '../components/shared'

export default function ListsPage({ loading }: { loading: boolean }) {
    return (
        <section className="page-lists">
            <div className="page-header"><h2>Lists</h2></div>
            <EmptyState text="No lists yet — create a list to organize issues, tasks, or items" loading={loading} />
        </section>
    )
}
