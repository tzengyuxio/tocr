import { auth } from "@/lib/auth";
import { measure } from "@/lib/perf";
import { redirect } from "next/navigation";
import { AdminSidebar, AdminMobileMenuButton } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { isDevBypass, DEV_USER } from "@/lib/dev-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;

  if (isDevBypass) {
    user = DEV_USER;
  } else {
    // Database-backed sessions, so this is a DB round trip on every admin
    // navigation -- measured because it is the cost the page timings miss.
    const session = await measure("admin/session", () => auth());

    if (!session?.user) {
      redirect("/auth/signin");
    }

    if (!["EDITOR", "ADMIN"].includes(session.user.role)) {
      redirect("/auth/unauthorized");
    }

    user = session.user;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar userRole={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader user={user} mobileMenu={<AdminMobileMenuButton userRole={user.role} />} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
