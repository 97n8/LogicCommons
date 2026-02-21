/* ── GitHub API client · RepoCtx pattern ────────────────────── */

const TOKEN_KEY = 'lc_gh_token'
const API = 'https://api.github.com'
const VER = '2022-11-28'

/* ── Token helpers ─────────────────────────────────────────── */

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY) }
export function setToken(t: string): void { localStorage.setItem(TOKEN_KEY, t) }
export function clearToken(): void { localStorage.removeItem(TOKEN_KEY) }
export function hasToken(): boolean { return !!getToken() }

/* ── Core fetch ────────────────────────────────────────────── */

function hdrs(write = false): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': VER,
  }
  const t = getToken()
  if (t) h.Authorization = `Bearer ${t}`
  if (write) h['Content-Type'] = 'application/json'
  return h
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...hdrs(!!init?.body), ...(init?.headers as Record<string, string> ?? {}) },
  })
  if (!res.ok) {
    let msg = `GitHub ${res.status}`
    try { const j = await res.json(); msg += `: ${j.message ?? JSON.stringify(j)}` } catch { /* empty */ }
    throw new Error(msg)
  }
  if (res.status === 204) return null as T
  return res.json()
}

function repoUrl(ctx: RepoCtx, path = ''): string {
  return `${API}/repos/${ctx.owner}/${ctx.repo}${path}`
}

/* ── Types ─────────────────────────────────────────────────── */

export interface RepoCtx { owner: string; repo: string }

export interface GHUser {
  login: string
  avatar_url: string
  name: string | null
  bio: string | null
  public_repos: number
  total_private_repos?: number
}

export interface Repo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  default_branch: string
  pushed_at: string
  updated_at: string
  private: boolean
  fork: boolean
  language: string | null
  topics: string[]
  visibility: string
  owner: { login: string; avatar_url: string }
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
  pull_request?: unknown
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

export interface FileEntry {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink'
  html_url: string
  download_url: string | null
}

export interface FileContent {
  name: string
  path: string
  sha: string
  size: number
  content: string
  encoding: string
  html_url: string
}

export interface Variable {
  name: string
  value: string
  created_at: string
  updated_at: string
}

/* ── Content helpers ───────────────────────────────────────── */

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

/* ── User-scoped endpoints ─────────────────────────────────── */

export const fetchUser = () => api<GHUser>(`${API}/user`)

export const fetchUserRepos = (perPage = 100) =>
  api<Repo[]>(`${API}/user/repos?per_page=${perPage}&sort=updated&affiliation=owner,collaborator,organization_member`)

export const createRepo = (name: string, description?: string, isPrivate = true) =>
  api<Repo>(`${API}/user/repos`, {
    method: 'POST',
    body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
  })

/* ── Repo read operations ──────────────────────────────────── */

export const fetchRepo = (ctx: RepoCtx) => api<Repo>(repoUrl(ctx))

export const fetchIssues = (ctx: RepoCtx, state: 'open' | 'closed' | 'all' = 'open', perPage = 30) =>
  api<Issue[]>(repoUrl(ctx, `/issues?state=${state}&per_page=${perPage}&sort=updated`))

export const fetchPRs = (ctx: RepoCtx, state: 'open' | 'closed' | 'all' = 'open', perPage = 30) =>
  api<PR[]>(repoUrl(ctx, `/pulls?state=${state}&per_page=${perPage}&sort=updated`))

export const fetchWorkflowRuns = (ctx: RepoCtx, perPage = 15) =>
  api<{ workflow_runs: WorkflowRun[] }>(repoUrl(ctx, `/actions/runs?per_page=${perPage}`))
    .then(r => r.workflow_runs)

export const fetchBranches = (ctx: RepoCtx, perPage = 50) =>
  api<Branch[]>(repoUrl(ctx, `/branches?per_page=${perPage}`))

export const fetchLabels = (ctx: RepoCtx, perPage = 100) =>
  api<Label[]>(repoUrl(ctx, `/labels?per_page=${perPage}`))

/* ── File / content operations ─────────────────────────────── */

export const fetchDirContents = (ctx: RepoCtx, path: string, ref?: string) =>
  api<FileEntry[]>(repoUrl(ctx, `/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ''}`))

export const fetchFileContent = (ctx: RepoCtx, path: string, ref?: string) =>
  api<FileContent>(repoUrl(ctx, `/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ''}`))

/** Create or update a file. `content` must already be base64-encoded. */
export const putFile = (
  ctx: RepoCtx,
  path: string,
  content: string,
  message: string,
  branch?: string,
  sha?: string,
) =>
  api<{ content: FileEntry }>(repoUrl(ctx, `/contents/${encodeURIComponent(path)}`), {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content,
      ...(sha ? { sha } : {}),
      ...(branch ? { branch } : {}),
    }),
  })

export const deleteFile = (ctx: RepoCtx, path: string, sha: string, message: string, branch?: string) =>
  api<void>(repoUrl(ctx, `/contents/${encodeURIComponent(path)}`), {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, ...(branch ? { branch } : {}) }),
  })

/* ── Issue / PR write operations ───────────────────────────── */

export const createIssue = (ctx: RepoCtx, title: string, body?: string, labels?: string[]) =>
  api<Issue>(repoUrl(ctx, '/issues'), {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  })

export const updateIssue = (ctx: RepoCtx, number: number, update: { title?: string; body?: string; state?: string; labels?: string[] }) =>
  api<Issue>(repoUrl(ctx, `/issues/${number}`), {
    method: 'PATCH',
    body: JSON.stringify(update),
  })

export const closeIssue = (ctx: RepoCtx, number: number) =>
  updateIssue(ctx, number, { state: 'closed' })

export const commentOnIssue = (ctx: RepoCtx, number: number, body: string) =>
  api<{ id: number }>(repoUrl(ctx, `/issues/${number}/comments`), {
    method: 'POST',
    body: JSON.stringify({ body }),
  })

export const addLabel = (ctx: RepoCtx, issueNumber: number, labels: string[]) =>
  api<Label[]>(repoUrl(ctx, `/issues/${issueNumber}/labels`), {
    method: 'POST',
    body: JSON.stringify({ labels }),
  })

export const removeLabel = (ctx: RepoCtx, issueNumber: number, label: string) =>
  api<void>(repoUrl(ctx, `/issues/${issueNumber}/labels/${encodeURIComponent(label)}`), {
    method: 'DELETE',
  })

export const createLabel = (ctx: RepoCtx, name: string, color: string, description?: string) =>
  api<Label>(repoUrl(ctx, '/labels'), {
    method: 'POST',
    body: JSON.stringify({ name, color, description }),
  })

export const mergePR = (ctx: RepoCtx, number: number, method: 'merge' | 'squash' | 'rebase' = 'merge') =>
  api<void>(repoUrl(ctx, `/pulls/${number}/merge`), {
    method: 'PUT',
    body: JSON.stringify({ merge_method: method }),
  })

export const createPR = (ctx: RepoCtx, title: string, head: string, base: string, body?: string, draft = false) =>
  api<PR>(repoUrl(ctx, '/pulls'), {
    method: 'POST',
    body: JSON.stringify({ title, head, base, body, draft }),
  })

/* ── Branch operations ─────────────────────────────────────── */

export const createBranch = (ctx: RepoCtx, name: string, sha: string) =>
  api<{ ref: string }>(repoUrl(ctx, '/git/refs'), {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
  })

export const deleteBranch = (ctx: RepoCtx, name: string) =>
  api<void>(repoUrl(ctx, `/git/refs/heads/${encodeURIComponent(name)}`), {
    method: 'DELETE',
  })

/* ── Workflow operations ───────────────────────────────────── */

export const triggerWorkflow = (ctx: RepoCtx, workflowId: string, ref = 'main') =>
  api<void>(repoUrl(ctx, `/actions/workflows/${workflowId}/dispatches`), {
    method: 'POST',
    body: JSON.stringify({ ref }),
  })

/* ── Vault (repo variables) ───────────────────────────────── */

export const fetchVariables = (ctx: RepoCtx) =>
  api<{ variables: Variable[] }>(repoUrl(ctx, '/actions/variables?per_page=30'))
    .then(r => r.variables)
    .catch(() => [] as Variable[])

export const setVariable = (ctx: RepoCtx, name: string, value: string) =>
  api<void>(repoUrl(ctx, `/actions/variables/${name}`), {
    method: 'PATCH',
    body: JSON.stringify({ name, value }),
  }).catch(async (err: Error) => {
    if (err.message.includes('404')) {
      await api<void>(repoUrl(ctx, '/actions/variables'), {
        method: 'POST',
        body: JSON.stringify({ name, value }),
      })
    } else throw err
  })

export const deleteVariable = (ctx: RepoCtx, name: string) =>
  api<void>(repoUrl(ctx, `/actions/variables/${name}`), { method: 'DELETE' })

/* ── Environment scaffolding ───────────────────────────────── */

/** Provisions a branch `env/{slug}` with scaffold files. Returns info for the caller to attach to an issue. */
export async function createEnvironment(
  ctx: RepoCtx,
  slug: string,
  description: string,
  defaultBranch: string,
): Promise<{ branch: string; files: string[]; issueComment: string }> {
  const branchName = `env/${slug}`

  // Get default-branch SHA
  const branches = await fetchBranches(ctx)
  const base = branches.find(b => b.name === defaultBranch)
  if (!base) throw new Error(`Cannot find branch "${defaultBranch}"`)

  await createBranch(ctx, branchName, base.commit.sha)

  // Scaffold files
  const files = [
    `environments/${slug}/README.md`,
    `environments/${slug}/config.json`,
    `environments/${slug}/.env.example`,
  ]

  const readme = encodeContent(
    `# Environment: ${description}\n\nBranch: \`${branchName}\`\nDate: ${new Date().toISOString()}\n\n## Status\n\n- [ ] Environment provisioned\n- [ ] Configuration set\n- [ ] Ready for development\n`
  )
  const config = encodeContent(
    JSON.stringify({ name: slug, branch: branchName, created: new Date().toISOString(), status: 'provisioning', vault: {} }, null, 2)
  )
  const envExample = encodeContent(
    `# Environment: ${slug}\n# Copy to .env and fill in values\n\nENV_NAME=${slug}\n`
  )

  await putFile(ctx, files[0], readme, `env(${slug}): scaffold environment`, branchName)
  await putFile(ctx, files[1], config, `env(${slug}): add config`, branchName)
  await putFile(ctx, files[2], envExample, `env(${slug}): add .env.example`, branchName)

  const issueComment = `🏗️ **Environment created**\n\n- Branch: \`${branchName}\`\n- Config: \`environments/${slug}/config.json\`\n- Status: provisioning\n\nScaffolded automatically by LogicCommons OS.`

  return { branch: branchName, files, issueComment }
}
