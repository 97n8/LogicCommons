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

export type RepoTier = 'CORE' | 'PILOT' | 'DRAFT' | 'ARCHIVED' | 'EXPERIMENTAL'
export type DeploymentStatus = 'PRODUCTION' | 'STAGING' | 'LOCAL' | 'NONE'

export interface RepoStatusMeta {
  tier: RepoTier
  deploymentStatus: DeploymentStatus
  lastDeployAt: string | null
  openPRCount: number
  openIssueCount: number
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
  archived?: boolean
  language: string | null
  topics: string[]
  visibility: string
  owner: { login: string; avatar_url: string }
}

/** Derive governance metadata from repo data heuristically. */
const CORE_MIN_STARS = 5
const CORE_MIN_FORKS = 2
const MAX_DEPLOY_AGE_DAYS = 90

export function inferRepoStatus(r: Repo): RepoStatusMeta {
  const topicsLower = r.topics.map(t => t.toLowerCase())

  let tier: RepoTier = 'DRAFT'
  if (r.archived || topicsLower.includes('archived')) tier = 'ARCHIVED'
  else if (topicsLower.includes('core') || topicsLower.includes('production')) tier = 'CORE'
  else if (topicsLower.includes('pilot') || topicsLower.includes('beta')) tier = 'PILOT'
  else if (topicsLower.includes('experimental') || topicsLower.includes('spike')) tier = 'EXPERIMENTAL'
  else if (r.stargazers_count >= CORE_MIN_STARS || r.forks_count >= CORE_MIN_FORKS) tier = 'CORE'

  let deploymentStatus: DeploymentStatus = 'NONE'
  if (topicsLower.includes('production') || topicsLower.includes('deployed')) deploymentStatus = 'PRODUCTION'
  else if (topicsLower.includes('staging') || topicsLower.includes('preview')) deploymentStatus = 'STAGING'
  else if (topicsLower.includes('local') || topicsLower.includes('dev')) deploymentStatus = 'LOCAL'
  else if (tier === 'CORE') deploymentStatus = 'PRODUCTION'

  const daysSincePush = (Date.now() - new Date(r.pushed_at).getTime()) / 86_400_000
  const lastDeployAt = deploymentStatus !== 'NONE' && daysSincePush < MAX_DEPLOY_AGE_DAYS ? r.pushed_at : null

  return {
    tier,
    deploymentStatus,
    lastDeployAt,
    openPRCount: 0,
    openIssueCount: r.open_issues_count,
  }
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

export interface Workflow {
  id: number
  name: string
  path: string
  state: string
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

export const fetchWorkflows = (ctx: RepoCtx) =>
  api<{ workflows: Workflow[] }>(repoUrl(ctx, '/actions/workflows?per_page=30'))
    .then(r => r.workflows)
    .catch(() => [] as Workflow[])

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

/* ── Control Plane: types ──────────────────────────────────── */

export type DeployTarget = 'vercel' | 'docker' | 'github-pages' | 'custom'
export type RegistryStatus = 'provisioning' | 'active' | 'archived'

export interface RegistryEntry {
  repoName: string
  owner: string
  templateName: string
  templateVersion: string
  deployTarget: DeployTarget
  requiredConfig: string[]
  status: RegistryStatus
  upgradePath: string | null
  createdAt: string
}

export interface RepoTemplate {
  name: string
  version: string
  language: string
  deployTarget: DeployTarget
  secrets: string[]
  files: { path: string; content: string }[]
}

/* ── Control Plane: built-in templates ─────────────────────── */

function tsDockerTemplate(name: string, description: string): RepoTemplate {
  return {
    name: 'typescript-docker',
    version: '1.0.0',
    language: 'TypeScript',
    deployTarget: 'docker',
    secrets: ['NODE_ENV', 'PORT'],
    files: [
      {
        path: 'README.md',
        content:
          `# ${name}\n\n${description}\n\n## Architecture\n\nThis repository was scaffolded by the LogicCommons Control Plane using the \`typescript-docker@1.0.0\` template.\n\n- **Language:** TypeScript\n- **Runtime:** Node.js 20\n- **Container:** Docker (multi-stage build)\n- **Deploy target:** Docker / any container host\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run build\nnpm start\n\`\`\`\n\n## Docker\n\n\`\`\`bash\ndocker build -t ${name} .\ndocker run -p 3000:3000 ${name}\n\`\`\`\n`,
      },
      {
        path: 'Dockerfile',
        content:
          `FROM node:20-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine\nWORKDIR /app\nCOPY --from=build /app/dist ./dist\nCOPY --from=build /app/node_modules ./node_modules\nCOPY --from=build /app/package.json ./\nENV NODE_ENV=production\nEXPOSE 3000\nCMD ["node", "dist/index.js"]\n`,
      },
      {
        path: '.env.example',
        content: `# ${name} environment variables\n# Copy to .env and fill in values\n\nNODE_ENV=development\nPORT=3000\n`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', outDir: 'dist', rootDir: 'src', strict: true, esModuleInterop: true, skipLibCheck: true, declaration: true }, include: ['src'] }, null, 2) + '\n',
      },
      {
        path: 'package.json',
        content: JSON.stringify({ name, version: '0.1.0', description, private: true, type: 'module', scripts: { build: 'tsc', start: 'node dist/index.js', dev: 'tsc --watch' }, engines: { node: '>=20' } }, null, 2) + '\n',
      },
      {
        path: 'src/index.ts',
        content: `console.log('${name} is running');\n`,
      },
    ],
  }
}

function tsVercelTemplate(name: string, description: string): RepoTemplate {
  return {
    name: 'typescript-vercel',
    version: '1.0.0',
    language: 'TypeScript',
    deployTarget: 'vercel',
    secrets: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
    files: [
      {
        path: 'README.md',
        content:
          `# ${name}\n\n${description}\n\n## Architecture\n\nScaffolded by LogicCommons Control Plane using \`typescript-vercel@1.0.0\`.\n\n- **Language:** TypeScript\n- **Deploy target:** Vercel\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Deploy\n\n\`\`\`bash\nnpx vercel --prod\n\`\`\`\n`,
      },
      {
        path: '.env.example',
        content: `# ${name} environment variables\nVERCEL_TOKEN=\nVERCEL_ORG_ID=\nVERCEL_PROJECT_ID=\n`,
      },
      {
        path: 'vercel.json',
        content: JSON.stringify({ buildCommand: 'npm run build', outputDirectory: 'dist' }, null, 2) + '\n',
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', outDir: 'dist', rootDir: 'src', strict: true, esModuleInterop: true, skipLibCheck: true }, include: ['src'] }, null, 2) + '\n',
      },
      {
        path: 'package.json',
        content: JSON.stringify({ name, version: '0.1.0', description, private: true, type: 'module', scripts: { build: 'tsc', dev: 'tsc --watch' }, engines: { node: '>=20' } }, null, 2) + '\n',
      },
      {
        path: 'src/index.ts',
        content: `export default function handler() { return { status: 'ok' }; }\n`,
      },
    ],
  }
}

export const BUILTIN_TEMPLATES: { name: string; version: string; deployTarget: DeployTarget; description: string }[] = [
  { name: 'typescript-docker', version: '1.0.0', deployTarget: 'docker', description: 'TypeScript + Docker multi-stage build' },
  { name: 'typescript-vercel', version: '1.0.0', deployTarget: 'vercel', description: 'TypeScript + Vercel serverless' },
]

export function getTemplate(templateName: string, repoName: string, description: string): RepoTemplate {
  switch (templateName) {
    case 'typescript-vercel': return tsVercelTemplate(repoName, description)
    case 'typescript-docker':
    default: return tsDockerTemplate(repoName, description)
  }
}

/* ── Control Plane: scaffold & registry ────────────────────── */

export interface ScaffoldResult {
  repo: Repo
  template: RepoTemplate
  registryEntry: RegistryEntry
  deployCommands: string[]
  verifySteps: string[]
}

export async function scaffoldRepository(
  name: string,
  description: string,
  templateName: string,
  isPrivate = true,
): Promise<ScaffoldResult> {
  const template = getTemplate(templateName, name, description)

  const repo = await createRepo(name, description, isPrivate)
  const ctx: RepoCtx = { owner: repo.owner.login, repo: repo.name }

  for (const file of template.files) {
    await putFile(
      ctx,
      file.path,
      encodeContent(file.content),
      `scaffold(${template.name}): add ${file.path}`,
    )
  }

  const registryEntry: RegistryEntry = {
    repoName: repo.name,
    owner: repo.owner.login,
    templateName: template.name,
    templateVersion: template.version,
    deployTarget: template.deployTarget,
    requiredConfig: template.secrets,
    status: 'active',
    upgradePath: null,
    createdAt: new Date().toISOString(),
  }

  let deployCommands: string[]
  switch (template.deployTarget) {
    case 'vercel': deployCommands = [`VERCEL_TOKEN=$VERCEL_TOKEN npx vercel --prod`]; break
    case 'docker': deployCommands = [`docker build -t ${name} .`, `docker run -p 3000:3000 ${name}`]; break
    default: deployCommands = [`# Deploy manually for target: ${template.deployTarget}`]
  }

  const verifySteps = [
    `git clone https://github.com/${ctx.owner}/${ctx.repo}.git`,
    `cd ${ctx.repo}`,
    `npm install`,
    `npm run build`,
  ]

  return { repo, template, registryEntry, deployCommands, verifySteps }
}

const REGISTRY_VAR = 'LC_REGISTRY'

export async function fetchRegistry(ctx: RepoCtx): Promise<RegistryEntry[]> {
  const vars = await fetchVariables(ctx)
  const regVar = vars.find(v => v.name === REGISTRY_VAR)
  if (!regVar) return []
  try { return JSON.parse(regVar.value) as RegistryEntry[] } catch { return [] }
}

export async function saveRegistryEntry(ctx: RepoCtx, entry: RegistryEntry): Promise<void> {
  const existing = await fetchRegistry(ctx)
  const idx = existing.findIndex(e => e.repoName === entry.repoName && e.owner === entry.owner)
  if (idx >= 0) existing[idx] = entry
  else existing.push(entry)
  await setVariable(ctx, REGISTRY_VAR, JSON.stringify(existing))
}

export async function archiveRegistryEntry(ctx: RepoCtx, owner: string, repoName: string): Promise<void> {
  const existing = await fetchRegistry(ctx)
  const idx = existing.findIndex(e => e.repoName === repoName && e.owner === owner)
  if (idx < 0) throw new Error(`Unit ${owner}/${repoName} not found in registry`)
  existing[idx] = { ...existing[idx], status: 'archived' }
  await setVariable(ctx, REGISTRY_VAR, JSON.stringify(existing))
}

/** Compute deploy commands for a registry entry based on its deploy target. */
export function deployCommandsForEntry(entry: RegistryEntry): string[] {
  switch (entry.deployTarget) {
    case 'vercel': return [`VERCEL_TOKEN=$VERCEL_TOKEN npx vercel --prod`]
    case 'docker': return [`docker build -t ${entry.repoName} .`, `docker run -p 3000:3000 ${entry.repoName}`]
    default: return [`# Deploy manually for target: ${entry.deployTarget}`]
  }
}

/** Compute verification steps for a registry entry. */
export function verifyStepsForEntry(entry: RegistryEntry): string[] {
  return [
    `git clone https://github.com/${entry.owner}/${entry.repoName}.git`,
    `cd ${entry.repoName}`,
    `npm install`,
    `npm run build`,
  ]
}

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
