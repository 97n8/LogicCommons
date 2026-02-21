import { MetricCard } from '../components/shared'
import type { Repo } from '../github'
import { NA } from '../helpers'

export default function DashboardPage({ repo, openIssueCount, openPRCount }: {
    repo: Repo | null; openIssueCount: number; openPRCount: number
}) {
    return (
        <section className="page-dashboard">
            <MetricCard label="Open Issues" value={repo ? openIssueCount : NA} />
            <MetricCard label="Open PRs" value={repo ? openPRCount : NA} />
            <MetricCard label="Stars" value={repo?.stargazers_count ?? NA} />
            <MetricCard label="Forks" value={repo?.forks_count ?? NA} />
        </section>
    )
}
