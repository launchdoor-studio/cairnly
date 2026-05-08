import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ContactRound,
  GitBranch,
  Home,
  Inbox,
  ListTodo,
  type LucideIcon,
  Settings,
} from "lucide-react";

export type NavItem = {
  id: ActiveView;
  label: string;
  href:
    | "/"
    | "/contacts"
    | "/deals"
    | "/tasks"
    | "/calendar"
    | "/automations"
    | "/reports"
    | "/timeline"
    | "/settings";
  shortcut: string;
  description: string;
  icon: LucideIcon;
};

export type ActiveView =
  | "home"
  | "contacts"
  | "deals"
  | "tasks"
  | "calendar"
  | "automations"
  | "reports"
  | "inbox"
  | "settings";

export const defaultNavItem: NavItem = {
  id: "home",
  label: "Dashboard",
  href: "/",
  shortcut: "G H",
  description: "Summary metrics, activity, and pipeline snapshot.",
  icon: Home,
};

export const navItems: NavItem[] = [
  defaultNavItem,
  {
    id: "contacts",
    label: "Contacts",
    href: "/contacts",
    shortcut: "G C",
    description: "Records, timeline, notes, and fields.",
    icon: ContactRound,
  },
  {
    id: "deals",
    label: "Deals",
    href: "/deals",
    shortcut: "G D",
    description: "Kanban by stage, amounts, and status.",
    icon: CircleDollarSign,
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    shortcut: "G T",
    description: "Open and completed tasks; optional links to contacts or deals.",
    icon: ListTodo,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    shortcut: "G M",
    description: "Availability and scheduling links.",
    icon: CalendarDays,
  },
  {
    id: "automations",
    label: "Automations",
    href: "/automations",
    shortcut: "G A",
    description: "Hooks defined in code; reload after changes.",
    icon: GitBranch,
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    shortcut: "G R",
    description: "Fixed report list; download CSV per report.",
    icon: BarChart3,
  },
  {
    id: "inbox",
    label: "Timeline",
    href: "/timeline",
    shortcut: "G I",
    description: "Workspace-wide event log.",
    icon: Inbox,
  },
];

export const settingsNavItem: NavItem = {
  id: "settings",
  label: "Settings",
  href: "/settings",
  shortcut: "G S",
  description: "Workspace, integrations, AI, and security.",
  icon: Settings,
};

export const relationshipPath = [
  "Form submission",
  "Discovery call",
  "Proposal sent",
  "Follow-up due",
] as const;

export const pipelineStages = [
  { label: "Lead", value: "$12.4k", count: 7 },
  { label: "Qualified", value: "$18.8k", count: 5 },
  { label: "Proposal", value: "$31.1k", count: 4 },
  { label: "Won", value: "$9.6k", count: 2 },
] as const;

export const trailMarkers: [LucideIcon, LucideIcon, LucideIcon] = [
  Activity,
  ContactRound,
  CalendarDays,
];

export function getTrailMarker(index: number): LucideIcon {
  return trailMarkers[index % trailMarkers.length] ?? Activity;
}

export function getCreateLabel(view: ActiveView) {
  const labels: Record<ActiveView, string> = {
    home: "Create",
    contacts: "New contact",
    deals: "New deal",
    tasks: "New task",
    calendar: "New link",
    automations: "Reload",
    reports: "Export",
    inbox: "Log event",
    settings: "Configure",
  };

  return labels[view];
}

export function getViewHref(view: ActiveView): NavItem["href"] {
  if (view === "settings") {
    return settingsNavItem.href;
  }

  return (navItems.find((item) => item.id === view) ?? defaultNavItem).href;
}

export function getViewFromPath(pathname: string): ActiveView {
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  if (!firstSegment) {
    return "home";
  }

  const routeMap: Record<string, ActiveView> = {
    contacts: "contacts",
    deals: "deals",
    tasks: "tasks",
    calendar: "calendar",
    automations: "automations",
    reports: "reports",
    timeline: "inbox",
    settings: "settings",
  };

  return routeMap[firstSegment] ?? "home";
}
