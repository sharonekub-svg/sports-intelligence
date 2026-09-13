import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  EyeOff,
  TriangleAlert,
  Activity,
  Bookmark,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/scanner", label: "Scanner", icon: Radar, proOnly: true },
  { href: "/hidden-opportunities", label: "הזדמנויות נסתרות", icon: EyeOff, proOnly: true },
  { href: "/market-blind-spots", label: "נקודות עיוורות בשוק", icon: TriangleAlert, proOnly: true },
  { href: "/model-performance", label: "ביצועי המודל", icon: Activity },
  { href: "/saved-matches", label: "משחקים שמורים", icon: Bookmark },
];
