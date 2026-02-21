import { EmptyState } from '../components/shared'

export default function ProjectsPage({ loading }: { loading: boolean }) {
    return (
        <section className="page-projects">
            <div className="page-header"><h2>Projects</h2></div>
            <EmptyState text="No projects — use projects to track and coordinate work across the repo" loading={loading} />
        </section>
    )
}
