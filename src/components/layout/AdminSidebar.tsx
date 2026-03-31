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
  Upload,
  Download,
  Users,
  Award,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { title: "儀表板", href: "/admin", icon: LayoutDashboard },
  { title: "期刊管理", href: "/admin/magazines", icon: BookOpen },
  { title: "文章管理", href: "/admin/articles", icon: FileText },
  { title: "標籤管理", href: "/admin/tags", icon: Tags },
  { title: "遊戲管理", href: "/admin/games", icon: Gamepad2 },
  { title: "AI 辨識", href: "/admin/ocr", icon: ScanText },
  { title: "批次匯入", href: "/admin/magazines/import", icon: Upload },
  { title: "資料匯出", href: "/admin/export", icon: Download },
  { title: "貢獻者", href: "/admin/contributors", icon: Award },
  { title: "使用者管理", href: "/admin/users", icon: Users, adminOnly: true },
];

interface AdminSidebarProps {
  userRole: string;
}

function NavLinks({
  userRole,
  pathname,
  collapsed,
  onNavigate,
}: {
  userRole: string;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "ADMIN"
  );

  return (
    <>
      <nav className="flex-1 space-y-1 p-2">
        {filteredNavItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
          onClick={onNavigate}
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
    </>
  );
}

// Mobile: hamburger button rendered in header area
export function AdminMobileMenuButton({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">開啟選單</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5" />
            TOCR 後台
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100%-3.5rem)]">
          <NavLinks
            userRole={userRole}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Desktop: persistent sidebar
export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden sm:flex h-screen flex-col border-r bg-muted/40 transition-all duration-300",
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
      <NavLinks
        userRole={userRole}
        pathname={pathname}
        collapsed={collapsed}
      />
    </aside>
  );
}
