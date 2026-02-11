import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
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
    const session = await auth();

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
        <AdminHeader user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
