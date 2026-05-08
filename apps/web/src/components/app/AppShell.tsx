"use client";

import type {
  ContactDto,
  EmailThreadDto,
  EventDto,
  ReportExportJobDto,
  ReportId,
} from "@cairnly/core";
import {
  ArrowRight,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreateSheet } from "@/components/app/CreateSheet";
import {
  DetailPane as ShellDetailPane,
  ListPane as ShellListPane,
} from "@/components/app/ShellViews";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { AppActions, AppData } from "@/lib/app-data";
import type { ContactCreateAction, ContactUpdateAction } from "@/lib/contact-mutations";
import type { DashboardSummary } from "@/lib/dashboard-summary";
import {
  type ActiveView,
  defaultNavItem,
  getCreateLabel,
  getViewFromPath,
  getViewHref,
  type NavItem,
  navItems,
  settingsNavItem,
} from "@/lib/navigation";

const shortcutMap: Record<string, ActiveView> = {
  h: "home",
  c: "contacts",
  d: "deals",
  t: "tasks",
  m: "calendar",
  a: "automations",
  r: "reports",
  i: "inbox",
  s: "settings",
};

type ShellData = {
  contacts?: ContactDto[];
  contactTimeline?: {
    events: EventDto[];
    emailThreads: EmailThreadDto[];
  };
};

type ReportExportBundle = {
  jobs: ReportExportJobDto[];
  onExport: (
    reportId: ReportId,
  ) => Promise<
    | { ok: true; csv: string; filename: string; jobId: string }
    | { ok: false; message: string }
  >;
};

export function AppShell({
  actions,
  appData,
  contactCreateAction,
  contactUpdateAction,
  dashboard,
  data,
  reportExport,
}: {
  actions?: AppActions;
  appData?: AppData;
  contactCreateAction?: ContactCreateAction;
  contactUpdateAction?: ContactUpdateAction;
  dashboard?: DashboardSummary;
  data?: ShellData;
  reportExport?: ReportExportBundle;
}) {
  return (
    <ThemeProvider>
      <ShellContent
        actions={actions}
        appData={appData}
        contactCreateAction={contactCreateAction}
        contactUpdateAction={contactUpdateAction}
        dashboard={dashboard}
        data={data}
        reportExport={reportExport}
      />
    </ThemeProvider>
  );
}

function ShellContent({
  actions,
  appData,
  contactCreateAction,
  contactUpdateAction,
  dashboard,
  data,
  reportExport,
}: {
  actions?: AppActions;
  appData?: AppData;
  contactCreateAction?: ContactCreateAction;
  contactUpdateAction?: ContactUpdateAction;
  dashboard?: DashboardSummary;
  data?: ShellData;
  reportExport?: ReportExportBundle;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [waitingForGoTo, setWaitingForGoTo] = useState(false);

  const activeView = useMemo(() => getViewFromPath(pathname), [pathname]);
  const activeItem = useMemo(
    () =>
      activeView === "settings"
        ? settingsNavItem
        : (navItems.find((item) => item.id === activeView) ?? defaultNavItem),
    [activeView],
  );

  const navigateTo = useCallback(
    (view: ActiveView) => {
      router.push(getViewHref(view));
    },
    [router],
  );

  useEffect(() => {
    setDetailSheetOpen(false);
  }, [activeView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (waitingForGoTo && !isTyping) {
        const nextView = shortcutMap[event.key.toLowerCase()];
        if (nextView) {
          event.preventDefault();
          navigateTo(nextView);
          setWaitingForGoTo(false);
        }
        return;
      }

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (event.key.toLowerCase() === "g" && !isTyping) {
        setWaitingForGoTo(true);
        window.setTimeout(() => setWaitingForGoTo(false), 1200);
        return;
      }

      if (event.key.toLowerCase() === "c" && !isTyping) {
        event.preventDefault();
        setCreateOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigateTo, waitingForGoTo]);

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside
          className={`hidden shrink-0 border-r border-border bg-surface/80 transition-[width] duration-200 ease-out lg:flex lg:flex-col ${
            navCollapsed ? "w-16" : "w-64"
          }`}
        >
          <div
            className={`flex h-16 items-center border-b border-border ${
              navCollapsed ? "justify-center px-2" : "justify-between px-4"
            }`}
          >
            {navCollapsed ? null : <BrandMark />}
            <button
              type="button"
              onClick={() => setNavCollapsed((collapsed) => !collapsed)}
              className="rounded-input p-2 text-muted transition duration-150 ease-out hover:bg-surface-hover hover:text-text"
              aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
              title={navCollapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {navCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeView === item.id}
                collapsed={navCollapsed}
              />
            ))}
          </nav>

          <div
            className={`border-t border-border ${
              navCollapsed ? "flex justify-center p-2" : "p-3"
            }`}
          >
            <Link
              href="/settings"
              className={`flex items-center rounded-card text-left transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover ${
                navCollapsed
                  ? "h-10 w-10 justify-center text-accent"
                  : "w-full gap-3 border border-border bg-bg p-3"
              }`}
              aria-label="AI settings"
              title={navCollapsed ? "AI settings" : undefined}
            >
              <span
                className={`flex items-center justify-center rounded-card ${
                  navCollapsed
                    ? "h-8 w-8 bg-surface-hover"
                    : "h-8 w-8 bg-accent text-accent-fg"
                }`}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              {!navCollapsed ? (
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-text">
                    AI settings
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    Local model, API key, or disabled.
                  </span>
                </span>
              ) : null}
            </Link>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <TopBar
            activeItem={activeItem}
            activeView={activeView}
            onCommandOpen={() => setCommandOpen(true)}
            onCreate={() => setCreateOpen(true)}
          />

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
            <ShellListPane
              activeItem={activeItem}
              activeView={activeView}
              appData={appData}
              dashboard={dashboard}
              data={data}
              onPreviewOpen={() => setDetailSheetOpen(true)}
            />
            <div className="hidden xl:block">
              <ShellDetailPane
                activeItem={activeItem}
                activeView={activeView}
                actions={actions}
                appData={appData}
                contactUpdateAction={contactUpdateAction}
                dashboard={dashboard}
                data={data}
                reportExport={reportExport}
              />
            </div>
          </div>
        </section>
      </div>

      <MobileNav activeView={activeView} />

      <AnimatePresence>
        {commandOpen ? (
          <CommandPalette
            activeView={activeView}
            onClose={() => setCommandOpen(false)}
            onCreate={() => {
              setCommandOpen(false);
              setCreateOpen(true);
            }}
            onSelect={(view) => {
              navigateTo(view);
              setCommandOpen(false);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen ? (
          <CreateSheet
            actions={actions}
            activeView={activeView}
            contactCreateAction={contactCreateAction}
            onClose={() => setCreateOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailSheetOpen ? (
          <ResponsiveDetailSheet
            activeItem={activeItem}
            activeView={activeView}
            actions={actions}
            appData={appData}
            contactUpdateAction={contactUpdateAction}
            dashboard={dashboard}
            data={data}
            reportExport={reportExport}
            onClose={() => setDetailSheetOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function TopBar({
  activeItem,
  activeView,
  onCommandOpen,
  onCreate,
}: {
  activeItem: NavItem;
  activeView: ActiveView;
  onCommandOpen: () => void;
  onCreate: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="text-[12px] text-muted">Workspace</p>
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-text">
            {activeItem.label}
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onCommandOpen}
        className="hidden h-9 min-w-[260px] items-center gap-2 rounded-input border border-border bg-surface px-3 text-left text-[13px] text-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover md:flex"
      >
        <Search className="h-4 w-4" aria-hidden />
        Search workspace…
        <span className="ml-auto rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px] text-subtle">
          Cmd K
        </span>
      </button>

      <ThemeToggle />

      <Link
        href="/settings"
        className="hidden h-9 w-9 items-center justify-center rounded-input border border-border bg-bg text-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover hover:text-text sm:inline-flex"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" aria-hidden />
      </Link>

      <button
        type="button"
        className="hidden h-9 w-9 items-center justify-center rounded-input border border-border bg-bg text-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover hover:text-text sm:inline-flex"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-9 items-center gap-2 rounded-input bg-accent px-3 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover"
      >
        <Plus className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{getCreateLabel(activeView)}</span>
      </button>
    </header>
  );
}

function NavButton({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group flex w-full items-center rounded-card py-2 text-left text-[13px] transition duration-150 ease-out ${
        active
          ? "bg-bg text-text ring-1 ring-border"
          : "text-muted hover:bg-surface-hover hover:text-text"
      } ${collapsed ? "justify-center px-0" : "gap-3 px-3"}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active ? "text-accent" : "text-subtle group-hover:text-muted"
        }`}
        aria-hidden
      />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <span className="font-mono text-[11px] text-subtle">{item.shortcut}</span>
        </>
      ) : null}
    </Link>
  );
}

function MobileNav({ activeView }: { activeView: ActiveView }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-2 pb-2 pt-2 backdrop-blur lg:hidden"
      aria-label="Mobile primary"
    >
      <div className="grid grid-cols-5 gap-1">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-card px-2 py-2 text-[11px] transition duration-150 ease-out ${
                active
                  ? "bg-surface text-text"
                  : "text-muted hover:bg-surface hover:text-text"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={active ? "h-4 w-4 text-accent" : "h-4 w-4"} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ResponsiveDetailSheet({
  actions,
  activeItem,
  activeView,
  appData,
  contactUpdateAction,
  dashboard,
  data,
  reportExport,
  onClose,
}: {
  actions?: AppActions;
  activeItem: NavItem;
  activeView: ActiveView;
  appData?: AppData;
  contactUpdateAction?: ContactUpdateAction;
  dashboard?: DashboardSummary;
  data?: ShellData;
  reportExport?: ReportExportBundle;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex justify-end bg-text/20 backdrop-blur-sm xl:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      role="presentation"
      onMouseDown={onClose}
    >
      <motion.aside
        className="flex h-full w-full max-w-[760px] flex-col border-l border-border bg-bg shadow-elevated"
        initial={{ x: 28, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 28, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label={`${activeItem.label} detail`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border px-4">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-text">
              {activeItem.label} detail
            </p>
            <p className="text-[12px] text-muted">Detail drawer</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-input p-2 text-muted transition duration-150 ease-out hover:bg-surface hover:text-text"
            aria-label="Close detail sheet"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ShellDetailPane
            activeItem={activeItem}
            activeView={activeView}
            actions={actions}
            appData={appData}
            contactUpdateAction={contactUpdateAction}
            dashboard={dashboard}
            data={data}
            reportExport={reportExport}
          />
        </div>
      </motion.aside>
    </motion.div>
  );
}

function CommandPalette({
  activeView,
  onClose,
  onCreate,
  onSelect,
}: {
  activeView: ActiveView;
  onClose: () => void;
  onCreate: () => void;
  onSelect: (view: ActiveView) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center bg-text/20 px-4 pt-20 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      role="presentation"
      onMouseDown={onClose}
    >
      <motion.div
        className="w-full max-w-2xl overflow-hidden rounded-modal border border-border bg-bg shadow-elevated"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-subtle" aria-hidden />
          <input
            ref={inputRef}
            placeholder="Go to a view…"
            className="h-9 min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-subtle"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-input p-2 text-muted transition duration-150 ease-out hover:bg-surface hover:text-text"
            aria-label="Close command palette"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="p-2">
          {[...navItems, settingsNavItem].map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="flex w-full items-center gap-3 rounded-card px-3 py-3 text-left transition duration-150 ease-out hover:bg-surface"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-card border ${
                    active
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-text">
                    {item.label}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {item.description}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-subtle">
                  {item.shortcut}
                </span>
                <ArrowRight className="h-4 w-4 text-subtle" aria-hidden />
              </button>
            );
          })}

          <div className="mt-2 border-t border-border p-3">
            <button
              type="button"
              onClick={onCreate}
              className="flex w-full items-center gap-3 rounded-card bg-surface px-3 py-3 text-left transition duration-150 ease-out hover:bg-surface-hover"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-card bg-accent text-accent-fg">
                <Plus className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-text">Create…</span>
                <span className="block text-[12px] text-muted">
                  Opens the create panel for the current screen (C).
                </span>
              </span>
              <Settings className="h-4 w-4 text-subtle" aria-hidden />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
