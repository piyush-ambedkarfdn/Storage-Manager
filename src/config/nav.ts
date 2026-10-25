import {
  Activity,
  BookOpen,
  CalendarDays,
  FolderTree,
  FolderUp,
  HardDrive,
  Images,
  LayoutDashboard,
  Settings,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/config/features";
import type { CommonKey } from "@/lib/i18n/messages/common";

export type NavItem = {
  href: string;
  labelKey: CommonKey;
  icon: LucideIcon;
  /** Shown only when this feature flag is on. No flag means always shown. */
  feature?: FeatureKey;
};

/** Every admin page, in sidebar order. Items appear when their phase switches the flag on. */
export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/upload", labelKey: "navUpload", icon: Upload, feature: "upload" },
  { href: "/admin", labelKey: "navDashboard", icon: LayoutDashboard },
  { href: "/admin/gallery", labelKey: "navGallery", icon: Images, feature: "gallery" },
  { href: "/admin/programs", labelKey: "navPrograms", icon: FolderTree, feature: "gallery" },
  { href: "/admin/calendar", labelKey: "navCalendar", icon: CalendarDays, feature: "calendar" },
  { href: "/admin/stories", labelKey: "navStories", icon: BookOpen, feature: "stories" },
  { href: "/admin/storage", labelKey: "navStorage", icon: HardDrive, feature: "storage" },
  { href: "/admin/activity", labelKey: "navActivity", icon: Activity, feature: "activity" },
  { href: "/admin/staff", labelKey: "navStaff", icon: Users, feature: "staff" },
  { href: "/admin/ai", labelKey: "navAi", icon: Sparkles, feature: "ai" },
  { href: "/admin/settings", labelKey: "navSettings", icon: Settings, feature: "places" },
];

/** Bottom navigation for field staff (mobile). */
export const UPLOADER_NAV: readonly NavItem[] = [
  { href: "/upload", labelKey: "navUpload", icon: Upload, feature: "upload" },
  { href: "/my-uploads", labelKey: "navMyUploads", icon: FolderUp, feature: "upload" },
];
