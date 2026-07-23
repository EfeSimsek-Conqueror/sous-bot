import type { IconName } from "../components/Icon";

// Tab order per DESIGN.md §7: Home → Planner → Library → List → Profile.
// This is both the bottom-tab-bar/sidebar order AND the swipe order.
export interface TabConfig {
  path: "/" | "/planner" | "/library" | "/list" | "/profile";
  label: string;
  icon: IconName;
}

export const TABS: TabConfig[] = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/planner", label: "Planner", icon: "calendar" },
  { path: "/library", label: "Library", icon: "bookmark" },
  { path: "/list", label: "List", icon: "list" },
  { path: "/profile", label: "Profile", icon: "user" },
];
