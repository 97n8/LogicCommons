/* ── GitHub API client with token auth ──────────────────────── */

const REPO = '97n8/LogicCommons'
const BASE = `https://api.github.com/repos/${REPO}`

const TOKEN_KEY = 'lc_github_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasToken(): boolean {
  return !!getToken()
}

function headers(write = false): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  const token = getToken()
  if (token) h.Authorization = `Bearer ${token}`
  if (write) h['Content-Type'] = 'application/json'
  return h
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(!!init?.body), ...(init?.headers as Record<string, string> ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`)
  }
  if (res.status === 204) return null as T
  return res.json()
}

/* ── Types ─────────────────────────────────────────────────── */

export interface Repo {
  open_issues_count: number
  stargazers_count: number
  forks_count: number
  default_branch: string
  pushed_at: string
  full_name: string
  description: string | null
  html_url: string
}

export interface Label {
  name: string
  color: string
  description?: string | null
}

export interface Issue {
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  labels: Label[]
  created_at: string
  updated_at: string
  user: { login: string; avatar_url: string }
  pull_request?: { url: string }
  comments: number
}

export interface PR {
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  labels: Label[]
  created_at: string
  updated_at: string
  merged_at: string | null
  user: { login: string; avatar_url: string }
  head: { ref: string }
  base: { ref: string }
  draft: boolean
}

export interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  html_url: string
  created_at: string
  head_branch: string
  event: string
}

export interface Branch {
  name: string
  commit: { sha: string }
  protected: boolean
}

export interface RepoFile {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir'
  html_url: string
  download_url: string | null
}

export interface FileContent {
  name: string
  path: string
  sha: string
  size: number
  content: string   // base64
  encoding: string
  html_url: string
}

export interface CommitResult {
  content: { sha: string; path: string; html_url: string }
  commit: { sha: string; message: string; html_url: string }
}

/* ── Read operations ───────────────────────────────────────── */

export const fetchRepo = () => api<Repo>('')

export const fetchIssues = (state: 'open' | 'closed' | 'all' = 'open', perPage = 20) =>
  api<Issue[]>(`/issues?state=${state}&per_page=${perPage}&sort=updated`)
    .then(items => items.filter(i => !i.pull_request))

export const fetchPRs = (state: 'open' | 'closed' | 'all' = 'open', perPage = 20) =>
  api<PR[]>(`/pulls?state=${state}&per_page=${perPage}&sort=updated`)

export const fetchWorkflowRuns = (perPage = 10) =>
  api<{ workflow_runs: WorkflowRun[] }>(`/actions/runs?per_page=${perPage}`)
    .then(r => r.workflow_runs)

export const fetchBranches = (perPage = 30) =>
  api<Branch[]>(`/branches?per_page=${perPage}`)

export const fetchLabels = () =>
  api<Label[]>(`/labels?per_page=50`)

/* ── File / content operations ─────────────────────────────── */

export const fetchDirContents = (path: string, ref?: string) =>
  api<RepoFile[]>(`/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ''}`)

export const fetchFileContent = (path: string, ref?: string) =>
  api<FileContent>(`/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ''}`)

export function decodeContent(base64: string): string {
  return decodeURIComponent(
    atob(base64.replace(/\n/g, ''))
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

export function encodeContent(text: string): string {
  return btoa(
    encodeURIComponent(text)
      .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)))
  )
}

/** Create or update a file in the repo (commits directly) */
export const putFile = (
  path: string,
  content: string,
  message: string,
  sha?: string,         // required for updates, omit for create
  branch?: string,
) =>
  api<CommitResult>(`/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encodeContent(content),
      ...(sha ? { sha } : {}),
      ...(branch ? { branch } : {}),
    }),
  })

export const deleteFile = (path: string, sha: string, message: string, branch?: string) =>
  api<CommitResult>(`/contents/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message,
      sha,
      ...(branch ? { branch } : {}),
    }),
  })

/* ── Write operations (require token) ──────────────────────── */

export const createIssue = (title: string, body?: string, labels?: string[]) =>
  api<Issue>('/issues', {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  })

export const updateIssue = (number: number, update: { title?: string; body?: string; state?: string; labels?: string[] }) =>
  api<Issue>(`/issues/${number}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })

export const closeIssue = (number: number) =>
  api<Issue>(`/issues/${number}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  })

export const reopenIssue = (number: number) =>
  api<Issue>(`/issues/${number}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'open' }),
  })

export const addLabel = (issueNumber: number, labels: string[]) =>
  api<Label[]>(`/issues/${issueNumber}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  })

export const removeLabel = (issueNumber: number, label: string) =>
  api<void>(`/issues/${issueNumber}/labels/${encodeURIComponent(label)}`, {
    method: 'DELETE',
  })

export const createLabel = (name: string, color: string, description?: string) =>
  api<Label>('/labels', {
    method: 'POST',
    body: JSON.stringify({ name, color, description }),
  })

export const commentOnIssue = (number: number, body: string) =>
  api<{ id: number }>(`/issues/${number}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })

export const mergePR = (number: number, method: 'merge' | 'squash' | 'rebase' = 'merge') =>
  api<{ merged: boolean }>(`/pulls/${number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: method }),
  })

export const triggerWorkflow = (workflowId: string, ref = 'main') =>
  api<void>(`/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref }),
  })

export const createBranch = (name: string, sha: string) =>
  fetch(`https://api.github.com/repos/${REPO}/git/refs`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
  }).then(r => {
    if (!r.ok) throw new Error(`Failed to create branch: ${r.status}`)
    return r.json()
  })

export const deleteBranch = (name: string) =>
  fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: headers(),
  }).then(r => {
    if (!r.ok) throw new Error(`Failed to delete branch: ${r.status}`)
  })

export const createPR = (title: string, head: string, base: string, body?: string) =>
  api<PR>('/pulls', {
    method: 'POST',
    body: JSON.stringify({ title, head, base, body }),
  })

/* ── Environment scaffolding ───────────────────────────────── */

/** Creates a full environment from a case: branch + scaffold files + issue update */
export async function createEnvironment(caseName: string, issueNumber: number): Promise<{ branch: string; files: string[] }> {
  const slug = caseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const branchName = `env/${slug}`

  // Get main SHA
  const branches = await fetchBranches()
  const main = branches.find(b => b.name === 'main')
  if (!main) throw new Error('Cannot find main branch')

  // Create branch
  await createBranch(branchName, main.commit.sha)

  // Scaffold files
  const files = [
    `environments/${slug}/README.md`,
    `environments/${slug}/config.json`,
    `environments/${slug}/.env.example`,
  ]

  const readmeContent = `# Environment: ${caseName}\n\nCreated from Case #${issueNumber}\nBranch: \`${branchName}\`\nDate: ${new Date().toISOString()}\n\n## Status\n\n- [ ] Environment provisioned\n- [ ] Configuration set\n- [ ] Ready for development\n`
  const configContent = JSON.stringify({
    name: slug,
    case: issueNumber,
    branch: branchName,
    created: new Date().toISOString(),
    status: 'provisioning',
    vault: {},
  }, null, 2)
  const envExample = `# Environment: ${slug}\n# Copy to .env and fill in values\n\nENV_NAME=${slug}\nCASE_NUMBER=${issueNumber}\n`

  await putFile(files[0], readmeContent, `env(${slug}): scaffold environment from case #${issueNumber}`, undefined, branchName)
  await putFile(files[1], configContent, `env(${slug}): add config`, undefined, branchName)
  await putFile(files[2], envExample, `env(${slug}): add .env.example`, undefined, branchName)

  // Update the issue with environment info
  await commentOnIssue(issueNumber, `🏗️ **Environment created**\n\n- Branch: \`${branchName}\`\n- Config: \`environments/${slug}/config.json\`\n- Status: provisioning\n\nScaffolded automatically by LogicCommons OS.`)

  return { branch: branchName, files }
}

/* ── Vault operations (repo-level variables via API) ──────── */

export interface RepoVariable {
  name: string
  value: string
  created_at: string
  updated_at: string
}

export const fetchVariables = () =>
  api<{ variables: RepoVariable[] }>(`/actions/variables?per_page=30`)
    .then(r => r.variables)
    .catch(() => [] as RepoVariable[])

export const setVariable = (name: string, value: string) =>
  // try update first, create if 404
  api<void>(`/actions/variables/${name}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, value }),
  }).catch(async (err: Error) => {
    if (err.message.includes('404')) {
      await api<void>('/actions/variables', {
        method: 'POST',
        body: JSON.stringify({ name, value }),
      })
    } else throw err
  })

export const deleteVariable = (name: string) =>
  api<void>(`/actions/variables/${name}`, { method: 'DELETE' })
