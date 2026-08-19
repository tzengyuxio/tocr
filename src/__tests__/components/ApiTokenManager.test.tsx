import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiTokenManager, type ApiTokenRow } from "@/components/admin/ApiTokenManager";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

const token: ApiTokenRow = {
  id: "tok-1",
  name: "筆電",
  prefix: "tocr_abcdefg",
  createdAt: "2026-08-19T02:00:00Z",
  lastUsedAt: null,
  revokedAt: null,
};

function renderManager(tokens: ApiTokenRow[] = []) {
  return render(<ApiTokenManager tokens={tokens} />);
}

beforeEach(() => {
  global.fetch = jest.fn();
});

describe("ApiTokenManager", () => {
  it("shows what a token is without showing the token", () => {
    renderManager([token]);

    expect(screen.getByText("筆電")).toBeInTheDocument();
    expect(screen.getByText(/tocr_abcdefg/)).toBeInTheDocument();
    expect(screen.getByText(/尚未使用/)).toBeInTheDocument();
  });

  it("offers no revoke button for one already revoked", () => {
    renderManager([{ ...token, revokedAt: "2026-08-19T03:00:00Z" }]);

    expect(screen.getByText("已撤銷")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "撤銷" })).not.toBeInTheDocument();
  });

  // The plaintext exists in exactly one response, so it has to reach the screen
  // there and then -- there is no second chance to read it back.
  it("shows the plaintext once the token is created", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ token: "tocr_plaintext-secret" }),
    });

    renderManager();
    await userEvent.type(screen.getByLabelText("名稱"), "筆電");
    await userEvent.click(screen.getByRole("button", { name: "產生" }));

    expect(screen.getByText("tocr_plaintext-secret")).toBeInTheDocument();
  });

  it("says why creating failed rather than leaving the form silent", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    renderManager();
    await userEvent.type(screen.getByLabelText("名稱"), "筆電");
    await userEvent.click(screen.getByRole("button", { name: "產生" }));

    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });

  // Nothing to copy and nothing to revoke: the button stays out of reach until
  // the token has a name to be listed under.
  it("will not create a nameless token", () => {
    renderManager();

    expect(screen.getByRole("button", { name: "產生" })).toBeDisabled();
  });

  it("revokes through the token's own endpoint", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    renderManager([token]);
    await userEvent.click(screen.getByRole("button", { name: "撤銷" }));

    expect(global.fetch).toHaveBeenCalledWith("/api/tokens/tok-1", {
      method: "DELETE",
    });
  });
});
