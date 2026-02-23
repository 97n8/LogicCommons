/**
 * Module Builder — Governance Validation
 *
 * Validates builder sessions before activation, enforcing separation-of-duty
 * rules and required field checks consistent with the VAULT Core spec.
 */

import type { BuilderSession, ModuleConfig } from "../vault-modules";

export interface ValidationError {
  moduleId: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a single module configuration for completeness and
 * governance rule compliance.
 */
export function validateModuleConfig(config: ModuleConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config.approver.trim()) {
    errors.push({
      moduleId: config.moduleId,
      field: "approver",
      message: "A primary approver is required.",
    });
  }

  if (!config.statutoryBasis.trim()) {
    errors.push({
      moduleId: config.moduleId,
      field: "statutoryBasis",
      message: "Statutory basis (M.G.L. citation) is required.",
    });
  }

  if (config.retentionYears < 1 || config.retentionYears > 99) {
    errors.push({
      moduleId: config.moduleId,
      field: "retentionYears",
      message: "Retention period must be between 1 and 99 years.",
    });
  }

  if (config.workflowStepIds.length === 0) {
    errors.push({
      moduleId: config.moduleId,
      field: "workflowStepIds",
      message: "At least one workflow step must be enabled.",
    });
  }

  // Tailored mode requires notes explaining the local deviation
  if (config.enforcementMode === "tailored" && !config.notes.trim()) {
    errors.push({
      moduleId: config.moduleId,
      field: "notes",
      message: "Tailored mode requires a note describing the local override.",
    });
  }

  return errors;
}

/**
 * Validates the full builder session before activation.
 * Returns a consolidated result with all errors across all modules.
 */
export function validateBuilderSession(session: BuilderSession): ValidationResult {
  if (!session.town.trim()) {
    return {
      valid: false,
      errors: [{ moduleId: "", field: "town", message: "Town name is required." }],
    };
  }

  if (session.selectedModuleIds.length === 0) {
    return {
      valid: false,
      errors: [{ moduleId: "", field: "modules", message: "At least one module must be selected." }],
    };
  }

  const errors: ValidationError[] = [];
  for (const id of session.selectedModuleIds) {
    const config = session.configs[id];
    if (!config) {
      errors.push({ moduleId: id, field: "config", message: "Module has not been configured." });
    } else {
      errors.push(...validateModuleConfig(config));
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns a summary string for a builder session suitable for
 * display in audit logs or the ARCHIEVE record.
 */
export function buildSessionSummary(session: BuilderSession): string {
  const modules = session.selectedModuleIds
    .map((id) => {
      const cfg = session.configs[id];
      return cfg?.enforcementMode === "tailored" ? `${id}[T]` : id;
    })
    .join(", ");
  return `Town: ${session.town} | Modules: ${modules} | Activated: ${session.updatedAt}`;
}
