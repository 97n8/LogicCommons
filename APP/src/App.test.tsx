import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, afterEach, beforeEach, vi, expect } from "vitest";
import App from "./App";

afterEach(cleanup);

// Mock the github module so we never make real API calls
vi.mock("./github", () => ({
  fetchRepo: vi.fn().mockResolvedValue({
    stargazers_count: 10,
    forks_count: 2,
    default_branch: "main",
    pushed_at: new Date().toISOString(),
    open_issues_count: 3,
  }),
  fetchIssues: vi.fn().mockResolvedValue([]),
  fetchPRs: vi.fn().mockResolvedValue([]),
  fetchWorkflowRuns: vi.fn().mockResolvedValue([]),
  fetchBranches: vi.fn().mockResolvedValue([]),
  fetchLabels: vi.fn().mockResolvedValue([]),
  fetchVariables: vi.fn().mockResolvedValue([]),
  fetchDirContents: vi.fn().mockResolvedValue([]),
  hasToken: vi.fn().mockReturnValue(false),
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

// Suppress unhandled act warnings from setState in intervals
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("App", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".os-root")).toBeInTheDocument();
  });

  it("displays the brand title", () => {
    render(<App />);
    expect(screen.getByText("LogicCommons")).toBeInTheDocument();
  });

  it("renders all navigation items including new pages", () => {
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("PRs")).toBeInTheDocument();
    expect(screen.getByText("CI")).toBeInTheDocument();
    expect(screen.getByText("Branches")).toBeInTheDocument();
    expect(screen.getByText("Labels")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText("Cases")).toBeInTheDocument();
    expect(screen.getByText("Vault")).toBeInTheDocument();
    expect(screen.getByText("Environments")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders metric cards with N/A before data loads", () => {
    render(<App />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows command palette trigger", () => {
    render(<App />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });
});
