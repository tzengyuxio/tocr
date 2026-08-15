/**
 * Turn a failed /api/upload response into something worth showing.
 *
 * The route answers with JSON, but a rejection from the platform in front of it
 * (an oversized body, say) is an HTML error page. Parsing that as JSON threw a
 * bare SyntaxError, which is what the user used to see instead of the status.
 */
export async function uploadErrorMessage(response: Response): Promise<string> {
  const error = await response
    .json()
    .then((data) => (typeof data?.error === "string" ? data.error : null))
    .catch(() => null);

  return error || `上傳失敗（HTTP ${response.status}）`;
}
