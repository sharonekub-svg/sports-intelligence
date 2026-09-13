import type { LucideIcon } from "lucide-react";
import { Flame, User } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/opportunities", label: "לוח משחקים", icon: Flame },
  { href: "/account", label: "פרופיל", icon: User },
];
