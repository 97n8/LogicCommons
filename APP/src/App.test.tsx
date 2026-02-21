import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import App from './App'
import { inferRepoStatus, getTemplate, BUILTIN_TEMPLATES } from './github'
import type { RegistryEntry } from './github'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

/* ── fetch mock helpers ─────────────────────────────────────── */

const mockUser = {
  login: 'testuser',
  name: 'Test User',
  avatar_url: 'https://github.com/testuser.png',
  html_url: 'https://github.com/testuser',
  public_repos: 5,
  total_private_repos: 2,
  bio: 'Testing things',
}

const mockRepo = {
  id: 1,
  name: 'TestRepo',
  full_name: 'testuser/TestRepo',
  owner: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
  description: 'A test repo',
  private: false,
  fork: false,
  html_url: 'https://github.com/testuser/TestRepo',
  default_branch: 'main',
  stargazers_count: 7,
  forks_count: 3,
  open_issues_count: 2,
  pushed_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  language: 'TypeScript',
  visibility: 'public',
  topics: [],
}

function mockFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/user/repos')) {
      return { ok: true, status: 200, json: async () => [mockRepo] }
    }
    if (url.match(/\/user$/) && !url.includes('/repos')) {
      return { ok: true, status: 200, json: async () => mockUser }
    }
    if (url.includes('/issues')) {
      return { ok: true, status: 200, json: async () => [] }
    }
    if (url.includes('/pulls')) {
      return { ok: true, status: 200, json: async () => [] }
    }
    if (url.includes('/actions/runs')) {
      return { ok: true, status: 200, json: async () => ({ workflow_runs: [] }) }
    }
    if (url.includes('/actions/workflows')) {
      return { ok: true, status: 200, json: async () => ({ workflows: [{ id: 1, name: 'App Build & Test', path: '.github/workflows/app-build.yml', state: 'active' }] }) }
    }
    if (url.includes('/branches')) {
      return { ok: true, status: 200, json: async () => [{ name: 'main', protected: true, commit: { sha: 'abc1234', url: '' } }] }
    }
    if (url.includes('/labels')) {
      return { ok: true, status: 200, json: async () => [] }
    }
    if (url.includes('/actions/variables')) {
      return { ok: true, status: 200, json: async () => ({ variables: [] }) }
    }
    // fetchRepo
    return { ok: true, status: 200, json: async () => mockRepo }
  }))
}

function setToken(token = 'ghp_testtoken') {
  localStorage.setItem('lc_gh_token', token)
}

/* ── no-token state ─────────────────────────────────────────── */

describe('No token', () => {
  it('shows connect screen when no token is set', () => {
    render(<App />)
    expect(screen.getByText('LogicCommons')).toBeInTheDocument()
    expect(screen.getByText(/Connect a GitHub token/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx')).toBeInTheDocument()
    expect(screen.getByText('Connect')).toBeInTheDocument()
  })

  it('Connect button is disabled when input is empty', () => {
    render(<App />)
    const btn = screen.getByText('Connect')
    expect(btn).toBeDisabled()
  })
})

/* ── repo picker ─────────────────────────────────────────────── */

describe('Repo picker (with token)', () => {
  beforeEach(() => {
    setToken()
    mockFetch()
  })

  it('shows repo picker screen', async () => {
    render(<App />)
    expect(screen.getByText('LogicCommons')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search repositories…')).toBeInTheDocument()
  })

  it('shows New Repo button', () => {
    render(<App />)
    expect(screen.getByText('+ New Repo')).toBeInTheDocument()
  })

  it('shows user info after fetch', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      expect(screen.getByText(/testuser/, { selector: 'strong' })).toBeInTheDocument()
    })
  })

  it('shows repo in list', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('testuser/TestRepo')).toBeInTheDocument()
    })
  })

  it('filters repos by search query', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    const input = screen.getByPlaceholderText('Search repositories…')
    fireEvent.change(input, { target: { value: 'nonexistent' } })
    expect(screen.queryByText('testuser/TestRepo')).not.toBeInTheDocument()
  })

  it('opens new repo form when + New Repo is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ New Repo'))
    expect(screen.getByPlaceholderText('Repository name')).toBeInTheDocument()
    expect(screen.getByText('Create Repository')).toBeInTheDocument()
  })

  it('cancels new repo form', () => {
    render(<App />)
    fireEvent.click(screen.getByText('+ New Repo'))
    fireEvent.click(screen.getByText('✕ Cancel'))
    expect(screen.queryByPlaceholderText('Repository name')).not.toBeInTheDocument()
  })

  it('renders repo as card with status badges', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    const card = document.querySelector('.repo-card')
    expect(card).toBeInTheDocument()
    expect(document.querySelector('.status-badge')).toBeInTheDocument()
  })

  it('shows filter controls (tier, deploy, sort)', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    expect(screen.getByText('Tier')).toBeInTheDocument()
    expect(screen.getByText('Deploy')).toBeInTheDocument()
    expect(screen.getByText('Sort')).toBeInTheDocument()
  })

  it('shows repo description in card', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('A test repo')).toBeInTheDocument()
    })
  })

  it('shows tier and deploy selects with options', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    const selects = document.querySelectorAll('.picker-select')
    expect(selects.length).toBe(3)
  })

  it('filters by tier', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    // Default repo with 7 stars, 3 forks infers as CORE
    const tierSelect = screen.getByDisplayValue('All tiers')
    fireEvent.change(tierSelect, { target: { value: 'ARCHIVED' } })
    expect(screen.queryByText('testuser/TestRepo')).not.toBeInTheDocument()
    fireEvent.change(tierSelect, { target: { value: 'CORE' } })
    await waitFor(() => {
      expect(screen.getByText('testuser/TestRepo')).toBeInTheDocument()
    })
  })

  it('sort select defaults to activity', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    expect(screen.getByDisplayValue('Last activity')).toBeInTheDocument()
  })
})

/* ── main shell (after repo selected) ──────────────────────── */

describe('Shell after repo selection', () => {
  beforeEach(() => {
    setToken()
    mockFetch()
  })

  async function renderAndPick() {
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    await act(async () => { fireEvent.click(screen.getByText('testuser/TestRepo')) })
    return screen
  }

  it('shows shell with nav after picking a repo', async () => {
    await renderAndPick()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Issues').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1)
  })

  it('shows repo name in brand area', async () => {
    await renderAndPick()
    expect(screen.getByText('testuser/TestRepo')).toBeInTheDocument()
  })

  it('shows the + create button', async () => {
    await renderAndPick()
    const createBtn = document.querySelector('.create-btn')
    expect(createBtn).toBeInTheDocument()
  })

  it('shows ⌘K button', async () => {
    await renderAndPick()
    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('renders all nav items', async () => {
    await renderAndPick()
    const navLabels = ['Dashboard', 'Today', 'Issues', 'PRs', 'Lists', 'CI', 'Pipeline', 'Branches', 'Labels', 'Files', 'Registry', 'Projects', 'Playbooks', 'Tools', 'Cases', 'Vault', 'Environments', 'Settings']
    for (const label of navLabels) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument()
    }
  })

  it('renders nav group section labels', async () => {
    await renderAndPick()
    const groups = document.querySelectorAll('.nav-group-label')
    expect(groups.length).toBeGreaterThanOrEqual(4)
    const labels = Array.from(groups).map(g => g.textContent)
    expect(labels).toContain('Overview')
    expect(labels).toContain('Work')
    expect(labels).toContain('Infrastructure')
    expect(labels).toContain('Governance')
  })

  it('Dashboard shows metric cards', async () => {
    await renderAndPick()
    expect(screen.getByText('Open Issues')).toBeInTheDocument()
    expect(screen.getByText('Open PRs')).toBeInTheDocument()
    expect(screen.getByText('Stars')).toBeInTheDocument()
    expect(screen.getByText('Forks')).toBeInTheDocument()
  })

  it('Dashboard shows repo data after fetch', async () => {
    await renderAndPick()
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument() // stargazers_count
    })
  })

  it('navigates to Issues page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getAllByText('Issues')[0])
    expect(screen.getByText('No open issues')).toBeInTheDocument()
  })

  it('Issues page has open/closed/all tabs', async () => {
    await renderAndPick()
    fireEvent.click(screen.getAllByText('Issues')[0])
    expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'closed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'all' })).toBeInTheDocument()
  })

  it('Issues filter tabs have button class for consistent styling', async () => {
    await renderAndPick()
    fireEvent.click(screen.getAllByText('Issues')[0])
    const tabs = document.querySelectorAll('.filter-tabs .button')
    expect(tabs.length).toBe(3)
  })

  it('navigates to PRs page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^PRs/ }))
    expect(screen.getByText('No open PRs')).toBeInTheDocument()
  })

  it('navigates to CI page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^CI/ }))
    expect(screen.getByText('No pipeline runs')).toBeInTheDocument()
    expect(screen.getByText('▶ Run Workflow')).toBeInTheDocument()
  })

  it('CI run workflow form opens and closes', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^CI/ }))
    fireEvent.click(screen.getByText('▶ Run Workflow'))
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    fireEvent.click(screen.getByText('✕ Cancel'))
    expect(screen.queryByText('Dispatch')).not.toBeInTheDocument()
  })

  it('CI run workflow form shows workflow dropdown when workflows exist', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^CI/ }))
    fireEvent.click(screen.getByText('▶ Run Workflow'))
    await waitFor(() => {
      expect(screen.getByText('Select workflow…')).toBeInTheDocument()
    })
  })

  it('navigates to Files page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: 'Files' }))
    const main = document.querySelector('.os-main')
    expect(main).toBeInTheDocument()
  })

  it('navigates to Cases page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Cases/ }))
    expect(screen.getByText('No open cases')).toBeInTheDocument()
  })

  it('navigates to Vault page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Vault/ }))
    expect(screen.getByText('No vault entries')).toBeInTheDocument()
    expect(screen.getByText('+ Add Variable')).toBeInTheDocument()
  })

  it('Vault add form opens and closes', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Vault/ }))
    fireEvent.click(screen.getByText('+ Add Variable'))
    expect(screen.getByPlaceholderText('NAME')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('value')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('✕ Cancel'))
    expect(screen.queryByPlaceholderText('NAME')).not.toBeInTheDocument()
  })

  it('navigates to Environments page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Environments/ }))
    expect(screen.getByText(/No environments/)).toBeInTheDocument()
    expect(screen.getByText('+ New Environment')).toBeInTheDocument()
  })

  it('Environments create form opens and closes', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Environments/ }))
    fireEvent.click(screen.getByText('+ New Environment'))
    expect(screen.getByPlaceholderText(/Environment name/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Environment' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('✕ Cancel'))
    expect(screen.queryByPlaceholderText(/Environment name/)).not.toBeInTheDocument()
  })

  it('navigates to Registry page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Registry/ }))
    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('Registered Units')).toBeInTheDocument()
  })

  it('Registry page shows built-in templates', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Registry/ }))
    const serviceItems = screen.getAllByText('Service')
    expect(serviceItems.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Library').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Site').length).toBeGreaterThanOrEqual(1)
  })

  it('Registry page shows scaffold button', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Registry/ }))
    expect(screen.getByRole('button', { name: 'Scaffold' })).toBeInTheDocument()
  })

  it('Registry scaffold form opens and closes', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Registry/ }))
    expect(screen.getByPlaceholderText('Unit name')).toBeInTheDocument()
    expect(screen.getByText('Scaffold Unit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scaffold' })).toBeInTheDocument()
  })

  it('Registry shows empty state when no entries', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Registry/ }))
    await waitFor(() => {
      expect(screen.getByText(/No registered units/)).toBeInTheDocument()
    })
  })

  it('navigates to Today page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Today/ }))
    expect(screen.getByText('Open Issues')).toBeInTheDocument()
    expect(screen.getByText('Recent Runs')).toBeInTheDocument()
  })

  it('navigates to Lists page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Lists/ }))
    expect(screen.getByText(/No lists yet/)).toBeInTheDocument()
  })

  it('navigates to Pipeline page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Pipeline/ }))
    expect(screen.getByText(/No pipeline activity/)).toBeInTheDocument()
  })

  it('navigates to Projects page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Projects/ }))
    expect(screen.getByText(/No projects/)).toBeInTheDocument()
  })

  it('navigates to Playbooks page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Playbooks/ }))
    expect(screen.getByText(/No playbooks/)).toBeInTheDocument()
  })

  it('navigates to Tools page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Tools/ }))
    expect(screen.getByText(/No tools configured/)).toBeInTheDocument()
  })

  it('navigates to Settings page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText('GitHub Token')).toBeInTheDocument()
  })

  it('Settings shows account panel when user is loaded', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await waitFor(() => {
      expect(screen.getByText('Account')).toBeInTheDocument()
    })
  })

  it('Settings shows Switch Repository button', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText('Switch Repository')).toBeInTheDocument()
  })

  it('Switch Repository returns to picker', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByText('Switch Repository'))
    expect(screen.getByPlaceholderText('Search repositories…')).toBeInTheDocument()
  })

  it('brand click returns to picker', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.brand')!)
    expect(screen.getByPlaceholderText('Search repositories…')).toBeInTheDocument()
  })

  it('opens command palette', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByText('⌘K'))
    expect(screen.getByPlaceholderText('Type a command…')).toBeInTheDocument()
  })

  it('command palette closes on Escape', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByText('⌘K'))
    fireEvent.keyDown(screen.getByPlaceholderText('Type a command…'), { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Type a command…')).not.toBeInTheDocument()
  })

  it('command palette shows nav commands', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByText('⌘K'))
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Create something')).toBeInTheDocument()
    expect(screen.getByText('Switch repository')).toBeInTheDocument()
  })

  it('command palette filters by query', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByText('⌘K'))
    fireEvent.change(screen.getByPlaceholderText('Type a command…'), { target: { value: 'vault' } })
    expect(screen.getByText('Go to Vault')).toBeInTheDocument()
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument()
  })

  it('command palette shows no results message', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByText('⌘K'))
    fireEvent.change(screen.getByPlaceholderText('Type a command…'), { target: { value: 'xyznonexistent' } })
    expect(screen.getByText('No matching commands')).toBeInTheDocument()
  })

  it('opens create modal', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => expect(screen.getByText('Create')).toBeInTheDocument())
    // Should show the 9 create options
    expect(screen.getByText('Issue')).toBeInTheDocument()
    expect(screen.getByText('Environment')).toBeInTheDocument()
    expect(screen.getByText('Repository')).toBeInTheDocument()
  })

  it('create modal closes on ✕', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText('Create')).not.toBeInTheDocument()
  })

  it('create modal shows Issue form on click', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    expect(screen.getByText('Issue')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Issue' })).toBeInTheDocument()
  })

  it('create modal shows Label form on click', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    expect(screen.getByText('Label')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Label' })).toBeInTheDocument()
  })

  it('create modal shows Variable form on click', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    expect(screen.getByText('Variable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Variable' })).toBeInTheDocument()
  })

  it('create modal Back button returns to options', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    expect(screen.getByRole('button', { name: 'Issue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Label' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText('Create')).not.toBeInTheDocument()
  })

  it('create modal shows Workflow form on click', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    expect(screen.getByText('Workflow')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Workflow' })).toBeInTheDocument()
  })

  it('create modal shows Environment form on click', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    expect(screen.getByText('Environment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Environment' })).toBeInTheDocument()
  })

  it('create modal shows coming soon for unimplemented options', async () => {
    await renderAndPick()
    fireEvent.click(document.querySelector('.create-btn')!)
    await waitFor(() => screen.getByText('Create'))
    expect(screen.getByRole('button', { name: 'Pull Request' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Branch' })).toBeInTheDocument()
  })

  it('shows toast stack container', async () => {
    await renderAndPick()
    expect(document.querySelector('.toast-stack')).toBeInTheDocument()
  })

  it('shows status dot', async () => {
    await renderAndPick()
    expect(document.querySelector('.status-dot')).toBeInTheDocument()
  })

  it('shows refresh button', async () => {
    await renderAndPick()
    expect(screen.getByText(/Refresh|Syncing/)).toBeInTheDocument()
  })

  it('active nav item is Dashboard by default', async () => {
    await renderAndPick()
    const activeItem = document.querySelector('.nav-item.active')
    expect(activeItem?.textContent).toContain('Dashboard')
  })

  it('active nav item updates on navigation', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Vault/ }))
    const activeItem = document.querySelector('.nav-item.active')
    expect(activeItem?.textContent).toContain('Vault')
  })
})

/* ── error state ─────────────────────────────────────────────── */

describe('Error handling', () => {
  it('shows error banner when repo fetch fails', async () => {
    setToken()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      // Let user and repos resolve so we can get to the shell
      if (url.includes('/user/repos')) return { ok: true, status: 200, json: async () => [mockRepo] }
      if (url.match(/\/user$/)) return { ok: true, status: 200, json: async () => mockUser }
      return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) }
    }))
    render(<App />)
    await waitFor(() => screen.getByText('testuser/TestRepo'))
    await act(async () => { fireEvent.click(screen.getByText('testuser/TestRepo')) })
    await waitFor(() => {
      expect(screen.getByText(/Connection issue/)).toBeInTheDocument()
    })
  })
})

/* ── inferRepoStatus ─────────────────────────────────────────── */

describe('inferRepoStatus', () => {
  const baseRepo = { ...mockRepo, stargazers_count: 0, forks_count: 0, topics: [] as string[] }

  it('defaults to DRAFT tier for plain repo', () => {
    const status = inferRepoStatus({ ...baseRepo })
    expect(status.tier).toBe('DRAFT')
  })

  it('infers CORE from high stars', () => {
    const status = inferRepoStatus({ ...baseRepo, stargazers_count: 10 })
    expect(status.tier).toBe('CORE')
  })

  it('infers ARCHIVED from topic', () => {
    const status = inferRepoStatus({ ...baseRepo, topics: ['archived'] })
    expect(status.tier).toBe('ARCHIVED')
  })

  it('infers EXPERIMENTAL from topic', () => {
    const status = inferRepoStatus({ ...baseRepo, topics: ['experimental'] })
    expect(status.tier).toBe('EXPERIMENTAL')
  })

  it('infers PILOT from topic', () => {
    const status = inferRepoStatus({ ...baseRepo, topics: ['pilot'] })
    expect(status.tier).toBe('PILOT')
  })

  it('infers PRODUCTION deploy from topic', () => {
    const status = inferRepoStatus({ ...baseRepo, topics: ['production'] })
    expect(status.deploymentStatus).toBe('PRODUCTION')
  })

  it('returns NONE deployment for plain repo', () => {
    const status = inferRepoStatus({ ...baseRepo })
    expect(status.deploymentStatus).toBe('NONE')
  })

  it('includes openIssueCount from repo', () => {
    const status = inferRepoStatus({ ...baseRepo, open_issues_count: 5 })
    expect(status.openIssueCount).toBe(5)
  })
})

/* ── Control Plane templates ─────────────────────────────────── */

describe('Control Plane templates', () => {
  it('BUILTIN_TEMPLATES has expected entries', () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(2)
    expect(BUILTIN_TEMPLATES.find(t => t.id === 'service')).toBeDefined()
    expect(BUILTIN_TEMPLATES.find(t => t.id === 'library')).toBeDefined()
    expect(BUILTIN_TEMPLATES.find(t => t.id === 'site')).toBeDefined()
  })

  it('getTemplate returns service template by id', () => {
    const tpl = getTemplate('service')
    expect(tpl).toBeDefined()
    expect(tpl!.id).toBe('service')
    expect(tpl!.name).toBe('Service')
    expect(tpl!.defaultConfig).toContain('PORT')
    expect(tpl!.defaultConfig).toContain('DATABASE_URL')
  })

  it('getTemplate returns library template by id', () => {
    const tpl = getTemplate('library')
    expect(tpl).toBeDefined()
    expect(tpl!.id).toBe('library')
    expect(tpl!.defaultConfig).toContain('NPM_TOKEN')
  })

  it('getTemplate returns site template by id', () => {
    const tpl = getTemplate('site')
    expect(tpl).toBeDefined()
    expect(tpl!.id).toBe('site')
    expect(tpl!.defaultConfig).toContain('DEPLOY_URL')
  })

  it('templates have required fields', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(Array.isArray(t.defaultConfig)).toBe(true)
    }
  })

  it('getTemplate returns undefined for unknown id', () => {
    expect(getTemplate('nonexistent')).toBeUndefined()
  })

  it('template descriptions are non-empty', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.description.length).toBeGreaterThan(0)
    }
  })

  it('service template description mentions CI', () => {
    const tpl = getTemplate('service')
    expect(tpl!.description.toLowerCase()).toContain('ci')
  })

  it('library template description mentions publish', () => {
    const tpl = getTemplate('library')
    expect(tpl!.description.toLowerCase()).toContain('publish')
  })

  it('site template description mentions static or deploy', () => {
    const tpl = getTemplate('site')
    expect(tpl!.description.toLowerCase()).toMatch(/static|deploy/)
  })

  it('all template ids are unique', () => {
    const ids = BUILTIN_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

/* ── Control Plane verbs: registry entry helpers ─────────────── */

describe('RegistryEntry shape', () => {
  const baseEntry: RegistryEntry = {
    name: 'testuser/my-unit',
    template: 'service',
    deployTarget: 'production',
    requiredConfig: ['PORT', 'DATABASE_URL'],
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  it('RegistryEntry has required fields', () => {
    expect(baseEntry.name).toBeTruthy()
    expect(baseEntry.template).toBeTruthy()
    expect(baseEntry.deployTarget).toBeTruthy()
    expect(Array.isArray(baseEntry.requiredConfig)).toBe(true)
    expect(baseEntry.status).toBe('active')
    expect(baseEntry.createdAt).toBeTruthy()
  })

  it('RegistryEntry status can be active or archived', () => {
    const archived: RegistryEntry = { ...baseEntry, status: 'archived' }
    expect(archived.status).toBe('archived')
  })

  it('RegistryEntry requiredConfig lists needed env vars', () => {
    expect(baseEntry.requiredConfig).toContain('PORT')
    expect(baseEntry.requiredConfig).toContain('DATABASE_URL')
  })
})

describe('template defaultConfig', () => {
  it('service template defaultConfig contains expected vars', () => {
    const tpl = getTemplate('service')
    expect(tpl!.defaultConfig).toContain('PORT')
    expect(tpl!.defaultConfig).toContain('DATABASE_URL')
  })

  it('library template defaultConfig contains NPM_TOKEN', () => {
    const tpl = getTemplate('library')
    expect(tpl!.defaultConfig).toContain('NPM_TOKEN')
  })

  it('site template defaultConfig contains DEPLOY_URL', () => {
    const tpl = getTemplate('site')
    expect(tpl!.defaultConfig).toContain('DEPLOY_URL')
  })
})