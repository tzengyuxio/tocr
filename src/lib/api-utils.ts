import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

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
      if (error instanceof ZodError) {
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

      // Unique constraint. Worth naming the field: an issue slug that clashes
      // is meant to stop the write and make a person pick another one, and a
      // bare 500 tells them nothing about what to change.
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        const fields = uniqueConstraintFields(error);
        return NextResponse.json(
          {
            error: fields.length
              ? `已經有一筆資料使用了相同的${fields.join("、")}`
              : "資料重複",
          },
          { status: 409 }
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

/** Column names an editor would not recognise, in the wording the forms use. */
const FIELD_LABELS: Record<string, string> = {
  slug: "網址代號",
  issue_number: "期號",
};

/**
 * The columns a P2002 was raised on, labelled for a person.
 *
 * Prisma 7 reports them through the driver adapter rather than in `meta.target`,
 * which stays checked in case a path without the adapter raises the same code.
 * Foreign keys are dropped: [magazine_id, slug] means the slug clashed within
 * one magazine, and naming magazine_id only muddies that.
 */
function uniqueConstraintFields(error: Error): string[] {
  const meta = (error as { meta?: unknown }).meta as
    | {
        target?: string[] | string;
        driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
      }
    | undefined;

  const raw =
    meta?.driverAdapterError?.cause?.constraint?.fields ??
    (Array.isArray(meta?.target) ? meta.target : meta?.target ? [meta.target] : []);

  return raw
    .filter((field) => !field.endsWith("_id"))
    .map((field) => FIELD_LABELS[field] ?? field);
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

/** Upper bound on `limit` so a single request cannot ask for the whole table. */
export const MAX_PAGE_SIZE = 100;

/**
 * Parse common pagination params from search params.
 *
 * Both values are clamped: these routes are reachable without a session, and a
 * non-numeric `page` used to reach Prisma as NaN and surface as a 500.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit = 20
) {
  const page = clamp(searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = clamp(searchParams.get("limit"), defaultLimit, 1, MAX_PAGE_SIZE);
  return { page, limit, skip: (page - 1) * limit };
}

function clamp(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
