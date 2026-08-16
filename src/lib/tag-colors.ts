/**
 * Shared tag type colors, labels and icons
 */

import {
  Building2,
  Calendar,
  Layers,
  Monitor,
  Tag as TagIcon,
  User,
  type LucideIcon,
} from "lucide-react";

export const TAG_TYPES = [
  { value: "GENERAL", label: "一般" },
  { value: "PERSON", label: "人物" },
  { value: "EVENT", label: "活動" },
  { value: "SERIES", label: "系列" },
  { value: "COMPANY", label: "公司" },
  { value: "PLATFORM", label: "平台" },
] as const;

export const TAG_TYPE_COLORS: Record<string, string> = {
  GENERAL: "bg-gray-100 text-gray-800",
  PERSON: "bg-blue-100 text-blue-800",
  EVENT: "bg-purple-100 text-purple-800",
  SERIES: "bg-green-100 text-green-800",
  COMPANY: "bg-orange-100 text-orange-800",
  PLATFORM: "bg-cyan-100 text-cyan-800",
};

export function getTagTypeColor(type: string): string {
  return TAG_TYPE_COLORS[type] || "bg-gray-100 text-gray-800";
}

/**
 * An icon per type, so a chip reads as a person or a company at a glance
 * rather than by remembering which colour meant which.
 */
export const TAG_TYPE_ICONS: Record<string, LucideIcon> = {
  GENERAL: TagIcon,
  PERSON: User,
  EVENT: Calendar,
  SERIES: Layers,
  COMPANY: Building2,
  PLATFORM: Monitor,
};

export function getTagTypeIcon(type: string): LucideIcon {
  return TAG_TYPE_ICONS[type] || TagIcon;
}

export function getTagTypeLabel(type: string): string {
  return TAG_TYPES.find((t) => t.value === type)?.label || type;
}

/**
 * How a tag reads on screen: the type in parentheses, so "SEGA" is visibly a
 * company rather than a name the colour alone has to explain. GENERAL is the
 * absence of a type, so it stays bare -- the same rule the tag input uses.
 */
export function formatTagLabel(tag: { name: string; type: string }): string {
  return tag.type === "GENERAL"
    ? tag.name
    : `${tag.name} (${getTagTypeLabel(tag.type)})`;
}
