import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, BarChart3, Bell, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleDollarSign, Clock3, Command, CreditCard, Download, Edit3, Gamepad2, Grid2X2,
  LayoutDashboard, ListFilter, Monitor, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, ShoppingBag,
  SlidersHorizontal, Sparkles, Table2, Trash2, TrendingUp, Users, Wallet, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as db from "@/lib/db";
import { getAccruedCharge, getBillableOvertimeMinutes, getFinalAmount, getGraceMsLeft, getOvertimeCharge, getOvertimeMs, getPerMinuteRate, getSessionState } from "@/lib/billing";
import type { Bill, BillItem, Expense, PaymentMethod, Product, Service, ServicePrice, Session, SessionExtension, Setting } from "@/types";

type PageKey = "dashboard" | "sessions" | "new-session" | "billing" | "products" | "expenses" | "reports" | "settings";
type Snapshot = { services: Service[]; tariffs: ServicePrice[]; products: Product[]; sessions: Session[]; bills: Bill[]; expenses: Expense[]; settings: Setting[]; extensions: SessionExtension[] };
const NAV: { id: PageKey; label: string; icon: typeof LayoutDashboard; shortcut?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "D" },
  { id: "sessions", label: "Gaming Sessions", icon: Gamepad2 },
  { id: "new-session", label: "New Session", icon: Plus, shortcut: "N" },
  { id: "billing", label: "Billing & Orders", icon: ShoppingBag, shortcut: "B" },
  { id: "products", label: "Products & Pricing", icon: Grid2X2 },
  { id: "expenses", label: "Expenses", icon: Wallet },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings2 },
];
const ROUTE: Record<PageKey, string> = { dashboard: "/", sessions: "/sessions", "new-session": "/new-session", billing: "/billing", products: "/products", expenses: "/expenses", reports: "/reports", settings: "/settings" };
const blankSnapshot = (): Snapshot => ({ services: [], tariffs: [], products: [], sessions: [], bills: [], expenses: [], settings: [], extensions: [] });
const currency = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const clockTime = (value: number) => new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const longDate = (value: number) => new Date(value).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const dateKey = (value: number) => new Date(value).toISOString().slice(0, 10);
const money = (value: FormDataEntryValue | null) => Math.max(0, Math.round(Number(value) || 0));
const labelFor = (service?: Service) => service?.name || "Station";
const typeFor = (service?: Service) => (service?.type || "station").toLowerCase();
const buildEmptySnapshot = async (): Promise<Snapshot> => {
  await db.seedIfEmpty();
  const [services, tariffs, products, sessions, bills, expenses, settings, data] = await Promise.all([db.getServices(), db.getTariffs(), db.getProducts(), db.getSessions(), db.getBills(), db.getExpenses(), db.getSettings(), db.getAllData()]);
  return { services, tariffs, products, sessions, bills, expenses, settings, extensions: data.session_extensions };
};

function useManagerData() {
  const [data, setData] = useState<Snapshot>(blankSnapshot);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => { const next = await buildEmptySnapshot(); setData(next); setReady(true); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, setData, ready, refresh };
}

function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  return now;
}

function formatTimer(session: Session, now: number) {
  const diff = session.expected_end_time - now;
  const seconds = Math.floor(Math.abs(diff) / 1000);
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return diff < 0 ? `+${hours}:${minutes}:${rest}` : `${hours}:${minutes}:${rest}`;
}

function IconButton({ label, children, onClick, variant = "ghost" }: { label: string; children: ReactNode; onClick: () => void; variant?: "ghost" | "outline" | "secondary" | "destructive" }) {
  return <Button type="button" variant={variant} size="icon" title={label} aria-label={label} onClick={onClick} className="h-8 w-8 rounded-full">{children}</Button>;
}

function SectionTitle({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>{actions}</div>;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`glass rounded-2xl p-5 ${className}`}>{children}</section>; }

function EmptyState({ icon: Icon = Sparkles, title, detail, action }: { icon?: typeof Sparkles; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 py-8 text-center"><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-5" /></span><p className="font-medium">{title}</p><p className="max-w-sm text-sm text-muted-foreground">{detail}</p>{action && <div className="mt-2">{action}</div>}</div>;
}

function StatusPill({ status }: { status: ReturnType<typeof getSessionState> }) {
  const style = status === "overtime" ? "bg-rose-100 text-rose-800" : status === "closing" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${style}`}><span className="size-1.5 rounded-full bg-current" />{status === "in-time" ? "IN TIME" : status.toUpperCase()}</span>;
}

function SessionLine({ session, service, data, now, onOpen, onSettle, onEnd, onExtend }: { session: Session; service?: Service; data: Snapshot; now: number; onOpen: () => void; onSettle: () => void; onEnd: () => void; onExtend: () => void }) {
  const state = getSessionState(session, now, data.settings);
  const overtime = getOvertimeCharge(session, service, data.tariffs, data.settings, now);
  const total = getAccruedCharge(session, service, data.tariffs, data.extensions, data.settings, now);
  const span = Math.max(1, session.expected_end_time - session.start_time);
  const progress = Math.min(100, Math.max(0, ((now - session.start_time) / span) * 100));
  const grace = getGraceMsLeft(session, data.settings, now);
  return <div className="group grid grid-cols-[minmax(120px,1.3fr)_minmax(140px,1.2fr)_minmax(116px,1fr)_minmax(90px,.8fr)_auto] items-center gap-3 border-b border-border/70 py-3 last:border-0 max-lg:grid-cols-[1fr_auto]">
    <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Gamepad2 className="size-5" /></span><span className="min-w-0"><span className="block truncate font-semibold">{session.customer_name || "Walk-in"}</span><span className="block truncate text-xs text-muted-foreground">{labelFor(service)}{session.phone ? ` · ${session.phone}` : ""}</span></span></button>
    <button type="button" onClick={onOpen} className="min-w-0 text-left max-lg:hidden"><span className="block text-sm">{clockTime(session.start_time)} <span className="text-muted-foreground">→</span> {clockTime(session.expected_end_time)}</span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-secondary"><span className={`block h-full rounded-full ${state === "overtime" ? "bg-rose-400" : "bg-primary"}`} style={{ width: `${progress}%` }} /></span></button>
    <button type="button" onClick={onOpen} className="text-left max-lg:hidden"><span className={`block font-mono text-base font-semibold ${state === "overtime" ? "text-rose-700" : "text-foreground"}`}>{formatTimer(session, now)}</span><span className="mt-1 flex items-center gap-2">{state === "overtime" ? grace > 0 ? <span className="font-mono text-[9px] text-amber-800">GRACE: {formatTimer({ ...session, expected_end_time: now + grace }, now)}</span> : <StatusPill status={state} /> : <StatusPill status={state} />}</span></button>
    <div className="text-right max-lg:hidden"><span className="font-mono text-sm font-semibold">{currency(total)}</span>{overtime > 0 && <span className="block text-[10px] text-rose-700">+{currency(overtime)} OT</span>}</div>
    <div className="flex items-center justify-end gap-1"><IconButton label="Extend session" onClick={onExtend}><Plus className="size-4" /></IconButton><Button type="button" size="sm" variant="secondary" onClick={onSettle} className="h-8 rounded-full px-3 text-xs">Settle</Button><IconButton label="End session" onClick={onEnd}><X className="size-4" /></IconButton></div>
  </div>;
}

class AppErrorBoundary extends ErrorBoundaryBase {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { if (this.state.error) return <div className="glass-strong mx-auto my-24 max-w-lg rounded-3xl p-10 text-center"><ShieldCheck className="mx-auto mb-4 size-10 text-primary" /><h2 className="text-xl font-semibold">Let's get you back on track</h2><p className="mt-2 text-sm text-muted-foreground">This screen had a hiccup. Your saved lounge data is safe.</p><div className="mt-6 flex justify-center gap-2"><Button onClick={() => { this.setState({ error: false }); window.location.assign("/"); }} className="gold-button rounded-full">Return to Dashboard</Button><Button variant="outline" onClick={() => window.location.reload()} className="rounded-full">Reload</Button></div></div>; return this.props.children; }
}

import { Component } from "react";
const ErrorBoundaryBase = Component;

export function ManagerApp({ page }: { page: PageKey }) {
  const { data, refresh, ready } = useManagerData();
  const now = useClock();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [extendSession, setExtendSession] = useState<Session | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const selectedSession = data.sessions.find((item) => item.id === selectedSessionId) ?? null;
  const serviceFor = (session: Session) => data.services.find((item) => item.id === session.service_id);
  const activeSessions = data.sessions.filter((item) => item.status === "active").sort((a, b) => a.expected_end_time - b.expected_end_time);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayBills = data.bills.filter((bill) => bill.created_at >= todayStart.getTime() && bill.status !== "void");
  const todayExpenses = data.expenses.filter((expense) => expense.date >= todayStart.getTime());
  const totalRevenue = todayBills.filter((bill) => bill.status === "paid").reduce((sum, bill) => sum + bill.final_amount, 0);
  const expenseTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const gamingRevenue = todayBills.reduce((sum, bill) => sum + bill.gaming_subtotal, 0);
  const foodRevenue = todayBills.reduce((sum, bill) => sum + bill.food_subtotal, 0);
  const unpaid = data.bills.filter((bill) => bill.status === "unpaid").length;
  const pendingSessions = activeSessions.filter((session) => !data.bills.some((bill) => bill.session_id === session.id && bill.status === "paid"));
  const navTo = (key: PageKey) => { setShowMobileNav(false); void navigate({ to: ROUTE[key] as "/" }); };

  useEffect(() => { const interval = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(interval); }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") { event.preventDefault(); navTo("new-session"); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") { event.preventDefault(); navTo("billing"); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") { event.preventDefault(); navTo("dashboard"); }
      else if (event.key === "Escape") { setCommandOpen(false); setHelpOpen(false); setSelectedSessionId(null); setExtendSession(null); }
      else if (event.key === "?" && !(event.target instanceof HTMLInputElement)) setHelpOpen(true);
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  });

  const removeSession = async (session: Session) => {
    setConfirmState({ title: "End this session?", message: `This will remove ${session.customer_name || "this session"} from the live arena.`, action: async () => { await db.updateSession({ ...session, status: "completed" }); await refresh(); setSelectedSessionId(null); toast("Session ended", { action: { label: "UNDO", onClick: () => { void db.updateSession(session).then(refresh); } } }); } });
  };
  const settleSession = (session: Session) => { setSelectedSessionId(null); void navigate({ to: "/billing" as "/" }); window.setTimeout(() => window.dispatchEvent(new CustomEvent("select-bill-session", { detail: session.id })), 100); };
  const startExtend = (session: Session) => setExtendSession(session);

  const pageContent = () => {
    if (!ready) return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Preparing your lounge…</div>;
    if (page === "dashboard") return <DashboardPage data={data} now={now} active={activeSessions} pending={pendingSessions.length + unpaid} revenue={totalRevenue} expenses={expenseTotal} gaming={gamingRevenue} food={foodRevenue} onNew={() => navTo("new-session")} onOpen={setSelectedSessionId} onSettle={settleSession} onEnd={removeSession} onExtend={startExtend} />;
    if (page === "sessions") return <SessionsPage data={data} now={now} active={activeSessions} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onOpen={setSelectedSessionId} onSettle={settleSession} onEnd={removeSession} onExtend={startExtend} onNew={() => navTo("new-session")} />;
    if (page === "new-session") return <NewSessionPage data={data} onRefresh={refresh} onCreated={(id) => { toast.success("Session started"); void refresh(); setSelectedSessionId(id); }} onManage={() => navTo("products")} />;
    if (page === "billing") return <BillingPage data={data} onRefresh={refresh} />;
    if (page === "products") return <ProductsPage data={data} onRefresh={refresh} />;
    if (page === "expenses") return <ExpensesPage data={data} onRefresh={refresh} />;
    if (page === "reports") return <ReportsPage data={data} />;
    return <SettingsPage data={data} onRefresh={refresh} />;
  };

  return <AppErrorBoundary><div className="relative min-h-screen overflow-x-hidden text-foreground">
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden><div className="absolute -left-32 top-24 size-96 rounded-full bg-amber-200/20 blur-[100px]" /><div className="absolute -right-24 top-1/3 size-80 rounded-full bg-rose-200/20 blur-[90px]" /><div className="absolute bottom-0 left-1/2 size-96 rounded-full bg-orange-100/35 blur-[110px]" /></div>
    <aside className={`fixed inset-y-4 left-4 z-30 hidden flex-col rounded-[26px] p-3 transition-all duration-200 lg:flex ${collapsed ? "w-[82px]" : "w-[260px]"} glass-strong`}>
      <div className={`flex items-center gap-3 px-2 py-3 ${collapsed ? "justify-center" : ""}`}><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/25 text-primary"><Gamepad2 className="size-6" /></div>{!collapsed && <div className="min-w-0"><p className="truncate text-[12px] font-extrabold tracking-[.08em]">PLAYERS &amp; SNOOKERS</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">LOUNGE MANAGER // 2.0</p></div>}</div>
      <div className="mt-5 space-y-1">{NAV.map((item) => <Link key={item.id} to={ROUTE[item.id] as "/"} title={collapsed ? item.label : undefined} onClick={() => setShowMobileNav(false)} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${page === item.id ? "bg-primary/20 font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}><item.icon className="size-[18px] shrink-0" />{!collapsed && <><span className="flex-1 truncate">{item.label}</span>{item.shortcut && <span className="font-mono text-[9px] text-muted-foreground">⌃{item.shortcut}</span>}</>}</Link>)}</div>
      <div className="mt-auto">{!collapsed && <div className="mb-3 rounded-xl border border-border/70 bg-white/30 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><span className="size-2 rounded-full bg-emerald-500" />OFFLINE READY</div><p className="mt-1 font-mono text-[9px] text-muted-foreground">LOCAL DATA · AUTOSAVED</p></div>}<Button variant="ghost" onClick={() => setCollapsed(!collapsed)} className="w-full justify-start rounded-xl text-muted-foreground">{collapsed ? <ChevronRight className="size-4" /> : <><ChevronLeft className="size-4" />Collapse menu</>}</Button></div>
    </aside>
    {showMobileNav && <div className="fixed inset-0 z-40 bg-foreground/15 lg:hidden" onClick={() => setShowMobileNav(false)}><aside className="glass-strong h-full w-[min(290px,84vw)] p-4" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><span className="font-semibold">PLAYERS &amp; SNOOKERS</span><IconButton label="Close navigation" onClick={() => setShowMobileNav(false)}><X /></IconButton></div>{NAV.map((item) => <Link key={item.id} to={ROUTE[item.id] as "/"} onClick={() => setShowMobileNav(false)} className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm hover:bg-secondary"><item.icon className="size-4" />{item.label}</Link>)}</aside></div>}
    <main className={`min-h-screen px-4 pb-24 pt-4 transition-[margin] duration-200 sm:px-6 lg:ml-[${collapsed ? "106px" : "284px"}] lg:pb-8 lg:pr-8`} style={{ marginLeft: undefined }}>
      <div className="mx-auto max-w-[1600px]">
        <header className="glass mb-6 flex min-h-[66px] items-center justify-between gap-3 rounded-2xl px-3 py-2 sm:px-5"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="rounded-full lg:hidden" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><MoreHorizontal /></Button><div className="hidden sm:block"><p className="font-mono text-[10px] uppercase text-muted-foreground">{longDate(now)}</p><p className="mt-0.5 font-semibold">Good {clock.getHours() < 12 ? "morning" : clock.getHours() < 17 ? "afternoon" : "evening"}</p></div><div className="sm:hidden"><p className="font-semibold">{NAV.find((item) => item.id === page)?.label}</p><p className="font-mono text-[10px] text-muted-foreground">{clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p></div></div><div className="flex items-center gap-2"><Button variant="outline" onClick={() => setCommandOpen(true)} className="h-10 rounded-full px-3 text-muted-foreground"><Search className="size-4" /><span className="hidden sm:inline">Search / command</span><kbd className="hidden rounded-md border px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘ K</kbd></Button><span className="hidden rounded-full bg-emerald-100 px-3 py-2 font-mono text-[10px] font-bold text-emerald-800 md:inline-flex"><Activity className="mr-1.5 size-3" />LIVE</span><Button onClick={() => navTo("new-session")} className="gold-button h-10 rounded-full px-4"><Plus className="size-4" /><span className="hidden sm:inline">New session</span></Button></div></header>
        <AppErrorBoundary>{pageContent()}</AppErrorBoundary>
        <footer className="mt-8 flex items-center justify-between border-t border-border/50 py-4 font-mono text-[9px] uppercase text-muted-foreground"><span>Players &amp; Snookers · Local preview</span><button type="button" onClick={() => setHelpOpen(true)} className="inline-flex items-center gap-1"><span className="grid size-4 place-items-center rounded border">?</span>Shortcuts</button></footer>
      </div>
    </main>
    <Button onClick={() => navTo("new-session")} aria-label="Start a new session" title="Start a new session" className="gold-button fixed bottom-5 right-5 z-20 size-14 rounded-full p-0 shadow-lg lg:hidden"><Plus className="size-6" /></Button>
    <SessionDetail session={selectedSession} data={data} now={now} onClose={() => setSelectedSessionId(null)} onRefresh={refresh} onDelete={removeSession} onExtend={() => selectedSession && startExtend(selectedSession)} onSettle={() => selectedSession && settleSession(selectedSession)} />
    <ExtendDialog session={extendSession} onClose={() => setExtendSession(null)} onRefresh={refresh} />
    <CommandDialog open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navTo} sessions={activeSessions} onOpenSession={(id) => { setCommandOpen(false); setSelectedSessionId(id); }} />
    <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    <ConfirmDialog value={confirmState} onClose={() => setConfirmState(null)} />
  </div></AppErrorBoundary>;
}

function DashboardPage({ data, now, active, pending, revenue, expenses, gaming, food, onNew, onOpen, onSettle, onEnd, onExtend }: { data: Snapshot; now: number; active: Session[]; pending: number; revenue: number; expenses: number; gaming: number; food: number; onNew: () => void; onOpen: (id: string) => void; onSettle: (session: Session) => void; onEnd: (session: Session) => void; onExtend: (session: Session) => void }) {
  const margin = revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0;
  const bars = [{ label: "Gaming sessions", amount: gaming, color: "bg-primary" }, { label: "Food & refreshments", amount: food, color: "bg-emerald-500" }, { label: "Operating expenses", amount: expenses, color: "bg-rose-400" }];
  const max = Math.max(1, ...bars.map((item) => item.amount));
  return <><SectionTitle eyebrow="TODAY AT THE LOUNGE" title="Dashboard" subtitle="Your arena, orders, and numbers at a glance." actions={<div className="hidden items-center gap-2 font-mono text-sm text-muted-foreground sm:flex"><Clock3 className="size-4" />{new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={CircleDollarSign} label="Total revenue today" value={currency(revenue)} hint={`${currency(gaming)} gaming · ${currency(food)} food`} accent="gold" />
      <Kpi icon={TrendingUp} label="Net profit" value={currency(revenue - expenses)} hint={`${margin}% margin · ${currency(expenses)} expenses`} accent="green" />
      <Kpi icon={Gamepad2} label="Active arenas" value={`${active.length}`} hint={`${data.sessions.filter((s) => s.start_time >= new Date(now).setHours(0, 0, 0, 0)).length} sessions today`} accent="rose" />
      <Kpi icon={Bell} label="Pending bills" value={`${pending}`} hint="Sessions ready to settle" accent="amber" />
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
      <Panel><div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase text-muted-foreground">REVENUE MATRIX</p><h2 className="mt-1 text-lg font-semibold">Today's breakdown</h2></div><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><BarChart3 className="size-5" /></span></div><div className="space-y-5">{bars.map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span>{item.label}</span><span className="font-mono font-semibold">{currency(item.amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(item.amount ? 4 : 0, item.amount / max * 100)}%` }} /></div></div>)}</div></Panel>
      <Panel><div className="mb-4"><p className="font-mono text-[10px] uppercase text-muted-foreground">QUICK COMMAND CENTER</p><h2 className="mt-1 text-lg font-semibold">Make it happen</h2></div><div className="grid gap-2">{[{ title: "Start new session", icon: Plus, run: onNew }, { title: "New refreshment order", icon: ShoppingBag, run: () => document.dispatchEvent(new CustomEvent("manager-open-billing")) }, { title: "Record café expense", icon: Wallet, run: () => document.dispatchEvent(new CustomEvent("manager-open-expense")) }].map((item) => <Button key={item.title} variant="outline" onClick={item.run} className="h-12 justify-start rounded-xl border-border/70 bg-white/30"><item.icon className="size-4 text-primary" />{item.title}<ArrowRight className="ml-auto size-4 text-muted-foreground" /></Button>)}</div></Panel>
    </div>
    <Panel className="mt-5"><div className="mb-2 flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase text-muted-foreground">ACTIVE SESSIONS // LIVE ARENA QUEUE</p><h2 className="mt-1 text-lg font-semibold">On the floor <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-xs text-emerald-800">{active.length}</span></h2></div><Link to="/sessions" className="flex items-center gap-1 text-sm font-medium text-primary">All sessions <ArrowRight className="size-4" /></Link></div>{active.length ? active.map((session) => <SessionLine key={session.id} session={session} service={data.services.find((item) => item.id === session.service_id)} data={data} now={now} onOpen={() => onOpen(session.id)} onSettle={() => onSettle(session)} onEnd={() => onEnd(session)} onExtend={() => onExtend(session)} />) : <EmptyState icon={Gamepad2} title="Your arena is ready" detail="No active sessions right now. Start one when your next customer arrives." action={<Button onClick={onNew} className="gold-button rounded-full"><Plus className="size-4" />Start session</Button>} />}</Panel>
  </>;
}

function Kpi({ icon: Icon, label, value, hint, accent }: { icon: typeof Activity; label: string; value: string; hint: string; accent: string }) {
  const tone = accent === "green" ? "text-emerald-700 bg-emerald-100" : accent === "rose" ? "text-rose-700 bg-rose-100" : accent === "amber" ? "text-amber-800 bg-amber-100" : "text-primary bg-primary/15";
  return <div className="glass rounded-2xl p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon className="size-4" /></span></div><p className="mt-4 font-mono text-2xl font-semibold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{hint}</p></div>;
}

function SessionsPage({ data, now, active, query, setQuery, filter, setFilter, onOpen, onSettle, onEnd, onExtend, onNew }: { data: Snapshot; now: number; active: Session[]; query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void; onOpen: (id: string) => void; onSettle: (session: Session) => void; onEnd: (session: Session) => void; onExtend: (session: Session) => void; onNew: () => void }) {
  const services = data.services.filter((service) => active.some((session) => session.service_id === service.id));
  const filtered = active.filter((session) => { const service = data.services.find((item) => item.id === session.service_id); const matches = `${session.customer_name} ${session.phone} ${service?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()); return matches && (filter === "ALL" || service?.name === filter); });
  return <><SectionTitle eyebrow="LIVE FLOOR CONTROL" title="Gaming Sessions" subtitle="Search your active players and manage every station." actions={<Button onClick={onNew} className="gold-button rounded-full"><Plus className="size-4" />New session</Button>} />
    <Panel><div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player, phone, station…" className="rounded-full bg-white/40 pl-9" /></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ListFilter className="size-4" />Filter</span>{["ALL", ...services.map((service) => service.name)].map((name) => <Button key={name} variant={filter === name ? "secondary" : "ghost"} onClick={() => setFilter(name)} className={`h-9 rounded-full px-3 text-xs ${filter === name ? "bg-primary/20 text-foreground" : ""}`}>{name}</Button>)}</div>
      <div className="mt-4">{filtered.length ? filtered.map((session) => <SessionLine key={session.id} session={session} service={data.services.find((item) => item.id === session.service_id)} data={data} now={now} onOpen={() => onOpen(session.id)} onSettle={() => onSettle(session)} onEnd={() => onEnd(session)} onExtend={() => onExtend(session)} />) : <EmptyState icon={Search} title={query || filter !== "ALL" ? "No sessions match" : "No active players"} detail={query || filter !== "ALL" ? "Try another search or category." : "New sessions will appear here as soon as the arena gets busy."} action={!(query || filter !== "ALL") && <Button onClick={onNew} className="gold-button rounded-full"><Plus className="size-4" />Start first session</Button>} />}</div>
    </Panel>
  </>;
}

function NewSessionPage({ data, onRefresh, onCreated, onManage }: { data: Snapshot; onRefresh: () => Promise<void>; onCreated: (id: string) => void; onManage: () => void }) {
  const [serviceId, setServiceId] = useState(""); const [tariffId, setTariffId] = useState(""); const [duration, setDuration] = useState(60); const [price, setPrice] = useState(150); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [controllers, setControllers] = useState(2); const [saving, setSaving] = useState(false);
  const service = data.services.find((item) => item.id === serviceId); const tariffs = data.tariffs.filter((item) => item.service_id === serviceId);
  const visibleDuration = tariffId === "custom" ? duration : data.tariffs.find((item) => item.id === tariffId)?.duration_minutes ?? duration;
  const visiblePrice = tariffId === "custom" ? price : data.tariffs.find((item) => item.id === tariffId)?.price ?? price;
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!service) return; setSaving(true); try { const id = await db.newId(); const activeToday = data.sessions.filter((session) => session.start_time >= new Date().setHours(0, 0, 0, 0)).length; await db.createSession({ id, customer_name: name.trim() || `Cust ${activeToday + 1}`, phone: phone.trim(), service_id: service.id, start_time: Date.now(), expected_end_time: Date.now() + visibleDuration * 60_000, status: "active", base_charge: visiblePrice, controllers: service.name.toLowerCase() === "ps5" ? controllers : 2 }); await onRefresh(); onCreated(id); setName(""); setPhone(""); } finally { setSaving(false); } };
  return <><SectionTitle eyebrow="WELCOME TO THE ARENA" title="Start a new session" subtitle="Choose a station, package, and player to begin." actions={<Button variant="outline" onClick={onManage} className="rounded-full"><Settings2 className="size-4" />Manage stations</Button>} />
    <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]"><div className="space-y-5"><Panel><div className="mb-4 flex items-center justify-between"><div><p className="font-mono text-[10px] text-muted-foreground">01 / SELECT ARENA</p><h2 className="mt-1 text-lg font-semibold">Pick your station</h2></div><span className="rounded-full bg-secondary px-3 py-1 font-mono text-[10px]">{data.services.length} AVAILABLE</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.services.map((item) => <button type="button" key={item.id} onClick={() => { setServiceId(item.id); setTariffId(""); const first = data.tariffs.find((tariff) => tariff.service_id === item.id); if (first) { setDuration(first.duration_minutes); setPrice(first.price); } }} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${serviceId === item.id ? "border-primary bg-primary/10 shadow-sm" : "border-border/70 bg-white/25"}`}><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><StationIcon type={typeFor(item)} /></span><span className="mt-3 block font-semibold">{item.name || "Station"}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{item.type || "station"}</span></button>)}{data.services.length === 0 && <EmptyState title="Add your first station" detail="Set up a station and hourly rate before you start." action={<Button type="button" onClick={onManage} className="gold-button rounded-full">Manage stations</Button>} />}</div></Panel>
      <Panel><div className="mb-4"><p className="font-mono text-[10px] text-muted-foreground">02 / CHOOSE PACKAGE</p><h2 className="mt-1 text-lg font-semibold">Duration &amp; price</h2></div>{service ? tariffs.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tariffs.map((tariff) => <button key={tariff.id} type="button" onClick={() => { setTariffId(tariff.id); setDuration(tariff.duration_minutes); setPrice(tariff.price); }} className={`rounded-xl border p-4 text-left ${tariffId === tariff.id || (!tariffId && tariff === tariffs[0]) ? "border-primary bg-primary/10" : "border-border/70 bg-white/25"}`}><span className="block text-sm text-muted-foreground">{tariff.duration_minutes} minutes</span><span className="mt-1 block font-mono text-xl font-semibold">{currency(tariff.price)}</span></button>)}</div> : <EmptyState icon={Clock3} title="No packages yet" detail="Add a tariff for this station to make it selectable." action={<Button type="button" variant="outline" onClick={onManage} className="rounded-full">Add a tariff</Button>} /> : <p className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">Choose a station first to see its packages.</p>}{service?.name.toLowerCase() === "ps5" && <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-white/25 p-3"><div><p className="text-sm font-medium">Controllers</p><p className="text-xs text-muted-foreground">Select the PS5 overtime rate</p></div><div className="flex rounded-full bg-secondary p-1"><Button type="button" variant={controllers === 2 ? "secondary" : "ghost"} onClick={() => setControllers(2)} className="h-8 rounded-full px-3 text-xs">1–2</Button><Button type="button" variant={controllers === 4 ? "secondary" : "ghost"} onClick={() => setControllers(4)} className="h-8 rounded-full px-3 text-xs">3–4</Button></div></div>}</Panel></div>
      <Panel className="h-fit"><p className="font-mono text-[10px] text-muted-foreground">03 / PLAYER DETAILS</p><h2 className="mt-1 text-lg font-semibold">Player &amp; checkout</h2><div className="mt-5 space-y-4"><label className="block text-sm">Player name<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name (optional)" className="mt-1.5 rounded-xl bg-white/40" /></label><label className="block text-sm">WhatsApp / phone<Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" inputMode="tel" className="mt-1.5 rounded-xl bg-white/40" /></label><div className="rounded-xl bg-secondary/70 p-4"><div className="flex justify-between text-sm"><span>{service?.name || "Choose a station"}</span><span className="font-mono">{service ? `${visibleDuration} min` : "—"}</span></div><div className="mt-3 flex justify-between border-t border-border/60 pt-3"><span className="text-sm text-muted-foreground">Package price</span><span className="font-mono font-semibold">{currency(visiblePrice)}</span></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Estimated end</span><span>{service ? clockTime(Date.now() + visibleDuration * 60_000) : "—"}</span></div></div><Button disabled={!service || tariffs.length === 0 || saving} type="submit" className="gold-button h-12 w-full rounded-full"><Zap className="size-4" />{saving ? "Starting…" : "Start session"}</Button><p className="text-center text-[10px] text-muted-foreground">The 10-minute overtime grace is included.</p></div></Panel></form>
  </>;
}

function StationIcon({ type }: { type: string }) { return type.includes("table") || type.includes("snooker") ? <Table2 className="size-5" /> : type.includes("pc") ? <Monitor className="size-5" /> : <Gamepad2 className="size-5" />; }