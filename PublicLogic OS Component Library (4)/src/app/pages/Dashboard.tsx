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
// Types
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
// Utilities
// ============================================================================

function getFiscalYearFolder(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth();
  const startYear = month >= 6 ? year : year - 1;
  return `FY${startYear}-${startYear + 1}`;
}

function sortByCreatedDate(a: ArchieveRecord, b: ArchieveRecord): number {
  const ad = new Date(a.CreatedAt || a.Created || 0).getTime();
  const bd = new Date(b.CreatedAt || b.Created || 0).getTime();
  return bd - ad;
}

// ============================================================================
// Dashboard
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

  useEffect(() => {
    const refresh = () => setLocalQueue(loadLocalArchieveQueue());
    refresh();
    window.addEventListener(LOCAL_ARCHIEVE_QUEUE_EVENT, refresh);
    return () =>
      window.removeEventListener(LOCAL_ARCHIEVE_QUEUE_EVENT, refresh);
  }, []);

  const connectGraphIfNeeded = useCallback(async () => {
    if (!account) return;
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
      toast.error("Microsoft 365 connection failed");
    }
  }, [account, instance]);

  const saveCapture = useCallback(async () => {
    const trimmed = captureText.trim();
    if (!trimmed) return;

    const input: CaptureInput = {
      title: trimmed.split("\n")[0].slice(0, 120) || "Capture",
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
      toast.success("Saved locally");
      return;
    }

    await createArchieveRecord(sp as any, input);
    setCaptureText("");
    await qc.invalidateQueries({ queryKey: ["archieve"] });
  }, [captureText, sp, actor, qc]);

  return (
    <div>
      <PageHeader
        title="Good morning"
        subtitle="Capture what’s emerging, then move work forward in ARCHIEVE."
        actions={
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
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 rounded-3xl p-6">
          <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
            Capture
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">
            Capture issues, decisions, observations, or links. Everything is
            recorded in ARCHIEVE so nothing gets lost.
          </div>

          <Textarea
            className="mt-4 min-h-[180px]"
            placeholder="Capture an issue, decision, observation, or link…"
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
          />

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

        <div className="lg:col-span-5 grid gap-6">
          <Card className="rounded-3xl p-6">
            <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
              In flight
            </div>
            <div className="mt-2 text-sm font-semibold text-muted-foreground">
              No active work in flight.
            </div>
          </Card>

          <Card className="rounded-3xl p-6">
            <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
              Today’s schedule
            </div>
            <div className="mt-2 text-sm font-semibold text-muted-foreground">
              Allie + Nate (from Microsoft 365).
            </div>
          </Card>

          <Card className="rounded-3xl p-6">
            <div className="text-xs font-black uppercase tracking-[0.32em] text-muted-foreground">
              Workspaces
            </div>
            <div className="mt-2 text-sm font-semibold text-muted-foreground">
              Frequently used links.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
