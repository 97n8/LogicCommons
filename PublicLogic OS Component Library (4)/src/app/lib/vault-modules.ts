/**
 * VAULT Module Catalog — PuddleJumper VAULT back-end contract.
 *
 * Defines the nine governance modules, their default workflow templates,
 * and the BuilderSession type used by the module-builder wizard.
 *
 * In production, sessions are synced to the PJ VAULT API.
 * This module provides a local-first fallback via localStorage.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type EnforcementMode = "core" | "tailored";

export type WorkflowStepType = "intake" | "review" | "approval" | "archive" | "notify";

export interface WorkflowStep {
  id: string;
  label: string;
  type: WorkflowStepType;
  required: boolean;
  authority?: string;
  mglCitation?: string;
}

export interface VaultModule {
  id: string;
  name: string;
  domain: string;
  description: string;
  mglCitation: string;
  defaultRetentionYears: number;
  defaultWorkflowSteps: WorkflowStep[];
}

export interface ModuleConfig {
  moduleId: string;
  enforcementMode: EnforcementMode;
  approver: string;
  retentionYears: number;
  statutoryBasis: string;
  notes: string;
  workflowStepIds: string[];
}

export type BuilderSessionStatus = "in-progress" | "activated";

export interface BuilderSession {
  id: string;
  town: string;
  createdAt: string;
  updatedAt: string;
  selectedModuleIds: string[];
  configs: Record<string, ModuleConfig>;
  status: BuilderSessionStatus;
}

// ── Module catalog ─────────────────────────────────────────────────────────────

export const VAULT_MODULES: VaultModule[] = [
  {
    id: "VAULTPRR",
    name: "VAULTPRR",
    domain: "Public Records Requests",
    description: "Resident intake, staff workflow, and deadline tracking (10-day T10 rule).",
    mglCitation: "M.G.L. c. 66 §10",
    defaultRetentionYears: 7,
    defaultWorkflowSteps: [
      { id: "prr-intake",   label: "Resident Intake",          type: "intake",   required: true },
      { id: "prr-review",   label: "Clerk Review",             type: "review",   required: true,  authority: "TownClerk", mglCitation: "M.G.L. c. 66 §10" },
      { id: "prr-approve",  label: "Records Release Approval", type: "approval", required: true,  authority: "TownClerk" },
      { id: "prr-archive",  label: "ARCHIEVE Seal",            type: "archive",  required: true },
      { id: "prr-notify",   label: "Resident Notification",    type: "notify",   required: true },
    ],
  },
  {
    id: "VAULTCLERK",
    name: "VAULTCLERK",
    domain: "Clerk Operations",
    description: "Document management, certification, and official record custody.",
    mglCitation: "M.G.L. c. 41 §15",
    defaultRetentionYears: 10,
    defaultWorkflowSteps: [
      { id: "clerk-intake",    label: "Document Intake",        type: "intake",   required: true },
      { id: "clerk-certify",   label: "Clerk Certification",    type: "approval", required: true,  authority: "TownClerk" },
      { id: "clerk-archive",   label: "ARCHIEVE Seal",          type: "archive",  required: true },
    ],
  },
  {
    id: "VAULTONBOARD",
    name: "VAULTONBOARD",
    domain: "Onboarding",
    description: "Staff and vendor onboarding with HR verification and access provisioning.",
    mglCitation: "M.G.L. c. 149",
    defaultRetentionYears: 7,
    defaultWorkflowSteps: [
      { id: "ob-intake",     label: "HR Intake",               type: "intake",   required: true },
      { id: "ob-review",     label: "Department Review",       type: "review",   required: true,  authority: "Staff" },
      { id: "ob-approve",    label: "Admin Approval",          type: "approval", required: true,  authority: "TownAdmin" },
      { id: "ob-archive",    label: "ARCHIEVE Seal",           type: "archive",  required: true },
    ],
  },
  {
    id: "VAULTPERMIT",
    name: "VAULTPERMIT",
    domain: "Permits",
    description: "Permit issuance, compliance inspection tracking, and fee management.",
    mglCitation: "M.G.L. c. 40A",
    defaultRetentionYears: 10,
    defaultWorkflowSteps: [
      { id: "permit-intake",   label: "Applicant Intake",       type: "intake",   required: true },
      { id: "permit-inspect",  label: "Site Inspection",        type: "review",   required: true,  authority: "Staff" },
      { id: "permit-approve",  label: "Board Approval",         type: "approval", required: true,  authority: "SelectBoard" },
      { id: "permit-issue",    label: "Permit Issued",          type: "notify",   required: true },
      { id: "permit-archive",  label: "ARCHIEVE Seal",          type: "archive",  required: true },
    ],
  },
  {
    id: "VAULTFISCAL",
    name: "VAULTFISCAL",
    domain: "Fiscal Controls",
    description: "Budget approvals, expense authorizations, and audit trail management.",
    mglCitation: "M.G.L. c. 44",
    defaultRetentionYears: 7,
    defaultWorkflowSteps: [
      { id: "fiscal-intake",   label: "Request Intake",         type: "intake",   required: true },
      { id: "fiscal-review",   label: "Finance Review",         type: "review",   required: true,  authority: "TownAdmin" },
      { id: "fiscal-approve",  label: "Appropriation Approval", type: "approval", required: true,  authority: "SelectBoard" },
      { id: "fiscal-archive",  label: "ARCHIEVE Seal",          type: "archive",  required: true },
    ],
  },
  {
    id: "VAULTCODE",
    name: "VAULTCODE",
    domain: "Code Enforcement",
    description: "Violation intake, inspection scheduling, and compliance case tracking.",
    mglCitation: "M.G.L. c. 40 §21D",
    defaultRetentionYears: 10,
    defaultWorkflowSteps: [
      { id: "code-intake",     label: "Complaint Intake",       type: "intake",   required: true },
      { id: "code-inspect",    label: "Inspector Review",       type: "review",   required: true,  authority: "Staff" },
      { id: "code-notice",     label: "Notice of Violation",    type: "notify",   required: true },
      { id: "code-resolve",    label: "Resolution Approval",    type: "approval", required: true,  authority: "TownAdmin" },
      { id: "code-archive",    label: "ARCHIEVE Seal",          type: "archive",  required: true },
    ],
  },
  {
    id: "VAULTLEGAL",
    name: "VAULTLEGAL",
    domain: "Legal",
    description: "Contract review, legal hold management, and counsel coordination.",
    mglCitation: "M.G.L. c. 258",
    defaultRetentionYears: 20,
    defaultWorkflowSteps: [
      { id: "legal-intake",    label: "Matter Intake",          type: "intake",   required: true },
      { id: "legal-review",    label: "Counsel Review",         type: "review",   required: true,  authority: "TownAdmin" },
      { id: "legal-approve",   label: "SelectBoard Approval",   type: "approval", required: true,  authority: "SelectBoard" },
      { id: "legal-archive",   label: "ARCHIEVE Seal",          type: "archive",  required: true },
    ],
  },
  {
    id: "VAULTBOARD",
    name: "VAULTBOARD",
    domain: "Board Governance",
    description: "Meeting agendas, minutes, resolutions, and open meeting compliance.",
    mglCitation: "M.G.L. c. 30A §18–25",
    defaultRetentionYears: 10,
    defaultWorkflowSteps: [
      { id: "board-agenda",    label: "Agenda Preparation",     type: "intake",   required: true },
      { id: "board-post",      label: "48h Public Posting",     type: "notify",   required: true,  mglCitation: "M.G.L. c. 30A §20" },
      { id: "board-minutes",   label: "Minutes Approval",       type: "approval", required: true,  authority: "TownClerk" },
      { id: "board-archive",   label: "ARCHIEVE Seal",          type: "archive",  required: true },
    ],
  },
  {
    id: "VAULTOPS",
    name: "VAULTOPS",
    domain: "Operations",
    description: "Day-to-day operational processes, work orders, and service delivery.",
    mglCitation: "M.G.L. c. 41",
    defaultRetentionYears: 5,
    defaultWorkflowSteps: [
      { id: "ops-intake",      label: "Request Intake",         type: "intake",   required: true },
      { id: "ops-assign",      label: "Department Assignment",  type: "review",   required: true,  authority: "Staff" },
      { id: "ops-resolve",     label: "Resolution",             type: "approval", required: false, authority: "TownAdmin" },
      { id: "ops-archive",     label: "ARCHIEVE Seal",          type: "archive",  required: true },
    ],
  },
];

export function getVaultModule(id: string): VaultModule | undefined {
  return VAULT_MODULES.find((m) => m.id === id);
}

export function defaultModuleConfig(moduleId: string): ModuleConfig {
  const mod = getVaultModule(moduleId);
  return {
    moduleId,
    enforcementMode: "core",
    approver: "",
    retentionYears: mod?.defaultRetentionYears ?? 7,
    statutoryBasis: mod?.mglCitation ?? "",
    notes: "",
    workflowStepIds: mod?.defaultWorkflowSteps.map((s) => s.id) ?? [],
  };
}

// ── Local-first session persistence ───────────────────────────────────────────

const SESSION_KEY = "publiclogic:vault:builder-session";
const SESSION_EVENT = "publiclogic:vault:builder-session:changed";

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function loadBuilderSession(): BuilderSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as BuilderSession;
  } catch {
    return null;
  }
}

export function saveBuilderSession(session: BuilderSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...session, updatedAt: new Date().toISOString() }),
  );
  emitChanged();
}

export function clearBuilderSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  emitChanged();
}

export function newBuilderSession(town: string): BuilderSession {
  const now = new Date().toISOString();
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    town,
    createdAt: now,
    updatedAt: now,
    selectedModuleIds: [],
    configs: {},
    status: "in-progress",
  };
}

export { SESSION_EVENT as BUILDER_SESSION_EVENT };
