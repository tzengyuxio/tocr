import { auth } from "@/lib/auth";
import { measure } from "@/lib/perf";
import { redirect } from "next/navigation";
import { AdminSidebar, AdminMobileMenuButton } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { isDevBypass, DEV_USER } from "@/lib/dev-auth";
import { countPendingReview } from "@/lib/issue-review";

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

  // One count per admin navigation, alongside the session round trip already
  // paid here. It has to live in the layout: the badge is on the sidebar, and
  // the sidebar outlives the page being viewed.
  const pendingReviewCount = await measure("admin/pending-review", () =>
    countPendingReview()
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar userRole={user.role} pendingReviewCount={pendingReviewCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          user={user}
          mobileMenu={
            <AdminMobileMenuButton
              userRole={user.role}
              pendingReviewCount={pendingReviewCount}
            />
          }
        />
        {/* relative so overflow-y-auto actually contains what it scrolls.
            Without it this element is position:static, which is not a
            containing block, so any absolutely positioned descendant is laid
            out against the page instead -- unclipped, and stretching the
            document's own scroll area down to wherever it sits. That is enough
            to give the window a second scrollbar fighting this one: the sidebar
            slides, the card's bottom edge drifts as you scroll, and the last
            rows end up cut off. Tailwind's sr-only is position:absolute, so a
            visually hidden label near the foot of a long page is all it takes;
            three pages had it. */}
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
