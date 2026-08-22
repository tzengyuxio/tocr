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

    expect(screen.getByRole("link", { name: /雜誌管理/ })).toHaveTextContent(
      /^雜誌管理$/
    );
  });

  // 匯出紀錄會顯示 IP 與 User-Agent，是稽核資料，不是每個編輯都該看到的東西。
  it("keeps the export log out of an editor's sidebar", () => {
    render(<AdminSidebar userRole="EDITOR" />);

    expect(screen.queryByText("匯出紀錄")).not.toBeInTheDocument();
  });

  it("shows the export log to an admin", () => {
    render(<AdminSidebar userRole="ADMIN" />);

    expect(screen.getAllByText("匯出紀錄").length).toBeGreaterThan(0);
  });
});
