import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!["EDITOR", "ADMIN"].includes(session.user.role)) {
    redirect("/auth/unauthorized");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar userRole={session.user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
