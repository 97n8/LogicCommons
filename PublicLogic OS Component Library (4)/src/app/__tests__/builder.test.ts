import { describe, expect, it } from "vitest";
import {
  VAULT_MODULES,
  defaultModuleConfig,
  getVaultModule,
  newBuilderSession,
  type ModuleConfig,
} from "../lib/vault-modules";
import {
  buildSessionSummary,
  validateBuilderSession,
  validateModuleConfig,
} from "../lib/governance/module-builder";

// ── VAULT module catalog ───────────────────────────────────────────────────────

describe("VAULT module catalog", () => {
  it("exports exactly 9 modules", () => {
    expect(VAULT_MODULES).toHaveLength(9);
  });

  it("all module ids are unique", () => {
    const ids = VAULT_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all modules have required fields", () => {
    for (const m of VAULT_MODULES) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.domain).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(m.mglCitation).toBeTruthy();
      expect(m.defaultRetentionYears).toBeGreaterThan(0);
      expect(Array.isArray(m.defaultWorkflowSteps)).toBe(true);
    }
  });

  it("all modules have at least one workflow step", () => {
    for (const m of VAULT_MODULES) {
      expect(m.defaultWorkflowSteps.length).toBeGreaterThan(0);
    }
  });

  it("every module includes an ARCHIEVE seal step", () => {
    for (const m of VAULT_MODULES) {
      const archiveStep = m.defaultWorkflowSteps.find((s) => s.type === "archive");
      expect(archiveStep).toBeDefined();
    }
  });

  it("every module includes an intake step", () => {
    for (const m of VAULT_MODULES) {
      const intakeStep = m.defaultWorkflowSteps.find((s) => s.type === "intake");
      expect(intakeStep).toBeDefined();
    }
  });

  it("VAULTPRR cites M.G.L. c. 66 §10", () => {
    const prr = getVaultModule("VAULTPRR");
    expect(prr?.mglCitation).toContain("M.G.L. c. 66");
  });

  it("VAULTBOARD cites M.G.L. c. 30A (open meeting)", () => {
    const board = getVaultModule("VAULTBOARD");
    expect(board?.mglCitation).toContain("M.G.L. c. 30A");
  });

  it("VAULTLEGAL has the longest retention period", () => {
    const legal = getVaultModule("VAULTLEGAL");
    const maxRetention = Math.max(...VAULT_MODULES.map((m) => m.defaultRetentionYears));
    expect(legal?.defaultRetentionYears).toBe(maxRetention);
  });

  it("getVaultModule returns undefined for unknown id", () => {
    expect(getVaultModule("UNKNOWN")).toBeUndefined();
  });

  it("all workflow step ids are unique within each module", () => {
    for (const m of VAULT_MODULES) {
      const stepIds = m.defaultWorkflowSteps.map((s) => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
    }
  });

  it("defaultModuleConfig seeds from the module catalog", () => {
    const cfg = defaultModuleConfig("VAULTPRR");
    const mod = getVaultModule("VAULTPRR");
    expect(cfg.moduleId).toBe("VAULTPRR");
    expect(cfg.retentionYears).toBe(mod?.defaultRetentionYears);
    expect(cfg.statutoryBasis).toBe(mod?.mglCitation);
    expect(cfg.enforcementMode).toBe("core");
  });
});

// ── Builder session ────────────────────────────────────────────────────────────

describe("builder session", () => {
  it("newBuilderSession sets town and in-progress status", () => {
    const s = newBuilderSession("Phillipston");
    expect(s.town).toBe("Phillipston");
    expect(s.status).toBe("in-progress");
    expect(s.selectedModuleIds).toHaveLength(0);
    expect(s.id).toBeTruthy();
    expect(s.createdAt).toBeTruthy();
  });
});

// ── Module builder validation ──────────────────────────────────────────────────

describe("validateModuleConfig", () => {
  const validConfig: ModuleConfig = {
    moduleId: "VAULTPRR",
    enforcementMode: "core",
    approver: "TownClerk",
    retentionYears: 7,
    statutoryBasis: "M.G.L. c. 66 §10",
    notes: "",
    workflowStepIds: ["prr-intake", "prr-review"],
  };

  it("returns no errors for a valid config", () => {
    expect(validateModuleConfig(validConfig)).toHaveLength(0);
  });

  it("errors when approver is empty", () => {
    const errors = validateModuleConfig({ ...validConfig, approver: "" });
    expect(errors.some((e) => e.field === "approver")).toBe(true);
  });

  it("errors when statutory basis is empty", () => {
    const errors = validateModuleConfig({ ...validConfig, statutoryBasis: "" });
    expect(errors.some((e) => e.field === "statutoryBasis")).toBe(true);
  });

  it("errors when retention years is out of range", () => {
    const errors = validateModuleConfig({ ...validConfig, retentionYears: 0 });
    expect(errors.some((e) => e.field === "retentionYears")).toBe(true);
  });

  it("errors when no workflow steps are selected", () => {
    const errors = validateModuleConfig({ ...validConfig, workflowStepIds: [] });
    expect(errors.some((e) => e.field === "workflowStepIds")).toBe(true);
  });

  it("errors when tailored mode is used without notes", () => {
    const errors = validateModuleConfig({ ...validConfig, enforcementMode: "tailored", notes: "" });
    expect(errors.some((e) => e.field === "notes")).toBe(true);
  });

  it("no error when tailored mode has notes", () => {
    const errors = validateModuleConfig({
      ...validConfig,
      enforcementMode: "tailored",
      notes: "Local SLA override per town counsel",
    });
    expect(errors.every((e) => e.field !== "notes")).toBe(true);
  });
});

describe("validateBuilderSession", () => {
  const validConfig: ModuleConfig = {
    moduleId: "VAULTPRR",
    enforcementMode: "core",
    approver: "TownClerk",
    retentionYears: 7,
    statutoryBasis: "M.G.L. c. 66 §10",
    notes: "",
    workflowStepIds: ["prr-intake"],
  };

  it("passes a fully configured session", () => {
    const session = {
      ...newBuilderSession("Phillipston"),
      selectedModuleIds: ["VAULTPRR"],
      configs: { VAULTPRR: validConfig },
    };
    const result = validateBuilderSession(session);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when town is empty", () => {
    const session = {
      ...newBuilderSession(""),
      selectedModuleIds: ["VAULTPRR"],
      configs: { VAULTPRR: validConfig },
    };
    const result = validateBuilderSession(session);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "town")).toBe(true);
  });

  it("fails when no modules are selected", () => {
    const session = { ...newBuilderSession("Phillipston"), selectedModuleIds: [], configs: {} };
    const result = validateBuilderSession(session);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "modules")).toBe(true);
  });

  it("fails when a selected module has no config", () => {
    const session = {
      ...newBuilderSession("Phillipston"),
      selectedModuleIds: ["VAULTPRR"],
      configs: {},
    };
    const result = validateBuilderSession(session);
    expect(result.valid).toBe(false);
  });

  it("collects errors from multiple modules", () => {
    const badConfig: ModuleConfig = { ...validConfig, approver: "", moduleId: "VAULTCLERK" };
    const session = {
      ...newBuilderSession("Phillipston"),
      selectedModuleIds: ["VAULTPRR", "VAULTCLERK"],
      configs: { VAULTPRR: validConfig, VAULTCLERK: badConfig },
    };
    const result = validateBuilderSession(session);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.moduleId === "VAULTCLERK")).toBe(true);
  });
});

// ── Build session summary ─────────────────────────────────────────────────────

describe("buildSessionSummary", () => {
  it("includes town name", () => {
    const session = newBuilderSession("Athol");
    const summary = buildSessionSummary(session);
    expect(summary).toContain("Athol");
  });

  it("marks tailored modules with [T]", () => {
    const session = {
      ...newBuilderSession("Royalston"),
      selectedModuleIds: ["VAULTPRR", "VAULTCLERK"],
      configs: {
        VAULTPRR: { moduleId: "VAULTPRR", enforcementMode: "tailored" as const, approver: "TownClerk", retentionYears: 7, statutoryBasis: "M.G.L. c. 66 §10", notes: "override", workflowStepIds: [] },
        VAULTCLERK: { moduleId: "VAULTCLERK", enforcementMode: "core" as const, approver: "TownClerk", retentionYears: 10, statutoryBasis: "M.G.L. c. 41 §15", notes: "", workflowStepIds: [] },
      },
    };
    const summary = buildSessionSummary(session);
    expect(summary).toContain("VAULTPRR[T]");
    expect(summary).toContain("VAULTCLERK");
    expect(summary).not.toContain("VAULTCLERK[T]");
  });
});
