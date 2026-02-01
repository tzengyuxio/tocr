"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  Tags,
  Gamepad2,
  ScanText,
  Users,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  {
    title: "儀表板",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "期刊管理",
    href: "/admin/magazines",
    icon: BookOpen,
  },
  {
    title: "文章管理",
    href: "/admin/articles",
    icon: FileText,
  },
  {
    title: "標籤管理",
    href: "/admin/tags",
    icon: Tags,
  },
  {
    title: "遊戲管理",
    href: "/admin/games",
    icon: Gamepad2,
  },
  {
    title: "AI 辨識",
    href: "/admin/ocr",
    icon: ScanText,
  },
  {
    title: "使用者管理",
    href: "/admin/users",
    icon: Users,
    adminOnly: true,
  },
];

interface AdminSidebarProps {
  userRole: string;
}

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "ADMIN"
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-muted/40 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-6 w-6" />
            <span>TOCR 後台</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {filteredNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "返回前台" : undefined}
        >
          <ChevronLeft className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>返回前台</span>}
        </Link>
      </div>
    </aside>
  );
}
