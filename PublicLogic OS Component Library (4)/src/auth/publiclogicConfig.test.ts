import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolvePuddleJumperUrl, type PublicLogicRuntimeConfig } from "./publiclogicConfig";

declare global {
  interface Window {
    PUBLICLOGIC_OS_CONFIG?: PublicLogicRuntimeConfig;
  }
}

describe("resolvePuddleJumperUrl", () => {
  beforeEach(() => {
    window.PUBLICLOGIC_OS_CONFIG = {};
  });

  it("uses configured PJ_BASE_URL when provided", () => {
    window.PUBLICLOGIC_OS_CONFIG = {
      puddleJumper: {
        baseUrl: "https://app.publiclogic.org/pj"
      }
    };

    const value = resolvePuddleJumperUrl({ origin: "https://portal.publiclogic.org" });
    expect(value).toBe("https://app.publiclogic.org/pj");
  });

  it("defaults to relative path when unset", () => {
    const value = resolvePuddleJumperUrl({ origin: "https://portal.publiclogic.org", envPjBaseUrl: "" });
    expect(value).toBe("/pj");
  });

  it("forces https for production http PJ_BASE_URL", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const value = resolvePuddleJumperUrl({
      nodeEnv: "production",
      origin: "https://portal.publiclogic.org",
      envPjBaseUrl: "http://internal.publiclogic.org/pj"
    });

    expect(value).toBe("https://internal.publiclogic.org/pj");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
