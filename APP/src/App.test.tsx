import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import App from './App'

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
      expect(screen.getByText(/testuser/)).toBeInTheDocument()
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
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Issues')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
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
    const navLabels = ['Dashboard', 'Issues', 'PRs', 'CI', 'Branches', 'Labels', 'Files', 'Cases', 'Vault', 'Environments', 'Settings']
    for (const label of navLabels) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument()
    }
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

  it('navigates to PRs page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^PRs/ }))
    expect(screen.getByText('No open PRs')).toBeInTheDocument()
  })

  it('navigates to CI page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^CI/ }))
    expect(screen.getByText('No workflow runs')).toBeInTheDocument()
  })

  it('navigates to Files page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: 'Files' }))
    const main = document.querySelector('.main')
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
    expect(screen.getByText('No variables in vault')).toBeInTheDocument()
  })

  it('navigates to Environments page', async () => {
    await renderAndPick()
    fireEvent.click(screen.getByRole('button', { name: /^Environments/ }))
    expect(screen.getByText(/No environments/)).toBeInTheDocument()
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