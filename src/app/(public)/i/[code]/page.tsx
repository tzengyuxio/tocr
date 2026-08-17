// Always resolved against the database: the target moves whenever a magazine
// slug or an issue slug is edited, and a cached answer would outlive the move.
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ code: string }>;
}

/**
 * 單期的永久短碼。`Issue.code` 是唯一不會變的握把——期刊會改名、期號會重排、
 * 網址代號可以重填，正規網址的每一段都可能動，但這條連結不會。
 *
 * 轉址用 307 而非 308：目的地本來就會變，永久轉址會被瀏覽器記住，改了 slug 之後
 * 舊的目的地就再也甩不掉。
 */
export default async function IssueShortLinkPage({ params }: PageProps) {
  const { code } = await params;

  const issue = await prisma.issue.findUnique({
    where: { code },
    select: { slug: true, magazine: { select: { slug: true } } },
  });
  if (!issue) notFound();

  // encodeURIComponent 不能省：中文 slug（創刊號）直接放進 Location header 會讓
  // Node 丟 ERR_INVALID_CHAR，整頁變成 500。
  redirect(
    `/magazines/${issue.magazine.slug}/issues/${encodeURIComponent(issue.slug)}`
  );
}
