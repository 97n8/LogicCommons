import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FileText, Clock, CheckCircle2, AlertCircle, Plus, ChevronRight, Search, 
  Archive, Layout, LogOut, User, Kanban, Bell, Settings, Info, Copy, RefreshCcw, 
  Gavel, Database, BookOpen, ShieldCheck, ExternalLink, Scale, Landmark, 
  Users, Mail, ClipboardList, Briefcase, Target, FolderOpen, History, Stamp
} from "lucide-react";
import { Button, Card, Badge } from "./ui/base";
import { Input, Textarea, Select, Label } from "./ui/form";
import { Table, THead, TBody, TR, TH, TD, Modal } from "./ui/overlay";
import { motion as Motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getPillVariant } from "../lib/constants";
import { calculatePRRDeadline } from "../lib/governance/policies";

// Patch: Source of truth for runtime
import { IS_DEMO } from "../../runtime";
import { acquireToken, getAuth } from "../../lib/auth";

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-70f81275`;

export default function PhillipstonGovernanceOS() {
  const [activeTab, setActiveTab] = useState("cases");
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ open: 0, pending: 0, completed: 0, overdue: 0, archivedCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const currentRedirectUri = useMemo(() => {
    return (window.location.origin + window.location.pathname).replace(/\/?$/, '/');
  }, []);

  const handleLogin = async () => {
    if (IS_DEMO) {
      setUser({ name: "Demo User", username: "clerk@phillipston-ma.gov" });
      toast.success("Demo Mode: Authenticated");
      return;
    }

    const auth = getAuth();
    if (!auth) return;

    try {
      const result = await auth.loginPopup({ 
        scopes: ["User.Read", "Sites.ReadWrite.All"],
        prompt: "select_account"
      });
      setUser(result.account);
      toast.success(`Welcome back, ${result.account.name}`);
      fetchData();
    } catch (err: any) {
      if (err.message?.includes("AADSTS50011")) {
        setIsConfigOpen(true);
        toast.error("Redirect URI Mismatch", {
          description: "Register this URI in Azure Entra ID.",
          duration: 10000
        });
      } else {
        toast.error("Auth Error", { description: err.message });
      }
    }
  };

  const handleLogout = () => {
    if (IS_DEMO) {
      setUser(null);
      return;
    }
    const auth = getAuth();
    auth?.logoutPopup();
    setUser(null);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    if (IS_DEMO) {
      // Force demo data for stats / requests
      setStats({
        open: 3,
        pending: 2,
        completed: 12,
        overdue: 1,
        archivedCount: 142
      });

      setRequests([
        { id: 'PRR-2026-001', name: 'Zoning Inquiry', description: 'Plot 42 boundary check', status: 'Active', dueDate: '2026-02-15' },
        { id: 'PRR-2026-002', name: 'Payroll Records', description: 'Q4 2025 Town Clerk', status: 'Completed', dueDate: '2026-02-10' },
        { id: 'PRR-2026-003', name: 'BOH Minutes', description: 'Jan 2026 meeting notes', status: 'Pending', dueDate: '2026-02-05' },
      ]);

      setIsLoading(false);
      return;
    }

    try {
      const { accessToken } = await acquireToken();
      
      const commonHeaders: Record<string, string> = { 
        'Authorization': `Bearer ${publicAnonKey}`, 
        'apikey': publicAnonKey,
        'x-ms-graph-token': accessToken
      };
      
      const [statsRes, reqRes] = await Promise.all([
        fetch(`${API_BASE}/stats`, { headers: commonHeaders }),
        fetch(`${API_BASE}/requests`, { headers: commonHeaders })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (reqRes.ok) setRequests(await reqRes.json());
      
    } catch (err: any) {
      console.error("Vault Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleProvisionVault = async () => {
    if (IS_DEMO) {
      toast.info("Demo Mode: Vault sync simulated");
      return;
    }

    setIsProvisioning(true);
    const tid = toast.loading("Provisioning Phillipston Vault...");
    try {
      const { accessToken } = await acquireToken();
      const res = await fetch(`${API_BASE}/provision`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`, 
          'apikey': publicAnonKey,
          'x-ms-graph-token': accessToken
        }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Vault Synchronized", { id: tid });
        fetchData();
      } else {
        toast.error("Provisioning Failed", { id: tid, description: result.error });
      }
    } catch (err: any) {
      toast.error("Network Error", { id: tid });
    } finally {
      setIsProvisioning(false);
    }
  };

  useEffect(() => {
    if (IS_DEMO) {
      setUser({ name: "Demo User", username: "clerk@phillipston-ma.gov" });
    }
    fetchData();
  }, [fetchData]);

  const StatusPill = ({ status }: { status: string }) => {
    const variant = getPillVariant(status);
    const colors: Record<string, string> = {
      mint: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      gold: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      slate: "bg-slate-500/10 text-slate-400 border-slate-500/20"
    };
    return (
      <Badge className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border", colors[variant] || colors.slate)}>
        {status || "Intake"}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFB] font-sans text-slate-900 overflow-hidden flex-col">
      {/* Visual Confirmation Banner */}
      {IS_DEMO && (
        <div className="bg-yellow-200 text-yellow-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-center shrink-0 border-b border-yellow-300">
          DEMO MODE — Authentication & Vault disabled
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[280px] bg-[#0A0D14] flex flex-col shrink-0">
          <div className="p-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] italic">Governance OS</span>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Phillipston</h1>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            {[
              { id: "dashboard", label: "Dashboard", icon: Layout },
              { id: "cases", label: "Case Space", icon: Kanban },
              { id: "records", label: "Records Portal", icon: FileText },
              { id: "network", label: "Municipal Network", icon: Landmark },
              { id: "compliance", label: "Compliance", icon: ShieldCheck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all",
                  activeTab === item.id 
                    ? "bg-emerald-50 text-emerald-900 font-black" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6">
            <div className="bg-[#1A1F2B] rounded-2xl p-4 flex items-center gap-3 border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-xs">
                {user?.name?.substring(0,2).toUpperCase() || "TC"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black text-white uppercase tracking-tight truncate">{user?.name || "Town Clerk"}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Phillipston, MA</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-[80px] bg-white border-b border-slate-200/60 px-8 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 text-slate-400">
                <Layout className="w-5 h-5" />
                <ChevronRight className="w-4 h-4 opacity-30" />
                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">Tenant Explorer</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search archives..." className="pl-11 pr-6 py-2.5 bg-slate-100 border-none rounded-xl text-sm w-[320px] focus:ring-2 focus:ring-emerald-500/20 outline-none" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setIsConfigOpen(true)} className="p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all relative">
                <Bell className="w-5 h-5" />
                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              </button>
              <div className="h-8 w-px bg-slate-200 mx-2" />
              <Button variant="primary" onClick={() => setIsIntakeOpen(true)} className="rounded-xl px-6 h-11 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 border-none font-black text-[11px] uppercase tracking-widest text-white">
                <Plus className="w-4 h-4 mr-2" /> New Intake
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10">
            {activeTab === "cases" ? (
              <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Tenant Explorer</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    {IS_DEMO ? "Figma Simulation Environment Active." : "M365 SharePoint Repository Handshake Active."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { title: "PRR Protocols", sub: "PRR/SOPS", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/5" },
                    { title: "MGL Reference", sub: "Compliance", icon: Gavel, color: "text-blue-500", bg: "bg-blue-500/5" },
                    { title: "Historical Archive", sub: "PRR/Archives", icon: Database, color: "text-amber-500", bg: "bg-amber-500/5" },
                  ].map((card, i) => (
                    <Card key={i} className="p-10 border-none bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all rounded-[32px]">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8", card.bg)}>
                        <card.icon className={cn("w-6 h-6", card.color)} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{card.title}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.sub}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: "Vaulted Records", value: stats.archivedCount, icon: Archive, color: "text-emerald-500" },
                    { label: "Open Requests", value: stats.open, icon: Clock, color: "text-amber-500" },
                    { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "text-rose-500" },
                    { label: "Vault Sync", value: isLoading ? "..." : (IS_DEMO ? "Simulated" : "Online"), icon: RefreshCcw, color: "text-blue-500" },
                  ].map((stat, i) => (
                    <Card key={i} className="p-6 bg-white border-slate-100 flex items-center gap-5 rounded-2xl shadow-sm">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50">
                        <stat.icon className={cn("w-5 h-5", stat.color)} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-slate-900">{stat.value}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="border-none bg-white shadow-xl rounded-[32px] overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Archives</h3>
                    <div className="flex items-center gap-4">
                      {!user ? (
                        <Button onClick={handleLogin} className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 h-8 rounded-full px-4 border-none hover:bg-emerald-100">
                          <User className="w-3.5 h-3.5 mr-2" /> Verify Clerk Identity
                        </Button>
                      ) : (
                        <Button onClick={handleProvisionVault} isLoading={isProvisioning} className="text-[10px] font-black uppercase text-slate-500 h-8 rounded-full px-4 border border-slate-200 bg-white hover:bg-slate-50">
                          <RefreshCcw className={cn("w-3.5 h-3.5 mr-2", isProvisioning && "animate-spin")} /> Sync Vault
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <THead className="bg-white">
                        <TH className="py-5 px-8 text-[10px] text-slate-400 font-black uppercase tracking-widest">Record ID</TH>
                        <TH className="py-5 text-[10px] text-slate-400 font-black uppercase tracking-widest">Description</TH>
                        <TH className="py-5 text-[10px] text-slate-400 font-black uppercase tracking-widest">Status</TH>
                        <TH className="py-5 text-right pr-8 text-[10px] text-slate-400 font-black uppercase tracking-widest">Statutory Deadline</TH>
                      </THead>
                      <TBody>
                        {isLoading ? (
                          <TR><TD colSpan={4} className="py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Syncing Municipal Vault...</TD></TR>
                        ) : requests.length === 0 ? (
                          <TR><TD colSpan={4} className="py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Vault empty or auth required.</TD></TR>
                        ) : requests.map((req) => (
                          <TR key={req.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50/80 last:border-0">
                            <TD className="py-6 px-8">
                              <span className="font-mono text-xs font-bold text-emerald-600">{req.id}</span>
                            </TD>
                            <TD className="py-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{req.name}</span>
                                <span className="text-[11px] text-slate-400 font-medium line-clamp-1">{req.description}</span>
                              </div>
                            </TD>
                            <TD className="py-6">
                              <StatusPill status={req.status} />
                            </TD>
                            <TD className="py-6 text-right pr-8">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-black text-slate-900">{new Date(req.dueDate).toLocaleDateString()}</span>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-tighter">
                                  <ShieldCheck className="w-2.5 h-2.5" /> M.G.L. Active
                                </div>
                              </div>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-20">
                 <Archive className="w-20 h-20 text-slate-400" />
                 <h3 className="text-2xl font-black uppercase tracking-widest text-slate-400">Under Construction</h3>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Config Modal */}
      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Security Configuration">
        <div className="p-8 space-y-8">
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Redirect URI</h4>
            <div className="mt-4 p-4 bg-slate-900 rounded-2xl flex items-center justify-between gap-4 border border-white/10 group">
              <input 
                readOnly 
                value={currentRedirectUri}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="bg-transparent text-emerald-400 text-xs font-mono w-full outline-none cursor-text"
              />
              <button onClick={async () => { 
                try {
                  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(currentRedirectUri); 
                    toast.success("Copied to clipboard");
                    return;
                  }
                  throw new Error("Clipboard API unavailable");
                } catch (err) {
                  try {
                    const textArea = document.createElement("textarea");
                    textArea.value = currentRedirectUri;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    textArea.style.top = "0";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (successful) {
                      toast.success("Copied to clipboard");
                      return;
                    }
                  } catch (fallbackErr) {}
                  toast.error("Manual Copy Required", { description: "Click the URI to select it, then press Cmd+C / Ctrl+C." });
                }
              }} className="p-3 bg-white/5 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shrink-0">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-black text-emerald-900 uppercase">Configuration Steps</h5>
                <ol className="text-[11px] text-emerald-800 space-y-2 mt-3 list-decimal list-inside leading-relaxed font-bold">
                  <li>Login to Azure Portal {" > "} Entra ID</li>
                  <li>App Registrations {" > "} Phillipston Governance OS</li>
                  <li>Authentication {" > "} Add Platform {" > "} Web</li>
                  <li>Paste the URI above and Save</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={() => setIsConfigOpen(false)} className="rounded-xl px-8 uppercase font-black text-[10px] tracking-widest bg-slate-900 text-white border-none h-10">Dismiss</Button>
          </div>
        </div>
      </Modal>

      {/* Intake Modal */}
      <Modal isOpen={isIntakeOpen} onClose={() => setIsIntakeOpen(false)} title="Record Intake">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Archive className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Archive-First Record Intake</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">M.G.L. c.66 Compliance • Phillipston Vault</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.error("Auth Required", { description: "Verify Clerk Identity to commit." }); }}>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requestor Identity</Label>
              <Input required placeholder="Full Name or Entity" className="bg-slate-50 border-slate-200 rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
              <Textarea required placeholder="Provide details..." className="bg-slate-50 border-slate-200 rounded-xl min-h-[120px]" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsIntakeOpen(false)} className="rounded-xl uppercase tracking-widest text-[10px] font-black px-6">Cancel</Button>
              <Button variant="primary" type="submit" className="rounded-xl uppercase tracking-widest text-[10px] px-8 h-12 shadow-lg shadow-emerald-500/20 border-none font-black bg-emerald-500 text-white hover:bg-emerald-600">Commit to Archive</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
