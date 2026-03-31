import { NextRequest } from "next/server";
import { withErrorHandler, paginatedResponse, parsePagination } from "@/lib/api-utils";
import { getContributorLeaderboard } from "@/lib/contributor-queries";

// GET /api/contributors - 取得貢獻者排行
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(searchParams);
  const period = searchParams.get("period") as "week" | "month" | null;

  const { contributors, totalContributors } = await getContributorLeaderboard({
    take: limit,
    skip,
    period,
    includeEmail: true,
  });

  return paginatedResponse(contributors, totalContributors, page, limit);
}, "Fetch contributors");
