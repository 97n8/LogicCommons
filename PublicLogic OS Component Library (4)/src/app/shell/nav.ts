import {
  Blocks,
  Building2,
  Gauge,
  Inbox,
  Settings,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/lists", label: "Inbox", icon: Inbox },
  { to: "/tools", label: "Tools", icon: Wrench },
  { to: "/builder", label: "Builder", icon: Blocks },
  { to: "/environments", label: "Environments", icon: Building2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

