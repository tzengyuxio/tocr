import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importRequestSchema, type ImportResult } from "@/lib/validators/csv-import";
import { withErrorHandler } from "@/lib/api-utils";
import { requireEditor } from "@/lib/require-editor";
import { withFoundedSort } from "@/lib/validators/magazine";
import { withPublishSort } from "@/lib/validators/issue";
import { issueSlugify } from "@/lib/slugify";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const denied = await requireEditor(request);
  if (denied) return denied;

  const body = await request.json();
  const validatedData = importRequestSchema.parse(body);

  const result = await prisma.$transaction(async (tx) => {
    const importResult: ImportResult = {
      createdMagazines: 0,
      skippedMagazines: 0,
      createdIssues: 0,
      skippedIssues: 0,
      details: [],
    };

    for (const mag of validatedData.magazines) {
      let magazineId: string;
      let magazineStatus: "created" | "existed" = "created";

      // 先查 ISSN，再查 name
      // findFirst, not findUnique: an ISSN can be shared by two magazines after
      // a title change, so it no longer identifies a single row.
      let existing = mag.issn
        ? await tx.magazine.findFirst({ where: { issn: mag.issn } })
        : null;

      if (!existing) {
        existing = await tx.magazine.findFirst({
          where: { name: mag.name },
        });
      }

      if (existing) {
        magazineId = existing.id;
        magazineStatus = "existed";
        importResult.skippedMagazines++;
      } else {
        const created = await tx.magazine.create({
          data: {
            name: mag.name,
            nameOriginal: mag.nameOriginal,
            publisher: mag.publisher,
            issn: mag.issn,
            description: mag.description,
            ...withFoundedSort({ foundedDate: mag.foundedDate ?? null }),
            isActive: mag.isActive ?? true,
          },
        });
        magazineId = created.id;
        importResult.createdMagazines++;
      }

      const issueDetails: { issueNumber: string; status: "created" | "skipped" }[] = [];

      for (const iss of mag.issues) {
        // 用 @@unique([magazineId, issueNumber]) 查重複
        const existingIssue = await tx.issue.findUnique({
          where: {
            magazineId_issueNumber: {
              magazineId,
              issueNumber: iss.issueNumber,
            },
          },
        });

        if (existingIssue) {
          importResult.skippedIssues++;
          issueDetails.push({ issueNumber: iss.issueNumber, status: "skipped" });
        } else {
          await tx.issue.create({
            data: {
              magazineId,
              issueNumber: iss.issueNumber,
              // The CSV has no slug column, so it is derived. A clash inside
              // one magazine aborts the transaction rather than being silently
              // suffixed -- see lib/slugify.ts.
              slug: issueSlugify(iss.issueNumber),
              volumeNumber: iss.volumeNumber,
              title: iss.title,
              ...withPublishSort({ publishDate: iss.publishDate }),
              pageCount: iss.pageCount,
              price: iss.price,
              notes: iss.notes,
            },
          });
          importResult.createdIssues++;
          issueDetails.push({ issueNumber: iss.issueNumber, status: "created" });
        }
      }

      importResult.details.push({
        magazineName: mag.name,
        status: magazineStatus,
        issues: issueDetails,
      });
    }

    return importResult;
  });

  return NextResponse.json(result, { status: 201 });
}, "Import magazines and issues");
