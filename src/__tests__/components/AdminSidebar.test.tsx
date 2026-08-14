import { render, screen } from "@testing-library/react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

describe("AdminSidebar review badge", () => {
  it("shows how many issues are waiting for review", () => {
    render(<AdminSidebar userRole="ADMIN" pendingReviewCount={3} />);

    const link = screen.getByRole("link", { name: /單期複查/ });
    expect(link).toHaveTextContent("3");
  });

  it("shows nothing when the queue is empty", () => {
    render(<AdminSidebar userRole="ADMIN" pendingReviewCount={0} />);

    const link = screen.getByRole("link", { name: /單期複查/ });
    expect(link).toHaveTextContent(/^單期複查$/);
  });

  it("leaves the other entries unbadged", () => {
    render(<AdminSidebar userRole="ADMIN" pendingReviewCount={3} />);

    expect(screen.getByRole("link", { name: /期刊管理/ })).toHaveTextContent(
      /^期刊管理$/
    );
  });
});
