import { NextRequest, NextResponse } from "next/server";

// POST /api/games/search-cover - Search RAWG for game cover image
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Game name is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RAWG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RAWG API key not configured" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      key: apiKey,
      search: name,
      page_size: "1",
    });

    const res = await fetch(
      `https://api.rawg.io/api/games?${params}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "RAWG API request failed" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const game = data.results?.[0];

    if (!game || !game.background_image) {
      return NextResponse.json({ coverImage: null, rawgName: null });
    }

    return NextResponse.json({
      coverImage: game.background_image,
      rawgName: game.name,
    });
  } catch (error) {
    console.error("Search cover error:", error);
    return NextResponse.json(
      { error: "Failed to search cover" },
      { status: 500 }
    );
  }
}
