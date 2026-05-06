import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  ContactRound,
  Home,
  Inbox,
  ListTodo,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: "home" | "contacts" | "deals" | "tasks" | "calendar" | "inbox";
  label: string;
  href: "/" | "/contacts" | "/deals" | "/tasks" | "/calendar" | "/timeline";
  shortcut: string;
  description: string;
  icon: LucideIcon;
};

export type ActiveView = NavItem["id"];

export const defaultNavItem: NavItem = {
  id: "home",
  label: "Dashboard",
  href: "/",
  shortcut: "G H",
  description: "A calm view of pipeline value, work due, and recent activity.",
  icon: Home,
};

export const navItems: NavItem[] = [
  defaultNavItem,
  {
    id: "contacts",
    label: "Contacts",
    href: "/contacts",
    shortcut: "G C",
    description: "The relationship timeline, search, notes, and custom fields.",
    icon: ContactRound,
  },
  {
    id: "deals",
    label: "Deals",
    href: "/deals",
    shortcut: "G D",
    description: "Pipeline stages, forecast, and deal movement.",
    icon: CircleDollarSign,
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    shortcut: "G T",
    description: "My Day, overdue follow-ups, and relationship-linked work.",
    icon: ListTodo,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    shortcut: "G M",
    description: "Meetings, scheduling links, and availability.",
    icon: CalendarDays,
  },
  {
    id: "inbox",
    label: "Timeline",
    href: "/timeline",
    shortcut: "G I",
    description: "The unified event stream that backs every contact record.",
    icon: Inbox,
  },
];

export const activityTypes = [
  { label: "Email received", tone: "neutral" },
  { label: "Note added", tone: "accent" },
  { label: "Stage changed", tone: "success" },
] as const;

export const topLevelMetrics = [
  {
    label: "Pipeline forecast",
    value: "$48.2k",
    detail: "Next 30 days",
  },
  {
    label: "New contacts",
    value: "18",
    detail: "This week",
  },
  {
    label: "Due today",
    value: "6",
    detail: "Tasks",
  },
  {
    label: "Local AI",
    value: "Off",
    detail: "Workspace default",
  },
] as const;

export const relationshipPath = [
  "Form submission",
  "Discovery call",
  "Proposal sent",
  "Follow-up due",
] as const;

export const recentEvents = [
  {
    title: "Mira Patel replied about the migration plan",
    meta: "4 minutes ago - email_received",
  },
  {
    title: "Northstar Design moved to Proposal",
    meta: "18 minutes ago - stage_changed",
  },
  {
    title: "Added call notes for Atlas Studio",
    meta: "42 minutes ago - note_added",
  },
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
    inbox: "Log event",
  };

  return labels[view];
}

export function getViewHref(view: ActiveView): NavItem["href"] {
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
    timeline: "inbox",
  };

  return routeMap[firstSegment] ?? "home";
}
