import { useMsal } from "@azure/msal-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  CalendarClock,
  ExternalLink,
  FileText,
  Inbox,
  Link2,
  NotebookPen,
  ShieldCheck,
  Landmark,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import PageHeader from "../components/PageHeader";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { GRAPH_SCOPES } from "../../auth/msalInstance";
import { requireInteraction } from "../../auth/RequireAuth";
import { getUserCalendarView } from "../lib/graph-api";
import useSharePointClient from "../hooks/useSharePointClient";
import {
  createArchieveRecord,
  getArchieveListUrl,
  listArchieveRecords,
} from "../lib/archieve";
import { getSharePointRuntimeConfig, resolvePuddleJumperUrl } from "../../auth/publiclogicConfig";
import { getVaultMode } from "../environments/phillipston/prr/vaultMode";
import {
  enqueueLocalArchieveItem,
  loadLocalArchieveQueue,
  LOCAL_ARCHIEVE_QUEUE_EVENT,
  saveLocalArchieveQueue,
} from "../lib/local-archieve-queue";
import {
  SHOWCASE_ENVIRONMENTS,
  SHOWCASE_ROLES,
  type ShowcaseEnvironment,
  type ShowcaseItem
} from "../data/puddleShowcase";
import { deriveDashboardMicrosoftState } from "./dashboardMicrosoftState";

// ============================================================================
// Types
// ============================================================================
interface ArchieveRecord {
  itemId?: string;
  RecordId?: string;
  Title?: string;
  CreatedAt?: string;
  Created?: string;
  webUrl?: string;
  Status?: string;
  RecordType?: string;
}

interface CalendarEvent {
  id?: string;
  subject?: string;
  webLink?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
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
// Utilities
// ============================================================================
function sortByCreatedDate(a: ArchieveRecord, b: ArchieveRecord): number {
  const ad = new Date(a.CreatedAt || a.Created || 0).getTime();
  const bd = new Date(b.CreatedAt || b.Created || 0).getTime();
  return bd - ad;
}

function getRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return "Unknown";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function getStatusVariant(status: string | undefined) {
  switch (status) {
    case "SAVED":
    case "ARCHIVED":
    case "APPROVED":
      return "default";
    case "INBOX":
    case "PENDING":
      return "secondary";
    case "DRAFT":
      return "outline";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

function mapShowcaseStatusToBadge(status: ShowcaseItem["status"], approvalState: ShowcaseItem["approvalState"]): string {
  if (approvalState === "approved") {
    return "APPROVED";
  }
  if (approvalState === "rejected") {
    return "REJECTED";
  }
  if (status === "pending" || approvalState === "pending") {
    return "PENDING";
  }
  if (status === "draft" || approvalState === "draft") {
    return "DRAFT";
  }
  if (status === "archived") {
    return "ARCHIVED";
  }
  return "ACTIVE";
}

function mapShowcaseItemToRecord(item: ShowcaseItem): ArchieveRecord {
  return {
    itemId: item.id,
    RecordId: item.id,
    Title: item.name,
    CreatedAt: item.lastUpdated,
    Created: item.lastUpdated,
    webUrl: item.url,
    RecordType: item.type.toUpperCase(),
    Status: mapShowcaseStatusToBadge(item.status, item.approvalState)
  };
}

function safeSearchParam(name: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

// ============================================================================
// Dashboard
// ============================================================================
export default function Dashboard() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const actor = account?.username || "unknown";
  const qc = useQueryClient();

  const sharepoint = getSharePointRuntimeConfig();
  const vaultMode = getVaultMode();
  const puddleRemoteUrl = resolvePuddleJumperUrl();

  const { client: sp, isLoading: isConnecting, error: connectError } = useSharePointClient();

  const [captureText, setCaptureText] = useState("");
  const [localQueue, setLocalQueue] = useState(() => loadLocalArchieveQueue());
  const [isPuddleOpen, setIsPuddleOpen] = useState(false);
  const [puddleFrameKey, setPuddleFrameKey] = useState(0);
  const puddleFrameRef = useRef<HTMLIFrameElement | null>(null);
  const localQueueCount = localQueue.length;
  const showcaseMode = safeSearchParam("mode").toLowerCase() === "showcase";
  const requestedShowcaseEnv = safeSearchParam("env").toLowerCase();
  const requestedShowcaseRole = safeSearchParam("role").toLowerCase();
  const [showcaseEnvId, setShowcaseEnvId] = useState<string>(() => {
    if (requestedShowcaseEnv && SHOWCASE_ENVIRONMENTS.some((entry) => entry.id === requestedShowcaseEnv)) {
      return requestedShowcaseEnv;
    }
    return SHOWCASE_ENVIRONMENTS[0]?.id ?? "";
  });
  const [showcaseRole, setShowcaseRole] = useState<string>(() => {
    if (requestedShowcaseRole && SHOWCASE_ROLES.includes(requestedShowcaseRole as (typeof SHOWCASE_ROLES)[number])) {
      return requestedShowcaseRole;
    }
    return "auditor";
  });

  const showcaseEnvironment = useMemo<ShowcaseEnvironment | null>(
    () => SHOWCASE_ENVIRONMENTS.find((entry) => entry.id === showcaseEnvId) ?? SHOWCASE_ENVIRONMENTS[0] ?? null,
    [showcaseEnvId]
  );

  const showcaseRecords = useMemo<ArchieveRecord[]>(() => {
    if (!showcaseEnvironment) {
      return [];
    }
    return [...showcaseEnvironment.items]
      .sort((left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime())
      .map((item) => mapShowcaseItemToRecord(item))
      .slice(0, 5);
  }, [showcaseEnvironment]);

  const showcaseItemById = useMemo(() => {
    if (!showcaseEnvironment) {
      return new Map<string, ShowcaseItem>();
    }
    return new Map(showcaseEnvironment.items.map((item) => [item.id, item]));
  }, [showcaseEnvironment]);

  const showcaseConnectionCount = useMemo(() => {
    if (!showcaseEnvironment) {
      return 0;
    }
    return new Set(showcaseEnvironment.items.map((item) => item.source.toLowerCase())).size;
  }, [showcaseEnvironment]);

  const showcaseLegalHoldCount = useMemo(() => {
    if (!showcaseEnvironment) {
      return 0;
    }
    return showcaseEnvironment.items.filter((item) => item.legalHold).length;
  }, [showcaseEnvironment]);

  const showcaseActiveItemCount = useMemo(() => {
    if (!showcaseEnvironment) {
      return 0;
    }
    return showcaseEnvironment.items.filter((item) => item.status === "active").length;
  }, [showcaseEnvironment]);

  const showcaseAuditFeed = useMemo(() => {
    if (!showcaseEnvironment) {
      return [];
    }
    return [...showcaseEnvironment.audit]
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 4);
  }, [showcaseEnvironment]);

  const puddleIdentityContext = useMemo(() => ({
    name: showcaseMode
      ? `${showcaseRole[0]?.toUpperCase() ?? ""}${showcaseRole.slice(1)} Operator`
      : account?.name || account?.username || "Unknown Operator",
    role: showcaseMode ? showcaseRole : "operator",
    tenants: showcaseMode
      ? showcaseEnvironment
        ? [
            {
              id: showcaseEnvironment.id,
              name: showcaseEnvironment.name,
              sha: "",
              connections: Array.from(new Set(showcaseEnvironment.items.map((item) => item.source)))
            }
          ]
        : []
      : sharepoint.sitePath
        ? [
            {
              id: sharepoint.sitePath,
              name: sharepoint.sitePath,
              sha: "",
              connections: sp ? ["SharePoint"] : []
            }
          ]
        : [],
    trustedParentOrigins: [window.location.origin]
  }), [
    account?.name,
    account?.username,
    sharepoint.sitePath,
    showcaseEnvironment,
    showcaseMode,
    showcaseRole,
    sp
  ]);

  const postIdentityToPuddle = useCallback(() => {
    const frameWindow = puddleFrameRef.current?.contentWindow;
    if (!frameWindow) return;

    let targetOrigin = window.location.origin;
    try {
      targetOrigin = new URL(puddleRemoteUrl, window.location.origin).origin;
    } catch {
      targetOrigin = window.location.origin;
    }

    frameWindow.postMessage(
      {
        type: "PJ_IDENTITY_CONTEXT",
        payload: puddleIdentityContext
      },
      targetOrigin
    );
  }, [puddleIdentityContext, puddleRemoteUrl]);

  useEffect(() => {
    const refresh = () => setLocalQueue(loadLocalArchieveQueue());
    refresh();
    window.addEventListener(LOCAL_ARCHIEVE_QUEUE_EVENT, refresh);
    return () => window.removeEventListener(LOCAL_ARCHIEVE_QUEUE_EVENT, refresh);
  }, []);

  // Auto-sync local queue when SharePoint becomes available
  const syncQueue = useCallback(async () => {
    if (!sp || localQueue.length === 0) return;
    try {
      for (const item of localQueue) {
        await createArchieveRecord(sp as any, item);
      }
      saveLocalArchieveQueue([]);
      setLocalQueue([]);
      await qc.invalidateQueries({ queryKey: ["archieve"] });
      toast.success(`Synced ${localQueue.length} offline items`);
    } catch (e) {
      toast.error("Failed to sync offline queue");
    }
  }, [sp, localQueue, qc]);

  useEffect(() => {
    if (sp && localQueue.length > 0) {
      void syncQueue();
    }
  }, [sp, localQueue.length, syncQueue]);

  const connectGraphIfNeeded = useCallback(async () => {
    if (!account) return;
    try {
      await instance.acquireTokenSilent({
        account,
        scopes: [...GRAPH_SCOPES],
      });
      toast.success("Microsoft 365 connected");
      qc.invalidateQueries({ queryKey: ["graph", "auth"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
    } catch (e) {
      if (requireInteraction(e)) {
        void instance.acquireTokenRedirect({
          account,
          scopes: [...GRAPH_SCOPES],
        });
        return;
      }
      toast.error("Microsoft 365 connection failed");
    }
  }, [account, instance, qc]);

  const saveCapture = useCallback(async () => {
    const trimmed = (captureText ?? "").trim();
    if (!trimmed) return;
    const input: CaptureInput = {
      title: trimmed.split("\n")[0]?.slice(0, 120) || "Capture",
      body: trimmed,
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
      toast.success("Saved locally (offline)");
      return;
    }
    try {
      await createArchieveRecord(sp as any, input);
      setCaptureText("");
      await qc.invalidateQueries({ queryKey: ["archieve"] });
      toast.success("Recorded");
    } catch (e) {
      toast.error("Failed to record");
    }
  }, [captureText, sp, actor, qc]);

  // Calendar query (today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const {
    data: graphAccessToken,
    isLoading: graphAuthLoading,
    error: graphAuthError,
  } = useQuery<string | null>({
    queryKey: ["graph", "auth", account?.homeAccountId ?? account?.username ?? "anon"],
    queryFn: async () => {
      if (!account) {
        return null;
      }
      const tokenRes = await instance.acquireTokenSilent({
        scopes: [...GRAPH_SCOPES],
        account,
      });
      return tokenRes.accessToken;
    },
    enabled: !!account && !showcaseMode,
    staleTime: 4 * 60 * 1000,
    retry: false,
  });

  const {
    data: calendarEvents = [],
    isLoading: calendarLoading,
    error: calendarError,
  } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar", format(new Date(), "yyyy-MM-dd")],
    queryFn: async () => {
      if (!graphAccessToken || !account?.username) {
        return [];
      }
      return getUserCalendarView(graphAccessToken, {
        userEmail: account.username,
        start: todayStart,
        end: todayEnd,
      });
    },
    enabled: !!graphAccessToken && !!account?.username && !showcaseMode,
  });

  const archiveConnected = showcaseMode ? true : Boolean(sp);
  const graphConnected = showcaseMode ? true : Boolean(graphAccessToken);
  const graphServiceError = showcaseMode ? false : graphConnected && Boolean(calendarError);
  const microsoftState = deriveDashboardMicrosoftState({
    showcaseMode,
    graphAuthLoading,
    graphConnected,
    graphAuthError: Boolean(graphAuthError),
    graphServiceError,
  });
  const liveConnectionCount = showcaseMode
    ? showcaseConnectionCount
    : Number(archiveConnected) + Number(graphConnected);

  const microsoftStatusContent = (() => {
    switch (microsoftState) {
      case "showcase": {
        const formattedRole = `${showcaseRole?.charAt(0).toUpperCase() ?? ""}${showcaseRole?.slice(1) ?? ""}`;
        return (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">
              Role: {formattedRole || "Operator"}
            </span>
          </>
        );
      }
      case "authenticating":
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verifying Microsoft 365…</span>
          </>
        );
      case "connected_service_error":
        return (
          <>
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">Microsoft 365 connected (calendar unavailable)</span>
          </>
        );
      case "connected":
        return (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Microsoft 365 connected</span>
          </>
        );
      case "auth_error":
        return (
          <>
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-600">Microsoft 365 auth error</span>
          </>
        );
      default:
        return (
          <>
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm">Microsoft 365 not connected</span>
          </>
        );
    }
  })();

  // Archieve records query
  const {
    data: archieveRecords = [],
    isLoading: archieveLoading,
  } = useQuery<ArchieveRecord[]>({
    queryKey: ["archieve"],
    queryFn: () => listArchieveRecords(sp!),
    enabled: !!sp && !showcaseMode,
  });

  const { data: archieveListUrl } = useQuery<string | null>({
    queryKey: ["archieve", "listUrl", !!sp],
    queryFn: async () => {
      if (!sp) return null;
      return (await getArchieveListUrl(sp as any)) ?? null;
    },
    enabled: !!sp && !showcaseMode,
    staleTime: 60 * 1000,
  });

  const recentRecords = useMemo(() => {
    return [...archieveRecords].sort(sortByCreatedDate).slice(0, 5);
  }, [archieveRecords]);
  const displayRecords = showcaseMode ? showcaseRecords : recentRecords;
  const firstName = useMemo(() => {
    const value = account?.name?.trim() || account?.username?.trim() || "";
    return value.split(/[\s@]/)[0] || "";
  }, [account?.name, account?.username]);
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  const dashboardTitle = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  const dashboardSubtitle = showcaseMode
    ? "Capture what’s emerging, then move work forward in ARCHIEVE."
    : "Capture what’s emerging, route it quickly, and keep ARCHIEVE in sync.";

  const nonShowcaseSecondMetric = localQueueCount;
  const nonShowcaseSecondLabel = "Offline Queue";
  const nonShowcaseThirdMetric = archieveRecords.length;
  const nonShowcaseThirdLabel = "Total Records";

  const appendCaptureTemplate = useCallback((prefix: "Issue" | "Decision" | "Observation" | "Link") => {
    const timestamp = format(new Date(), "yyyy-MM-dd HH:mm");
    const template = `${prefix}:\nContext:\nNext step:\nLogged: ${timestamp}`;
    setCaptureText((current) => (current.trim() ? `${current}\n\n${template}` : template));
  }, []);

  return (
    <div>
      <PageHeader
        title={dashboardTitle}
        subtitle={dashboardSubtitle}
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setIsPuddleOpen(true)}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Open PuddleJumper
            </Button>
            {showcaseMode ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Showcase Mode
              </Badge>
            ) : (
              <>
                <Button
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
              </>
            )}
          </>
        }
      />

      {showcaseMode && (
        <Card className="mt-6 rounded-3xl p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Environment</div>
              <select
                className="mt-2 rounded-lg border bg-background px-3 py-2 text-sm"
                value={showcaseEnvId}
                onChange={(event) => setShowcaseEnvId(event.target.value)}
              >
                {SHOWCASE_ENVIRONMENTS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Role</div>
              <select
                className="mt-2 rounded-lg border bg-background px-3 py-2 text-sm"
                value={showcaseRole}
                onChange={(event) => setShowcaseRole(event.target.value)}
              >
                {SHOWCASE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              {showcaseEnvironment ? `${showcaseEnvironment.sector} template loaded.` : "Template unavailable."}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Capture Card */}
        <Card className="lg:col-span-7 rounded-3xl p-6">
          <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
            Capture
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">
            Capture issues, decisions, observations, or links. Everything is recorded in ARCHIEVE so nothing gets lost.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => appendCaptureTemplate("Issue")}>Issue</Button>
            <Button size="sm" variant="outline" onClick={() => appendCaptureTemplate("Decision")}>Decision</Button>
            <Button size="sm" variant="outline" onClick={() => appendCaptureTemplate("Observation")}>Observation</Button>
            <Button size="sm" variant="outline" onClick={() => appendCaptureTemplate("Link")}>Link</Button>
          </div>
          {localQueueCount > 0 && (
            <div className="mt-4 flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>{localQueueCount} offline item{localQueueCount > 1 ? "s" : ""} queued</span>
              {sp && (
                <Button size="sm" variant="outline" onClick={() => void syncQueue()}>
                  Sync now
                </Button>
              )}
            </div>
          )}
          <Textarea
            className="mt-4 min-h-[180px]"
            placeholder="Capture an issue, decision, observation, or link…"
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
          />
          <div className="mt-2 text-xs text-muted-foreground">{captureText.length} characters</div>
          <div className="mt-4 flex gap-2">
            <Button
              className="rounded-full"
              onClick={() => void saveCapture()}
              disabled={!captureText.trim()}
            >
              <NotebookPen className="mr-2 h-4 w-4" />
              Record
            </Button>
          </div>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-5 grid gap-6">
          {/* Environments / Status */}
          <Card className="rounded-3xl p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
              <Landmark className="h-4 w-4" />
              Environments
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold font-mono">{liveConnectionCount}</div>
                <div className="text-sm text-muted-foreground">Connections</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-mono">{showcaseMode ? showcaseLegalHoldCount : nonShowcaseSecondMetric}</div>
                <div className="text-sm text-muted-foreground">{showcaseMode ? "Legal Holds" : nonShowcaseSecondLabel}</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-mono">{showcaseMode ? showcaseActiveItemCount : nonShowcaseThirdMetric}</div>
                <div className="text-sm text-muted-foreground">{showcaseMode ? "Active Items" : nonShowcaseThirdLabel}</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                {sp ? (
                  <>
                    <div className="h-3 w-3 rounded-full bg-green-600 animate-pulse" />
                    <span className="text-sm font-medium">Archive connected</span>
                  </>
                ) : isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Connecting to archive…</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">Archive disconnected</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {microsoftStatusContent}
              </div>
            </div>
          </Card>

          {/* Today’s Schedule */}
          <Card className="rounded-3xl p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Today’s schedule
            </div>
            <div className="mt-4 space-y-3">
              {showcaseMode ? (
                showcaseAuditFeed.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No showcase audit events loaded.</div>
                ) : (
                  showcaseAuditFeed.map((event) => (
                    <div key={`${event.time}:${event.itemId}`} className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-sm">
                          {format(new Date(event.time), "h:mm a")} {event.action}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.itemId} by {event.actor}
                        </div>
                      </div>
                      <Badge variant="outline">{event.env}</Badge>
                    </div>
                  ))
                )
              ) : calendarLoading ? (
                <div className="text-sm text-muted-foreground">Loading calendar…</div>
              ) : calendarError ? (
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-amber-600">
                    {graphConnected ? "Calendar unavailable" : "Calendar not connected"}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void connectGraphIfNeeded()}>
                    {graphConnected ? "Retry calendar auth" : "Connect Microsoft 365"}
                  </Button>
                </div>
              ) : calendarEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events today.</div>
              ) : (
                calendarEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-sm">
                        {event.start?.dateTime && format(new Date(event.start.dateTime), "h:mm a")} {" "}
                        {event.subject}
                      </div>
                    </div>
                    {event.webLink && (
                      <a href={event.webLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Work – full width */}
      <Card className="mt-6 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
            <FileText className="h-4 w-4" />
            {showcaseMode ? "Showcase Records" : "Recent Work"}
          </div>
          {showcaseMode ? (
            <Badge variant="outline">{showcaseEnvironment?.name ?? "Showcase"}</Badge>
          ) : archieveListUrl ? (
            <Button variant="ghost" size="sm" asChild>
              <a href={archieveListUrl} target="_blank" rel="noreferrer">
                View all <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          ) : null}
          {!showcaseMode && !archieveListUrl && (
            <span className="text-xs font-semibold text-muted-foreground">View all unavailable</span>
          )}
        </div>
        {!showcaseMode && archieveLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading records…</div>
        ) : displayRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No recent records.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRecords.map((record) => {
                const showcaseItem = showcaseMode
                  ? showcaseItemById.get(String(record.itemId || record.RecordId || ""))
                  : null;
                return (
                <TableRow key={record.itemId || record.RecordId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {record.Title || "Untitled"}
                      {record.webUrl && (
                        <a href={record.webUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    {showcaseItem && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {showcaseItem.complianceTags.map((tag) => (
                          <Badge key={`${showcaseItem.id}:${tag}`} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {showcaseItem.legalHold && (
                          <Badge variant="destructive">Legal Hold</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{record.RecordType || "Record"}</TableCell>
                  <TableCell>{getRelativeTime(record.CreatedAt || record.Created)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(record.Status)}>
                      {record.Status || "Unknown"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={isPuddleOpen} onOpenChange={setIsPuddleOpen}>
        <DialogContent
          className="gap-0 overflow-hidden p-0"
          style={{
            width: "min(98vw, 1400px)",
            maxWidth: "98vw",
            height: "92vh",
            maxHeight: "92vh",
          }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <DialogTitle className="text-base">PuddleJumper</DialogTitle>
                <DialogDescription className="mt-1">
                  Governed launcher pop-out inside PublicLogic OS.
                </DialogDescription>
              </div>
              <div className="mr-8 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPuddleFrameKey((key) => key + 1)}
                >
                  Reload
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={puddleRemoteUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    New tab
                  </a>
                </Button>
              </div>
            </div>
            <iframe
              key={puddleFrameKey}
              ref={puddleFrameRef}
              src={puddleRemoteUrl}
              title="PuddleJumper"
              sandbox="allow-scripts allow-same-origin allow-forms"
              onLoad={postIdentityToPuddle}
              className="min-h-0 w-full flex-1 border-0 bg-background"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
