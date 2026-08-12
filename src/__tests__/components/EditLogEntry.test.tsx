import { render, screen } from "@testing-library/react";
import { EditLogEntry } from "@/components/EditLogEntry";

const log = {
  action: "UPDATE",
  entityType: "Issue",
  createdAt: new Date("2026-08-12T10:30:00Z"),
  user: { name: "司書(NPC)", email: "librarian@localhost" },
};

describe("EditLogEntry", () => {
  it("names the edited record and opens it in a new tab", () => {
    render(
      <EditLogEntry
        log={log}
        target={{ label: "電腦玩家 第 42 期", href: "/admin/magazines/m1/issues/i1" }}
      />
    );

    const link = screen.getByRole("link", { name: /電腦玩家 第 42 期/ });
    expect(link).toHaveAttribute("href", "/admin/magazines/m1/issues/i1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("司書(NPC)")).toBeInTheDocument();
  });

  it("renders an unlinked label when there is nothing to open", () => {
    render(<EditLogEntry log={log} target={{ label: "（已刪除）", href: null }} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("（已刪除）")).toBeInTheDocument();
  });
});
