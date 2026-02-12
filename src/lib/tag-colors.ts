/**
 * Shared tag type colors and labels
 */

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

export function getTagTypeLabel(type: string): string {
  return TAG_TYPES.find((t) => t.value === type)?.label || type;
}
