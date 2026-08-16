/**
 * @jest-environment node
 */
import { uploadErrorMessage } from "@/lib/upload-error";

function jsonResponse(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("uploadErrorMessage", () => {
  it("uses the error the route reported", async () => {
    const response = jsonResponse({ error: "Invalid file type" });

    expect(await uploadErrorMessage(response)).toBe("Invalid file type");
  });

  // The case this helper exists for: the platform rejects an oversized body
  // before the route runs, and answers with an HTML page.
  it("falls back to the status when the body is not JSON", async () => {
    const response = new Response("<html>Request Entity Too Large</html>", {
      status: 413,
    });

    expect(await uploadErrorMessage(response)).toBe("上傳失敗（HTTP 413）");
  });

  it("names the action in the fallback", async () => {
    const response = new Response("<html>nope</html>", { status: 500 });

    expect(await uploadErrorMessage(response, "辨識失敗")).toBe(
      "辨識失敗（HTTP 500）"
    );
  });

  it("falls back when the JSON carries no error string", async () => {
    const response = jsonResponse({ detail: { code: 1 } }, 502);

    expect(await uploadErrorMessage(response, "辨識失敗")).toBe(
      "辨識失敗（HTTP 502）"
    );
  });
});
