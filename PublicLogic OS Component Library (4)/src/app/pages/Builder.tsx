/**
 * Builder — Module Builder Wizard
 *
 * A "choose your own adventure" step-flow for configuring governance modules.
 * Town → Modules → Configure each → Build summary + Activate.
 *
 * LogicOS Tools panel is available at every step for statutory lookups,
 * role picker, ARCHIEVE rules, step library, and connector reference.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BlocksIcon,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Library,
  MapPin,
  Plug,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { validateBuilderSession } from "../lib/governance/module-builder";
import {
  VAULT_MODULES,
  clearBuilderSession,
  defaultModuleConfig,
  getVaultModule,
  newBuilderSession,
  saveBuilderSession,
  type BuilderSession,
  type ModuleConfig,
} from "../lib/vault-modules";

// ── LogicOS Tools panel ───────────────────────────────────────────────────────

const LOGICOS_TOOLS = [
  { id: "citation",   label: "Citation Lookup",     icon: BookOpen,  desc: "Search M.G.L. statutory references for any module type." },
  { id: "roles",      label: "Role Picker",          icon: Users,     desc: "Browse authority and role definitions (TownClerk, SelectBoard, Staff…)." },
  { id: "archieve",   label: "ARCHIEVE Rules",       icon: Archive,   desc: "Retention schedules and seal policies for each module domain." },
  { id: "steps",      label: "Step Library",         icon: Library,   desc: "Pre-built workflow step templates you can pull into any module." },
  { id: "connectors", label: "Connector Library",    icon: Plug,      desc: "Available PJ VAULT connectors (SharePoint, M365, Vauly…)." },
  { id: "annotator",  label: "Statutory Annotator",  icon: FileText,  desc: "Annotate workflow steps with their legal authority reference." },
] as const;

function LogicOSToolsPanel({ onClose }: { onClose: () => void }) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-black uppercase tracking-[0.28em] text-primary">
          LogicOS Tools
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Close tools panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {LOGICOS_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(isActive ? null : tool.id)}
              className={[
                "flex items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted",
              ].join(" ")}
              aria-expanded={isActive}
              aria-label={tool.label}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-xs font-black text-foreground">{tool.label}</div>
                <div className="text-xs font-semibold text-muted-foreground">{tool.desc}</div>
              </div>
              <div className="ml-auto shrink-0 pt-0.5">
                {isActive ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-auto border-t border-border px-4 py-3">
        <p className="text-[10px] font-semibold text-muted-foreground">
          Full tool activation requires PJ VAULT connection.
        </p>
      </div>
    </aside>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

type BuildStage = "town" | "modules" | "configure" | "summary" | "done";

const STAGE_LABELS: Record<Exclude<BuildStage, "done">, string> = {
  town: "Town",
  modules: "Modules",
  configure: "Configure",
  summary: "Review",
};

function Breadcrumb({ stage }: { stage: BuildStage }) {
  const stages: Exclude<BuildStage, "done">[] = ["town", "modules", "configure", "summary"];
  const current = stages.indexOf(stage as Exclude<BuildStage, "done">);
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs font-semibold" aria-label="Builder steps">
      {stages.map((s, i) => (
        <span key={s} className="flex items-center gap-1">
          <span
            className={[
              "rounded-full px-3 py-1",
              i === current
                ? "bg-primary text-primary-foreground"
                : i < current
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {i < current && <Check className="mr-1 inline h-3 w-3" />}
            {STAGE_LABELS[s]}
          </span>
          {i < stages.length - 1 && (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      ))}
    </nav>
  );
}

// ── Step: Town ────────────────────────────────────────────────────────────────

const KNOWN_TOWNS = ["Phillipston", "Athol", "Royalston", "Templeton", "Gardner"];

function StepTown({
  town,
  onChange,
  onNext,
}: {
  town: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-black tracking-tight text-foreground">
            Which town are you building for?
          </h2>
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          This sets the governance context for every module in this build.
        </p>
      </div>

      <Input
        aria-label="Town name"
        placeholder="Enter town name…"
        value={town}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-sm rounded-2xl"
        autoFocus
      />

      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
          Quick select
        </div>
        <div className="flex flex-wrap gap-2">
          {KNOWN_TOWNS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={[
                "rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-widest transition",
                town === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="button"
          disabled={!town.trim()}
          onClick={onNext}
          className="rounded-full"
        >
          Choose Modules
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step: Modules ─────────────────────────────────────────────────────────────

function StepModules({
  town,
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  town: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-foreground">
          Which modules are you building for{" "}
          <span className="text-primary">{town}</span>?
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Select one or more governance modules. The same configuration flow runs for each.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VAULT_MODULES.map((mod) => {
          const isSelected = selected.has(mod.id);
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onToggle(mod.id)}
              aria-pressed={isSelected}
              className={[
                "flex flex-col gap-1.5 rounded-3xl border p-4 text-left transition",
                isSelected
                  ? "border-primary bg-emerald-50 shadow-sm shadow-primary/10"
                  : "border-border bg-card hover:border-primary",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                  {mod.id}
                </span>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="text-sm font-black text-foreground">{mod.domain}</div>
              <div className="text-xs font-semibold text-muted-foreground">{mod.description}</div>
              <div className="mt-1 text-[10px] font-bold text-muted-foreground/70">
                {mod.mglCitation}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          disabled={selected.size === 0}
          onClick={onNext}
          className="rounded-full"
        >
          Configure {selected.size > 0 ? `${selected.size} module${selected.size > 1 ? "s" : ""}` : "modules"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        {selected.size > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {VAULT_MODULES.filter((m) => selected.has(m.id))
              .map((m) => m.id)
              .join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Step: Configure (per module) ──────────────────────────────────────────────

const ConfigSchema = z.object({
  approver: z.string().trim().min(1, "Approver is required"),
  retentionYears: z.number().int().min(1, "Must be at least 1").max(99, "Must be at most 99"),
  statutoryBasis: z.string().trim().min(1, "Statutory basis is required"),
  notes: z.string().trim(),
  enforcementMode: z.enum(["core", "tailored"]),
});

type ConfigFormValues = z.infer<typeof ConfigSchema>;

function StepConfigure({
  session,
  queueIdx,
  onSave,
  onBack,
}: {
  session: BuilderSession;
  queueIdx: number;
  onSave: (moduleId: string, data: ConfigFormValues) => void;
  onBack: () => void;
}) {
  const moduleId = session.selectedModuleIds[queueIdx];
  if (!moduleId) return null;
  const mod = getVaultModule(moduleId);
  const existing = session.configs[moduleId];
  const queueTotal = session.selectedModuleIds.length;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(ConfigSchema),
    defaultValues: {
      enforcementMode: existing?.enforcementMode ?? "core",
      approver: existing?.approver ?? "",
      retentionYears: existing?.retentionYears ?? mod?.defaultRetentionYears ?? 7,
      statutoryBasis: existing?.statutoryBasis ?? mod?.mglCitation ?? "",
      notes: existing?.notes ?? "",
    },
  });

  const enforcementMode = watch("enforcementMode");

  if (!mod || !moduleId) return null;

  return (
    <form
      onSubmit={handleSubmit((data) => onSave(moduleId, data))}
      className="flex flex-col gap-6"
    >
      <div>
        <div className="mb-1 flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {queueIdx + 1} / {queueTotal}
          </span>
          <span className="text-xs font-black uppercase tracking-[0.24em] text-primary">
            {mod.id}
          </span>
        </div>
        <h2 className="text-xl font-black tracking-tight text-foreground">
          Configure {mod.domain}
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">{mod.description}</p>
      </div>

      <Card className="rounded-3xl border-border p-5 shadow-sm">
        <div className="flex flex-col gap-4">

          {/* Enforcement mode */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              Enforcement Mode
            </label>
            <div className="flex flex-wrap gap-2">
              {(["core", "tailored"] as const).map((mode) => (
                <label
                  key={mode}
                  className={[
                    "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-widest transition",
                    enforcementMode === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    value={mode}
                    className="sr-only"
                    {...register("enforcementMode")}
                  />
                  {mode}
                  {mode === "tailored" && (
                    <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-[10px]">Custom overrides</span>
                  )}
                </label>
              ))}
            </div>
            {enforcementMode === "tailored" && (
              <p className="mt-2 text-xs font-semibold text-amber-600">
                Tailored mode requires a note describing the local override below.
              </p>
            )}
          </div>

          {/* Approver */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              Primary Approver
            </label>
            <Input
              {...register("approver")}
              placeholder="Role or email (e.g. TownClerk, selectboard@…)"
              className="max-w-md rounded-2xl"
              aria-label="Primary approver"
            />
            {errors.approver && (
              <p className="mt-1 text-xs font-semibold text-destructive">{errors.approver.message}</p>
            )}
          </div>

          {/* Statutory basis */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              Statutory Basis
            </label>
            <Input
              {...register("statutoryBasis")}
              placeholder="M.G.L. citation…"
              className="max-w-md rounded-2xl"
              aria-label="Statutory basis"
            />
            {errors.statutoryBasis && (
              <p className="mt-1 text-xs font-semibold text-destructive">{errors.statutoryBasis.message}</p>
            )}
          </div>

          {/* Retention */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              Retention Period (years)
            </label>
            <Input
              {...register("retentionYears", { valueAsNumber: true })}
              type="number"
              min={1}
              max={99}
              className="w-28 rounded-2xl"
              aria-label="Retention years"
            />
            {errors.retentionYears && (
              <p className="mt-1 text-xs font-semibold text-destructive">{errors.retentionYears.message}</p>
            )}
          </div>

          {/* Default workflow steps */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              Default Workflow Steps
            </label>
            <div className="flex flex-wrap gap-2">
              {mod.defaultWorkflowSteps.map((step) => (
                <span
                  key={step.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground"
                >
                  <Check className="h-3 w-3 text-emerald-600" />
                  {step.label}
                  {step.required && (
                    <span className="text-[10px] text-muted-foreground">(required)</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              Notes {enforcementMode === "tailored" && <span className="text-amber-600">*</span>}
            </label>
            <Textarea
              {...register("notes")}
              placeholder={
                enforcementMode === "tailored"
                  ? "Describe the local override or deviation…"
                  : "Optional notes or local context…"
              }
              className="max-w-lg rounded-2xl"
              rows={3}
              aria-label="Notes"
            />
            {errors.notes && (
              <p className="mt-1 text-xs font-semibold text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="rounded-full">
          {queueIdx + 1 < queueTotal ? "Next Module" : "Review Build"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ── Step: Summary ─────────────────────────────────────────────────────────────

function StepSummary({
  session,
  onBack,
  onActivate,
  activating,
}: {
  session: BuilderSession;
  onBack: () => void;
  onActivate: () => void;
  activating: boolean;
}) {
  const result = validateBuilderSession(session);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-foreground">
          Build Summary — <span className="text-primary">{session.town}</span>
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Review the configured modules before activating. Activation registers each module
          with PJ VAULT and generates ARCHIEVE seal entries.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {session.selectedModuleIds.map((id) => {
          const mod = getVaultModule(id);
          const cfg = session.configs[id];
          if (!mod || !cfg) return null;
          return (
            <Card key={id} className="rounded-3xl border-border p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                    {mod.id}
                  </div>
                  <div className="mt-0.5 text-base font-black text-foreground">{mod.domain}</div>
                </div>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest",
                    cfg.enforcementMode === "tailored"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700",
                  ].join(" ")}
                >
                  {cfg.enforcementMode}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-semibold text-muted-foreground sm:grid-cols-3">
                <span>Approver: <strong className="text-foreground">{cfg.approver || "—"}</strong></span>
                <span>Retention: <strong className="text-foreground">{cfg.retentionYears}y</strong></span>
                <span>Basis: <strong className="text-foreground">{cfg.statutoryBasis}</strong></span>
                {cfg.notes && (
                  <span className="col-span-full">Note: <em>{cfg.notes}</em></span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {!result.valid && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-destructive">
            Validation Errors
          </div>
          <ul className="flex flex-col gap-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-xs font-semibold text-destructive">
                {e.moduleId ? `[${e.moduleId}] ` : ""}{e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.valid && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Check className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="text-sm font-black text-emerald-700">
            {session.selectedModuleIds.length} module{session.selectedModuleIds.length > 1 ? "s" : ""} ready for activation
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onActivate}
          disabled={!result.valid || activating}
          className="rounded-full bg-emerald-600 hover:bg-emerald-500"
        >
          {activating ? "Activating…" : "Activate Build"}
          {!activating && <Check className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ── Done state ────────────────────────────────────────────────────────────────

function BuildDone({
  session,
  onNewBuild,
}: {
  session: BuilderSession;
  onNewBuild: () => void;
}) {
  return (
    <Card className="rounded-3xl border-border p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
        <Check className="h-8 w-8" />
      </div>
      <div className="text-2xl font-black tracking-tight text-foreground">Build Activated</div>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-muted-foreground">
        {session.selectedModuleIds.length} governance module{session.selectedModuleIds.length > 1 ? "s" : ""} for{" "}
        <strong>{session.town}</strong> are now registered with PJ VAULT and sealed in ARCHIEVE.
      </p>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-2">
        {session.selectedModuleIds.map((id) => {
          const mod = getVaultModule(id);
          const cfg = session.configs[id];
          if (!mod) return null;
          return (
            <div
              key={id}
              className="flex items-center justify-between rounded-2xl bg-muted px-4 py-2 text-xs"
            >
              <span className="font-black text-foreground">{mod.id}</span>
              <span className="font-semibold text-muted-foreground">{mod.domain}</span>
              <span
                className={[
                  "rounded-full px-2 py-0.5 font-black uppercase tracking-widest",
                  cfg?.enforcementMode === "tailored"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700",
                ].join(" ")}
              >
                {cfg?.enforcementMode ?? "core"}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onNewBuild}
        className="mt-8 rounded-full"
      >
        Start a New Build
      </Button>
    </Card>
  );
}

// ── Builder page ──────────────────────────────────────────────────────────────

export default function Builder() {
  const [stage, setStage] = useState<BuildStage>("town");
  const [town, setTown] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<BuilderSession | null>(null);
  const [queueIdx, setQueueIdx] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  function toggleModule(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function startConfigure() {
    const orderedIds = VAULT_MODULES.filter((m) => selected.has(m.id)).map((m) => m.id);
    const s = newBuilderSession(town);
    s.selectedModuleIds = orderedIds;
    // seed defaults for each selected module
    for (const id of orderedIds) {
      s.configs[id] = defaultModuleConfig(id);
    }
    saveBuilderSession(s);
    setSession(s);
    setQueueIdx(0);
    setStage("configure");
  }

  function saveModuleConfig(moduleId: string, data: {
    approver: string;
    retentionYears: number;
    statutoryBasis: string;
    notes?: string;
    enforcementMode: "core" | "tailored";
  }) {
    if (!session) return;
    const mod = getVaultModule(moduleId);
    const updated: BuilderSession = {
      ...session,
      configs: {
        ...session.configs,
        [moduleId]: {
          moduleId,
          enforcementMode: data.enforcementMode,
          approver: data.approver,
          retentionYears: data.retentionYears,
          statutoryBasis: data.statutoryBasis,
          notes: data.notes ?? "",
          workflowStepIds: mod?.defaultWorkflowSteps.map((s) => s.id) ?? [],
        } satisfies ModuleConfig,
      },
    };
    saveBuilderSession(updated);
    setSession(updated);

    if (queueIdx + 1 < session.selectedModuleIds.length) {
      setQueueIdx(queueIdx + 1);
    } else {
      setStage("summary");
    }
  }

  async function handleActivate() {
    if (!session) return;
    setActivating(true);
    try {
      // In production: POST to PJ VAULT /api/builder/activate
      await new Promise((r) => setTimeout(r, 800)); // simulates API call
      const activated: BuilderSession = { ...session, status: "activated", updatedAt: new Date().toISOString() };
      saveBuilderSession(activated);
      setSession(activated);
      setStage("done");
      toast.success(`Build activated — ${session.selectedModuleIds.length} module${session.selectedModuleIds.length > 1 ? "s" : ""} live for ${session.town}`);
    } catch {
      toast.error("Activation failed — check PJ VAULT connection and try again.");
    } finally {
      setActivating(false);
    }
  }

  function handleNewBuild() {
    clearBuilderSession();
    setStage("town");
    setTown("");
    setSelected(new Set());
    setSession(null);
    setQueueIdx(0);
    setToolsOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Builder"
        subtitle="Choose your governance modules, configure each one for your town, and activate — one flow for all nine VAULT module types."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => setToolsOpen((v) => !v)}
            className={["rounded-full", toolsOpen ? "border-primary text-primary" : ""].join(" ")}
            aria-label="Toggle LogicOS tools"
            aria-expanded={toolsOpen}
          >
            <BlocksIcon className="mr-2 h-4 w-4" />
            LogicOS Tools
          </Button>
        }
      />

      <div className="flex items-start gap-5">
        {/* Main wizard */}
        <div className="min-w-0 flex-1">
          {stage !== "done" && <Breadcrumb stage={stage} />}

          <Card className="rounded-3xl border-border p-6 shadow-sm">
            {stage === "town" && (
              <StepTown
                town={town}
                onChange={setTown}
                onNext={() => setStage("modules")}
              />
            )}
            {stage === "modules" && (
              <StepModules
                town={town}
                selected={selected}
                onToggle={toggleModule}
                onNext={startConfigure}
                onBack={() => setStage("town")}
              />
            )}
            {stage === "configure" && session && (
              <StepConfigure
                session={session}
                queueIdx={queueIdx}
                onSave={saveModuleConfig}
                onBack={() => {
                  if (queueIdx > 0) {
                    setQueueIdx(queueIdx - 1);
                  } else {
                    setStage("modules");
                  }
                }}
              />
            )}
            {stage === "summary" && session && (
              <StepSummary
                session={session}
                onBack={() => {
                  setQueueIdx(session.selectedModuleIds.length - 1);
                  setStage("configure");
                }}
                onActivate={handleActivate}
                activating={activating}
              />
            )}
            {stage === "done" && session && (
              <BuildDone session={session} onNewBuild={handleNewBuild} />
            )}
          </Card>

          {/* Context bar */}
          {stage !== "done" && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
              {town && (
                <span>
                  Town: <strong className="text-foreground">{town}</strong>
                </span>
              )}
              {selected.size > 0 && stage !== "town" && (
                <span>
                  Selected: <strong className="text-foreground">{selected.size} module{selected.size > 1 ? "s" : ""}</strong>
                </span>
              )}
              {session && stage === "configure" && (
                <span>
                  Configuring: <strong className="text-foreground">{session.selectedModuleIds[queueIdx]}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* LogicOS tools panel */}
        {toolsOpen && <LogicOSToolsPanel onClose={() => setToolsOpen(false)} />}
      </div>
    </div>
  );
}
