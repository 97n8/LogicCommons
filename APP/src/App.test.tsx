import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(document.querySelector(".os-root")).toBeInTheDocument();
  });

  it("displays the brand title", () => {
    render(<App />);
    expect(screen.getByText("LogicCommons")).toBeInTheDocument();
  });

  it("renders navigation items", () => {
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders key metric cards", () => {
    render(<App />);
    // "Open Workstreams" appears in both a metric card and a panel title
    expect(screen.getAllByText("Open Workstreams").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Pending Decisions")).toBeInTheDocument();
    expect(screen.getByText("Due This Week")).toBeInTheDocument();
  });
});
