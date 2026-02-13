import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
}

interface StatGridProps {
  items: StatItem[];
}

export function StatGrid({ items }: StatGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <div className="flex items-center justify-between rounded-lg border p-2 transition-colors hover:bg-muted/50 sm:p-3">
            <div className="flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <div className="text-xl font-bold sm:text-2xl">{item.value}</div>
          </div>
        );

        if (item.href) {
          return (
            <Link key={item.label} href={item.href}>
              {content}
            </Link>
          );
        }
        return <div key={item.label}>{content}</div>;
      })}
    </div>
  );
}
