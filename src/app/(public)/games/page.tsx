import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2 } from "lucide-react";

export default async function GamesPage() {
  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { articleGames: true },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">遊戲索引</h1>
        <p className="mt-2 text-muted-foreground">
          透過遊戲名稱找到所有相關報導
        </p>
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gamepad2 className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">尚無遊戲資料</h2>
          <p className="mt-2 text-muted-foreground">
            資料建置中，敬請期待
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.map((game) => (
            <Link key={game.id} href={`/games/${game.id}`}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader className="pb-3">
                  {game.coverImage ? (
                    <img
                      src={game.coverImage}
                      alt={game.name}
                      className="mb-3 h-40 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-muted">
                      <Gamepad2 className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <CardTitle className="line-clamp-1">{game.name}</CardTitle>
                  {(game.nameOriginal || game.nameEn) && (
                    <CardDescription className="line-clamp-1">
                      {game.nameOriginal || game.nameEn}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {game.platforms.slice(0, 3).map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {game._count.articleGames} 篇相關文章
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
