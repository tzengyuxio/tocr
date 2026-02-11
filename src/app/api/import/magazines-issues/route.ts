import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importRequestSchema, type ImportResult } from "@/lib/validators/csv-import";

export async function POST(request: NextRequest) {
  try {
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
        let existing = mag.issn
          ? await tx.magazine.findUnique({ where: { issn: mag.issn } })
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
              nameEn: mag.nameEn,
              publisher: mag.publisher,
              issn: mag.issn,
              description: mag.description,
              foundedDate: mag.foundedDate ? new Date(mag.foundedDate) : undefined,
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
                volumeNumber: iss.volumeNumber,
                title: iss.title,
                publishDate: new Date(iss.publishDate),
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
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to import magazines and issues:", error);
    return NextResponse.json(
      { error: "Failed to import magazines and issues" },
      { status: 500 }
    );
  }
}
