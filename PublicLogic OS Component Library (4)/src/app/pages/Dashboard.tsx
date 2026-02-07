import { useMsal } from "@azure/msal-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarClock,
  ExternalLink,
  FileText,
  Inbox,
  Link2,
  NotebookPen,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "../components/PageHeader";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { GRAPH_SCOPES } from "../../auth/msalInstance";
import { requireInteraction } from "../../auth/RequireAuth";
import { getUserCalendarView } from "../lib/graph-api";
import useSharePointClient from "../hooks/useSharePointClient";
import {
  createArchieveRecord,
  type ArchieveStatus,
  getArchieveListUrl,
  listArchieveRecords,
  updateArchieveStatus,
} from "../lib/archieve";
import { getSharePointRuntimeConfig } from "../../auth/publiclogicConfig";
import { getVaultMode } from "../environments/phillipston/prr/vaultMode";
import {
  enqueueLocalArchieveItem,
  loadLocalArchieveQueue,
  LOCAL_ARCHIEVE_QUEUE_EVENT,
  saveLocalArchieveQueue,
} from "../lib/local-archieve-queue";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface ArchieveRecord {
  itemId?: string;
  RecordId?: string;
  Title?: string;
  CreatedAt?: string;
  Created?: string;
  webUrl?: string;
}

interface CalendarEvent {
  id?: string;
  subject?: string;
  webLink?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
}

interface CalendarPerson {
  key: string;
  label: string;
  email: string;
  events: CalendarEvent[];
  error: string | null;
}

interface CaptureInput {
  title: string;
  body: string;
  recordType: "CAPTURE";
  status: "INBOX";
  actor: string;
  environment: string;
  module: string;
  sourceUrl: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getFiscalYearFolder(d: Date): string {
  // Massachusetts FY starts July 1
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const startYear = month >= 6 ? year : year - 1;
  return `FY${startYear}-${startYear + 1}`;
}

function sortByCreatedDate(a: ArchieveRecord, b: ArchieveRecord): number {
  const ad = new Date(a.CreatedAt || a.Created || 0).getTime();
  const bd = new Date(b.CreatedAt || b.Created || 0).getTime();
  return bd - ad;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ConnectionStatusProps {
  isConnecting: boolean;
  connectError: Error | null;
  isConnected: boolean;
  localQueueCount: number;
}

function ConnectionStatus({
  isConnecting,
  connectError,
  isConnected,
  localQueueCount,
}: ConnectionStatusProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
      <span className="rounded-full border border-border bg-muted px-3 py-1">
        {isConnecting
          ? "Connecting…"
          : connectError
            ? "Connection error"
            : isConnected
              ? "Microsoft 365 connected"
              : "Not connected"}
      </span>
      {localQueueCount > 0 && (
        <span className="rounded-full border border-border bg-muted px-3 py-1">
          Local: {localQueueCount}
        </span>
      )}
    </div>
  );
}

interface ArchieveItemProps {
  item: ArchieveRecord;
  onStatusChange: (itemId: string, status: ArchieveStatus) => Promise<void>;
  isUpdating: boolean;
  showActivate?: boolean;
}

function ArchieveItem({
  item,
  onStatusChange,
  isUpdating,
  showActivate = false,
}: ArchieveItemProps) {
  const itemId = String(item.itemId || "");

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-foreground">
          {item.Title || "(untitled)"}
        </div>
        <div className="mt-1 text-xs font-semibold text-muted-foreground">
          {item.RecordId || ""}
          {item.CreatedAt && (
            <>
              {" · "}
              {format(new Date(item.CreatedAt), "MMM d, h:mm a")}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showActivate && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={isUpdating}
            onClick={() => void onStatusChange(itemId, "ACTIVE")}
          >
            Activate
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={isUpdating}
          onClick={() => void onStatusChange(itemId, "DONE")}
        >
          Done
        </Button>
        {item.webUrl && (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={item.webUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

interface InboxSectionProps {
  items: ArchieveRecord[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isConnected: boolean;
  archieveUrl: string | null;
  onStatusChange: (itemId: string, status: ArchieveStatus) => Promise<void>;
  statusUpdatingId: string | null;
}

function InboxSection({
  items,
  isLoading,
  isError,
  error,
  isConnected,
  archieveUrl,
  onStatusChange,
  statusUpdatingId,
}: InboxSectionProps) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-muted p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-muted-foreground">
            Inbox
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">
            Recent items awaiting review
          </div>
        </div>
        {archieveUrl && (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={archieveUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </a>
          </Button>
        )}
      </div>

      {!isConnected ? (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          Connect Microsoft 365 to load ARCHIEVE inbox.
        </div>
      ) : isLoading ? (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          Loading…
        </div>
      ) : isError ? (
        <div className="mt-4 text-sm font-semibold text-red-700">
          {error instanceof Error ? error.message : "Failed to load inbox"}
        </div>
      ) : items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {items.slice(0, 8).map((item) => (
            <ArchieveItem
              key={item.itemId || item.RecordId || item.Title}
              item={item}
              onStatusChange={onStatusChange}
              isUpdating={statusUpdatingId === String(item.itemId || "")}
              showActivate
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          No inbox items yet.
        </div>
      )}
    </div>
  );
}

interface ActiveItemsSectionProps {
  items: ArchieveRecord[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isConnected: boolean;
  onStatusChange: (itemId: string, status: ArchieveStatus) => Promise<void>;
  statusUpdatingId: string | null;
}

function ActiveItemsSection({
  items,
  isLoading,
  isError,
  error,
  isConnected,
  onStatusChange,
  statusUpdatingId,
}: ActiveItemsSectionProps) {
  return (
    <Card className="rounded-3xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
            In flight
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">
            Active items in ARCHIEVE.
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/lists">
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </Link>
        </Button>
      </div>

      {!isConnected ? (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          Connect Microsoft 365 to load active items.
        </div>
      ) : isLoading ? (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          Loading…
        </div>
      ) : isError ? (
        <div className="mt-4 text-sm font-semibold text-red-700">
          {error instanceof Error ? error.message : "Failed to load active items"}
        </div>
      ) : items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {items.slice(0, 6).map((item) => (
            <ArchieveItem
              key={item.itemId || item.RecordId || item.Title}
              item={item}
              onStatusChange={onStatusChange}
              isUpdating={statusUpdatingId === String(item.itemId || "")}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          No active items.
        </div>
      )}
    </Card>
  );
}

interface CalendarViewProps {
  calendars: CalendarPerson[];
  isLoading: boolean;
  isError: boolean;
  dayKey: string;
}

function CalendarView({
  calendars,
  isLoading,
  isError,
  dayKey,
}: CalendarViewProps) {
  return (
    <Card className="rounded-3xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
            Today's schedule
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">
            Allie + Nate (from Microsoft 365).
          </div>
        </div>
        <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
          {dayKey}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          Loading…
        </div>
      ) : isError ? (
        <div className="mt-4 text-sm font-semibold text-red-700">
          Calendar view is unavailable. Click "Connect Microsoft 365".
        </div>
      ) : calendars.length > 0 ? (
        <div className="mt-4 space-y-4">
          {calendars.map((p) => (
            <div key={p.key} className="rounded-2xl border border-border bg-muted p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-black text-foreground">
                  {p.label}
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <a
                    href="https://outlook.office.com/calendar/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              {p.error ? (
                <div className="mt-2 text-xs font-semibold text-red-700">
                  {p.error}
                </div>
              ) : p.events.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {p.events.slice(0, 4).map((evt) => (
                    <div
                      key={evt.id || evt.webLink}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-foreground">
                          {evt.subject || "(no subject)"}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {evt.start?.dateTime
                            ? format(new Date(evt.start.dateTime), "h:mm a")
                            : "—"}
                          {" · "}
                          {evt.end?.dateTime
                            ? format(new Date(evt.end.dateTime), "h:mm a")
                            : "—"}
                        </div>
                      </div>
                      {evt.webLink && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                        >
                          <a href={evt.webLink} target="_blank" rel="noreferrer">
                            <Link2 className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm font-semibold text-muted-foreground">
                  No events.
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm font-semibold text-muted-foreground">
          No calendars available.
        </div>
      )}
    </Card>
  );
}

interface WorkspaceLinksProps {
  sharepoint: ReturnType<typeof getSharePointRuntimeConfig>;
  onOpenPhillipstonDocs: () => void;
}

function WorkspaceLinks({
  sharepoint,
  onOpenPhillipstonDocs,
}: WorkspaceLinksProps) {
  return (
    <Card className="rounded-3xl border-border bg-card p-6 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
        Workspaces
      </div>
      <div className="mt-2 text-sm font-semibold text-muted-foreground">
        Frequently used links.
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <Button asChild className="rounded-full justify-start">
          <Link to="/phillipston">
            <Landmark className="mr-2 h-4 w-4" />
            Phillipston CaseSpace
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full justify-start"
          onClick={onOpenPhillipstonDocs}
        >
          <FileText className="mr-2 h-4 w-4" />
          Phillipston documents
        </Button>
        <Button
          asChild
          variant="outline"
          className="rounded-full justify-start"
        >
          <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
            <Link2 className="mr-2 h-4 w-4" />
            ChatGPT
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="rounded-full justify-start"
        >
          <a
            href="https://www.icloud.com/notes/"
            target="_blank"
            rel="noreferrer"
          >
            <NotebookPen className="mr-2 h-4 w-4" />
            Notes (iCloud)
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="rounded-full justify-start"
        >
          <a
            href="https://www.icloud.com/reminders/"
            target="_blank"
            rel="noreferrer"
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Reminders (iCloud)
          </a>
        </Button>
      </div>

      <div className="mt-4 text-xs font-semibold text-muted-foreground">
        SharePoint:{" "}
        <span className="font-mono">
          {sharepoint.hostname}/{sharepoint.sitePath}
        </span>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function Dashboard() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const actor = account?.username || "unknown";
  const qc = useQueryClient();

  const dayKey = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const sharepoint = getSharePointRuntimeConfig();
  const vaultMode = getVaultMode();
  const { client: sp, isLoading: isConnecting, error: connectError } =
    useSharePointClient();
  const [captureText, setCaptureText] = useState("");
  const [localQueue, setLocalQueue] = useState(() => loadLocalArchieveQueue());
  const localQueueCount = localQueue.length;
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Sync local queue state with storage
  useEffect(() => {
    const refresh = () => setLocalQueue(loadLocalArchieveQueue());
    refresh();
    window.addEventListener(LOCAL_ARCHIEVE_QUEUE_EVENT, refresh);
    return () =>
      window.removeEventListener(LOCAL_ARCHIEVE_QUEUE_EVENT, refresh);
  }, []);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const connectGraphIfNeeded = useCallback(async () => {
    if (!account) {
      toast.error("No account available");
      return;
    }
    try {
      await instance.acquireTokenSilent({
        account,
        scopes: [...GRAPH_SCOPES],
      });
      toast.success("Microsoft 365 connected");
    } catch (e) {
      if (requireInteraction(e)) {
        void instance.acquireTokenRedirect({
          account,
          scopes: [...GRAPH_SCOPES],
        });
        return;
      }
      toast.error("Microsoft 365 connection failed", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }, [account, instance]);

  const setItemStatus = useCallback(
    async (itemId: string | undefined, status: ArchieveStatus) => {
      if (!sp || !itemId) {
        toast.error("Cannot update status", {
          description: sp ? "Invalid item ID" : "Microsoft 365 not connected",
        });
        return;
      }

      const tid = toast.loading(`Updating to ${status}…`);
      setStatusUpdatingId(itemId);

      try {
        await updateArchieveStatus(sp as any, itemId, status);
        toast.success(`Updated to ${status}`, { id: tid });
        await qc.invalidateQueries({ queryKey: ["archieve"] });
      } catch (e) {
        toast.error("Could not update", {
          id: tid,
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setStatusUpdatingId(null);
      }
    },
    [sp, qc]
  );

  const syncLocalQueueToArchieve = useCallback(async () => {
    if (!sp) {
      toast.error("Connect Microsoft 365 to sync local items.");
      return;
    }

    const queued = loadLocalArchieveQueue();
    if (!queued.length) {
      toast.message("No local items to sync.");
      return;
    }

    const tid = toast.loading(`Syncing ${queued.length} item(s)…`);
    let synced = 0;
    const remaining: typeof queued = [];

    // Oldest-first so ARCHIEVE reads naturally
    for (const q of [...queued].reverse()) {
      const { localId: _localId, createdAt: _createdAt, ...input } = q;
      try {
        await createArchieveRecord(sp as any, input);
        synced += 1;
      } catch (err) {
        console.error("Failed to sync item:", err);
        remaining.unshift(q);
      }
    }

    saveLocalArchieveQueue(remaining);
    await qc.invalidateQueries({ queryKey: ["archieve"] });

    if (remaining.length) {
      toast.error("Partial sync", {
        id: tid,
        description: `${synced} saved. ${remaining.length} remaining locally.`,
      });
      return;
    }

    toast.success("Synced", {
      id: tid,
      description: `${synced} saved to ARCHIEVE.`,
    });
  }, [sp, qc]);

  const saveCapture = useCallback(async () => {
    const trimmed = captureText.trim();
    if (!trimmed) {
      toast.error("Cannot save empty capture");
      return;
    }

    const title = trimmed.split("\n")[0].trim().slice(0, 120);
    const body = trimmed;
    const input: CaptureInput = {
      title: title || "Capture",
      body,
      recordType: "CAPTURE",
      status: "INBOX",
      actor,
      environment: "PUBLICLOGIC",
      module: "DASHBOARD",
      sourceUrl: window.location.href,
    };

    if (!sp) {
      enqueueLocalArchieveItem(input);
      setCaptureText("");
      try {
        await navigator.clipboard.writeText(body);
        toast.success("Saved locally (copied to clipboard)", {
          description: "Connect Microsoft 365 to sync to ARCHIEVE.",
        });
      } catch {
        toast.message("Saved locally", {
          description: "Connect Microsoft 365 to sync to ARCHIEVE.",
        });
      }
      return;
    }

    const tid = toast.loading("Saving to ARCHIEVE…");
    try {
      const res = await createArchieveRecord(sp as any, input);
      setCaptureText("");
      toast.success("Saved to ARCHIEVE", { id: tid, description: res.recordId });
      await qc.invalidateQueries({ queryKey: ["archieve"] });
    } catch (e) {
      console.error("Failed to save to ARCHIEVE:", e);
      enqueueLocalArchieveItem(input);
      setCaptureText("");
      toast.message("Saved locally", {
        id: tid,
        description: "Will sync when Microsoft 365 is available.",
      });
    }
  }, [captureText, sp, actor, qc]);

  const copyToClipboard = useCallback(async () => {
    if (!captureText.trim()) return;

    try {
      await navigator.clipboard.writeText(captureText);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Could not copy to clipboard");
    }
  }, [captureText]);

  const refreshArchieve = useCallback(async () => {
    if (!sp) {
      toast.error("Microsoft 365 not connected");
      return;
    }

    const tid = toast.loading("Refreshing…");
    try {
      await qc.invalidateQueries({ queryKey: ["archieve"] });
      toast.success("Refreshed", { id: tid });
    } catch (err) {
      console.error("Failed to refresh:", err);
      toast.error("Could not refresh", { id: tid });
    }
  }, [sp, qc]);

  const openPhillipstonDocs = useCallback(async () => {
    if (!sp) {
      window.open(sharepoint.url, "_blank", "noreferrer");
      return;
    }

    const fy = getFiscalYearFolder(new Date());
    const segments = [
      sharepoint.vault.libraryRoot,
      ...(vaultMode === "test" ? ["TEST"] : []),
      fy,
      "PHILLIPSTON",
    ];

    const tid = toast.loading("Opening town documents…");
    try {
      const res = await (sp as any).ensureDriveFolder(segments);
      const url = res?.item?.webUrl;
      if (!url) throw new Error("Folder webUrl not available");
      window.open(url, "_blank", "noreferrer");
      toast.success("Opened", { id: tid });
    } catch (e) {
      console.error("Failed to open folder:", e);
      toast.error("Could not open folder", {
        id: tid,
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }, [sp, sharepoint, vaultMode]);

  // ============================================================================
  // Data Queries
  // ============================================================================

  const archieveUrlQuery = useQuery({
    queryKey: ["archieve", "url", !!sp],
    enabled: !!sp,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!sp) return null;
      try {
        return (await getArchieveListUrl(sp as any)) ?? null;
      } catch (err) {
        console.error("Failed to get ARCHIEVE URL:", err);
        return null;
      }
    },
  });

  const inboxQuery = useQuery<ArchieveRecord[]>({
    queryKey: ["archieve", "inbox", dayKey, !!sp],
    enabled: !!sp,
    staleTime: 5 * 1000,
    queryFn: async () => {
      if (!sp) return [];
      try {
        const items = await listArchieveRecords(sp as any, {
          status: "INBOX",
          top: 12,
          forceRefresh: true,
        });
        items.sort(sortByCreatedDate);
        return items;
      } catch (err) {
        console.error("Failed to load inbox:", err);
        throw err;
      }
    },
  });

  const activeQuery = useQuery<ArchieveRecord[]>({
    queryKey: ["archieve", "active", dayKey, !!sp],
    enabled: !!sp,
    staleTime: 5 * 1000,
    queryFn: async () => {
      if (!sp) return [];
      try {
        const items = await listArchieveRecords(sp as any, {
          status: "ACTIVE",
          top: 12,
          forceRefresh: true,
        });
        items.sort(sortByCreatedDate);
        return items;
      } catch (err) {
        console.error("Failed to load active items:", err);
        throw err;
      }
    },
  });

  const calendarsQuery = useQuery<CalendarPerson[]>({
    queryKey: ["graph", "calendars", account?.homeAccountId, dayKey],
    enabled: !!account,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!account) return [];

      try {
        const res = await instance.acquireTokenSilent({
          account,
          scopes: [...GRAPH_SCOPES],
        });

        const start = new Date();
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const people = [
          { key: "allie", label: "Allie", email: "allie@publiclogic.org" },
          { key: "nate", label: "Nate", email: "nate@publiclogic.org" },
        ] as const;

        const settled = await Promise.allSettled(
          people.map((p) =>
            getUserCalendarView(res.accessToken, {
              userEmail: p.email,
              start,
              end,
              top: 6,
            })
          )
        );

        return people.map((p, idx) => {
          const r = settled[idx];
          if (r.status === "fulfilled") {
            return { ...p, events: r.value, error: null };
          }
          const message =
            r.reason instanceof Error ? r.reason.message : String(r.reason);
          console.error(`Failed to load calendar for ${p.label}:`, message);
          return { ...p, events: [], error: message };
        });
      } catch (err) {
        console.error("Failed to load calendars:", err);
        throw err;
      }
    },
  });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Daily workspace. Capture emerging issues and decisions, then review and resolve them in ARCHIEVE."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => void connectGraphIfNeeded()}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Connect Microsoft 365
            </Button>
            <Button asChild className="rounded-full">
              <a
                href="https://publiclogic978.sharepoint.com/sites/PL"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open SharePoint
              </a>
            </Button>
            {archieveUrlQuery.data && (
              <Button asChild variant="outline" className="rounded-full">
                <a
                  href={archieveUrlQuery.data}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Inbox className="mr-2 h-4 w-4" />
                  Open ARCHIEVE
                </a>
              </Button>
            )}
            {localQueueCount > 0 && (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => void syncLocalQueueToArchieve()}
                disabled={!sp}
                title={
                  sp
                    ? "Sync local items to ARCHIEVE"
                    : "Connect Microsoft 365 to sync local items"
                }
              >
                <NotebookPen className="mr-2 h-4 w-4" />
                Sync local ({localQueueCount})
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Capture Card */}
        <Card className="lg:col-span-7 rounded-3xl border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
                Intake
              </div>
              <div className="mt-2 text-sm font-semibold text-muted-foreground">
                Capture issues, decisions, observations, and links. Items are
                recorded in ARCHIEVE for review and follow-through.
              </div>
              <ConnectionStatus
                isConnecting={isConnecting}
                connectError={connectError}
                isConnected={!!sp}
                localQueueCount={localQueueCount}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full"
                onClick={() => void saveCapture()}
                disabled={!captureText.trim()}
              >
                <NotebookPen className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/lists">
                  <Inbox className="mr-2 h-4 w-4" />
                  Inbox
                </Link>
              </Button>
            </div>
          </div>

          <Textarea
            className="mt-4 min-h-[180px]"
            placeholder="Capture an issue, decision, observation, or link…"
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => void copyToClipboard()}
              disabled={!captureText.trim()}
            >
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => void refreshArchieve()}
              disabled={!sp}
            >
              Refresh
            </Button>
          </div>

          <InboxSection
            items={inboxQuery.data ?? []}
            isLoading={inboxQuery.isLoading}
            isError={inboxQuery.isError}
            error={inboxQuery.error}
            isConnected={!!sp}
            archieveUrl={archieveUrlQuery.data}
            onStatusChange={setItemStatus}
            statusUpdatingId={statusUpdatingId}
          />
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-6">
          <ActiveItemsSection
            items={activeQuery.data ?? []}
            isLoading={activeQuery.isLoading}
            isError={activeQuery.isError}
            error={activeQuery.error}
            isConnected={!!sp}
            onStatusChange={setItemStatus}
            statusUpdatingId={statusUpdatingId}
          />

          <CalendarView
            calendars={calendarsQuery.data ?? []}
            isLoading={calendarsQuery.isLoading}
            isError={calendarsQuery.isError}
            dayKey={dayKey}
          />

          <WorkspaceLinks
            sharepoint={sharepoint}
            onOpenPhillipstonDocs={openPhillipstonDocs}
          />
        </div>
      </div>
    </div>
  );
}
