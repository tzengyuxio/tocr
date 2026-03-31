import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with consistent error handling.
 * - Catches ZodError and returns 400 with validation details
 * - Catches Prisma NotFoundError and returns 404
 * - Catches all other errors and returns 500 with a generic message
 */
export function withErrorHandler(
  handler: RouteHandler,
  operationName: string
): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Validation failed", details: error },
          { status: 400 }
        );
      }

      // Prisma record not found
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }

      console.error(`${operationName} failed:`, error);
      return NextResponse.json(
        { error: `${operationName} failed` },
        { status: 500 }
      );
    }
  };
}

/**
 * Standard paginated response builder.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * Parse common pagination params from search params.
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  return { page, limit, skip: (page - 1) * limit };
}
