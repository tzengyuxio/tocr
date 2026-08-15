/**
 * Turn a failed upload or OCR response into something worth showing.
 *
 * The routes answer with JSON, but a rejection from the platform in front of
 * them (an oversized body, say) is an HTML error page. Parsing that as JSON
 * threw a bare SyntaxError, which is what the user used to see instead of the
 * status. `label` names the action for the fallback, since the same failure
 * reads as "上傳失敗" from the upload form and "辨識失敗" from the OCR page.
 */
export async function uploadErrorMessage(
  response: Response,
  label = "上傳失敗"
): Promise<string> {
  const error = await response
    .json()
    .then((data) => (typeof data?.error === "string" ? data.error : null))
    .catch(() => null);

  return error || `${label}（HTTP ${response.status}）`;
}
