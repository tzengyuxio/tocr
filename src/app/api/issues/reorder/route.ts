import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reorderSchema } from "@/lib/validators/reorder";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { magazineId, issueIds } = reorderSchema.parse(body);

    await prisma.$transaction(
      issueIds.map((id, index) =>
        prisma.issue.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to reorder issues:", error);
    return NextResponse.json(
      { error: "Failed to reorder issues" },
      { status: 500 }
    );
  }
}
