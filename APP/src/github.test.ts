import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createEnvironment,
  setVariable,
  scaffoldRepository,
  getTemplate,
  BUILTIN_TEMPLATES,
  fetchRegistry,
  saveRegistryEntry,
  inferRepoStatus,
  decodeContent,
  encodeContent,
} from './github'
import type { RepoCtx, RegistryEntry } from './github'

const ctx: RepoCtx = { owner: 'testorg', repo: 'testrepo' }

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  localStorage.setItem('lc_gh_token', 'ghp_test')
})

/* ── helpers ─────────────────────────────────────────────────── */

function mockFetchSequence(responses: Array<{ ok: boolean; status: number; body: unknown }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  let idx = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const r = responses[idx] ?? { ok: true, status: 204, body: null }
    idx++
    return {
      ok: r.ok,
      status: r.status,
      json: async () => r.body,
    }
  }))
  return calls
}

/* ── createEnvironment ──────────────────────────────────────── */

describe('createEnvironment', () => {
  it('creates branch and scaffold files for the given slug', async () => {
    const calls = mockFetchSequence([
      // fetchBranches
      { ok: true, status: 200, body: [{ name: 'main', commit: { sha: 'abc123' }, protected: false }] },
      // createBranch
      { ok: true, status: 201, body: { ref: 'refs/heads/env/staging' } },
      // putFile (README.md)
      { ok: true, status: 201, body: { content: {} } },
      // putFile (config.json)
      { ok: true, status: 201, body: { content: {} } },
      // putFile (.env.example)
      { ok: true, status: 201, body: { content: {} } },
    ])

    const result = await createEnvironment(ctx, 'staging', 'Staging environment', 'main')

    expect(result.branch).toBe('env/staging')
    expect(result.files).toHaveLength(3)
    expect(result.files[0]).toBe('environments/staging/README.md')
    expect(result.files[1]).toBe('environments/staging/config.json')
    expect(result.files[2]).toBe('environments/staging/.env.example')
    expect(result.issueComment).toContain('env/staging')
    expect(result.issueComment).toContain('Environment created')

    // Verify branch create was called with correct SHA
    expect(calls[1].url).toContain('/git/refs')
    const branchBody = JSON.parse(calls[1].init?.body as string)
    expect(branchBody.ref).toBe('refs/heads/env/staging')
    expect(branchBody.sha).toBe('abc123')

    // Verify files were put on the correct branch
    expect(calls[2].url).toContain('/contents/')
    const fileBody = JSON.parse(calls[2].init?.body as string)
    expect(fileBody.branch).toBe('env/staging')
  })

  it('throws when default branch is not found', async () => {
    mockFetchSequence([
      { ok: true, status: 200, body: [{ name: 'develop', commit: { sha: 'xyz' }, protected: false }] },
    ])

    await expect(createEnvironment(ctx, 'test', 'Test', 'main'))
      .rejects.toThrow('Cannot find branch "main"')
  })

  it('uses the provided slug in all generated paths', async () => {
    mockFetchSequence([
      { ok: true, status: 200, body: [{ name: 'main', commit: { sha: 'sha1' }, protected: false }] },
      { ok: true, status: 201, body: { ref: 'refs/heads/env/prod' } },
      { ok: true, status: 201, body: { content: {} } },
      { ok: true, status: 201, body: { content: {} } },
      { ok: true, status: 201, body: { content: {} } },
    ])

    const result = await createEnvironment(ctx, 'prod', 'Production', 'main')
    expect(result.branch).toBe('env/prod')
    expect(result.files.every(f => f.includes('prod'))).toBe(true)
  })
})

/* ── setVariable (upsert) ──────────────────────────────────── */

describe('setVariable', () => {
  it('patches existing variable on success', async () => {
    const calls = mockFetchSequence([
      { ok: true, status: 204, body: null },
    ])

    await setVariable(ctx, 'MY_VAR', 'my_value')

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain('/actions/variables/MY_VAR')
    expect(calls[0].init?.method).toBe('PATCH')
  })

  it('creates variable via POST when PATCH returns 404', async () => {
    const calls = mockFetchSequence([
      // PATCH returns 404
      { ok: false, status: 404, body: { message: 'Not Found' } },
      // POST succeeds
      { ok: true, status: 201, body: null },
    ])

    await setVariable(ctx, 'NEW_VAR', 'new_value')

    expect(calls).toHaveLength(2)
    expect(calls[0].init?.method).toBe('PATCH')
    expect(calls[1].init?.method).toBe('POST')
    expect(calls[1].url).toContain('/actions/variables')
    const body = JSON.parse(calls[1].init?.body as string)
    expect(body.name).toBe('NEW_VAR')
    expect(body.value).toBe('new_value')
  })

  it('re-throws non-404 errors', async () => {
    mockFetchSequence([
      { ok: false, status: 403, body: { message: 'Forbidden' } },
    ])

    await expect(setVariable(ctx, 'VAR', 'val'))
      .rejects.toThrow(/403/)
  })
})

/* ── scaffoldRepository ─────────────────────────────────────── */

describe('scaffoldRepository', () => {
  it('creates repo, writes README, and saves registry entry', async () => {
    const createdRepo = {
      id: 42,
      name: 'my-service',
      full_name: 'testorg/my-service',
      owner: { login: 'testorg', avatar_url: '' },
      html_url: 'https://github.com/testorg/my-service',
      default_branch: 'main',
      description: '',
      private: true,
      fork: false,
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      pushed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      language: null,
      topics: [],
      visibility: 'private',
    }

    const calls = mockFetchSequence([
      // createRepo
      { ok: true, status: 201, body: createdRepo },
      // putFile (README.md)
      { ok: true, status: 201, body: { content: {} } },
      // fetchVariables (for fetchRegistry inside saveRegistryEntry)
      { ok: true, status: 200, body: { variables: [] } },
      // setVariable PATCH → 404, then POST
      { ok: false, status: 404, body: { message: 'Not Found' } },
      { ok: true, status: 201, body: null },
    ])

    const result = await scaffoldRepository(ctx, 'my-service', 'service', 'production')

    expect(result.repoUrl).toBe('https://github.com/testorg/my-service')
    expect(result.branch).toBe('main')
    expect(result.files).toContain('README.md')

    // Verify createRepo was called
    expect(calls[0].url).toContain('/user/repos')
    const repoBody = JSON.parse(calls[0].init?.body as string)
    expect(repoBody.name).toBe('my-service')

    // Verify README was written
    expect(calls[1].url).toContain('/contents/README.md')
  })

  it('throws for unknown template', async () => {
    await expect(scaffoldRepository(ctx, 'test', 'nonexistent', 'production'))
      .rejects.toThrow('Unknown template: nonexistent')
  })
})

/* ── getTemplate ─────────────────────────────────────────────── */

describe('getTemplate', () => {
  it('returns template by id', () => {
    const tmpl = getTemplate('service')
    expect(tmpl).toBeDefined()
    expect(tmpl?.name).toBe('Service')
  })

  it('returns undefined for unknown id', () => {
    expect(getTemplate('nope')).toBeUndefined()
  })

  it('BUILTIN_TEMPLATES has correct count', () => {
    expect(BUILTIN_TEMPLATES).toHaveLength(3)
  })
})

/* ── fetchRegistry ───────────────────────────────────────────── */

describe('fetchRegistry', () => {
  it('returns empty array when no registry variable exists', async () => {
    mockFetchSequence([
      { ok: true, status: 200, body: { variables: [] } },
    ])
    const entries = await fetchRegistry(ctx)
    expect(entries).toEqual([])
  })

  it('parses registry entries from LC_REGISTRY variable', async () => {
    const registryData: RegistryEntry[] = [
      { name: 'org/repo', template: 'service', deployTarget: 'production', status: 'active', createdAt: '2024-01-01', requiredConfig: ['PORT'] },
    ]
    mockFetchSequence([
      { ok: true, status: 200, body: { variables: [{ name: 'LC_REGISTRY', value: JSON.stringify(registryData), created_at: '', updated_at: '' }] } },
    ])
    const entries = await fetchRegistry(ctx)
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('org/repo')
  })

  it('returns empty array for malformed JSON', async () => {
    mockFetchSequence([
      { ok: true, status: 200, body: { variables: [{ name: 'LC_REGISTRY', value: 'not-json', created_at: '', updated_at: '' }] } },
    ])
    const entries = await fetchRegistry(ctx)
    expect(entries).toEqual([])
  })
})

/* ── saveRegistryEntry ───────────────────────────────────────── */

describe('saveRegistryEntry', () => {
  it('appends new entry and saves to LC_REGISTRY', async () => {
    const calls = mockFetchSequence([
      // fetchVariables (inside fetchRegistry)
      { ok: true, status: 200, body: { variables: [] } },
      // setVariable PATCH
      { ok: true, status: 204, body: null },
    ])

    const entry: RegistryEntry = {
      name: 'org/new-repo',
      template: 'library',
      deployTarget: 'staging',
      status: 'active',
      createdAt: '2024-06-01',
      requiredConfig: ['NPM_TOKEN'],
    }
    await saveRegistryEntry(ctx, entry)

    // Should have called setVariable with the serialized entry
    const patchBody = JSON.parse(calls[1].init?.body as string)
    const saved = JSON.parse(patchBody.value) as RegistryEntry[]
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('org/new-repo')
  })
})

/* ── encodeContent / decodeContent ───────────────────────────── */

describe('encodeContent / decodeContent', () => {
  it('round-trips plain ASCII text', () => {
    const text = 'Hello, World!'
    expect(decodeContent(encodeContent(text))).toBe(text)
  })

  it('round-trips text with special characters', () => {
    const text = 'café résumé naïve'
    expect(decodeContent(encodeContent(text))).toBe(text)
  })
})

/* ── inferRepoStatus supplemental ────────────────────────────── */

describe('inferRepoStatus supplemental', () => {
  const base = {
    id: 1, name: 'r', full_name: 'o/r', description: null, html_url: '', stargazers_count: 0, forks_count: 0,
    open_issues_count: 0, default_branch: 'main', pushed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    private: false, fork: false, language: null, topics: [] as string[], visibility: 'public',
    owner: { login: 'o', avatar_url: '' },
  }

  it('infers STAGING deployment from staging topic', () => {
    expect(inferRepoStatus({ ...base, topics: ['staging'] }).deploymentStatus).toBe('STAGING')
  })

  it('infers LOCAL deployment from dev topic', () => {
    expect(inferRepoStatus({ ...base, topics: ['dev'] }).deploymentStatus).toBe('LOCAL')
  })

  it('infers PRODUCTION for CORE tier repos without explicit topic', () => {
    const s = inferRepoStatus({ ...base, stargazers_count: 10 })
    expect(s.tier).toBe('CORE')
    expect(s.deploymentStatus).toBe('PRODUCTION')
  })
})
